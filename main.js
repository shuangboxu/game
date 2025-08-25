const TICK_PER_REAL_SECOND = 1; // 调快可改成 2、3……
const GAME_START_SECONDS = 60 * 60; // 60 分钟 = 3600 秒

// 统一的时间处理，全部用“秒”为单位（整数为主，必要时可用小数）
let game = {
  remaining: GAME_START_SECONDS, // 直接用秒
  route: null,                   // 当前路线 id
  stepIndex: 0,                  // 路线中的第几个节点
  log: [],                       // 文本日志
  running: false,                // 是否在倒计时
  hp: 100,                       // 体力（给路线4示例用）
};

// DOM
const $clock = document.getElementById('clock').querySelector('strong');
const $state = document.getElementById('state').querySelector('strong');
const $intro = document.getElementById('intro');
const $routes = document.getElementById('routes');
const $nodeCard = document.getElementById('node');
const $nodeTitle = document.getElementById('nodeTitle');
const $nodeDesc = document.getElementById('nodeDesc');
const $nodeActions = document.getElementById('nodeActions');
const $logWrap = document.getElementById('logWrap');
const $log = document.getElementById('log');
const $ending = document.getElementById('ending');
const $endingText = document.getElementById('endingText');
const ruleDlg = document.getElementById('ruleDlg');
const qteDlg = document.getElementById('qteDlg');
const qteBtn = document.getElementById('qteBtn');
const qteGiveup = document.getElementById('qteGiveup');

let tickHandle = null;

/** ========================
 * 路线与节点（示例）
 * 每个节点：
 *  - title: 名称
 *  - desc: 描述
 *  - baseCost: 基础耗时（分钟）
 *  - actions: 按钮数组 [{label, do:()=> void}]
 *  - miniGame: 可选：{ id: 'crowd/12306/bike/taxi/gate/quiz', onResult: (ok)=> number(追加耗时) }
 *  - next: 跳到下个节点索引（或函数返回）
 * ======================== */

const ROUTES = {
  // 路线1：地铁直达
  subway: {
    name: '地铁直达',
    steps: [
      { title: '出门 → 最近地铁站',
        desc: '背包手机钥匙都在，快步前往地铁站…',
        baseCost: 60,//过程耗时，已经扣除
        actions: [{ label: '小跑前进（+1 体力消耗）', do: ()=> { game.hp = Math.max(0, game.hp-1); } }],
      },
      { title: '进站闸机',
        desc: '人脸识别闸机排队中，偶尔卡壳…',
        baseCost: 30,
        miniGame: { id: 'gate', onResult: (ok)=> ok? 0 : 4 }, // 失败多耗 4 分钟
      },
      { title: '地铁车厢人流',
        desc: '拥挤的人潮从对面涌来，需要侧身穿梭。',
        baseCost: 8,
        miniGame: { id: 'crowd', onResult: (ok)=> ok? 2 : 6 }, // 成功仍有拥挤代价
      },
      { title: '良乡大学城站 → 骑车',
        desc: '出站扫码共享单车，赶往校园。',
        baseCost: 10,
        miniGame: { id: 'bike', onResult: (ok)=> ok? 0 : 3 }, // 摔一次+3
      },
      { title: '校门口 → 考场',
        desc: '同学打招呼，心跳加速…',
        baseCost: 5,
        miniGame: { id: 'quiz', onResult: (ok)=> ok? 0 : 1 },
      },
    ]
  },

  // 路线2：北京西 → 火车
  train: {
    name: '北京西 → 火车快线',
    steps: [
      { title: '地铁 → 北京西站',
        desc: '需要穿越人潮换乘到北京西站。',
        baseCost: 0,
        miniGame: { id: 'crowd', onResult: (ok)=> ok? 1 : 5 },
      },
      { title: '抢票',
        desc: '12306 余票紧张，操作要快。',
        baseCost: 2,
        miniGame: { id: '12306', onResult: (ok)=> ok? 0 : 99 }, // 失败则视作买不到：强制换方案
        // 如果失败，下面 actions 里会分支
      },
      { title: '候车 → 进站',
        desc: '检票顺利，进入站台等车。',
        baseCost: 300,
      },
      { title: '乘车（18:40 - 19:06）',
        desc: '列车开动，窗外飞驰…',
        baseCost: 1560, // 车程时间
      },
      { title: '到站 → 打车',
        desc: '下车后拦车，司机试图走小路。',
        baseCost: 10,
        miniGame: { id: 'taxi', onResult: (ok)=> ok? 0 : 6 },
      },
    ]
  },

  // 路线3：打车直奔
  taxi: {
    name: '直接打车',
    steps: [
      { title: '呼叫网约车',
        desc: '附近车少，溢价中…',
        baseCost: 4,
      },
      { title: '路况：红绿灯与拥堵',
        desc: '晚高峰即将到来，红灯频繁。',
        baseCost: 20,
        miniGame: { id: 'traffic', onResult: (ok)=> ok? -3 : 5 }, // 成功可少走 3 分钟
      },
      { title: '校门口下车',
        desc: '小跑前往教学楼。',
        baseCost: 7,
      },
    ]
  },

  // 路线4：共享单车 + 地铁
  bikecombo: {
    name: '共享单车 + 地铁',
    steps: [
      { title: '骑到大站',
        desc: '体力消耗较多，请小心控制节奏。',
        baseCost: 8,
        miniGame: { id: 'bike', onResult: (ok)=> {
          game.hp = Math.max(0, game.hp - (ok? 5 : 12));
          return ok? 0 : 4;
        }},
      },
      { title: '进站闸机',
        desc: '滑块拼图对齐即可通行。',
        baseCost: 2,
        miniGame: { id: 'gate', onResult: (ok)=> ok? 0 : 3 },
      },
      { title: '车厢拥挤',
        desc: '在门口与车厢中间游走寻找空位。',
        baseCost: 9,
        miniGame: { id: 'crowd', onResult: (ok)=> ok? 1 : 5 },
      },
      { title: '出站步行 → 校园',
        desc: '体力不足会拖慢速度。',
        baseCost: ()=> game.hp >= 50 ? 8 : 12, // 动态耗时
      },
    ]
  },
};

