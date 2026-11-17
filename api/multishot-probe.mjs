// TEMPORARY: synthetic blank JPEG multipart API integration test; REMOVE immediately.
import app from "./analyze.mjs";
const jpeg="/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDADUlKC8oITUvKy88OTU/UIVXUElJUKN1e2GFwarLyL6qurfV8P//1eL/5re6////////////zv//////////////2wBDATk8PFBGUJ1XV53/3Lrc////////////////////////////////////////////////////////////////////wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAX/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFAEBAAAAAAAAAAAAAAAAAAAAAP/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKYAP//Z";
export default {async fetch(request){
  const u=new URL(request.url);
  if(request.method!=="GET"||u.searchParams.get("gate")!=="20261117-multi-jpeg-test-9af1")return new Response("Not Found",{status:404});
  const data={platform:"line",relation:"friends",locale:"en",goal:"understand",replyTone:"natural",chatText:"",images:[{mimeType:"image/jpeg",base64:jpeg},{mimeType:"image/jpeg",base64:jpeg}]};
  const response=await app.fetch(new Request(new URL("/api/analyze",u.origin),{method:"POST",headers:{"content-type":"application/json","x-vercel-forwarded-for":"198.51.100.244"},body:JSON.stringify(data)}));
  const body=await response.json().catch(()=>({}));
  const required=["verdict","warmthScore","reciprocityScore","evidenceLevel","keySignal","evidence","alternative","nextStep","replyDraft","replyWhy"];
  return new Response(JSON.stringify({status:response.status,code:body.code||"OK",fieldsComplete:required.every(k=>Object.hasOwn(body,k)),evidenceLevel:body.evidenceLevel||null}),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
}};