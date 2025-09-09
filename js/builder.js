// The logic helpers are loaded globally via a plain script tag.

const GRID = 20;
let shiftDown = false;
function snap(v){return Math.round(v/GRID)*GRID;}

const nodes = [];
const connections = [];
let nextId = 1;
let selectedType = null;
let pending = null;
let ghost = null;
let ghostWire = null;

const palette = document.getElementById('palette');
const workspace = document.getElementById('workspace');
const wires = document.getElementById('wires');
const buttons = [];

const types = ['INPUT','OUTPUT',...GATES.map(g=>g.key)];
types.forEach(t=>{
  const b=document.createElement('button');
  b.textContent=t;
  b.dataset.type=t;
  b.onclick=()=>{if(selectedType===t) selectType(null); else selectType(t);};
  palette.appendChild(b);
  buttons.push(b);
});
const del=document.createElement('button');
del.textContent='🗑️';
del.dataset.type='DELETE';
del.classList.add('delete');
del.onclick=()=>{if(selectedType==='DELETE') selectType(null); else selectType('DELETE');};
palette.appendChild(del);
buttons.push(del);

const undoStack=[];
const redoStack=[];
let loading=false;

function saveState(){
  if(loading) return;
  undoStack.push(serialize());
  if(undoStack.length>100) undoStack.shift();
  redoStack.length=0;
}

function serialize(){
  return {
    nextId,
    nodes: nodes.map(n=>({id:n.id,type:n.type,x:n.x,y:n.y,state:n.state,inputs:n.inputs.length})),
    connections: connections.map(c=>({from:c.from.node.id,to:c.to.node.id,toPort:c.to.index,points:c.points.map(p=>({x:p.x,y:p.y}))}))
  };
}

function loadState(s){
  loading=true;
  nodes.forEach(n=>workspace.removeChild(n.el));
  nodes.length=0;
  connections.forEach(c=>wires.removeChild(c.el));
  connections.length=0;
  nextId=1;
  s.nodes.forEach(nd=>{
    const n=createNode(nd.type, nd.x, nd.y, {id:nd.id, state:nd.state});
    while(n.inputs.length<nd.inputs) addInput(n);
  });
  nextId=s.nextId;
  s.connections.forEach(cd=>{
    const from=nodes.find(n=>n.id===cd.from).output;
    const to=nodes.find(n=>n.id===cd.to).inputs[cd.toPort];
    connect(from,to,cd.points.map(p=>({x:p.x,y:p.y})), false);
  });
  evaluate();
  loading=false;
}

function undo(){
  if(undoStack.length<2) return;
  const cur=undoStack.pop();
  redoStack.push(cur);
  loadState(undoStack[undoStack.length-1]);
}

function redo(){
  if(!redoStack.length) return;
  const state=redoStack.pop();
  undoStack.push(state);
  loadState(state);
}

document.addEventListener('keydown',e=>{
  if(e.key==='Shift'){shiftDown=true;workspace.classList.add('grid');}
  if(e.ctrlKey && (e.key==='z'||e.key==='Z')){e.preventDefault();undo();}
  if(e.ctrlKey && (e.key==='y'||e.key==='Y')){e.preventDefault();redo();}
});

document.addEventListener('keyup',e=>{
  if(e.key==='Shift'){shiftDown=false;workspace.classList.remove('grid');}
});

function selectType(t){
  selectedType=t;
  buttons.forEach(b=>b.classList.toggle('active',b.dataset.type===t));
  if(ghost){ghost.remove();ghost=null;}
  if(pending) cancelPending();
  if(t && t!=='DELETE'){
    ghost=document.createElement('div');
    ghost.className='node ghost';
    const label=document.createElement('span');
    label.textContent=t;
    ghost.appendChild(label);
    workspace.appendChild(ghost);
  }
}

workspace.addEventListener('mousemove',e=>{
  const rect=workspace.getBoundingClientRect();
  if(ghost){
    let x=e.clientX-rect.left;
    let y=e.clientY-rect.top;
    if(shiftDown){x=snap(x);y=snap(y);}
    ghost.style.left=x+'px';
    ghost.style.top=y+'px';
  }
  if(pending) updateGhostWire(e);
});

workspace.addEventListener('click',e=>{
  const rect=workspace.getBoundingClientRect();
  let x=e.clientX-rect.left;
  let y=e.clientY-rect.top;
  if(shiftDown){x=snap(x);y=snap(y);}
  if(selectedType && selectedType!=='DELETE'){
    createNode(selectedType,x,y);
    selectType(null);
  }else if(selectedType==='DELETE'){
    selectType(null);
  }else if(pending){
    if(e.target===workspace){
      pending.points.push({x,y});
      ghostWire.setAttribute('points',pending.points.map(p=>p.x+','+p.y).join(' '));
    }else{
      cancelPending();
    }
  }
});

