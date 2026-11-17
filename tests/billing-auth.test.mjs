import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {createHmac} from "node:crypto";
import {verifyPaddleSignature,parsePaddleSubscriptionEvent,parsePaddleAdjustmentEvent,activeSubscription} from "../lib/paddle-billing.mjs";
import {validEmail,validOTP,checkSameOrigin,setSessionCookies,clearSessionCookies} from "../lib/saynue-auth.mjs";
import {supabaseAuthConfig,supabaseConfig} from "../lib/saynue-storage.mjs";

const pad=(prefix,chr)=>prefix+"_"+chr.repeat(26);
const base={
 event_id:pad("evt","a"),
 event_type:"subscription.created",
 occurred_at:"2026-11-17T05:00:00.000Z",
 data:{
  id:pad("sub","b"),status:"active",customer_id:pad("ctm","c"),
  transaction_id:pad("txn","d"),current_billing_period:{ends_at:"2026-12-17T00:00:00Z"},
  items:[{price:{id:pad("pri","e")},quantity:1}]
 }
};
const stamp=1735000000;
const signature=(body,secret="test-key",ts=stamp)=>"ts="+ts+";h1="+createHmac("sha256",secret).update(ts+":"+body).digest("hex");

test("Paddle signatures are verified against the exact raw body with timing and replay protections",()=>{
 const payload=JSON.stringify(base),secret="test-key";
 assert.equal(verifyPaddleSignature(payload,signature(payload,secret),secret,stamp*1000),true);
 assert.equal(verifyPaddleSignature(payload+" ",signature(payload,secret),secret,stamp*1000),false);
 assert.equal(verifyPaddleSignature(payload,signature(payload,secret),secret,stamp*1000+301000),false);
 assert.equal(verifyPaddleSignature(payload,signature(payload,secret),secret+"wrong",stamp*1000),false);
 assert.equal(verifyPaddleSignature(payload,"ts=hack;h1=deadbeef",secret,stamp*1000),false);
 assert.equal(verifyPaddleSignature(payload,"ts=0;h1="+"a".repeat(64),secret,stamp*1000),false);
 assert.equal(verifyPaddleSignature(payload,signature(payload,secret)+";h1="+"f".repeat(64),secret,stamp*1000),true);
});
test("subscription events are validated and never accept client success as paid",()=>{
 const x=parsePaddleSubscriptionEvent(base);
 assert.equal(x.eventType,"subscription.created");
 assert.equal(x.subscriptionId,base.data.id);
 assert.equal(x.priceId,base.data.items[0].price.id);
 assert.equal(x.transactionId,base.data.transaction_id);
 assert.equal(x.periodEnd,"2026-12-17T00:00:00.000Z");
 assert.equal(parsePaddleSubscriptionEvent({...base,data:{...base.data,status:"invalid"}}),null);
 assert.equal(parsePaddleSubscriptionEvent({...base,data:{...base.data,items:[]}}),null);
 assert.equal(parsePaddleSubscriptionEvent({...base,data:{...base.data,customer_id:null}}),null);
 assert.equal(parsePaddleSubscriptionEvent({...base,event_type:"checkout.completed"}).ignored,true);
});
test("paid access requires matching price, active status, unexpired term",()=>{
 const now=Date.parse("2026-11-17T12:00:00Z");
 const row={status:"active",price_id:pad("pri","e"),billing_blocked:false,period_end:"2026-12-17T00:00:00Z"};
 assert.equal(activeSubscription(row,row.price_id,now),true);
 assert.equal(activeSubscription({...row,status:"past_due"},row.price_id,now),false);
 assert.equal(activeSubscription({...row,billing_blocked:true},row.price_id,now),false);
 assert.equal(activeSubscription({...row,billing_blocked:undefined},row.price_id,now),false);
 assert.equal(activeSubscription({...row,status:"canceled"},row.price_id,now),false);
 assert.equal(activeSubscription({...row,period_end:"2026-10-01T00:00:00Z"},row.price_id,now),false);
 assert.equal(activeSubscription(row,pad("pri","x"),now),false);
});
test("approved refunds and chargebacks invalidate access; unlinked/other adjustments ignored",()=>{
 const adjustment={
  event_id:pad("evt","f"),event_type:"adjustment.updated",occurred_at:base.occurred_at,
  data:{id:pad("adj","g"),subscription_id:pad("sub","b"),transaction_id:pad("txn","d"),action:"refund",status:"approved"}
 };
 const result=parsePaddleAdjustmentEvent(adjustment);
 assert.equal(result.type,"adjustment");
 assert.equal(result.action,"refund");
 assert.equal(parsePaddleAdjustmentEvent({...adjustment,data:{...adjustment.data,status:"pending_approval"}}).ignored,true);
 assert.equal(parsePaddleAdjustmentEvent({...adjustment,data:{...adjustment.data,action:"chargeback"}}).action,"chargeback");
 assert.equal(parsePaddleAdjustmentEvent({...adjustment,data:{...adjustment.data,subscription_id:null}}).ignored,true);
});

