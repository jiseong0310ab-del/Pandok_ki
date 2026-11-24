// Copy only explicitly public files, never the repository or server source.
import {readdir,readFile,writeFile,mkdir,rm} from "node:fs/promises";
import {join} from "node:path";
import {fileURLToPath} from "node:url";
import {configuredOrigin} from "../lib/site-origin.mjs";
const root=fileURLToPath(new URL("../",import.meta.url));
const out=join(root,".cloudflare-public");
const oldOrigin="https://saynue.vercel.app";
const origin=configuredOrigin(process.env.SAYNUE_PUBLIC_ORIGIN);
const indexable=process.env.SAYNUE_INDEXABLE==="true";
if(indexable&&!origin)throw Error("Set SAYNUE_PUBLIC_ORIGIN before enabling indexing");
const pages=["index.html","account.html","guide.html","plans.html","data-notice.html","metrics.html","sandbox-checkout.html","favicon.svg","robots.txt","sitemap.xml"];
for(const folder of ["assets","learn"]){
 for(const item of await readdir(join(root,folder),{withFileTypes:true})){
  if(item.isFile()&&(folder==="assets"?/^[a-z0-9-]+\.(?:js|css|svg)$/i:/^[a-z0-9-]+\.html$/i).test(item.name))pages.push(folder+"/"+item.name);
 }
}
await rm(out,{recursive:true,force:true});
await mkdir(out,{recursive:true});
for(const name of pages){
 let data=await readFile(join(root,name),"utf8");
 if(origin&&(name.endsWith(".html")||name==="sitemap.xml"||name==="robots.txt"))data=data.replaceAll(oldOrigin,origin);
 if(name==="robots.txt"&&!indexable)data="User-agent: *\nDisallow: /\n";
 if(name==="sitemap.xml"&&!indexable)data='<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>\n';
 const destination=join(out,name);
 if(name.includes("/"))await mkdir(join(out,name.split("/")[0]),{recursive:true});
 await writeFile(destination,data);
}
const headers=[
"/*",
"  X-Frame-Options: DENY",
"  Content-Security-Policy: frame-ancestors 'none'",
"  X-Content-Type-Options: nosniff",
"  Referrer-Policy: no-referrer",
"  Permissions-Policy: camera=(), microphone=(), geolocation=(), usb=(), serial=(), bluetooth=()",
...(!indexable?["  X-Robots-Tag: noindex, nofollow"]:[]),
...["account.html","metrics.html","sandbox-checkout.html"].flatMap(p=>["/"+p,"  X-Robots-Tag: noindex, nofollow","  Cache-Control: no-store"])
].join("\n")+"\n";
await writeFile(join(out,"_headers"),headers);
console.log("Prepared "+pages.length+" public assets; indexing "+(indexable?"enabled":"disabled"));
