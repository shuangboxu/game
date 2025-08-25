// intro.js
document.addEventListener("DOMContentLoaded", () => {
  // 1. 闪烁标题
  const title = document.getElementById("introTitle");
  setInterval(() => {
    title.style.opacity = (title.style.opacity === "0.5" ? "1" : "0.5");
  }, 500);

  // 2. 打字机效果
  const introText = document.getElementById("introText");
  const content = `你正躺在 <strong>西城区</strong> 的床上，午觉睡得正香。<br>
  突然，手机震动把你惊醒——<br>
  <em style="color:#16a34a;">“警告！还有 <strong>60 分钟</strong> 就要在 <strong>北京理工大学良乡校区</strong> 参加 <strong>赵丰年</strong> 的终极考试！”</em><br>
  <span style="color:red; font-weight:bold; font-size:20px;">💥 跑快点，否则挂科警告！💥</span>`;

  let i = 0;
  function typeWriter() {
    if (i < content.length) {
      introText.innerHTML = content.slice(0, i+1);
      i++;
      setTimeout(typeWriter, 40); // 打字速度（40ms一个字）
    }
  }
  typeWriter();
});
