import test from "node:test";
import assert from "node:assert/strict";
import {readFile,readdir} from "node:fs/promises";
import {execFileSync} from "node:child_process";
import worker,{normalizeClient} from "../cloudflare/worker.mjs";
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
