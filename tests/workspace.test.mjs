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

import {parseReplyLanguage,languageInstruction,withMessageLanguage,addMessageLanguage} from "../lib/message-language.mjs";
import {parseSimulationInput} from "../api/simulate.mjs";
test("report language and reply language are independent, with backward compatibility",()=>{
 const v=parseInput({locale:"ko",replyLanguage:"ja",chatText:"今週は忙しいけど、また今度会おうね。"});
 assert.equal(v.locale,"ko");assert.equal(v.replyLanguage,"ja");assert.match(languageInstruction(v),/explanations must be in ko/);assert.match(languageInstruction(v),/requested language ja/);
 assert.equal(parseInput({locale:"ko",replyLanguage:"invalid",chatText:"This is long enough for the test"}),null);
 assert.equal(parseReplyLanguage(undefined,"ko"),"ko");assert.equal(parseReplyLanguage("auto","ko"),"auto");
 assert.equal(parseCoachInput({...base,replyLanguage:"ja"}).replyLanguage,"ja");
 assert.equal(parseSimulationInput({locale:"ko",replyLanguage:"ja",persona:"standard",relation:"unknown",draft:"また会いましょう",contextSummary:"상대와 다시 만날 날짜를 정하고 싶음"}).replyLanguage,"ja");
 const schema=withMessageLanguage({properties:{},required:[]});assert.ok(schema.required.includes("replyMeaning"));
 const out=addMessageLanguage({replyDraft:"また会いましょう",shouldReply:true},{replyLanguage:"ja",replyMeaning:"다시 만나요"},{locale:"ko",replyLanguage:"auto"},"replyDraft");
 assert.equal(out.replyLanguage,"ja");assert.equal(out.replyMeaning,"다시 만나요");
 const blocked=addMessageLanguage({replyDraft:"",shouldReply:false},{replyLanguage:"ja",replyMeaning:"연락해 봐"},{locale:"ko",replyLanguage:"ja"},"replyDraft");assert.equal(blocked.replyMeaning,"");
});
