/* SAYNUE Plus feature preview: a self-contained FICTIONAL scenario.
 * This is a static demonstration, not a paid entitlement or an AI request.
 * Real Plus results must be generated only after verified auth + subscription.
 */
(function(){
"use strict";
const SAMPLES={
 ko:{
  gentle:{draft:"토요일 근무하는구나. 알려줘서 고마워! 수요일 저녁 좋고, 편한 시간에 맞춰볼게.",why:"상대의 상황을 인정하고 제안을 반갑게 받아들이는 답장이야.",tradeoff:"약속 시간이 아직 확정되지 않아 한 번 더 조율해야 할 수 있어.",bestWhen:"대화의 따뜻한 분위기를 이어가고 싶을 때."},
  clear:{draft:"수요일 저녁 좋아. 혹시 7시쯤 괜찮아?",why:"상대가 제안한 날짜를 기준으로 구체적인 시간을 물어봐.",tradeoff:"상대에게 바로 시간을 정하도록 요구하는 느낌을 줄 수 있어.",bestWhen:"약속을 명확하게 잡는 게 중요할 때."},
  low_pressure:{draft:"좋아! 수요일 저녁쯤 서로 편한 시간 맞춰보자 :)",why:"긍정적으로 답하면서 일정 선택의 여지를 남겨둬.",tradeoff:"구체적인 날짜·장소가 정해지기까지 시간이 더 걸릴 수 있어.",bestWhen:"지금 당장 시간을 정하기 어려울 때."},
  reactions:{
   engaged:{step:"상대가 시간까지 제시했다면 서로 편한 장소를 정하고 대화를 간단히 마무리해.",caution:"일정 확정만으로 상대의 속마음까지 단정하지는 마."},
   uncertain:{step:"상대가 아직 시간을 모르겠다고 한다면 여유를 주고 일정 확인을 기다려.",caution:"불확실한 답을 관심 부족이라고 바로 해석하지 마."},
   no_reply:{step:"답이 없으면 반복해서 재촉하지 말고 시간을 둬.",caution:"침묵의 이유를 추측해서 압박하거나 시험하지 마."},
   refusal:{step:"상대가 만남을 거절하거나 연락을 원하지 않으면 추가 연락을 중단해.",caution:"우회해서 설득하거나 다시 메시지를 보내지 마."}
  }
 },
 ja:{
  gentle:{draft:"土曜日はお仕事なんだね。教えてくれてありがとう！水曜の夜、都合のいい時間に合わせるよ。",why:"相手の状況を受け止め、代わりの日程を前向きに受け入れる返事。",tradeoff:"具体的な時間はまだ決まらないかもしれません。",bestWhen:"温かい雰囲気を保ちながら返信したいとき。"},
  clear:{draft:"水曜の夜、いいね。19時ごろはどう？",why:"提案された日程に沿って時間を具体的に確認します。",tradeoff:"すぐに時間を決めることが少し急に感じられるかもしれません。",bestWhen:"予定をはっきり決めたいとき。"},
  low_pressure:{draft:"いいね！水曜の夜、お互いの都合のいい時間にしよう☺",why:"前向きに応じながら時間を決める余地を残します。",tradeoff:"具体的な予定が決まるまで時間がかかることもあります。",bestWhen:"まだ時間を確定しにくいとき。"},
  reactions:{
   engaged:{step:"相手が具体的な時間を出したら、場所を相談して予定を決めましょう。",caution:"予定が決まっただけで特別な感情があるとは限りません。"},
   uncertain:{step:"まだ予定が分からないなら、余裕を持って確認を待ちましょう。",caution:"曖昧な返事をすぐ脈なしと決めないでください。"},
   no_reply:{step:"返事がなくても、何度も催促せず時間を置きましょう。",caution:"沈黙の理由を決めつけて追いかけないでください。"},
   refusal:{step:"相手が断ったり連絡を望まないなら、それ以上連絡しないでください。",caution:"別の手段で説得したり、繰り返し連絡しないでください。"}
  }
 },
 en:{
  gentle:{draft:"Ah, you're working Saturday — thanks for letting me know! Wednesday evening works. Happy to find a time that suits you.",why:"Acknowledges their schedule and warmly accepts the alternative.",tradeoff:"You may still need another message to agree on a specific time.",bestWhen:"You want to stay considerate and conversational."},
  clear:{draft:"Wednesday evening works for me. Would 7 pm suit you?",why:"Moves from an offered day toward an actionable plan.",tradeoff:"It asks the other person to commit to a time straight away.",bestWhen:"You'd rather settle the logistics efficiently."},
  low_pressure:{draft:"Sounds good! We can figure out a time for Wednesday when it's convenient :)",why:"Signals interest without making a quick decision necessary.",tradeoff:"The plan may remain vague until someone follows up.",bestWhen:"Neither person needs to finalize a time yet."},
  reactions:{
   engaged:{step:"If they confirm a time, agree on a place and wrap up the planning naturally.",caution:"A confirmed plan isn't proof of hidden feelings."},
   uncertain:{step:"If they're unsure, leave them space to check their schedule.",caution:"Uncertainty isn't automatically rejection or affection."},
   no_reply:{step:"If there is no reply, avoid repeated follow-up messages.",caution:"Don't guess why they went quiet or pressure them."},
   refusal:{step:"If they decline or ask for no further contact, stop messaging.",caution:"Do not look for alternative ways to persuade them."}
  }
 },
 "zh-CN":{
  gentle:{draft:"原来你周六要上班呀，谢谢告诉我！周三晚上可以，我们找个你方便的时间。",why:"理解对方的安排，并温和地接受替代日期。",tradeoff:"具体时间还需要再沟通。",bestWhen:"希望保持自然友好的聊天氛围时。"},
  clear:{draft:"周三晚上可以，你觉得七点怎么样？",why:"直接确认见面时间，推动日程安排。",tradeoff:"可能让对方觉得需要立即做决定。",bestWhen:"希望尽快确定具体计划时。"},
  low_pressure:{draft:"好呀！周三晚上找个双方方便的时间就行～",why:"表达积极态度，同时保留安排空间。",tradeoff:"确定细节的进度可能较慢。",bestWhen:"暂时不急着决定时间时。"},
  reactions:{
   engaged:{step:"如果对方明确提出时间，可以进一步确认地点。",caution:"约好见面不代表能确定对方的真实感情。"},
   uncertain:{step:"如果对方还不能确定，就给对方时间查看日程。",caution:"不要把不确定直接理解为拒绝。"},
   no_reply:{step:"如果没有回复，不要连续发送催促消息。",caution:"不要猜测沉默的理由并施加压力。"},
   refusal:{step:"如果对方明确拒绝或表示不想继续联系，就停止发送消息。",caution:"不要换其他方式继续劝说。"}
  }
 },
 "zh-TW":{
  gentle:{draft:"原來你週六要上班呀，謝謝告訴我！週三晚上可以，我們找個你方便的時間。",why:"理解對方的安排，溫和地接受替代日期。",tradeoff:"具體時間還需要再討論。",bestWhen:"希望保持自然友好的聊天氣氛時。"},
  clear:{draft:"週三晚上可以，你覺得七點怎麼樣？",why:"直接確認見面時間，讓安排更明確。",tradeoff:"對方可能覺得需要立刻決定。",bestWhen:"希望儘快敲定行程時。"},
  low_pressure:{draft:"好呀！週三晚上找個彼此方便的時間就好～",why:"表達正面態度，同時留下安排空間。",tradeoff:"決定細節可能會花比較久的時間。",bestWhen:"現在還不急著決定時間時。"},
  reactions:{
   engaged:{step:"如果對方明確提出時間，就進一步確認地點。",caution:"約好見面不代表能確定對方的真實感情。"},
   uncertain:{step:"如果對方還不能確定，就給對方時間查看行程。",caution:"不要把不確定直接理解為拒絕。"},
   no_reply:{step:"如果沒有回覆，不要連續傳訊催促。",caution:"不要猜測沉默的原因並施加壓力。"},
   refusal:{step:"如果對方明確拒絕或表示不想繼續聯絡，就停止傳訊。",caution:"不要換其他方式繼續勸說。"}
  }
 }
};
const lang=document.documentElement.lang in SAMPLES?document.documentElement.lang:"en";
const sample=SAMPLES[lang],$=id=>document.getElementById(id);
let choice="gentle",reaction="engaged";
const text=(id,value)=>{$(id).textContent=value};
function select(group,attr,value){
 document.querySelectorAll("#"+group+" [data-"+attr+"]").forEach(btn=>{
  const selected=btn.getAttribute("data-"+attr)===value;
  btn.setAttribute("aria-pressed",String(selected));
 });
}
function showChoice(){
 const x=sample[choice];
 text("plusDemoMessage",x.draft);
 text("plusDemoWhy",x.why);
 text("plusDemoTradeoff",x.tradeoff);
 text("plusDemoBestWhen",x.bestWhen);
 select("plusDemoChoices","approach",choice);
}
function showReaction(){
 const x=sample.reactions[reaction];
 text("plusDemoStep",x.step);
 text("plusDemoCaution",x.caution);
 select("plusDemoReactions","reaction",reaction);
}
$("plusDemoChoices").addEventListener("click",e=>{
 const btn=e.target.closest("[data-approach]");
 if(!btn||!(btn.dataset.approach in sample))return;
 choice=btn.dataset.approach;showChoice();
});
$("plusDemoReactions").addEventListener("click",e=>{
 const btn=e.target.closest("[data-reaction]");
 if(!btn||!(btn.dataset.reaction in sample.reactions))return;
 reaction=btn.dataset.reaction;showReaction();
});
showChoice();
showReaction();
})();
