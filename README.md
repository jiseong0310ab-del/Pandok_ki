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

## 10. Paddle Sandbox 결제 테스트 (2026-11-17)

- 사용자 본인이 Paddle Sandbox에 생성한 SAYNUE Plus의 월 구독 Price ID와 공개용 client-side token을 단독 테스트 페이지에 연결.
- 개발용 테스트 페이지: https://saynue.vercel.app/sandbox-checkout.html (noindex, 일반 사용자 탐색/요금제 화면에서 링크하지 않음).
- 공식 Paddle.js v2를 불러와 **Paddle.Environment.set("sandbox") 고정** 후 브라우저 클릭으로 테스트용 오버레이 결제를 실행. 테스트 카드 4242 4242 4242 4242 / 미래 유효기간 / CVV 100 사용.
- Sandbox 가격은 Paddle 화면에서 직접 확인. 해당 가격의 실제 주기·통화·수량 설정은 서버 API로 검증하지 않았으므로 테스트 결제창 표시를 확인할 것.
- 결제 완료 UI 이벤트는 **메시지만 표시**하고 Plus 권한을 절대로 활성화하지 않음. 로그인, 웹훅 서명 검증, DB, 이력 처리, 구독/취소 기능이 아직 없음.
- 실결제·광고·유료 기능 공개는 모두 기존대로 비활성화. 테스트만 진행하고, 실판매 전 Paddle 심사·체류자격/법률 문제를 확인.
- 구현 및 수동 검증 안내: [docs/paddle-sandbox.md](docs/paddle-sandbox.md).

## 11. 경쟁 앱 기능 비교 · 첫 실사용 가치 개선 (2026-11-17)

- 경쟁 서비스 Clarity Chat, Sumondo, RIZZA, Tellsy, TextSense의 공개 제품 설명과 최신 SAYNUE 소스 기능을 비교하고 **P0 결제/개인정보 위험, P1 입력·결과 경쟁력, P2 반복 사용**으로 정리.
- **이번 실제 패치**: 답장 톤 4가지(자연스러운/다정한/담백하고 분명한/편안하고 가벼운)를 기본 접힘 UI로 추가. 5개 언어 지원. 클라이언트에서 선택한 스타일을 서버에 보내고, 서버는 허용값만 받으며 기존 버전은 natural로 처리. 무료 제공 답장은 여전히 1개.
- Gemini 프롬프트에 근거 구체성 및 '톤은 표현 선호일 뿐 상대 마음을 추측하는 증거가 아님'을 명시. 거절 상황에서는 추가 메시지 강요 금지.
- 가상 일본어 LINE 대화 + warm 톤으로 **실서비스 Gemini 테스트 HTTP 200, 10개 결과 필드/일본어 답장 정상**을 확인하고, 임시 테스트 API는 삭제. iPhone 실기기·다른 톤별 표현 적합성 검증은 별도 필요.
- **중요**: Paddle AUP에 데이팅 서비스 및 사람의 자동 분류가 금지 항목으로 기재되어 있어, SAYNUE가 승인 대상인지는 서면 사전 확인 필요. Sandbox 테스트 성공은 판매 허용이 아님.
- [전체 경쟁 기능 검수 및 우선순위](docs/competitive-audit-2026-11.md).

## 12. 3장 스크린샷 분석 + 개인정보 가리기 (2026-11-17)

- iPhone/모바일 Safari를 고려한 **최대 3장 사진 선택, 시간 순서 변경, 사진 삭제** 구현. 사진별로 Canvas에서 손가락으로 불투명한 검은색 마스킹, 펜 굵기 선택, 마지막 마스킹 취소 제공.
- 모든 사진에 대해 **사용자가 직접 '확인 완료'**해야 분석 시작 가능. 가림 수정·취소 시 재확인을 요구하며, 서버에는 각 사진의 **가린 뒤 JPEG 데이터만** 보내고 원본·파일명은 보내지 않음.
- 사진이 자동 익명화되는 것은 아님. 마스킹이 부족한 곳이나 이름·얼굴·연락처·주소 등이 남아 있다면 그대로 Google Gemini로 전송될 수 있으므로 사용자 확인 필수.
- API는 새로운 images 배열에 JPEG 1~3장을 받으며 각 이미지 용량과 합계를 제한. 사진 순서를 명시해 Gemini에 전달. 기존 단일 imageBase64 및 텍스트 요청도 유지.
- 자동화·모의 검증: 3장 순서, 4장 이상 차단, 사진 확인 전 전송 차단, 가림 변경 후 재확인, 기존 단일 사진 호환. Gemini 실서비스에 비식별 테스트 JPEG 2장을 보내 **HTTP 200과 필수 결과 10개 필드** 확인. 임시 검사용 서버 경로 제거.
- 테스트 파일: tests/screenshot-editor.test.mjs 및 tests/smoke.mjs. 실제 iPhone 사진 편집/터치감과 캡처 내 한일중 문장 판독 정확도는 별도 실기기 QA 필요.
- Paddle 결제 Sandbox 페이지와 Plus 유료 권한은 이전대로 분리/비활성.

