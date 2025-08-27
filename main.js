// 入口文件：这个文件是游戏的主逻辑入口，负责初始化和事件绑定

document.getElementById('howBtn').onclick = ()=> ruleDlg.showModal();
document.getElementById('ruleClose').onclick = ()=> ruleDlg.close();

document.getElementById('startBtn').onclick = () => {
  $intro.style.display = 'none';
  showRoutes();
  startCountdown();
};

document.querySelectorAll('[data-route]').forEach(btn => {
  btn.addEventListener('click', () => chooseRoute(btn.dataset.route));
});

document.getElementById('restartBtn').onclick = () => {
  // 简单重置
  clearInterval(tickHandle);
  game = { remaining: GAME_START_MINUTES, route: null, stepIndex: 0, log: [], running: false, hp: 100 };
  $intro.style.display = '';
  $routes.style.display = 'none';
  $nodeCard.style.display = 'none';
  $ending.style.display = 'none';
  $logWrap.style.display = 'none';
  $log.textContent = '';
  renderClock();
  setState('准备中');
};

// 首次渲染
renderClock();
setState('准备中');

// （可选）占位存档：示范如何保存/恢复
function saveProgress() {
  const data = JSON.stringify(game);
  localStorage.setItem('liangxiang_save', data);
}
function loadProgress() {
  const raw = localStorage.getItem('liangxiang_save');
  if (!raw) return false;
  try {
    const data = JSON.parse(raw);
    Object.assign(game, data);
    return true;
  } catch { return false; }
}


