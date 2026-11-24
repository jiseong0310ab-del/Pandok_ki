# SAYNUE Cloudflare Workers migration (staging)
Branch: migration/cloudflare-saynue. Do not delete or redirect Vercel until Cloudflare tests pass. Existing Vercel domain is provider-owned and cannot be transferred to Cloudflare.
## Cloudflare Dashboard
1. Workers & Pages > Create application > import Git repository Pandok_ki. Select this migration branch; do not use Pages.
2. Worker name: saynue (or another available name; match wrangler.jsonc if changed). Build command: node scripts/build-cloudflare.mjs. Deploy command: npx --yes wrangler@4 deploy. Root: repository root. Free plan.
3. Initial build variables: SAYNUE_INDEXABLE=false (default). Preview stays noindex. No secrets in build variables.
4. In Worker Settings > Variables and Secrets add GEMINI_API_KEY as a secret. Add only approved existing values from your own accounts. For authenticated features set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY and SAYNUE_PUBLIC_ORIGIN to the actual HTTPS origin (no path). Add the same origin to build variables. Update Supabase Auth allowed redirect to <origin>/account.html BEFORE enabling login. Never copy secrets into chat or GitHub.
5. Optional existing Upstash REST URL/token, RATE_LIMIT_SALT, SAYNUE_ANALYTICS_SALT, SAYNUE_ANALYTICS_READ_TOKEN. Strict distributed limits must remain off until Redis is configured and verified. Do not enable live or sandbox payment gates during staging.
6. Confirm root + learn pages and robots; confirm all 12 API paths, redaction, a synthetic text analysis and screenshot analysis on a real device, auth with an authorized test account, cookies, retry/error handling, and Worker CPU/1102 errors. Static and Node tests plus Wrangler dry-run do not establish runtime or provider compatibility.
7. Only after testing set SAYNUE_INDEXABLE=true in build variables, deploy to the intended permanent origin, update Search Console and Supabase allowlist; update any approved Paddle sandbox domains/webhook destinations when actually needed. Do not enable real charges. LocalStorage and cookies are origin-bound: old browser data and sign-in do not automatically transfer. Existing Vercel site can be kept as a rollback until verified. A future redirect-only change to Vercel needs separate approval and a final deployment.
## Local verification
node --test tests/cloudflare.test.mjs
node scripts/build-cloudflare.mjs
npx --yes wrangler@4 deploy --dry-run --outdir .wrangler-build
npx --yes wrangler@4 dev
Secrets for local development belong in ignored .dev.vars (never commit).
