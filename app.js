
// Word Wand v9.3.10 — bitmap 5x7 font renderer for crisp letters; 8 rows output with scaling
window.addEventListener('error', e => console.log('WW v9.3.10 runtime error:', e.message));

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

function setDiscoVisibility(){ discoSpeedWrap.style.display = (colorSelect.value==='disco') ? 'flex' : 'none'; }
textInput.addEventListener('input', ()=> { goBtn.disabled = !textInput.value.trim(); buildColumns(); });
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

// Fullscreen helpers
async function enterFullScreen(){
  const el=document.documentElement; const anyEl=/** @type {any} */(el);
  try{ if(el.requestFullscreen) await el.requestFullscreen(); else if(anyEl.webkitRequestFullscreen) await anyEl.webkitRequestFullscreen(); }catch{}
}

// Canvas & viewport
const dpr = Math.max(1, devicePixelRatio||1);
const ctx = wand.getContext('2d',{alpha:false});
function getVV(){ const vv=window.visualViewport; return vv?{w:vv.width,h:vv.height,px:vv.pageLeft||0,py:vv.pageTop||0,ox:vv.offsetLeft||0,oy:vv.offsetTop||0}:{w:innerWidth,h:innerHeight,px:0,py:0,ox:0,oy:0}; }
function applyVV(){ const v=getVV(); wand.width=Math.round(v.w*dpr); wand.height=Math.round(v.h*dpr); ctx.setTransform(dpr,0,0,dpr,0,0); const left=(v.px||v.ox||0), top=(v.py||v.oy||0); wand.style.transform=`translate(${Math.round(left)}px, ${Math.round(top)}px)`; wand.style.width=Math.round(v.w)+'px'; wand.style.height=Math.round(v.h)+'px'; }
window.addEventListener('resize', applyVV); if(window.visualViewport){ visualViewport.addEventListener('resize', applyVV); visualViewport.addEventListener('scroll', applyVV); }
applyVV();

// --- 5x7 bitmap font (uppercase letters, digits, space, basic punctuation) ---
// Each char: 5 columns, 7 rows, LSB at top (bit0=row0). Numbers adapted from public 5x7 fonts.
const FONT5x7 = {
  ' ': [0,0,0,0,0],
  'A': [0x1E,0x05,0x05,0x1E,0x00],
  'B': [0x1F,0x15,0x15,0x0A,0x00],
  'C': [0x0E,0x11,0x11,0x0A,0x00],
  'D': [0x1F,0x11,0x11,0x0E,0x00],
  'E': [0x1F,0x15,0x15,0x11,0x00],
  'F': [0x1F,0x05,0x05,0x01,0x00],
  'G': [0x0E,0x11,0x15,0x1D,0x00],
  'H': [0x1F,0x04,0x04,0x1F,0x00],
  'I': [0x11,0x1F,0x11,0x00,0x00],
  'J': [0x08,0x10,0x10,0x0F,0x00],
  'K': [0x1F,0x04,0x0A,0x11,0x00],
  'L': [0x1F,0x10,0x10,0x10,0x00],
  'M': [0x1F,0x02,0x04,0x02,0x1F],
  'N': [0x1F,0x02,0x04,0x1F,0x00],
  'O': [0x0E,0x11,0x11,0x0E,0x00],
  'P': [0x1F,0x05,0x05,0x02,0x00],
  'Q': [0x0E,0x11,0x19,0x1E,0x00],
  'R': [0x1F,0x05,0x0D,0x12,0x00],
  'S': [0x12,0x15,0x15,0x09,0x00],
  'T': [0x01,0x1F,0x01,0x01,0x00],
  'U': [0x0F,0x10,0x10,0x0F,0x00],
  'V': [0x07,0x08,0x10,0x08,0x07],
  'W': [0x1F,0x08,0x04,0x08,0x1F],
  'X': [0x1B,0x04,0x04,0x1B,0x00],
  'Y': [0x03,0x04,0x18,0x04,0x03],
  'Z': [0x19,0x15,0x13,0x11,0x00],
  '0': [0x0E,0x11,0x11,0x0E,0x00],
  '1': [0x00,0x12,0x1F,0x10,0x00],
  '2': [0x12,0x19,0x15,0x12,0x00],
  '3': [0x11,0x15,0x15,0x0A,0x00],
  '4': [0x07,0x04,0x04,0x1F,0x00],
  '5': [0x17,0x15,0x15,0x09,0x00],
  '6': [0x0E,0x15,0x15,0x08,0x00],
  '7': [0x01,0x01,0x1D,0x03,0x00],
  '8': [0x0A,0x15,0x15,0x0A,0x00],
  '9': [0x02,0x15,0x15,0x0E,0x00]
};

