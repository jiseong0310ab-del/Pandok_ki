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
import {configuredOrigin} from "../lib/site-origin.mjs";
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
 ["/api/webhooks/paddle",route11]
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
  try{return await route.fetch(normalizeClient(request))}
  catch{return reply(500,"INTERNAL_ERROR")}
 }
 return env.ASSETS.fetch(request);
}};
