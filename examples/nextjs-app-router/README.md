# TON Pay — Next.js App Router example

Runnable reference for the TON Pay skill, targeting Next.js 15 App Router.

**Default path:** dashboard-free. No TON Pay merchant account required. Client polls `getTonPayTransferByReference` to detect payment completion.

**Optional upgrade:** webhook-based confirmation via the TON Pay Merchant Dashboard. The webhook route (`app/api/ton-pay/webhook/route.ts`) is included but is only exercised if you fill in `TONPAY_API_SECRET`.

## Prerequisites

**For the default path (no dashboard):**
1. A testnet TON recipient address (Tonkeeper → Developer Mode → Testnet gives you one)
2. `ngrok` or equivalent tunnel
3. Node 18+

**Only if you want webhooks:**
4. TON Pay merchant account + testnet API key + API secret (Merchant Dashboard → Developer → Webhooks, Testnet environment)

## Setup

```bash
cp .env.example .env.local
# Required fields:
#   NEXT_PUBLIC_TON_RECIPIENT_ADDR
#   NEXT_PUBLIC_TONPAY_CHAIN=testnet
#   NEXT_PUBLIC_APP_URL   <-- set this AFTER starting ngrok
#
# Optional (only for webhooks):
#   NEXT_PUBLIC_TONPAY_API_KEY
#   TONPAY_API_SECRET
```

## Run

```bash
# Terminal 1
npm install
npm run dev                 # http://localhost:3000

# Terminal 2
ngrok http 3000
# Copy the https:// URL, set it as NEXT_PUBLIC_APP_URL in .env.local, restart npm run dev
```

## Update the manifest

Edit `public/tonconnect-manifest.json`:

```json
{
  "url": "<your-ngrok-url>",
  "name": "TON Pay Example — Next.js",
  "iconUrl": "<your-ngrok-url>/icon-180.png"
}
```

Place any 180×180 PNG at `public/icon-180.png`.

## Make a testnet payment

1. Visit `<your-ngrok-url>/checkout`
2. Click the TON Pay button
3. Connect Tonkeeper (testnet mode), sign the transaction
4. Watch the status update on the page — client-side polling hits `pay.ton.org` every 2–10s until `status === "success"`

## Optional — enable webhooks

Register a webhook URL in the TON Pay Merchant Dashboard → Developer → Webhooks:

```
<your-ngrok-url>/api/ton-pay/webhook
```

Add `TONPAY_API_SECRET` to `.env.local`, restart the dev server, and click "Send sample" in the dashboard. The route at [app/api/ton-pay/webhook/route.ts](app/api/ton-pay/webhook/route.ts) verifies the HMAC signature and runs the 7-step validation (see `../../reference/webhooks.md`).

## Verify end-to-end

| Check                              | Expected                                                  |
| ---------------------------------- | --------------------------------------------------------- |
| `/checkout` loads                  | Shows "TON Pay" button, no console errors                 |
| Click button                       | Wallet selector opens                                     |
| Sign on Tonkeeper testnet          | Status flips to "Waiting for confirmation..."             |
| Wait ~10 seconds                   | Status flips to "Paid" with a tx hash                     |
| (With webhooks) Server log         | `markOrderPaid` call for the reference                    |
| (With webhooks) "Send sample" x2   | Server returns 200, no duplicate `markOrderPaid`          |

If any step fails, see `../../reference/troubleshooting.md`.

## Production notes

- Replace `lib/orders-db.ts` with your real DB — the in-memory map resets on every restart.
- Move `TONPAY_API_SECRET` (if you use it) to your hosting provider's secret manager, never commit `.env.local`.
- For mainnet: flip `NEXT_PUBLIC_TONPAY_CHAIN=mainnet` and use your mainnet `recipientAddr`. If you're on the webhook path, also create mainnet API key + secret in the Dashboard and register your production webhook URL.
- Consider also running a server-side poller as a backstop in case the client closes their tab mid-payment — the webhook catches this automatically; the dashboard-free path needs server-side polling to be robust.
