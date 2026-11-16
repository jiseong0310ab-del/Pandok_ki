import analyzer from "./analyze.mjs";
// TEMPORARY DIAGNOSTIC ROUTE — remove immediately after verification.
// Checks only Google model metadata, never sends user content or generates responses.
export default { async fetch(request) {
  const headers={"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
  if(request.method!=="GET")return new Response(JSON.stringify({code:"METHOD_NOT_ALLOWED"}),{status:405,headers});
  if(new URL(request.url).searchParams.get("probe")==="p4nD0k-verify-one-shot-5F8A2D1C9264E7B3"){
    const sample={platform:"kakao",relation:"talking",locale:"ko",chatText:"나: 이번 주말에 시간이 괜찮아? 같이 밥 먹을래? 상대: 이번 주는 일이 많아. 다음 주 일정 보고 연락해줄게."};
    const internalRequest=new Request(new URL("/api/analyze",request.url),{method:"POST",headers:{"content-type":"application/json","x-vercel-forwarded-for":"198.51.100.254"},body:JSON.stringify(sample)});
    const reply=await analyzer.fetch(internalRequest);
    const output=await reply.json().catch(()=>({}));
    return new Response(JSON.stringify({generationStatus:reply.status,code:output.code||"OK",fields:reply.ok?Object.keys(output):[]}),{headers});
  }
  const key=process.env.GEMINI_API_KEY;
  if(!key)return new Response(JSON.stringify({configured:false,modelAccessible:false,code:"NOT_CONFIGURED"}),{headers});
  const model=["gemini-2.5-flash","gemini-2.5-flash-lite"].includes(process.env.GEMINI_MODEL)?process.env.GEMINI_MODEL:"gemini-2.5-flash";
  try {
    const response=await fetch("https://generativelanguage.googleapis.com/v1beta/models/"+model,{
      headers:{"x-goog-api-key":key},signal:AbortSignal.timeout(12000),cache:"no-store"
    });
    let status="UNKNOWN";
    if(!response.ok)try{const data=await response.json();const s=String(data?.error?.status||"");if(/^[A-Z_]{3,50}$/.test(s))status=s}catch(_){}
    return new Response(JSON.stringify({configured:true,model,providerHttpStatus:response.status,providerErrorStatus:response.ok?null:status,modelAccessible:response.ok}),{headers});
  }catch(_){
    return new Response(JSON.stringify({configured:true,model,modelAccessible:false,code:"UPSTREAM_NETWORK_OR_TIMEOUT"}),{headers});
  }
}};