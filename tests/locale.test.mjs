import test from "node:test";import assert from "node:assert/strict";import fs from "node:fs";import vm from "node:vm";
const source=fs.readFileSync(new URL("../assets/locale.js",import.meta.url),"utf8");
function setup({lang="ja-JP",query="",stored=null,blocked=false}={}){
 const map=new Map(stored?[["saynue:locale:v1",stored]]:[]);const location=new URL("https://saynue.test/"+query+"#formCard");
 const window={location,navigator:{language:lang},localStorage:{getItem:k=>{if(blocked)throw Error();return map.get(k)},setItem:(k,v)=>{if(blocked)throw Error();map.set(k,v)}},history:{state:null,replaceState(_a,_b,url){window.location=new URL(url,location.origin)}}};
 vm.runInNewContext(source,{window,URL,URLSearchParams});return {window,api:window.SaynueLocale,map};
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
