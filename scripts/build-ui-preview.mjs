// Build a SAFE, static mobile UI review from SAYNUE's actual interface.
// Only source HTML/CSS/visual assets are used. No secrets or server API are deployed.
// Demo results are generated locally in the visitor's browser; Gemini/Paddle disabled.
import {readFile,writeFile,copyFile,mkdir,rm} from "node:fs/promises";
import {join} from "node:path";

const out="_pages_preview";
await rm(out,{recursive:true,force:true});
await mkdir(join(out,"assets"),{recursive:true});
await mkdir(join(out,"preview"),{recursive:true});

let html=await readFile("index.html","utf8");
if(!html.includes('id="personas"')||!html.includes('id="results"'))throw Error("Source UI markers not found");
if(!html.includes('<script src="/assets/screenshot-editor.js"'))throw Error("Cannot locate required screenshot editor script");

// GitHub project Pages paths are nested under /<repo>/, not at the domain root.
html=html.replace(/\b(href|src)="\/(assets\/[^"]+|favicon\.svg)"/g,(_m,attr,path)=>attr+'="./'+path+'"');
html=html.replace(/\bhref="\/"/g,'href="./"');
html=html.replace(/\bhref="\/(plans\.html|guide\.html|account\.html)"/g,(_m,path)=>'href="https://saynue.vercel.app/'+path+'"');

// Everything else stays the real SAYNUE HTML and client interaction system.
const editor='<script src="./assets/screenshot-editor.js"></script>';
if(!html.includes(editor))throw Error("Preview screenshot editor path rewriting failed");
html=html.replace(editor,editor+'\n<script src="./preview/demo-api.js" defer></script>');

// Demo API must run before app inline script: defer executes only after parse,
// so use a synchronous local mock loaded before the existing inline main script.
html=html.replace('<script src="./preview/demo-api.js" defer></script>', '<script src="./preview/demo-api.js"></script>');

// Clarify that the static demonstration has NO external AI data processing.
// Removing data-i prevents the production locale script from restoring real-API copy.
html=html.replace(/<span data-i="consent">[\s\S]*?<\/span>/,
 '<span>UI 미리보기 전용: 입력 내용은 외부 AI로 전송하지 않습니다. 가상 대화로 테스트해 주세요. (UI only: no AI data transfer.)</span>');
html=html.replace(/<div class="notice" data-i="privacyNote">[\s\S]*?<\/div>/,
 '<div class="notice">UI DEMO · Gemini, 결제 및 계정 API를 호출하지 않습니다. 입력한 대화는 브라우저 밖으로 보내지지 않습니다.</div>');
// Avoid a fake "feedback submitted" acknowledgement in this visual-only environment.
html=html.replace('</head>','<style>#feedbackCard{display:none!important}</style></head>');

const banner='<aside class="preview-banner" role="note" aria-label="Preview mode"><strong>UI PREVIEW</strong><span>화면 테스트 전용 · 분석 결과는 예시입니다 · AI/결제 연결 없음</span></aside>';
html=html.replace('<main class="wrap">','<main class="wrap">\n'+banner);

// The original page makes no network requests until the user deliberately submits.
// A static preview doesn't send any conversation; the mock intercepts ALL API endpoints.
html=html.replace('<meta name="referrer" content="no-referrer">','<meta name="referrer" content="no-referrer">\n<meta name="robots" content="noindex,nofollow">');
html=html.replace('<title>SAYNUE · Read Between the Lines</title>','<title>SAYNUE · UI PREVIEW (demo)</title>');
html=html.replace('</head>','<style>.preview-banner{display:flex;gap:9px;align-items:center;flex-wrap:wrap;padding:10px 12px;margin:0 0 16px;border:1px solid #736492;border-radius:10px;background:#2b2840;color:#e7dff9;font-size:11px;line-height:1.5}.preview-banner strong{font-size:10px;letter-spacing:1px;color:#d5c3f5}@media(max-width:620px){.preview-banner{margin:0 0 12px;padding:8px 11px;font-size:10px}}</style>\n</head>');

for(const path of ["assets/site.css","assets/screenshot-editor.js","assets/saynue-mark.svg","favicon.svg"]){
 const destination=join(out,path);
 await copyFile(path,destination);
}
await copyFile("preview/demo-api.js",join(out,"preview/demo-api.js"));
await writeFile(join(out,"index.html"),html);
await writeFile(join(out,".nojekyll"),"");
console.log("Static SAYNUE UI demo built: no API keys, server APIs, or payment components deployed.");
