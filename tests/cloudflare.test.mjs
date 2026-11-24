import test from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import worker,{normalizeClient,burstLimited} from "../cloudflare/worker.mjs";
import {configuredOrigin,publicSiteOrigin} from "../lib/site-origin.mjs";
test("trusted configuration cannot accept an arbitrary redirect URL",()=>{
 assert.equal(publicSiteOrigin({}),"https://saynue.vercel.app");
 assert.equal(publicSiteOrigin({SAYNUE_PUBLIC_ORIGIN:"https://saynue.example"}),"https://saynue.example");
 for(const v of ["http://example.com","https://example.com/path","https://x@example.com","https://example.com?x=1"])assert.equal(configuredOrigin(v),null);
});
test("Cloudflare ingress replaces spoofed forwarding headers",()=>{
 const req=new Request("https://saynue.example/api/analyze",{method:"POST",body:"{}",headers:{"cf-connecting-ip":"192.0.2.10","x-vercel-forwarded-for":"192.0.2.11","x-forwarded-for":"192.0.2.12"}});
 const r=normalizeClient(req);assert.equal(r.headers.get("x-vercel-forwarded-for"),"192.0.2.10");assert.equal(r.headers.get("x-forwarded-for"),null);
});
test("root, API dispatch, and staging auth fail closed",async()=>{
 const env={ASSETS:{fetch:r=>new Response(new URL(r.url).pathname)}};
 const base="https://saynue.example";
 assert.equal(await (await worker.fetch(new Request(base+"/"),env)).text(),"/index.html");
 assert.equal((await worker.fetch(new Request(base+"/api/nope"),env)).status,404);
 assert.equal((await worker.fetch(new Request(base+"/api/analyze"),env)).status,405);
 assert.equal((await worker.fetch(new Request(base+"/api/auth/start",{method:"POST"}),env)).status,503);
 assert.equal(await (await worker.fetch(new Request(base+"/assets/app.js"),env)).text(),"/assets/app.js");
});
test("static build excludes backend, tests, configuration and secrets; staged search indexing is disabled",async()=>{
 execFileSync(process.execPath,["scripts/build-cloudflare.mjs"],{env:{...process.env,SAYNUE_INDEXABLE:"false",SAYNUE_PUBLIC_ORIGIN:"https://saynue.example"}});
 const entries=await readdir(".cloudflare-public");
 for(const forbidden of ["api","lib","docs","tests",".github","wrangler.jsonc",".env","README.md"])assert.ok(!entries.includes(forbidden));
 assert.match(await readFile(".cloudflare-public/_headers","utf8"),/X-Robots-Tag: noindex, nofollow/);
 assert.match(await readFile(".cloudflare-public/robots.txt","utf8"),/Disallow: \//);
 assert.match(await readFile(".cloudflare-public/index.html","utf8"),/https:\/\/saynue\.example\//);
 // Self-hosted fonts ship with their licence and a year-long immutable cache.
 const fonts=await readdir(".cloudflare-public/assets/fonts/pretendard-1.3.9");
 assert.equal(fonts.filter(f=>f.endsWith(".woff2")).length,92);
 assert.ok(fonts.includes("LICENSE.txt")&&fonts.includes("pretendard.css"));
 assert.match(await readFile(".cloudflare-public/_headers","utf8"),/\/assets\/fonts\/\*\n  Cache-Control: public, max-age=31536000, immutable/);
 assert.ok((await readdir(".cloudflare-public/assets")).includes("theme.js"));
});

test("staging canonical points to Cloudflare without enabling indexing",async()=>{
 const env={...process.env,SAYNUE_PUBLIC_ORIGIN:"",SAYNUE_INDEXABLE:"false"};
 execFileSync(process.execPath,["scripts/build-cloudflare.mjs"],{env});
 const html=await readFile(".cloudflare-public/index.html","utf8");assert.match(html,/rel="canonical" href="https:\/\/saynue\.dark-smoke-6a9b\.workers\.dev\//);assert.doesNotMatch(html,/saynue\.vercel\.app/);
 assert.ok((await readdir(".cloudflare-public/assets")).includes("locale.js"));
 assert.throws(()=>execFileSync(process.execPath,["scripts/build-cloudflare.mjs"],{env:{...env,SAYNUE_INDEXABLE:"true"},stdio:"pipe"}));
});

test("requests the burst limiter lets through still reach their route with the body intact",async()=>{
 const allow={limit:async()=>({success:true})};
 const env={AI_BURST_LIMITER:allow,API_BURST_LIMITER:allow,ASSETS:{fetch:()=>new Response("asset")}};
 const old=process.env.GEMINI_API_KEY,oldFetch=global.fetch;
 process.env.GEMINI_API_KEY="unit-test-only";
 global.fetch=async()=>{throw Error("no model call for invalid input")};
 try{
  const post=(path,body)=>new Request("https://saynue.example"+path,{method:"POST",headers:{"cf-connecting-ip":"192.0.2.9","content-type":"application/json","origin":"https://saynue.example"},body});
  // An invalid body must be read and rejected by the handler (400), never crash the Worker (500).
  const analyze=await worker.fetch(post("/api/analyze","{}"),env);
  assert.equal(analyze.status,400);assert.equal((await analyze.json()).code,"INVALID_INPUT");
  const coach=await worker.fetch(post("/api/coach","{}"),env);
  assert.notEqual(coach.status,500);
  const feedback=await worker.fetch(post("/api/feedback",JSON.stringify({rating:"bad-value"})),env);
  assert.equal(feedback.status,400);
 }finally{
  global.fetch=oldFetch;
  if(old===undefined)delete process.env.GEMINI_API_KEY;else process.env.GEMINI_API_KEY=old;
 }
});

test("Cloudflare burst limits guard Gemini routes per IP and fail open",async()=>{
 const seen=[];
 const limiter=(allow)=>({limit:async({key})=>{seen.push(key);return {success:allow}}});
 const env={AI_BURST_LIMITER:limiter(false),API_BURST_LIMITER:limiter(true),ASSETS:{fetch:()=>new Response("asset")}};
 const req=(path,ip="192.0.2.7")=>new Request("https://saynue.example"+path,{method:"POST",headers:{"cf-connecting-ip":ip,"content-type":"application/json"},body:"{}"});
 for(const path of ["/api/analyze","/api/coach","/api/simulate"]){
  const r=await worker.fetch(req(path),env);
  assert.equal(r.status,429,path);assert.equal(r.headers.get("retry-after"),"60");
 }
 // Plus is checked against the configured host first, then the same AI limiter.
 assert.equal(await burstLimited(req("/api/plus/report"),env,"/api/plus/report"),true);
 assert.ok(seen.length>0&&seen.every(k=>/^[0-9a-f]{32}$/.test(k)&&k===seen[0]),"one stable hashed key per client");
 assert.ok(!seen.some(k=>k.includes("192.0.2.7")),"the raw IP is never a limiter key");
 // Non-AI routes use the looser limiter (allowing here) and webhooks are exempt.
 assert.equal(await burstLimited(req("/api/feedback"),env,"/api/feedback"),false);
 assert.equal(await burstLimited(req("/api/webhooks/paddle"),{AI_BURST_LIMITER:limiter(false),API_BURST_LIMITER:limiter(false)},"/api/webhooks/paddle"),false);
 // Missing binding, missing IP or a limiter error never blocks a request.
 assert.equal(await burstLimited(req("/api/analyze"),{},"/api/analyze"),false);
 assert.equal(await burstLimited(new Request("https://saynue.example/api/analyze",{method:"POST"}),env,"/api/analyze"),false);
 assert.equal(await burstLimited(req("/api/analyze"),{AI_BURST_LIMITER:{limit:async()=>{throw Error("down")}}},"/api/analyze"),false);
 const raw=await (await import("node:fs/promises")).readFile("wrangler.jsonc","utf8");
 const config=JSON.parse(raw.replace(/^\s*\/\/.*$/gm,""));
 assert.deepEqual(config.ratelimits.map(r=>[r.name,r.simple.period]),[["AI_BURST_LIMITER",60],["API_BURST_LIMITER",60]]);
 assert.equal(config.observability.enabled,true);
 assert.equal(config.observability.logs.invocation_logs,false,"request metadata such as client IPs stays out of Workers Logs");
});

