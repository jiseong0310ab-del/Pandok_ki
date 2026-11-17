// POST /api/webhooks/paddle — Sandbox-only; no secrets means 503, never grant Plus.
// Verified raw-body signature -> atomic database RPC. No private content in logs.
import {verifyPaddleSignature,parsePaddleSubscriptionEvent} from "../../lib/paddle-billing.mjs";
import {applySubscriptionEvent,supabaseConfig} from "../../lib/saynue-storage.mjs";

const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store, max-age=0","X-Content-Type-Options":"nosniff"};
const result=(body,status=200)=>new Response(JSON.stringify(body),{status,headers});
export default {
 async fetch(request){
  if(request.method!=="POST")return result({code:"METHOD_NOT_ALLOWED"},405);
  if(!String(request.headers.get("content-type")||"").toLowerCase().startsWith("application/json"))return result({code:"BAD_MEDIA_TYPE"},415);
  const secret=process.env.PADDLE_WEBHOOK_SECRET;
  if(!secret||process.env.SAYNUE_PADDLE_ENV!=="sandbox"||!supabaseConfig())return result({code:"NOT_CONFIGURED"},503);
  if(Number(request.headers.get("content-length")||"0")>262144)return result({code:"PAYLOAD_TOO_LARGE"},413);
  let raw;
  try{raw=await request.text()}catch(_){return result({code:"INVALID_BODY"},400)}
  if(Buffer.byteLength(raw,"utf8")>262144)return result({code:"PAYLOAD_TOO_LARGE"},413);
  if(!verifyPaddleSignature(raw,request.headers.get("paddle-signature"),secret))return result({code:"INVALID_SIGNATURE"},401);
  let event;
  try{event=parsePaddleSubscriptionEvent(JSON.parse(raw))}catch(_){event=null}
  if(!event)return result({code:"INVALID_EVENT"},400);
  if(event.ignored)return result({ok:true,ignored:true});
  try{
   const state=await applySubscriptionEvent(event);
   // Only PostgreSQL's atomic RPC may affect subscription state.
   if(!state||!["applied","duplicate","stale"].includes(state.state))throw Error("DB_BAD_RESPONSE");
   return result({ok:true,state:state.state});
  }catch(_){
   // Retryable. Never acknowledge a DB failure: Paddle should redeliver.
   return result({code:"STORAGE_UNAVAILABLE"},503);
  }
 }
};
