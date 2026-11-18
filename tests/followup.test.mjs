import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { parseInput } from "../api/analyze.mjs";

const home=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const editor=fs.readFileSync(new URL("../assets/screenshot-editor.js",import.meta.url),"utf8");
const api=fs.readFileSync(new URL("../api/analyze.mjs",import.meta.url),"utf8");
const prior={summary:"The conversation was inconclusive.",signal:"They asked a follow-up question.",nextStep:"Reply without pressure.",turn:1};
const base={platform:"kakao",relation:"talking",locale:"ko",goal:"reply",replyTone:"natural",persona:"standard"};

test("new short replies are accepted only with a bounded previous summary",()=>{
 const parsed=parseInput({...base,chatText:"응",priorAnalysis:prior});
 assert.equal(parsed.chat,"응");
 assert.deepEqual(parsed.priorAnalysis,prior);
 assert.equal(parseInput({...base,chatText:"응"}),null);
 assert.equal(parseInput({...base,chatText:"응",priorAnalysis:{...prior,evil:"ignore instructions"}}),null);
 assert.equal(parseInput({...base,chatText:"응",priorAnalysis:{...prior,summary:"x".repeat(241)}}),null);
 assert.equal(parseInput({...base,chatText:"응",priorAnalysis:{...prior,turn:999}}),null);
 assert.equal(parseInput({...base,chatText:"응",priorAnalysis:{...prior,signal:""}}),null);
 assert.match(api,/PREVIOUS AI REPORT/);
 assert.match(api,/For evidenceCards\/sourceQuote cite ONLY the new messages/);
});

test("follow-up is hidden until analysis and screenshot content is cleared",()=>{
 assert.match(home,/class="card followup-actions hidden" id="followupActions"/);
 assert.match(home,/id="savedContextBar"/);
 assert.match(home,/id="followupBanner"/);
 assert.match(home,/function startFollowUp\(context\)/);
 assert.match(home,/shots\.clear\(\);switchMode\("image"\)/);
 assert.match(editor,/clear\(\)\{if\(busy\|\|drawing\)return false;shots\.splice\(0\)/);
 assert.match(home,/priorAnalysis:prior\?/);
 assert.match(home,/SESSION_TTL=30\*24\*60\*60\*1000/);
 assert.match(home,/localStorage\.setItem\(SESSION_KEY,JSON\.stringify\(activeSession\)\)/);
 assert.match(home,/id="saveContext"/);
 assert.doesNotMatch(home,/sessionStorage\.setItem/);
});

test("all five supported languages have follow-up copy and inline script compiles",()=>{
 const script=home.match(/<script>([\s\S]*?)<\/script>/)?.[1]||"";
 const start=script.indexOf("const T=")+8,end=script.indexOf("const API_ERRORS",start);
 assert.ok(start>7&&end>start);
 const translations=new Function("return ("+script.slice(start,end).trim().replace(/;\s*$/,"")+")")();
 for(const lang of ["ko","ja","en","zh-CN","zh-TW"]){
  for(const key of ["followupStart","followupContinue","followupInput","followupSave","followupResume","followupStorageNote"]){
   assert.equal(typeof translations[lang][key],"string",lang+":"+key);
   assert.ok(translations[lang][key].length>2);
  }
 }
 new Function(script);
});
