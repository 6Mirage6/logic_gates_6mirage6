import {GATES, evaluateGate, createSwitch} from './logic.js';

function addRow(g) {
  const tr = document.createElement('tr');
  const td1 = document.createElement('td');
  td1.textContent = g.name;
  const td2 = document.createElement('td');
  const td3 = document.createElement('td');
  const td4 = document.createElement('td');
  td4.textContent = g.desc;

  const n = g.maxInputs === 1 ? 1 : 2;
  const switches = [];
  for (let i = 0; i < n; i++) {
    const sw = createSwitch(0, update);
    td2.append(sw);
    switches.push(sw);
  }

  const lamp = document.createElement('span');
  lamp.className = 'lamp';
  td3.append(lamp);

  function update() {
    const vals = switches.map(sw => Number(sw.dataset.on));
    const out = evaluateGate(g.key, vals);
    lamp.classList.toggle('on', out === 1);
  }

  update();
  tr.append(td1, td2, td3, td4);
  document.getElementById('tbody').append(tr);
}

GATES.forEach(addRow);
