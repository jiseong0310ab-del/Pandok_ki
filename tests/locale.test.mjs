import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";import vm from "node:vm";
const source=fs.readFileSync(new URL("../assets/locale.js",import.meta.url),"utf8");
function setup({lang="ja-JP",query="",stored=null,blocked=false,pageLang="ko"}={}){
 const map=new Map(stored?[["saynue:locale:v1",stored]]:[]);const location=new URL("https://saynue.test/"+query+"#formCard");
 const attrs=new Map([["lang",pageLang]]),timers=[];
 const root={get lang(){return attrs.get("lang")},set lang(v){attrs.set("lang",v)},getAttribute:k=>attrs.has(k)?attrs.get(k):null,setAttribute:(k,v)=>attrs.set(k,v),removeAttribute:k=>attrs.delete(k)};
 const window={location,navigator:{language:lang},document:{documentElement:root,querySelectorAll:()=>[]},setTimeout:(fn,ms)=>timers.push({fn,ms}),localStorage:{getItem:k=>{if(blocked)throw Error();return map.get(k)},setItem:(k,v)=>{if(blocked)throw Error();map.set(k,v)}},history:{state:null,replaceState(_a,_b,url){window.location=new URL(url,location.origin)}}};
 vm.runInNewContext(source,{window,URL,URLSearchParams});return {window,api:window.SaynueLocale,map,root,timers};
}
test("locale preference overrides device, explicit links override saved locale, change clears old query",()=>{
 const s=setup();assert.equal(s.api.get(),"ja");assert.equal(s.api.choose("ko"),true);assert.equal(s.api.get(),"ko");
 const q=setup({query:"?lang=ja",stored:"ko"});assert.equal(q.api.get(),"ja");q.api.choose("ko");assert.equal(q.window.location.search,"");assert.equal(q.api.get(),"ko");
 assert.equal(setup({lang:"zh-Hant",stored:"bad"}).api.get(),"zh-TW");
 const b=setup({blocked:true});assert.equal(b.api.choose("ko"),false);assert.equal(b.api.get(),"ko");assert.equal(b.api.choose("__proto__"),false);
});

test("all homepage localization keys have a nonempty string in each supported locale",()=>{
 const app=fs.readFileSync(new URL("../assets/app.js",import.meta.url),"utf8");
 const html=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
 const dictionary=new Function(app.slice(app.indexOf("const T="),app.indexOf("const $=id"))+"\nreturn T")();
 const keys=new Set([...html.matchAll(/data-i="([^"]+)"/g)].map(m=>m[1]));
 for(const lang of ["ko","ja","en","zh-CN","zh-TW"])for(const key of keys)assert.ok(typeof dictionary[lang][key]==="string"&&dictionary[lang][key].trim(),lang+"."+key);
});

test("non-Korean visits hold the first paint until the page is translated, with a timed fallback",()=>{
 const ja=setup({lang:"ja-JP"});
 assert.equal(ja.root.lang,"ja");
 assert.equal(ja.root.getAttribute("data-i18n"),"pending");
 assert.deepEqual(ja.timers.map(t=>t.ms),[2500]);
 ja.api.links("ja");
 assert.equal(ja.root.getAttribute("data-i18n"),null,"translation reveals the page");
 const slow=setup({lang:"en-US"});slow.timers[0].fn();
 assert.equal(slow.root.getAttribute("data-i18n"),null,"a failed page script still reveals the page");
 const ko=setup({lang:"ko-KR"});
 assert.equal(ko.root.getAttribute("data-i18n"),null);
 assert.equal(ko.timers.length,0,"Korean pages paint immediately");
 const css=fs.readFileSync(new URL("../assets/site.css",import.meta.url),"utf8");
 assert.match(css,/html\[data-i18n="pending"\] body>\*\{visibility:hidden;content-visibility:hidden\}/);
});

