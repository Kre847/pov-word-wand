
// Word Wand v9.3.4 — visualViewport centering + real POV dots (with ?test=1 overlay)
window.addEventListener('error', e => console.log('WW v9.3.4 runtime error:', e.message));

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

const params = new URLSearchParams(location.search);
const SHOW_TEST = params.has('test');

function setDiscoVisibility(){ discoSpeedWrap.style.display = (colorSelect.value==='disco') ? 'flex' : 'none'; }
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

// ---- Viewport-safe sizing using visualViewport ----
const dpr = Math.max(1, devicePixelRatio||1);
const ctx = wand.getContext('2d',{alpha:false});
function getCssViewport(){
  const vv = window.visualViewport;
  if (vv) return { w: Math.max(1, Math.round(vv.width)), h: Math.max(1, Math.round(vv.height)) };
  return { w: Math.max(1, Math.round(innerWidth)), h: Math.max(1, Math.round(innerHeight)) };
}
function resizeCanvas(){ const {w,h}=getCssViewport(); wand.width=Math.round(w*dpr); wand.height=Math.round(h*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }
addEventListener('resize', resizeCanvas); if (window.visualViewport){ visualViewport.addEventListener('resize', resizeCanvas); visualViewport.addEventListener('scroll', resizeCanvas); }
resizeCanvas();

// ---- POV Text → Columns (rows=7) ----
const NUM_ROWS=7, VERTICAL_DILATE=2; let textColumns=[], colCount=0;
function buildColumns(){
  const txt=(textInput.value||'').toUpperCase().slice(0,24);
  if(!txt){ textColumns=[new Uint8Array(NUM_ROWS)]; colCount=1; return; }
  const off=document.createElement('canvas'); const g=off.getContext('2d'); const fs=300;
  g.font=`800 ${fs}px system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif`; const m=g.measureText(txt);
  const W=Math.ceil(m.width + fs*0.4), H=Math.ceil(fs*1.5); off.width=W; off.height=H;
  g.fillStyle='#000'; g.fillRect(0,0,W,H); g.fillStyle='#fff'; g.textBaseline='top'; g.font=`800 ${fs}px system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif`;
  g.fillText(txt, fs*0.2, fs*0.1);
  const img=g.getImageData(0,0,W,H).data; const cols=[]; const pad=6; for(let s=0;s<pad;s++) cols.push(new Uint8Array(NUM_ROWS));
  for(let x=0;x<W;x++){
    const col=new Uint8Array(NUM_ROWS);
    for(let r=0;r<NUM_ROWS;r++){
      const y=Math.floor((r+0.5)/NUM_ROWS*H); const idx=(y*W+x)*4; const lum=img[idx]*0.2126+img[idx+1]*0.7152+img[idx+2]*0.0722; col[r]=lum>40?1:0;
    }
    if(VERTICAL_DILATE>0){ const thick=new Uint8Array(NUM_ROWS); for(let r=0;r<NUM_ROWS;r++){ let on=0; for(let k=-VERTICAL_DILATE;k<=VERTICAL_DILATE;k++){ const rr=r+k; if(rr>=0&&rr<NUM_ROWS&&col[rr]){on=1;break;} } thick[r]=on; } cols.push(thick); }
    else cols.push(col);
  }
  for(let s=0;s<pad;s++) cols.push(new Uint8Array(NUM_ROWS)); textColumns=cols; colCount=cols.length;
}
textInput.addEventListener('input', buildColumns); buildColumns();

// ---- Motion & auto-mirror (simplified) ----
let sensorsStarted=false, currentYaw=0, filtYaw=0, prevFiltYaw=0, filtVel=0, lastDir='ltr', lastFlipTs=0, sweepBoost=0;
const VEL_THR=0.20, FLIP_COOLDOWN=650;
function quatToEulerY(q){ const [w,x,y,z]=q; const sinp=2*(w*y - z*x); const pitch=(Math.abs(sinp)>=1)?Math.sign(sinp)*Math.PI/2:Math.asin(sinp); return pitch*180/Math.PI; }
async function startSensors(){
  if(sensorsStarted) return; sensorsStarted=true;
  try{ const DOE=globalThis.DeviceOrientationEvent; if(DOE && typeof DOE.requestPermission==='function'){ const res=await DOE.requestPermission(); if(res!=='granted') throw 0; } }catch{}
  try{ const Rel=globalThis.RelativeOrientationSensor, Abs=globalThis.AbsoluteOrientationSensor; const C=Rel||Abs; if(C){ const s=new C({frequency:60, referenceFrame:'device'}); s.addEventListener('reading',()=>{ if(s.quaternion){ const ydeg=quatToEulerY(s.quaternion); currentYaw=currentYaw*0.82 + ydeg*0.18; } }); s.start(); } }catch{}
  try{ addEventListener('deviceorientation',(e)=>{ if(typeof e.gamma==='number'&&!Number.isNaN(e.gamma)) currentYaw=currentYaw*0.85 + e.gamma*0.15; }, {passive:true}); }catch{}
}
function updateMotion(){
  filtYaw = 0.85*filtYaw + 0.15*currentYaw; const vel=filtYaw - prevFiltYaw; prevFiltYaw=filtYaw; filtVel = 0.8*filtVel + 0.2*vel;
  const speeding=Math.abs(filtVel)>VEL_THR; sweepBoost = sweepBoost*0.85 + (speeding?1:0)*0.15;
  const now=performance.now(); if(speeding && (now-lastFlipTs)>FLIP_COOLDOWN){ const nd=(filtVel>0)?'ltr':'rtl'; if(nd!==lastDir){ lastDir=nd; lastFlipTs=now; } }
  if(hapticsChk.checked && 'vibrate' in navigator && isPlaying && speeding){ if(!updateMotion._t || now-updateMotion._t>900){ navigator.vibrate(12); updateMotion._t=now; } }
}

// ---- Rendering ----
let hueBase=0; const DISCO_STEP=12; let isPlaying=false, sessionEnd=0, DOT_COLOR='#ffffff';
function drawPOV(){
  if(!isPlaying) return;
  const {w,h}=getCssViewport();
  ctx.fillStyle='#000'; ctx.fillRect(0,0,w,h);
  const base=0.94, heightFactor= base + (1.0-base)*sweepBoost; const spacing=(h*heightFactor)/NUM_ROWS; const diam=Math.min(spacing, Math.max(10, spacing*0.9)); const gap=Math.max(1, spacing-diam);
  const total=NUM_ROWS*(diam+gap); const top=(h-total)/2 + diam/2; const disco=(DOT_COLOR==='disco');

  // Map yaw → column index (auto-mirror aware)
  const effectiveMirror = autoMirrorChk.checked ? (lastDir==='rtl') : false; let left=-35, right=35; if(effectiveMirror) [left,right]=[right,left];
  const s = Math.max(0, Math.min(1, (currentYaw - left)/((right-left)||1)));
  const idx = Math.floor(s * Math.max(0,colCount-1));
  const bits = (textColumns[idx] || new Uint8Array(NUM_ROWS));

  for(let r=0;r<NUM_ROWS;r++) if(bits[r]){
    const y = top + r*(diam+gap), x = w/2; // centre column for test
    if(disco){ const hue=(hueBase + r*DISCO_STEP)%360; const c=hsvToRgb(hue,1,0.97); ctx.fillStyle=`rgb(${c[0]},${c[1]},${c[2]})`; } else ctx.fillStyle=DOT_COLOR;
    ctx.beginPath(); ctx.arc(x,y,diam/2,0,Math.PI*2); ctx.fill();
  }

  if(colorSelect.value==='disco'){ hueBase=(hueBase + (parseFloat(discoSpeed.value)||1.8))%360; }

  updateMotion();
  if(sessionEnd!==Infinity && performance.now()>sessionEnd) stopPlay();
  requestAnimationFrame(SHOW_TEST?drawTest:drawPOV);
}

function hsvToRgb(h,s,v){ const c=v*s, hh=(h%360)/60, x=c*(1-abs((hh%2)-1)); function abs(n){return n<0?-n:n;} let r=0,g=0,b=0; if(0<=hh&&hh<1){r=c;g=x;} else if(1<=hh&&hh<2){r=x;g=c;} else if(2<=hh&&hh<3){g=c;b=x;} else if(3<=hh&&hh<4){g=x;b=c;} else if(4<=hh&&hh<5){r=x;b=c;} else {r=c;b=x;} const m=v-c; return [Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)]; }