const NUM_ROWS = 8; // output rows (physical dots), we scale the 7-row font to 8
const PAD_BETWEEN_CHARS = 4;
const PAD_BETWEEN_WORDS = 10;
let textColumns=[], colCount=0;

function scaleRow(sr){ // 7 -> NUM_ROWS mapping
  return Math.max(0, Math.min(6, Math.round(sr*(7-1)/(NUM_ROWS-1))));
}

function buildColumns(){
  const raw=(textInput.value||'').toUpperCase().replace(/[^A-Z0-9 ]/g,'').slice(0,24);
  const cols=[]; const padEdge=6; for(let i=0;i<padEdge;i++) cols.push(new Uint8Array(NUM_ROWS));
  for(let i=0;i<raw.length;i++){
    const ch=raw[i];
    if(ch===' '){ for(let p=0;p<PAD_BETWEEN_WORDS;p++) cols.push(new Uint8Array(NUM_ROWS)); continue; }
    const glyph = FONT5x7[ch] || FONT5x7[' ']; // 5 columns
    for(let c=0;c<glyph.length;c++){
      const bits = glyph[c];
      const col=new Uint8Array(NUM_ROWS);
      for(let r=0;r<NUM_ROWS;r++){
        const fr = scaleRow(r); // 0..6
        col[r] = ( (bits >> fr) & 1 ) ? 1 : 0;
      }
      cols.push(col);
    }
    const gap = (i<raw.length-1 && raw[i+1]!==' ')? PAD_BETWEEN_CHARS : 0;
    for(let p=0;p<gap;p++) cols.push(new Uint8Array(NUM_ROWS));
  }
  for(let i=0;i<padEdge;i++) cols.push(new Uint8Array(NUM_ROWS));
  textColumns=cols; colCount=cols.length;
}

buildColumns();

// Motion & mirror
let sensorsStarted=false, currentYaw=0, filtYaw=0, prevFiltYaw=0, filtVel=0, lastDir='ltr', lastFlipTs=0, sweepBoost=0;
const VEL_THR=0.20, FLIP_COOLDOWN=900;
function quatToEulerY(q){ const [w,x,y,z]=q; const sinp=2*(w*y - z*x); const pitch=(Math.abs(sinp)>=1)?Math.sign(sinp)*Math.PI/2:Math.asin(sinp); return pitch*180/Math.PI; }
async function startSensors(){
  if(sensorsStarted) return; sensorsStarted=true;
  try{ const DOE=globalThis.DeviceOrientationEvent; if(DOE && typeof DOE.requestPermission==='function'){ const res=await DOE.requestPermission(); if(res!=='granted') throw 0; } }catch{}
  try{ const Rel=globalThis.RelativeOrientationSensor, Abs=globalThis.AbsoluteOrientationSensor; const C=Rel||Abs; if(C){ const s=new C({frequency:60, referenceFrame:'device'}); s.addEventListener('reading',()=>{ if(s.quaternion){ const ydeg=quatToEulerY(s.quaternion); currentYaw=currentYaw*0.82 + ydeg*0.18; } }); s.start(); } }catch{}
  try{ addEventListener('deviceorientation',(e)=>{ if(typeof e.gamma==='number'&&!Number.isNaN(e.gamma)) currentYaw=currentYaw*0.85 + e.gamma*0.15; }, {passive:true}); }catch{}
}
function updateMotion(){
  filtYaw = 0.86*filtYaw + 0.14*currentYaw; const vel=filtYaw - prevFiltYaw; prevFiltYaw=filtYaw; filtVel = 0.82*filtVel + 0.18*vel;
  const speeding=Math.abs(filtVel)>VEL_THR; sweepBoost = sweepBoost*0.85 + (speeding?1:0)*0.15;
  const now=performance.now(); if(speeding && (now-lastFlipTs)>FLIP_COOLDOWN){ const nd=(filtVel>0)?'ltr':'rtl'; if(nd!==lastDir){ lastDir=nd; lastFlipTs=now; } }
  if(hapticsChk.checked && 'vibrate' in navigator && isPlaying && speeding){ if(!updateMotion._t || now-updateMotion._t>900){ navigator.vibrate(10); updateMotion._t=now; } }
}

