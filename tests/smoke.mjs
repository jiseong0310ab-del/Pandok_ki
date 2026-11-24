import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {homeWithScript} from "./page-source.mjs";
import vm from "node:vm";
import app from "../api/analyze.mjs";

function req(body,extra={}){
  const headers={"content-type":"application/json","x-vercel-forwarded-for":"198.51.100.31",...extra.headers};
  return new Request("https://saynue.test/api/analyze",{method:extra.method||"POST",headers,body:(extra.method||"POST")==="POST"?(typeof body==="string"?body:JSON.stringify(body)):undefined});
}
const valid={platform:"line",relation:"talking",goal:"reply",locale:"ja",chatText:"Me: Can we meet next week? Them: I'll check my schedule and let you know."};
const mock={verdict:"A polite but undecided response",warmthScore:57,reciprocityScore:48,evidenceLevel:"medium",keySignal:"A reply but no date agreed.",evidence:"They said they will check their schedule.",alternative:"They may genuinely be busy.",nextStep:"Give them time and respect the boundary.",replyDraft:"No rush, let me know when you know your schedule.",replyWhy:"It acknowledges their busy schedule without pressuring them.",evidenceCards:[]};

test("index HTML has a script with valid JavaScript syntax",()=>{
  const page=homeWithScript;
  const match=page.match(/<script>([\s\S]*?)<\/script>/);
  assert.ok(match,"Inline script must exist");
  assert.doesNotThrow(()=>new vm.Script(match[1]));
  assert.match(page,/SAYNUE/);
  assert.match(page,/assets\/site\.css/);
  assert.match(page,/assets\/saynue-mark\.svg/);
  assert.match(page,/Read Between the Lines/);
  assert.doesNotMatch(page,/PANDOK|PAN<b>DOK/);
  assert.match(page,/id="goals"/);
  assert.match(page,/id="replyCard"/);
  assert.match(page,/id="maskText"/);
  assert.match(page,/goal:goal/);
  assert.match(page,/id="tones"/);
  assert.match(page,/replyTone:replyTone/);
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
test("goal values are strictly validated while older clients keep a safe default",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  assert.equal((await app.fetch(req({...valid,goal:"hidden-admin"}))).status,400);
  const old=global.fetch;let seen="";
  global.fetch=async(_url,options)=>{
    const payload=JSON.parse(options.body);
    seen=payload.contents[0].parts[0].text;
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(mock)}]}}]}),{status:200});
  };
  try {
    const r=await app.fetch(req({...valid,goal:undefined},{headers:{"x-vercel-forwarded-for":"198.51.100.49"}}));
    assert.equal(r.status,200);
    assert.match(seen,/User goal: understand/);
  }finally{global.fetch=old}
});
test("reply tone is validated and safely defaults to natural",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  const invalid=await app.fetch(req({...valid,replyTone:"unlock-plus"}));
  assert.equal(invalid.status,400);
  const old=global.fetch;const prompts=[];
  global.fetch=async(_url,options)=>{
    const payload=JSON.parse(options.body);
    prompts.push(payload.contents[0].parts[0].text);
    assert.match(payload.systemInstruction.parts[0].text,/The reply tone is a STYLE preference/);
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(mock)}]}}]}),{status:200});
  };
  try {
    const requests=[{tone:undefined,ip:"198.51.100.51",expected:"natural"},{tone:"warm",ip:"198.51.100.52",expected:"warm"},{tone:"direct",ip:"198.51.100.53",expected:"direct"},{tone:"light",ip:"198.51.100.54",expected:"light"}];
    for(const x of requests){
      const result=await app.fetch(req({...valid,replyTone:x.tone},{headers:{"x-vercel-forwarded-for":x.ip}}));
      assert.equal(result.status,200);
      assert.equal((await result.json()).replyDraft,mock.replyDraft);
    }
    assert.equal(prompts.length,4);
    requests.forEach((x,i)=>assert.match(prompts[i],new RegExp("Preferred reply tone: "+x.expected)));
  }finally{global.fetch=old}
});
test("unsupported mime and extra image text are rejected",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  assert.equal((await app.fetch(req({...valid,imageBase64:"AA".repeat(100),imageMimeType:"image/svg+xml",chatText:""}))).status,400);
  assert.equal((await app.fetch(req({...valid,imageBase64:"AA".repeat(100),imageMimeType:"image/jpeg"}))).status,400);
});
test("three redacted JPEG screenshots reach Gemini in the exact user order",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  const fake=i=>"/9j/"+String(i).repeat(160);
  const items=[1,2,3].map(i=>({mimeType:"image/jpeg",base64:fake(i)}));
  let captured=null;
  const previous=global.fetch;
  global.fetch=async(_url,options)=>{
    captured=JSON.parse(options.body);
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(mock)}]}}]}),{status:200});
  };
  try{
    const r=await app.fetch(req({...valid,chatText:"",images:items},{headers:{"x-vercel-forwarded-for":"198.51.100.61"}}));
    assert.equal(r.status,200);
    assert.equal((await r.json()).verdict,mock.verdict);
    const parts=captured.contents[0].parts;
    assert.equal(parts.length,8);
    assert.match(parts[1].text,/oldest to newest/);
    for(let i=0;i<3;i++){
      assert.match(parts[i*2+2].text,new RegExp("Screenshot "+(i+1)+" of 3"));
      assert.equal(parts[i*2+3].inline_data.mime_type,"image/jpeg");
      assert.equal(parts[i*2+3].inline_data.data,items[i].base64);
    }
    assert.match(captured.systemInstruction.parts[0].text,/duplicate overlapping messages/);
  }finally{global.fetch=previous}
});

