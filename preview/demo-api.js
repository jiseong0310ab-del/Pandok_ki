/* SAYNUE UI REVIEW ONLY — runs entirely in the browser.
 * This mock intentionally ignores chatText/images/caseContext and never transmits them.
 * No Gemini API, Supabase login, payment, or server endpoints are used.
 */
(function(){
 "use strict";
 const originalFetch=window.fetch.bind(window);
 const supported=new Set(["standard","court","work","romance","mediator"]);
 const copy={
 ko:{
  pre:"화면 예시 · 입력 내용은 실제로 분석하지 않았습니다.",
  court:"커플 갈등을 중재하는 결과 카드 예시",
  work:"업무 상황에 맞춘 답장 전략의 화면 예시",
  romance:"대화의 신호와 불확실성을 구분하는 화면 예시",
  mediator:"오해를 정리하고 관계 회복을 돕는 화면 예시",
  c1:"한쪽은 약속 변경을 일찍 알려주길 바랐을 수 있습니다. 실제 대화에서는 보이는 표현만 확인합니다.",
  c2:"다른 쪽의 입장은 메시지에 직접 나타난 부분만 소개하고, 모르는 내용은 모른다고 표시합니다.",
  c3:"서로의 기대를 확인하고 다음 약속을 변경할 때의 연락 기준을 정하는 방향을 제안합니다.",
  w1:"요청된 업무, 제출 시점, 현재 진행 상황을 나누어 정리하는 카드입니다.",
  w2:"확인하지 않은 마감일을 약속하거나 지나치게 방어적으로 표현하지 않도록 점검합니다.",
  w3:"가능한 작업 범위를 명확하게 알리고 필요한 확인 질문을 짧게 제안합니다.",
  r1:"명시적인 약속과 질문 등 실제로 확인된 대화 단서를 살펴봅니다.",
  r2:"친절함은 호감의 확증이 아닙니다. 예의나 일상적인 관심 등 여러 설명을 비교합니다.",
  r3:"상대가 편하게 선택할 수 있도록 부담 없는 한 문장을 권합니다.",
  m1:"양쪽 모두 소통이 원활하길 바랐을 가능성을 조심스럽게 정리합니다.",
  m2:"서운함을 표현한 말과 당시 상황 설명 사이의 차이를 구분합니다.",
  m3:"감정을 인정하고 앞으로 필요한 연락 방식을 합의하는 쪽으로 안내합니다.",
  next:"먼저 상대의 실제 메시지에 나온 사실과 내 추측을 구분해 보세요.",
  reply:"말해줘서 고마워. 다음에는 서로 조금 더 일찍 알려주면 좋겠어.",
  why:"예시 문장입니다. 입력한 대화에 맞춰 생성한 답장이 아니므로 그대로 보내기 전에 수정하세요.",
  evidence:"이 영역은 실제 분석 시 근거를 보여주는 자리입니다. 미리보기에서는 원문을 읽지 않습니다.",
  alternative:"한 가지 해석만 확정하지 않고 가능한 다른 설명도 보여줍니다."
 },
 ja:{
  pre:"画面サンプル · 入力した会話は実際には分析していません。",
  court:"カップルの意見を整理する調停レポートの例",
  work:"職場の返信アドバイスの画面サンプル",
  romance:"会話のサインと不確実性を分けるサンプル",
  mediator:"すれ違いと関係修復のレポート例",
  c1:"予定の変更を早めに知りたかった、という視点の一例です。",
  c2:"相手の発言が実際に確認できる部分だけを扱い、不明点を明確にします。",
  c3:"お互いの期待を確認し、予定変更時の連絡ルールを決める方向を提案します。",
  w1:"依頼内容、期限、進捗を分けて確認する例です。",
  w2:"確認していない締切の約束や攻撃的な表現を避けます。",
  w3:"対応可能な範囲を明確に伝える文章を検討します。",
  r1:"実際の質問や具体的な予定提案などを確認します。",
  r2:"親切さだけで恋愛感情を確定することはできません。",
  r3:"相手が無理なく答えられる次の行動を考えます。",
  m1:"共通の目標を、確認可能な範囲で整理します。",
  m2:"発言と受け取り方の違いを区別します。",
  m3:"気持ちを認め、今後の連絡方法を話し合います。",
  next:"まず実際の発言と自分の推測を分けてみましょう。",
  reply:"説明してくれてありがとう。次からは少し早めに伝え合えたらうれしいです。",
  why:"これは表示用サンプルです。入力した内容から生成した返信ではありません。",
  evidence:"ここには実際の分析で確認された根拠を表示します。プレビューでは会話を読みません。",
  alternative:"一つの解釈に決めつけず、別の可能性も表示します。"
 },
 en:{
  pre:"UI sample only · Your input has not been analyzed.",
  court:"An example of a balanced couple-conflict report",
  work:"A sample professional reply strategy card",
  romance:"A sample of observable signals and their limits",
  mediator:"An example misunderstanding and repair report",
  c1:"One person may have expected earlier notice about changed plans; this is illustrative only.",
  c2:"The other person's actual words would be kept separate from anything still unknown.",
  c3:"The report could suggest agreeing on how to give notice if plans change.",
  w1:"The interface separates the requested task, deadline and current constraints.",
  w2:"It flags promises about deadlines that the user has not confirmed.",
  w3:"It offers a clear, polite message about what can realistically be delivered.",
  r1:"It highlights actual questions, proposals or reciprocal effort.",
  r2:"Courtesy is not proof of romantic interest; other explanations are considered.",
  r3:"It suggests a low-pressure next step rather than demanding a response.",
  m1:"The report summarizes any common ground evident in the conversation.",
  m2:"It distinguishes actual statements from differing interpretations.",
  m3:"It suggests a respectful acknowledgement and workable next action.",
  next:"First separate what the messages actually show from what you might be assuming.",
  reply:"Thanks for explaining. I'd appreciate an earlier heads-up next time.",
  why:"This is an example, not a reply generated from your input. Edit before using.",
  evidence:"Real analyses use this space for observed evidence. The preview does not read your messages.",
  alternative:"The report considers plausible alternatives instead of claiming certainty."
 },
 "zh-CN":{
  pre:"仅为界面示例 · 未实际分析输入内容。",
  court:"情侣争执调解报告示例",
  work:"职场回复策略界面示例",
  romance:"对话信号和不确定性示例",
  mediator:"误解与关系修复报告示例",
  c1:"一方可能希望提前获知计划变更，实际分析只依据可见内容。",
  c2:"另一方的观点会与尚未确认的情况分开显示。",
  c3:"建议双方讨论以后变更计划时应怎样通知对方。",
  w1:"分别整理任务、截止时间和现有工作进度。",
  w2:"避免承诺未经确认的截止时间或使用过激措辞。",
  w3:"建议清楚且礼貌地说明能够完成的工作范围。",
  r1:"关注实际出现的问题、邀请和具体安排。",
  r2:"礼貌不等于确定的好感，也需要比较其他解释。",
  r3:"建议不给对方施加压力的下一步行动。",
  m1:"谨慎整理双方在对话中表现出的共同点。",
  m2:"区分实际说过的话和各自的理解。",
  m3:"建议认可感受并讨论今后的沟通方式。",
  next:"先区分消息中的事实和自己的猜测。",
  reply:"谢谢你解释。希望以后有变化时我们都能提前说一声。",
  why:"这是界面演示内容，并非根据你的输入生成。",
  evidence:"真实分析会在这里显示依据；此预览不会分析输入内容。",
  alternative:"报告会展示其他可能的解释。"
 },
 "zh-TW":{
  pre:"僅為介面示例 · 未實際分析輸入內容。",
  court:"情侶爭執調解報告範例",
  work:"職場回覆策略介面範例",
  romance:"對話訊號與不確定性範例",
  mediator:"誤解與關係修復報告範例",
  c1:"一方可能希望提早知道計畫變更，實際分析僅依據可見內容。",
  c2:"另一方的觀點會與尚未確認的事情分開顯示。",
  c3:"建議雙方討論以後變更計畫時如何通知對方。",
  w1:"分別整理任務、截止時間與目前工作進度。",
  w2:"避免承諾未經確認的期限或使用過激措辭。",
  w3:"建議清楚且有禮地說明能夠完成的工作範圍。",
  r1:"注意實際出現的提問、邀請與具體安排。",
  r2:"禮貌不代表確定的好感，也需要比較其他解釋。",
  r3:"建議不給對方壓力的下一步行動。",
  m1:"謹慎整理雙方在對話中展現的共同點。",
  m2:"區分實際說過的話與各自的理解。",
  m3:"建議理解彼此感受並討論日後的溝通方式。",
  next:"先區分訊息中的事實和自己的猜測。",
  reply:"謝謝你解釋。希望以後有變動時我們都能提早說一聲。",
  why:"這是介面示範內容，並非依照你的輸入生成。",
  evidence:"真實分析會在這裡顯示依據；此預覽不會分析輸入內容。",
  alternative:"報告會列出其他可能的解釋。"
 }
 };
 function demoResult(info){
  const t=copy[Object.hasOwn(copy,info.locale)?info.locale:"en"];
  const persona=supported.has(info.persona)?info.persona:"standard";
  if(persona==="standard")return {
   verdict:t.pre,warmthScore:50,reciprocityScore:50,evidenceLevel:"low",
   keySignal:t.evidence,evidence:t.evidence,alternative:t.alternative,nextStep:t.next,
   replyDraft:t.reply,replyWhy:t.why,evidenceCards:[]
  };
  let sections;
  if(persona==="court")sections=[t.c1,t.c2,t.c3];
  else if(persona==="work")sections=[t.w1,t.w2,t.w3];
  else if(persona==="romance")sections=[t.r1,t.r2,t.r3];
  else sections=[t.m1,t.m2,t.m3];
  return {
   persona,summary:t[persona]+"\n"+t.pre,evidenceLevel:"low",
   sectionOne:sections[0],sectionTwo:sections[1],sectionThree:sections[2],
   nextStep:t.next,shouldReply:true,replyDraft:t.reply,replyWhy:t.why,
   sourceQuote:"",sourceScreenshotIndex:0,sourceVerified:false
  };
 }
 function response(data,status=200){
  return Promise.resolve(new Response(JSON.stringify(data),{
   status,headers:{"Content-Type":"application/json","Cache-Control":"no-store"}
  }));
 }
 window.fetch=function(url,options){
  const dest=typeof url==="string"?url:url instanceof URL?url.href:url&&url.url;
  if(typeof dest!=="string")return originalFetch(url,options);
  let path;
  try{path=new URL(dest,location.href).pathname}catch(_){return originalFetch(url,options)}
  if(path==="/api/analyze"){
   // Discard chat and images without storing, transmitting or logging.
   let body={};
   try{
    const parsed=JSON.parse(options?.body||"{}");
    body={persona:parsed.persona,locale:parsed.locale};
   }catch(_){}
   return response(demoResult(body));
  }
  if(path==="/api/feedback")return response({ok:true,demo:true});
  if(path.startsWith("/api/"))return response({code:"PREVIEW_UI_ONLY"},503);
  return originalFetch(url,options);
 };
})();
