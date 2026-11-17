import test from "node:test";
import assert from "node:assert/strict";
import analyze from "../api/analyze.mjs";
import {PERSONAS,modePrompt,modeSchema,normalizePersonaResult} from "../lib/persona-analysis.mjs";

const chat="Me: Please tell me if plans change. Them: I'm sorry, I had to work late. Me: I waited and felt disappointed.";
const base={platform:"whatsapp",relation:"friends",goal:"repair",replyTone:"natural",locale:"en",chatText:chat};
const report={
 summary:"The exchange shows frustration and a response, but only limited context.",
 evidenceLevel:"medium",
 sectionOne:"The user wanted advance notice about the cancelled plans.",
 sectionTwo:"The other person explained a late work obligation, but details remain unconfirmed.",
 sectionThree:"Acknowledge both concerns and agree to notify each other about plan changes.",
 nextStep:"Ask whether a brief check-in would be welcome and respect any refusal.",
 shouldReply:true,
 replyDraft:"Thanks for explaining. Next time, could you let me know sooner?",
 replyWhy:"This reflects the stated concern without assigning intentions.",
 sourceQuote:"I waited and felt disappointed",
 sourceScreenshotIndex:0
};
const request=(body,ip="192.0.2.15")=>new Request("https://saynue.test/api/analyze",{
 method:"POST",headers:{"content-type":"application/json","origin":"https://saynue.test","x-vercel-forwarded-for":ip},
 body:JSON.stringify(body)
});
test("four specialist rubrics differ in task and do not score personal affection or guilt",()=>{
 assert.deepEqual(PERSONAS,["standard","court","work","romance","mediator"]);
 for(const persona of PERSONAS.filter(x=>x!=="standard")){
  const prompt=modePrompt({persona});
  assert.match(prompt,/untrusted DATA/);
  assert.match(prompt,/sectionOne/);
  assert.match(prompt,/sectionTwo/);
  assert.match(prompt,/sectionThree/);
  assert.match(prompt,/not a legal arbitrator/);
  assert.ok(modeSchema(persona).required.includes("sourceQuote"));
 }
 assert.match(modePrompt({persona:"court"}),/not a legal finding|NOT a legal/);
 assert.match(modePrompt({persona:"work"}),/never promise|Never promise/);
 assert.match(modePrompt({persona:"romance"}),/romantic intent/);
 assert.match(modePrompt({persona:"mediator"}),/forced apologies/);
});
test("specialized persona reports use the same rate-limited free endpoint, with distinct AI instructions",async()=>{
 const orig=global.fetch,oldKey=process.env.GEMINI_API_KEY,oldRedis=process.env.UPSTASH_REDIS_REST_URL,oldToken=process.env.UPSTASH_REDIS_REST_TOKEN;
 process.env.GEMINI_API_KEY="unit-persona-test";delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;
 try{
  const modes=["court","work","romance","mediator"];
  for(let i=0;i<modes.length;i++){
   const persona=modes[i];let seen=null;
   global.fetch=async (_url,options)=>{
    seen=JSON.parse(options.body);
    return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(report)}]}}]}),{status:200});
   };
   const response=await analyze.fetch(request({...base,persona,caseContext:"I want to communicate respectfully without guessing their intent."},"192.0.2."+(30+i)));
   assert.equal(response.status,200,persona);
   const output=await response.json();
   assert.equal(output.persona,persona);
   assert.equal(output.sectionOne,report.sectionOne);
   assert.equal(output.sectionTwo,report.sectionTwo);
   assert.equal(output.sectionThree,report.sectionThree);
   assert.equal(output.sourceQuote,report.sourceQuote);
   assert.equal(output.sourceVerified,true);
   assert.equal(output.sourceScreenshotIndex,0);
   assert.equal(Object.hasOwn(output,"warmthScore"),false);
   assert.equal(Object.hasOwn(output,"deepMindAnalysis"),false);
   assert.match(seen.contents[0].parts[0].text,new RegExp("Specialist mode: "+persona));
   assert.match(seen.contents[0].parts[0].text,/unverified claim/);
   assert.match(seen.systemInstruction.parts[0].text,/SECTION ONE/);
   assert.match(seen.systemInstruction.parts[0].text,/SECTION TWO/);
   assert.match(seen.systemInstruction.parts[0].text,/SECTION THREE/);
   assert.equal(seen.generationConfig.responseSchema.required.length,11);
  }
 }finally{
  global.fetch=orig;
  if(oldKey===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=oldKey;
  if(oldRedis===undefined)delete process.env.UPSTASH_REDIS_REST_URL;else process.env.UPSTASH_REDIS_REST_URL=oldRedis;
  if(oldToken===undefined)delete process.env.UPSTASH_REDIS_REST_TOKEN;else process.env.UPSTASH_REDIS_REST_TOKEN=oldToken;
 }
});
test("bad persona and oversized context are rejected before external AI",async()=>{
 const old=process.env.GEMINI_API_KEY;process.env.GEMINI_API_KEY="unit-persona-test";
 try{
  for(const [i,input] of [
   {...base,persona:"medical-doctor"},
   {...base,persona:"court",caseContext:"x".repeat(501)},
   {...base,persona:"work",caseContext:{statement:"fake"}},
   {...base,persona:"standard",caseContext:"Try to add unverified evidence"}
  ].entries()){
   const res=await analyze.fetch(request(input,"192.0.2."+(40+i)));
   assert.equal(res.status,400);
   assert.equal((await res.json()).code,"INVALID_INPUT");
  }
 }finally{if(old===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=old}
});
test("fabricated text excerpts are never marked verified; image OCR is explicitly unverified",()=>{
 const input={persona:"court",chat,images:[]};
 assert.equal(normalizePersonaResult({...report,sourceQuote:"They said that they hate me"},input).sourceQuote,"");
 const excerpt=normalizePersonaResult(report,input);
 assert.equal(excerpt.sourceVerified,true);
 assert.equal(excerpt.sourceQuote,report.sourceQuote);
 const image={persona:"court",chat:"",images:[{mime:"image/jpeg",data:"/9j/"+"A".repeat(100)}]};
 assert.equal(normalizePersonaResult({...report,sourceScreenshotIndex:1},image).sourceVerified,false);
 assert.equal(normalizePersonaResult({...report,sourceScreenshotIndex:2},image).sourceQuote,"");
});
test("refusals never return pursuing reply drafts even when model emits one",()=>{
 const output=normalizePersonaResult({...report,shouldReply:false,replyDraft:"Please reconsider and call me."},{persona:"mediator",chat,images:[]});
 assert.equal(output.shouldReply,false);
 assert.equal(output.replyDraft,"");
 assert.equal(output.replyWhy,report.replyWhy);
});
test("unsafe personal identifiers are blocked in specialist output",()=>{
 assert.equal(normalizePersonaResult({...report,replyDraft:"Call me at 010-1234-5678."},{persona:"work",chat,images:[]}),null);
 assert.equal(normalizePersonaResult({...report,summary:"Contact work@example.com for confirmation."},{persona:"work",chat,images:[]}),null);
 assert.equal(normalizePersonaResult({...report,sourceQuote:"me@example.com"},{persona:"work",chat,images:[]}).sourceQuote,"");
});
