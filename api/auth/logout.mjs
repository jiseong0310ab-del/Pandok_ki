import {checkSameOrigin,clearSessionCookies,revokeServerSession} from "../../lib/saynue-auth.mjs";
export default {async fetch(request){
 if(request.method!=="POST")return new Response(null,{status:405,headers:{"Cache-Control":"no-store"}});
 if(!checkSameOrigin(request))return new Response(null,{status:403,headers:{"Cache-Control":"no-store"}});
 await revokeServerSession(request);
 const headers=new Headers({"Content-Type":"application/json","Cache-Control":"no-store"});
 clearSessionCookies(headers);
 return new Response(JSON.stringify({code:"SIGNED_OUT"}),{status:200,headers});
}};
