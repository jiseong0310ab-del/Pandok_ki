/* SAYNUE screenshot editor.
 * Everything here remains in browser memory until the user explicitly analyzes.
 * Only flattened, opaque-redacted JPEGs may be sent to the analyze API.
 */
(function(global){
"use strict";
const MAX_SHOTS=3;
const MAX_BASE64=950000;
const MAX_FILE=14*1024*1024;
function el(name,className,text){
  const node=document.createElement(name);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=text;
  return node;
}
function jpeg(canvas){
  let current=canvas;
  for(let attempt=0;attempt<5;attempt++){
    for(const quality of [.84,.76,.66,.55]){
      const url=current.toDataURL("image/jpeg",quality);
      if(url.startsWith("data:image/jpeg;base64,")&&url.length-23<=MAX_BASE64){
        return url.slice(23);
      }
    }
    const smaller=document.createElement("canvas");
    smaller.width=Math.max(1,Math.round(current.width*.85));
    smaller.height=Math.max(1,Math.round(current.height*.85));
    const ctx=smaller.getContext("2d",{alpha:false});
    if(!ctx)throw Error("IMAGE");
    ctx.fillStyle="#fff";
    ctx.fillRect(0,0,smaller.width,smaller.height);
    ctx.drawImage(current,0,0,smaller.width,smaller.height);
    current=smaller;
  }
  throw Error("IMAGE");
}
function imageFromURL(src){
  return new Promise((resolve,reject)=>{
    const img=new Image();
    img.onload=()=>{if(!img.naturalWidth||!img.naturalHeight)reject(Error("IMAGE"));else resolve(img)};
    img.onerror=()=>reject(Error("IMAGE"));
    img.src=src;
  });
}
async function prepare(file){
  if(!file||file.size>MAX_FILE||file.size<=0)throw Error("IMAGE");
  if(!/^image\//.test(file.type||"")&&!/\.(heic|heif|png|jpg|jpeg|webp)$/i.test(file.name||""))throw Error("IMAGE");
  const url=URL.createObjectURL(file);
  try{
    const original=await imageFromURL(url);
    const long=Math.max(original.naturalWidth,original.naturalHeight);
    const factor=Math.min(1,1600/long);
    const canvas=document.createElement("canvas");
    canvas.width=Math.max(1,Math.round(original.naturalWidth*factor));
    canvas.height=Math.max(1,Math.round(original.naturalHeight*factor));
    const ctx=canvas.getContext("2d",{alpha:false});
    if(!ctx)throw Error("IMAGE");
    ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(original,0,0,canvas.width,canvas.height);
    const compressed=jpeg(canvas);
    return {name:String(file.name||"Screenshot").slice(0,72),image:await imageFromURL("data:image/jpeg;base64,"+compressed),strokes:[],reviewed:false,safeData:null};
  }finally{URL.revokeObjectURL(url)}
}
function create({t,onError,onChange=()=>{}}){
  const fileInput=document.getElementById("chatImage");
  const list=document.getElementById("shotList");
  const canvas=document.getElementById("shotCanvas");
  const editor=document.getElementById("shotEditor");
  const count=document.getElementById("shotCount");
  const status=document.getElementById("shotStatus");
  const filename=document.getElementById("shotEditorName");
  const confirm=document.getElementById("shotConfirm");
  const undo=document.getElementById("shotUndo");
  const small=document.getElementById("shotBrushSmall");
  const big=document.getElementById("shotBrushBig");
  const label=document.getElementById("fileLabel");
  const ctx=canvas.getContext("2d",{alpha:false});
  if(!ctx)throw Error("IMAGE");
  const shots=[];
  let active=-1;
  let busy=false,revision=0;
  let drawing=false;
  let pointerId=null;
  let brush=32;
  function current(){return shots[active]||null}
  function notify(message){status.textContent=message||""}
  function paint(){
    const shot=current();
    if(!shot){editor.classList.add("hidden");return}
    editor.classList.remove("hidden");
    canvas.width=shot.image.naturalWidth;
    canvas.height=shot.image.naturalHeight;
    ctx.fillStyle="#fff";ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.drawImage(shot.image,0,0,canvas.width,canvas.height);
    for(const stroke of shot.strokes){
      if(!stroke.points.length)continue;
      ctx.lineWidth=stroke.width;
      ctx.lineCap="round";ctx.lineJoin="round";
      ctx.strokeStyle="#0b0b0b";ctx.fillStyle="#0b0b0b";
      ctx.beginPath();
      ctx.moveTo(stroke.points[0][0],stroke.points[0][1]);
      for(let j=1;j<stroke.points.length;j++)ctx.lineTo(stroke.points[j][0],stroke.points[j][1]);
      ctx.stroke();
      const p=stroke.points[0];
      ctx.beginPath();ctx.arc(p[0],p[1],stroke.width/2,0,Math.PI*2);ctx.fill();
    }
  }
  function rerender(){
    const ready=shots.filter(s=>s.reviewed).length;
    count.textContent=shots.length+" / "+MAX_SHOTS+" · "+ready+" "+t("shotReviewed");
    label.textContent=shots.length>=MAX_SHOTS?t("shotLimitReached"):t("uploadLabel");
    list.replaceChildren();
    shots.forEach((shot,i)=>{
      const row=el("div","shot-item"+(i===active?" active":""));
      const choose=el("button","shot-choice",(i+1)+". "+shot.name+" · "+t(shot.reviewed?"shotDone":"shotPending"));
      choose.type="button";choose.disabled=busy||drawing;
      choose.addEventListener("click",()=>{active=i;paint();rerender()});
      row.appendChild(choose);
      const controls=el("div","shot-controls");
      for(const [action,symbol,disabled] of [["up","↑",i===0],["down","↓",i===shots.length-1],["remove","×",false]]){
        const b=el("button","shot-control",symbol);
        b.type="button";b.disabled=busy||drawing||disabled;
        b.setAttribute("aria-label",t("shotAction"+action[0].toUpperCase()+action.slice(1))+" "+(i+1));
        b.addEventListener("click",()=>{
          if(action==="remove"){shots.splice(i,1);active=shots.length?Math.min(active>=i?Math.max(0,active-1):active,shots.length-1):-1}
          else{const j=action==="up"?i-1:i+1;[shots[i],shots[j]]=[shots[j],shots[i]];active=j}
          onChange();paint();rerender();notify(t("shotOrderHint"));
        });
        controls.appendChild(b);
      }
      row.appendChild(controls);list.appendChild(row);
    });
    filename.textContent=current()?(active+1)+". "+current().name:"";
    confirm.disabled=busy||drawing||!current();
    undo.disabled=busy||drawing||!current()||!current().strokes.length;
    small.setAttribute("aria-pressed",String(brush===32));
    big.setAttribute("aria-pressed",String(brush===60));
  }
  function point(e){
    const rect=canvas.getBoundingClientRect();
    return [
      Math.min(canvas.width,Math.max(0,(e.clientX-rect.left)*(canvas.width/rect.width))),
      Math.min(canvas.height,Math.max(0,(e.clientY-rect.top)*(canvas.height/rect.height)))
    ];
  }
  function start(e){
    if(busy||!current()||drawing||(e.pointerType==="mouse"&&e.button!==0))return;
    e.preventDefault();
    const rect=canvas.getBoundingClientRect();
    if(!rect.width||!rect.height)return;
    const item=current();
    item.strokes.push({width:brush*canvas.width/rect.width,points:[point(e)]});
    item.reviewed=false;item.safeData=null;onChange();
    drawing=true;pointerId=e.pointerId;
    if(canvas.setPointerCapture)canvas.setPointerCapture(e.pointerId);
    paint();rerender();
  }
  function move(e){
    if(!drawing||e.pointerId!==pointerId||!current())return;
    e.preventDefault();
    current().strokes[current().strokes.length-1].points.push(point(e));
    paint();
  }
  function end(e){
    if(!drawing||e.pointerId!==pointerId)return;
    e.preventDefault();
    drawing=false;pointerId=null;
    paint();rerender();
  }
  canvas.addEventListener("pointerdown",start);
  canvas.addEventListener("pointermove",move);
  canvas.addEventListener("pointerup",end);
  canvas.addEventListener("pointercancel",end);
  undo.addEventListener("click",()=>{
    if(busy||drawing||!current())return;
    current().strokes.pop();current().reviewed=false;current().safeData=null;onChange();
    paint();rerender();notify(t("shotUndoHint"));
  });
  small.addEventListener("click",()=>{brush=32;rerender()});
  big.addEventListener("click",()=>{brush=60;rerender()});
  confirm.addEventListener("click",()=>{
    const shot=current();
    if(busy||drawing||!shot)return;
    try{
      // Render a new image from the canvas pixels AFTER black boxes are drawn.
      // Never submit the underlying original file or the preview image source.
      paint();
      shot.safeData=jpeg(canvas);
      shot.reviewed=true;
      rerender();
      notify(t("shotDoneHint"));
    }catch(_){onError();notify(t("shotImageError"))}
  });
  fileInput.addEventListener("change",async e=>{
    const incoming=Array.from(e.target.files||[]);
    e.target.value="";
    if(!incoming.length)return;
    if(busy)return;
    const capacity=MAX_SHOTS-shots.length;
    if(capacity<=0){notify(t("shotLimitReached"));return}
    if(incoming.length>capacity)notify(t("shotLimitReached"));
    else notify(t("shotPreparing"));
    const ticket=++revision;busy=true;onChange();rerender();
    let failures=0;
    try{
      for(const file of incoming.slice(0,capacity)){
        try{
          const shot=await prepare(file);
          if(ticket!==revision)return;
          shots.push(shot);
          active=shots.length-1;
          paint();
        }catch(_){failures++}
      }
    }finally{
      if(ticket!==revision)return;
      busy=false;rerender();
      if(failures){onError();notify(t("shotImageError"))}
      else if(shots.length)notify(t("shotOrderHint"));
    }
  });
  rerender();
  return {
    hasImages(){return shots.length>0},
    isBusy(){return busy||drawing},
    isReady(){return shots.length>0&&!busy&&!drawing&&shots.every(s=>s.reviewed&&typeof s.safeData==="string"&&s.safeData.length<=MAX_BASE64)},
    getImages(){return this.isReady()?shots.map(s=>({mimeType:"image/jpeg",base64:s.safeData})):[]},
    clear(){revision++;busy=false;drawing=false;pointerId=null;shots.splice(0);active=-1;fileInput.value="";canvas.width=1;canvas.height=1;paint();notify("");rerender();onChange();return true},
    refresh(){rerender()}
  };
}
global.SaynueScreenshotEditor=create;
})(window);