test("multi-image JSON rejects unredacted formats, mixed text, and oversized inputs",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  const fake="/9j/"+"A".repeat(100);
  const img={mimeType:"image/jpeg",base64:fake};
  const invalid=[
    [],
    [img,img,img,img],
    [{mimeType:"image/png",base64:fake}],
    [{mimeType:"image/jpeg",base64:"A".repeat(100)}],
    [{mimeType:"image/jpeg",base64:fake,name:"recipient-identity"}],
    [{mimeType:"image/jpeg",base64:"/9j/"+"A".repeat(1050000)}],
    null,"wrong format"
  ];
  for(const [index,images] of invalid.entries()){
    const r=await app.fetch(req({...valid,chatText:"",images},{headers:{"x-vercel-forwarded-for":"198.51.100."+(65+index)}}));
    assert.equal(r.status,400,"invalid image payload "+index);
  }
  assert.equal((await app.fetch(req({...valid,images:[img]},{headers:{"x-vercel-forwarded-for":"198.51.100.80"}}))).status,400);
  assert.equal((await app.fetch(req({...valid,chatText:"",imageBase64:fake,images:[img]},{headers:{"x-vercel-forwarded-for":"198.51.100.81"}}))).status,400);
});

test("legacy single screenshot JSON remains valid for previously deployed clients",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  const old=global.fetch;
  let parts=[];
  global.fetch=async(_url,options)=>{
    parts=JSON.parse(options.body).contents[0].parts;
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(mock)}]}}]}),{status:200});
  };
  try{
    const imageBase64="/9j/"+"A".repeat(100);
    const r=await app.fetch(req({...valid,chatText:"",imageBase64,imageMimeType:"image/jpeg"},{headers:{"x-vercel-forwarded-for":"198.51.100.82"}}));
    assert.equal(r.status,200);
    assert.equal(parts[3].inline_data.data,imageBase64);
  }finally{global.fetch=old}
});

test("evidence cards return only exact pasted quotes with separate tentative readings",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  const old=global.fetch;
  const cards=[
    {quote:"I'll check my schedule",reading:"A reply was given but no firm day was agreed.",otherExplanation:"They might be occupied with other plans.",screenshotIndex:0},
    {quote:"I secretly love you",reading:"Not present in the conversation.",otherExplanation:"Unverified invented claim.",screenshotIndex:0},
    {quote:"I'll check my schedule",reading:"Duplicate should be filtered out.",otherExplanation:"Another duplicate interpretation.",screenshotIndex:0},
    {quote:"me@example.com",reading:"Personal details should not be repeated.",otherExplanation:"Privacy protection should prevent this.",screenshotIndex:0}
  ];
  global.fetch=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({...mock,evidenceCards:cards})}]}}]}),{status:200});
  try{
    const res=await app.fetch(req(valid,{headers:{"x-vercel-forwarded-for":"198.51.100.91"}}));
    assert.equal(res.status,200);
    const result=await res.json();
    assert.equal(result.evidenceCards.length,1);
    assert.equal(result.evidenceCards[0].quote,"I'll check my schedule");
    assert.equal(result.evidenceCards[0].sourceType,"text");
    assert.equal(result.evidenceCards[0].screenshotIndex,0);
    assert.equal(result.evidenceCards[0].reading,cards[0].reading);
    assert.equal(Object.hasOwn(result,"deepMindAnalysis"),false);
  }finally{global.fetch=old}
});

