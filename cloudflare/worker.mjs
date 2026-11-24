import route0 from "../api/analyze.mjs";
import route1 from "../api/feedback.mjs";
import route2 from "../api/metrics.mjs";
import route3 from "../api/simulate.mjs";
import route4 from "../api/auth/link-session.mjs";
import route5 from "../api/auth/logout.mjs";
import route6 from "../api/auth/start.mjs";
import route7 from "../api/auth/state.mjs";
import route8 from "../api/auth/verify.mjs";
import route9 from "../api/plus/checkout.mjs";
import route10 from "../api/plus/report.mjs";
import route11 from "../api/webhooks/paddle.mjs";
import coach from "../api/coach.mjs";
import {configuredOrigin} from "../lib/site-origin.mjs";
import {hashedClient} from "../lib/server-guard.mjs";
const ROUTES=new Map([
 ["/api/analyze",route0],
 ["/api/feedback",route1],
 ["/api/metrics",route2],
 ["/api/simulate",route3],
 ["/api/auth/link-session",route4],
 ["/api/auth/logout",route5],
 ["/api/auth/start",route6],
 ["/api/auth/state",route7],
 ["/api/auth/verify",route8],
 ["/api/plus/checkout",route9],
 ["/api/plus/report",route10],
 ["/api/webhooks/paddle",route11],
 ["/api/coach",coach]
]);
function reply(status,code){
 return new Response(JSON.stringify({code}),{status,headers:{"content-type":"application/json; charset=utf-8","cache-control":"no-store","x-content-type-options":"nosniff","x-robots-tag":"noindex"}});
}
export function normalizeClient(request){
 const headers=new Headers(request.headers);
 const ip=headers.get("cf-connecting-ip");
 // Existing handlers expect Vercel's trusted client header. Never preserve
 // client-supplied forwarding headers when running behind Cloudflare.
 headers.delete("x-forwarded-for");
 headers.delete("x-vercel-forwarded-for");
 if(ip)headers.set("x-vercel-forwarded-for",ip);
 return new Request(request,{headers});
}
// Routes that spend Gemini quota get a tight per-IP burst limit; other API
// routes a looser one. Paddle webhooks are exempt (they come from Paddle).
// Missing bindings (local tests, other hosts) or a limiter outage never block
// requests: the APIs' own per-day limits still apply.
const AI_ROUTES=new Set(["/api/analyze","/api/coach","/api/simulate","/api/plus/report"]);
export async function burstLimited(request,env,pathname){
 if(pathname.startsWith("/api/webhooks/"))return false;
 const ip=request.headers.get("cf-connecting-ip");
 const limiter=AI_ROUTES.has(pathname)?env?.AI_BURST_LIMITER:env?.API_BURST_LIMITER;
 if(!ip||!limiter||typeof limiter.limit!=="function")return false;
 // Count under a salted hash, like the per-day limits: the raw IP never
 // becomes a limiter key.
 // Hash from the header alone: copying the Request here would take over its
 // body and break the route that reads it next.
 const client={headers:new Headers([["x-vercel-forwarded-for",ip]])};
 try{const {success}=await limiter.limit({key:hashedClient(client,"burst-limit",32,env)});return success===false}
 catch{return false}
}
export default {async fetch(request,env){
 const url=new URL(request.url);
 if(url.pathname==="/"){
  if(!["GET","HEAD"].includes(request.method))return reply(405,"METHOD_NOT_ALLOWED");
  url.pathname="/index.html";
  return env.ASSETS.fetch(new Request(url,request));
 }
 if(url.pathname==="/api"||url.pathname.startsWith("/api/")){
  const route=ROUTES.get(url.pathname);
  if(!route)return reply(404,"NOT_FOUND");
  // Protect the staging deployment from sending login links or checkout
  // callbacks to the old host. Configure the actual HTTPS origin first.
  if(/^\/api\/(?:auth|plus|webhooks)\//.test(url.pathname)){
   if(configuredOrigin(env.SAYNUE_PUBLIC_ORIGIN)!==url.origin)return reply(503,"HOST_NOT_CONFIGURED");
  }
  if(await burstLimited(request,env,url.pathname)){
   const limited=reply(429,"RATE_LIMITED");limited.headers.set("retry-after","60");return limited;
  }
  try{return await route.fetch(normalizeClient(request))}
  catch{return reply(500,"INTERNAL_ERROR")}
 }
 return env.ASSETS.fetch(request);
}};