## 13. 출처와 해석을 분리한 근거 카드 (2026-11-17)

- Gemini가 실제 대화에서 확인한 짧은 표현을 **원문 인용 → 가능한 해석 → 다른 설명** 3단으로 최대 3장 제시.
- **텍스트 대화는 서버가 인용 문장이 원본 텍스트의 정확한 연속 부분 문자열인지 재확인**. 일치하지 않는 가짜 인용·중복·연락처·링크 등은 출력 카드에서 제외.
- **스크린샷은 원문 텍스트를 서버에서 자동으로 검증할 수 없으므로** 표시된 이미지 번호와 함께 'AI 판독·원본 확인 필요' 고지. 불분명하면 근거 카드 생성을 생략.
- 카드가 없거나 기존 버전 모델 응답이면 요약·기존 근거·다른 가능성·다음 행동은 그대로 노출. 기존 무료 1개 답장, 5개 언어, Paddle Sandbox 모두 유지.
- 브라우저 렌더링은 모든 동적 텍스트를 `textContent`로 넣어 HTML 삽입이 발생하지 않도록 함. 새 인용문 및 분석 내용은 원문과 함께 DB에 저장하지 않는 기존 구조 유지.
- **실제 Gemini 실서비스 통합 검증**: 가상 한국어·영어 대화에서 각각 근거 카드 2개 생성, 총 4개 인용 모두 입력 원문에 실제 존재하는 것을 확인, HTTP 200. 실사용자의 사적 대화는 테스트하지 않았음. 임시 테스트 API 삭제.
- 테스트: `tests/smoke.mjs`에서 원문 일치·가짜 인용 제외·중복/연락처 제외·스크린샷 출처 번호 검증; `tests/quality.test.mjs`에서 5개 언어 구조 계약 유지.
- 한계: AI의 *해석* 자체는 원문과 일치하는 인용이 있어도 사실이 아닐 수 있음. 특히 이미지 OCR 인용의 정확도는 사용자가 직접 검토해야 함.

## 14. Plus 답장 3전략·반응별 4상황 내부 프로토타입 (2026-11-17)

- **서버 내부 AI 생성 모듈**: [lib/plus-coach.mjs](lib/plus-coach.mjs). 따뜻하게(gentle) / 명확하게(clear) / 부담 없이(low_pressure) 세 가지 전략별 **문장·선택 이유·단점·적합한 상황** 제공. 사용자의 말투·목표·관계·메신저·5개 언어·최대 3장 스크린샷 지원.
- 상대가 적극 응답 / 불확실 / 답장 없음 / 명시적인 거절의 **네 가지 후속 대응**. 명시적 연락 중단 요청이라면 **shouldReply=false, 대체 연락 문장 0개**만 유효. 응답 구조 오류·무효 가격/비밀키 노출이 아닌 개인정보·중복문구 검증을 강화.
- **사용자에게 보이는 것은 가상 대화를 이용한 정적 기능 미리보기**: [plans.html](plans.html) + [assets/plus-preview.js](assets/plus-preview.js). 5개 언어 및 iPhone 탭 UI 지원. **실사용자 Plus AI 호출/결제/구독 권한 해제는 아직 불가능**.
- 가상 한국어 친구 대화를 실제 Gemini로 호출해 **서로 다른 3전략 + 4반응과 장단점** 정상 생성(HTTP 200)을 확인. 임시 검사용 API는 삭제.
- 추후 회원 인증, DB, Paddle Webhook 원본 서명 검증 및 중복 처리, 사용자별 실제 권한/쿼터 확인을 구현해야 기능을 공개할 수 있다. [개발·판매 선행조건](docs/plus-coach-development.md).
