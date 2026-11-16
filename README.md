# SAYNUE · Read Between the Lines

스마트폰에서 관리하는 **SAYNUE** Vercel MVP. 기존 Pandok_ki GitHub 저장소와 Vercel 배포 연결은 유지합니다.\n\n**실서비스 주소: https://saynue.vercel.app** · 이전 주소 `https://pandokki.vercel.app`도 유지합니다.

- **assets/site.css** / **assets/saynue-mark.svg** / **favicon.svg** — 절제된 Midnight/Lavender UI, 모바일 로고, 브라우저 아이콘\n- **index.html** — 모바일 UI, 한국어/일본어/영어/중국어 간체/번체, 메신저 7종, 텍스트/이미지 입력, 개인 정보 없는 결과 공유, 유료 기능 소개
- **api/analyze.mjs** — 서버에서만 Gemini 호출; 대화 입력 검증, 무료 결과만 반환, 속도 제한, API 오류 처리
- **tests/smoke.mjs** / **.github/workflows/test.yml** — 무료 자동 테스트 (배포에 별도 설정 불필요)

## 1. iPhone에서 배포하기

1. Vercel 계정에 로그인하고 **Add New → Project → Import Git Repository**에서 **jiseong0310ab-del/Pandok_ki** 선택.
2. **Framework Preset: Other**, **Root Directory: ./** 을 선택하고 Build Command는 비워 두기.
3. **Settings → Environment Variables**에서 다음을 추가:
   - **GEMINI_API_KEY**: [Google AI Studio](https://aistudio.google.com/apikey) 발급 키 (필수). 코드/GitHub에는 절대 입력 금지.
   - **GEMINI_MODEL**: gemini-3.5-flash-lite (선택; 기본값, 고급 모델 gemini-3.8-flash도 지원)
4. **Deploy**. 이후 GitHub main에 푸시할 때 자동 재배포.
5. 환경변수 수정 후 **Redeploy**. 앱에서 테스트 대화로 분석이 되는지 확인.

Vercel이 api/analyze.mjs를 Node Function으로 감지합니다. 메신저 계정에 로그인하거나 메신저 API와 직접 연동하는 방식이 아니라 **대화 복사/스크린샷 입력** 방식입니다. LINE·WeChat 등 메신저별 파서는 초기 버전에서 Gemini 이미지 이해에 의존하므로 화면 구조별 품질 점검이 필요합니다.

## 2. 보안 / 비용 / 개인정보 주의

- 브라우저에는 Gemini API 키, 비밀번호, 유료 원문이 없습니다.
- **Gemini 무료 요금제**: 입력·출력이 Google 제품 개선에 사용될 수 있습니다. 따라서 실제 이름, 전화번호, 얼굴, 주소, 직장 정보, 건강 정보 등의 민감정보를 넣지 않도록 사용자에게 알립니다. 실제 사용자 대화 업로드를 받는 상용 서비스는 **유료 Gemini API의 데이터 처리 조건을 검토하고 적용**하는 것이 권장됩니다.
- 앱 자체 DB에는 대화를 보관하지 않습니다. 하지만 Vercel/Google의 인프라 처리·보관·로그 정책은 별개입니다. 즉시 완전 삭제, 무조건적인 비밀 보장 또는 "제로 보관"을 주장하면 안 됩니다.
- 입력은 텍스트 최대 12,000자 / 스크린샷 1장 (전송 전 JPEG로 축소). Vercel Function 바디 제한을 고려했습니다.
- 서버는 출처와 입력을 검사하고 모델 출력 필드를 제한합니다. 대화 속 명령은 신뢰할 수 없는 데이터로 취급합니다.
- 기본 요청 제한(1개 서버 인스턴스당 IP별 시간당 6회)은 **개발용 임시 제한**입니다. 분산 인스턴스 및 악의적 접근을 충분히 방어하지 못합니다.
- **공개 베타 전 강력 권장**: Upstash Redis REST를 연결하여 분산 일일 제한 적용:
  - **UPSTASH_REDIS_REST_URL**
  - **UPSTASH_REDIS_REST_TOKEN**
  - **RATE_LIMIT_SALT** (충분히 긴 랜덤 값, 권장)
  - **MAX_DAILY_PER_IP** (선택, 기본 25)
  Redis 설정 일부만 있거나 Redis가 장애면 안전하게 분석 요청을 거절합니다. 추가적으로 Vercel WAF/봇 검증과 API 예산 알림을 설정하세요.
- 글로벌 출시 전 사용자 개인정보처리방침, 이용약관, 삭제·문의 채널, 지역별 개인정보/미성년자 규정을 검토해야 합니다. 중국 본토에서는 Google Gemini의 서비스 접근성과 국외 데이터 이전 관련 규정을 별도로 확인해야 합니다.

## 3. 무료 / 유료 전략

현재 무료: 요약, 호의적 대화 신호, 상호성, 근거량, 주요 근거, 다른 가능성, 다음 행동, **개인 목표에 따른 답장 예시 1개와 이유**.\n\n분석 목표 4종: 대화 이해 / 자연스러운 답장 / 어색한 분위기 회복 / 경계 표현.\n개인정보를 입력 전에 일부 가리는 **연락처·이메일·링크 간이 마스킹** 버튼 제공(이름·얼굴은 직접 가려야 하며 완전 익명화 아님).

유료 예정: 실제 대화에 맞춘 답장 초안 3개, 상황별 대안 해석, 관계 흐름별 전략.

**결제/구독은 아직 연결되지 않았습니다.** 결제 CTA는 비활성화되어 있으며 유료 원문은 서버에서 생성하거나 클라이언트로 전송하지 않습니다. 클라이언트 상수로 된 공용 해제 코드 / CSS 블러 잠금은 유료 보안으로 사용할 수 없습니다. 결제 제공업체를 결정한 뒤 웹훅, 서버 측 검증, 구매 내역 저장소, 환불/중복 사용 처리까지 구축한 후 활성화하세요.

## 4. 테스트

GitHub Actions가 main의 모든 푸시와 PR에 Node.js 22 환경으로 smoke tests를 실행합니다. 로컬 실행 명령은 **node --test tests/smoke.mjs**. **Gemini API 키가 없기 때문에 자동 테스트는 실제 Gemini 요청을 호출하지 않습니다.** 배포 후 안전한 가상 대화로 실서비스 통합 테스트가 필요합니다.

### 참고 문서
- [Gemini pricing / data use](https://ai.google.dev/gemini-api/docs/pricing)
- [Gemini terms of service](https://ai.google.dev/gemini-api/terms)
- [Vercel Functions](https://vercel.com/docs/functions)
- [Vercel 4.5MB body limit](https://vercel.com/docs/functions/limitations)

## 5. 2026-11-17 실제 연동 테스트

새 AI Studio 프로젝트에서 gemini-2.5-flash는 모델 메타데이터 조회에는 성공하더라도 generateContent에서 404가 날 수 있습니다. Google은 새 프로젝트에 최신 3.x 모델 사용을 권장합니다. 기본 모델을 gemini-3.5-flash-lite로 교체하고, 이전 버전에서 사용한 thinkingBudget: 0 설정도 제거했습니다.

서버 키를 사용한 합성 예시 대화 분석에서 **HTTP 200**과 무료 리포트 8개 필드 반환을 확인했습니다. 테스트 중 사용한 임시 진단 API는 제거했습니다. 실사용자가 입력하는 개인정보는 테스트에 사용하지 않았습니다.

모델과 무료 API 정책은 변할 수 있습니다: [Gemini deprecations](https://ai.google.dev/gemini-api/docs/deprecations), [pricing](https://ai.google.dev/gemini-api/docs/pricing).

## 6. SAYNUE 브랜딩 패치 (2026-11-17)

- 공식 서비스명 **SAYNUE / 세이뉴**, 슬로건 **Read Between the Lines**.
- 깊은 네이비(#0B1020)와 절제된 라벤더, 오프화이트를 사용하는 에디토리얼 스타일로 교체. 네온·홀로그램·왕관 장식 배제.
- SVG 심벌, favicon, 모바일 반응형 CSS, 다섯 언어의 히어로 카피 및 CTA, 미리보기 리포트(명시적 예시 수치) 추가.
- 기존 GitHub 저장소 `Pandok_ki`, 서버 Gemini 키, 데이터 검증, 무료 분석 및 유료 비활성화 정책 유지.
- 새 무료 도메인 `saynue.vercel.app`은 Vercel 프로젝트에 연결되었고 인증되었습니다. `saynue.app`/`saynue.ai` 등 유료 독립 도메인은 **구매하지 않았고 보유를 보장하지 않습니다**.

## 7. 실제 고객 가치 검증 패치 (2026-11-17)

- `api/analyze.mjs`: 선택한 사용자 목표(goal) 기반의 근거 있는 분석과 `replyDraft`, `replyWhy` 반환. 무료 결과는 10개 필드만 허용.
- `index.html`: 목표 4가지 선택, 바로 쓸 수 있는 수정 가능한 답장 1개, 복사, 개인정보 간이 마스킹.
- `assets/site.css`: 기존 SAYNUE 다크 에디토리얼 디자인 안에 위 기능을 반응형으로 통합.
- 검증: 일본어 LINE의 답장 작성, 한국어 카카오톡의 경계 표현을 **합성 가상 대화**로 실제 배포 Gemini에서 테스트하여 HTTP 200 및 10개 필드 반환 확인. 개인정보를 포함한 사용자 대화는 테스트하지 않았음. 임시 테스트 경로 제거.
- 가치/수익 계획: [`docs/product-strategy.md`](docs/product-strategy.md). 가격, 코칭 패키지, 구매 버튼은 아직 출시한 기능이 아님.

## 8. 품질 평가·명시적 피드백 패치 (2026-11-17)

- `api/feedback.mjs` — **명시적 선택 이후에만** 평가(도움됨/아쉬움), 언어, 분석 목표를 받아 처리. 입력의 자유 텍스트·대화·답장·점수·원본 IP는 저장하지 않음. 미허용 필드는 거절.
- `index.html` — 리포트 아래에 익명 범주형 피드백 버튼과 처리 성공/실패 안내. 다른 대화로 다시 시작할 때 평가 UI도 초기화.
- 단기 로깅만 가능한 현재 설정에서는 통계의 지속 보존이 불가능. 장기 집계를 원하면 Vercel 환경변수에 **UPSTASH_REDIS_REST_URL**과 **UPSTASH_REDIS_REST_TOKEN**을 직접 연결하고, Redis 만료 정책을 검토해야 함.
- `tests/quality-cases.mjs` 합성 대화 **30개**(5언어×6); `tests/quality.test.mjs` 모의 Gemini 요청 계약 30건, `tests/feedback.test.mjs` 개인정보·출처·횟수 검증. 실제 모델의 의미적 정확도를 증명하지는 않음.
- 실서비스 Gemini 6개 합성 사례를 확인. 첫 일본어 사례에서 드물게 형식 오류가 발생해 **제한적 자동 재시도 + 예비 모델 전환**을 추가했으며, 거절 상황에서 **답장하지 않는 조언**도 허용.
- 테스트 범위와 평가 척도: [docs/quality-and-privacy.md](docs/quality-and-privacy.md).
- 공식 GitHub CI가 실행됐는지는 이 문서만으로 확정할 수 없음. `node --test tests/smoke.mjs tests/quality.test.mjs tests/feedback.test.mjs` 명령으로 재검증 가능.

## 9. 개인 개발자 수익화 준비 (2026-11-17)

- **Free + Plus 구독(예정) + 공개 가이드 광고(장래)**. 가격·결제·광고는 **실행되지 않음**.
- `/plans.html`: Free/Plus 제안 기능 비교(한국어, 일본어, 영어, 중국어 간체·번체), 결제 불가 및 미확정 가격 명시.
- `/guide.html`: 사용자가 공개적으로 읽는 독창적인 커뮤니케이션 가이드. AdSense 스크립트를 넣지 않았으며, 사적 대화 분석 페이지에는 광고를 넣지 않음.
- 사이트 심사·판매자 실명·법적 이용약관/개인정보처리방침/환불·해지 조건·계정 심사·비밀키·웹훅·DB가 완료되기 전까지 실제 고객에게 과금하지 않는다.
- `tests/monetization.test.mjs`: 5개 언어 정보성 페이지 및 결제 기능이 비활성 상태인지 테스트.
- 개인 판매자 Paddle/Stripe 일본 자격, AdSense, 개발 로드맵: [docs/individual-monetization-onboarding.md](docs/individual-monetization-onboarding.md).
