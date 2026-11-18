# SAYNUE — opt-in retention metrics and remembered reply style

## What this update adds

1. A user-initiated **Remember my style** option inside the existing collapsed reply-tone settings: tone, response length (`short` or `normal`), and emoji preference (`none` or `subtle`). Only these three enums are saved in this browser. No message samples are saved.
2. A separate **optional product metrics** checkbox, off by default. Only a checked box permits the browser to create a random pseudonymous ID and send allowlisted event labels; it is independent from consent to send messages to Gemini for analysis.
3. A private owner dashboard at `/metrics.html`, connected to `/api/metrics?days=7|14|30`.
4. A rolling cohort view with D+1 and D+7 opt-in revisit counts, plus unique participants progressing to the analysis, continuation, simulation and plans-click stages.

## Setup (server environment, never in Git)

Existing Upstash Redis REST variables are used:

- `UPSTASH_REDIS_REST_URL`
- `UPSTASH_REDIS_REST_TOKEN`
- `SAYNUE_ANALYTICS_SALT` (recommended dedicated secret, 24+ random characters; otherwise existing `RATE_LIMIT_SALT` or `GEMINI_API_KEY` is used as the HMAC key)
- `SAYNUE_ANALYTICS_READ_TOKEN` (**required for dashboard access**; at least 24 unpredictable characters)

Use Vercel project environment settings to add them for the production deployment, then redeploy. Generate the dashboard token privately with a secure random generator, such as `openssl rand -hex 32`. Never commit or paste tokens into source code or URL query strings. The dashboard sends the token only as an Authorization bearer header, and stores it nowhere.

If Redis is unconfigured, the new metrics POST endpoint returns HTTP 503 and **core chat analysis, continuing sessions, and reply-style preferences still work**. No metrics are fabricated. If the read token is missing, the dashboard returns `READER_NOT_CONFIGURED`.

## Data collection and privacy

No consent: no pseudonymous ID, no new metrics HTTP requests, no metrics stored. An explicitly enabled checkbox saves a random 128-bit ID and the UTC first-consent date in localStorage. The ID and one allowlisted event name are transmitted. **Never** send raw conversations, screenshots, generated replies, situation summaries, names, email, user agent or page URLs to metrics.

The server HMAC-hashes IDs using a server-side secret and records aggregate daily counts and HyperLogLog approximate unique visitors. The server does not store raw IDs or IPs in analytics keys. Each pseudonymous ID is rate-capped at 65 reported events/day. Local consent ID expires after 30 days (reconsent required). Server aggregation buckets and hashed rate-limit keys expire within 45 days.

Consent can be revoked at any time using the same checkbox. Revoking deletes the local identifier immediately and stops future reporting; previously contributed **anonymous aggregates cannot be individually removed**. Browser or hosting provider logs are governed separately by their own policies.

## Event interpretation

Allowed events: `visit`, `analysis_started`, `analysis_completed`, `followup_started`, `followup_completed`, `library_saved`, `simulation_started`, `simulation_completed`, `plans_interest`.

- **Analysis conversion**: number of unique opted-in visitor IDs with analysis completion divided by unique opted-in visitors over the chosen time window. Values are approximate HyperLogLog estimates, not a rigorous cohort funnel.
- **D+1 / D+7 returns**: number of opted-in browser IDs that revisited exactly 1 or 7 days after opting in, divided by the first-day cohort. Not a measurement of all actual users. D+7 for immature cohorts is not displayed.
- **Plans interest**: a click on the Plans page link. **It is not a checkout, a purchase or revenue**. There is no real paid conversion KPI until payments are available and verified server-side.
- **Site performance, bounce rate and time-on-page**: intentionally not tracked.

## Manual acceptance checks

1. Open site in a fresh private browsing window. Verify neither `saynue:metrics-optin:v1` nor new network calls to `/api/metrics` occur until checking the optional usage consent.
2. Opt in. Confirm a visit event is sent, then analyze a conversation, use continue and simulation, and click Plans. Inspect only the three categorical event payload fields.
3. Opt out. Confirm local ID removal and no future metrics transmissions. Ordinary analysis must remain available.
4. In detailed settings, choose short, subtle emoji and a tone; tap **Remember my style**. Reload and confirm all three choices persist. Tap **Forget saved style** and reload: defaults should return.
5. Confirm GET `/api/metrics` without the read token returns 401 (or 503 if not configured) and access through the owner dashboard works with a configured token.
6. Verify all five locale labels on mobile. Main workflow should remain uncluttered.

## Caveats

This implementation is **production-capable code**, not proof of real retention yet. Metrics begin only after configuration and visitor consent. The server's event rate cap limits naïve abuse but does not fully prevent fraud or automated noise; use firewall, deployment logs and rate-limit monitoring before basing financial decisions on these figures.
