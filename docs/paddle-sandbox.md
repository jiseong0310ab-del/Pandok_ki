# SAYNUE — Paddle Sandbox checkout integration

Implementation: 2026-11-17.

## Live testing page
- https://saynue.vercel.app/sandbox-checkout.html
- Unlisted and marked noindex. The public Plus page is still informational and does **not** charge.
- Loads official Paddle.js from https://cdn.paddle.com/paddle/v2/paddle.js.
- Calls Paddle.Environment.set("sandbox") before Paddle.Initialize.
- Uses the supplied Sandbox client-side token (public browser token, prefix test_) and Sandbox recurring price ID (prefix pri_).
- Paddle.Checkout.open uses a single item, quantity=1, with the supplied Sandbox price ID.
- Button is disabled until Paddle.js loads and initializes. On failures, the page shows a non-sensitive message; no checkout data is logged.
- checkout.completed changes *only an informational UI label*. It cannot grant Plus. No login, persisted subscription records, access guard, API key or webhook is connected yet.
- Tests/monetization.test.mjs ensures no Sandbox checkout link, test token, or SDK is present on the public main or plans page.

## Manual Sandbox test
1. Open https://saynue.vercel.app/sandbox-checkout.html in Safari.
2. Tap "Open test checkout".
3. Confirm the modal displays test mode, SAYNUE Plus, and the expected recurring price **in Paddle itself** (we have not verified the price amount via the merchant API).
4. Enter an email you control, choose a billing country, and use only the official test card **4242 4242 4242 4242** with any future expiration date and CVV **100**.
5. Confirm Paddle Sandbox -> Transactions and Sandbox -> Subscriptions show the corresponding test records.
6. Try Paddle's declined Sandbox card 4000 0000 0000 0002 and verify the checkout reports rejection.
7. If it fails, verify Paddle Sandbox -> Checkout -> Checkout configuration -> Default payment link is set to an HTTPS URL. For future transaction links and payment method updates, use **https://saynue.vercel.app/sandbox-checkout.html** as the Sandbox default payment link; the homepage URL may be enough for a basic overlay test but does not itself load Paddle.js.
8. On iOS Safari, if the button stays disabled, turn off content blockers for this site and retry. Blockers can interfere with external Paddle.js.

## Browser-safe vs secret credentials
- Sandbox client-side token is designed to appear in browser JS and is not a server secret.
- **Never** paste Paddle server API key, webhook signature secret, password, card details, or bank identity into ChatGPT/GitHub screenshots, README, or public repo.
- Later store server credentials only in protected Vercel environment variables; use least-privilege API key.

## Before real subscriptions or feature unlocking
- Confirm merchant approval, eligibility under Japanese immigration and business rules, legal terms/privacy/refund/renewal disclosures, and final real product benefits.
- Add authenticated user accounts and a trusted database; bind Paddle customer/subscription to internal user by server-verified identity.
- Register Paddle Sandbox webhook notification destination and securely store its secret in Vercel.
- Verify raw-body Paddle-Signature, process events idempotently, handle cancellations, renewals, refunds, disputes and payment failures.
- Only use trusted server-side subscription records to unlock Plus. **Never** trust a browser checkout.completed callback, success URL, or local storage.
- Run end-to-end approved test purchases, refund/cancel/renewal flows, then decide whether and when the live environment can be enabled. Live account uses separate credentials, prices and approved checkout domains.

Paddle official references:
- https://developer.paddle.com/paddle-js/about/
- https://developer.paddle.com/paddle-js/methods/paddle-environment-set/
- https://developer.paddle.com/build/transactions/default-payment-link/
- https://developer.paddle.com/build/go-live-checklist/
- https://developer.paddle.com/sdks/sandbox/
