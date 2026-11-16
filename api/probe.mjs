// Temporary synthetic integration probe. Remove after verification.
import analyze from "./analyze.mjs";
export default { async fetch(request) {
  if(request.method!=="GET" || new URL(request.url).searchParams.get("ticket")!=="check-ja-2026-11-17-fbf751") return new Response("Not found",{status:404});
  const sample={platform:"line",relation:"talking",locale:"ja",chatText:"私: 来週末、カフェで会える？\n相手: 今週は忙しいけど、来週の予定は確認してみる！\n私: ありがとう、予定が分かったら教えてね。"};
  const r=await analyze.fetch(new Request(new URL("/api/analyze",request.url),{method:"POST",headers:{"Content-Type":"application/json","x-vercel-forwarded-for":"198.51.100.200"},body:JSON.stringify(sample)}));
  const data=await r.json().catch(()=>({}));
  const summary={httpStatus:r.status,code:data.code||"OK",resultPresent:!!(data.verdict&&data.keySignal&&data.nextStep),languageLikelyJapanese:!!(data.verdict&&/[\u3040-\u30ff\u4e00-\u9fff]/.test(data.verdict))};
  return new Response(JSON.stringify(summary),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
}};