//工具函数
//把分钟转换成 “MM:SS” 格式
function mmss(mins) {
  const m = Math.max(0, Math.floor(mins));
  const s = Math.round((mins - Math.floor(mins)) * 60);
  const mm = String(m).padStart(2, '0');//转成 2 位字符串，不足补零，例如 5 → "05"
  const ss = String(s).padStart(2, '0');
  return `${mm}:${ss}`;
}
//写入日志
function logMsg(text) {
  game.log.push(text);
  $log.textContent = game.log.join('\n');
}
// 消耗时间（秒为单位）
function spend(secs) {
  game.remaining -= secs;
  // 把消耗时间和剩余时间转换成 分:秒 格式
  const spent = mmss(secs / 60);
  const remaining = mmss(Math.max(0, game.remaining) / 60);
  logMsg(`- 花费 ${spent} | 剩余 ${remaining}`);
}

function setState(text) { $state.textContent = text; }
// 渲染时格式化 mm:ss
function renderClock() { 
  $clock.textContent = mmss(game.remaining / 60); 
}

/** ========================
 * 小游戏占位：统一入口
 * 传入 id，返回 Promise<boolean>，代表成功/失败
 * 目前实现一个 QTE（3秒反应）：空格/按钮 即成功
 * ======================== */
function applyMiniGameResult(lateTime) {
  alert("小游戏结果：你浪费了 " + lateTime + " 秒！");
  game.remaining -= lateTime; // 扣时间
  if (game.remaining < 0) game.remaining = 0;
  renderClock();
}

function startMiniGame(id) {
  return new Promise(resolve => {
  if (id === 'crowd') {
    // 打开子窗口
    const child = window.open("躲避人流.html", "_blank", "width=500,height=500");

    // 提供一个回调给子页面调用
    window.applyMiniGameResult = function(lateTime) {
      // 弹窗显示消耗时间
      alert("小游戏结果：你浪费了 " + lateTime + " 秒！");
      // 扣掉游戏总时间
      game.remaining -= lateTime;
      if (game.remaining < 0) game.remaining = 0;
      // 刷新倒计时显示
      renderClock();
      // 返回实际浪费时间给主流程
      resolve(lateTime);
      // 确保子窗口关闭
      if (child && !child.closed) child.close();
    };
    // 结束当前逻辑，不走占位小游戏
    return;
  }

  if (id === '12306') {
  // 打开 12306 抢票子窗口（注意文件名）
  const child = window.open("12306.html", "_blank", "width=500,height=500");

  // 提供回调给子页面
  window.applyMiniGameResult = function(lateTime) {
    // 弹窗提示
    if (lateTime == 600) {
      alert("抢票失败！被迫乘坐地铁前往学校！浪费了 600 秒进出站时间！");
      game.remaining -= 600; // ✅ 扣掉 600 秒
    } else {
      alert("抢票成功，用时 " + lateTime + " 秒！");
       game.remaining -= lateTime; // ✅ 扣掉实际用时
    }

    // 扣主计时（失败时不扣可改成不扣：这里我仍按“扣掉”处理）
    game.remaining -= (lateTime == 600 ? 0 : lateTime);
    if (game.remaining < 0) game.remaining = 0;
    renderClock();

    // 返回给 await startMiniGame(...) 的 Promise
    resolve(lateTime);

    // 关子窗
    if (child && !child.closed) child.close();
  };
  return; // 不走占位小游戏
}



    // ------------------ 其他占位小游戏逻辑 ------------------
    const titles = {
      crowd: '躲避人流（占位版）',
      '12306': '抢票大战（占位版）',
      bike: '骑行平衡（占位版）',
      taxi: '导航抉择（占位版）',
      gate: '人脸识别闸机（占位版）',
      traffic: '红绿灯/拥堵（占位版）',
      quiz: '考试预热问答（占位版）',
    };
    document.getElementById('qteTitle').textContent = titles[id] || '快速反应';
    document.getElementById('qteDesc').innerHTML = '在 <strong>3 秒</strong> 内按下 <span class="kbd">Space</span> 或点击“现在！”。';

    let done = false;
    let timer = setTimeout(() => finish(false), 3000);

    function onKey(e){ if(e.code==='Space'){ finish(true); } }
    function finish(ok){
      if(done) return;
      done = true;
      clearTimeout(timer);
      window.removeEventListener('keydown', onKey);
      qteDlg.close();
      resolve(ok);
    }
    window.addEventListener('keydown', onKey);
    qteBtn.onclick = ()=> finish(true);
    qteGiveup.onclick = ()=> finish(false);
    qteDlg.showModal();
  });
}

