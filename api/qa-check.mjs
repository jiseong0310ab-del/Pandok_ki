// TEMPORARY: synthetic quality-only endpoint. Delete immediately after QA.
import analyze from "./analyze.mjs";
import feedback from "./feedback.mjs";
import {cases} from "../tests/quality-cases.mjs";
const allowed=new Set(["ko01","ja05","en04","zhc01","zht02","en02"]);
export default {async fetch(request){
  const u=new URL(request.url);
  const caseId=u.searchParams.get("case");
  if(request.method==="GET"&&u.searchParams.get("gate")==="synthetic-suite-19d7ec"&&caseId==="feedback"){
    const internal=new Request(new URL("/api/feedback",u.origin),{
      method:"POST",headers:{"content-type":"application/json","x-vercel-forwarded-for":"192.0.2.188","origin":u.origin},
      body:JSON.stringify({rating:"helpful",goal:"understand",locale:"en"})
    });
    const result=await feedback.fetch(internal);
    const data=await result.json().catch(()=>({}));
    return new Response(JSON.stringify({status:result.status,ok:data.ok===true,code:data.code||null}),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
  }
  if(request.method!=="GET"||u.searchParams.get("gate")!=="synthetic-suite-19d7ec"||!allowed.has(caseId))return new Response("Not Found",{status:404});
  const c=cases.find(x=>x.id===caseId);
  if(!c)return new Response("Not Found",{status:404});
  const req=new Request(new URL("/api/analyze",request.url),{
    method:"POST",
    headers:{"Content-Type":"application/json","x-vercel-forwarded-for":"192.0.2."+(100+[...allowed].indexOf(caseId))},
    body:JSON.stringify({platform:c.platform,relation:c.relation,goal:c.goal,locale:c.locale,chatText:c.chatText})
  });
  const result=await analyze.fetch(req);
  const data=await result.json().catch(()=>({}));
  return new Response(JSON.stringify({id:c.id,focus:c.focus,locale:c.locale,goal:c.goal,status:result.status,code:data.code||"OK",evidenceLevel:data.evidenceLevel||null,verdict:typeof data.verdict==="string"?data.verdict.slice(0,220):null,keySignal:typeof data.keySignal==="string"?data.keySignal.slice(0,480):null,alternative:typeof data.alternative==="string"?data.alternative.slice(0,450):null,replyDraft:typeof data.replyDraft==="string"?data.replyDraft.slice(0,480):null,replyWhy:typeof data.replyWhy==="string"?data.replyWhy.slice(0,400):null}),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
}};