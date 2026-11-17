# SAYNUE Plus coaching — internal prototype (2026-11-17)

**Status: coded and AI-tested but NOT publicly unlocked, sold, or reachable through a paid API.**

## Product concept
Free: evidence-led analysis, alternate interpretations, next step, one reply in chosen voice.
Plus (not released): for each analyzed conversation, compare three **strategy-distinct** messages instead of three cosmetic paraphrases:
- `gentle`: acknowledge the other person's constraints and reply warmly
- `clear`: establish a respectful concrete next step or boundary
- `low_pressure`: preserve choice and avoid urgency

For each option the generated result contains `draft`, `why`, `tradeoff`, and `bestWhen`. Plus also provides four conditional next-step branches for **engaged / uncertain / no reply / refusal**, with a warning per branch. A visible refusal or explicit no-contact request should produce `shouldReply: false`, **zero drafts and zero follow-up branches**, and a practical explanation of why to stop contacting the other person.

## Implemented
1. `lib/plus-coach.mjs`: standalone internal Gemini integration, supported languages Korean/Japanese/English/Chinese simplified/traditional, conversation context and tone, text or 1–3 redacted JPEG screenshots. Uses a separate strict structured-output schema and rejects malformed results, duplicate drafts, invalid conditional branches, contact details, and inconsistent no-reply decisions. The input chat is treated as untrusted data.
2. `plans.html` + `assets/plus-preview.js`: a **fully static fictional example**, available in all five languages. On iPhone users can tap the three approaches and four responses to compare trade-offs. No chat uploads, Gemini calls, cookies, Paddle sessions, client tokens or active checkout.
3. `tests/plus-coach.test.mjs`: unit tests for schema, no-contact behavior, input validation, image ordering, private-key isolation, missing key, and malformed AI outputs.
4. `tests/monetization.test.mjs`: verifies the planned Plus page and static preview never create checkout, client-side entitlement or AI requests.
5. Synthetic live Gemini test: a fictional Korean friend scheduling scenario returned **three strategies (gentle, clear, low_pressure), four branches (engaged, uncertain, no_reply, refusal)** with trade-offs, HTTP 200. Temporary test API was deleted after verification. Not a real-user privacy or safety evaluation.

## Why it is not public yet
The internal generator is **not a Vercel API route**. It is not called from the public frontend. Calling code must eventually implement and verify, server-side:
1. User authentication: an identity from a trusted session, not a client-supplied user ID.
2. Paddle Sandbox notifications: raw-body `Paddle-Signature` verification, event idempotency and reliable subscription state transitions.
3. Persistent DB: bind Paddle `customer_id` and `subscription_id` to the authenticated user. Handle active/trialing, paused, past-due, canceled, refunded or disputed statuses carefully.
4. **Enforce entitlement before any Gemini call**; each premium request must check DB-backed status **and per-user usage/budget quota**. The frontend cannot grant Plus access from a success screen or localStorage.
5. Test with actual Paddle Sandbox webhook events, subscription cancellation and renewal, refunds, webhook retry order, abandoned checkouts and unauthorized direct API calls.
6. Verify Paddle seller approval and product eligibility, Japanese immigration/business issues, privacy/legal policies, and final prices before any real charge. Paddle Sandbox test is not permission for live transactions.

## Privacy, safety and current limitations
- No actual customer conversation is stored by this prototype. A future paid API must revisit Gemini API data processing terms, consent, minimization, image redactions, retention and disclosures.
- An AI-generated text variant can still be unnatural or inappropriate even with structured schemas. Test scenarios must include explicit refusal, ambiguity, work/friendship situations, multiple languages and screenshot OCR failures.
- Literal strategy diversity is validated against duplicate drafts, but semantic quality cannot be proven by a string comparison. Human evaluation is required.
- Client-side static demo is an **illustrative example**, not a guarantee of what the model will generate for personal situations.
- Never add the Sandbox test client token, secret API key or webhook secret to the paid generator's source; only environment variables for secret keys when a trusted server route is added.

Useful files: `lib/plus-coach.mjs`, `assets/plus-preview.js`, `plans.html`, `tests/plus-coach.test.mjs`.

