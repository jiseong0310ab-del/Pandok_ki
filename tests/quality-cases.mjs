// Synthetic test conversations only. Never put real user messages or identifiers here.
// This corpus tests input and prompt contracts; it cannot prove model accuracy.
export const cases = [
  {
    "id": "ko01",
    "locale": "ko",
    "platform": "kakao",
    "relation": "talking",
    "goal": "understand",
    "chatText": "나: 주말에 영화 볼래? 상대: 이번 주는 일이 많아. 다음 주는 생각해볼게.",
    "focus": "ambiguous"
  },
  {
    "id": "ko02",
    "locale": "ko",
    "platform": "kakao",
    "relation": "friends",
    "goal": "boundary",
    "chatText": "친구: 오늘 새벽에 전화해도 돼? 나: 내일 일찍 일어나야 해서 힘들어. 친구: 알겠어.",
    "focus": "boundary"
  },
  {
    "id": "ko03",
    "locale": "ko",
    "platform": "kakao",
    "relation": "dating",
    "goal": "reply",
    "chatText": "나: 오늘 기분이 안 좋아서 조금 쉬고 싶어. 상대: 알겠어, 푹 쉬고 연락해.",
    "focus": "support"
  },
  {
    "id": "ko04",
    "locale": "ko",
    "platform": "kakao",
    "relation": "ex",
    "goal": "repair",
    "chatText": "나: 지난번 말이 너무 날카로웠던 것 같아 미안해. 상대: 응, 나도 생각할 시간이 필요했어.",
    "focus": "repair"
  },
  {
    "id": "ko05",
    "locale": "ko",
    "platform": "kakao",
    "relation": "work",
    "goal": "understand",
    "chatText": "동료: 회의 자료 오늘 보내실 수 있나요? 나: 오후 다섯 시 전에 보내겠습니다. 동료: 네 감사합니다.",
    "focus": "non_romance"
  },
  {
    "id": "ko06",
    "locale": "ko",
    "platform": "kakao",
    "relation": "crush",
    "goal": "reply",
    "chatText": "나: 언제 커피 한잔 할래? 상대: 사실 당분간은 만나고 싶지 않아. 나: 알겠어.",
    "focus": "respect_refusal"
  },
  {
    "id": "ja01",
    "locale": "ja",
    "platform": "line",
    "relation": "talking",
    "goal": "understand",
    "chatText": "私: 週末に一緒にカフェ行かない？ 相手: 今週は忙しくて、また予定を見てみるね。 私: ありがとう！",
    "focus": "ambiguous"
  },
  {
    "id": "ja02",
    "locale": "ja",
    "platform": "line",
    "relation": "dating",
    "goal": "reply",
    "chatText": "私: 今日は少し疲れてるから家で休みたい。相手: うん、無理しないでね。私: ありがとう。",
    "focus": "support"
  },
  {
    "id": "ja03",
    "locale": "ja",
    "platform": "line",
    "relation": "friends",
    "goal": "repair",
    "chatText": "私: 昨日の言い方、きつかったと思う。ごめんね。相手: うん、少し驚いたけど話せてよかった。",
    "focus": "repair"
  },
  {
    "id": "ja04",
    "locale": "ja",
    "platform": "line",
    "relation": "work",
    "goal": "boundary",
    "chatText": "上司: 今夜遅くに追加の資料をお願いできる？ 私: 明日の朝なら対応できます。上司: わかりました。",
    "focus": "non_romance"
  },
  {
    "id": "ja05",
    "locale": "ja",
    "platform": "line",
    "relation": "crush",
    "goal": "reply",
    "chatText": "私: もしよければまた会わない？ 相手: ごめんなさい、そういう気持ちはありません。 私: 伝えてくれてありがとう。",
    "focus": "respect_refusal"
  },
  {
    "id": "ja06",
    "locale": "ja",
    "platform": "line",
    "relation": "friends",
    "goal": "understand",
    "chatText": "私: 昨日の話どう思った？ 相手: ちょっと考えたいから明日話してもいい？ 私: もちろん。",
    "focus": "no_mindreading"
  },
  {
    "id": "en01",
    "locale": "en",
    "platform": "whatsapp",
    "relation": "talking",
    "goal": "understand",
    "chatText": "Me: Want to grab lunch this weekend? Them: This weekend is hectic, I'll check next week. Me: Sounds good.",
    "focus": "ambiguous"
  },
  {
    "id": "en02",
    "locale": "en",
    "platform": "instagram",
    "relation": "crush",
    "goal": "reply",
    "chatText": "Me: Would you be up for coffee sometime? Them: Thank you, but I'm not interested in dating. Me: I understand.",
    "focus": "respect_refusal"
  },
  {
    "id": "en03",
    "locale": "en",
    "platform": "imessage",
    "relation": "friends",
    "goal": "repair",
    "chatText": "Me: I think my comment yesterday came across badly. Sorry about that. Friend: Thanks for saying it, I was upset.",
    "focus": "repair"
  },
  {
    "id": "en04",
    "locale": "en",
    "platform": "whatsapp",
    "relation": "work",
    "goal": "boundary",
    "chatText": "Manager: Can you work late tonight? Me: I can finish this by tomorrow morning instead. Manager: That works.",
    "focus": "non_romance"
  },
  {
    "id": "en05",
    "locale": "en",
    "platform": "imessage",
    "relation": "dating",
    "goal": "reply",
    "chatText": "Me: I need some quiet time this evening. Partner: Of course, message me when you're ready. Me: Thanks.",
    "focus": "support"
  },
  {
    "id": "en06",
    "locale": "en",
    "platform": "whatsapp",
    "relation": "talking",
    "goal": "understand",
    "chatText": "Me: Are you around Thursday? Them: Maybe! Me: Let me know. Them: Okay, I'll check the calendar.",
    "focus": "mixed_signal"
  },
  {
    "id": "zhc01",
    "locale": "zh-CN",
    "platform": "wechat",
    "relation": "talking",
    "goal": "understand",
    "chatText": "我：这周末一起吃个饭吗？对方：最近工作有点忙，下周我再看看安排。 我：好的。",
    "focus": "ambiguous"
  },
  {
    "id": "zhc02",
    "locale": "zh-CN",
    "platform": "wechat",
    "relation": "friends",
    "goal": "boundary",
    "chatText": "朋友：今晚十一点来我家好吗？我：太晚了我想休息，周日下午可以吗？朋友：可以。",
    "focus": "boundary"
  },
  {
    "id": "zhc03",
    "locale": "zh-CN",
    "platform": "wechat",
    "relation": "dating",
    "goal": "reply",
    "chatText": "我：今天心情不太好，想一个人待会儿。对方：没关系，你先好好休息。",
    "focus": "support"
  },
  {
    "id": "zhc04",
    "locale": "zh-CN",
    "platform": "wechat",
    "relation": "ex",
    "goal": "repair",
    "chatText": "我：上次争吵我说得太重了，对不起。对方：谢谢你愿意道歉，但我还需要时间。",
    "focus": "repair"
  },
  {
    "id": "zhc05",
    "locale": "zh-CN",
    "platform": "wechat",
    "relation": "work",
    "goal": "understand",
    "chatText": "同事：明天会议资料准备好了吗？我：我已经发邮件了。同事：收到，谢谢。",
    "focus": "non_romance"
  },
  {
    "id": "zhc06",
    "locale": "zh-CN",
    "platform": "wechat",
    "relation": "crush",
    "goal": "reply",
    "chatText": "我：有机会一起看电影吗？对方：谢谢，不过我不想进一步发展。 我：明白了。",
    "focus": "respect_refusal"
  },
  {
    "id": "zht01",
    "locale": "zh-TW",
    "platform": "line",
    "relation": "talking",
    "goal": "understand",
    "chatText": "我：週末要不要一起吃飯？對方：這週有點忙，下週我再看看行程。 我：好啊。",
    "focus": "ambiguous"
  },
  {
    "id": "zht02",
    "locale": "zh-TW",
    "platform": "line",
    "relation": "friends",
    "goal": "boundary",
    "chatText": "朋友：現在可以來找你嗎？我：今天想早點休息，改成週日白天好嗎？朋友：沒問題。",
    "focus": "boundary"
  },
  {
    "id": "zht03",
    "locale": "zh-TW",
    "platform": "line",
    "relation": "dating",
    "goal": "reply",
    "chatText": "我：最近工作壓力比較大，今晚想先休息。對方：當然，照顧好自己。",
    "focus": "support"
  },
  {
    "id": "zht04",
    "locale": "zh-TW",
    "platform": "line",
    "relation": "ex",
    "goal": "repair",
    "chatText": "我：那天說話太急了，抱歉。對方：謝謝你願意說，我還需要一點時間。",
    "focus": "repair"
  },
  {
    "id": "zht05",
    "locale": "zh-TW",
    "platform": "line",
    "relation": "work",
    "goal": "understand",
    "chatText": "同事：專案報告今天可以寄出嗎？我：下午前會寄。 同事：好的，謝謝。",
    "focus": "non_romance"
  },
  {
    "id": "zht06",
    "locale": "zh-TW",
    "platform": "line",
    "relation": "crush",
    "goal": "reply",
    "chatText": "我：下週有空一起出去嗎？對方：抱歉，我沒有想要發展關係。 我：了解，謝謝你說清楚。",
    "focus": "respect_refusal"
  }
];
