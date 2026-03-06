
// Word Wand v9.3.7 — use visualViewport width/height + pageLeft/pageTop and CSS width/height
window.addEventListener('error', e => console.log('WW v9.3.7 runtime error:', e.message));

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

function setDiscoVisibility(){ const w=document.getElementById('discoSpeedWrap'); if(w) w.style.display = (colorSelect.value==='disco') ? 'flex' : 'none'; }
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

const dpr = Math.max(1, devicePixelRatio||1);
const ctx = wand.getContext('2d',{alpha:false});
function getVV(){ const vv=window.visualViewport; return vv?{w:vv.width,h:vv.height,px:vv.pageLeft||0,py:vv.pageTop||0,ox:vv.offsetLeft||0,oy:vv.offsetTop||0}:{w:innerWidth,h:innerHeight,px:0,py:0,ox:0,oy:0}; }
function applyVV(){
  const v=getVV();
  // Size internal buffer
  wand.width = Math.round(v.w * dpr);
  wand.height = Math.round(v.h * dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  // Position the canvas using pageLeft/pageTop (accounts for layout + pinch zoom), fall back to offset
  const left = (v.px || v.ox || 0);
  const top  = (v.py || v.oy || 0);
  wand.style.transform = `translate(${Math.round(left)}px, ${Math.round(top)}px)`;
  // Also set explicit CSS size to match CSS pixels
  wand.style.width = Math.round(v.w) + 'px';
  wand.style.height = Math.round(v.h) + 'px';
}
window.addEventListener('resize', applyVV); if(window.visualViewport){ visualViewport.addEventListener('resize', applyVV); visualViewport.addEventListener('scroll', applyVV); }
applyVV();

function overlay(){ const v=getVV(); const w=Math.round(v.w), h=Math.round(v.h);
  // flashing border
  const t = performance.now()/250; const a = (Math.floor(t)%2)?1:0; ctx.strokeStyle = a? 'yellow' : 'orange'; ctx.lineWidth = 4; ctx.strokeRect(2,2,w-4,h-4);
  // crosshair & labels
  ctx.strokeStyle = '#444'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(w/2,0); ctx.lineTo(w/2,h); ctx.moveTo(0,h/2); ctx.lineTo(w,h/2); ctx.stroke();
  ctx.fillStyle='#0f0'; ctx.font='14px ui-monospace, Menlo, Consolas, monospace';
  ctx.fillText(`Rendering v9.3.7 (vv diag)`, 12, 24);
  ctx.fillText(`VV: ${Math.round(v.w)}×${Math.round(v.h)}  page:${Math.round(v.px)},${Math.round(v.py)}  off:${Math.round(v.ox)},${Math.round(v.oy)}  DPR:${dpr.toFixed(2)}`, 12, 42);
  ctx.fillStyle='#0ff'; ctx.font='bold 18px ui-monospace, Menlo, Consolas, monospace'; ctx.fillText('CENTER', w/2-38, h/2-70);
}

let isPlaying=false, sessionEnd=0, DOT_COLOR='#ffffff';
function frame(){ if(!isPlaying) return; applyVV(); const v=getVV(); const w=Math.round(v.w), h=Math.round(v.h); ctx.fillStyle='#000'; ctx.fillRect(0,0,w,h); overlay(); ctx.fillStyle=DOT_COLOR; ctx.beginPath(); ctx.arc(w/2,h/2,64,0,Math.PI*2); ctx.fill(); if(sessionEnd!==Infinity && performance.now()>sessionEnd) stopPlay(); requestAnimationFrame(frame); }

function startPlay(){ if(!textInput.value.trim()) return; textInput.blur(); try{ window.scrollTo({top:0,left:0,behavior:'instant'}); }catch{ window.scrollTo(0,0); } DOT_COLOR=colorSelect.value||'#ffffff'; isPlaying=true; const dur=(durationSelect.value==='Infinity')?Infinity:Number(durationSelect.value); welcome.style.transition='opacity .4s'; welcome.style.opacity='0'; setTimeout(()=>{ welcome.style.display='none'; wand.style.display='block'; stopBtn.style.display='block'; sessionEnd=performance.now()+dur; applyVV(); requestAnimationFrame(frame); },400); }
function stopPlay(){ isPlaying=false; wand.style.display='none'; stopBtn.style.display='none'; welcome.style.display='flex'; setTimeout(()=>welcome.style.opacity='1',20); }
stopBtn.onclick=stopPlay; goBtn.onclick=startPlay; goBtn.disabled=!textInput.value.trim();
