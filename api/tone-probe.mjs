// TEMPORARY synthetic-only tone integration probe. Remove after check.
import analyze from "./analyze.mjs";
export default {async fetch(req){
  const url=new URL(req.url);
  if(req.method!=="GET"||url.searchParams.get("gate")!=="tone-qa-20261117-a3c92")return new Response("Not Found",{status:404});
  const payload={platform:"line",relation:"friends",goal:"reply",replyTone:"warm",locale:"ja",chatText:"私: 今日は少し落ち込んでるんだ。 相手: そうだったんだ、大変だったね。無理しなくていいよ。 私: 聞いてくれてありがとう。 相手: いつでも話してね。"};
  const res=await analyze.fetch(new Request(new URL("/api/analyze",req.url),{
    method:"POST",headers:{"content-type":"application/json","x-vercel-forwarded-for":"198.51.100.231"},body:JSON.stringify(payload)}));
  const obj=await res.json().catch(()=>({}));
  const result={status:res.status,code:obj.code||"OK",locale:payload.locale,tone:payload.replyTone,validFields:["verdict","warmthScore","reciprocityScore","evidenceLevel","keySignal","evidence","alternative","nextStep","replyDraft","replyWhy"].every(k=>Object.hasOwn(obj,k)),replyIsJapanese:/[\u3040-\u30ff]/.test(obj.replyDraft||""),hasReason:typeof obj.replyWhy==="string"&&obj.replyWhy.length>5};
  return new Response(JSON.stringify(result),{headers:{"content-type":"application/json","Cache-Control":"no-store"}});
}};