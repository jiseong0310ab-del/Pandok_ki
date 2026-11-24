// SAYNUE appearance: follows the system unless the viewer picks light or dark.
// Loaded synchronously in <head> so the chosen theme applies before first paint.
// Only one enum ("light" | "dark") is stored, in this browser only.
(function(){
 var KEY="saynue:theme:v1";
 var root=document.documentElement;
 var media=window.matchMedia?window.matchMedia("(prefers-color-scheme: light)"):null;
 function stored(){try{var v=localStorage.getItem(KEY);return v==="light"||v==="dark"?v:null}catch(_){return null}}
 function effective(choice){return choice||(media&&media.matches?"light":"dark")}
 function paint(choice){
  if(choice)root.setAttribute("data-theme",choice);else root.removeAttribute("data-theme");
  var color=effective(choice)==="light"?"#f6f5fa":"#0f0f14";
  var metas=document.querySelectorAll('meta[name="theme-color"]');
  for(var i=0;i<metas.length;i++){metas[i].setAttribute("content",color);metas[i].removeAttribute("media")}
 }
 paint(stored());
 if(media&&media.addEventListener)media.addEventListener("change",function(){if(!stored())paint(null)});
 window.SaynueTheme={
  get:function(){return stored()||"system"},
  set:function(choice){
   var value=choice==="light"||choice==="dark"?choice:null;
   try{if(value)localStorage.setItem(KEY,value);else localStorage.removeItem(KEY)}catch(_){}
   paint(value);
   return value||"system";
  }
 };
})();
