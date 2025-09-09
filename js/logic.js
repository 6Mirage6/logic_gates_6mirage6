window.GATES = [
  { key:"AND",  name:"AND (И)",   desc:"Выход 1, если все входы = 1", minInputs:2 },
  { key:"OR",   name:"OR (ИЛИ)",  desc:"Выход 1, если хотя бы один вход = 1", minInputs:2 },
  { key:"NOT",  name:"NOT (НЕ)",  desc:"Инвертирует единственный вход", minInputs:1, maxInputs:1 },
  { key:"NAND", name:"NAND",      desc:"Инверсия AND", minInputs:2 },
  { key:"NOR",  name:"NOR",       desc:"Инверсия OR", minInputs:2 },
  { key:"XOR",  name:"XOR",       desc:"1 при нечётном числе единиц", minInputs:2 },
  { key:"XNOR", name:"XNOR",      desc:"Инверсия XOR", minInputs:2 }
];

window.MAX_INPUTS = 4;

window.evaluateGate = function(key, inputs) {
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
};

window.createSwitch = function(initial = 0, onToggle) {
  const sw = document.createElement('div');
  sw.className = 'switch';
  sw.dataset.on = initial;
  const knob = document.createElement('div');
  knob.className = 'knob';
  sw.append(knob);
  sw.onclick = e => {
    e.stopPropagation();
    sw.dataset.on = sw.dataset.on === '1' ? '0' : '1';
    onToggle();
  };
  return sw;
};
