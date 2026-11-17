# SAYNUE — iPhone UI preview (separate from production)

## Purpose

- Live production stays on `main` → Vercel → https://saynue.vercel.app
- Mobile UI experimentation stays on `dev-preview` → GitHub Actions → GitHub Pages
- Preview has **no Gemini, Supabase, Paddle or real server endpoint**. It runs locally generated sample reports, deliberately ignores user chat/image data and doesn't send it to servers. Do not use real private chat even in a UI preview.
- Screenshots can still be selected and masked in browser memory to test iPhone touch layout.
- The Pages site is **public**; never place secrets, private user chats, Supabase secret keys, or internal reports in this branch.

## One-time GitHub action for repository owner

Open https://github.com/jiseong0310ab-del/Pandok_ki/settings/pages

1. In **Build and deployment**, set **Source → GitHub Actions**.
2. Save the setting. (The site cannot be published via connector configuration currently.)
3. Once enabled, trigger the workflow from **Actions → SAYNUE mobile UI preview (no Vercel) → Run workflow**, selecting `dev-preview`; or ask ChatGPT to make a new UI commit on `dev-preview`.

Expected public URL **after successful Pages deployment**:
https://jiseong0310ab-del.github.io/Pandok_ki/

Check **Actions → SAYNUE mobile UI preview (no Vercel)** for publication status. A new `dev-preview` commit automatically updates the preview without any Vercel deployment.

## How to test on iPhone

1. Open the Pages preview URL in iPhone Safari after the GitHub Pages deployment succeeds.
2. Pick a persona, change the locale, open/collapse advanced settings, paste a fictional conversation or use **Sample**, test screenshot redaction and view a sample report.
3. The header says **UI PREVIEW** and analysis outputs are visibly labelled sample; the demo uses the same current HTML, CSS and screenshot editor as the application but does **not** call Gemini or persist messages.
4. Send layout screenshots and feedback. The next design changes go to `dev-preview` only.
5. Once ready, integrate the approved changes into `main` in **one reviewed batch** and do one Vercel production deployment.

## Protection from Vercel quota

Vercel project's `previewDeploymentsDisabled` was set to `true` while this separate Pages UI preview is used. Production deploys are **not** disabled, but the assistant should avoid frequent commits to `main`: combine work on `dev-preview` and merge only validated changes. GitHub Pages publishes public static output, not backend endpoints.

## Files

- `scripts/build-ui-preview.mjs` — builds the exact source UI for a nested Pages path, strips any real API flows and changes the privacy copy.
- `preview/demo-api.js` — intercepts all `/api/*` calls, generates static local fixture results in five languages, and ignores pasted chat/screenshots.
- `tests/preview-build.test.mjs` — verifies no secrets/backend are included, privacy copy, path handling, and absence of outgoing API calls.
- `.github/workflows/ui-preview.yml` — runs only for `dev-preview`, deploys via GitHub Pages and doesn't request Vercel at all.

If GitHub Pages is disabled due to repository policy or GitHub account restrictions, do not claim the site is live. Troubleshoot Pages settings and workflow failures before sharing a published preview link.
