import {getAuthenticatedUser} from "../../lib/saynue-auth.mjs";
import {supabaseConfig} from "../../lib/saynue-storage.mjs";
import {listUserSubscriptions} from "../../lib/saynue-storage.mjs";
import {activeSubscription} from "../../lib/paddle-billing.mjs";
export default {async fetch(request){
 if(request.method!=="GET")return new Response(null,{status:405});
 const headers=new Headers({"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"});
 const session=await getAuthenticatedUser(request,headers);
 const hasDatabase=!!supabaseConfig();
 const result={authConfigured:session.configured,storageConfigured:hasDatabase,authenticated:!!session.user,plus:false,plusStatus:"unavailable"};
 if(session.user){
  result.email=session.user.email;
  if(hasDatabase){
   try{
    const subs=await listUserSubscriptions(session.user.id);
    const price=process.env.SAYNUE_PADDLE_SANDBOX_PRICE_ID||"pri_01m7k4h86fsasy85vxy1w5d1bw";
    result.plus=subs.some(s=>activeSubscription(s,price));
    result.plusStatus=result.plus?"active":"inactive";
   }catch(_){result.plusStatus="unavailable"}
  }
 }
 return new Response(JSON.stringify(result),{headers});
}};
