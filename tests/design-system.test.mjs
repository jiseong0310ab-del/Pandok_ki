// Guards for the design system: language-aware fonts, theme tokens,
// the appearance script, and copy rules (no decorative glyphs or labels).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {homeWithScript} from "./page-source.mjs";

const read=name=>fs.readFileSync(new URL("../"+name,import.meta.url),"utf8");
const css=read("assets/site.css");
const pages=["index.html","account.html","guide.html","plans.html","metrics.html","sandbox-checkout.html","data-notice.html",...fs.readdirSync(new URL("../learn/",import.meta.url)).filter(f=>f.endsWith(".html")).map(f=>"learn/"+f)];
const token=name=>(css.match(new RegExp("--"+name+":([^;]+);"))||[])[1]||"";

test("Japanese and Chinese never fall back to Pretendard's Korean-style Han glyphs",()=>{
 for(const stack of ["font-ja","font-zh-cn","font-zh-tw"]){
  assert.ok(token(stack),stack);
  assert.doesNotMatch(token(stack),/Pretendard/i,stack);
 }
 assert.match(token("font-ja"),/Hiragino Sans.*Noto Sans JP/);
 assert.match(token("font-zh-cn"),/PingFang SC.*Noto Sans SC/);
 assert.match(token("font-zh-tw"),/PingFang TC.*Noto Sans TC/);
 assert.match(token("font-ko"),/^"Pretendard Variable"/);
 assert.match(token("font-en"),/^"Pretendard Variable"/);
 for(const [lang,stack] of [["ko","font-ko"],["en","font-en"],["ja","font-ja"],["zh-CN","font-zh-cn"],["zh-TW","font-zh-tw"]]){
  assert.match(css,new RegExp(":lang\\("+lang+"\\)\\{font-family:var\\(--"+stack+"\\)"),lang);
 }
 assert.match(css,/:lang\(ko\)\{[^}]*word-break:keep-all/);
 assert.match(css,/:lang\(ja\)\{[^}]*line-break:strict/);
});

test("self-hosted Pretendard subsets are complete, versioned and licensed",()=>{
 const dir="assets/fonts/pretendard-1.3.9/";
 const fontCss=read(dir+"pretendard.css");
 const urls=[...fontCss.matchAll(/url\(([^)]+)\)/g)].map(m=>m[1]);
 assert.equal(urls.length,92);
 for(const url of urls){
  assert.ok(url.startsWith("/"+dir),url);
  assert.ok(fs.existsSync(new URL(".."+url,import.meta.url)),url);
 }
 assert.equal((fontCss.match(/font-display: swap/g)||[]).length,92);
 assert.match(read(dir+"LICENSE.txt"),/SIL Open Font License/);
});

