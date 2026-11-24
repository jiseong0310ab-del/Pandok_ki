import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {homeWithScript} from "./page-source.mjs";

const home=homeWithScript;
const css=fs.readFileSync(new URL("../assets/site.css",import.meta.url),"utf8");
const script=home.match(/<script>([\s\S]*?)<\/script>/)?.[1]||"";
const slice=(start,end)=>{
 const a=home.indexOf(start),b=home.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,"Expected markers missing: "+start+" / "+end);
 return home.slice(a,b);
};

test("mobile first-use flow foregrounds screenshot input and compact expert selection",()=>{
 const choices=[...home.matchAll(/<button[^>]*data-persona="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)];
 assert.equal(choices.length,6);
 assert.deepEqual(choices.map(x=>x[1]),["auto","standard","court","work","romance","mediator"]);
 for(const [,mode,content] of choices){
  assert.doesNotMatch(content,/\p{Extended_Pictographic}/u,"Decorative icon in "+mode);
  assert.match(content,/class="persona-title"/);
 }
 const form=slice('<section class="card analyzer"','</section>\n<div class="trust-row"');
 assert.ok(form.indexOf('id="personas"')<form.indexOf('id="analysisOptions"'));
 assert.ok(form.indexOf('id="chatImage"')<form.indexOf('id="personas"'));
 assert.ok(form.indexOf('id="imageTab"')<form.indexOf('id="textTab"'));
 assert.match(form,/<button[^>]*id="imageTab"[^>]*aria-selected="true"/);
 assert.match(form,/<div id="textBox" class="hidden">/);
 assert.match(form,/<div id="imageBox">/);
 assert.match(script,/mode="image",lastResult/);
 assert.ok(form.indexOf('id="chatText"')<form.indexOf('id="analyze"'));
 assert.match(form,/<details[^>]*id="analysisOptions"/);
 assert.match(form,/<details[^>]*id="personaContextBox"/);
 assert.doesNotMatch(form,/<details[^>]*id="analysisOptions"[^>]*\sopen(?:=|\s|>)/);
 assert.doesNotMatch(form,/<details[^>]*id="personaContextBox"[^>]*\sopen(?:=|\s|>)/);
 assert.match(script,/function updateSettingsSummary\(/);
 assert.match(script,/function choosePlatform\(p\).*updateSettingsSummary/);
 assert.match(script,/function chooseRelation\(r\).*updateSettingsSummary/);
});
test("expert reports foreground summary, next step and reply before deeper explanation",()=>{
 const persona=slice('<section class="card persona-result','<div class="card" id="shareCard">');
 const required=['id="personaSummary"','id="personaNextStep"','id="personaDraft"','id="personaExplain"','id="personaSectionOne"'];
 for(let i=0;i<required.length-1;i++)assert.ok(persona.indexOf(required[i])<persona.indexOf(required[i+1]),required[i]);
 assert.match(persona,/<details[^>]*id="personaExplain"/);
 assert.match(persona,/data-i="personaMicroCaution"/);
 assert.match(script,/if\(scroll\)\$\("personaExplain"\)\.open=false/);
});
test("standard reports place actual next step and reply before score/evidence detail",()=>{
 const standard=slice('<div class="card" id="shareCard">','<div class="feedback-card" id="feedbackCard">');
 const required=['id="verdict"','id="signal"','id="nextStep"','id="replyDraft"','id="standardExplain"','id="warmth"','id="evidenceCardsPanel"'];
 for(let i=0;i<required.length-1;i++)assert.ok(standard.indexOf(required[i])<standard.indexOf(required[i+1]),required[i]);
 assert.match(standard,/<details[^>]*id="standardExplain"/);
 assert.match(standard,/class="evidence insight-next-action"/);
 assert.match(script,/if\(scroll\)\$\("standardExplain"\)\.open=false/);
});
test("mobile decorative content is hidden without disabling essential privacy and masking controls",()=>{
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/\.trust-row,\.preview-section,\.plus-peek\{display:none!important\}/);
 assert.match(css,/\.persona-option,\s*\.persona-option:first-child/);
 assert.match(css,/\.persona-option \.persona-caption/);
 assert.match(css,/\.analysis-options-summary/);
 assert.match(css,/\.insight-details summary/);
 for(const id of ['consent','maskText','chatText','chatImage','chatImage','analyze','personaCopyStatus','personaQuoteNotice'])assert.ok(home.includes('id="'+id+'"'),id);
 assert.match(home,/id="consent"/);
 assert.match(home,/data-i="privacyNote"/);
 assert.match(home,/id="personaContextCaution"/);
 assert.match(home,/id="shotConfirm"/);
});
test("all five locales have translations for progressive disclosure controls",()=>{
 const begin=script.indexOf("const T=")+8,end=script.indexOf("const API_ERRORS",begin);
 assert.ok(begin>7&&end>begin);
 const T=new Function("return ("+script.slice(begin,end).trim().replace(/;\s*$/,"")+")")();
 const keys=["analysisOptionsTitle","standardExplainTitle","personaExplainTitle","personaMicroCaution"];
 const langs=["ko","ja","en","zh-CN","zh-TW"];
 assert.deepEqual(Object.keys(T),langs);
 for(const lang of langs)for(const key of keys){
  assert.equal(typeof T[lang][key],"string",lang+"."+key);
  assert.ok(T[lang][key].length>6);
 }
 new Function(script);
});

 test("localized static guides, canonical links and crawl discovery",()=>{
 const langs=["ko","ja","en","zh-CN","zh-TW"];
 const robots=fs.readFileSync(new URL("../robots.txt",import.meta.url),"utf8");
 const sitemap=fs.readFileSync(new URL("../sitemap.xml",import.meta.url),"utf8");
 assert.match(robots,/Sitemap: https:\/\/saynue\.vercel\.app\/sitemap\.xml/);
 for(const lang of langs){
 const path="/learn/"+lang+".html";
 const page=fs.readFileSync(new URL(".."+path,import.meta.url),"utf8");
 assert.ok(page.includes('<html lang="'+lang+'">'));
 assert.ok(page.includes('rel="canonical" href="https://saynue.vercel.app'+path+'"'));
 assert.ok(page.includes('href="/?lang='+lang+'#formCard"'));
 assert.ok(home.includes('href="'+path+'"'));
 assert.ok(sitemap.includes('<loc>https://saynue.vercel.app'+path+'</loc>'));
 assert.equal([...page.matchAll(/<h2>/g)].length,4);
 assert.doesNotMatch(page,/<script|noindex/);
 for(const alt of langs)assert.ok(page.includes('hreflang="'+alt+'" href="https://saynue.vercel.app/learn/'+alt+'.html"'));
 }
 assert.doesNotMatch(sitemap,/sandbox-checkout|\/api\/|account\.html/);
 assert.match(script,/new URLSearchParams\(location\.search\)\.get\("lang"\)/);
 });

test("all literal DOM lookups have an existing unique HTML id",()=>{
 const ids=[...home.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);
 assert.equal(ids.length,new Set(ids).size);
 for(const [,id] of script.matchAll(/\$\("([^"]+)"\)/g))assert.ok(ids.includes(id),"missing DOM id: "+id);
});

test("topic guides are crawlable, discoverable and self-canonical",()=>{
 const sitemap=fs.readFileSync(new URL("../sitemap.xml",import.meta.url),"utf8");
 for(const lang of ["ko","ja","en"])for(const topic of ["late-reply","work-reply"]){
 const path="/learn/"+lang+"-"+topic+".html";const page=fs.readFileSync(new URL(".."+path,import.meta.url),"utf8");const hub=fs.readFileSync(new URL("../learn/"+lang+".html",import.meta.url),"utf8");
 assert.ok(hub.includes(`href="${path}"`));assert.ok(sitemap.includes(`<loc>https://saynue.vercel.app${path}</loc>`));assert.ok(page.includes(`rel="canonical" href="https://saynue.vercel.app${path}"`));assert.equal([...page.matchAll(/<h2>/g)].length,3);assert.doesNotMatch(page,/<script|noindex/);
 }
});

 test("conflict guides cover five locales and are internally linked",()=>{
 const sitemap=fs.readFileSync(new URL("../sitemap.xml",import.meta.url),"utf8");
 for(const lang of ["ko","ja","en","zh-CN","zh-TW"]){const path="/learn/"+lang+"-conflict.html";const page=fs.readFileSync(new URL(".."+path,import.meta.url),"utf8");const hub=fs.readFileSync(new URL("../learn/"+lang+".html",import.meta.url),"utf8");assert.ok(hub.includes(`href="${path}"`));assert.ok(sitemap.includes(path));assert.ok(page.includes(`rel="canonical" href="https://saynue.vercel.app${path}"`));assert.equal([...page.matchAll(/<h2>/g)].length,3);assert.doesNotMatch(page,/<script|noindex/);}
 });
