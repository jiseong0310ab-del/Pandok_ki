// Browser end-to-end check of the real homepage on a phone-sized viewport.
// Files are served from this checkout through request interception, every API
// is mocked, and any request that would leave the test origin is aborted.
// Skips automatically when Playwright is not installed (it is not a dependency).
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {createRequire} from "node:module";
import {fileURLToPath} from "node:url";

let playwright=null;
try{playwright=createRequire(import.meta.url)("playwright")}catch(_){}
const skip=playwright?false:"playwright is not installed";
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const ORIGIN="https://saynue.test";
const TYPES={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".json":"application/json",".txt":"text/plain",".xml":"application/xml"};

const report={
 verdict:"<img src=x onerror=\"window.__xss=1\"> 일정 조율 중인 대화",
 warmthScore:58,reciprocityScore:52,evidenceLevel:"medium",
 keySignal:"상대가 2026-11-28 저녁을 대안으로 제안했어요.",
 evidence:"\"다음 주 되면 다시 말해줄게\"라는 표현이 있어요.",
 alternative:"정말 일정이 바쁠 수도 있어요.",
 nextStep:"부담 없이 다음 주에 다시 물어보세요.",
 shouldReply:true,replyDraft:"좋아, 다음 주에 편할 때 알려줘!",replyWhy:"상대 제안을 받아들이며 부담을 줄여요.",
 evidenceCards:[{quote:"다음 주 되면 다시 말해줄게",reading:"다음 기회를 열어 둔 표현일 수 있어요.",otherExplanation:"예의상 미루는 표현일 수도 있어요.",sourceType:"text",screenshotIndex:0}]
};

async function openPage(browser,{analyzeBody=report,analyzeStatus=200}={}){
 const context=await browser.newContext({...playwright.devices["iPhone 13"],locale:"ko-KR",serviceWorkers:"block"});
 const page=await context.newPage();
 const problems=[],requests=[];
 page.on("pageerror",e=>problems.push("pageerror: "+e.message));
 page.on("console",m=>{if(m.type()==="error")problems.push("console: "+m.text())});
 await context.route("**/*",async route=>{
  const url=new URL(route.request().url());
  if(url.origin!==ORIGIN){problems.push("external request: "+url.href);return route.abort()}
  if(url.pathname.startsWith("/api/")){
   requests.push({path:url.pathname,body:route.request().postData()});
   if(url.pathname==="/api/analyze")return route.fulfill({status:analyzeStatus,contentType:"application/json",body:JSON.stringify(analyzeBody)});
   if(url.pathname==="/api/coach")return route.fulfill({status:200,contentType:"application/json",body:JSON.stringify({summary:"말을 정리해 보세요",advice:"사실과 요청을 구분하세요.",steps:["원하는 결과를 정하세요."],shouldReply:true,message:"일정을 다시 확인해도 될까요?",why:"구체적으로 요청합니다.",caution:"결과는 보장되지 않아요."})});
   return route.fulfill({status:200,contentType:"application/json",body:"{\"ok\":true}"});
  }
  const file=path.join(ROOT,url.pathname==="/"?"index.html":decodeURIComponent(url.pathname));
  if(!file.startsWith(ROOT+path.sep)||!fs.existsSync(file)||fs.statSync(file).isDirectory())return route.fulfill({status:404,body:"not found"});
  return route.fulfill({status:200,contentType:TYPES[path.extname(file)]||"application/octet-stream",body:fs.readFileSync(file)});
 });
 await page.goto(ORIGIN+"/#formCard");
 return {context,page,problems,requests};
}
const noHorizontalScroll=page=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1);

