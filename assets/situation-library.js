// Opt-in, browser-only situation summaries. Never stores chats or screenshots.
(function(global){
"use strict";
const KEY="saynue:situations:v2",LEGACY_KEY="saynue:context:v1";
const MAX=8,TTL=30*24*60*60*1000;
const PERSONAS=["standard","court","work","romance","mediator"];
const PLATFORMS=["kakao","line","wechat","whatsapp","imessage","instagram","other"];
const RELATIONS=["crush","talking","dating","ex","friends","work"];
const GOALS=["understand","reply","repair","boundary"];
const TONES=["natural","warm","direct","light"];
const LOCALES=["ko","ja","en","zh-CN","zh-TW"];

function clean(value,max){
 return typeof value==="string"?value.trim().slice(0,max):"";
}
function normalize(raw,now){
 if(!raw||typeof raw!=="object"||Array.isArray(raw)||raw.version!==1)return null;
 if(typeof raw.id!=="string"||!/^[a-z0-9-]{2,40}$/i.test(raw.id))return null;
 if(!Number.isFinite(raw.at)||raw.at>now+60000||now-raw.at>=TTL)return null;
 if(!PERSONAS.includes(raw.persona)||!PLATFORMS.includes(raw.platform)||!RELATIONS.includes(raw.relation)||
 !GOALS.includes(raw.goal)||!TONES.includes(raw.replyTone)||!LOCALES.includes(raw.locale))return null;
 if(!Number.isInteger(raw.turn)||raw.turn<1||raw.turn>12)return null;
 const summary=clean(raw.summary,240),signal=clean(raw.signal,350),nextStep=clean(raw.nextStep,350);
 if(!summary||!signal||!nextStep)return null;
 return {
  version:1,id:raw.id,at:raw.at,persona:raw.persona,platform:raw.platform,
  relation:raw.relation,goal:raw.goal,replyTone:raw.replyTone,locale:raw.locale,turn:raw.turn,
  summary,signal,nextStep,title:clean(raw.title,32)
 };
}
function create(options={}){
 const clock=typeof options.now==="function"?options.now:()=>Date.now();
 const access=()=>{try{return options.storage||global.localStorage}catch(_){return null}};
 const read=(key)=>{try{return access()?.getItem(key)??null}catch(_){return null}};
 const write=(items)=>{try{const s=access();if(!s)return false;s.setItem(KEY,JSON.stringify(items));return true}catch(_){return false}};
 function collect(){
  const now=clock();
  let raw;
  try{raw=JSON.parse(read(KEY)||"[]")}catch(_){raw=[]}
  if(!Array.isArray(raw))raw=[];
  const found=new Set(),list=[];
  for(const entry of raw){
   const s=normalize(entry,now);
   if(!s||found.has(s.id))continue;
   found.add(s.id);list.push(s);
  }
  list.sort((a,b)=>b.at-a.at);
  return list.slice(0,MAX);
 }
 function migrate(){
  let previous=null;
  try{previous=JSON.parse(read(LEGACY_KEY)||"null")}catch(_){}
  const old=normalize(previous,clock());
  if(!old)return;
  const existing=collect();
  if(!existing.some(x=>x.id===old.id)&&existing.length<MAX)existing.push(old);
  existing.sort((a,b)=>b.at-a.at);
  if(write(existing)){
   try{access()?.removeItem(LEGACY_KEY)}catch(_){}
  }
 }
 migrate();
 return {
  max:MAX,ttl:TTL,
  list:()=>collect().map(x=>({...x})),
  get(id){return collect().find(x=>x.id===id)||null},
  contains(id){return collect().some(x=>x.id===id)},
  upsert(value){
   const s=normalize(value,clock());
   if(!s)return {ok:false,reason:"invalid"};
   const items=collect(),index=items.findIndex(x=>x.id===s.id);
   if(index<0&&items.length>=MAX)return {ok:false,reason:"full"};
   if(index>=0)items.splice(index,1);
   items.unshift(s);
   return write(items)?{ok:true}:{ok:false,reason:"storage"};
  },
  rename(id,title){
   const value=clean(title,32);
   if(!value)return false;
   const items=collect(),index=items.findIndex(x=>x.id===id);
   if(index<0)return false;
   items[index]={...items[index],title:value};
   return write(items);
  },
  remove(id){
   const items=collect(),next=items.filter(x=>x.id!==id);
   if(next.length===items.length)return false;
   return write(next);
  }
 };
}
global.SaynueSituationLibrary={create};
})(typeof window!=="undefined"?window:globalThis);
