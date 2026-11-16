import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import app from "../api/analyze.mjs";

function req(body,extra={}){
  const headers={"content-type":"application/json","x-vercel-forwarded-for":"198.51.100.31",...extra.headers};
  return new Request("https://saynue.test/api/analyze",{method:extra.method||"POST",headers,body:(extra.method||"POST")==="POST"?(typeof body==="string"?body:JSON.stringify(body)):undefined});
}
const valid={platform:"line",relation:"talking",locale:"ja",chatText:"Me: Can we meet next week? Them: I'll check my schedule and let you know."};
const mock={verdict:"A polite but undecided response",warmthScore:57,reciprocityScore:48,evidenceLevel:"medium",keySignal:"A reply but no date agreed.",evidence:"They said they will check their schedule.",alternative:"They may genuinely be busy.",nextStep:"Give them time and respect the boundary."};

test("index HTML has a script with valid JavaScript syntax",()=>{
  const page=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
  const match=page.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match,"Inline script must exist");
  assert.doesNotThrow(()=>new vm.Script(match[1]));
  assert.match(page,/SAYNUE/);
  assert.match(page,/assets\/site\.css/);
  assert.match(page,/assets\/saynue-mark\.svg/);
  assert.match(page,/Read Between the Lines/);
  assert.doesNotMatch(page,/PANDOK|PAN<b>DOK/);
  assert.doesNotMatch(page,/LOVE2026|YOUR_GEMINI_API_KEY|getMockResult/);
});
test("GET is rejected",async()=>{assert.equal((await app.fetch(req(valid,{method:"GET"}))).status,405)});
test("cross-origin POST is rejected",async()=>{const r=await app.fetch(req(valid,{headers:{origin:"https://attacker.invalid"}}));assert.equal(r.status,403)});
test("missing key returns a clear not-configured status",async()=>{const old=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;try{const r=await app.fetch(req(valid));assert.equal(r.status,503);assert.equal((await r.json()).code,"NOT_CONFIGURED")}finally{if(old)process.env.GEMINI_API_KEY=old}});
test("bad JSON and insufficient chat return 400",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  assert.equal((await app.fetch(req("{bad"))).status,400);
  assert.equal((await app.fetch(req({...valid,chatText:"hi"}))).status,400);
});
test("unsupported mime and extra image text are rejected",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  assert.equal((await app.fetch(req({...valid,imageBase64:"AA".repeat(100),imageMimeType:"image/svg+xml",chatText:""}))).status,400);
  assert.equal((await app.fetch(req({...valid,imageBase64:"AA".repeat(100),imageMimeType:"image/jpeg"}))).status,400);
});
test("response is free-only and not cached, with Gemini called from server",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  const old=global.fetch;let calls=0;
  global.fetch=async(url,options)=>{
    calls++;assert.match(String(url),/generativelanguage.googleapis.com/);
    assert.equal(options.headers["x-goog-api-key"],"test-key");
    const sent=JSON.parse(options.body);
    assert.ok(sent.systemInstruction);
    assert.equal(sent.generationConfig.responseMimeType,"application/json");
    assert.ok(sent.generationConfig.responseSchema);
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({...mock,deepMindAnalysis:"SECRET",recommendedReplies:["SECRET"]})}]}}]}),{status:200});
  };
  try{
    const r=await app.fetch(req(valid,{headers:{"x-vercel-forwarded-for":"198.51.100.42",origin:"https://saynue.test"}}));
    assert.equal(r.status,200);
    assert.match(r.headers.get("Cache-Control"),/no-store/);
    const output=await r.json();
    assert.equal(output.verdict,mock.verdict);
    assert.equal(Object.hasOwn(output,"deepMindAnalysis"),false);
    assert.equal(Object.hasOwn(output,"recommendedReplies"),false);
    assert.equal(calls,1);
  }finally{global.fetch=old}
});
test("retries transient Gemini 503 then falls back to 3.1 Flash-Lite",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  const old=global.fetch;const urls=[];
  global.fetch=async(url)=>{
    urls.push(String(url));
    if(urls.length<3)return new Response(JSON.stringify({error:{status:"UNAVAILABLE"}}),{status:503});
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(mock)}]}}]}),{status:200});
  };
  try{
    const r=await app.fetch(req(valid,{headers:{"x-vercel-forwarded-for":"198.51.100.43"}}));
    assert.equal(r.status,200);
    assert.equal((await r.json()).verdict,mock.verdict);
    assert.equal(urls.length,3);
    assert.match(urls[0],/gemini-3.5-flash-lite/);
    assert.match(urls[2],/gemini-3.1-flash-lite/);
  }finally{global.fetch=old}
});
test("when all models are overloaded, return AI_BUSY rather than fake report",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  const old=global.fetch;let count=0;
  global.fetch=async()=>{count++;return new Response(JSON.stringify({error:{status:"UNAVAILABLE"}}),{status:503})};
  try{
    const r=await app.fetch(req(valid,{headers:{"x-vercel-forwarded-for":"198.51.100.44"}}));
    assert.equal(r.status,503);
    assert.equal((await r.json()).code,"AI_BUSY");
    assert.equal(count,3);
  }finally{global.fetch=old}
});
test("unconfigured local limiter throttles repeated calls",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  const old=global.fetch;global.fetch=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(mock)}]}}]}),{status:200});
  try{
    let last;
    for(let i=0;i<7;i++)last=await app.fetch(req(valid,{headers:{"x-vercel-forwarded-for":"198.51.100.89"}}));
    assert.equal(last.status,429);
  }finally{global.fetch=old}
});
