import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";

function load(name){return fs.readFileSync(new URL("../"+name,import.meta.url),"utf8")}
function codeFrom(html){const m=html.match(/<script>([\s\S]*?)<\/script>/);assert.ok(m,"inline script");return m[1]}
test("Free/Plus page is informational and cannot charge or grant access",()=>{
  const page=load("plans.html");
  assert.doesNotThrow(()=>new vm.Script(codeFrom(page)));
  assert.match(page,/SAYNUE Plus|SAYNUE <span/);
  assert.match(page,/결제 준비 중|Payments not enabled/);
  assert.match(page,/아직 결제를 받거나|결제를 받거나 구독을 생성하지 않습니다|No checkout or subscription is active/);
  assert.doesNotMatch(page, /paddle\.js|checkout\.open|stripe\.js|client_secret|data-price-id|PADDLE_API_KEY|<form[^>]*action=/i);
  assert.match(page,/href="\/"/);
});
test("original public guide contains substantive content, not advertising placeholders",()=>{
  const page=load("guide.html");
  assert.doesNotThrow(()=>new vm.Script(codeFrom(page)));
  assert.match(page,/AI는 상대의 본심|AI는 타인의 속마음|AI cannot|AI無法/i);
  assert.match(page,/data-i="h5"/);
  assert.match(page,/href="\/plans\.html"/);
  assert.doesNotMatch(page,/adsbygoogle|googlesyndication|ad-slot|paddle\.js|checkout\.open|track\(/i);
});
test("homepage links to educational guide and planned membership without exposing paid API",()=>{
  const page=load("index.html");
  assert.match(page,/href="\/plans\.html"/);
  assert.match(page,/href="\/guide\.html"/);
  assert.doesNotMatch(page,/paddle\.js|checkout\.open|stripe\.js|data-price-id/i);
});
test("all monetization informational pages translate their visible labels into five languages",()=>{
  for(const path of ["plans.html","guide.html"]){
    const page=load(path),code=codeFrom(page);
    const marker=code.indexOf("const I="),end=code.indexOf("\nconst l=",marker);
    assert.ok(marker>=0&&end>marker,path);
    const dict=vm.runInNewContext("("+code.slice(marker+8,end).trim().replace(/;\s*$/,"")+")");
    const wanted=[...new Set([...page.matchAll(/data-i="([^"]+)"/g)].map(x=>x[1]))];
    for(const loc of ["ko","ja","en","zh-CN","zh-TW"]){
      assert.ok(dict[loc],loc);
      for(const key of wanted)assert.equal(typeof dict[loc][key],"string",path+" "+loc+" "+key);
    }
  }
});

// Dedicated Paddle Sandbox integration is intentionally isolated from Free / Plus public pages.
// Client-side sandbox tokens are publishable; the API key and webhook secret must never appear.
test("SAYNUE Sandbox checkout can only open a simulated payment and never grant Plus",()=>{
  const page=load("sandbox-checkout.html");
  const script=codeFrom(page);
  assert.doesNotThrow(()=>new vm.Script(script));
  assert.match(page,/noindex,nofollow/);
  assert.match(page,/https:\/\/cdn\.paddle\.com\/paddle\/v2\/paddle\.js/);
  assert.match(script,/const PRICE_ID="pri_01m7k4h86fsasy85vxy1w5d1bw"/);
  assert.match(script,/const CLIENT_TOKEN="test_[a-z0-9]+"/);
  assert.match(script,/Paddle\.Environment\.set\("sandbox"\)/);
  assert.match(script,/Paddle\.Initialize\(/);
  assert.match(script,/Paddle\.Checkout\.open\(/);
  assert.match(script,/eventCallback:onEvent/);
  assert.match(page,/Plus 기능은 아직 활성화되지 않아/);
  assert.doesNotMatch(page,/live_[a-z0-9]+|PADDLE_API_KEY|PADDLE_WEBHOOK_SECRET|grantPlus|localStorage\.setItem|sessionStorage\.setItem/);
  assert.doesNotMatch(load("index.html")+load("plans.html"),/sandbox-checkout\.html|test_1e2da107b538595bfd8fb2d8923/);
});
