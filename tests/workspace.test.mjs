import test from "node:test";import assert from "node:assert/strict";import coach,{parseCoachInput,normalizeCoachResult} from "../api/coach.mjs";import {parseInput,textResult} from "../api/analyze.mjs";
const base={mode:"reply",locale:"ko",relation:"unknown",context:"상사에게 일정 변경 요청",draft:"",tone:"natural",length:"normal",emoji:"none"};
test("coach modes and no-contact response",()=>{
 for(const mode of ["reply","counsel","prepare","reflect"])assert.ok(parseCoachInput({...base,mode}));
 assert.equal(parseCoachInput({...base,context:"",draft:""}),null);
 assert.equal(parseCoachInput({...base,mode:"reflect",draft:"abc"}),null);
 const v=normalizeCoachResult({summary:"Respect the boundary",advice:"They requested no contact.",steps:["Do not contact them"],shouldReply:false,message:"Try again",why:"Respect refusal",caution:"No predictions"});
 assert.equal(v.message,"");assert.equal(v.shouldReply,false);
});
test("coach provider request uses bounded structured output",async()=>{
 const prev=process.env.GEMINI_API_KEY,old=global.fetch;process.env.GEMINI_API_KEY="unit-test-only";
 try{global.fetch=async(_url,opts)=>{const p=JSON.parse(opts.body);assert.match(p.systemInstruction.parts[0].text,/UNTRUSTED DATA/);assert.equal(JSON.parse(p.contents[0].parts[0].text).mode,"prepare");return new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify({summary:"Prepare a clear request",advice:"Explain the timing.",steps:["Ask for an alternative"],shouldReply:true,message:"Could we reschedule?",why:"Clear request",caution:"No guarantees"})}]}}]}))};
 const r=await coach.fetch(new Request("https://saynue.test/api/coach",{method:"POST",headers:{"content-type":"application/json","x-vercel-forwarded-for":"192.0.2.178"},body:JSON.stringify({...base,mode:"prepare"})}));assert.equal(r.status,200);assert.equal((await r.json()).message,"Could we reschedule?");
 }finally{global.fetch=old;if(prev===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=prev}
});
test("automatic expert request with optional situation context",()=>{
 const p=parseInput({locale:"ko",chatText:"A conversation long enough to be analyzed",autoExpert:true,caseContext:"family context",relation:"family"});
 assert.equal(p.autoExpert,true);assert.equal(p.platform,"other");assert.equal(p.caseContext,"family context");assert.equal(p.relation,"family");
 const r=textResult({verdict:"Clear message",warmthScore:50,reciprocityScore:50,evidenceLevel:"low",keySignal:"Not enough context",evidence:"A short exchange",alternative:"More context is needed",nextStep:"Ask for clarification",replyDraft:"",recommendedExpert:"work"},p);assert.equal(r.recommendedExpert,"work");
});
