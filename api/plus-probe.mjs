// TEMPORARY: synthetic-only Plus engine validation. Delete after verification.
import {generatePlusReport} from "../lib/plus-coach.mjs";
export default {async fetch(request){
 const url=new URL(request.url);
 if(request.method!=="GET"||url.searchParams.get("gate")!=="plus-check-20261117-f81bd")return new Response("Not Found",{status:404});
 const input={locale:"ko",relation:"friends",goal:"reply",replyTone:"natural",chatText:"나: 이번 주 토요일 저녁에 커피 마실래? 친구: 토요일은 아르바이트라서 못 가. 대신 다음 주 수요일 저녁은 어때? 나: 수요일 좋다! 친구: 좋아, 그럼 시간은 다시 정하자."};
 let response={};
 try{
  const plus=await generatePlusReport(input,{apiKey:process.env.GEMINI_API_KEY});
  response={status:"PASS",shouldReply:plus.shouldReply,choices:plus.choices.length,choiceKinds:plus.choices.map(x=>x.approach),reactionKinds:plus.reactions.map(x=>x.reaction),hasCaution:plus.finalCaution.length>=8,hasTradeoffs:plus.choices.every(x=>x.tradeoff.length>=8)};
 }catch(e){response={status:"FAIL",code:String(e.message||"unknown").slice(0,60)}}
 return new Response(JSON.stringify(response),{status:200,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
}};