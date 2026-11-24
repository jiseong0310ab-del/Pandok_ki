import test from "node:test";
import assert from "node:assert/strict";
import {hasContactIdentifier,maskContactIdentifiers,serverSecret,pickGeminiModels,createMemoryLimiter,sameOriginOrAbsent,createImageSlots} from "../lib/server-guard.mjs";
import analyze,{textResult} from "../api/analyze.mjs";
import {normalizePersonaResult} from "../lib/persona-analysis.mjs";
import {generatePlusReport,validatePlusOutput,validatePlusInput,buildPlusRequest} from "../lib/plus-coach.mjs";
import plusReport from "../api/plus/report.mjs";
import metrics from "../api/metrics.mjs";

function withEnv(values,fn){
 const previous=Object.fromEntries(Object.keys(values).map(k=>[k,process.env[k]]));
 for(const [k,v] of Object.entries(values)){if(v===undefined)delete process.env[k];else process.env[k]=v}
 const restore=()=>{for(const [k,v] of Object.entries(previous)){if(v===undefined)delete process.env[k];else process.env[k]=v}};
 try{
  const out=fn();
  if(out&&typeof out.then==="function")return out.finally(restore);
  restore();return out;
 }catch(e){restore();throw e}
}
const gemini=value=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:typeof value==="string"?value:JSON.stringify(value)}]}}]}),{status:200});

test("dates and clock times are not treated as phone numbers, real contacts still are",()=>{
 for(const text of ["2026-11-24에 다시 연락해 보세요","마감은 2026.11.28 18:00","회의 2026-11-24 10:30 - 2026-11-30","11/24/2026 meeting","오후 2시~3시 사이"]){
  assert.equal(hasContactIdentifier(text),false,text);
  assert.equal(maskContactIdentifiers(text),text);
 }
 for(const text of ["010-1234-5678로 연락","call +1 (555) 123-4567","me@example.com","https://example.com/x","www.example.com"]){
  assert.equal(hasContactIdentifier(text),true,text);
 }
 assert.equal(maskContactIdentifiers("번호 010-1234-5678, 메일 a.b@example.co.kr"),"번호 [phone], 메일 [email]");
 assert.equal(maskContactIdentifiers("2026-11-24 10:30에 090-1234-5678로"),"2026-11-24 10:30에 [phone]로");
});

test("per-purpose secrets never reuse the Gemini API key verbatim",()=>{
 const env={GEMINI_API_KEY:"gemini-key-1234567890"};
 const derived=serverSecret("analytics",[],env);
 assert.ok(derived&&derived!==env.GEMINI_API_KEY&&!derived.includes(env.GEMINI_API_KEY));
 assert.notEqual(serverSecret("rate-limit",[],env),derived);
 assert.equal(serverSecret("analytics",["SAYNUE_ANALYTICS_SALT"],{...env,SAYNUE_ANALYTICS_SALT:"explicit-salt-123456"}),"explicit-salt-123456");
 assert.equal(serverSecret("analytics",["SAYNUE_ANALYTICS_SALT"],{...env,SAYNUE_ANALYTICS_SALT:"short"}),derived);
 assert.equal(serverSecret("analytics",[],{}),null);
});

test("model selection, origin check and memory limiter share one implementation",()=>{
 assert.deepEqual(pickGeminiModels({}),{primary:"gemini-3.5-flash-lite",fallback:"gemini-3.1-flash-lite"});
 assert.deepEqual(pickGeminiModels({GEMINI_MODEL:"gemini-3.1-flash-lite"}),{primary:"gemini-3.1-flash-lite",fallback:"gemini-3.5-flash-lite"});
 assert.equal(pickGeminiModels({GEMINI_MODEL:"evil-model"}).primary,"gemini-3.5-flash-lite");
 const r=(origin)=>new Request("https://saynue.test/api/x",{method:"POST",headers:origin?{origin}:{}});
 assert.equal(sameOriginOrAbsent(r()),true);
 assert.equal(sameOriginOrAbsent(r("https://saynue.test")),true);
 assert.equal(sameOriginOrAbsent(r("http://saynue.test")),false);
 assert.equal(sameOriginOrAbsent(r("https://saynue.test.evil.example")),false);
 const allow=createMemoryLimiter({max:2,windowMs:1000});
 assert.deepEqual([allow("a",0),allow("a",1),allow("a",2),allow("b",2),allow("a",1500)],[true,true,false,true,true]);
});

