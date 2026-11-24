# SAYNUE launch operations and quality checklist
## Current rollout
- Shared evidence-first coaching rubric across standard, specialist, rehearsal and Plus. No additional model calls. The rubric is a quality hypothesis; mock tests do not establish actual model accuracy.
- Previous/current summary comparison is session-only, never evidence of changing feelings. Existing optional local situation storage remains unchanged.
- Six topic-specific guides (KO/JA/EN), sitemap and hub links.
## Zero-budget operations
1. Connect an approved Upstash Redis REST project with UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in production only. Use dedicated random RATE_LIMIT_SALT and SAYNUE_ANALYTICS_SALT; configure a separate SAYNUE_ANALYTICS_READ_TOKEN (at least 24 chars). Never paste secrets in GitHub or chat.
2. After testing Redis, set SAYNUE_REQUIRE_DISTRIBUTED_LIMIT=true and SAYNUE_MAX_DAILY_AI_REQUESTS to a conservative integer, e.g. 50. The cap counts accepted or rejected request attempts at the limiter, not tokens or actual cost; each request may retry upstream. It applies to free analysis and rehearsal, not Plus. Missing/failed Redis fails closed when enabled. No environment changes made by this patch.
3. Before inviting actual users, review Gemini data handling, consent, privacy policy, provider account terms, Vercel plan eligibility and any costs. Never claim zero retention or full anonymization. Set provider-side quota/budget controls separately.
4. Verify the production commit and actual saynue.vercel.app alias after each deployment. Submit sitemap.xml in Search Console; indexing is not guaranteed.
## Quality validation
Use synthetic messages in five languages. Score observation accuracy, uncertainty, concrete next action, natural reply, boundary respect and privacy (0/1/2 each). Explicit refusal or fabricated quote is a blocking defect. Compare outputs against the prior version on the same cases; no real private conversations. Track latency and failures without conversation logging.
## Monetization
Free: core report, one draft, basic rehearsal and follow-up. Planned Plus: strategic alternatives with tradeoffs, response scenarios and higher usage limits. Keep current checkout and engine disabled until provider approval, auth/DB migrations, signed webhook, entitlement, refund/cancel and privacy/legal review are verified. No prices, live payment or subscription promises in this patch.

## Second hardening patch
- Explicit standard-mode shouldReply flag suppresses drafts on no-reply outcomes; common contact identifiers masked in reports and saved summaries. No guarantee of complete anonymization. Sharing now includes only the service name/link, not report text or scores.
- Expired saved summaries are removed on next browser access; reset clears follow-up comparison and consent. Browser storage cannot be cleaned while the site is closed.
- Opt-in reply copy and analysis failure metrics added to the protected owner dashboard. Copy is not a sent message; failures can overlap with later successful attempts. Redis configuration still required.
- Five localized conflict guides added. Existing billing gates remain closed.
