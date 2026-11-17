// POST /api/auth/link-session
// Convert Supabase's one-time implicit-flow email redirect into server-only
// HttpOnly cookies. Login tokens are validated against Supabase, never trusted
// for Paddle entitlements or stored by the client.
import {checkSameOrigin,exchangeDefaultEmailLink,setSessionCookies} from "../../lib/saynue-auth.mjs";
import {supabaseAuthConfig} from "../../lib/saynue-storage.mjs";
function reply(code,status,headers=new Headers()){
 headers.set("Content-Type","application/json");
 headers.set("Cache-Control","no-store, max-age=0");
 headers.set("X-Content-Type-Options","nosniff");
 headers.set("Referrer-Policy","no-referrer");
 return new Response(JSON.stringify({code}),{status,headers});
}
export default {async fetch(request){
 if(request.method!=="POST")return reply("METHOD_NOT_ALLOWED",405);
 if(!checkSameOrigin(request))return reply("FORBIDDEN",403);
 if(!supabaseAuthConfig())return reply("AUTH_NOT_CONFIGURED",503);
 if(!String(request.headers.get("content-type")||"").toLowerCase().startsWith("application/json"))return reply("BAD_MEDIA_TYPE",415);
 if(Number(request.headers.get("content-length")||0)>12288)return reply("BAD_INPUT",400);
 let input;
 try{
  const raw=await request.text();
  if(raw.length>12288)throw Error("INVALID_LINK");
  input=JSON.parse(raw);
 }catch(_){return reply("BAD_INPUT",400)}
 try{
  const session=await exchangeDefaultEmailLink(input);
  const headers=new Headers();
  setSessionCookies(headers,session);
  return reply("SIGNED_IN",200,headers);
 }catch(_){return reply("LINK_INVALID_OR_EXPIRED",401)}
}};
