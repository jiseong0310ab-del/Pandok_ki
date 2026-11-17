import {checkSameOrigin,validEmail,validOTP,exchangeEmailCode,setSessionCookies} from "../../lib/saynue-auth.mjs";
import {supabaseAuthConfig} from "../../lib/saynue-storage.mjs";
const reply=(code,status,headers=new Headers())=>{
 headers.set("Content-Type","application/json");headers.set("Cache-Control","no-store");
 headers.set("X-Content-Type-Options","nosniff");
 return new Response(JSON.stringify({code}),{status,headers});
};
export default {async fetch(request){
 if(request.method!=="POST")return reply("METHOD_NOT_ALLOWED",405);
 if(!checkSameOrigin(request))return reply("FORBIDDEN",403);
 if(!supabaseAuthConfig())return reply("AUTH_NOT_CONFIGURED",503);
 if(!String(request.headers.get("content-type")||"").startsWith("application/json"))return reply("BAD_MEDIA_TYPE",415);
 if(Number(request.headers.get("content-length")||0)>1024)return reply("BAD_INPUT",400);
 let input;
 try{const raw=await request.text();if(raw.length>1024)throw Error();input=JSON.parse(raw)}catch(_){return reply("BAD_INPUT",400)}
 if(!validEmail(input?.email)||!validOTP(input?.code))return reply("BAD_INPUT",400);
 try{
  const session=await exchangeEmailCode(input.email,input.code);
  const headers=new Headers();
  setSessionCookies(headers,session);
  return reply("SIGNED_IN",200,headers);
 }catch(_){return reply("CODE_INVALID_OR_EXPIRED",401)}
}};