test("every page loads the fonts before the stylesheet and only scriptable pages load the theme script",()=>{
 for(const page of pages.concat(["index.html"])){
  const html=read(page);
  const font=html.indexOf('/assets/fonts/pretendard-1.3.9/pretendard.css'),site=html.indexOf('/assets/site.css');
  assert.ok(font>0&&site>font,page);
  assert.match(html,/<meta name="color-scheme" content="dark light">/,page);
  const csp=(html.match(/Content-Security-Policy" content="([^"]+)"/)||[])[1]||"";
  const scriptsAllowed=!/script-src 'none'/.test(csp);
  assert.equal(html.includes('<script src="/assets/theme.js"></script>'),scriptsAllowed,page);
  if(scriptsAllowed)assert.ok(html.indexOf("/assets/theme.js")<site,page+": theme must apply before CSS paints");
  assert.doesNotMatch(html,/Georgia|font-style:\s*italic|font:\s*italic/i,page);
 }
});

test("light and dark themes define the same tokens; nothing is tiny or italic",()=>{
 const dark=css.slice(css.indexOf(":root{"),css.indexOf("@media (prefers-color-scheme:light)"));
 const light=css.slice(css.indexOf(':root[data-theme="light"]{'),css.indexOf("/* ---------- Base"));
 const media=css.slice(css.indexOf("@media (prefers-color-scheme:light)"),css.indexOf(':root[data-theme="light"]{'));
 const names=block=>new Set([...block.matchAll(/(--[a-z0-9-]+):/g)].map(m=>m[1]).filter(n=>!n.startsWith("--font")&&!["--leading","--leading-tight","--tracking","--tracking-tight","--radius-sm","--radius","--radius-lg","--radius-xl","--radius-pill","--ease","--dur"].includes(n)));
 assert.deepEqual([...names(light)].sort(),[...names(dark)].sort());
 assert.deepEqual([...names(media)].sort(),[...names(light)].sort());
 for(const [,px] of css.matchAll(/font-size:(\d+)px/g))assert.ok(Number(px)>=11,"font-size "+px+"px");
 // 16px form fields stop iOS Safari from zooming on focus.
 assert.match(css,/textarea\{[^}]*font-size:16px/);
 assert.match(css,/\.lang,\.workspace-select\{[^}]*font-size:16px/);
 assert.doesNotMatch(css,/Georgia|font-style:italic/);
 assert.match(css,/@media \(prefers-reduced-motion:reduce\)/);
});

test("appearance script follows the system, persists only a light/dark choice and tolerates blocked storage",()=>{
 const source=read("assets/theme.js");
 const make=({stored=null,light=false,blocked=false}={})=>{
  const store=new Map(stored?[["saynue:theme:v1",stored]]:[]);
  const attrs=new Map();
  const metas=[{attrs:new Map([["media","x"]]),setAttribute(k,v){this.attrs.set(k,v)},removeAttribute(k){this.attrs.delete(k)}}];
  const ctx={
   document:{documentElement:{setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)},querySelectorAll:()=>metas},
   window:{matchMedia:()=>({matches:light,addEventListener(){}})},
   localStorage:blocked?{getItem(){throw Error("blocked")},setItem(){throw Error("blocked")},removeItem(){throw Error("blocked")}}:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}
  };
  ctx.window.localStorage=ctx.localStorage;
  vm.runInNewContext(source,ctx);
  return {api:ctx.window.SaynueTheme,attrs,store,metas};
 };
 let t=make();
 assert.equal(t.api.get(),"system");assert.equal(t.attrs.has("data-theme"),false);
 assert.equal(t.metas[0].attrs.get("content"),"#0f0f14");
 assert.equal(t.api.set("light"),"light");assert.equal(t.attrs.get("data-theme"),"light");assert.equal(t.store.get("saynue:theme:v1"),"light");
 assert.equal(t.metas[0].attrs.get("content"),"#f6f5fa");
 assert.equal(t.api.set("system"),"system");assert.equal(t.attrs.has("data-theme"),false);assert.equal(t.store.size,0);
 assert.equal(t.api.set("<script>"),"system");
 t=make({stored:"neon"});assert.equal(t.api.get(),"system");assert.equal(t.attrs.has("data-theme"),false);
 t=make({stored:"dark",light:true});assert.equal(t.attrs.get("data-theme"),"dark");
 t=make({blocked:true});assert.equal(t.api.get(),"system");assert.equal(t.api.set("dark"),"dark");assert.equal(t.attrs.get("data-theme"),"dark");
});

test("interface copy has no decorative glyphs, English eyebrow labels or headline periods",()=>{
 const script=homeWithScript.match(/<script>([\s\S]*?)<\/script>/)[1];
 const begin=script.indexOf("const T=")+8,end=script.indexOf("const API_ERRORS",begin);
 const T=new Function("return ("+script.slice(begin,end).trim().replace(/;\s*$/,"")+")")();
 const extra=name=>{const i=script.indexOf("const "+name+"=")+name.length+7;return JSON.parse(script.slice(i,script.indexOf("\n",i)).replace(/;\s*$/,""))};
 const W=extra("WORKSPACE_TEXT");
 const used=new Set([...homeWithScript.matchAll(/data-i="([^"]+)"/g)].map(m=>m[1]));
 for(const lang of ["ko","ja","en","zh-CN","zh-TW"]){
  const all={...T[lang],...W[lang]};
  for(const key of used){
   const value=all[key];if(typeof value!=="string")continue;
   assert.doesNotMatch(value,/[→↗✦✧★●]|SAYNUE ·|STEP \d|^[A-Z ·]{8,}$/,lang+"."+key);
  }
  for(const key of ["hero1","hero2","verdict","reportLabel","personaReportKicker","analyze","replyTitle","copyReply","share"])if(T[lang][key])assert.doesNotMatch(T[lang][key],/[.。]$/,lang+"."+key);
  for(const key of ["themeTitle","themeSystem","themeLight","themeDark","loadingStep1","loadingStep2","loadingStep3"])assert.ok(W[lang][key]&&W[lang][key].length>1,lang+"."+key);
 }
 for(const page of pages){
  const html=read(page);
  assert.doesNotMatch(html,/class="eyebrow"[^>]*>\s*(?:SAYNUE|AI CONVERSATION|STEP \d)/,page);
 }
 assert.match(homeWithScript,/<ol class="loading-steps"><li data-i="loadingStep1">/);
 assert.match(homeWithScript,/id="themeChoice"[^>]*role="group"/);
 for(const id of ["replyMeaningLang","personaMeaningLang","coachMeaningLang"])assert.match(homeWithScript,new RegExp('class="lang-badge" id="'+id+'" hidden'));
});