test("follow-up prompt uses real line breaks around the previous report",async()=>{
 const old=global.fetch;let payload=null;
 global.fetch=async(url,options)=>{payload=JSON.parse(options.body);return gemini({verdict:"Short reply, little evidence",warmthScore:50,reciprocityScore:50,evidenceLevel:"low",keySignal:"Only one new message.",evidence:"They replied briefly.",alternative:"They may be busy.",nextStep:"Wait without pressure.",shouldReply:true,replyDraft:"알겠어, 편할 때 얘기해줘.",replyWhy:"Keeps it light.",evidenceCards:[]})};
 try{
  await withEnv({GEMINI_API_KEY:"test-key-1234567890",UPSTASH_REDIS_REST_URL:undefined,UPSTASH_REDIS_REST_TOKEN:undefined},async()=>{
   const body={platform:"kakao",relation:"talking",locale:"ko",goal:"reply",chatText:"응",priorAnalysis:{summary:"Inconclusive.",signal:"Asked a question.",nextStep:"Reply calmly.",turn:1}};
   const res=await analyze.fetch(new Request("https://saynue.test/api/analyze",{method:"POST",headers:{"content-type":"application/json","x-vercel-forwarded-for":"203.0.113.90"},body:JSON.stringify(body)}));
   assert.equal(res.status,200);
  });
  const text=payload.contents[0].parts.map(p=>p.text||"").join("\n");
  assert.match(text,/\n<previous_report>\n/);
  assert.doesNotMatch(text,/\\n<previous_report>/);
 }finally{global.fetch=old}
});

test("free and specialist reports keep dates but still mask or reject contacts",()=>{
 const base={verdict:"Schedule pending",warmthScore:55,reciprocityScore:50,evidenceLevel:"medium",keySignal:"They proposed 2026-11-28 18:00 instead.",evidence:"A new date was offered.",alternative:"They may be busy.",nextStep:"Confirm 2026-11-28 18:00, or call 010-1234-5678.",shouldReply:true,replyDraft:"2026-11-28 18:00 좋아!",replyWhy:"Accepts their date.",evidenceCards:[]};
 const out=textResult(base,{chat:"x".repeat(30),images:[]});
 assert.match(out.keySignal,/2026-11-28 18:00/);
 assert.equal(out.nextStep,"Confirm 2026-11-28 18:00, or call [phone].");
 const persona={summary:"Deadline is 2026-11-28 and needs confirmation.",sectionOne:"Deliverable: the report due 2026-11-28.",sectionTwo:"Deadline is explicit; scope is not.",sectionThree:"Acknowledge and confirm scope.",nextStep:"Confirm scope before 2026-11-28.",replyWhy:"Short and clear acknowledgement.",evidenceLevel:"medium",shouldReply:true,replyDraft:"네, 2026-11-28까지 제출하겠습니다.",sourceQuote:"",sourceScreenshotIndex:0};
 const input={persona:"work",chat:"상사: 보고서 2026-11-28까지 부탁해요",images:[]};
 assert.ok(normalizePersonaResult(persona,input));
 assert.equal(normalizePersonaResult({...persona,replyDraft:"010-1234-5678로 전화 주세요"},input),null);
});

