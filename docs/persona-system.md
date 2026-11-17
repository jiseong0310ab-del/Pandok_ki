# SAYNUE Persona System — Specialized AI Communication Experts

2026-11-17 · v1 implementation

## Product direction

Personas change the actual **task, rubric, structured report, reply advice, and sample context** — not merely the tone of the original conversation analyzer.

| Code | Name | Report sections | Relation / goal defaults |
|---|---|---|---|
| standard | General Conversation | Existing cues, evidence, alternate explanations, one reply | talking / understand |
| court | Couple Conflict Court | Your side; other side and unknowns; fair mediation and repair | dating / repair |
| work | Workplace Reply Coach | Work objective and facts; language risks; professional response | work / reply |
| romance | Dating Signals | Observable signals; uncertainty; low-pressure next move | talking / understand |
| mediator | Relationship Mediator | Common ground; misunderstanding; repair pathway | friends / repair |

## Technical implementation

- Main page persona picker supports 5 modes with highlighted selection; the chosen mode updates suggested relationship/goal, optional 500-character case notes, and sample chat.
- Specialized Gemini task rubrics and validated result schema are in lib/persona-analysis.mjs. The existing api/analyze.mjs route retains its free rate limit, image redaction contract, model retry strategy and the legacy standard response contract. Invalid modes are rejected before external calls.
- Result card uses its own section headings and evidence-level uncertainty, with one concrete next step and a ready-to-edit reply when appropriate. No guilty-person ranking, numerical blame percentage, romantic probability, formal legal judgement or diagnosis.
- The model is instructed that situation notes are the user's perspective, not independent proof of what another participant thinks. Exact quotes from pasted text must match that source verbatim; image-extracted quotes are explicitly marked unverified. Contacts/emails/URLs are not included in grounded excerpts.
- Available locales: Korean, Japanese, English, simplified Chinese, traditional Chinese.
- All four modes currently use the free API; the paid Plus subscription and Paddle Sandbox remain separate and are NOT unlocked.

## Real synthetic Gemini integration tests

We sent only harmless fictional conversations to the deployed analyzer through an explicitly temporary internal QA endpoint, then deleted that endpoint.

| Mode | Locale | HTTP status | Specialized fields | Exact text excerpt |
|---|---|---|---|---|
| court | ko | 200 | valid | verified |
| work | ja | 200 | valid | verified |
| romance | en | 200 | valid | verified |
| mediator | ko | 200 | valid | verified |

The new tests/personas.test.mjs covers mode-specific prompts, invalid modes/context, refusal replies, source excerpts, privacy and preservation of legacy free analysis. The GitHub CI workflow runs this suite separately. Actual iPhone Safari interaction and interpretation quality across complex conversations still require real-device/human evaluation.

## Suggested next upgrades

1. Couple court: two-sided evidence intake and source labels; avoid misleading certainty.
2. Workplace: direct templates for manager updates, schedule negotiations, apologizing, setting professional boundaries and client follow-up.
3. User value: persona-specific follow-up scenarios and outcome ratings without storing private conversations.
4. Safety and ops: real-world workplace and conflict evaluation, abuse monitoring, stricter distributed free quotas and Gemini cost controls.
5. Commercial: validate Paddle acceptance before offering paid premium results.