test("phone layout: text analysis renders the mocked report safely under the strict CSP",{skip},async()=>{
 const browser=await playwright.chromium.launch();
 try{
  const {page,problems,requests}=await openPage(browser);
  assert.equal(await noHorizontalScroll(page),true,"page scrolls horizontally at phone width");
  await page.click("#textTab");
  await page.fill("#chatText","나: 이번 주에 시간 있어?\n상대: 이번 주는 좀 바빠 ㅠㅠ\n나: 그럼 다음 주는?\n상대: 다음 주 되면 다시 말해줄게!");
  await page.check("#consent");
  await page.click("#analyze");
  await page.waitForSelector("#results:not(.hidden)");
  // Model output is rendered as text: markup is shown literally, never executed.
  assert.equal(await page.textContent("#verdict"),report.verdict);
  assert.equal(await page.evaluate(()=>window.__xss),undefined);
  assert.equal(await page.locator("#verdict img").count(),0);
  assert.match(await page.inputValue("#replyDraft").catch(()=>page.textContent("#replyDraft")),/다음 주에 편할 때/);
  assert.match(await page.textContent("#evidenceCardsList"),/다음 주 되면 다시 말해줄게/);
  const sent=JSON.parse(requests.find(r=>r.path==="/api/analyze").body);
  assert.equal(sent.locale,"ko");
  assert.equal(sent.persona,"standard");
  assert.match(sent.chatText,/다음 주/);
  assert.equal(sent.images,undefined);
  assert.equal(await noHorizontalScroll(page),true,"report scrolls horizontally at phone width");
  assert.deepEqual(problems,[]);
 }finally{await browser.close()}
});

