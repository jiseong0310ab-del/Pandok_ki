/* SAYNUE account shell. No browser tokens, subscriptions or payment state.
 * Everything security-sensitive is retrieved from the authenticated server.
 */
(function(){
"use strict";
const T={
ko:{emailRateLimit:"Supabase 무료 이메일 발송 한도에 도달했어. 기본 발송은 프로젝트당 시간당 2건이니 마지막 메일 발송 후 약 1시간이 지나 다시 시도해 줘.",emailNotAuthorized:"이 이메일은 Supabase 기본 발송기의 허용 대상이 아니야. 프로젝트 조직 Team에 등록된 이메일인지 확인하거나 SMTP를 설정해야 해.",emailLoginDisabled:"Supabase 이메일 로그인 기능이 꺼져 있어. Authentication의 Email 제공자를 확인해 줘.",linkExpired:"이메일 확인 링크가 만료됐어. 새 링크를 요청해 줘.",linkFailed:"링크가 만료되었거나 확인에 실패했어. 새 로그인 링크를 요청해 줘.",linkWorking:"이메일 링크를 확인하는 중이야…",startSandboxCheckout:"Sandbox 테스트 결제 시작",sandboxOnly:"Sandbox 가상 결제만 진행해. 실제 청구는 없고, 결제 결과만으로 Plus가 열리지는 않아.",checkoutFailed:"테스트 거래를 만들지 못했어. 서버 설정을 확인해 줘.",title:"나만의 Plus 공간",intro:"개인 계정과 구독 관리를 준비하고 있어요. 인증 서비스 설정이 완료된 경우에만 이메일 로그인이 작동해요.",pendingTitle:"계정 시스템 준비 중",pendingText:"아직 인증 서비스가 연결되지 않았어. 현재 회원 가입이나 Plus 구독은 할 수 없어.",signinTitle:"이메일로 로그인",emailLabel:"이메일 주소",sendCode:"로그인 링크 이메일 받기",otpNote:"받은 이메일의 확인 링크를 누르면 세이뉴 계정으로 돌아와 자동 로그인돼요.",codeLabel:"이메일 인증 코드",verifyCode:"로그인 완료",memberTitle:"내 계정",planLabel:"구독 상태",planNote:"구독 상태는 서버에서 검증해. 결제창 완료 화면만으로 Plus를 활성화하지 않아.",signOut:"로그아웃",privateNote:"로그인 링크에 담긴 임시 토큰은 서버가 검증하고 보안 쿠키로 교환해. 브라우저에 저장하지 않으며, 결제 권한은 서버에서 확인해.",unauth:"이메일 인증을 완료하면 계정 상태를 확인할 수 있어.",loading:"계정 상태 확인 중…",emailSent:"로그인 링크를 보냈어. 새로 받은 메일에서 링크를 눌러 줘.",signedIn:"로그인이 확인됐어.",signedOut:"로그아웃했어.",failed:"요청을 처리하지 못했어. 입력값과 설정을 확인해 줘.",codeFailed:"코드가 틀렸거나 만료됐어. 다시 확인해 줘.",free:"현재 Plus 활성 구독 없음",plus:"Plus 활성 구독 확인됨",unknown:"구독 상태를 확인할 수 없어."},
ja:{emailRateLimit:"Supabaseの無料メール送信上限に達しました。標準メールはプロジェクト全体で1時間に2通までです。最後の送信から約1時間経ってからお試しください。",emailNotAuthorized:"このメールアドレスはSupabase標準送信サービスの対象外です。プロジェクトの組織メンバーのメールか確認してください。",emailLoginDisabled:"Supabaseのメールログインが無効になっています。AuthenticationのEmail設定をご確認ください。",linkExpired:"リンクの有効期限が切れました。新しいメールをリクエストしてください。",linkFailed:"リンクが無効または期限切れです。新しいリンクをリクエストしてください。",linkWorking:"メールリンクを確認中…",startSandboxCheckout:"Sandbox テスト決済を開始",sandboxOnly:"Sandboxでの仮決済のみです。実際の請求やPlus権限の即時付与はありません。",checkoutFailed:"テスト取引を作成できませんでした。設定を確認してください。",title:"あなたの Plus アカウント",intro:"アカウントとサブスクリプション管理を準備しています。認証サービスの設定後にメールログインを利用できます。",pendingTitle:"アカウント設定中",pendingText:"認証サービスは未接続です。現在は登録やPlusの購入ができません。",signinTitle:"メールでログイン",emailLabel:"メールアドレス",sendCode:"ログイン用メールを送信",otpNote:"メールに届いた確認リンクを開くとSAYNUEに戻り、ログインできます。",codeLabel:"メール認証コード",verifyCode:"ログイン",memberTitle:"アカウント",planLabel:"購読状態",planNote:"購読状態はサーバーで検証します。決済完了画面だけではPlusを有効にしません。",signOut:"ログアウト",privateNote:"メールリンクの一時認証情報はサーバーで検証して安全なCookieに交換し、ブラウザーに保存しません。",unauth:"メール認証後にアカウントを確認できます。",loading:"状態を確認しています…",emailSent:"ログイン用リンクを送りました。最新のメールのリンクを開いてください。",signedIn:"ログインしました。",signedOut:"ログアウトしました。",failed:"処理できませんでした。入力と設定を確認してください。",codeFailed:"コードが無効または期限切れです。",free:"有効なPlus購読はありません",plus:"Plus購読を確認しました",unknown:"購読状態を確認できません"},
en:{emailRateLimit:"Supabase's built-in email quota was reached (2 emails per project per hour). Try again about an hour after the last email.",emailNotAuthorized:"Supabase's built-in email service only sends to project organization member addresses. Use a team member email or configure custom SMTP.",emailLoginDisabled:"Email sign-in is disabled in Supabase. Check the Authentication email provider settings.",linkExpired:"This email link has expired. Request another one.",linkFailed:"The link is invalid or expired. Request a fresh sign-in email.",linkWorking:"Verifying your email link…",startSandboxCheckout:"Start Sandbox test checkout",sandboxOnly:"Sandbox simulated payments only. No real charge or immediate Plus access.",checkoutFailed:"Couldn't create a test transaction. Check server configuration.",title:"Your Plus account",intro:"Account and subscription management are being prepared. Email sign-in works only after the authentication provider is configured.",pendingTitle:"Accounts are not ready",pendingText:"The authentication provider is not connected. Registration and Plus subscriptions are not available.",signinTitle:"Sign in with email",emailLabel:"Email address",sendCode:"Email me a sign-in link",otpNote:"Open the confirmation link in your email to return to SAYNUE and sign in.",codeLabel:"Email verification code",verifyCode:"Sign in",memberTitle:"Your account",planLabel:"Subscription",planNote:"Subscription status is checked on the server. Completing a checkout screen never grants Plus.",signOut:"Sign out",privateNote:"Temporary email-link tokens are verified by the server, exchanged for secure cookies, and not saved in browser storage.",unauth:"Verify your email to see account status.",loading:"Checking account status…",emailSent:"Sign-in link requested. Open the newest email and tap the link.",signedIn:"You're signed in.",signedOut:"You've signed out.",failed:"Request failed. Check your input and configuration.",codeFailed:"Code is invalid or expired.",free:"No active Plus subscription",plus:"Active Plus subscription confirmed",unknown:"Subscription status unavailable"},
"zh-CN":{emailRateLimit:"已达到Supabase免费邮件发送限制（每个项目每小时2封）。请在上次邮件发送约一小时后重试。",emailNotAuthorized:"Supabase默认邮件只允许发送到项目组织成员邮箱，请确认邮箱是否为团队成员邮箱，或配置SMTP。",emailLoginDisabled:"Supabase邮箱登录已停用，请检查Authentication的邮箱提供者设置。",linkExpired:"链接已过期，请重新发送登录邮件。",linkFailed:"链接无效或已过期，请重新获取登录邮件。",linkWorking:"正在验证邮件链接…",startSandboxCheckout:"开始 Sandbox 模拟支付",sandboxOnly:"仅限 Sandbox 模拟付款，不会真实扣款或立即开通Plus。",checkoutFailed:"无法创建测试交易，请检查服务器配置。",title:"你的 Plus 账户",intro:"账户与订阅管理正在准备中。配置认证服务后才能使用邮箱登录。",pendingTitle:"账户功能准备中",pendingText:"尚未接入认证服务，因此无法注册或购买Plus。",signinTitle:"邮箱登录",emailLabel:"邮箱地址",sendCode:"发送登录链接",otpNote:"点击邮件中的确认链接，即可返回SAYNUE并登录。",codeLabel:"邮箱验证码",verifyCode:"登录",memberTitle:"我的账户",planLabel:"订阅状态",planNote:"订阅由服务器验证，仅凭付款页面成功不会开启Plus。",signOut:"退出登录",privateNote:"邮件链接中的临时凭据经服务器验证后换成安全Cookie，不会保存到浏览器存储。",unauth:"验证邮箱后可查看账户状态。",loading:"正在检查账户…",emailSent:"已发送登录链接，请打开最新邮件中的链接。",signedIn:"已登录。",signedOut:"已退出登录。",failed:"处理失败，请检查输入或配置。",codeFailed:"验证码错误或已过期。",free:"没有有效的Plus订阅",plus:"已确认有效Plus订阅",unknown:"无法验证订阅状态"},
"zh-TW":{emailRateLimit:"已達Supabase免費郵件寄送限制（每個專案每小時2封），請在上次寄送約一小時後重試。",emailNotAuthorized:"Supabase預設郵件僅能寄給專案組織成員信箱，請確認信箱屬於團隊成員，或設定SMTP。",emailLoginDisabled:"Supabase電子郵件登入已停用，請檢查Authentication的電子郵件提供者設定。",linkExpired:"連結已過期，請重新傳送登入郵件。",linkFailed:"連結無效或已過期，請重新索取登入郵件。",linkWorking:"正在驗證郵件連結…",startSandboxCheckout:"開始 Sandbox 模擬付款",sandboxOnly:"僅限 Sandbox 模擬付款，不會實際扣款或立即開通Plus。",checkoutFailed:"無法建立測試交易，請檢查伺服器設定。",title:"你的 Plus 帳戶",intro:"帳戶與訂閱管理正在準備中。設定驗證服務後才能使用電子郵件登入。",pendingTitle:"帳戶功能準備中",pendingText:"尚未連接驗證服務，因此無法註冊或購買Plus。",signinTitle:"電子郵件登入",emailLabel:"電子郵件地址",sendCode:"傳送登入連結",otpNote:"點擊郵件中的確認連結，即可返回SAYNUE並登入。",codeLabel:"電子郵件驗證碼",verifyCode:"登入",memberTitle:"我的帳戶",planLabel:"訂閱狀態",planNote:"訂閱由伺服器驗證，付款頁面成功不會直接開啟Plus。",signOut:"登出",privateNote:"電子郵件連結中的暫時憑證會經由伺服器驗證後交換成安全Cookie，不會保存在瀏覽器儲存空間。",unauth:"驗證電子郵件後可查看帳戶狀態。",loading:"正在檢查帳戶…",emailSent:"已傳送登入連結，請開啟最新郵件中的連結。",signedIn:"已登入。",signedOut:"已登出。",failed:"處理失敗，請檢查輸入與設定。",codeFailed:"驗證碼錯誤或已過期。",free:"沒有有效的Plus訂閱",plus:"已確認有效Plus訂閱",unknown:"無法驗證訂閱狀態"}
};
const rawLang=(navigator.language||"en").toLowerCase();
const locale=rawLang.startsWith("ko")?"ko":rawLang.startsWith("ja")?"ja":rawLang.startsWith("zh")?(rawLang.includes("tw")||rawLang.includes("hk")||rawLang.includes("mo")?"zh-TW":"zh-CN"):"en";
const tx=k=>T[locale][k]||T.en[k]||k;
const $=id=>document.getElementById(id);
document.documentElement.lang=locale;
document.querySelectorAll("[data-i]").forEach(el=>{el.textContent=tx(el.dataset.i)});
function showPanel(id){
 for(const name of ["setupPanel","signinPanel","loggedInPanel"])$(name).classList.toggle("hidden",name!==id);
}
function message(msg,error=false){const el=$("accountMessage");el.textContent=tx(msg);el.setAttribute("role",error?"alert":"status")}
let busy=false;
function setBusy(value){busy=value;for(const id of ["sendCode","verifyCode","signOut","startSandboxCheckout"])$(id).disabled=value}
async function request(path,options){
 const response=await fetch(path,{...options,credentials:"same-origin",cache:"no-store"});
 let data;try{data=await response.json()}catch(_){data={}}
 return {ok:response.ok,data};
}
async function refresh(){
 message("loading");
 try{
  const result=await request("/api/auth/state",{method:"GET"});
  const state=result.data;
  if(!result.ok)throw Error("state");
  if(!state.authConfigured){showPanel("setupPanel");message("pendingText");return}
  if(!state.authenticated){showPanel("signinPanel");message("unauth");return}
  showPanel("loggedInPanel");
  $("loggedInEmail").textContent=typeof state.email==="string"?state.email:"";
  $("currentPlan").textContent=state.plusStatus==="unavailable"?tx("unknown"):tx(state.plus?"plus":"free");
  const showCheckout=!!state.sandboxCheckoutReady&&!state.plus;
  $("sandboxCheckoutAction").classList.toggle("hidden",!showCheckout);
  $("sandboxCheckoutDisclaimer").classList.toggle("hidden",!showCheckout);
  message("signedIn");
 }catch(_){showPanel("setupPanel");message("failed",true)}
}
$("sendCode").addEventListener("click",async()=>{
 if(busy)return;
 const email=$("accountEmail").value.trim();
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){message("failed",true);return}
 setBusy(true);
 try{
  const res=await request("/api/auth/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email})});
  if(res.ok)message("emailSent");
  else if(res.data.code==="EMAIL_RATE_LIMIT")message("emailRateLimit",true);
  else if(res.data.code==="EMAIL_NOT_AUTHORIZED")message("emailNotAuthorized",true);
  else if(res.data.code==="EMAIL_LOGIN_DISABLED")message("emailLoginDisabled",true);
  else message("failed",true);
 }catch(_){message("failed",true)}
 finally{setBusy(false)}
});
$("verifyCode").addEventListener("click",async()=>{
 if(busy)return;
 const email=$("accountEmail").value.trim(),code=$("accountOTP").value.trim();
 if(!/^\d{6,8}$/.test(code)){message("codeFailed",true);return}
 setBusy(true);
 try{
  const result=await request("/api/auth/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({email,code})});
  if(!result.ok){message("codeFailed",true);return}
  $("accountOTP").value="";
  await refresh();
 }catch(_){message("failed",true)}
 finally{setBusy(false)}
});
$("signOut").addEventListener("click",async()=>{
 if(busy)return;
 setBusy(true);
 try{await request("/api/auth/logout",{method:"POST"});await refresh()}catch(_){message("failed",true)}
 finally{setBusy(false)}
});
$("startSandboxCheckout").addEventListener("click",async()=>{
 if(busy)return;
 setBusy(true);
 try{
  const res=await request("/api/plus/checkout",{method:"POST"});
  if(!res.ok||typeof res.data.checkoutUrl!=="string")throw Error("CHECKOUT");
  const target=new URL(res.data.checkoutUrl,location.origin);
  const tid=target.searchParams.get("_ptxn");
  if(target.origin!==location.origin||target.pathname!=="/sandbox-checkout.html"||!/^txn_[a-z0-9]{26}$/.test(tid||""))throw Error("UNSAFE_URL");
  location.assign(target.href);
 }catch(_){message("checkoutFailed",true);setBusy(false)}
});
async function finishEmailLink(){
 const hash=window.location.hash||"";
 if(!hash.startsWith("#"))return false;
 const p=new URLSearchParams(hash.slice(1));
 const hasTokens=p.has("access_token")||p.has("refresh_token");
 const hasError=p.has("error")||p.has("error_code");
 if(!hasTokens&&!hasError)return false;
 // The fragment is client-only, but must be removed before ANY network call,
 // navigation, telemetry or further UI work. Never store these tokens.
 const accessToken=p.get("access_token"),refreshToken=p.get("refresh_token");
 history.replaceState(null,"",location.pathname+location.search);
 if(hasError||!accessToken||!refreshToken){
  await refresh();message("linkExpired",true);return true;
 }
 message("linkWorking");
 try{
  const res=await request("/api/auth/link-session",{
   method:"POST",headers:{"Content-Type":"application/json"},
   body:JSON.stringify({accessToken,refreshToken})
  });
  if(!res.ok)throw Error("INVALID_LINK");
  await refresh();
 }catch(_){
  await refresh();message("linkFailed",true);
 }
 return true;
}
finishEmailLink().then(handled=>{if(!handled)refresh()}).catch(()=>{message("linkFailed",true)});
})();
