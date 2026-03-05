
// Word Wand v9.3.3: mobile centering fixes
window.addEventListener('error', e => console.log('WW v9.3.3 runtime error:', e.message));

const textInput = document.getElementById('textInput');
const colorSelect = document.getElementById('colorSelect');
const discoSpeedWrap = document.getElementById('discoSpeedWrap');
const discoSpeed = document.getElementById('discoSpeed');
const discoSpeedVal = document.getElementById('discoSpeedVal');
const durationSelect = document.getElementById('durationSelect');
const goBtn = document.getElementById('goBtn');
const helpBtn = document.getElementById('helpBtn');
const resetBtn = document.getElementById('resetBtn');
const debugToggle = document.getElementById('debugToggle');
const helpDialog = document.getElementById('helpDialog');
const closeHelp = document.getElementById('closeHelp');
const welcome = document.getElementById('welcome');
const wand = document.getElementById('wand');
const stopBtn = document.getElementById('stopBtn');
const debugPanel = document.getElementById('debugPanel');

function setDiscoVisibility(){ const w = document.getElementById('discoSpeedWrap'); w.style.display = (colorSelect.value==='disco') ? 'flex' : 'none'; }
textInput.addEventListener('input', ()=> goBtn.disabled = !textInput.value.trim());
colorSelect.addEventListener('change', setDiscoVisibility); setDiscoVisibility();
discoSpeed.addEventListener('input', ()=> discoSpeedVal.textContent = (parseFloat(discoSpeed.value)||1.8).toFixed(1)+'×');
helpBtn.onclick = ()=> helpDialog.showModal();
closeHelp.onclick = ()=> helpDialog.close();
debugToggle.onclick = ()=>{ const on = debugPanel.style.display!=='block'; debugPanel.style.display = on?'block':'none'; };

resetBtn.onclick = ()=>{
  if('serviceWorker' in navigator){
    caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).then(()=>navigator.serviceWorker.getRegistrations())
      .then(regs=>Promise.all(regs.map(r=>r.unregister()))).then(()=>location.reload());
  } else { location.reload(); }
};

// Canvas sizing: use innerWidth/innerHeight (CSS pixels) and scale by DPR.
const dpr = Math.max(1, devicePixelRatio||1);
const ctx = wand.getContext('2d',{alpha:false});
function resizeCanvas(){
  const cssW = Math.max(1, Math.round(window.innerWidth));
  const cssH = Math.max(1, Math.round(window.innerHeight));
  wand.width  = Math.round(cssW * dpr);
  wand.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0); // draw in CSS pixels
}
addEventListener('resize', resizeCanvas); resizeCanvas();

let isPlaying=false; let sessionEnd=0; let DOT_COLOR='#ffffff';

function drawTest(){
  if(!isPlaying) return;
  const w = Math.round(window.innerWidth);
  const h = Math.round(window.innerHeight);
  ctx.fillStyle = '#000'; ctx.fillRect(0,0,w,h);
  // Crosshair + text overlay to verify centering on all phones
  ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w/2,0); ctx.lineTo(w/2,h); ctx.moveTo(0,h/2); ctx.lineTo(w,h/2); ctx.stroke();
  ctx.fillStyle = '#0f0'; ctx.font = '14px ui-monospace, Menlo, Consolas, monospace'; ctx.fillText('Rendering v9.3.3 (test)', 12, 24);
  // Big dot at exact center
  ctx.fillStyle = DOT_COLOR; ctx.beginPath(); ctx.arc(w/2, h/2, 64, 0, Math.PI*2); ctx.fill();
  if(sessionEnd!==Infinity && performance.now()>sessionEnd) stopPlay();
  requestAnimationFrame(drawTest);
}

function lockScroll(lock){ document.body.style.overflow = lock ? 'hidden' : ''; }

function startPlay(){
  if(!textInput.value.trim()) return;
  // blur input and scroll to top to avoid mobile zoom/offset
  textInput.blur(); try{ window.scrollTo({top:0,left:0,behavior:'instant'}); }catch{ window.scrollTo(0,0); }
  lockScroll(true);
  DOT_COLOR = colorSelect.value==='disco' ? '#ffffff' : colorSelect.value;
  isPlaying = true;
  const dur = (durationSelect.value==='Infinity')?Infinity:Number(durationSelect.value);
  welcome.style.transition = 'opacity .4s'; welcome.style.opacity = '0';
  setTimeout(()=>{
    welcome.style.display = 'none';
    wand.style.display = 'block'; wand.style.zIndex = 999; resizeCanvas();
    stopBtn.style.display = 'block';
    sessionEnd = performance.now() + dur;
    requestAnimationFrame(drawTest);
  }, 400);
}
function stopPlay(){ isPlaying=false; lockScroll(false); wand.style.display='none'; stopBtn.style.display='none'; welcome.style.display='flex'; setTimeout(()=>welcome.style.opacity='1',20); }

stopBtn.onclick = stopPlay;
goBtn.onclick = startPlay;

goBtn.disabled = !textInput.value.trim();
