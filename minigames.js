// 这个文件包含小游戏的启动和结果处理逻辑

function applyMiniGameResult(lateTime) {
  alert("小游戏结果：你浪费了 " + lateTime + " 秒！");
  game.remaining -= lateTime; // 扣时间
  renderClock();
}

function startMiniGame(id) {
  return new Promise(resolve => {
  if (id === 'crowd') {
    // 打开子窗口
    //const child = window.open("躲避人流.html", "_blank", "width=500,height=500");
    const child = window.open("躲避人流.html", "_blank");
    // 提供一个回调给子页面调用
    window.applyMiniGameResult = function(lateTime) {
      // 弹窗显示消耗时间
      alert("小游戏结果：你浪费了 " + lateTime + " 秒！");
      // 扣掉游戏总时间
      game.remaining -= lateTime;
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
  //const child = window.open("12306.html", "_blank", "width=500,height=500");
  const child = window.open("12306.html", "_blank");
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

    game.remaining -= (lateTime == 600 ? 0 : lateTime);
    renderClock();

    // 返回给 await startMiniGame(...) 的 Promise
    resolve(lateTime);

    // 关子窗
    if (child && !child.closed) child.close();
  };
  return; // 不走占位小游戏
}

//bike（骑行避障）
if (id === 'bike') {
  //const child = window.open("骑行避障.html", "_blank", "width=980,height=640");//在新窗口打开
  const child = window.open("骑行避障.html", "_blank");//在右侧打开新的页面
  window.applyMiniGameResult = function(resultSeconds) {
    alert("骑行避障返回： " + resultSeconds + " 秒（按规则计算）");

    game.remaining -= resultSeconds;
    renderClock();

    resolve(resultSeconds);

    if (child && !child.closed) child.close();
  };

  return; 
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
