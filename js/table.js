// Modules caused the page to break when opened from the filesystem.
// The logic helpers are now loaded globally via a plain script tag.

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
    td2.appendChild(sw);
    switches.push(sw);
  }

  const lamp = document.createElement('span');
  lamp.className = 'lamp';
  td3.appendChild(lamp);

  function update() {
    const vals = switches.map(sw => Number(sw.dataset.on));
    const out = evaluateGate(g.key, vals);
    lamp.classList.toggle('on', out === 1);
  }

  update();
  tr.appendChild(td1);
  tr.appendChild(td2);
  tr.appendChild(td3);
  tr.appendChild(td4);
  document.getElementById('tbody').appendChild(tr);
}

GATES.forEach(addRow);
