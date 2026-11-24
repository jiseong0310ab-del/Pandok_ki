// The real-model evaluation script, exercised against a mocked Gemini so it
// never spends quota in CI.
import test from "node:test";
import assert from "node:assert/strict";
import {inLanguage,scoreCase,selectCases,parseArgs,run} from "../scripts/eval-quality.mjs";
import {cases,safetyCases} from "./quality-cases.mjs";

const SAMPLE={
 ko:{verdict:"지금은 일정이 바빠 보이는 대화예요",keySignal:"다음 주에 다시 보자는 말이 있어요.",alternative:"정말 일이 많았을 수도 있어요.",nextStep:"다음 주에 가볍게 한 번 물어보세요.",replyWhy:"부담 없이 여지를 남겨요.",reply:"좋아, 다음 주에 다시 얘기하자"},
 ja:{verdict:"今は予定が詰まっている様子の会話です",keySignal:"来週また話そうという言葉があります。",alternative:"本当に忙しかった可能性もあります。",nextStep:"来週に一度だけ軽く聞いてみましょう。",replyWhy:"相手に負担をかけずに余地を残せます。",reply:"了解、来週また話そうね"},
 en:{verdict:"This reads as a busy week, not a closed door",keySignal:"They suggested talking again next week.",alternative:"They may simply have had a lot of work.",nextStep:"Check in once, lightly, next week.",replyWhy:"It leaves room without pressure.",reply:"Sounds good, let's talk next week"},
 "zh-CN":{verdict:"这段对话看起来对方最近比较忙",keySignal:"对方说下周再看看安排。",alternative:"也可能真的是工作太多。",nextStep:"下周可以轻松地再问一次。",replyWhy:"这样不会给对方压力。",reply:"好的，那下周再说"},
 "zh-TW":{verdict:"這段對話看起來對方最近比較忙",keySignal:"對方說下週再看看安排。",alternative:"也可能真的是工作太多。",nextStep:"下週可以輕鬆地再問一次。",replyWhy:"這樣不會給對方壓力。",reply:"好的，那下週再說"}
};
function report(locale,extra={}){
 const s=SAMPLE[locale];
 return {verdict:s.verdict,warmthScore:52,reciprocityScore:50,evidenceLevel:"medium",keySignal:s.keySignal,evidence:s.keySignal,alternative:s.alternative,nextStep:s.nextStep,shouldReply:true,safetyConcern:false,replyDraft:s.reply,replyWhy:s.replyWhy,evidenceCards:[],...extra};
}
const byId=id=>[...cases,...safetyCases].find(c=>c.id===id);

test("language detection separates all five locales, including Simplified and Traditional",()=>{
 for(const locale of Object.keys(SAMPLE)){
  for(const other of Object.keys(SAMPLE)){
   const text=Object.values(SAMPLE[other]).join(" ");
   assert.equal(inLanguage(text,locale),locale===other,locale+" vs "+other);
  }
 }
 assert.equal(inLanguage("OK",  "ko"),true,"very short text is not judged");
});

test("scoring passes a sound report and fails each broken contract",()=>{
 const ko=byId("ko01");
 const good=scoreCase(ko,200,report("ko"));
 assert.equal(good.passed,true,JSON.stringify(good.hard));
 assert.equal(scoreCase(ko,502,{error:"x",code:"AI_INVALID_OUTPUT"}).passed,false);
 assert.equal(scoreCase(ko,200,report("ja")).hard.language,false);
 assert.equal(scoreCase(ko,200,report("ko",{replyDraft:"Sounds good, see you then"})).hard.replyLanguage,false);
 assert.equal(scoreCase(ko,200,report("ko",{nextStep:"010-1234-5678로 연락해 보세요"})).hard.noIdentifiers,false);
 assert.equal(scoreCase(ko,200,report("ko",{safetyConcern:true})).hard.safetyFlag,false,"ordinary chats must not raise the crisis card");
 assert.equal(scoreCase(ko,200,report("ko",{evidenceCards:[{quote:"지어낸 문장이에요",reading:"r",otherExplanation:"o",sourceType:"text",screenshotIndex:0}]})).hard.quotesVerbatim,false);

 const refusal=cases.find(c=>c.focus==="respect_refusal"&&c.locale==="ko");
 assert.equal(scoreCase(refusal,200,report("ko")).hard.respectsRefusal,false);
 assert.equal(scoreCase(refusal,200,report("ko",{shouldReply:false,replyDraft:""})).hard.respectsRefusal,true);

 const threat=byId("safe-ko");
 assert.equal(scoreCase(threat,200,report("ko")).passed,false);
 const flagged=scoreCase(threat,200,report("ko",{safetyConcern:true,shouldReply:false,replyDraft:""}));
 assert.equal(flagged.passed,true,JSON.stringify(flagged.hard));
 const selfHarm=byId("safe-en");
 assert.equal(selfHarm.expectNoReply,false);
 assert.equal(scoreCase(selfHarm,200,report("en",{safetyConcern:true})).passed,true,"a caring reply is fine when the other person is at risk");

 const work=cases.find(c=>c.focus==="non_romance"&&c.locale==="en");
 assert.equal(scoreCase(work,200,report("en",{verdict:"There may be a crush here"})).soft.noRomanceFraming,false);
 assert.equal(scoreCase(ko,200,report("ko",{verdict:"확실히 좋아하는 대화예요"})).soft.certainty,false);
});

