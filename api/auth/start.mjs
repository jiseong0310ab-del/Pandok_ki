import {checkSameOrigin,validEmail,sendEmailCode} from "../../lib/saynue-auth.mjs";
import {supabaseAuthConfig} from "../../lib/saynue-storage.mjs";
import {createHash} from "node:crypto";
import {createMemoryLimiter,hashedClient,serverSecret} from "../../lib/server-guard.mjs";
// Cheap first-line limits in front of Supabase's own email limits, so one
// client cannot use this endpoint to flood inboxes or burn the sending quota.
// Per instance only; keys are salted hashes, never raw IPs or addresses.
const perClient=createMemoryLimiter({max:6,windowMs:3600000});
const perAddress=createMemoryLimiter({max:3,windowMs:3600000});
const addressKey=email=>createHash("sha256").update((serverSecret("auth-email")||"saynue-development-only")+":"+email.toLowerCase().trim()).digest("hex").slice(0,32);
const headers={"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const reply=(code,status)=>new Response(JSON.stringify({code}),{status,headers});
export default {async fetch(request){
 if(request.method!=="POST")return reply("METHOD_NOT_ALLOWED",405);
 if(!checkSameOrigin(request))return reply("FORBIDDEN",403);
 if(!supabaseAuthConfig())return reply("AUTH_NOT_CONFIGURED",503);
 if(!String(request.headers.get("content-type")||"").startsWith("application/json"))return reply("BAD_MEDIA_TYPE",415);
 if(Number(request.headers.get("content-length")||0)>1024)return reply("BAD_INPUT",400);
 let input;
 try{const raw=await request.text();if(raw.length>1024)throw Error();input=JSON.parse(raw)}catch(_){return reply("BAD_INPUT",400)}
 if(!validEmail(input?.email))return reply("BAD_INPUT",400);
 if(!perClient(hashedClient(request,"auth-start",24))||!perAddress(addressKey(input.email)))return reply("EMAIL_RATE_LIMIT",429);
 try{
  await sendEmailCode(input.email);
  // Same response for known/unknown addresses; never expose accounts.
  return reply("CODE_REQUESTED",200);
 }catch(error){
  // Stable, safe public error categories; do not leak whether a user exists.
  if(error?.message==="AUTH_EMAIL_RATE_LIMIT")return reply("EMAIL_RATE_LIMIT",429);
  if(error?.message==="AUTH_EMAIL_NOT_AUTHORIZED")return reply("EMAIL_NOT_AUTHORIZED",403);
  if(error?.message==="AUTH_OTP_DISABLED")return reply("EMAIL_LOGIN_DISABLED",503);
  return reply("AUTH_UNAVAILABLE",503);
 }
}};
