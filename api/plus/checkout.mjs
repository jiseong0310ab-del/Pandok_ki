import {publicSiteOrigin} from "../../lib/site-origin.mjs";
// Creates a Paddle SANDBOX transaction only for a server-verified user.
// Checkout must not open unless a server-owned transaction->user binding
// has been persisted. Real payments are explicitly unsupported.
import {checkSameOrigin,getAuthenticatedUser} from "../../lib/saynue-auth.mjs";
import {supabaseConfig,storeCheckoutIntent,listUserSubscriptions} from "../../lib/saynue-storage.mjs";
import {activeSubscription} from "../../lib/paddle-billing.mjs";

const base={"Content-Type":"application/json","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"};
const reply=(code,status,headers=new Headers())=>{
 for(const [k,v] of Object.entries(base))headers.set(k,v);
 return new Response(JSON.stringify({code}),{status,headers});
};
const validTransaction=id=>typeof id==="string"&&/^txn_[a-z0-9]{10,64}$/.test(id);
export default {async fetch(request){
 if(request.method!=="POST")return reply("METHOD_NOT_ALLOWED",405);
 if(!checkSameOrigin(request))return reply("FORBIDDEN",403);
 if(process.env.SAYNUE_ENABLE_SANDBOX_CHECKOUT!=="true"||process.env.SAYNUE_PADDLE_ENV!=="sandbox"||!supabaseConfig()||!process.env.PADDLE_API_KEY)return reply("CHECKOUT_DISABLED",503);
 const headers=new Headers();
 const {user}=await getAuthenticatedUser(request,headers);
 if(!user)return reply("LOGIN_REQUIRED",401,headers);
 const priceId=process.env.SAYNUE_PADDLE_SANDBOX_PRICE_ID||"pri_01m7k4h86fsasy85vxy1w5d1bw";
 try{
  const owned=await listUserSubscriptions(user.id);
  if(owned.some(s=>activeSubscription(s,priceId)))return reply("ALREADY_SUBSCRIBED",409,headers);
 }catch(_){return reply("STORAGE_UNAVAILABLE",503,headers)}
 let transaction;
 try{
  const result=await fetch("https://sandbox-api.paddle.com/transactions",{
   method:"POST",headers:{"Authorization":"Bearer "+process.env.PADDLE_API_KEY,"Content-Type":"application/json"},
   body:JSON.stringify({
    items:[{price_id:priceId,quantity:1}],
    collection_mode:"automatic",
    checkout:{url:publicSiteOrigin()+"/sandbox-checkout.html"},
    custom_data:{saynue_origin:"server-authenticated-sandbox"}
   }),
   signal:AbortSignal.timeout(9000),
   cache:"no-store"
  });
  if(!result.ok)throw Error("PADDLE_UNAVAILABLE");
  transaction=(await result.json())?.data;
  if(!validTransaction(transaction?.id))throw Error("PADDLE_BAD_RESPONSE");
 }catch(_){return reply("CHECKOUT_UNAVAILABLE",503,headers)}
 try{
  await storeCheckoutIntent({transactionId:transaction.id,userId:user.id,priceId});
 }catch(_){
  // An unused transaction is safer than an untracked checkout.
  return reply("STORAGE_UNAVAILABLE",503,headers);
 }
 // Construct an origin-pinned link only after the server-owned transaction
 // has been written to the database. The browser must NOT use the public price
 // when following this link; Paddle.js opens the transaction by ID.
 const checkout=publicSiteOrigin()+"/sandbox-checkout.html?_ptxn="+encodeURIComponent(transaction.id);
 for(const [k,v] of Object.entries(base))headers.set(k,v);
 return new Response(JSON.stringify({code:"SANDBOX_TRANSACTION_CREATED",transactionId:transaction.id,checkoutUrl:checkout}),{status:200,headers});
}};
