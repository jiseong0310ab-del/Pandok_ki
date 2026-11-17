// Paid AI route: always disabled unless server auth, RLS-backed entitlement and
// atomic per-user quota are correctly configured. Sandbox only for now.
import {checkSameOrigin,getAuthenticatedUser} from "../../lib/saynue-auth.mjs";
import {supabaseConfig,claimPlusCredit} from "../../lib/saynue-storage.mjs";
import {validatePlusInput,generatePlusReport} from "../../lib/plus-coach.mjs";
const base={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff"};
const reply=(code,status,headers=new Headers())=>{
 for(const [k,v] of Object.entries(base))headers.set(k,v);
 return new Response(JSON.stringify({code}),{status,headers});
};
export default {async fetch(request){
 if(request.method!=="POST")return reply("METHOD_NOT_ALLOWED",405);
 if(!checkSameOrigin(request))return reply("FORBIDDEN",403);
 if(process.env.SAYNUE_ENABLE_PLUS_ENGINE!=="true"||process.env.SAYNUE_PADDLE_ENV!=="sandbox"||!supabaseConfig()||!process.env.GEMINI_API_KEY)return reply("PLUS_DISABLED",503);
 if(!String(request.headers.get("content-type")||"").toLowerCase().startsWith("application/json"))return reply("BAD_MEDIA_TYPE",415);
 if(Number(request.headers.get("content-length")||0)>3450000)return reply("TOO_LARGE",413);
 const headers=new Headers();
 const {user}=await getAuthenticatedUser(request,headers);
 if(!user)return reply("LOGIN_REQUIRED",401,headers);
 let body;
 try{
  const raw=await request.text();
  if(raw.length>3450000)throw Error("TOO_LARGE");
  body=validatePlusInput(JSON.parse(raw));
 }catch(_){return reply("BAD_INPUT",400,headers)}
 if(!body)return reply("BAD_INPUT",400,headers);
 const priceId=process.env.SAYNUE_PADDLE_SANDBOX_PRICE_ID||"pri_01m7k4h86fsasy85vxy1w5d1bw";
 const perDay=Math.min(25,Math.max(1,Number(process.env.SAYNUE_PLUS_DAILY_QUOTA)||5));
 let allowed=false;
 try{allowed=await claimPlusCredit({userId:user.id,priceId,dailyLimit:perDay})}
 catch(_){return reply("STORAGE_UNAVAILABLE",503,headers)}
 if(!allowed)return reply("NO_ACTIVE_SUBSCRIPTION_OR_DAILY_LIMIT",403,headers);
 try{
  const report=await generatePlusReport(body,{apiKey:process.env.GEMINI_API_KEY});
  for(const [k,v] of Object.entries(base))headers.set(k,v);
  return new Response(JSON.stringify(report),{status:200,headers});
 }catch(_){return reply("AI_UNAVAILABLE",503,headers)}
}};
