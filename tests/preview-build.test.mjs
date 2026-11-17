import test from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir,stat} from "node:fs/promises";
import {runInNewContext} from "node:vm";

const out="_pages_preview";
const html=await readFile(out+"/index.html","utf8");
const demo=await readFile(out+"/preview/demo-api.js","utf8");

test("GitHub Pages build is a self-contained project-path static review",async()=>{
 const expected=[
  "index.html",".nojekyll","favicon.svg",
  "assets/site.css","assets/saynue-mark.svg",
  "assets/screenshot-editor.js","preview/demo-api.js"
 ];
 const walk=async(dir=out,base="")=>{
  const items=await readdir(dir);
  const names=[];
  for(const item of items){
   const relative=base?base+"/"+item:item;
   const p=dir+"/"+item;
   if((await stat(p)).isDirectory())names.push(...await walk(p,relative));
   else names.push(relative);
  }
  return names;
 };
 assert.deepEqual((await walk()).sort(),expected.sort());
 assert.match(html,/href="\.\/assets\/site\.css"/);
 assert.match(html,/src="\.\/assets\/screenshot-editor\.js"/);
 assert.match(html,/src="\.\/preview\/demo-api\.js"/);
 assert.match(html,/href="\.\/"/);
 assert.doesNotMatch(html,/(?:href|src)="\/assets\//);
 assert.doesNotMatch(html,/(?:href|src)="\/favicon\.svg"/);
 assert.match(html,/<meta name="robots" content="noindex,nofollow">/);
});
test("preview is visibly labelled as a demonstration and does not promise Gemini analysis",()=>{
 assert.match(html,/UI PREVIEW/);
 assert.match(html,/id="personas"/);
 assert.match(html,/id="analysisOptions"/);
 assert.match(html,/id="personaExplain"/);
 assert.match(html,/id="standardExplain"/);
 assert.match(html,/분석 결과는 예시입니다/);
 assert.doesNotMatch(html,/<span data-i="consent">/);
 assert.doesNotMatch(html,/<div class="notice" data-i="privacyNote">/);
 assert.match(html,/Gemini, 결제 및 계정 API를 호출하지 않습니다/);
});
test("demo intercepts analysis, feedback and paid API without network or user data disclosure",async()=>{
 const outgoing=[];
 const window={
  fetch:async(url)=>{outgoing.push(url);return new Response("real network",{status:200})}
 };
 runInNewContext(demo,{window,Response,URL,location:{href:"https://example.github.io/Pandok_ki/"},console});
 const sentinel="PRIVATE_CHAT_SENTINEL_NOT_FOR_OUTPUT";
 for(const persona of ["standard","court","work","romance","mediator"]){
  const result=await window.fetch("/api/analyze",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({
    persona,locale:"ko",chatText:sentinel,
    caseContext:"PRIVATE_CONTEXT_SENTINEL",images:[{mimeType:"image/jpeg",base64:"PRIVATE_IMAGE_SENTINEL"}]
   })
  });
  assert.equal(result.status,200);
  const body=await result.json();
  assert.ok(!JSON.stringify(body).includes("PRIVATE_"));
  if(persona==="standard"){assert.equal(typeof body.verdict,"string");assert.equal(typeof body.replyDraft,"string")}
  else{
   assert.equal(body.persona,persona);
   for(const key of ["summary","sectionOne","sectionTwo","sectionThree","nextStep","replyDraft","replyWhy"])assert.equal(typeof body[key],"string",key);
   assert.equal(body.sourceQuote,"");
  }
 }
 assert.equal((await window.fetch("/api/feedback",{method:"POST",body:"PRIVATE_FEEDBACK"})).status,200);
 assert.equal((await window.fetch("/api/plus/checkout",{method:"POST"})).status,503);
 assert.equal((await window.fetch("/api/auth/start",{method:"POST"})).status,503);
 assert.deepEqual(outgoing,[],"All /api/ URLs must be local only");
 await window.fetch("/assets/site.css",{method:"GET"});
 assert.deepEqual(outgoing,["/assets/site.css"],"Static assets may use browser network");
});
test("all five locales have safe sample results without user text",async()=>{
 const window={fetch:async()=>{throw Error("Unexpected network")}};
 runInNewContext(demo,{window,Response,URL,location:{href:"https://example.github.io/Pandok_ki/"}});
 for(const locale of ["ko","ja","en","zh-CN","zh-TW"]){
  for(const persona of ["standard","court","work","romance","mediator"]){
   const response=await window.fetch("/api/analyze",{method:"POST",body:JSON.stringify({locale,persona})});
   const result=await response.json();
   const summary=persona==="standard"?result.verdict:result.summary;
   assert.ok(summary.length>15,locale+" / "+persona);
   assert.equal(persona==="standard"?"standard":result.persona,persona);
  }
 }
});
