// 流程引擎：这个文件包含游戏的主要逻辑和状态管理

function startCountdown() {
  game.running = true;
  setState('在路上');
  tickHandle = setInterval(() => {
    if (!game.running) return;
    game.remaining -= 1; // 每秒减 1 秒
    // if (game.remaining <= 0) {
    //   game.remaining = 0;
    //   renderClock();
    //   clearInterval(tickHandle);
    //   return finishJourney();
    // }
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
  if (game.remaining > 600) {
    text = `🎉 <span class="ok">完美结局</span>：提前到达（剩余 ${Math.round(game.remaining)} 秒）。你在考场门口吃了根烤肠，还顺手帮监考老师搬了桌子，荣获“考场 MVP”称号！`;
  } else if (game.remaining >= 0) {
    text = `✅ 普通结局：勉强准点（剩余 ${Math.round(game.remaining)} 秒钟）。你冲进教室大喊“老师别关门！”，结果还是踩着铃声坐下了，心跳当场变成 180。`;
  } else if (late <= 300) {
    text = `😓 小翻车结局：迟到 ${late} 秒，满头大汗，裤脚还夹着共享单车锁链。考场同学纷纷投来“辛苦了”的眼神。`;
  } else if (late <= 600) {
    text = `❌ 悲催结局：迟到 ${late} 秒，你推门而入，赵丰年老师摇头叹气：<em>“年轻人，地铁挤不过时间。”</em>`;
  } else {
  text = `💥 坏结局：迟到 ${late} 秒以上。你气喘吁吁冲进考场门口，却被赵丰年拦住：<br>
  <em>“同学，别费劲了，机会已经溜走，就像你追不上地铁一样。”</em><br>
  你被温柔而坚定地请出了考场，只能在门口默默望天……`;
  }

  // 隐藏结局示例（体力/连续成功等条件都可以触发）
  if (game.hp >= 80 && game.remaining >= 800) {
    text += `<br>🌟 <span class="warnc">隐藏结局</span>：一路顺利，还在校门口和同学唠嗑；赵丰年老师看你很努力，给你加了点分。`;
  }
  $endingText.innerHTML = text;
}
