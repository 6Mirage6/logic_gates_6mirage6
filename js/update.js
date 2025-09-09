window.CURRENT_COMMIT = '__COMMIT_SHA__';

async function checkForUpdate() {
  const el = document.getElementById('update-required');
  if (!el) return;
  try {
      const res = await fetch('https://api.github.com/repos/yayizhak/logic_gates/commits/main');
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    el.textContent = data.sha !== window.CURRENT_COMMIT ? 'Да' : 'Нет';
  } catch (err) {
    el.textContent = 'Нет';
  }
}

checkForUpdate();
