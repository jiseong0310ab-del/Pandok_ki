// Only the selected interface language is persisted; no chat or account data.
(function(global){
"use strict";
const KEY="saynue:locale:v1",LANGS=["ko","ja","en","zh-CN","zh-TW"];
const valid=v=>LANGS.includes(v);
function stored(){try{const v=global.localStorage.getItem(KEY);return valid(v)?v:null}catch(_){return null}}
function save(v){if(!valid(v))return false;try{global.localStorage.setItem(KEY,v);return true}catch(_){return false}}
function browser(){const l=(global.navigator.language||"en").toLowerCase();return l.startsWith("ko")?"ko":l.startsWith("ja")?"ja":l.startsWith("zh")?(/(?:tw|hk|mo|hant)/.test(l)?"zh-TW":"zh-CN"):"en"}
function get(){const requested=new URLSearchParams(global.location.search).get("lang");if(valid(requested)){save(requested);return requested}return stored()||browser()}
function choose(v){if(!valid(v))return false;const ok=save(v);try{const url=new URL(global.location.href);if(ok)url.searchParams.delete("lang");else url.searchParams.set("lang",v);global.history.replaceState(global.history.state,"",url.pathname+url.search+url.hash)}catch(_){}return ok}
// Pages ship Korean defaults. For any other language, hold the first paint
// until the page script has translated it (links() runs in that same task),
// so visitors never see a flash of Korean or download Korean font subsets.
// If the page script fails or is slow, the content is shown anyway.
const root=global.document.documentElement;
function reveal(){root.removeAttribute("data-i18n")}
const initial=get();
if(initial!==root.getAttribute("lang")){root.lang=initial;root.setAttribute("data-i18n","pending");global.setTimeout(reveal,2500)}
function links(v){
 reveal();
 if(!valid(v))return;const persist=stored()===v;
 for(const link of global.document.querySelectorAll("a[href]")){
  let url;try{url=new URL(link.href,global.location.href)}catch(_){continue}
  if(url.origin!==global.location.origin||!["/","/index.html","/account.html","/plans.html","/guide.html","/data-notice.html"].includes(url.pathname))continue;
  if(url.pathname==="/data-notice.html")url.hash=v;
  else if(!persist)url.searchParams.set("lang",v);
  else url.searchParams.delete("lang");
  link.href=url.pathname+url.search+url.hash;
 }
}
global.SaynueLocale={get,stored,choose,links};
})(window);
