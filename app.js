
// === Word Wand v9.3 ===
// Welcome UI → Play (POV) → Welcome. Two-column layout; magician on right.
// Includes: POV engine (7 rows), auto-mirror, disco mode, haptics,
// duration timer, Stop, Debug panel, Reset Cache, one-time Tip modal,
// and conditional Disco speed visibility.

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
const tipDialog = document.getElementById('tipDialog');
const tipOk = document.getElementById('tipOk');
const welcome = document.getElementById('welcome');
const wand = document.getElementById('wand');
const stopBtn = document.getElementById('stopBtn');
const debugPanel = document.getElementById('debugPanel');

// State
let isPlaying=false; let sessionEnd=0; let DOT_COLOR='#ffffff'; let DISCO_SPEED=1.8;
let sensorsStarted=false; let filtYaw=0, prevFiltYaw=0, vel=0, filtVel=0, lastDir='ltr', lastFlipTs=0;
let currentYaw=0, minYaw=-35, maxYaw=35; let calibrating=false, calStart=0; let sweepBoost=0;

// POV text → columns cache
const NUM_ROWS=7; const VERTICAL_DILATE=2; let textColumns=[]; let colCount=0;

// Helpers
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const dpr = Math.max(1, devicePixelRatio||1);
const ctx = wand.getContext('2d',{alpha:false});
function resizeCanvas(){ wand.width = Math.floor(innerWidth*dpr); wand.height = Math.floor(innerHeight*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); }
addEventListener('resize', resizeCanvas);
resizeCanvas();

function setDiscoVisibility(){
  discoSpeedWrap.style.display = (colorSelect.value==='disco') ? 'flex' : 'none';
}

// Input wiring
textInput.addEventListener('input', ()=>{ goBtn.disabled = !textInput.value.trim(); buildColumns(); });
colorSelect.addEventListener('change', ()=>{ DOT_COLOR=colorSelect.value; setDiscoVisibility(); });
discoSpeed.addEventListener('input', ()=>{ DISCO_SPEED=parseFloat(discoSpeed.value)||1.8; discoSpeedVal.textContent = DISCO_SPEED.toFixed(1)+"×"; });
helpBtn.onclick=()=>helpDialog.showModal();
closeHelp.onclick=()=>helpDialog.close();
debugToggle.onclick=()=>{ const v = debugPanel.style.display!=='block'; debugPanel.style.display = v?'block':'none'; };

resetBtn.onclick=()=>{
  if('serviceWorker' in navigator){
    caches.keys().then(keys=>Promise.all(keys.map(k=>caches.delete(k)))).then(()=>navigator.serviceWorker.getRegistrations())
      .then(regs=>Promise.all(regs.map(r=>r.unregister()))).then(()=>location.reload());
  } else { location.reload(); }
};

// One-time welcome tip
(function showTipOnce(){ try{ if(!localStorage.getItem('ww_tip_seen')){ tipDialog.showModal(); } }catch{} })();
tipOk?.addEventListener('click',()=>{ try{ localStorage.setItem('ww_tip_seen','1'); }catch{} tipDialog.close(); });

// Build text into column bitmaps
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
buildColumns();

// Sensors & motion
function quatToEulerY(q){ const [w,x,y,z]=q; const sinp=2*(w*y - z*x); const pitch=(Math.abs(sinp)>=1)?Math.sign(sinp)*Math.PI/2:Math.asin(sinp); return pitch*180/Math.PI; }
async function startSensors(){
  if(sensorsStarted) return; sensorsStarted=true;
  try{ const DOE=globalThis.DeviceOrientationEvent; if(DOE && typeof DOE.requestPermission==='function'){ const res=await DOE.requestPermission(); if(res!=='granted') throw new Error('iOS motion denied'); } }catch{}
  try{ const Rel=globalThis.RelativeOrientationSensor, Abs=globalThis.AbsoluteOrientationSensor; const C=Rel||Abs; if(C){ const s=new C({frequency:60, referenceFrame:'device'}); s.addEventListener('reading',()=>{ if(s.quaternion){ const ydeg=quatToEulerY(s.quaternion); currentYaw=currentYaw*0.82 + ydeg*0.18; } }); s.start(); } }catch(e){ /* ignore */ }
  try{ addEventListener('deviceorientation',(e)=>{ if(typeof e.gamma==='number'&&!Number.isNaN(e.gamma)){ currentYaw=currentYaw*0.85 + e.gamma*0.15; } }, {passive:true}); }catch{}
}

function beginCalibration(){ calibrating=true; calStart=performance.now(); minYaw=+Infinity; maxYaw=-Infinity; }
function updateCalibration(){ if(!calibrating) return; const t=performance.now()-calStart; minYaw=Math.min(minYaw,currentYaw); maxYaw=Math.max(maxYaw,currentYaw); if(t>2500){ calibrating=false; if(Math.abs(maxYaw-minYaw)<10){ minYaw=-35; maxYaw=35; } } }

