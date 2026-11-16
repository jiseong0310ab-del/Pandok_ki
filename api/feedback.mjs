// SAYNUE voluntary feedback: only allowlisted ratings and categorical metadata.
// Never accept or store conversation text, generated replies, emails, or raw IP.
import { createHash } from "node:crypto";

const HEADERS={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff"};
const GOALS=new Set(["understand","reply","repair","boundary"]);
const LOCALES=new Set(["ko","ja","en","zh-CN","zh-TW"]);
const RATINGS=new Set(["helpful","not_helpful"]);
const seen=new Map();

function result(status,body){return new Response(JSON.stringify(body),{status,headers:HEADERS})}
function sameOrigin(req){
  const origin=req.headers.get("origin");
  if(!origin)return true;
  try {return new URL(origin).origin===new URL(req.url).origin} catch {return false}
}
function allowed(req){
  const ip=(req.headers.get("x-vercel-forwarded-for")||req.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
  const salt=process.env.RATE_LIMIT_SALT||process.env.GEMINI_API_KEY||"saynue-public";
  const hash=createHash("sha256").update(salt+":"+ip).digest("hex").slice(0,24);
  const now=Date.now();
  if(seen.size>1500)seen.clear();
  let item=seen.get(hash);
  if(!item||now-item.started>3600000)item={started:now,count:0};
  item.count++;
  seen.set(hash,item);
  return item.count<=5;
}
async function persistCategoricalFeedback(rating,goal,locale){
  const url=process.env.UPSTASH_REDIS_REST_URL,token=process.env.UPSTASH_REDIS_REST_TOKEN;
  if(!url&&!token){
    // Short-retention Vercel runtime logs ONLY, no persistent analytics database.
    // No free text, raw IP, API key, prompts or generated output.
    console.info("[SAYNUE_FEEDBACK] rating="+rating+" goal="+goal+" locale="+locale);
    return true;
  }
  if(!url||!token)return false;
  const day=new Date().toISOString().slice(0,10);
  const key="saynue:feedback:"+day+":"+rating+":"+goal+":"+locale;
  try{
    const resp=await fetch(url.replace(/\/$/,"")+"/pipeline",{
      method:"POST",
      headers:{"Authorization":"Bearer "+token,"Content-Type":"application/json"},
      body:JSON.stringify([["INCR",key],["EXPIRE",key,90000,"NX"]]),
      signal:AbortSignal.timeout(3000)
    });
    if(!resp.ok)return false;
    const p=await resp.json();
    return Array.isArray(p)&&Number.isFinite(Number(p[0]?.result));
  }catch{return false}
}
export default {async fetch(req){
  if(req.method!=="POST")return result(405,{code:"METHOD_NOT_ALLOWED"});
  if(!sameOrigin(req))return result(403,{code:"ORIGIN_FORBIDDEN"});
  if(!(req.headers.get("content-type")||"").toLowerCase().includes("application/json"))return result(415,{code:"JSON_REQUIRED"});
  if(Number(req.headers.get("content-length")||"0")>512)return result(413,{code:"TOO_LARGE"});
  let raw;
  try{raw=await req.text()}catch{return result(400,{code:"BAD_REQUEST"})}
  if(raw.length>512)return result(413,{code:"TOO_LARGE"});
  let data;
  try{data=JSON.parse(raw)}catch{return result(400,{code:"BAD_REQUEST"})}
  if(!data||typeof data!=="object"||Array.isArray(data))return result(400,{code:"BAD_REQUEST"});
  const keys=Object.keys(data);
  if(keys.length!==3||!keys.every(k=>["rating","goal","locale"].includes(k)))return result(400,{code:"UNEXPECTED_FIELDS"});
  if(!RATINGS.has(data.rating)||!GOALS.has(data.goal)||!LOCALES.has(data.locale))return result(400,{code:"INVALID_FEEDBACK"});
  if(!allowed(req))return result(429,{code:"RATE_LIMITED"});
  if(!(await persistCategoricalFeedback(data.rating,data.goal,data.locale)))return result(503,{code:"FEEDBACK_UNAVAILABLE"});
  return result(200,{ok:true});
}};