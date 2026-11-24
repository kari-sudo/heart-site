(() => {
  const $ = id => document.getElementById(id);
  const on = (id, evt, fn) => { const el = $(id); if (el) el.addEventListener(evt, fn); };

  const stage = $("stage");
  const finalScreen = $("finalScreen");

  const defaultTexts = (window.heartTexts || ["I love you"]).slice();
  const defaults = window.heartDefaultSettings || { fontSize:14, speed:1, density:1, heartSize:.9, color:"#FF3028" };
  const keys = window.HEART_STORAGE || { texts:"heart.texts.v1", settings:"heart.settings.v1" };
  const personal = window.personalData || {};

  let texts = readTexts();
  let settings = readSettings();
  let words = [];
  let settled = false;
  let finished = false;
  let settleTimer;

  function readTexts(){ try{ const s=JSON.parse(localStorage.getItem(keys.texts)); if(Array.isArray(s)&&s.length) return s;}catch{} return defaultTexts; }
  function readSettings(){ try{ return {...defaults,...JSON.parse(localStorage.getItem(keys.settings))};}catch{return {...defaults};} }

  const canvas=document.createElement("canvas"); const ctx=canvas.getContext("2d");
  function measure(size){ ctx.font=`500 ${size}px Arial`; return t=>ctx.measureText(t).width; }

  function saveSettings(){ localStorage.setItem(keys.settings, JSON.stringify(settings)); }
  function applySettings(){ const r=document.documentElement.style; r.setProperty("--text",settings.color); r.setProperty("--font-size",settings.fontSize+"px"); r.setProperty("--speed",settings.speed); }

  function showFinalScreen(){
    if(finished) return; finished=true;
    stage.classList.add("stage-fade");
    finalScreen.classList.add("visible"); finalScreen.setAttribute("aria-hidden","false");
    const name = personal.name ? personal.name+",\n" : "";
    const phrase = personal.mainPhrase || "Моё сердце выбирает тебя";
    const full = name+phrase;
    const el=$("mainPhrase");
    if(personal.typingEffect){
      el.textContent=""; let i=0; const sp=Math.max(15,Number(personal.typingSpeed)||50);
      (function t(){ if(i>=full.length) return; el.textContent+=full[i++]; setTimeout(t,sp); })();
    } else el.textContent=full;
  }

  function buildHeart(){
    clearTimeout(settleTimer);
    stage.classList.remove("stage-fade");
    finalScreen.classList.remove("visible"); finalScreen.setAttribute("aria-hidden","true");
    finished=false; settled=false; stage.replaceChildren(); words=[];
    const items=window.HeartGeometry.layout({texts,fontSize:settings.fontSize,density:settings.density,heartSize:settings.heartSize,viewportW:innerWidth,viewportH:innerHeight,measure:measure(settings.fontSize)});
    const cx=innerWidth/2, cy=innerHeight/2, maxDelay=1.4/settings.speed;
    const frag=document.createDocumentFragment();
    for(const it of items){
      const e=document.createElement("span"); e.className="word"; e.textContent=it.text;
      const tx=cx+it.x-it.w/2, ty=cy+it.y-settings.fontSize/2;
      const a=Math.random()*Math.PI*2, rad=Math.max(innerWidth,innerHeight);
      e.style.setProperty("--x",(cx+Math.cos(a)*rad)+"px");
      e.style.setProperty("--y",(cy+Math.sin(a)*rad)+"px");
      e.style.setProperty("--delay",(Math.random()*maxDelay)+"s");
      frag.appendChild(e); words.push({e,x:tx,y:ty,w:it.w});
    }
    stage.appendChild(frag);
    requestAnimationFrame(()=>requestAnimationFrame(()=>{
      for(const w of words){ w.e.style.setProperty("--x",w.x+"px"); w.e.style.setProperty("--y",w.y+"px"); w.e.classList.add("placed"); }
      settleTimer=setTimeout(()=>{ for(const w of words) w.e.classList.add("settled"); settled=true; },(1.6/settings.speed+maxDelay)*1000+150);
    }));
  }

  if(stage) stage.addEventListener("click",()=>{ if(settled&&!finished) showFinalScreen(); });
  on("restartBtn","click",buildHeart);

  on("letterBtn","click",()=>{
    const lt=$("letterText"); if(lt) lt.textContent=personal.letter||"Я люблю тебя.";
    const ti=$("letterTitle"); if(ti) ti.textContent=personal.name?("Послание для "+personal.name):"Послание для тебя";
    const ov=$("letterOverlay"); if(ov){ ov.classList.add("open"); ov.setAttribute("aria-hidden","false"); }
  });
  function closeLetter(){ const ov=$("letterOverlay"); if(ov){ ov.classList.remove("open"); ov.setAttribute("aria-hidden","true"); } }
  on("closeLetter","click",closeLetter);
  on("letterOverlay","click",e=>{ if(e.target===$("letterOverlay")) closeLetter(); });
  document.addEventListener("keydown",e=>{ if(e.key==="Escape"){ closeLetter(); closePanel(); } });

  function openPanel(){ const p=$("panel"); if(p){p.classList.add("open");p.setAttribute("aria-hidden","false");} }
  function closePanel(){ const p=$("panel"); if(p){p.classList.remove("open");p.setAttribute("aria-hidden","true");} }
  on("settingsBtn","click",openPanel);
  on("closePanel","click",closePanel);

  const ti=$("textsInput"); if(ti) ti.value=texts.join("\n");
  on("applyBtn","click",()=>{ const arr=(ti?ti.value:"").split("\n").map(s=>s.trim()).filter(Boolean); texts=arr.length?arr:defaultTexts.slice(); localStorage.setItem(keys.texts,JSON.stringify(texts)); buildHeart(); });
  on("resetTextBtn","click",()=>{ texts=defaultTexts.slice(); localStorage.removeItem(keys.texts); if(ti)ti.value=texts.join("\n"); buildHeart(); });

  const controls=[["fontSize",v=>v+" px",true],["speed",v=>"×"+v,false],["density",v=>Number(v).toFixed(2),true],["heartSize",v=>Math.round(v*100)+"%",true],["color",null,false]];
  for(const [id,fmt,rebuild] of controls){
    const inp=$(id); if(!inp) continue; inp.value=settings[id];
    const lab=$(`${id}Val`); if(lab&&fmt) lab.textContent=fmt(settings[id]);
    inp.addEventListener("input",()=>{ settings[id]= id==="color"?inp.value:Number(inp.value); saveSettings(); applySettings(); if(lab&&fmt)lab.textContent=fmt(settings[id]); if(rebuild)buildHeart(); });
  }
  on("resetSettingsBtn","click",()=>{ settings={...defaults}; localStorage.removeItem(keys.settings); applySettings(); for(const [id,fmt] of controls){const inp=$(id);if(inp)inp.value=settings[id];const lab=$(`${id}Val`);if(lab&&fmt)lab.textContent=fmt(settings[id]);} buildHeart(); });

  let rt; window.addEventListener("resize",()=>{clearTimeout(rt);rt=setTimeout(buildHeart,200);});
  applySettings();
  if(document.fonts?.ready) document.fonts.ready.then(buildHeart); else buildHeart();
})();