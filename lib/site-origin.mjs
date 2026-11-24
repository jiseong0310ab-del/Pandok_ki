// Only trusted deployment configuration may determine authentication/payment callbacks.
export function configuredOrigin(value){
 if(typeof value!=="string"||!value)return null;
 try{const u=new URL(value);return u.protocol==="https:"&&!u.username&&!u.password&&!u.port&&u.pathname==="/"&&!u.search&&!u.hash?u.origin:null}catch{return null}
}
export function publicSiteOrigin(env=process.env){
 return configuredOrigin(env.SAYNUE_PUBLIC_ORIGIN)||"https://saynue.vercel.app";
}
