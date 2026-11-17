// Paddle webhook envelope verification and strict subscription event normalization.
// Do not use checkout.completed or client-side flags to grant Plus.
import {createHmac,timingSafeEqual} from "node:crypto";

const SUB_EVENTS=new Set([
 "subscription.created","subscription.updated","subscription.activated",
 "subscription.trialing","subscription.past_due","subscription.paused",
 "subscription.resumed","subscription.canceled"
]);
const STATUS=new Set(["active","trialing","past_due","paused","canceled"]);
const ID=/^(?:evt|sub|txn|ctm|pri)_[a-z0-9]{10,64}$/;
const sameId=(id,prefix)=>typeof id==="string"&&id.startsWith(prefix+"_")&&ID.test(id);
const cleanDate=s=>typeof s==="string"&&!Number.isNaN(Date.parse(s))?new Date(s).toISOString():null;

export function verifyPaddleSignature(raw,header,secret,nowMs=Date.now(),windowSeconds=300){
 if(typeof raw!=="string"||!raw||typeof header!=="string"||typeof secret!=="string"||!secret)return false;
 if(Buffer.byteLength(raw,"utf8")>262144)return false;
 const pieces=header.split(";").map(x=>x.trim());
 const times=pieces.filter(x=>/^ts=\d{1,15}$/.test(x));
 const signatures=pieces.filter(x=>/^h1=[a-f0-9]{64}$/i.test(x));
 if(times.length!==1||signatures.length<1||signatures.length>4)return false;
 const ts=times[0].slice(3),epoch=Number(ts);
 if(!Number.isSafeInteger(epoch)||Math.abs(nowMs-epoch*1000)>windowSeconds*1000)return false;
 const expected=createHmac("sha256",secret).update(ts+":"+raw,"utf8").digest();
 return signatures.some(value=>{
  const actual=Buffer.from(value.slice(3),"hex");
  return actual.length===expected.length&&timingSafeEqual(expected,actual);
 });
}

export function parsePaddleSubscriptionEvent(payload){
 if(!payload||typeof payload!=="object"||Array.isArray(payload))return null;
 if(!sameId(payload.event_id,"evt")||typeof payload.event_type!=="string"||!cleanDate(payload.occurred_at))return null;
 if(!SUB_EVENTS.has(payload.event_type))return {ignored:true,eventId:payload.event_id};
 const data=payload.data;
 if(!data||typeof data!=="object"||Array.isArray(data)||!sameId(data.id,"sub")||!STATUS.has(data.status))return null;
 if(!sameId(data.customer_id,"ctm"))return null;
 if(!Array.isArray(data.items))return null;
 // We support exactly one recurring subscription price and quantity one.
 // A plan change to another price can never silently preserve access.
 const items=data.items.filter(x=>x&&typeof x==="object");
 if(items.length!==1||items[0].quantity!==1)return null;
 const price=items[0].price;
 const priceId=typeof price?.id==="string"?price.id:items[0].price_id;
 if(!sameId(priceId,"pri"))return null;
 const transactionId=data.transaction_id;
 if(transactionId!==undefined&&transactionId!==null&&!sameId(transactionId,"txn"))return null;
 const periodEnd=data.current_billing_period?.ends_at;
 if(periodEnd!==undefined&&periodEnd!==null&&!cleanDate(periodEnd))return null;
 return {
  ignored:false,eventId:payload.event_id,eventType:payload.event_type,
  occurredAt:cleanDate(payload.occurred_at),subscriptionId:data.id,
  customerId:data.customer_id,priceId,status:data.status,
  transactionId:transactionId||null,periodEnd:cleanDate(periodEnd)
 };
}

export function parsePaddleAdjustmentEvent(payload){
 if(!payload||typeof payload!=="object"||Array.isArray(payload))return null;
 if(!sameId(payload.event_id,"evt")||!cleanDate(payload.occurred_at))return null;
 if(!["adjustment.created","adjustment.updated"].includes(payload.event_type))return {ignored:true,eventId:payload.event_id};
 const data=payload.data;
 if(!data||typeof data!=="object"||Array.isArray(data)||!/^adj_[a-z0-9]{10,64}$/.test(data.id||""))return null;
 if(!["refund","chargeback"].includes(data.action)||data.status!=="approved"||!data.subscription_id)return {ignored:true,eventId:payload.event_id};
 if(!sameId(data.subscription_id,"sub")||!sameId(data.transaction_id,"txn"))return null;
 return {ignored:false,type:"adjustment",eventId:payload.event_id,eventType:payload.event_type,occurredAt:cleanDate(payload.occurred_at),subscriptionId:data.subscription_id,transactionId:data.transaction_id,action:data.action,status:data.status};
}

export function activeSubscription(record,expectedPrice,now=Date.now()){
 if(!record||record.status!=="active"||record.billing_blocked!==false||record.price_id!==expectedPrice)return false;
 const end=Date.parse(record.period_end||"");
 return Number.isFinite(end)&&end>now;
}
