// Shared server-side guards for SAYNUE functions. No dependencies, no storage.
// Keep these helpers small: they are imported by every public API route.
import {createHash,createHmac} from "node:crypto";

export const GEMINI_MODELS=Object.freeze(["gemini-3.5-flash-lite","gemini-3.1-flash-lite","gemini-3.8-flash"]);
const DEFAULT_MODEL="gemini-3.5-flash-lite";

// Primary model from GEMINI_MODEL (allowlisted) plus an independent fallback.
export function pickGeminiModels(env=process.env){
 const primary=GEMINI_MODELS.includes(env.GEMINI_MODEL)?env.GEMINI_MODEL:DEFAULT_MODEL;
 const fallback=primary==="gemini-3.1-flash-lite"?"gemini-3.5-flash-lite":"gemini-3.1-flash-lite";
 return {primary,fallback};
}

// Browsers always send Origin on cross-site POSTs; a missing Origin means a
// non-browser client, which these unauthenticated routes rate-limit instead.
export function sameOriginOrAbsent(request){
 const origin=request.headers.get("origin");
 if(!origin)return true;
 try{return new URL(origin).origin===new URL(request.url).origin}catch(_){return false}
}

// Per-purpose secret. An explicitly configured value wins; otherwise derive a
// separate key with HMAC so the Gemini API key is never reused verbatim as a
// salt or MAC key. Returns null when nothing suitable is configured.
export function serverSecret(purpose,explicitNames=[],env=process.env){
 for(const name of explicitNames){
  const value=env[name];
  if(typeof value==="string"&&value.length>=12)return value;
 }
 const root=typeof env.RATE_LIMIT_SALT==="string"&&env.RATE_LIMIT_SALT.length>=12?env.RATE_LIMIT_SALT:env.GEMINI_API_KEY;
 if(typeof root!=="string"||root.length<12)return null;
 return createHmac("sha256",root).update("saynue:"+purpose+":v1").digest("hex");
}

export function clientIp(request){
 return (request.headers.get("x-vercel-forwarded-for")||request.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
}

// Pseudonymous client key: never store or log the raw IP address.
export function hashedClient(request,purpose,length=28,env=process.env){
 const salt=serverSecret(purpose,["RATE_LIMIT_SALT"],env)||"saynue-development-only";
 return createHash("sha256").update(salt+":"+clientIp(request)).digest("hex").slice(0,length);
}

// Bounded per-instance limiter. Not distributed: a cheap first line of defence
// in front of Redis or Gemini, never the only production control.
export function createMemoryLimiter({max,windowMs,maxKeys=2500}){
 const hits=new Map();
 return function allow(key,now=Date.now()){
  if(hits.size>maxKeys)hits.clear();
  let entry=hits.get(key);
  if(!entry||now-entry.start>windowMs){entry={start:now,count:0};hits.set(key,entry)}
  entry.count++;
  return entry.count<=max;
 };
}

// Contact identifiers in AI output. Calendar dates and clock times are common
// in legitimate advice ("2026-11-24 10:30") and must not look like phones.
const EMAIL=/\b[\w.+-]+@[\w.-]+\.[a-z]{2,}\b/gi;
const LINK=/(?:https?:\/\/|www\.)[^\s<>]+/gi;
const NUMBER_RUN=/\+?\d[\d ().-]{7,}\d/g;
const DATE=/(?<!\d)(?:(?:19|20)\d{2}[-./]\d{1,2}[-./]\d{1,2}|\d{1,2}[-./]\d{1,2}[-./](?:19|20)\d{2})(?!\d)/g;
function phoneLike(run){
 const digits=(run.replace(DATE," ").match(/\d/g)||[]).length;
 return digits>=9;
}
export function hasContactIdentifier(text){
 if(typeof text!=="string"||!text)return false;
 if(new RegExp(EMAIL.source,"i").test(text)||new RegExp(LINK.source,"i").test(text))return true;
 return (text.match(NUMBER_RUN)||[]).some(phoneLike);
}
export function maskContactIdentifiers(text){
 if(typeof text!=="string")return "";
 return text.replace(EMAIL,"[email]").replace(LINK,"[link]").replace(NUMBER_RUN,run=>phoneLike(run)?"[phone]":run);
}

// JSON-serialize a request whose image payloads are already validated base64
// (only A-Z a-z 0-9 + / =, so JSON needs no escaping). The caller puts
// imageSlot(i) where image i belongs; the data is spliced in afterwards, so
// JSON.stringify does not re-scan megabytes of base64. Output is byte-for-byte
// what JSON.stringify would produce. This keeps screenshot requests inside
// tight per-request CPU limits such as Cloudflare Workers' free plan.
export function createImageSlots(){
 const nonce="\u0000saynue-image-"+(globalThis.crypto?.randomUUID?.()||String(Math.random()).slice(2))+"-";
 return {slot:i=>nonce+i,stringify(value,datas){
  const json=JSON.stringify(value);
  const marker=JSON.stringify(nonce).slice(1,-1);
  const pieces=json.split(marker);
  if(pieces.length!==datas.length+1)throw Error("IMAGE_SLOT_MISMATCH");
  let out=pieces[0];
  for(let i=1;i<pieces.length;i++){
   const end=pieces[i].indexOf("\"");
   const index=Number(pieces[i].slice(0,end));
   const data=datas[index];
   if(end<1||index!==i-1||typeof data!=="string"||data.includes("\"")||data.includes("\\"))throw Error("IMAGE_SLOT_MISMATCH");
   out+=data+pieces[i].slice(end);
  }
  return out;
 }};
}

