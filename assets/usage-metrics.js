// Optional, first-party usage measurement. No consent = no network calls or identifier.
(function(root){
"use strict";
const KEY="saynue:metrics-optin:v1";
const EVENTS=new Set(["visit","analysis_started","analysis_completed","followup_started","followup_completed","library_saved","simulation_started","simulation_completed","plans_interest","reply_copied","analysis_failed"]);
function create({storage,fetchFn,cryptoObj,now,onDelivery}={}){
 const getStore=()=>{try{return storage||root.localStorage}catch{return null}};
 const network=fetchFn||((...args)=>root.fetch(...args));
 const source=cryptoObj||root.crypto;
 const clock=now||(()=>new Date());
 let current=null;
 function load(){
  try{
   const parsed=JSON.parse(getStore()?.getItem(KEY)||"null");
   if(parsed?.version!==1||!(/^[a-f0-9]{32}$/.test(parsed.id))||!(/^\d{4}-\d{2}-\d{2}$/.test(parsed.firstDay)))return null;
   const first=Date.parse(parsed.firstDay+"T00:00:00Z"),today=Date.parse(clock().toISOString().slice(0,10)+"T00:00:00Z");
   if(!Number.isFinite(first)||first>today||today-first>29*86400000)return null;
   return parsed;
  }catch{return null}
 }
 current=load();
 function enabled(){return !!current}
 function clear(){try{getStore()?.removeItem(KEY)}catch{}current=null}
 function enable(){
  if(current)return true;
  try{
   const bytes=new Uint8Array(16);
   source.getRandomValues(bytes);
   const id=Array.from(bytes,b=>b.toString(16).padStart(2,"0")).join("");
   const firstDay=clock().toISOString().slice(0,10);
   const entry={version:1,id,firstDay};
   const store=getStore();if(!store)return false;
   store.setItem(KEY,JSON.stringify(entry));current=entry;return true;
  }catch{return false}
 }
 function record(event){
  if(!current||!EVENTS.has(event))return false;
  const today=clock().toISOString().slice(0,10);
  // A visit may be tracked again after the first 30 days only after renewing consent.
  if(Date.parse(today+"T00:00:00Z")-Date.parse(current.firstDay+"T00:00:00Z")>29*86400000){clear();return false}
  // Never transmit conversation, draft, screenshot, locale, user-agent or URL path.
  try{
   Promise.resolve(network("/api/metrics",{method:"POST",headers:{"Content-Type":"application/json"},
    body:JSON.stringify({event,visitorId:current.id,firstDay:current.firstDay}),cache:"no-store",keepalive:false
   })).then(response=>{if(typeof onDelivery==="function")onDelivery(!!response?.ok)}).catch(()=>{if(typeof onDelivery==="function")onDelivery(false)});
   return true;
  }catch{return false}
 }
 return {enabled,enable,clear,record};
}
root.SaynueUsageMetrics={create};
})(typeof window!=="undefined"?window:globalThis);
