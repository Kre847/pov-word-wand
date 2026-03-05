
// Word Wand v9.3.1 (functional focus): magician removed, bigger input, safe Go/Stop/Buttons

window.addEventListener('error', e => console.log('WW v9.3.1 runtime error:', e.message));

// Elements
const textInput = document.getElementById('textInput');
const colorSelect = document.getElementById('colorSelect');
const discoSpeedWrap = document.getElementById('discoSpeedWrap');
const discoSpeed = document.getElementById('discoSpeed');
const discoSpeedVal = document.getElementById('discoSpeedVal');
const durationSelect = document.getElementById('durationSelect');
const autoMirrorChk = document.getElementById('autoMirrorChk');
const hapticsChk = document.getElementById('hapticsChk');
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

// Basic UI bindings
function setDiscoVisibility(){ discoSpeedWrap.style.display = (colorSelect.value==='disco') ? 'flex' : 'none'; }
setDiscoVisibility();
textInput.addEventListener('input', ()=> goBtn.disabled = !textInput.value.trim());
colorSelect.addEventListener('change', setDiscoVisibility);
discoSpeed.addEventListener('input', ()=> discoSpeedVal.textContent = (parseFloat(discoSpeed.value)||1.8).toFixed(1)+'×');
helpBtn.onclick = ()=> helpDialog.showModal();
closeHelp.onclick = ()=> helpDialog.close();
debugToggle.onclick = ()=>{ const on = debugPanel.style.display!=='block'; debugPanel.style.display = on?'block':'none'; if(on) debugPanel.textContent='debug on'; };

// Reset App Cache (manual SW + cache clear per MDN guidance)
resetBtn.onclick = ()=>{
  if('serviceWorker' in navigator){
    caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).then(()=>navigator.serviceWorker.getRegistrations())
      .then(regs=>Promise.all(regs.map(r=>r.unregister()))).then(()=>location.reload());
  } else { location.reload(); }
};

// Minimal play loop just to verify Go works (no sensors for now)
const dpr = Math.max(1, devicePixelRatio||1);
const ctx = wand.getContext('2d',{alpha:false});
function resizeCanvas(){ wand.width = Math.floor(innerWidth*dpr); wand.height = Math.floor(innerHeight*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }
addEventListener('resize', resizeCanvas); resizeCanvas();

let isPlaying=false; let sessionEnd=0; let DOT_COLOR='#ffffff';

function drawTest(){
  if(!isPlaying) return;
  const w=wand.clientWidth, h=wand.clientHeight; ctx.fillStyle='#000'; ctx.fillRect(0,0,w,h);
  // Draw a simple test indicator so we know canvas is live
  ctx.fillStyle=DOT_COLOR; ctx.beginPath(); ctx.arc(w/2, h/2, 40, 0, Math.PI*2); ctx.fill();
  if(sessionEnd!==Infinity && performance.now()>sessionEnd) stopPlay();
  requestAnimationFrame(drawTest);
}

function startPlay(){
  if(!textInput.value.trim()) return;
  DOT_COLOR = colorSelect.value==='disco' ? '#ffffff' : colorSelect.value;
  isPlaying=true;
  const dur = (durationSelect.value==='Infinity')?Infinity:Number(durationSelect.value);
  welcome.style.transition='opacity .4s'; welcome.style.opacity='0';
  setTimeout(()=>{ welcome.style.display='none'; wand.style.display='block'; stopBtn.style.display='block'; sessionEnd=performance.now()+dur; requestAnimationFrame(drawTest); },400);
}
function stopPlay(){ isPlaying=false; wand.style.display='none'; stopBtn.style.display='none'; welcome.style.display='flex'; setTimeout(()=>welcome.style.opacity='1',20); }

stopBtn.onclick = stopPlay;
goBtn.onclick = startPlay;

// Initialize Go button state once
goBtn.disabled = !textInput.value.trim();
