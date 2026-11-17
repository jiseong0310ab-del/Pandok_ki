# SAYNUE 회원 인증 · Paddle Sandbox 구독 백엔드 설치 안내

작성: 2026-11-17 | 현재 상태: **코드 배포 완료 / 서비스 계정 및 비밀키 설정 전 / 실결제·Plus 공개 차단**

## 이미 구현된 구성

| 구성요소 | 위치 | 상태 |
|---|---|---|
| 이메일 OTP 요청·확인 / 로그인 세션 | `api/auth/start.mjs`, `api/auth/verify.mjs`, `lib/saynue-auth.mjs` | Supabase 설정 전에는 503 |
| 안전한 쿠키 세션·로그아웃·갱신 | `api/auth/logout.mjs`, `api/auth/state.mjs` | Secure, HttpOnly, SameSite=Lax; 서버에서 Supabase 사용자 확인 |
| 계정 화면 (5개 언어) | `account.html`, `assets/account.js` | Supabase가 연결되지 않으면 ‘준비 중’만 표시 |
| 서버 소유 거래 생성 | `api/plus/checkout.mjs` | Sandbox + 인증 + DB + 명시적 플래그 전에는 503 |
| Paddle 서명 검증 | `api/webhooks/paddle.mjs`, `lib/paddle-billing.mjs` | 원본 요청 서명 HMAC-SHA256, timestamp, 중복 처리 |
| Postgres 구독·웹훅 저장 | `docs/supabase-billing-schema.sql` | **실제 Supabase 프로젝트에 수동 실행해야 함** |
| 승인된 환불·차지백 권한 차단 | SQL RPC 및 검증된 adjustment webhook | 영구 차단, 수동 재확인 없이 자동 복구되지 않음 |
| 실제 Plus AI 호출 | `api/plus/report.mjs` | 인증+활성 구독+기간+결제 차단 여부+원자적 일별 quota + 플래그 전에는 503 |
| 기존 독립 가상 결제 | `sandbox-checkout.html` | 구독 사용자와 연결되지 않으며 Plus 권한 없음 |

**중요:** 기존 단독 Sandbox 결제 페이지에서 가상 결제했다고 해서 로그인 계정에 구독이 연결되는 구조가 아닙니다. 향후에는 반드시 **로그인 → 서버 거래 생성 → 해당 transactionId로 Sandbox 결제 → 서명 웹훅 → DB 상태 확인** 순서로 테스트해야 합니다.

## iPhone으로 계정 설정하기

### 1. Supabase 프로젝트 만들기

1. <https://supabase.com/dashboard> 에서 새 프로젝트 만들기 (실제 서비스 환경에서는 적절한 지역·보안 설정 선택).
2. **SQL Editor → New query**에서 `docs/supabase-billing-schema.sql`의 최신 코드 전체를 복사·검토한 뒤 실행. 기존 테이블명과 충돌이 없는지 확인.
3. **Authentication → URL Configuration**에서 **Site URL**을 `https://saynue.vercel.app`으로 변경하고, **Redirect URLs**에 `https://saynue.vercel.app/account.html`을 등록. 초기 기본값인 `http://localhost:3000`을 그대로 두면 이메일 확인 링크가 사용자 아이폰에서 열리지 않습니다.
4. **Authentication → Sign In / Providers → Email**을 활성화한 뒤, **Authentication → Email Templates → Confirm sign up 및 Magic Link**를 **둘 다** 열어 각각 링크 본문(`{{ .ConfirmationURL }}`)을 숫자 OTP 표시(`{{ .Token }}`)로 바꾸세요. 신규 이메일은 **Confirm sign up**, 기존 사용자는 **Magic Link** 템플릿이 발송될 수 있습니다. 예시: `<p>Your SAYNUE verification code: <strong>{{ .Token }}</strong></p>`.
5. 변경 전 발송된 `localhost:3000` 링크는 다시 사용하지 말고 세이뉴 `/account.html`에서 새로운 인증 코드를 요청하세요. 이미 링크로 이메일을 확인했다면 기존 사용자의 로그인 코드가 올 수 있습니다. 실제 사용자 대상 발송 전에는 SMTP, CAPTCHA, 발송 제한을 검토.
4. **Project Settings → API Keys**(또는 프로젝트 **Connect**)에서 Project URL, `sb_publishable_` 공개용 키, `sb_secret_` 서버용 Secret key를 확인. Secret key는 채팅·GitHub·브라우저에 노출하지 않기.

### 2. Vercel 환경변수 (Production) 추가

SAYNUE Vercel 프로젝트 → Settings → Environment Variables. 다음 이름 사용:

| 변수 | 용도 |
|---|---|
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` 공개용 API key |
| `SUPABASE_SECRET_KEY` | `sb_secret_...` 서버 전용 비밀키 (Secret) |
| `SAYNUE_PADDLE_ENV` | 반드시 `sandbox` |
| `PADDLE_API_KEY` | Paddle Sandbox 서버 API 키 (Secret) |
| `PADDLE_WEBHOOK_SECRET` | Sandbox notification destination의 서명 비밀키 (Secret) |
| `SAYNUE_PADDLE_SANDBOX_PRICE_ID` | `pri_01m7k4h86fsasy85vxy1w5d1bw` |
| `SAYNUE_PLUS_DAILY_QUOTA` | 예: `5` (최대 25로 제한) |
| `SAYNUE_ENABLE_SANDBOX_CHECKOUT` | 초기에는 미설정 또는 `false` |
| `SAYNUE_ENABLE_PLUS_ENGINE` | 초기에는 미설정 또는 `false` |

모든 비밀키는 Vercel 보안 저장소에 직접 설정하고 **저장 후 Redeploy**. 환경변수 값은 ChatGPT에 보내지 않아도 됩니다.

> 최신 연결 모듈은 **`sb_publishable_` / `sb_secret_` API 키**를 `apikey` 헤더로 전송하고, 해당 키를 JWT인 것처럼 `Authorization` 헤더에 넣지 않습니다. 기존 `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY` 구형 키도 호환되지만 **2026년 말 지원 종료 예정이므로 신규 프로젝트는 새 키 사용을 권장**합니다. 실제 로그인 사용자 JWT는 `Authorization` 헤더로 별도 전송합니다.

### 3. Paddle Sandbox 웹훅 등록

1. **Paddle Sandbox → Developer tools → Notifications / Events → Notification destinations** (UI 표기는 달라질 수 있음).
2. HTTP URL: `https://saynue.vercel.app/api/webhooks/paddle`
3. 최소한 `subscription.created`, `subscription.updated`, `subscription.activated`, `subscription.canceled`, `subscription.paused`, `subscription.past_due`, `adjustment.created`, `adjustment.updated` 이벤트 활성화.
4. 해당 destination의 **Endpoint secret**을 Vercel `PADDLE_WEBHOOK_SECRET`에 직접 저장. 이 값은 Sandbox API Key와 다릅니다.
5. 테스트는 Paddle Webhook Simulator 또는 직접 가상 거래로 진행. `event_id` 중복 전달, 오래된 이벤트, 거절·환불·차지백·취소·기간 만료를 반드시 확인.

### 4. 회원 인증 테스트

1. <https://saynue.vercel.app/account.html> 접속.
2. 설정된 Supabase OTP 메일을 받을 실제 본인 소유 이메일로 인증.
3. 서버가 반환한 `/api/auth/state`의 `authenticated:true` 확인. API나 개발자 도구에 토큰을 복사해 공유하지 않기.
4. 로그아웃, 잘못된 코드, 만료된 코드, 이전 브라우저 세션 유지/갱신, 앱 종료 후 재접속을 확인.

### 5. 구독 사용 테스트 (아직 승인된 후에만)

1. SQL이 정상 설치되고 Supabase·Paddle Sandbox 비밀키가 설정된 후 `SAYNUE_ENABLE_SANDBOX_CHECKOUT=true`를 설정.
2. 계정 화면 로그인 후 **Sandbox 테스트 결제 시작** → 서버가 로그인 계정과 결제 거래 ID를 DB에 기록해야만 결제 링크를 돌려줌.
3. Paddle의 공식 Sandbox 카드로 가상 결제.
4. 서명 확인된 `subscription.created`가 DB에 연결되고 이후 상태 갱신이 적용되는지 검증.
5. `api/auth/state`에서 서버 구독 상태 확인. 로그인 사용자와 관계없는 거래로는 Plus를 열어주지 않아야 함.
6. `SAYNUE_ENABLE_PLUS_ENGINE=true`는 위의 **정상/실패/환불/취소/권한우회/한도초과** 흐름을 실제로 검증한 뒤에만 켜기.

## 현재 제약과 출시 차단 조건

- **현재 Vercel에는 GEMINI_API_KEY 외 위 환경변수가 없음**(설치 전 조사 기준). Supabase DB도 아직 생성·SQL 실행되지 않음. 그래서 Plus와 인증은 실제 사용 불가.
- SUPABASE SQL/RPC, 로그인 이메일 템플릿, Paddle destination은 외부 관리 콘솔에서 직접 설정해야 하며, 코드 파일 배포만으로 연결되지 않음.
- SQL은 웹훅 이벤트를 Postgres 트랜잭션으로 처리하고 시각 역행을 차단하지만, 서버 다운 등으로 이벤트를 놓쳤을 때의 **Paddle API 정기 재동기화**, 복잡한 변경/다중 구독, 동일 시간 이벤트 정책은 추가 운영 검증 필요.
- 승인된 **부분 환불도 보수적으로 해당 구독을 차단**하며, 차단 해제는 별도 관리자 검토 및 감사 기록 없이 자동 처리하지 않음.
- Paddle 서비스 취급 승인 여부, 일본 내 체류자격·수익활동 허가 및 개인정보 고지/원가 제한 해결 전에는 **실제 판매 절대 금지**.
- 로그인 OTP 남용 방지(예: CAPTCHA/추가 분산 rate limit), 사용자 탈퇴/데이터 삭제, 메일 발송 신뢰성, 부정 결제·구독 변경 테스트도 출시 이전 필수.
- 기존 Sandbox URL은 단순 결제 테스트 전용이며 사용자의 계정 Plus 사용 권한을 만들지 않음.

공식 참고:
- <https://developer.paddle.com/webhooks/about/signature-verification/>
- <https://developer.paddle.com/build/subscriptions/provision-access-webhooks/>
- <https://developer.paddle.com/build/transactions/pass-transaction-checkout/>
- <https://supabase.com/docs/reference/javascript/auth-signinwithotp>
- <https://supabase.com/docs/guides/auth/auth-email-templates>
