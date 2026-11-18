// SAYNUE opt-in aggregate metrics. No chat, draft, screenshot, email, IP or raw identifier is stored.
import {createHmac,timingSafeEqual} from "node:crypto";
export const EVENTS=Object.freeze(["visit","analysis_started","analysis_completed","followup_started","followup_completed","library_saved","simulation_started","simulation_completed","plans_interest"]);
const eventSet=new Set(EVENTS);
const RETENTION_SECONDS=45*86400,MAX_DAYS=30;
const headers={"content-type":"application/json; charset=utf-8","cache-control":"no-store, max-age=0","x-content-type-options":"nosniff","referrer-policy":"no-referrer","x-robots-tag":"noindex"};
const respond=(status,value)=>new Response(JSON.stringify(value),{status,headers});
const dayString=(date)=>date.toISOString().slice(0,10);
const dayMillis=(value)=>Date.parse(value+"T00:00:00.000Z");
const dayDiff=(from,to)=>Math.round((dayMillis(to)-dayMillis(from))/86400000);
const shiftDay=(value,n)=>dayString(new Date(dayMillis(value)+n*86400000));
function originAllowed(request){
 const origin=request.headers.get("origin");
 if(!origin)return true;
 try{return new URL(origin).origin===new URL(request.url).origin}catch{return false}
}
export function parseMetricEvent(raw,now=new Date()){
 if(!raw||typeof raw!=="object"||Array.isArray(raw))return null;
 if(Object.keys(raw).length!==3||Object.keys(raw).some(k=>!["event","visitorId","firstDay"].includes(k)))return null;
 if(!eventSet.has(raw.event)||typeof raw.visitorId!=="string"||!/^[a-f0-9]{32}$/.test(raw.visitorId))return null;
 if(typeof raw.firstDay!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(raw.firstDay))return null;
 const time=dayMillis(raw.firstDay);
 if(!Number.isFinite(time)||dayString(new Date(time))!==raw.firstDay)return null;
 const offset=dayDiff(raw.firstDay,dayString(now));
 if(offset<0||offset>=MAX_DAYS)return null;
 return {event:raw.event,visitorId:raw.visitorId,firstDay:raw.firstDay,ageDays:offset};
}
function config(){
 const url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;
 if(!url||!token||!/^https:\/\//i.test(url))return null;
 return {url:url.replace(/\/$/,""),token};
}
async function pipeline(commands){
 const cfg=config();
 if(!cfg)throw Error("NOT_CONFIGURED");
 const response=await fetch(cfg.url+"/pipeline",{
  method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+cfg.token},
  body:JSON.stringify(commands),signal:AbortSignal.timeout(4800)
 });
 if(!response.ok)throw Error("STORAGE_UNAVAILABLE");
 const results=await response.json();
 if(!Array.isArray(results)||results.length!==commands.length||results.some(r=>r?.error))throw Error("STORAGE_UNAVAILABLE");
 return results.map(r=>r.result);
}
function hashedVisitor(id){
 const secret=process.env.SAYNUE_ANALYTICS_SALT||process.env.RATE_LIMIT_SALT||process.env.GEMINI_API_KEY;
 if(!secret||secret.length<12)throw Error("NOT_CONFIGURED");
 return createHmac("sha256",secret).update(id).digest("hex").slice(0,40);
}
async function recordEvent(metric,now=new Date()){
 const visitor=hashedVisitor(metric.visitorId);
 const day=dayString(now);
 const bucket="saynue:usage:v1:",prefix=bucket+day+":";
 const budget=bucket+"budget:"+day+":"+visitor;
 const [count]=await pipeline([["INCR",budget],["EXPIRE",budget,86400,"NX"]]).then(x=>[x[0]]);
 if(!Number.isFinite(Number(count))||Number(count)>65)return {limited:true};
 const commands=[
  ["INCR",prefix+"count:"+metric.event],
  ["EXPIRE",prefix+"count:"+metric.event,RETENTION_SECONDS,"NX"],
  ["PFADD",prefix+"unique:"+metric.event,visitor],
  ["EXPIRE",prefix+"unique:"+metric.event,RETENTION_SECONDS,"NX"]
 ];
 if(metric.event==="visit"&&[0,1,7].includes(metric.ageDays)){
  const key=bucket+"cohort:"+metric.firstDay+":"+(metric.ageDays===0?"base":"d"+metric.ageDays);
  commands.push(["PFADD",key,visitor],["EXPIRE",key,RETENTION_SECONDS,"NX"]);
 }
 await pipeline(commands);
 return {limited:false};
}
function tokenValid(received){
 const expected=process.env.SAYNUE_ANALYTICS_READ_TOKEN;
 if(!expected||expected.length<24||typeof received!=="string")return false;
 const a=Buffer.from(expected),b=Buffer.from(received);
 return a.length===b.length&&timingSafeEqual(a,b);
}
export function reportCommands(now=new Date(),days=14){
 const today=dayString(now),dates=Array.from({length:days},(_,i)=>shiftDay(today,-days+1+i));
 const commands=[],pointer={daily:[],totals:{},cohorts:[]};
 for(const date of dates){
  const entry={date,counts:{},uniqueVisits:null};
  for(const event of EVENTS){entry.counts[event]=commands.length;commands.push(["GET","saynue:usage:v1:"+date+":count:"+event])}
  entry.uniqueVisits=commands.length;commands.push(["PFCOUNT","saynue:usage:v1:"+date+":unique:visit"]);
  pointer.daily.push(entry);
 }
 for(const event of ["visit","analysis_completed","followup_completed","simulation_completed","plans_interest"]){
  pointer.totals[event]=commands.length;
  commands.push(["PFCOUNT",...dates.map(d=>"saynue:usage:v1:"+d+":unique:"+event)]);
 }
 // Only mature cohorts: day 1 or day 7 has passed.
 for(let lag=1;lag<=Math.min(days,15);lag++){
  const cohort=shiftDay(today,-lag),entry={date:cohort,base:commands.length,d1:null,d7:null};
  commands.push(["PFCOUNT","saynue:usage:v1:cohort:"+cohort+":base"]);
  entry.d1=commands.length;commands.push(["PFCOUNT","saynue:usage:v1:cohort:"+cohort+":d1"]);
  if(lag>=7){entry.d7=commands.length;commands.push(["PFCOUNT","saynue:usage:v1:cohort:"+cohort+":d7"])}
  pointer.cohorts.push(entry);
 }
 return {commands,pointer};
}
export function projectReport(results,pointer){
 const n=i=>Math.max(0,Math.round(Number(results[i])||0));
 const daily=pointer.daily.map(day=>({date:day.date,uniqueVisitors:n(day.uniqueVisits),events:Object.fromEntries(EVENTS.map(event=>[event,n(day.counts[event])]))}));
 const unique=Object.fromEntries(Object.entries(pointer.totals).map(([e,i])=>[e,n(i)]));
 const cohorts=pointer.cohorts.map(c=>({date:c.date,firstVisits:n(c.base),day1Visitors:n(c.d1),day7Visitors:c.d7===null?null:n(c.d7)}));
 return {days:daily.length,daily,unique,cohorts,notes:"Only opted-in pseudonymous browser IDs. Counts are approximate for unique visitors. A plan click is NOT a purchase or revenue."};
}
async function readReport(days){
 const {commands,pointer}=reportCommands(new Date(),days);
 return projectReport(await pipeline(commands),pointer);
}
export default {async fetch(req){
 if(!originAllowed(req))return respond(403,{code:"ORIGIN_FORBIDDEN"});
 if(req.method==="POST"){
  if(!(req.headers.get("content-type")||"").toLowerCase().includes("application/json"))return respond(415,{code:"JSON_REQUIRED"});
  if(Number(req.headers.get("content-length")||0)>400)return respond(413,{code:"TOO_LARGE"});
  let raw;try{raw=await req.text();if(raw.length>400)return respond(413,{code:"TOO_LARGE"})}catch{return respond(400,{code:"INVALID_INPUT"})}
  let metric;try{metric=parseMetricEvent(JSON.parse(raw))}catch{}
  if(!metric)return respond(400,{code:"INVALID_EVENT"});
  try{const result=await recordEvent(metric);return result.limited?respond(429,{code:"RATE_LIMITED"}):respond(200,{ok:true})}
  catch{return respond(503,{code:"METRICS_UNAVAILABLE"})}
 }
 if(req.method==="GET"){
  if(!process.env.SAYNUE_ANALYTICS_READ_TOKEN||process.env.SAYNUE_ANALYTICS_READ_TOKEN.length<24)return respond(503,{code:"READER_NOT_CONFIGURED"});
  const authorization=req.headers.get("authorization")||"";
  if(!authorization.startsWith("Bearer ")||!tokenValid(authorization.slice(7)))return respond(401,{code:"UNAUTHORIZED"});
  const url=new URL(req.url),arg=url.searchParams.get("days")||"14";
  if(!["7","14","30"].includes(arg)||url.searchParams.size>1)return respond(400,{code:"INVALID_DAYS"});
  try{return respond(200,await readReport(Number(arg)))}catch{return respond(503,{code:"METRICS_UNAVAILABLE"})}
 }
 return respond(405,{code:"METHOD_NOT_ALLOWED"});
}};
