const GATES = [
  { key:"AND",  name:"AND (И)",   desc:"Выход 1, если все входы = 1", minInputs:2 },
  { key:"OR",   name:"OR (ИЛИ)",  desc:"Выход 1, если хотя бы один вход = 1", minInputs:2 },
  { key:"NOT",  name:"NOT (НЕ)",  desc:"Инвертирует единственный вход", minInputs:1, maxInputs:1 },
  { key:"NAND", name:"NAND",      desc:"Инверсия AND", minInputs:2 },
  { key:"NOR",  name:"NOR",       desc:"Инверсия OR", minInputs:2 },
  { key:"XOR",  name:"XOR",       desc:"1 при нечётном числе единиц", minInputs:2 },
  { key:"XNOR", name:"XNOR",      desc:"Инверсия XOR", minInputs:2 },
];

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
  b.onclick=()=>selectType(t);
  palette.append(b);
  buttons.push(b);
});

function selectType(t){
  selectedType=t;
  buttons.forEach(b=>b.classList.toggle('active',b.dataset.type===t));
  if(ghost){ghost.remove();ghost=null;}
  if(t){
    ghost=document.createElement('div');
    ghost.className='node ghost';
    const label=document.createElement('span');
    label.textContent=t;
    ghost.append(label);
    workspace.append(ghost);
  }
}

workspace.addEventListener('mousemove',e=>{
  if(ghost){
    const rect=workspace.getBoundingClientRect();
    ghost.style.left=e.clientX-rect.left+'px';
    ghost.style.top=e.clientY-rect.top+'px';
  }
  if(pending) updateGhostWire(e);
});

workspace.addEventListener('click',e=>{
  const rect=workspace.getBoundingClientRect();
  if(selectedType){
    createNode(selectedType,e.clientX-rect.left,e.clientY-rect.top);
    selectType(null);
  }else if(pending){
    cancelPending();
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
  el.addEventListener('click',e=>e.stopPropagation());
  n.el=el;
  if(type==='INPUT'){
    const sw=createSwitch(0,()=>{n.state=Number(sw.dataset.on);evaluate();});
    el.append(sw);n.state=0;
    n.output=createPort(n,'out',0);n.output.el.style.top='14px';el.append(n.output.el);
  }else if(type==='OUTPUT'){
    const p=createPort(n,'in',0);p.el.style.top='14px';n.inputs.push(p);el.append(p.el);
    const lamp=document.createElement('span');lamp.className='lamp';lamp.style.marginLeft='20px';el.append(lamp);n.lamp=lamp;
  }else{
    const gate=GATES.find(g=>g.key===type);const cnt=gate.maxInputs===1?1:2;
    for(let i=0;i<cnt;i++){const p=createPort(n,'in',i);p.el.style.top=(10+i*20)+'px';n.inputs.push(p);el.append(p.el);}
    n.output=createPort(n,'out',0);n.output.el.style.top='14px';el.append(n.output.el);
    const label=document.createElement('span');label.textContent=type;el.append(label);
  }
  workspace.append(el);nodes.push(n);evaluate();
}

function portClicked(ev){
  ev.stopPropagation();
  if(selectedType) selectType(null);
  const el=ev.currentTarget;
  const node=nodes.find(n=>n.id==el.dataset.nodeId);
  const port=(el.dataset.kind==='in'?node.inputs:[node.output])[el.dataset.index];
  if(!pending){
    if(port.kind==='out') startPending(port);
  }else{
    if(port.kind==='in'&&port!==pending.from){
      connect(pending.from,port);
    }
    cancelPending();
  }
}

function startPending(from){
  pending={from};
  ghostWire=document.createElementNS('http://www.w3.org/2000/svg','line');
  ghostWire.classList.add('wire','ghost-wire');
  wires.append(ghostWire);
  const a=getPortCenter(from);
  ghostWire.setAttribute('x1',a.x);ghostWire.setAttribute('y1',a.y);
  ghostWire.setAttribute('x2',a.x);ghostWire.setAttribute('y2',a.y);
}

function updateGhostWire(e){
  if(!ghostWire) return;
  const a=getPortCenter(pending.from);
  const rect=workspace.getBoundingClientRect();
  ghostWire.setAttribute('x1',a.x);
  ghostWire.setAttribute('y1',a.y);
  ghostWire.setAttribute('x2',e.clientX-rect.left);
  ghostWire.setAttribute('y2',e.clientY-rect.top);
}

function cancelPending(){
  pending=null;
  if(ghostWire){wires.removeChild(ghostWire);ghostWire=null;}
}

function connect(from,to){
  const line=document.createElementNS('http://www.w3.org/2000/svg','line');
  line.classList.add('wire');
  wires.append(line);
  const c={from,to,line};
  from.connections.push(c);to.connections.push(c);connections.push(c);
  evaluate();
}

function removeConnection(c){
  c.from.connections=c.from.connections.filter(x=>x!==c);
  c.to.connections=[];
  wires.removeChild(c.line);
  connections.splice(connections.indexOf(c),1);
}

function getPortCenter(p){
  const ws=workspace.getBoundingClientRect();
  const r=p.el.getBoundingClientRect();
  return {x:r.left-ws.left+r.width/2,y:r.top-ws.top+r.height/2};
}

function updateLine(c){
  const a=getPortCenter(c.from),b=getPortCenter(c.to);
  c.line.setAttribute('x1',a.x);c.line.setAttribute('y1',a.y);
  c.line.setAttribute('x2',b.x);c.line.setAttribute('y2',b.y);
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
  connections.forEach(c=>{c.line.classList.toggle('on',c.from.node.value===1);});
}
