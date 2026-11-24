// SAYNUE appearance: light by default. Dark applies only when the viewer
// picks it, or picks "system" on a device set to dark.
// Loaded synchronously in <head> so the chosen theme applies before first paint.
// Only one enum ("dark" | "system") is stored, in this browser only.
(function(){
 var KEY="saynue:theme:v1";
 var root=document.documentElement;
 var media=window.matchMedia?window.matchMedia("(prefers-color-scheme: dark)"):null;
 function stored(){try{var v=localStorage.getItem(KEY);return v==="dark"||v==="system"?v:"light"}catch(_){return "light"}}
 function effective(choice){return choice==="dark"||(choice==="system"&&media&&media.matches)?"dark":"light"}
 function paint(choice){
  if(choice==="light")root.removeAttribute("data-theme");else root.setAttribute("data-theme",choice);
  var mode=effective(choice);
  var metas=document.querySelectorAll('meta[name="theme-color"]');
  for(var i=0;i<metas.length;i++)metas[i].setAttribute("content",mode==="dark"?"#0f0f14":"#f6f5fa");
  var scheme=document.querySelectorAll('meta[name="color-scheme"]');
  for(var j=0;j<scheme.length;j++)scheme[j].setAttribute("content",mode);
 }
 paint(stored());
 if(media&&media.addEventListener)media.addEventListener("change",function(){if(stored()==="system")paint("system")});
 window.SaynueTheme={
  get:stored,
  set:function(choice){
   var value=choice==="dark"||choice==="system"?choice:"light";
   try{if(value==="light")localStorage.removeItem(KEY);else localStorage.setItem(KEY,value)}catch(_){}
   paint(value);
   return value;
  }
 };
})();