function createPort(node,kind,index){
  const el=document.createElement('div');
  el.className='port '+kind;
  el.dataset.nodeId=node.id;
  el.dataset.kind=kind;
  el.dataset.index=index;
  el.addEventListener('click',portClicked);
  return {node,kind,index,el,connections:[]};
}

function createNode(type,x,y,opts={}){
  const n={id:opts.id??nextId++,type,x,y,inputs:[],output:null,state:opts.state||0};
  const el=document.createElement('div');
  el.className='node';
  el.style.left=x+'px';
  el.style.top=y+'px';
  el.addEventListener('click',e=>{e.stopPropagation();if(selectedType==='DELETE') removeNode(n);});
  el.addEventListener('mousedown',e=>startDrag(n,e));
  n.el=el;
  if(type==='INPUT'){
    const sw=createSwitch(n.state,()=>{n.state=Number(sw.dataset.on);evaluate();saveState();});
    el.appendChild(sw);n.state=n.state;
    n.output=createPort(n,'out',0);el.appendChild(n.output.el);
  }else if(type==='OUTPUT'){
    const p=createPort(n,'in',0);n.inputs.push(p);el.appendChild(p.el);
    const lamp=document.createElement('span');lamp.className='lamp';lamp.style.marginLeft='20px';el.appendChild(lamp);n.lamp=lamp;
  }else{
    const gate=GATES.find(g=>g.key===type);n.gate=gate;
    const cnt=gate.maxInputs===1?1:gate.minInputs;
    for(let i=0;i<cnt;i++){const p=createPort(n,'in',i);n.inputs.push(p);el.appendChild(p.el);}
    n.output=createPort(n,'out',0);el.appendChild(n.output.el);
    const label=document.createElement('span');label.textContent=type;el.appendChild(label);
    if(gate.maxInputs!==1){
      const add=document.createElement('button');add.textContent='+';add.className='small add-input';add.onclick=e=>{e.stopPropagation();addInput(n);};
      const sub=document.createElement('button');sub.textContent='-';sub.className='small remove-input';sub.onclick=e=>{e.stopPropagation();removeInput(n);};
      el.appendChild(add);
      el.appendChild(sub);
    }
  }
  workspace.appendChild(el);
  layoutPorts(n);
  nodes.push(n);
  evaluate();
  saveState();
  return n;
}

function layoutPorts(n){
  const h=n.el.clientHeight;
  if(n.type==='INPUT'){
    n.output.el.style.top=(h/2-6)+'px';
  }else if(n.type==='OUTPUT'){
    n.inputs[0].el.style.top=(h/2-6)+'px';
  }else{
    const cnt=n.inputs.length;
    const gap=h/(cnt+1);
    n.inputs.forEach((p,i)=>{p.index=i;p.el.dataset.index=i;p.el.style.top=(gap*(i+1)-6)+'px';});
    n.output.el.style.top=(h/2-6)+'px';
  }
}

function addInput(n){
  const max=n.gate.maxInputs||MAX_INPUTS;
  if(n.inputs.length>=max) return;
  const p=createPort(n,'in',n.inputs.length);
  n.inputs.push(p);n.el.appendChild(p.el);
  layoutPorts(n);evaluate();saveState();
}

function removeInput(n){
  if(n.inputs.length<=n.gate.minInputs) return;
  const p=n.inputs.pop();
  p.connections.slice().forEach(removeConnection);
  n.el.removeChild(p.el);
  layoutPorts(n);evaluate();saveState();
}

function removeNode(n){
  [...n.inputs, n.output].filter(Boolean).forEach(p=>p.connections.slice().forEach(removeConnection));
  workspace.removeChild(n.el);
  nodes.splice(nodes.indexOf(n),1);
  evaluate();saveState();
}

let dragging=null,dragOffset=null;
function startDrag(n,e){
  if(selectedType||pending) return;
  if(e.target.classList.contains('port')||e.target.closest('.switch')||e.target.tagName==='BUTTON') return;
  dragging=n;
  const r=n.el.getBoundingClientRect();
  const ws=workspace.getBoundingClientRect();
  dragOffset={x:e.clientX-r.left,y:e.clientY-r.top,wsx:ws.left,wsy:ws.top};
  document.addEventListener('mousemove',onDrag);
  document.addEventListener('mouseup',endDrag);
}

