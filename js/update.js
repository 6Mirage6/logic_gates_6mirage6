window.CURRENT_COMMIT = '__COMMIT_SHA__';

async function checkForUpdate() {
  const el = document.getElementById('update-required');
  if (!el) return;
  try {
    const res = await fetch('https://api.github.com/repos/yayizhak/logic_gates/commits/main');
    if (!res.ok) throw new Error('Network response was not ok');
    const data = await res.json();
    const latest = data.sha;
    const acknowledged = localStorage.getItem('latest-notified');
    if (latest !== window.CURRENT_COMMIT && acknowledged !== latest) {
      el.textContent = 'Да';
      localStorage.setItem('latest-notified', latest);
    } else {
      el.textContent = 'Нет';
    }
  } catch (err) {
    el.textContent = 'Нет';
  }
}

checkForUpdate();
