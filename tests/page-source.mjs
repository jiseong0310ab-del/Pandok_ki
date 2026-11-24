// Test helper: the homepage as the browser assembles it. The controller script
// lives in assets/app.js (so the CSP needs no 'unsafe-inline'); inlining it
// here lets content assertions keep covering markup and script together.
import fs from "node:fs";
const read=name=>fs.readFileSync(new URL("../"+name,import.meta.url),"utf8");
export const homeHtml=read("index.html");
export const appScript=read("assets/app.js");
const TAG='<script src="/assets/app.js"></script>';
if(!homeHtml.includes(TAG))throw Error("index.html must load /assets/app.js");
export const homeWithScript=homeHtml.replace(TAG,()=>"<script>\n"+appScript+"</script>");