test("image excerpt cards must identify an uploaded screenshot and never claim text verification",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  const old=global.fetch;
  const img={mimeType:"image/jpeg",base64:"/9j/"+"A".repeat(200)};
  const cards=[
    {quote:"Maybe next week",reading:"There may be interest in another time.",otherExplanation:"The sender could be busy.",screenshotIndex:2},
    {quote:"A line from screenshot four",reading:"This line has no valid source.",otherExplanation:"Source out of range.",screenshotIndex:4},
    {quote:"Another message",reading:"This line has no valid screenshot.",otherExplanation:"Source missing.",screenshotIndex:0}
  ];
  global.fetch=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({...mock,evidenceCards:cards})}]}}]}),{status:200});
  try{
    const res=await app.fetch(req({...valid,chatText:"",images:[img,img]},{headers:{"x-vercel-forwarded-for":"198.51.100.92"}}));
    assert.equal(res.status,200);
    const result=await res.json();
    assert.equal(result.evidenceCards.length,1);
    assert.equal(result.evidenceCards[0].sourceType,"image");
    assert.equal(result.evidenceCards[0].screenshotIndex,2);
  }finally{global.fetch=old}
});

test("missing or unverifiable evidence cards do not erase the core analysis",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  const old=global.fetch;
  global.fetch=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({...mock,evidenceCards:[{quote:"Made-up observation",reading:"Could be something",otherExplanation:"May mean something else",screenshotIndex:0}]})}]}}]}),{status:200});
  try{
    const res=await app.fetch(req(valid,{headers:{"x-vercel-forwarded-for":"198.51.100.93"}}));
    assert.equal(res.status,200);
    const result=await res.json();
    assert.deepEqual(result.evidenceCards,[]);
    assert.equal(result.verdict,mock.verdict);
  }finally{global.fetch=old}
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
    assert.equal(sent.contents[0].parts[0].text.includes("User goal: reply"),true);
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({...mock,deepMindAnalysis:"SECRET",recommendedReplies:["SECRET"]})}]}}]}),{status:200});
  };
  try{
    const r=await app.fetch(req(valid,{headers:{"x-vercel-forwarded-for":"198.51.100.42",origin:"https://saynue.test"}}));
    assert.equal(r.status,200);
    assert.match(r.headers.get("Cache-Control"),/no-store/);
    const output=await r.json();
    assert.equal(output.verdict,mock.verdict);
    assert.equal(output.replyDraft,mock.replyDraft);
    assert.equal(output.replyWhy,mock.replyWhy);
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
test("missing or blank optional reply does not erase a valid core report",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  const old=global.fetch;let calls=0;
  global.fetch=async()=>{
    calls++;
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({...mock,replyDraft:"",replyWhy:""})}]}}]}),{status:200});
  };
  try{
    const r=await app.fetch(req(valid,{headers:{"x-vercel-forwarded-for":"198.51.100.48"}}));
    assert.equal(r.status,200);
    const report=await r.json();
    assert.equal(report.verdict,mock.verdict);
    assert.equal(report.replyDraft,"");
    assert.equal(report.replyWhy,"");
    assert.equal(calls,1);
  }finally{global.fetch=old}
});
test("recovers from transient malformed Gemini output without inventing a report",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  const old=global.fetch;let count=0;
  global.fetch=async()=>{
    count++;
    if(count===1)return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({verdict:"Incomplete"})}]}}]}),{status:200});
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(mock)}]}}]}),{status:200});
  };
  try{
    const r=await app.fetch(req(valid,{headers:{"x-vercel-forwarded-for":"198.51.100.46"}}));
    assert.equal(r.status,200);
    assert.equal((await r.json()).replyDraft,mock.replyDraft);
    assert.equal(count,2);
  }finally{global.fetch=old}
});
test("fully malformed model responses fail without false positive success",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  const old=global.fetch;let count=0;
  global.fetch=async()=>{count++;return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({verdict:"Incomplete"})}]}}]}),{status:200})};
  try{
    const r=await app.fetch(req(valid,{headers:{"x-vercel-forwarded-for":"198.51.100.47"}}));
    assert.equal(r.status,502);
    assert.equal((await r.json()).code,"AI_INVALID_OUTPUT");
    assert.equal(count,3);
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
test("a timeout is never resent to the same model; screenshots get at most two calls",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  const old=global.fetch;let models=[];
  const timeout=()=>{const e=new Error("timed out");e.name="TimeoutError";throw e};
  try{
    // Text: primary times out, the same model is skipped, the fallback answers.
    global.fetch=async url=>{models.push(String(url).match(/models\/([^:]+)/)[1]);if(models.length===1)timeout();return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(mock)}]}}]}),{status:200})};
    let r=await app.fetch(req(valid,{headers:{"x-vercel-forwarded-for":"198.51.100.120"}}));
    assert.equal(r.status,200);assert.equal(models.length,2);assert.notEqual(models[0],models[1]);
    // Three screenshots that keep timing out cost two calls, not three.
    models=[];global.fetch=async url=>{models.push(String(url).match(/models\/([^:]+)/)[1]);timeout()};
    const shots=[1,2,3].map(i=>({mimeType:"image/jpeg",base64:"/9j/"+String(i).repeat(160)}));
    r=await app.fetch(req({platform:"kakao",relation:"friends",goal:"understand",locale:"ko",images:shots},{headers:{"x-vercel-forwarded-for":"198.51.100.121"}}));
    assert.equal(r.status,503);assert.equal((await r.json()).code,"AI_TIMEOUT");
    assert.equal(models.length,2);assert.notEqual(models[0],models[1]);
    // A transient 503 on screenshots still falls back once.
    models=[];global.fetch=async url=>{models.push(String(url).match(/models\/([^:]+)/)[1]);return models.length===1?new Response("{}",{status:503}):new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(mock)}]}}]}),{status:200})};
    r=await app.fetch(req({platform:"kakao",relation:"friends",goal:"understand",locale:"ko",images:shots},{headers:{"x-vercel-forwarded-for":"198.51.100.122"}}));
    assert.equal(r.status,200);assert.equal(models.length,2);
  }finally{global.fetch=old}
});
test("unconfigured local limiter throttles repeated calls",async()=>{
  process.env.GEMINI_API_KEY="test-key";
  const old=global.fetch;global.fetch=async()=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(mock)}]}}]}),{status:200});
  try{
    let last;
    const statuses=[];
    for(let i=0;i<13;i++)statuses.push((await app.fetch(req(valid,{headers:{"x-vercel-forwarded-for":"198.51.100.89"}}))).status);
    assert.deepEqual(statuses.slice(0,12),Array(12).fill(200),"twelve analyses an hour fit before Redis is configured");
    assert.equal(statuses[12],429);
  }finally{global.fetch=old}
});
test("homepage has no inline script, so its CSP forbids inline script execution",async()=>{
  const {homeHtml}=await import("./page-source.mjs");
  assert.doesNotMatch(homeHtml,/<script>/);
  assert.doesNotMatch(homeHtml,/\son[a-z]+="/i);
  const csp=homeHtml.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1];
  const scriptSrc=csp.split(";").map(s=>s.trim()).find(s=>s.startsWith("script-src"));
  assert.equal(scriptSrc,"script-src 'self'");
  // The controller must run after the helper scripts it uses.
  const order=["screenshot-editor.js","situation-library.js","reply-style.js","usage-metrics.js","app.js"].map(f=>homeHtml.indexOf("/assets/"+f));
  assert.ok(order.every((v,i)=>v>0&&(i===0||v>order[i-1])),String(order));
});
