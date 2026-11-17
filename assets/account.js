/* SAYNUE account shell. No browser tokens, subscriptions or payment state.
 * Everything security-sensitive is retrieved from the authenticated server.
 */
(function(){
"use strict";
const T={
ko:{title:"나만의 Plus 공간",intro:"개인 계정과 구독 관리를 준비하고 있어요. 인증 서비스 설정이 완료된 경우에만 이메일 로그인이 작동해요.",pendingTitle:"계정 시스템 준비 중",pendingText:"아직 인증 서비스가 연결되지 않았어. 현재 회원 가입이나 Plus 구독은 할 수 없어.",signinTitle:"이메일로 로그인",emailLabel:"이메일 주소",sendCode:"인증 코드 받기",otpNote:"이메일에 적힌 일회용 숫자 코드를 입력해 줘. 비밀번호는 필요하지 않아.",codeLabel:"이메일 인증 코드",verifyCode:"로그인 완료",memberTitle:"내 계정",planLabel:"구독 상태",planNote:"구독 상태는 서버에서 검증해. 결제창 완료 화면만으로 Plus를 활성화하지 않아.",signOut:"로그아웃",privateNote:"로그인 세션은 브라우저 자바스크립트에서 읽을 수 없는 보안 쿠키로 관리해. 실제 결제 활성화는 별도 검증이 필요해.",unauth:"이메일 인증을 완료하면 계정 상태를 확인할 수 있어.",loading:"계정 상태 확인 중…",emailSent:"인증 이메일을 요청했어. 메일함에서 코드를 확인해 줘.",signedIn:"로그인이 확인됐어.",signedOut:"로그아웃했어.",failed:"요청을 처리하지 못했어. 입력값과 설정을 확인해 줘.",codeFailed:"코드가 틀렸거나 만료됐어. 다시 확인해 줘.",free:"현재 Plus 활성 구독 없음",plus:"Plus 활성 구독 확인됨",unknown:"구독 상태를 확인할 수 없어."},
ja:{title:"あなたの Plus アカウント",intro:"アカウントとサブスクリプション管理を準備しています。認証サービスの設定後にメールログインを利用できます。",pendingTitle:"アカウント設定中",pendingText:"認証サービスは未接続です。現在は登録やPlusの購入ができません。",signinTitle:"メールでログイン",emailLabel:"メールアドレス",sendCode:"認証コードを送る",otpNote:"メールに届いた数字のコードを入力してください。パスワードは不要です。",codeLabel:"メール認証コード",verifyCode:"ログイン",memberTitle:"アカウント",planLabel:"購読状態",planNote:"購読状態はサーバーで検証します。決済完了画面だけではPlusを有効にしません。",signOut:"ログアウト",privateNote:"認証情報はブラウザーのスクリプトから読み取れない安全なCookieで管理します。",unauth:"メール認証後にアカウントを確認できます。",loading:"状態を確認しています…",emailSent:"認証コードをリクエストしました。メールを確認してください。",signedIn:"ログインしました。",signedOut:"ログアウトしました。",failed:"処理できませんでした。入力と設定を確認してください。",codeFailed:"コードが無効または期限切れです。",free:"有効なPlus購読はありません",plus:"Plus購読を確認しました",unknown:"購読状態を確認できません"},
en:{title:"Your Plus account",intro:"Account and subscription management are being prepared. Email sign-in works only after the authentication provider is configured.",pendingTitle:"Accounts are not ready",pendingText:"The authentication provider is not connected. Registration and Plus subscriptions are not available.",signinTitle:"Sign in with email",emailLabel:"Email address",sendCode:"Send verification code",otpNote:"Enter the one-time numeric code from your email. No password needed.",codeLabel:"Email verification code",verifyCode:"Sign in",memberTitle:"Your account",planLabel:"Subscription",planNote:"Subscription status is checked on the server. Completing a checkout screen never grants Plus.",signOut:"Sign out",privateNote:"Sign-in sessions use Secure HttpOnly cookies that browser scripts cannot read. Billing still requires separate verification.",unauth:"Verify your email to see account status.",loading:"Checking account status…",emailSent:"Verification email requested. Please check your inbox.",signedIn:"You're signed in.",signedOut:"You've signed out.",failed:"Request failed. Check your input and configuration.",codeFailed:"Code is invalid or expired.",free:"No active Plus subscription",plus:"Active Plus subscription confirmed",unknown:"Subscription status unavailable"},
"zh-CN":{title:"你的 Plus 账户",intro:"账户与订阅管理正在准备中。配置认证服务后才能使用邮箱登录。",pendingTitle:"账户功能准备中",pendingText:"尚未接入认证服务，因此无法注册或购买Plus。",signinTitle:"邮箱登录",emailLabel:"邮箱地址",sendCode:"发送验证码",otpNote:"请输入邮件中的一次性数字验证码，无需密码。",codeLabel:"邮箱验证码",verifyCode:"登录",memberTitle:"我的账户",planLabel:"订阅状态",planNote:"订阅由服务器验证，仅凭付款页面成功不会开启Plus。",signOut:"退出登录",privateNote:"会话使用浏览器脚本无法读取的安全Cookie保存。",unauth:"验证邮箱后可查看账户状态。",loading:"正在检查账户…",emailSent:"已请求验证邮件，请查收。",signedIn:"已登录。",signedOut:"已退出登录。",failed:"处理失败，请检查输入或配置。",codeFailed:"验证码错误或已过期。",free:"没有有效的Plus订阅",plus:"已确认有效Plus订阅",unknown:"无法验证订阅状态"},
"zh-TW":{title:"你的 Plus 帳戶",intro:"帳戶與訂閱管理正在準備中。設定驗證服務後才能使用電子郵件登入。",pendingTitle:"帳戶功能準備中",pendingText:"尚未連接驗證服務，因此無法註冊或購買Plus。",signinTitle:"電子郵件登入",emailLabel:"電子郵件地址",sendCode:"傳送驗證碼",otpNote:"請輸入郵件中的一次性數字驗證碼，無需密碼。",codeLabel:"電子郵件驗證碼",verifyCode:"登入",memberTitle:"我的帳戶",planLabel:"訂閱狀態",planNote:"訂閱由伺服器驗證，付款頁面成功不會直接開啟Plus。",signOut:"登出",privateNote:"登入會話使用瀏覽器腳本無法讀取的安全Cookie儲存。",unauth:"驗證電子郵件後可查看帳戶狀態。",loading:"正在檢查帳戶…",emailSent:"已要求驗證郵件，請查收。",signedIn:"已登入。",signedOut:"已登出。",failed:"處理失敗，請檢查輸入與設定。",codeFailed:"驗證碼錯誤或已過期。",free:"沒有有效的Plus訂閱",plus:"已確認有效Plus訂閱",unknown:"無法驗證訂閱狀態"}
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
function setBusy(value){busy=value;for(const id of ["sendCode","verifyCode","signOut"])$(id).disabled=value}
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
  message(res.ok?"emailSent":"failed",!res.ok);
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
refresh();
})();