// Rendering
let hueBase=0; const DISCO_STEP=12; let isPlaying=false, sessionEnd=0, DOT_COLOR='#ffffff';
function hsvToRgb(h,s,v){ const c=v*s, hh=(h%360)/60, x=c*(1-Math.abs((hh%2)-1)); let r=0,g=0,b=0; if(0<=hh&&hh<1){r=c;g=x;} else if(1<=hh&&hh<2){r=x;g=c;} else if(2<=hh&&hh<3){g=c;b=x;} else if(3<=hh&&hh<4){g=x;b=c;} else if(4<=hh&&hh<5){r=x;b=c;} else {r=c;b=x;} const m=v-c; return [Math.round((r+m)*255),Math.round((g+m)*255),Math.round((b+m)*255)]; }

function drawPOV(){
  if(!isPlaying) return; applyVV();
  const vv=getVV(); const w=Math.round(vv.w), h=Math.round(vv.h);
  // very light afterglow
  ctx.fillStyle='rgba(0,0,0,0.04)'; ctx.fillRect(0,0,w,h);
  const base=0.95, spacing=(h*base)/NUM_ROWS; const diam=Math.min(spacing, Math.max(7, spacing*0.82)); const gap=Math.max(1, spacing-diam);
  const total=NUM_ROWS*(diam+gap); const top=(h-total)/2 + diam/2; const disco=(DOT_COLOR==='disco');

  const effectiveMirror = autoMirrorChk.checked ? (lastDir==='rtl') : false; let left=-35, right=35; if(effectiveMirror) [left,right]=[right,left];
  const sRaw = (filtYaw - left)/((right-left)||1); const sClamped = Math.max(0, Math.min(1, sRaw));
  const idx = Math.floor(sClamped * Math.max(0,colCount-1));
  const bits = (textColumns[idx] || new Uint8Array(NUM_ROWS));

  for(let r=0;r<NUM_ROWS;r++) if(bits[r]){
    const y = top + r*(diam+gap), x = w/2;
    if(disco){ const hue=(hueBase + r*DISCO_STEP)%360; const c=hsvToRgb(hue,1,0.98); ctx.fillStyle=`rgb(${c[0]},${c[1]},${c[2]})`; } else ctx.fillStyle=DOT_COLOR;
    ctx.beginPath(); ctx.arc(x,y,diam/2,0,Math.PI*2); ctx.fill();
  }
  if(colorSelect.value==='disco'){ hueBase=(hueBase + (parseFloat(discoSpeed.value)||1.8))%360; }
  updateMotion();
  if(sessionEnd!==Infinity && performance.now()>sessionEnd) stopPlay();
  requestAnimationFrame(drawPOV);
}

function lockScroll(lock){ document.body.style.overflow = lock ? 'hidden' : ''; }
async function startPlay(){ if(!textInput.value.trim()) return; textInput.blur(); try{ window.scrollTo({top:0,left:0,behavior:'instant'}); }catch{ window.scrollTo(0,0); } lockScroll(true); DOT_COLOR=colorSelect.value||'#ffffff'; isPlaying=true; await enterFullScreen(); const dur=(durationSelect.value==='Infinity')?Infinity:Number(durationSelect.value); welcome.style.transition='opacity .4s'; welcome.style.opacity='0'; setTimeout(()=>{ welcome.style.display='none'; wand.style.display='block'; stopBtn.style.display='block'; sessionEnd=performance.now()+dur; requestAnimationFrame(drawPOV); startSensors(); },400); }
function stopPlay(){ isPlaying=false; lockScroll(false); if(document.fullscreenElement){ try{ document.exitFullscreen(); }catch{} } wand.style.display='none'; stopBtn.style.display='none'; welcome.style.display='flex'; setTimeout(()=>welcome.style.opacity='1',20); }
stopBtn.onclick=stopPlay; goBtn.onclick=startPlay; goBtn.disabled=!textInput.value.trim();
