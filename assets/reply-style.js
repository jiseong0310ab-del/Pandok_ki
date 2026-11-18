// Explicitly saved, category-only reply style preferences; never store example messages.
(function(root){
"use strict";
const KEY="saynue:reply-style:v1";
const TONES=["natural","warm","direct","light"],LENGTHS=["short","normal"],EMOJIS=["none","subtle"];
function valid(raw){
 if(!raw||raw.version!==1||!TONES.includes(raw.tone)||!LENGTHS.includes(raw.length)||!EMOJIS.includes(raw.emoji))return null;
 return {version:1,tone:raw.tone,length:raw.length,emoji:raw.emoji};
}
function create({storage}={}){
 const getStorage=()=>{try{return storage||root.localStorage}catch{return null}};
 function load(){try{return valid(JSON.parse(getStorage()?.getItem(KEY)||"null"))}catch{return null}}
 function save(value){
  const checked=valid({version:1,...value});
  if(!checked)return false;
  try{const target=getStorage();if(!target)return false;target.setItem(KEY,JSON.stringify(checked));return true}catch{return false}
 }
 function clear(){try{getStorage()?.removeItem(KEY);return true}catch{return false}}
 return {load,save,clear};
}
root.SaynueReplyStyle={create};
})(typeof window!=="undefined"?window:globalThis);