/** ========================
 * 流程引擎
 * ======================== */
function startCountdown() {
  game.running = true;
  setState('在路上');
  tickHandle = setInterval(() => {
    if (!game.running) return;
    game.remaining -= 1; // 每秒减 1 秒
    if (game.remaining <= 0) {
      game.remaining = 0;
      renderClock();
      clearInterval(tickHandle);
      return finishJourney();
    }
    renderClock();
  }, 1000);
}

function showRoutes() {
  $intro.style.display = 'none';
  $routes.style.display = '';
  $logWrap.style.display = '';
  setState('选择路线');
}

function chooseRoute(id) {
  game.route = id;
  game.stepIndex = 0;
  logMsg(`选择路线：${ROUTES[id].name}`);
  $routes.style.display = 'none';
  $nodeCard.style.display = '';
  renderStep();
}

async function renderStep() {
  const route = ROUTES[game.route];
  const step = route.steps[game.stepIndex];

  // 节点标题/描述
  $nodeTitle.textContent = `节点 ${game.stepIndex + 1} / ${route.steps.length} · ${step.title}`;
  $nodeDesc.textContent = (typeof step.desc === 'function') ? step.desc() : step.desc;
  $nodeActions.innerHTML = '';

  // 基础耗时（支持函数）
  const baseCost = typeof step.baseCost === 'function' ? step.baseCost() : (step.baseCost || 0);
  spend(baseCost);

  // 若有小游戏：启动占位，获得成功/失败，按结果追加耗时
  if (step.miniGame) {
    const lateTime = await startMiniGame(step.miniGame.id);
    // lateTime 已经是实际浪费时间，直接记录日志
    const minutes = Math.floor(lateTime / 60);
    const seconds = lateTime % 60;
    logMsg(`小游戏【${step.miniGame.id}】浪费了 ${minutes}分${seconds}秒`);
      
  // 特殊：抢票失败（用 600 表示），强制换方案
  if (step.miniGame.id === '12306' && lateTime == 600) {
    logMsg('没抢到票！被迫改道：切回路线1（地铁直达）');
    game.route = 'subway';
    game.stepIndex = 1; // 视为已去到地铁
    return renderStep();
  }

  }

  // 附加动作按钮（可影响状态）
  if (step.actions && step.actions.length) {
    step.actions.forEach(act => {
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.textContent = act.label;
      btn.onclick = () => {
        act.do && act.do();
        btn.disabled = true;
        btn.textContent = '已执行';
      };
      $nodeActions.appendChild(btn);
    });
  }

  // 下一步/结算按钮
  const nextBtn = document.createElement('button');
  nextBtn.className = 'btn primary';
  nextBtn.textContent = (game.stepIndex < route.steps.length - 1) ? '继续前进' : '到达终点';
  nextBtn.onclick = () => {
    if (game.stepIndex < route.steps.length - 1) {
      game.stepIndex++;
      renderStep();
    } else {
      finishJourney();
    }
  };
  $nodeActions.appendChild(nextBtn);

  renderClock();
}

function finishJourney() {
  game.running = false;
  setState('已抵达 / 结算');
  $nodeCard.style.display = 'none';
  $ending.style.display = '';

  const late = Math.max(0, Math.ceil(-game.remaining)); // 如果剩余为负，表示晚了多少分钟
  let text = '';
  if (game.remaining > 10) {
    text = `🎉 <span class="ok">完美结局</span>：提前到达（剩余 ${Math.round(game.remaining)} 分钟）。你就是“考场 MVP”。`;
  } else if (game.remaining >= 0) {
    text = `✅ 普通结局：勉强准点或略有余裕（剩余 ${Math.round(game.remaining)} 分钟）。`;
  } else if (late <= 10) {
    text = `😓 普通结局：迟到 ${late} 分钟，灰头土脸赶到。`;
  } else if (late <= 30) {
    text = `❌ 失败结局：迟到 ${late} 分钟，考试压力山大。`;
  } else {
    text = `💥 坏结局：迟到 ${late} 分钟以上，考试失之交臂。`;
  }
  // 隐藏结局示例（体力/连续成功等条件都可以触发）
  if (game.hp >= 80 && game.remaining >= 15) {
    text += `<br>🌟 <span class="warnc">隐藏结局</span>：一路顺利，还在校门口和同学唠嗑；赵丰年老师看你很努力，给你加了点分。`;
  }
  $endingText.innerHTML = text;
}

/** ========================
 * 事件绑定 & 初始化
 * ======================== */
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


