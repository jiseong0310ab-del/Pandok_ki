// TEMPORARY synthetic-only persona integration test; remove after verification.
// Public user input is never accepted. No conversation strings are returned.
import analyze from "./analyze.mjs";
const examples={
 court:{locale:"ko",relation:"dating",goal:"repair",platform:"kakao",chatText:"나: 약속을 취소할 때는 미리 말해줬으면 좋겠어. 상대: 갑자기 일이 생겨서 미안해. 나: 그래도 기다리고 있어서 서운했어.",caseContext:"두 사람이 약속 변경 문제로 다퉜고, 어느 한쪽만 잘못한 것인지보다 해결 방안을 알고 싶습니다."},
 work:{locale:"ja",relation:"work",goal:"reply",platform:"line",chatText:"上司：明日の午前中までに資料を提出できますか？ 私：今は別の依頼を進めています。 上司：難しいなら先に状況を教えてください。",caseContext:"上司に提出可能な範囲を丁寧に伝えたい。納期は勝手に約束しない。"},
 romance:{locale:"en",relation:"talking",goal:"understand",platform:"whatsapp",chatText:"Me: Want to grab coffee next week? Them: Sure, how about Wednesday? Me: Wednesday works. What time? Them: Around six would be fine.",caseContext:"Understand the conversation without making assumptions about romantic feelings."},
 mediator:{locale:"ko",relation:"friends",goal:"repair",platform:"kakao",chatText:"나: 어제 연락을 못 받아서 서운했어. 친구: 중요한 일이 생겨서 답장을 못했어. 나: 다음에는 바쁘다고만 알려줬으면 좋겠어.",caseContext:"친구와의 오해를 과장하지 않고 대화하고 싶습니다."}
};
export default {async fetch(request){
 const u=new URL(request.url);
 const mode=u.searchParams.get("mode");
 if(request.method!=="GET"||u.searchParams.get("gate")!=="persona-qa-20261117-b17c38fd2d8f"||!Object.hasOwn(examples,mode))return new Response("Not Found",{status:404});
 const data={...examples[mode],persona:mode,replyTone:"natural"};
 const response=await analyze.fetch(new Request(new URL("/api/analyze",u.origin),{
  method:"POST",
  headers:{"content-type":"application/json","origin":u.origin,"x-vercel-forwarded-for":"198.51.100."+({court:171,work:172,romance:173,mediator:174}[mode])},
  body:JSON.stringify(data)
 }));
 const report=await response.json().catch(()=>({}));
 const fields=["summary","sectionOne","sectionTwo","sectionThree","nextStep","replyWhy","evidenceLevel","sourceQuote"];
 return new Response(JSON.stringify({status:response.status,code:report.code||"OK",persona:report.persona||null,locale:data.locale,valid:fields.every(k=>typeof report[k]==="string"&&report[k].length>0)&&report.persona===mode,sections:[report.sectionOne?.length||0,report.sectionTwo?.length||0,report.sectionThree?.length||0],evidenceLevel:report.evidenceLevel||null,sourceVerified:report.sourceVerified??null,replyReady:typeof report.replyDraft==="string"&&report.replyDraft.length>0,reason:report.code==="AI_INVALID_OUTPUT"?"SCHEMA_OR_MODEL":null}),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
}};