// Direction, auto-mirror, haptics
const VEL_THR=0.20, FLIP_COOLDOWN=650;
function updateMotion(){
  filtYaw = 0.85*filtYaw + 0.15*currentYaw; vel=filtYaw - prevFiltYaw; prevFiltYaw=filtYaw; filtVel=0.8*filtVel + 0.2*vel;
  const speeding=Math.abs(filtVel)>VEL_THR; sweepBoost=sweepBoost*0.85 + (speeding?1:0)*0.15;
  const now=performance.now(); if(speeding && (now-lastFlipTs)>FLIP_COOLDOWN){ const nd=(filtVel>0)?'ltr':'rtl'; if(nd!==lastDir){ lastDir=nd; lastFlipTs=now; } }
  if(hapticsChk.checked && 'vibrate' in navigator && isPlaying && speeding){ if(!updateMotion._last || now-updateMotion._last>900){ navigator.vibrate(12); updateMotion._last=now; } }
}

// Disco color helper
function hsvToRgb(h,s,v){ const c=v*s, hh=(h%360)/60, x=c*(1-Math.abs((hh%2)-1)); let r=0,g=0,b=0; if(0<=hh&&hh<1){r=c;g=x;} else if(1<=hh&&hh<2){r=x;g=c;} else if(2<=hh&&hh<3){g=c;b=x;} else if(3<=hh&&hh<4){g=x;b=c;} else if(4<=hh&&hh<5){r=x;b=c;} else {r=c;b=x;} const m=v-c; return [Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)]; }
let hueBase=0;

// Draw one column of dots
function drawColumn(bits){
  const w=wand.clientWidth, h=wand.clientHeight; ctx.fillStyle='#000'; ctx.fillRect(0,0,w,h);
  const base=0.94, heightFactor= base + (1.0-base)*sweepBoost; const spacing=(h*heightFactor)/NUM_ROWS;
  const diam=Math.min(spacing, Math.max(10, spacing*0.9)); const gap=Math.max(1, spacing-diam);
  const total=NUM_ROWS*(diam+gap); const top=(h-total)/2 + diam/2; const disco=(DOT_COLOR==='disco');
  for(let r=0;r<NUM_ROWS;r++) if(bits[r]){ const y=top + r*(diam+gap), x=w/2; if(disco){ const hue=(hueBase + r*12)%360; const [rr,gg,bb]=hsvToRgb(hue,1,0.97); ctx.fillStyle=`rgb(${rr},${gg},${bb})`; } else { ctx.fillStyle=DOT_COLOR; } ctx.beginPath(); ctx.arc(x,y,diam/2,0,Math.PI*2); ctx.fill(); }
}

function getCol(idx){ return textColumns[Math.max(0,Math.min(colCount-1,idx))] || new Uint8Array(NUM_ROWS); }

// Main animation loop
let autoPhase=0;
function animate(){ requestAnimationFrame(animate); if(!isPlaying){ return; }
  updateCalibration(); updateMotion();
  const effectiveMirror = autoMirrorChk.checked ? (lastDir==='rtl') : false;
  let left=minYaw, right=maxYaw; if(effectiveMirror) [left,right]=[right,left];
  const range=(right-left); let s=0.5; if(Math.abs(range)>5&&isFinite(range)) s=(currentYaw-left)/range; s=clamp(s,0,1);
  const idx=Math.floor(s*(colCount-1));
  drawColumn(getCol(idx));
  if(colorSelect.value==='disco'){ hueBase=(hueBase + DISCO_SPEED)%360; }
  if(sessionEnd!==Infinity && performance.now()>sessionEnd) stopPlay();
}

// Start/Stop
function startPlay(){ if(!textInput.value.trim()) return; isPlaying=true; if(!sensorsStarted) startSensors(); beginCalibration();
  const dur=(durationSelect.value==='Infinity')?Infinity:Number(durationSelect.value);
  welcome.style.transition='opacity .4s'; welcome.style.opacity='0'; setTimeout(()=>{ welcome.style.display='none'; wand.style.display='block'; stopBtn.style.display='block'; sessionEnd=performance.now()+dur; }, 400);
}
function stopPlay(){ isPlaying=false; wand.style.display='none'; stopBtn.style.display='none'; welcome.style.display='flex'; setTimeout(()=>welcome.style.opacity='1',20); }
stopBtn.onclick = stopPlay;

goBtn.onclick = startPlay;

// Show disco slider on load if needed
setDiscoVisibility();

// Debug ticker
setInterval(()=>{
  if(debugPanel.style.display==='block'){
    debugPanel.textContent = [
      `playing=${isPlaying}`,
      `color=${colorSelect.value}`,
      `discoSpeed=${DISCO_SPEED.toFixed(1)}×`,
      `autoMirror=${autoMirrorChk.checked}`,
      `haptics=${hapticsChk.checked}`,
      `yaw≈${currentYaw.toFixed(1)}`,
      `vel≈${filtVel.toFixed(3)}`,
      `lastDir=${lastDir}`,
      `cache=ww-v9-3`
    ].join('
');
  }
}, 300);

// enable/disable Go button
goBtn.disabled = !textInput.value.trim();