const plusInput={locale:"ko",relation:"work",goal:"reply",replyTone:"natural",chatText:"상사: 보고서 다음 주 금요일까지 가능할까요? 나: 확인해 보겠습니다."};
const plusValid={
 situation:"상사가 2026-11-28 마감 가능 여부를 묻고 있어요.",shouldReply:true,boundaryReason:"업무 일정 확인이라 답해도 괜찮아요.",
 choices:[
  {approach:"gentle",draft:"네, 2026-11-28까지 맞춰 보겠습니다. 감사합니다.",why:"요청을 존중하며 수락해요.",tradeoff:"범위가 크면 부담이 될 수 있어요.",bestWhen:"일정이 무리 없을 때 좋아요."},
  {approach:"clear",draft:"2026-11-28 18:00까지 초안 드리겠습니다.",why:"마감 시각을 분명히 해요.",tradeoff:"시간을 못 맞추면 신뢰에 영향이 있어요.",bestWhen:"기대치를 명확히 할 때 좋아요."},
  {approach:"low_pressure",draft:"확인 후 오늘 중으로 가능 여부 알려드릴게요.",why:"확답 전에 여유를 둬요.",tradeoff:"결정이 조금 늦어져요.",bestWhen:"범위가 불분명할 때 좋아요."}
 ],
 reactions:[
  {reaction:"engaged",nextStep:"합의한 마감과 범위를 짧게 정리해요.",caution:"구두 합의를 과하게 해석하지 마세요."},
  {reaction:"uncertain",nextStep:"필요한 정보를 한 가지만 물어봐요.",caution:"불확실함을 거절로 단정하지 마세요."},
  {reaction:"no_reply",nextStep:"업무 시간에 한 번만 다시 확인해요.",caution:"반복 독촉은 피하세요."},
  {reaction:"refusal",nextStep:"상대 결정을 존중하고 대안을 기다려요.",caution:"우회해서 압박하지 마세요."}
 ],
 finalCaution:"예시일 뿐이며 상대 반응을 예측하지 않아요."
};

test("Plus input validation is idempotent, keeping text input and the chosen tone",()=>{
 const once=validatePlusInput({...plusInput,replyTone:"warm"});
 assert.equal(once.tone,"warm");
 assert.deepEqual(validatePlusInput(once),once);
 assert.ok(buildPlusRequest(once).systemInstruction);
 assert.match(buildPlusRequest(once).contents[0].parts[0].text,/Preferred voice: warm/);
 const img={mimeType:"image/jpeg",base64:"/9j/"+"A".repeat(130)};
 const shots=validatePlusInput({...plusInput,chatText:"",images:[img]});
 assert.deepEqual(validatePlusInput(shots),shots);
 assert.equal(validatePlusInput({...plusInput,chatText:"",images:[]}),null);
});

test("Plus accepts dated drafts and retries with the fallback model",async()=>{
 assert.ok(validatePlusOutput(plusValid));
 const urls=[];
 const result=await generatePlusReport(plusInput,{apiKey:"k",retryDelayMs:1,fetchImpl:async url=>{urls.push(url);return urls.length===1?new Response("{}",{status:503}):gemini(plusValid)}});
 assert.equal(result.choices.length,3);
 assert.match(urls[0],/gemini-3\.5-flash-lite/);
 assert.match(urls[1],/gemini-3\.1-flash-lite/);
});

test("Plus fails fast on rejected requests and times out hung calls",async()=>{
 let calls=0;
 await assert.rejects(()=>generatePlusReport(plusInput,{apiKey:"k",retryDelayMs:1,fetchImpl:async()=>{calls++;return new Response("{}",{status:400})}}),/AI_REJECTED/);
 assert.equal(calls,1);
 const hang=(url,{signal})=>new Promise((_,reject)=>signal.addEventListener("abort",()=>reject(signal.reason)));
 // AbortSignal.timeout timers are unref'd; a real socket keeps the loop alive in production.
 const keepAlive=setInterval(()=>{},1000);
 try{await assert.rejects(()=>generatePlusReport(plusInput,{apiKey:"k",retryDelayMs:1,timeoutsMs:[30,30],fetchImpl:hang}),/AI_UNAVAILABLE/)}
 finally{clearInterval(keepAlive)}
 let n=0;
 await assert.rejects(()=>generatePlusReport(plusInput,{apiKey:"k",retryDelayMs:1,fetchImpl:async()=>++n===1?gemini("{"):new Response("{}",{status:503})}),/AI_INVALID_OUTPUT/);
});