test("phone layout: a screenshot must be reviewed, then only a JPEG is sent",{skip},async()=>{
 const browser=await playwright.chromium.launch();
 try{
  const {page,problems,requests}=await openPage(browser);
  const jpeg=await page.evaluate(()=>{
   const c=document.createElement("canvas");c.width=360;c.height=640;
   const g=c.getContext("2d");g.fillStyle="#fff";g.fillRect(0,0,360,640);g.fillStyle="#000";g.font="20px sans-serif";g.fillText("test chat",40,80);
   return c.toDataURL("image/jpeg",0.8).split(",")[1];
  });
  await page.setInputFiles("#chatImage",{name:"chat.jpg",mimeType:"image/jpeg",buffer:Buffer.from(jpeg,"base64")});
  await page.check("#consent");
  await page.waitForSelector("#shotConfirm:visible");
  // Sending before the user confirms the redaction review is refused.
  await page.click("#analyze");
  await page.waitForSelector("#error:not(.hidden)");
  assert.equal(requests.filter(r=>r.path==="/api/analyze").length,0);
  await page.click("#shotConfirm");
  await page.click("#analyze");
  await page.waitForSelector("#results:not(.hidden)");
  const sent=JSON.parse(requests.find(r=>r.path==="/api/analyze").body);
  assert.equal(sent.chatText,"");
  assert.equal(sent.images.length,1);
  assert.equal(sent.images[0].mimeType,"image/jpeg");
  assert.match(sent.images[0].base64,/^\/9j\//);
  assert.deepEqual(Object.keys(sent.images[0]).sort(),["base64","mimeType"]);
  assert.deepEqual(problems,[]);
 }finally{await browser.close()}
});

test("phone layout: every locale switches labels without overflow or errors",{skip},async()=>{
 const browser=await playwright.chromium.launch();
 try{
  const {page,problems}=await openPage(browser);
  const labels=new Set();
  for(const locale of ["ko","ja","en","zh-CN","zh-TW"]){
   await page.selectOption("#locale",locale);
   labels.add(await page.textContent("#analyze"));
   assert.equal(await noHorizontalScroll(page),true,locale+" scrolls horizontally");
  }
  assert.equal(labels.size,5,"each locale should label the analyze button differently");
  assert.deepEqual(problems,[]);
 }finally{await browser.close()}
});

test("phone layout: API errors are shown to the user instead of a fake report",{skip},async()=>{
 const browser=await playwright.chromium.launch();
 try{
  const {page,problems}=await openPage(browser,{analyzeStatus:503,analyzeBody:{error:"Temporarily unavailable",code:"AI_BUSY"}});
  await page.click("#textTab");
  await page.fill("#chatText","나: 내일 회의 자료 확인 부탁드려요.\n상대: 네, 오후에 확인할게요.");
  await page.check("#consent");
  await page.click("#analyze");
  await page.waitForSelector("#error:not(.hidden)");
  assert.match(await page.textContent("#error"),/AI_BUSY/);
  assert.equal(await page.isVisible("#results"),false);
  // The browser itself logs failed (503) fetches; only page errors matter here.
  assert.deepEqual(problems.filter(p=>!/status of 503/.test(p)),[]);
 }finally{await browser.close()}
});

test("home navigation and independent coaching modes work without a screenshot",{skip},async()=>{
 const browser=await playwright.chromium.launch();
 try{
  const {page,requests,problems}=await openPage(browser);
  await page.goto(ORIGIN+"/");
  assert.equal(await page.isVisible("#homeScreen"),true);
  assert.equal(await page.isVisible("#analysisScreen"),false);
  await page.click("#homeScreen [data-nav=reply]");
  await page.fill("#coachContext","상사에게 회의 일정을 바꾸고 싶어요.");
  await page.fill("#coachDraft","時間を変更してもよろしいでしょうか？");
  await page.selectOption("#coachReplyLanguage","ja");
  await page.click("#coachRun");
  assert.equal(requests.filter(x=>x.path==="/api/coach").length,0);
  await page.check("#coachConsent");
  await page.click("#coachRun");
  await page.waitForSelector("#coachResult:visible");
  assert.equal(await page.inputValue("#coachMessage"),"일정을 다시 확인해도 될까요?");
  let sent=JSON.parse(requests.find(x=>x.path==="/api/coach").body);
  assert.equal(sent.mode,"reply");assert.equal(sent.relation,"unknown");assert.equal(sent.locale,"ko");assert.equal(sent.replyLanguage,"ja");
  await page.click("#coachRevise");assert.equal(await page.inputValue("#coachDraft"),"일정을 다시 확인해도 될까요?");
  assert.equal(await page.isChecked("#coachConsent"),false);
  await page.click("[data-coach=reflect]");assert.equal(await page.isVisible("#coachDraftBox"),false);
  await page.check("#coachConsent");await page.click("#coachRun");await page.waitForSelector("#coachResult:visible");
  sent=JSON.parse(requests.filter(x=>x.path==="/api/coach").at(-1).body);assert.equal(sent.mode,"reflect");assert.equal(sent.draft,"");
  await page.click("#workspaceNav [data-nav=library]");assert.equal(await page.isVisible("#libraryEmpty"),true);
  await page.click("#workspaceNav [data-nav=analyze]");assert.equal(await page.isVisible("#formCard"),true);
  assert.equal(await page.locator("#platforms").count(),0);
  assert.equal(await page.getAttribute("[data-persona=auto]","aria-pressed"),"true");
  for(const locale of ["ko","ja","en","zh-CN","zh-TW"]){await page.selectOption("#locale",locale);assert.equal(await noHorizontalScroll(page),true)}
  assert.deepEqual(problems,[]);
 }finally{await browser.close()}
});

test("Korean analysis can return a Japanese reply and Korean meaning separately",{skip},async()=>{
 const browser=await playwright.chromium.launch();
 try{
 const {page,requests,problems}=await openPage(browser,{analyzeBody:{...report,replyDraft:"また会いましょう",replyMeaning:"다시 만나요",replyLanguage:"ja"}});
 await page.click("#textTab");await page.fill("#chatText","私：今週会える？\n相手：今週は忙しいけど、また今度会おうね。");
 assert.equal(await page.inputValue("#replyLanguage"),"auto");await page.selectOption("#replyLanguage","ja");await page.check("#consent");await page.click("#analyze");await page.waitForSelector("#results:visible");
 const sent=JSON.parse(requests.find(x=>x.path==="/api/analyze").body);assert.equal(sent.locale,"ko");assert.equal(sent.replyLanguage,"ja");
 assert.equal(await page.textContent("#replyDraft"),"また会いましょう");assert.equal(await page.textContent("#replyMeaning"),"다시 만나요");
 await page.click("#editStandardDraft");assert.equal(await page.inputValue("#coachReplyLanguage"),"ja");assert.equal(await page.inputValue("#coachDraft"),"また会いましょう");assert.deepEqual(problems,[]);
 }finally{await browser.close()}
});
