// TEMPORARY synthetic-only evidence card integration verification; remove after test.
import analyze from "./analyze.mjs";
const examples={
  ko:{platform:"kakao",relation:"friends",locale:"ko",goal:"understand",replyTone:"natural",chatText:"나: 이번 주 토요일 오후에 커피 마실래? 친구: 토요일은 일을 해야 해. 대신 다음 주 수요일 저녁은 어때? 나: 수요일 저녁 좋아! 친구: 그럼 여섯 시에 보자."},
  en:{platform:"whatsapp",relation:"talking",locale:"en",goal:"understand",replyTone:"natural",chatText:"Me: Would you like to meet this Saturday for coffee? Them: I work Saturday. Could we do next Wednesday instead? Me: Wednesday works for me! Them: Great, see you at six."}
};
export default {async fetch(req){
 const u=new URL(req.url);
 const lang=u.searchParams.get("lang");
 if(req.method!=="GET"||u.searchParams.get("gate")!=="evidence-qa-20261117-4d07"||!Object.hasOwn(examples,lang))return new Response("Not Found",{status:404});
 const test=examples[lang];
 const reply=await analyze.fetch(new Request(new URL("/api/analyze",u.origin),{method:"POST",headers:{"content-type":"application/json","x-vercel-forwarded-for":lang==="ko"?"198.51.100.231":"198.51.100.232"},body:JSON.stringify(test)}));
 const json=await reply.json().catch(()=>({}));
 const cards=Array.isArray(json.evidenceCards)?json.evidenceCards:[];
 const results=cards.map(x=>({quoteLength:x.quote?.length||0,matchedSource:test.chatText.includes(x.quote||""),kind:x.sourceType,screenshotIndex:x.screenshotIndex,hasReading:typeof x.reading==="string"&&x.reading.length>7,hasAlternative:typeof x.otherExplanation==="string"&&x.otherExplanation.length>7}));
 return new Response(JSON.stringify({status:reply.status,code:json.code||"OK",locale:lang,hasCore:typeof json.verdict==="string"&&typeof json.evidence==="string",cardCount:cards.length,cards:results}),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
}};