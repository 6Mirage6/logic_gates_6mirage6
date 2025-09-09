const GATES = [
  { key:"AND",  name:"AND (И)",   desc:"Выход 1, если все входы = 1", minInputs:2 },
  { key:"OR",   name:"OR (ИЛИ)",  desc:"Выход 1, если хотя бы один вход = 1", minInputs:2 },
  { key:"NOT",  name:"NOT (НЕ)",  desc:"Инвертирует единственный вход", minInputs:1, maxInputs:1 },
  { key:"NAND", name:"NAND",      desc:"Инверсия AND", minInputs:2 },
  { key:"NOR",  name:"NOR",       desc:"Инверсия OR", minInputs:2 },
  { key:"XOR",  name:"XOR",       desc:"1 при нечётном числе единиц", minInputs:2 },
  { key:"XNOR", name:"XNOR",      desc:"Инверсия XOR", minInputs:2 },
];

const MAX_INPUTS=4;
const GRID=20;
let shiftDown=false;
function snap(v){return Math.round(v/GRID)*GRID;}

function evaluateGate(key, inputs){
  switch(key){
    case 'AND':  return inputs.every(v=>v===1)?1:0;
    case 'OR':   return inputs.some(v=>v===1)?1:0;
    case 'NOT':  return inputs[0]===1?0:1;
    case 'NAND': return evaluateGate('AND',inputs)^1;
    case 'NOR':  return evaluateGate('OR',inputs)^1;
    case 'XOR':  return inputs.reduce((acc,v)=>acc^v,0);
    case 'XNOR': return evaluateGate('XOR',inputs)^1;
    default: return 0;
  }
}

function createSwitch(initial=0,onToggle){
  const sw=document.createElement('div');
  sw.className='switch';
  sw.dataset.on=initial;
  const knob=document.createElement('div');
  knob.className='knob';
  sw.append(knob);
  sw.onclick=e=>{
    e.stopPropagation();
    sw.dataset.on=sw.dataset.on==='1'?'0':'1';
    onToggle();
  };
  return sw;
}

function addRow(g){
  const tr=document.createElement('tr');
  const td1=document.createElement('td');
  td1.textContent=g.name;
  const td2=document.createElement('td');
  const td3=document.createElement('td');
  const td4=document.createElement('td');
  td4.textContent=g.desc;

  const n=g.maxInputs===1?1:2;
  const switches=[];
  for(let i=0;i<n;i++){
    const sw=createSwitch(0,update);
    td2.append(sw);
    switches.push(sw);
  }

  const lamp=document.createElement('span');
  lamp.className='lamp';
  td3.append(lamp);

  function update(){
    const vals=switches.map(sw=>Number(sw.dataset.on));
    const out=evaluateGate(g.key,vals);
    lamp.classList.toggle('on',out===1);
  }

  update();
  tr.append(td1,td2,td3,td4);
  document.getElementById('tbody').append(tr);
}

GATES.forEach(addRow);

// === Circuit builder ===
const nodes=[];
const connections=[];
let nextId=1;
let selectedType=null;
let pending=null;
let ghost=null;
let ghostWire=null;

const palette=document.getElementById('palette');
const workspace=document.getElementById('workspace');
const wires=document.getElementById('wires');
const buttons=[];

const types=['INPUT','OUTPUT',...GATES.map(g=>g.key)];
types.forEach(t=>{
  const b=document.createElement('button');
  b.textContent=t;
  b.dataset.type=t;
  b.onclick=()=>{
    if(selectedType===t) selectType(null); else selectType(t);
  };
  palette.append(b);
  buttons.push(b);
});
const del=document.createElement('button');
del.textContent='🗑️';
del.dataset.type='DELETE';
del.classList.add('delete');
del.onclick=()=>{if(selectedType==='DELETE') selectType(null); else selectType('DELETE');};
palette.append(del);
buttons.push(del);

document.addEventListener('keydown',e=>{
  if(e.key==='Shift'){shiftDown=true;workspace.classList.add('grid');}
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
    ghost.append(label);
    workspace.append(ghost);
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

function createNode(type,x,y){
  const n={id:nextId++,type,x,y,inputs:[],output:null,state:0};
  const el=document.createElement('div');
  el.className='node';
  el.style.left=x+'px';
  el.style.top=y+'px';
  el.addEventListener('click',e=>{
    e.stopPropagation();
    if(selectedType==='DELETE') removeNode(n);
  });
  el.addEventListener('mousedown',e=>startDrag(n,e));
  n.el=el;
  if(type==='INPUT'){
    const sw=createSwitch(0,()=>{n.state=Number(sw.dataset.on);evaluate();});
    el.append(sw);n.state=0;
    n.output=createPort(n,'out',0);el.append(n.output.el);
  }else if(type==='OUTPUT'){
    const p=createPort(n,'in',0);n.inputs.push(p);el.append(p.el);
    const lamp=document.createElement('span');lamp.className='lamp';lamp.style.marginLeft='20px';el.append(lamp);n.lamp=lamp;
  }else{
    const gate=GATES.find(g=>g.key===type);n.gate=gate;
    const cnt=gate.maxInputs===1?1:gate.minInputs;
    for(let i=0;i<cnt;i++){const p=createPort(n,'in',i);n.inputs.push(p);el.append(p.el);}
    n.output=createPort(n,'out',0);el.append(n.output.el);
    const label=document.createElement('span');label.textContent=type;el.append(label);
    if(gate.maxInputs!==1){
      const add=document.createElement('button');add.textContent='+';add.className='small add-input';add.onclick=e=>{e.stopPropagation();addInput(n);};
      const sub=document.createElement('button');sub.textContent='-';sub.className='small remove-input';sub.onclick=e=>{e.stopPropagation();removeInput(n);};
      el.append(add,sub);
    }
  }
  workspace.append(el);
  layoutPorts(n);
  nodes.push(n);
  evaluate();
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
    n.inputs.forEach((p,i)=>{
      p.index=i;
      p.el.dataset.index=i;
      p.el.style.top=(gap*(i+1)-6)+'px';
    });
    n.output.el.style.top=(h/2-6)+'px';
  }
}

function addInput(n){
  const max=n.gate.maxInputs||MAX_INPUTS;
  if(n.inputs.length>=max) return;
  const p=createPort(n,'in',n.inputs.length);
  n.inputs.push(p);n.el.append(p.el);
  layoutPorts(n);evaluate();
}

function removeInput(n){
  if(n.inputs.length<=n.gate.minInputs) return;
  const p=n.inputs.pop();
  p.connections.slice().forEach(removeConnection);
  n.el.removeChild(p.el);
  layoutPorts(n);evaluate();
}

function removeNode(n){
  [...n.inputs, n.output].filter(Boolean).forEach(p=>p.connections.slice().forEach(removeConnection));
  workspace.removeChild(n.el);
  nodes.splice(nodes.indexOf(n),1);
  evaluate();
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
  wires.append(ghostWire);
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

function connect(from,to,points){
  const el=document.createElementNS('http://www.w3.org/2000/svg','polyline');
  el.classList.add('wire');
  wires.append(el);
  const c={from,to,el,points};
  from.connections.push(c);to.connections.push(c);connections.push(c);
  evaluate();
}

function removeConnection(c){
  c.from.connections=c.from.connections.filter(x=>x!==c);
  c.to.connections=[];
  wires.removeChild(c.el);
  connections.splice(connections.indexOf(c),1);
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