function onDrag(e){
  if(!dragging) return;
  let x=e.clientX-dragOffset.wsx-dragOffset.x;
  let y=e.clientY-dragOffset.wsy-dragOffset.y;
  if(shiftDown){x=snap(x);y=snap(y);}
  const maxX=workspace.clientWidth-dragging.el.offsetWidth;
  const maxY=workspace.clientHeight-dragging.el.offsetHeight;
  x=Math.max(0,Math.min(maxX,x));
  y=Math.max(0,Math.min(maxY,y));
  dragging.x=x;dragging.y=y;
  dragging.el.style.left=x+'px';
  dragging.el.style.top=y+'px';
  evaluate();
}

function endDrag(){
  if(dragging){saveState();}
  dragging=null;dragOffset=null;
  document.removeEventListener('mousemove',onDrag);
  document.removeEventListener('mouseup',endDrag);
}

function portClicked(ev){
  ev.stopPropagation();
  if(selectedType==='DELETE'){
    const node=nodes.find(n=>n.id==ev.currentTarget.dataset.nodeId);
    removeNode(node);
    return;
  }
  if(selectedType) selectType(null);
  const el=ev.currentTarget;
  const node=nodes.find(n=>n.id==el.dataset.nodeId);
  const port=(el.dataset.kind==='in'?node.inputs:[node.output])[el.dataset.index];
  if(!pending){
    if(port.kind==='out') startPending(port);
  }else{
    if(port.kind==='in'&&port!==pending.from){
      connect(pending.from,port,[...pending.points,getPortCenter(port)]);
    }
    cancelPending();
  }
}

function startPending(from){
  const a=getPortCenter(from);
  pending={from,points:[a]};
  ghostWire=document.createElementNS('http://www.w3.org/2000/svg','polyline');
  ghostWire.classList.add('wire','ghost-wire');
  ghostWire.setAttribute('fill','none');
  wires.appendChild(ghostWire);
  ghostWire.setAttribute('points',a.x+','+a.y);
}

function updateGhostWire(e){
  if(!ghostWire) return;
  const rect=workspace.getBoundingClientRect();
  let x=e.clientX-rect.left;
  let y=e.clientY-rect.top;
  if(shiftDown){x=snap(x);y=snap(y);}
  const pts=[...pending.points,{x,y}];
  ghostWire.setAttribute('points',pts.map(p=>p.x+','+p.y).join(' '));
}

function cancelPending(){
  pending=null;
  if(ghostWire){wires.removeChild(ghostWire);ghostWire=null;}
}

function connect(from,to,points,record=true){
  const el=document.createElementNS('http://www.w3.org/2000/svg','polyline');
  el.classList.add('wire');
  el.setAttribute('fill','none');
  wires.appendChild(el);
  const c={from,to,el,points};
  from.connections.push(c);to.connections.push(c);connections.push(c);
  evaluate();
  if(record) saveState();
}

function removeConnection(c){
  c.from.connections=c.from.connections.filter(x=>x!==c);
  c.to.connections=[];
  wires.removeChild(c.el);
  connections.splice(connections.indexOf(c),1);
  evaluate();saveState();
}

function getPortCenter(p){
  const ws=workspace.getBoundingClientRect();
  const r=p.el.getBoundingClientRect();
  return {x:r.left-ws.left+r.width/2,y:r.top-ws.top+r.height/2};
}

function updateLine(c){
  c.points[0]=getPortCenter(c.from);
  c.points[c.points.length-1]=getPortCenter(c.to);
  c.el.setAttribute('points',c.points.map(p=>p.x+','+p.y).join(' '));
}

function getInputValue(p,vis){
  if(!p.connections.length)return 0;
  return evaluateNode(p.connections[0].from.node,vis);
}

function evaluateNode(n,vis){
  if(vis.has(n))return n.value;
  vis.add(n);
  if(n.type==='INPUT'){n.value=n.state;return n.value;}
  if(n.type==='OUTPUT'){
    const v=getInputValue(n.inputs[0],vis);n.value=v;n.lamp.classList.toggle('on',v===1);return v;
  }
  const vals=n.inputs.map(p=>getInputValue(p,vis));n.value=evaluateGate(n.type,vals);return n.value;
}

function evaluate(){
  connections.forEach(updateLine);
  const vis=new Set();
  nodes.forEach(n=>evaluateNode(n,vis));
  connections.forEach(c=>{c.el.classList.toggle('on',c.from.node.value===1);});
}

saveState();