test("Plus route refunds quota on provider outage but not on billed invalid output",async()=>{
 const env={SAYNUE_ENABLE_PLUS_ENGINE:"true",SAYNUE_PADDLE_ENV:"sandbox",SUPABASE_URL:"https://unit.supabase.co",SUPABASE_PUBLISHABLE_KEY:"sb_publishable_unit",SUPABASE_SECRET_KEY:"sb_secret_unit",GEMINI_API_KEY:"gemini-unit-123456",GEMINI_MODEL:undefined};
 const old=global.fetch;
 const run=async geminiResponse=>{
  const rpc=[];
  global.fetch=async(url)=>{
   url=String(url);
   if(url.endsWith("/auth/v1/user"))return new Response(JSON.stringify({id:"123e4567-e89b-42d3-a456-426614174000",email:"qa@example.com",email_confirmed_at:"2026-11-01T00:00:00Z"}),{status:200});
   if(url.includes("/rpc/")){rpc.push(url.split("/rpc/")[1]);return new Response("true",{status:200})}
   if(url.includes("generativelanguage"))return geminiResponse();
   throw Error("unexpected "+url);
  };
  const res=await plusReport.fetch(new Request("https://saynue.test/api/plus/report",{method:"POST",headers:{"content-type":"application/json",origin:"https://saynue.test",cookie:"__Host-saynue_access=unit.access.token"},body:JSON.stringify(plusInput)}));
  return {status:res.status,code:(await res.json()).code,rpc};
 };
 try{
  await withEnv(env,async()=>{
   const outage=await run(()=>new Response("{}",{status:503}));
   assert.equal(outage.status,503);
   assert.deepEqual(outage.rpc,["saynue_claim_plus_credit","saynue_refund_plus_credit"]);
   const invalid=await run(()=>gemini("{"));
   assert.equal(invalid.status,502);
   assert.equal(invalid.code,"AI_INVALID_OUTPUT");
   assert.deepEqual(invalid.rpc,["saynue_claim_plus_credit"]);
   const ok=await run(()=>gemini(plusValid));
   assert.equal(ok.status,200);
   assert.deepEqual(ok.rpc,["saynue_claim_plus_credit"]);
  });
 }finally{global.fetch=old}
});

test("metrics cannot drain Redis by rotating visitor IDs from one IP",async()=>{
 const old=global.fetch;let redisCalls=0;
 global.fetch=async(url,options)=>{
  redisCalls++;
  const cmds=JSON.parse(options.body);
  return new Response(JSON.stringify(cmds.map(c=>({result:c[0]==="INCR"?(String(c[1]).includes(":ipbudget:")?601:1):1}))),{status:200});
 };
 const post=(id,ip)=>metrics.fetch(new Request("https://saynue.test/api/metrics",{method:"POST",headers:{"content-type":"application/json",origin:"https://saynue.test","x-vercel-forwarded-for":ip},body:JSON.stringify({event:"visit",visitorId:id,firstDay:new Date().toISOString().slice(0,10)})}));
 try{
  await withEnv({UPSTASH_REDIS_REST_URL:"https://redis.example.test",UPSTASH_REDIS_REST_TOKEN:"t",SAYNUE_ANALYTICS_SALT:"unit-analytics-salt-123"},async()=>{
   assert.equal((await post("a".repeat(32),"198.51.100.200")).status,429);
   // Per-instance limiter answers without touching Redis once exhausted.
   for(let i=0;i<90;i++)await post(i.toString(16).padStart(32,"0"),"198.51.100.201");
   const before=redisCalls;
   assert.equal((await post("b".repeat(32),"198.51.100.201")).status,429);
   assert.equal(redisCalls,before);
  });
 }finally{global.fetch=old}
});

