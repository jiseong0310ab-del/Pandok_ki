// TEMPORARY DIAGNOSTIC ROUTE — remove immediately after verification.
// Checks only Google model metadata, never sends user content or generates responses.
export default { async fetch(request) {
  const headers={"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
  if(request.method!=="GET")return new Response(JSON.stringify({code:"METHOD_NOT_ALLOWED"}),{status:405,headers});
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