test("auth validates OTP, email, same origin and uses HttpOnly Secure session cookies",()=>{
 assert.equal(validEmail("hello@example.com"),true);
 assert.equal(validEmail("invalid"),false);
 assert.equal(validOTP("123456"),true);
 assert.equal(validOTP("12345678"),true);
 assert.equal(validOTP("12345"),false);
 const req=new Request("https://saynue.vercel.app/api/auth/start",{method:"POST",headers:{Origin:"https://saynue.vercel.app"}});
 assert.equal(checkSameOrigin(req),true);
 assert.equal(checkSameOrigin(new Request(req.url,{method:"POST",headers:{Origin:"https://attacker.invalid"}})),false);
 const h=new Headers();
 setSessionCookies(h,{access_token:"eyJ.a.b",refresh_token:"secret.refresh",expires_in:3600});
 const cookie=h.getSetCookie();
 assert.equal(cookie.length,2);
 assert.ok(cookie.every(v=>v.includes("HttpOnly")&&v.includes("Secure")&&v.includes("SameSite=Lax")));
 assert.ok(cookie.every(v=>v.startsWith("__Host-saynue_")));
 const cleared=new Headers();clearSessionCookies(cleared);
 assert.equal(cleared.getSetCookie().length,2);
 assert.ok(cleared.getSetCookie().every(v=>v.includes("Max-Age=0")));
});
test("Supabase storage cannot initialize without service credentials and safe HTTPS URL",()=>{
 assert.equal(supabaseConfig({SUPABASE_URL:"http://example.com",SUPABASE_ANON_KEY:"pub",SUPABASE_SERVICE_ROLE_KEY:"private"}),null);
 assert.equal(supabaseConfig({SUPABASE_URL:"https://service.attacker.invalid/",SUPABASE_ANON_KEY:"pub",SUPABASE_SERVICE_ROLE_KEY:"private"}),null);
 assert.equal(supabaseConfig({SUPABASE_URL:"https://abc.supabase.co/",SUPABASE_ANON_KEY:"pub"}),null);
 assert.equal(supabaseConfig({SUPABASE_URL:"https://abc.supabase.co/",SUPABASE_ANON_KEY:"same",SUPABASE_SERVICE_ROLE_KEY:"same"}),null);
 assert.equal(supabaseAuthConfig({SUPABASE_URL:"https://abc.supabase.co/",SUPABASE_ANON_KEY:"public"}).url,"https://abc.supabase.co");
});
test("SQL enforces RLS, atomic webhook event IDs, trusted transaction binding and usage quota",()=>{
 const sql=fs.readFileSync(new URL("../docs/supabase-billing-schema.sql",import.meta.url),"utf8");
 for(const needle of ["ENABLE ROW LEVEL SECURITY","REVOKE ALL ON TABLE","FOR UPDATE","pg_advisory_xact_lock","saynue_checkout_intents","saynue_apply_subscription_event","saynue_claim_plus_credit","last_event_at<excluded.last_event_at","status='active'","period_end>now()","billing_blocked","saynue_apply_adjustment_event"]){
  assert.ok(sql.includes(needle),needle);
 }
 assert.doesNotMatch(sql,/GRANT SELECT ON TABLE .* TO anon/);
});
test("all browser-facing paid APIs are hard-disabled until membership prerequisites",()=>{
 const files=["api/plus/report.mjs","api/plus/checkout.mjs","api/webhooks/paddle.mjs","api/auth/start.mjs","api/auth/verify.mjs"];
 for(const file of files){
  const source=fs.readFileSync(new URL("../"+file,import.meta.url),"utf8");
  assert.match(source,/NOT_CONFIGURED|DISABLED/);
 }
 const status=fs.readFileSync(new URL("../api/auth/state.mjs",import.meta.url),"utf8");
 assert.match(status,/activeSubscription/);
 assert.doesNotMatch(status,/clientIsPlus|localStorage/);
});
