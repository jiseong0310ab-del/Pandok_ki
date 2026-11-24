import {publicSiteOrigin} from "./site-origin.mjs";
// Server-only Supabase Auth + PostgREST adapter.
// Secrets must be Vercel environment variables, never sent to the browser.
export function supabaseConfig(env=process.env){
 const base=env.SUPABASE_URL,anon=env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY,service=env.SUPABASE_SECRET_KEY||env.SUPABASE_SERVICE_ROLE_KEY;
 if(!base||!anon||!service)return null;
 try{
  const u=new URL(base);
  if(u.protocol!=="https:"||u.username||u.password||u.pathname!=="/"||u.search||u.hash)return null;
  if(!/^[a-z0-9-]+\.supabase\.co$/i.test(u.hostname))return null;
  if(anon===service)return null;
  return {url:u.origin,anon,service};
 }catch(_){return null}
}
export function supabaseAuthConfig(env=process.env){
 const base=env.SUPABASE_URL,anon=env.SUPABASE_PUBLISHABLE_KEY||env.SUPABASE_ANON_KEY;
 if(!base||!anon)return null;
 try{
  const u=new URL(base);
  if(u.protocol!=="https:"||u.username||u.password||u.pathname!=="/"||u.search||u.hash||!/^[a-z0-9-]+\.supabase\.co$/i.test(u.hostname))return null;
  return {url:u.origin,anon};
 }catch(_){return null}
}
async function call(url,{key,token,method="GET",body,headers={},fetchImpl=fetch,timeoutMs=8500,authErrors=false}={}){
 // Modern sb_publishable_/sb_secret_ credentials authenticate via apikey ONLY.
 // A signed-in user access token is a JWT and still requires Authorization.
 const bearer=token||(key.startsWith("sb_")?null:key);
 let result;
 try{
  result=await fetchImpl(url,{
   method,
   headers:{"apikey":key,...(bearer?{"Authorization":"Bearer "+bearer}:{}),"Content-Type":"application/json",...headers},
   ...(body!==undefined?{body:JSON.stringify(body)}:{}),
   signal:AbortSignal.timeout(timeoutMs),
   cache:"no-store"
  });
 }catch(_){throw Error("UPSTREAM_UNAVAILABLE")}
 if(!result.ok){
  if(authErrors){
   // Whitelist only documented, non-sensitive provider error codes. Never
   // forward Supabase's untrusted response message, request body or secrets.
   let code="";
   try{
    const json=await result.json();
    if(typeof json?.code==="string")code=json.code;
   }catch(_){}
   if(code==="email_address_not_authorized")throw Error("AUTH_EMAIL_NOT_AUTHORIZED");
   if(code==="over_email_send_rate_limit"||code==="over_request_rate_limit"||result.status===429)throw Error("AUTH_EMAIL_RATE_LIMIT");
   if(code==="otp_disabled")throw Error("AUTH_OTP_DISABLED");
  }
  throw Error("UPSTREAM_ERROR_"+result.status);
 }
 try{return await result.json()}catch(_){return null}
}
export async function authAPI(path,{method="GET",body,accessToken,fetchImpl=fetch}={}){
 const config=supabaseAuthConfig();
 if(!config)throw Error("AUTH_NOT_CONFIGURED");
 const otpRedirect="/auth/v1/otp?redirect_to="+encodeURIComponent(publicSiteOrigin()+"/account.html");
 if(path!==otpRedirect&&!/^\/auth\/v1\/(?:otp|verify|user|logout|token\?grant_type=refresh_token)$/.test(path))throw Error("INVALID_AUTH_PATH");
 return call(config.url+path,{key:config.anon,token:accessToken,method,body,fetchImpl,authErrors:true});
}
export async function storeCheckoutIntent({transactionId,userId,priceId},fetchImpl=fetch){
 const config=supabaseConfig();
 if(!config)throw Error("DB_NOT_CONFIGURED");
 return call(config.url+"/rest/v1/saynue_checkout_intents",{
  key:config.service,method:"POST",body:{transaction_id:transactionId,user_id:userId,price_id:priceId},
  headers:{"Prefer":"return=minimal"},fetchImpl
 });
}
export async function applySubscriptionEvent(event,fetchImpl=fetch){
 const config=supabaseConfig();
 if(!config)throw Error("DB_NOT_CONFIGURED");
 const body={
  p_event_id:event.eventId,
  p_event_type:event.eventType,
  p_occurred_at:event.occurredAt,
  p_subscription_id:event.subscriptionId,
  p_status:event.status,
  p_customer_id:event.customerId,
  p_price_id:event.priceId,
  p_transaction_id:event.transactionId,
  p_period_end:event.periodEnd
 };
 return call(config.url+"/rest/v1/rpc/saynue_apply_subscription_event",{
  key:config.service,method:"POST",body,fetchImpl
 });
}
export async function applyAdjustmentEvent(event,fetchImpl=fetch){
 const config=supabaseConfig();
 if(!config)throw Error("DB_NOT_CONFIGURED");
 const body={
  p_event_id:event.eventId,
  p_event_type:event.eventType,
  p_occurred_at:event.occurredAt,
  p_subscription_id:event.subscriptionId,
  p_transaction_id:event.transactionId,
  p_action:event.action,
  p_status:event.status
 };
 return call(config.url+"/rest/v1/rpc/saynue_apply_adjustment_event",{
  key:config.service,method:"POST",body,fetchImpl
 });
}
export async function listUserSubscriptions(userId,fetchImpl=fetch){
 const config=supabaseConfig();
 if(!config)throw Error("DB_NOT_CONFIGURED");
 const id=encodeURIComponent("eq."+userId);
 const path="/rest/v1/saynue_subscriptions?select=subscription_id,price_id,status,period_end,billing_blocked&user_id="+id+"&order=last_event_at.desc&limit=10";
 const list=await call(config.url+path,{key:config.service,fetchImpl});
 if(!Array.isArray(list))throw Error("DB_BAD_RESPONSE");
 return list;
}
// Give back one credit for a UTC usage day when the AI provider failed before
// producing a billed answer. Server-only; never callable from the browser.
export async function refundPlusCredit({userId,usageDate},fetchImpl=fetch){
 const config=supabaseConfig();
 if(!config)throw Error("DB_NOT_CONFIGURED");
 if(typeof usageDate!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(usageDate))throw Error("INVALID_USAGE_DATE");
 const result=await call(config.url+"/rest/v1/rpc/saynue_refund_plus_credit",{
  key:config.service,method:"POST",
  body:{p_user_id:userId,p_usage_date:usageDate},fetchImpl
 });
 return result===true;
}
export async function claimPlusCredit({userId,priceId,dailyLimit},fetchImpl=fetch){
 const config=supabaseConfig();
 if(!config)throw Error("DB_NOT_CONFIGURED");
 const result=await call(config.url+"/rest/v1/rpc/saynue_claim_plus_credit",{
  key:config.service,method:"POST",
  body:{p_user_id:userId,p_price_id:priceId,p_daily_limit:dailyLimit},fetchImpl
 });
 return result===true;
}