test("safety cases are synthetic, one per language, and apart from the 30-case corpus",()=>{
 assert.equal(safetyCases.length,5);
 assert.deepEqual(safetyCases.map(c=>c.locale).sort(),["en","ja","ko","zh-CN","zh-TW"]);
 const ids=new Set(cases.map(c=>c.id));
 for(const c of safetyCases){
  assert.ok(!ids.has(c.id),c.id);
  assert.match(c.focus,/^safety_/);
  assert.equal(typeof c.expectNoReply,"boolean");
  assert.doesNotMatch(c.chatText,/@[a-z0-9.-]+\.[a-z]{2,}|\d{3}[-. ]?\d{3,4}[-. ]?\d{4}/i,c.id);
 }
 assert.equal(selectCases().length,35);
 assert.equal(selectCases({noSafety:true}).length,30);
 assert.equal(selectCases({safetyOnly:true}).length,5);
 assert.deepEqual(selectCases({only:["ja06","safe-ko"]}).map(c=>c.id),["ja06","safe-ko"]);
 assert.equal(selectCases({limit:3}).length,3);
});

test("argument parsing rejects unknown options and non-http bases",()=>{
 assert.deepEqual(parseArgs(["--only=ko01, en02","--limit=2","--delay=0","--dry-run"]),{only:["ko01","en02"],limit:2,delay:0,dryRun:true});
 assert.throws(()=>parseArgs(["--model=x"]),/Unknown option/);
 assert.throws(()=>parseArgs(["--base=file:///etc/passwd"]),/http/);
});

async function withGemini(respond,fn){
 const orig=global.fetch,key=process.env.GEMINI_API_KEY,url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;
 process.env.GEMINI_API_KEY="unit-test-only";delete process.env.UPSTASH_REDIS_REST_URL;delete process.env.UPSTASH_REDIS_REST_TOKEN;
 const seen=[];
 global.fetch=async(target,opts)=>{
  assert.match(String(target),/^https:\/\/generativelanguage\.googleapis\.com\//);
  const intro=JSON.parse(opts.body).contents[0].parts[0].text;
  const locale=intro.match(/Output language: ([A-Za-z-]+)/)[1];
  seen.push(locale);
  return respond(locale,intro);
 };
 try{return await fn(seen)}
 finally{
  global.fetch=orig;
  for(const [k,v] of [["GEMINI_API_KEY",key],["UPSTASH_REDIS_REST_URL",url],["UPSTASH_REDIS_REST_TOKEN",token]])if(v===undefined)delete process.env[k];else process.env[k]=v;
 }
}
const gemini=body=>new Response(JSON.stringify({candidates:[{content:{parts:[{text:JSON.stringify(body)}]}}]}),{status:200});

test("a local run scores each case through the real handler without touching the network",async()=>{
 const lines=[];
 const {summary,results}=await withGemini((locale,intro)=>gemini(/User goal: boundary/.test(intro)&&locale==="ko"?report(locale,{safetyConcern:true,shouldReply:false,replyDraft:""}):report(locale)),async seen=>{
  const out=await run({only:["ko01","zhc01","zht01","safe-ko"],delay:0},line=>lines.push(line));
  assert.deepEqual(seen,["ko","zh-CN","zh-TW","ko"]);
  return out;
 });
 assert.equal(summary.run,4);
 assert.equal(summary.passed,4,lines.join("\n"));
 assert.equal(results.find(r=>r.id==="safe-ko").output.safetyConcern,true);
 assert.match(lines.at(-1),/locale/);
});

test("dry runs make no calls and a model rate limit stops the run instead of scoring it",async()=>{
 await withGemini(()=>{throw Error("dry run must not call the model")},async seen=>{
  const lines=[];
  await run({only:["ko01","en01"],dryRun:true},line=>lines.push(line));
  assert.equal(seen.length,0);assert.equal(lines.length,2);
 });
 await withGemini(()=>new Response(JSON.stringify({error:{status:"RESOURCE_EXHAUSTED"}}),{status:429}),async()=>{
  const lines=[];
  const {summary,results}=await run({only:["ko01","en01","ja01"],delay:0},line=>lines.push(line));
  assert.equal(summary.run,0);assert.equal(summary.skipped,3);
  assert.ok(results.every(r=>r.skipped));
  assert.match(lines[0],/rate limited/);
 });
});

test("a local run without a key explains what to set",async()=>{
 const key=process.env.GEMINI_API_KEY;delete process.env.GEMINI_API_KEY;
 try{await assert.rejects(run({only:["ko01"]},()=>{}),/GEMINI_API_KEY/)}
 finally{if(key!==undefined)process.env.GEMINI_API_KEY=key}
});
