import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

const home=fs.readFileSync(new URL("../index.html",import.meta.url),"utf8");
const css=fs.readFileSync(new URL("../assets/site.css",import.meta.url),"utf8");
const script=home.match(/<script>([\s\S]*?)<\/script>/)?.[1]||"";
const slice=(start,end)=>{
 const a=home.indexOf(start),b=home.indexOf(end,a+start.length);
 assert.ok(a>=0&&b>a,"Expected markers missing: "+start+" / "+end);
 return home.slice(a,b);
};

test("mobile first-use flow foregrounds compact expert selection and one conversation input",()=>{
 const choices=[...home.matchAll(/<button[^>]*data-persona="([^"]+)"[^>]*>([\s\S]*?)<\/button>/g)];
 assert.equal(choices.length,5);
 assert.deepEqual(choices.map(x=>x[1]),["standard","court","work","romance","mediator"]);
 for(const [,mode,content] of choices){
  assert.doesNotMatch(content,/\p{Extended_Pictographic}/u,"Decorative icon in "+mode);
  assert.match(content,/class="persona-title"/);
 }
 const form=slice('<section class="card analyzer"','</section>\n<div class="trust-row"');
 assert.ok(form.indexOf('id="personas"')<form.indexOf('id="analysisOptions"'));
 assert.ok(form.indexOf('id="analysisOptions"')<form.indexOf('id="chatText"'));
 assert.ok(form.indexOf('id="chatText"')<form.indexOf('id="analyze"'));
 assert.match(form,/<details[^>]*id="analysisOptions"/);
 assert.match(form,/<details[^>]*id="personaContextBox"/);
 assert.doesNotMatch(form,/<details[^>]*id="analysisOptions"[^>]*\sopen(?:=|\s|>)/);
 assert.doesNotMatch(form,/<details[^>]*id="personaContextBox"[^>]*\sopen(?:=|\s|>)/);
 assert.match(script,/function updateSettingsSummary\(/);
 assert.doesNotMatch(form,/id="platforms"|data-platform=/);
 assert.doesNotMatch(script,/choosePlatform|PLATFORM_NAMES|reportPlatform/);
 assert.match(script,/function updateSettingsSummary\(/);
 assert.match(script,/function chooseRelation\(r\).*updateSettingsSummary/);
 assert.match(script,/JSON\.stringify\(\{relation:relation,goal:goal,replyTone:replyTone,locale:locale,persona:persona,/);
 assert.match(script,/function chooseRelation\(r\).*updateSettingsSummary/);
});
test("expert reports foreground summary, next step and reply before deeper explanation",()=>{
 const persona=slice('<section class="card persona-result','<div class="card" id="shareCard">');
 const required=['id="personaSummary"','id="personaNextStep"','id="personaDraft"','id="personaExplain"','id="personaSectionOne"'];
 for(let i=0;i<required.length-1;i++)assert.ok(persona.indexOf(required[i])<persona.indexOf(required[i+1]),required[i]);
 assert.match(persona,/<details[^>]*id="personaExplain"/);
 assert.match(persona,/data-i="personaMicroCaution"/);
 assert.match(script,/if\(scroll\)\$\("personaExplain"\)\.open=false/);
});
test("standard reports place actual next step and reply before score/evidence detail",()=>{
 const standard=slice('<div class="card" id="shareCard">','<div class="feedback-card" id="feedbackCard">');
 const required=['id="verdict"','id="signal"','id="nextStep"','id="replyDraft"','id="standardExplain"','id="warmth"','id="evidenceCardsPanel"'];
 for(let i=0;i<required.length-1;i++)assert.ok(standard.indexOf(required[i])<standard.indexOf(required[i+1]),required[i]);
 assert.match(standard,/<details[^>]*id="standardExplain"/);
 assert.match(standard,/class="evidence insight-next-action"/);
 assert.match(script,/if\(scroll\)\$\("standardExplain"\)\.open=false/);
});
test("mobile decorative content is hidden without disabling essential privacy and masking controls",()=>{
 assert.match(css,/@media\(max-width:620px\)/);
 assert.match(css,/\.trust-row,\.preview-section,\.plus-peek\{display:none!important\}/);
 assert.match(css,/\.persona-option,\s*\.persona-option:first-child/);
 assert.match(css,/\.persona-option \.persona-caption/);
 assert.match(css,/\.analysis-options-summary/);
 assert.match(css,/\.insight-details summary/);
 for(const id of ['consent','maskText','chatText','chatImage','chatImage','analyze','personaCopyStatus','personaQuoteNotice'])assert.ok(home.includes('id="'+id+'"'),id);
 assert.match(home,/id="consent"/);
 assert.match(home,/data-i="privacyNote"/);
 assert.match(home,/id="personaContextCaution"/);
 assert.match(home,/id="shotConfirm"/);
});
test("all five locales have translations for progressive disclosure controls",()=>{
 const begin=script.indexOf("const T=")+8,end=script.indexOf("const API_ERRORS",begin);
 assert.ok(begin>7&&end>begin);
 const T=new Function("return ("+script.slice(begin,end).trim().replace(/;\s*$/,"")+")")();
 const keys=["analysisOptionsTitle","standardExplainTitle","personaExplainTitle","personaMicroCaution"];
 const langs=["ko","ja","en","zh-CN","zh-TW"];
 assert.deepEqual(Object.keys(T),langs);
 for(const lang of langs)for(const key of keys){
  assert.equal(typeof T[lang][key],"string",lang+"."+key);
  assert.ok(T[lang][key].length>6);
 }
 new Function(script);
});


test("capture-first tabs place screenshots on the left and select the image panel by default",()=>{
 const form=slice('<section class="card analyzer"','</section>\n<div class="trust-row"');
 const head=form.indexOf('id="inputTabs"'),left=form.indexOf('id="imageTab"'),right=form.indexOf('id="textTab"');
 assert.ok(head>0&&head<left&&left<right);
 const imageTag=form.match(/<button[^>]*id="imageTab"[^>]*>/)?.[0]||"";
 const textTag=form.match(/<button[^>]*id="textTab"[^>]*>/)?.[0]||"";
 assert.match(imageTag,/aria-selected="true"/);
 assert.match(imageTag,/aria-controls="imageBox"/);
 assert.match(imageTag,/tabindex="0"/);
 assert.match(textTag,/aria-selected="false"/);
 assert.match(textTag,/aria-controls="textBox"/);
 assert.match(textTag,/tabindex="-1"/);
 assert.match(form,/<div id="imageBox" role="tabpanel" aria-labelledby="imageTab">/);
 assert.match(form,/<div id="textBox" class="hidden" role="tabpanel" aria-labelledby="textTab">/);
 assert.match(form,/<div class="sample-row">/);
 assert.ok(form.indexOf('id="sample"')>form.indexOf('id="textBox"'));
 assert.match(script,/mode="image",lastResult=null/);
 assert.match(script,/updatePersonaUI\(\);switchMode\("image"\)/);
 assert.match(script,/"ArrowLeft","ArrowRight","Home","End"/);
});

test("live tab switching correctly shows and labels only the active input panel",()=>{
 const start=script.indexOf("function switchMode(m){");
 const end=script.indexOf('$("textTab").addEventListener',start);
 assert.ok(start>=0&&end>start);
 const subset=script.slice(start,end);
 const elements={};
 const el=id=>{
  if(!elements[id]){
   const classes=new Set();
   elements[id]={
    attributes:{},dataset:{},tabIndex:0,textContent:"",
    setAttribute(name,value){this.attributes[name]=value;},
    classList:{
     contains(name){return classes.has(name);},
     toggle(name,enabled){if(enabled)classes.add(name);else classes.delete(name);}
    }
   };
  }
  return elements[id];
 };
 let dismissed=0;
 const driver=new Function("$","tx","hideError","mode",
  subset+"\nreturn {switchMode,getMode:()=>mode};")(el,key=>key,()=>dismissed++,"image");
 driver.switchMode("image");
 assert.equal(driver.getMode(),"image");
 assert.equal(el("imageTab").attributes["aria-selected"],"true");
 assert.equal(el("textTab").attributes["aria-selected"],"false");
 assert.equal(el("textBox").classList.contains("hidden"),true);
 assert.equal(el("imageBox").classList.contains("hidden"),false);
 assert.equal(el("inputModeLabel").dataset.i,"inputImageLabel");
 driver.switchMode("text");
 assert.equal(driver.getMode(),"text");
 assert.equal(el("imageTab").tabIndex,-1);
 assert.equal(el("textTab").tabIndex,0);
 assert.equal(el("textBox").classList.contains("hidden"),false);
 assert.equal(el("imageBox").classList.contains("hidden"),true);
 assert.equal(el("inputModeLabel").dataset.i,"inputTextLabel");
 assert.equal(dismissed,2);
});

test("five language-specific font stacks and readable mobile touch targets are present",()=>{
 const expectedFonts={
  ko:"Apple SD Gothic Neo",ja:"Hiragino Sans",
  "zh-CN":"PingFang SC","zh-TW":"PingFang TC",en:"SF Pro Text"
 };
 for(const [lang,font] of Object.entries(expectedFonts)){
  assert.match(css,new RegExp('html\\[lang="'+lang+'"\\] body\\{'));
  assert.ok(css.includes(font),lang+" missing native font");
 }
 assert.match(css,/#chatText,\s*#personaContext\{[\s\S]*?font-size:16px!important/);
 assert.match(css,/\.input-method-tabs \.tab\{[\s\S]*?min-height:48px/);
 assert.match(css,/\.shot-tools button\{min-height:44px/);
 assert.match(css,/\.shot-confirm\{min-height:48px/);
 assert.match(css,/html\[lang="ja"\] body\{[\s\S]*?line-break:strict/);
 assert.doesNotMatch(css,/@import\s+url\(/);
});

test("screenshot-first and text-tab instructions are localized for all supported languages",()=>{
 const begin=script.indexOf("const T=")+8,end=script.indexOf("const API_ERRORS",begin);
 const dict=new Function("return ("+script.slice(begin,end).trim().replace(/;\s*$/,"")+")")();
 for(const lang of ["ko","ja","en","zh-CN","zh-TW"]){
  for(const key of ["inputMethodLabel","inputImageLabel","inputTextLabel","textInputHint","imageTab","textTab","uploadLabel","uploadHint"]){
   assert.ok(typeof dict[lang][key]==="string"&&dict[lang][key].length>3,lang+"."+key);
  }
  assert.notEqual(dict[lang].imageTab,dict[lang].textTab);
  assert.notEqual(dict[lang].inputImageLabel,dict[lang].inputTextLabel);
 }
 assert.match(script,/\$\("inputTabs"\)\.setAttribute\("aria-label",tx\("inputMethodLabel"\)\)/);
 assert.match(script,/\$\("inputModeLabel"\)\.dataset\.i=m==="image"\?"inputImageLabel":"inputTextLabel"/);
});