test("deployment config gives every Gemini route enough time and blocks framing",async()=>{
 const fs=await import("node:fs");
 const config=JSON.parse(fs.readFileSync(new URL("../vercel.json",import.meta.url),"utf8"));
 // Each route's own upstream timeouts must fit inside its function limit.
 assert.ok(config.functions["api/analyze.mjs"].maxDuration>=35);
 assert.ok(config.functions["api/simulate.mjs"].maxDuration>=25);
 assert.ok(config.functions["api/plus/report.mjs"].maxDuration>=30);
 assert.ok(config.functions["api/coach.mjs"].maxDuration>=28);
 const headers=Object.fromEntries(config.headers.find(h=>h.source==="/(.*)").headers.map(h=>[h.key,h.value]));
 assert.equal(headers["X-Frame-Options"],"DENY");
 assert.match(headers["Content-Security-Policy"],/frame-ancestors 'none'/);
 assert.doesNotMatch(headers["Permissions-Policy"],/clipboard|payment/);
});

test("email sign-in start is throttled per address and per client before Supabase",async()=>{
 const {default:start}=await import("../api/auth/start.mjs");
 const old=global.fetch;let sent=0;
 global.fetch=async()=>{sent++;return new Response("{}",{status:200})};
 const ask=(email,ip)=>start.fetch(new Request("https://saynue.test/api/auth/start",{method:"POST",headers:{"content-type":"application/json",origin:"https://saynue.test","x-vercel-forwarded-for":ip},body:JSON.stringify({email})}));
 try{
  await withEnv({SUPABASE_URL:"https://unit.supabase.co",SUPABASE_PUBLISHABLE_KEY:"sb_publishable_unit"},async()=>{
   const codes=[];
   for(let i=0;i<4;i++)codes.push((await ask("victim@example.com","198.51.100."+(10+i))).status);
   assert.deepEqual(codes,[200,200,200,429]);
   const fromOne=[];
   for(let i=0;i<7;i++)fromOne.push((await ask("user"+i+"@example.com","198.51.100.99")).status);
   assert.deepEqual(fromOne,[200,200,200,200,200,200,429]);
   assert.equal(sent,9);
  });
 }finally{global.fetch=old}
});

test("image data is spliced into the Gemini request byte-for-byte like JSON.stringify",()=>{
 const slots=createImageSlots();
 const datas=["/9j/"+"A".repeat(5000),"/9j/"+"B+/".repeat(900)+"=","/9j/C"];
 const value={text:"quote \"x\" \\ \u0000 한글",parts:datas.map((_,i)=>({inline_data:{mime_type:"image/jpeg",data:slots.slot(i)}}))};
 const expected=JSON.stringify({...value,parts:datas.map(d=>({inline_data:{mime_type:"image/jpeg",data:d}}))});
 assert.equal(slots.stringify(value,datas),expected);
 assert.throws(()=>slots.stringify(value,datas.slice(0,2)),/IMAGE_SLOT_MISMATCH/);
 assert.throws(()=>slots.stringify(value,['/9j/"}],"x":"',datas[1],datas[2]]),/IMAGE_SLOT_MISMATCH/);
 // A user-typed look-alike marker cannot collide with the per-request nonce.
 assert.equal(createImageSlots().stringify({note:"\u0000saynue-image-0"},[]),JSON.stringify({note:"\u0000saynue-image-0"}));
});

test("Cloudflare config builds the public folder itself before deploying",async()=>{
 const fs=await import("node:fs");
 const raw=fs.readFileSync(new URL("../wrangler.jsonc",import.meta.url),"utf8");
 const config=JSON.parse(raw.replace(/^\s*\/\/.*$/gm,""));
 assert.equal(config.build.command,"node scripts/build-cloudflare.mjs");
 assert.equal(config.assets.directory,"./.cloudflare-public");
});

