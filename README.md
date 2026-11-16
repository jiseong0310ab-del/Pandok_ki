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

현재 무료: 요약, 호의적 대화 신호, 상호성, 근거량, 주요 근거, 다른 가능성, 다음 행동.

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
