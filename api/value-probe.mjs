// TEMPORARY synthetic test route. Delete after integration verification.
import app from "./analyze.mjs";
export default {async fetch(request){
  const u=new URL(request.url);
  if(request.method!=="GET"||u.searchParams.get("test")!=="sv-11-17-bv47x9-test")return new Response("Not found",{status:404});
  const ja=u.searchParams.get("lang")==="ja";
  const payload=ja?
    {platform:"line",relation:"talking",locale:"ja",goal:"reply",chatText:"私: 来週末、カフェで会える？ 相手: 今週は忙しいけど、来週なら時間があるかも。私: また予定が分かったら教えてね。相手: うん、ありがとう！"}:
    {platform:"kakao",relation:"friends",locale:"ko",goal:"boundary",chatText:"나: 이번 주말에 만날래? 상대: 토요일 밤 늦게라도 꼭 만나자. 나: 토요일은 쉬고 싶어. 다음 주에 낮에 만나는 건 어때? 상대: 알았어."};
  const res=await app.fetch(new Request(new URL("/api/analyze",u.origin),{
    method:"POST",headers:{"content-type":"application/json","x-vercel-forwarded-for":ja?"198.51.100.216":"198.51.100.217"},
    body:JSON.stringify(payload)
  }));
  const data=await res.json().catch(()=>({}));
  const f=["verdict","warmthScore","reciprocityScore","evidenceLevel","keySignal","evidence","alternative","nextStep","replyDraft","replyWhy"];
  return new Response(JSON.stringify({http:res.status,code:data.code||"OK",fieldsComplete:f.every(x=>Object.hasOwn(data,x)),hasReply:typeof data.replyDraft==="string"&&data.replyDraft.length>6,reasonPresent:typeof data.replyWhy==="string"&&data.replyWhy.length>6,locale:payload.locale,goal:payload.goal,replyJapanese:ja?(/[\u3040-\u30ff]/.test(data.replyDraft||"")):undefined}),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
}};