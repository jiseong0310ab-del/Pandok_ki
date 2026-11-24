// Separate report locale from the language of the actual message. No extra AI call.
import {maskContactIdentifiers} from "./server-guard.mjs";
export const MESSAGE_LOCALES=Object.freeze(["ko","ja","en","zh-CN","zh-TW"]);
export function parseReplyLanguage(value,locale){
 if(value===undefined)return locale;
 return value==="auto"||MESSAGE_LOCALES.includes(value)?value:null;
}
export function languageInstruction(input,mode="analysis"){
 const lang=input.replyLanguage||input.locale;
 const field=mode==="coach"?"message":mode==="simulation"?"warm.example, neutral.example, reserved.example and gentlerDraft":"replyDraft";
 return "\nLANGUAGE CONTRACT (overrides previous language-only rules): All analysis, advice, reasons, reading, caution and explanations must be in "+input.locale+". Preserve short verified quotations exactly in the source language. Write only "+field+" in "+(lang==="auto"?"the language of the recipient's most recent clearly identifiable message or the supplied draft. For mixed languages or uncertainty use "+input.locale+". Choose only ko, ja, en, zh-CN or zh-TW":"the explicitly requested language "+lang)+". Do not infer nationality. Use culturally and situationally natural wording, including appropriate politeness without stereotypes. "+(mode==="simulation"?"Explain the meaning of each foreign-language example in its reading field. Do not add any fields outside the response schema.":"When the response schema includes language metadata, set replyLanguage to the actual message locale and replyMeaning to an accurate translation in "+input.locale+" if different, otherwise empty.")+" Do not add a translation inside a copyable draft or invent content. If no contact is appropriate, leave the draft and meaning empty.";
}
export function withMessageLanguage(schema){
 return {...schema,properties:{...schema.properties,replyLanguage:{type:"STRING",enum:MESSAGE_LOCALES},replyMeaning:{type:"STRING",description:"Translation of actual recommended message in report locale, or empty when same language or no message"}},required:[...schema.required,"replyLanguage","replyMeaning"]};
}
export function addMessageLanguage(out,raw,input,field){
 if(!out||!input||input.replyLanguage===undefined)return out;
 const selected=input.replyLanguage||input.locale;
 const actual=selected==="auto"?(MESSAGE_LOCALES.includes(raw.replyLanguage)?raw.replyLanguage:input.locale):selected;
 out.replyLanguage=actual;
 const message=typeof out[field]==="string"&&out[field].trim()&&out.shouldReply!==false;
 out.replyMeaning=message&&actual!==input.locale&&typeof raw.replyMeaning==="string"?maskContactIdentifiers(raw.replyMeaning.trim().slice(0,700)):"";
 return out;
}
