// Server-held, HttpOnly Supabase email OTP sessions.
// No access or refresh token is ever returned to browser JavaScript.
import {authAPI,supabaseAuthConfig} from "./saynue-storage.mjs";

const ACCESS="__Host-saynue_access";
const REFRESH="__Host-saynue_refresh";
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const validEmail=s=>typeof s==="string"&&s.length<=254&&/^[^\s@]{1,64}@[a-z0-9.-]+\.[a-z]{2,}$/i.test(s);
export const validOTP=s=>typeof s==="string"&&/^\d{6,8}$/.test(s);

function cookies(request){
 const text=request.headers.get("cookie")||"";
 const entries=new Map();
 for(const part of text.split(";")){
  const sep=part.indexOf("=");
  if(sep<0)continue;
  const key=part.slice(0,sep).trim(),value=part.slice(sep+1).trim();
  if((key===ACCESS||key===REFRESH)&&value.length<4096&&/^[\w.~-]+$/.test(value))entries.set(key,value);
 }
 return entries;
}
export function checkSameOrigin(request){
 const origin=request.headers.get("origin");
 if(!origin)return false;
 try{return new URL(origin).origin===new URL(request.url).origin}catch(_){return false}
}
export function setSessionCookies(headers,session){
 const access=session?.access_token,refresh=session?.refresh_token;
 if(typeof access!=="string"||!access||typeof refresh!=="string"||!refresh)throw Error("INVALID_SESSION");
 const expires=Math.max(60,Math.min(3600,Number(session.expires_in)||3600));
 headers.append("Set-Cookie",ACCESS+"="+access+"; Path=/; Max-Age="+expires+"; HttpOnly; Secure; SameSite=Lax");
 headers.append("Set-Cookie",REFRESH+"="+refresh+"; Path=/; Max-Age=2592000; HttpOnly; Secure; SameSite=Lax");
}
export function clearSessionCookies(headers){
 headers.append("Set-Cookie",ACCESS+"=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax");
 headers.append("Set-Cookie",REFRESH+"=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax");
}
export async function getAuthenticatedUser(request,headers=new Headers()){
 if(!supabaseAuthConfig())return {user:null,configured:false};
 const tokens=cookies(request);
 let access=tokens.get(ACCESS);
 if(!access&&!tokens.get(REFRESH))return {user:null,configured:true};
 const verify=async token=>{
  if(!token)return null;
  try{
   const user=await authAPI("/auth/v1/user",{accessToken:token});
   return user&&UUID.test(user.id)&&typeof user.email==="string"&&user.email_confirmed_at?{id:user.id,email:user.email}:null;
  }catch(_){return null}
 };
 let user=await verify(access);
 if(user)return {user,configured:true};
 const refresh=tokens.get(REFRESH);
 if(!refresh)return {user:null,configured:true};
 try{
  const updated=await authAPI("/auth/v1/token?grant_type=refresh_token",{method:"POST",body:{refresh_token:refresh}});
  user=await verify(updated.access_token);
  if(!user)throw Error("INVALID_USER");
  setSessionCookies(headers,updated);
  return {user,configured:true};
 }catch(_){clearSessionCookies(headers);return {user:null,configured:true}}
}
export async function sendEmailCode(email){
 if(!validEmail(email))throw Error("INVALID_EMAIL");
 const config=supabaseAuthConfig();
 if(!config)throw Error("AUTH_NOT_CONFIGURED");
 // Admin must configure a Supabase Magic Link email template using {{ .Token }}.
 await authAPI("/auth/v1/otp",{method:"POST",body:{email:email.toLowerCase().trim(),create_user:true}});
}
export async function exchangeEmailCode(email,otp){
 if(!validEmail(email)||!validOTP(otp))throw Error("INVALID_CODE");
 if(!supabaseAuthConfig())throw Error("AUTH_NOT_CONFIGURED");
 const session=await authAPI("/auth/v1/verify",{method:"POST",body:{email:email.toLowerCase().trim(),token:otp,type:"email"}});
 if(!session||!UUID.test(session.user?.id)||!session.user?.email_confirmed_at||!session.access_token||!session.refresh_token)throw Error("INVALID_SESSION");
 return session;
}
export async function revokeServerSession(request){
 const tokens=cookies(request),access=tokens.get(ACCESS);
 if(!access)return;
 try{await authAPI("/auth/v1/logout",{method:"POST",accessToken:access})}catch(_){}
}
