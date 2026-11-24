import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import {parseInput} from "../api/analyze.mjs";
import metrics,{EVENTS,parseMetricEvent,reportCommands,projectReport} from "../api/metrics.mjs";

const homepage=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const styleSource=fs.readFileSync(new URL("../assets/reply-style.js",import.meta.url),"utf8");
const metricsSource=fs.readFileSync(new URL("../assets/usage-metrics.js",import.meta.url),"utf8");
const dashboard=fs.readFileSync(new URL("../metrics.html",import.meta.url),"utf8");
function storage(){
 const data=new Map();
 return {data,getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,String(value)),removeItem:key=>data.delete(key)};
}
function browser(script,environment={}){
 const ctx={...environment};
 vm.runInNewContext(script,ctx);
 return ctx;
}
const analyticDate=new Date("2026-11-18T12:00:00Z");

test("user tracking defaults off, requires explicit opt-in, and transmits only allowlisted events",async()=>{
 const store=storage(),sent=[];
 const b=browser(metricsSource,{localStorage:store,crypto:{getRandomValues(bytes){bytes.fill(17);return bytes}}});
 const counter=b.SaynueUsageMetrics.create({storage:store,now:()=>analyticDate,cryptoObj:b.crypto,fetchFn:(url,opts)=>{sent.push({url,opts});return Promise.resolve({ok:true})}});
 assert.equal(counter.enabled(),false);
 assert.equal(store.data.size,0);
 assert.equal(counter.record("visit"),false);
 assert.equal(sent.length,0);
 assert.equal(counter.enable(),true);
 assert.equal(counter.enabled(),true);
 assert.equal(counter.record("visit"),true);
 assert.equal(counter.record("analysis_completed"),true);
 assert.equal(counter.record("non_existent_event"),false);
 assert.equal(sent.length,2);
 for(const e of sent){
  const data=JSON.parse(e.opts.body);
  assert.deepEqual(Object.keys(data).sort(),["event","firstDay","visitorId"]);
  assert.match(data.visitorId,/^[a-f0-9]{32}$/);
  assert.equal(e.url,"/api/metrics");
  assert.doesNotMatch(e.opts.body,/chatText|replyDraft|imageBase64|locale|persona|email/);
 }
 counter.clear();
 assert.equal(counter.enabled(),false);
 assert.equal(store.data.size,0);
 assert.equal(counter.record("visit"),false);
});
test("failed metrics delivery is disclosed without transmitting any private text",async()=>{
 const store=storage(),delivery=[];
 const obj=browser(metricsSource,{localStorage:store,crypto:{getRandomValues(bytes){bytes.fill(42);return bytes}}});
 const meter=obj.SaynueUsageMetrics.create({storage:store,now:()=>analyticDate,cryptoObj:obj.crypto,
  onDelivery:ok=>delivery.push(ok),fetchFn:async()=>({ok:false,status:503})});
 assert.equal(meter.enable(),true);
 assert.equal(meter.record("visit"),true);
 await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(delivery,[false]);
});
test("style preferences store only enums, require an explicit save, and reject malformed data",()=>{
 const store=storage(),b=browser(styleSource,{localStorage:store}),style=b.SaynueReplyStyle.create({storage:store});
 assert.equal(style.load(),null);
 assert.equal(store.data.size,0);
 assert.equal(style.save({tone:"warm",length:"short",emoji:"subtle"}),true);
 assert.equal(style.load().tone,"warm");
 assert.equal(style.load().length,"short");
 assert.equal(style.save({tone:"warm",length:"long raw example data",emoji:"subtle"}),false);
 assert.doesNotMatch(store.getItem("saynue:reply-style:v1"),/chat|example|screenshot/);
 assert.equal(style.clear(),true);
 assert.equal(style.load(),null);
 const blocked=b.SaynueReplyStyle.create({storage:{getItem(){throw Error("deny")},setItem(){throw Error("deny")},removeItem(){throw Error("deny")}}});
 assert.equal(blocked.save({tone:"natural",length:"normal",emoji:"none"}),false);
});
test("free analysis accepts bounded style enums while legacy callers get natural defaults",()=>{
 const base={platform:"line",relation:"talking",goal:"reply",locale:"ja",chatText:"Me: Can you come on Friday? Them: Let me check my schedule."};
 const old=parseInput(base);
 assert.equal(old.replyLength,"normal");assert.equal(old.replyEmoji,"none");
 assert.equal(parseInput({...base,replyTone:"direct",replyLength:"short",replyEmoji:"subtle"}).replyLength,"short");
 for(const override of [{replyLength:"unbounded"},{replyEmoji:"always 10"},{replyTone:"secret"}])assert.equal(parseInput({...base,...override}),null);
});
test("analytics endpoint rejects unconsented-shaped payloads and malformed dates",()=>{
 const valid={event:"analysis_completed",visitorId:"a".repeat(32),firstDay:"2026-11-18"};
 assert.equal(parseMetricEvent(valid,analyticDate).event,valid.event);
 assert.equal(parseMetricEvent({...valid,chatText:"sensitive"},analyticDate),null);
 assert.equal(parseMetricEvent({...valid,visitorId:"user@example.com"},analyticDate),null);
 assert.equal(parseMetricEvent({...valid,event:"payment_completed"},analyticDate),null);
 assert.equal(parseMetricEvent({...valid,firstDay:"2026-11-19"},analyticDate),null);
 assert.equal(parseMetricEvent({...valid,firstDay:"2026-10-15"},analyticDate),null);
 assert.equal(parseMetricEvent({...valid,firstDay:"2026-02-29"},new Date("2026-03-02T00:00:00Z")),null);
});
test("retention report includes mature D+1 and D+7 cohorts, not future D+7 counts",()=>{
 const {commands,pointer}=reportCommands(analyticDate,14);
 assert.ok(commands.length>100);
 assert.equal(pointer.daily.length,14);
 assert.equal(pointer.cohorts[0].d7,null);
 assert.notEqual(pointer.cohorts[6].d7,null);
 const report=projectReport(commands.map(()=>({result:0})),pointer);
 assert.equal(report.daily.length,14);
 assert.equal(report.unique.analysis_completed,0);
 assert.equal(report.cohorts[0].day7Visitors,null);
});
test("aggregate endpoint uses HMAC pseudonyms, locked read token and does not store source contents",async()=>{
 const oldFetch=global.fetch;
 const env=["UPSTASH_REDIS_REST_URL","UPSTASH_REDIS_REST_TOKEN","SAYNUE_ANALYTICS_SALT","SAYNUE_ANALYTICS_READ_TOKEN"];
 const previous=Object.fromEntries(env.map(k=>[k,process.env[k]]));
 process.env.UPSTASH_REDIS_REST_URL="https://redis.example.test";
 process.env.UPSTASH_REDIS_REST_TOKEN="fake-token";
 process.env.SAYNUE_ANALYTICS_SALT="long-test-secret-123456789";
 process.env.SAYNUE_ANALYTICS_READ_TOKEN="the-long-owner-secret-for-tests";
 const captured=[];
 global.fetch=async(url,options)=>{
  assert.equal(url,"https://redis.example.test/pipeline");
  const cmds=JSON.parse(options.body);captured.push(cmds);
  return new Response(JSON.stringify(cmds.map(command=>({result:command[0]==="INCR"?1:command[0]==="PFADD"?1:0}))),{status:200});
 };
 try{
  const body={event:"visit",visitorId:"f".repeat(32),firstDay:new Date().toISOString().slice(0,10)};
  const req=new Request("https://saynue.test/api/metrics",{method:"POST",headers:{"content-type":"application/json","origin":"https://saynue.test"},body:JSON.stringify(body)});
  const write=await metrics.fetch(req);
  assert.equal(write.status,200);
  const cmds=JSON.stringify(captured);
  assert.doesNotMatch(cmds,/ffffffffffffffffffffffffffffffff/);
  assert.doesNotMatch(cmds,/chatText|replyDraft|screenshots/i);
  const denied=await metrics.fetch(new Request("https://saynue.test/api/metrics?days=7",{headers:{authorization:"Bearer wrong"}}));
  assert.equal(denied.status,401);
  const get=await metrics.fetch(new Request("https://saynue.test/api/metrics?days=7",{headers:{authorization:"Bearer the-long-owner-secret-for-tests"}}));
  assert.equal(get.status,200);
  const result=await get.json();
  assert.equal(result.daily.length,7);
  assert.ok(EVENTS.includes("plans_interest"));
  assert.equal(Object.hasOwn(result.unique,"payment_completed"),false);
  const invalid=await metrics.fetch(new Request("https://evil.test/api/metrics",{method:"POST",headers:{"origin":"https://attacker.test","content-type":"application/json"},body:JSON.stringify(body)}));
  assert.equal(invalid.status,403);
 }finally{
  global.fetch=oldFetch;
  for(const k of env)if(previous[k]===undefined)delete process.env[k];else process.env[k]=previous[k];
 }
});
test("mobile UI keeps extra settings collapsed and analytics opt-in independent from Gemini consent",()=>{
 assert.match(homepage,/id="replyLengths"/);assert.match(homepage,/id="replyEmojis"/);
 assert.match(homepage,/#replyLengths \[data-reply-length\]/);
 assert.match(homepage,/#replyEmojis \[data-reply-emoji\]/);
 assert.match(homepage,/id="styleSave"/);assert.match(homepage,/id="styleClear"/);
 assert.match(homepage,/<details class="metrics-consent"/);
 assert.match(homepage,/id="metricsOptin"/);
 assert.match(homepage,/id="consent"/);
 assert.match(homepage,/replyLength:replyLength,replyEmoji:replyEmoji/);
 assert.match(homepage,/usageEvent\("analysis_completed"\)/);
 assert.match(homepage,/usageEvent\("followup_completed"\)/);
 assert.match(homepage,/usageEvent\("plans_interest"\)/);
 assert.match(homepage,/assets\/usage-metrics\.js/);
 const script=homepage.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 const begin=script.indexOf("const T=")+8,end=script.indexOf("const API_ERRORS",begin);
 const T=new Function("return ("+script.slice(begin,end).trim().replace(/;\s*$/,"")+")")();
 for(const lang of ["ko","ja","en","zh-CN","zh-TW"])for(const key of ["styleLengthTitle","styleEmojiTitle","styleSave","metricsOptin","metricsNote"])assert.equal(typeof T[lang][key],"string",lang+":"+key);
 new Function(script);
});
test("owner-only metrics page never stores a read token",()=>{
 assert.match(dashboard,/noindex,nofollow/);
 assert.match(dashboard,/type="password"/);
 assert.match(dashboard,/Authorization/);
 assert.doesNotMatch(dashboard,/localStorage|sessionStorage|_ptxn=/);
});

 test("copy and failure events carry only categorical signals, and sharing excludes report text",()=>{
 assert.ok(EVENTS.includes("reply_copied"));assert.ok(EVENTS.includes("analysis_failed"));
 assert.match(homepage,/usageEvent\("reply_copied"\)/);assert.match(homepage,/usageEvent\("analysis_failed"\)/);
 const share=homepage.split('$("share").addEventListener')[1].split("\n")[0];
 assert.doesNotMatch(share,/lastResult\.verdict|lastResult\.warmthScore/);
 });
