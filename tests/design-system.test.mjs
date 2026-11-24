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
  // Light is the default everywhere; theme.js switches these when dark is chosen.
  assert.match(html,/<meta name="color-scheme" content="light">/,page);
  assert.match(html,/<meta name="theme-color" content="#f6f5fa">/,page);
  assert.doesNotMatch(html,/content="dark|prefers-color-scheme/,page);
  const csp=(html.match(/Content-Security-Policy" content="([^"]+)"/)||[])[1]||"";
  const scriptsAllowed=!/script-src 'none'/.test(csp);
  assert.equal(html.includes('<script src="/assets/theme.js"></script>'),scriptsAllowed,page);
  if(scriptsAllowed)assert.ok(html.indexOf("/assets/theme.js")<site,page+": theme must apply before CSS paints");
  assert.doesNotMatch(html,/Georgia|font-style:\s*italic|font:\s*italic/i,page);
 }
});

test("light is the default theme; dark and system-dark define the same tokens; nothing is tiny or italic",()=>{
 const light=css.slice(css.indexOf(":root{"),css.indexOf(':root[data-theme="dark"]{'));
 const dark=css.slice(css.indexOf(':root[data-theme="dark"]{'),css.indexOf("@media (prefers-color-scheme:dark)"));
 const media=css.slice(css.indexOf("@media (prefers-color-scheme:dark)"),css.indexOf("/* ---------- Base"));
 assert.match(light,/^:root\{\n color-scheme:light;\n --bg:#f6f5fa;/);
 assert.match(dark,/color-scheme:dark;\n --bg:#0f0f14;/);
 assert.match(media,/:root\[data-theme="system"\]\{\n  color-scheme:dark;/);
 assert.doesNotMatch(css,/prefers-color-scheme:light|data-theme="light"/);
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

test("appearance script defaults to light, stores only an opt-in and tolerates blocked storage",()=>{
 const source=read("assets/theme.js");
 const make=({stored=null,darkDevice=false,blocked=false}={})=>{
  const store=new Map(stored?[["saynue:theme:v1",stored]]:[]);
  const attrs=new Map();
  const meta=()=>({attrs:new Map(),setAttribute(k,v){this.attrs.set(k,v)}});
  const themeColor=[meta()],scheme=[meta()];
  let onChange=null;
  const ctx={
   document:{documentElement:{setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)},querySelectorAll:q=>q.includes("theme-color")?themeColor:scheme},
   window:{matchMedia:q=>{assert.equal(q,"(prefers-color-scheme: dark)");return {get matches(){return darkDevice},addEventListener(_,fn){onChange=fn}}}},
   localStorage:blocked?{getItem(){throw Error("blocked")},setItem(){throw Error("blocked")},removeItem(){throw Error("blocked")}}:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k)}
  };
  ctx.window.localStorage=ctx.localStorage;
  vm.runInNewContext(source,ctx);
  const color=()=>themeColor[0].attrs.get("content"),mode=()=>scheme[0].attrs.get("content");
  return {api:ctx.window.SaynueTheme,attrs,store,color,mode,flip:dark=>{darkDevice=dark;onChange&&onChange()}};
 };
 // A dark device still opens in light until the viewer opts in.
 let t=make({darkDevice:true});
 assert.equal(t.api.get(),"light");assert.equal(t.attrs.has("data-theme"),false);
 assert.equal(t.color(),"#f6f5fa");assert.equal(t.mode(),"light");
 assert.equal(t.api.set("dark"),"dark");assert.equal(t.attrs.get("data-theme"),"dark");assert.equal(t.store.get("saynue:theme:v1"),"dark");
 assert.equal(t.color(),"#0f0f14");assert.equal(t.mode(),"dark");
 assert.equal(t.api.set("system"),"system");assert.equal(t.attrs.get("data-theme"),"system");assert.equal(t.color(),"#0f0f14");
 t.flip(false);assert.equal(t.color(),"#f6f5fa");assert.equal(t.mode(),"light");
 t.flip(true);assert.equal(t.color(),"#0f0f14");
 assert.equal(t.api.set("light"),"light");assert.equal(t.attrs.has("data-theme"),false);assert.equal(t.store.size,0);
 t.flip(true);assert.equal(t.color(),"#f6f5fa","light ignores the device once chosen");
 assert.equal(t.api.set("<script>"),"light");
 t=make({stored:"neon",darkDevice:true});assert.equal(t.api.get(),"light");assert.equal(t.attrs.has("data-theme"),false);
 t=make({stored:"dark"});assert.equal(t.attrs.get("data-theme"),"dark");assert.equal(t.mode(),"dark");
 t=make({stored:"system",darkDevice:false});assert.equal(t.attrs.get("data-theme"),"system");assert.equal(t.color(),"#f6f5fa");
 t=make({blocked:true,darkDevice:true});assert.equal(t.api.get(),"light");assert.equal(t.api.set("dark"),"dark");assert.equal(t.attrs.get("data-theme"),"dark");
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

test("public pages share a 1200x630 preview image that the build publishes",()=>{
 const png=fs.readFileSync(new URL("../assets/og-image.png",import.meta.url));
 assert.equal(png.readUInt32BE(16),1200);assert.equal(png.readUInt32BE(20),630);
 assert.ok(png.length<200000,"keep the preview light for messenger crawlers");
 for(const page of ["index.html","guide.html","plans.html",...pages.filter(p=>p.startsWith("learn/"))]){
  const html=read(page);
  assert.match(html,/<meta property="og:image" content="https:\/\/saynue\.vercel\.app\/assets\/og-image\.png">/,page);
  assert.match(html,/<meta name="twitter:card" content="summary_large_image">/,page);
 }
 assert.match(read("scripts/build-cloudflare.mjs"),/js\|css\|svg\|png/);
});