// Test overlay renderer (optional with ?test)
function drawTest(){
  const {w,h}=getCssViewport();
  ctx.fillStyle='#000'; ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#444'; ctx.lineWidth=1; ctx.beginPath(); ctx.moveTo(w/2,0); ctx.lineTo(w/2,h); ctx.moveTo(0,h/2); ctx.lineTo(w,h/2); ctx.stroke();
  ctx.fillStyle='#0f0'; ctx.font='14px ui-monospace, Menlo, Consolas, monospace'; ctx.fillText('Rendering v9.3.4 (vv,test)',12,24);
  ctx.fillStyle=DOT_COLOR; ctx.beginPath(); ctx.arc(w/2,h/2,64,0,Math.PI*2); ctx.fill();
  if(sessionEnd!==Infinity && performance.now()>sessionEnd) stopPlay();
  requestAnimationFrame(SHOW_TEST?drawTest:drawPOV);
}

function lockScroll(lock){ document.body.style.overflow = lock ? 'hidden' : ''; }

function startPlay(){
  if(!textInput.value.trim()) return;
  textInput.blur(); try{ window.scrollTo({top:0,left:0,behavior:'instant'}); }catch{ window.scrollTo(0,0); }
  lockScroll(true); resizeCanvas();
  DOT_COLOR = colorSelect.value; if(DOT_COLOR!=='disco' && !DOT_COLOR) DOT_COLOR='#ffffff';
  isPlaying=true;
  const dur=(durationSelect.value==='Infinity')?Infinity:Number(durationSelect.value);
  welcome.style.transition='opacity .4s'; welcome.style.opacity='0';
  setTimeout(()=>{ welcome.style.display='none'; wand.style.display='block'; stopBtn.style.display='block'; sessionEnd=performance.now()+dur; requestAnimationFrame(SHOW_TEST?drawTest:drawPOV); startSensors(); },400);
}
function stopPlay(){ isPlaying=false; lockScroll(false); wand.style.display='none'; stopBtn.style.display='none'; welcome.style.display='flex'; setTimeout(()=>welcome.style.opacity='1',20); }
stopBtn.onclick=stopPlay; goBtn.onclick=startPlay;

goBtn.disabled=!textInput.value.trim();
