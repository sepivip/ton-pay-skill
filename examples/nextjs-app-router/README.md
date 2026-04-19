# TON Pay — Next.js App Router example

Runnable reference for the TON Pay skill, targeting Next.js 15 App Router.

## Prerequisites

1. TON Pay merchant account with testnet API key + secret (Dashboard → Developer → API keys, Testnet environment)
2. A testnet recipient address (use Tonkeeper → Developer Mode → Testnet)
3. `ngrok` or equivalent tunnel

## Setup

```bash
cp .env.example .env.local
# Fill in:
#   NEXT_PUBLIC_TONPAY_API_KEY
#   TONPAY_API_SECRET
#   NEXT_PUBLIC_TON_RECIPIENT_ADDR
#   NEXT_PUBLIC_APP_URL   <-- set this AFTER starting ngrok
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

## Register the webhook

TON Pay Merchant Dashboard → Developer → Webhooks → add:

```
<your-ngrok-url>/api/ton-pay/webhook
```

Click "Send sample" — you should see a 200 in the Next.js dev log.

## Make a testnet payment

1. Visit `<your-ngrok-url>/checkout`
2. Click the TON Pay button
3. Connect Tonkeeper (testnet mode), sign the transaction
4. Watch the status update on the page (client-side polling)
5. Watch the server log show the webhook arrival and `markOrderPaid`

## Verify end-to-end

| Check                              | Expected                                                  |
| ---------------------------------- | --------------------------------------------------------- |
| `/checkout` loads                  | Shows "TON Pay" button, no console errors                 |
| Click button                       | Wallet selector opens                                     |
| Sign on Tonkeeper testnet          | Status flips to "⏳ Waiting for confirmation"             |
| Wait ~10 seconds                   | Status flips to "✅ Paid" with a tx hash                  |
| Server log                         | Shows `markOrderPaid` call for the reference              |
| Dashboard "Send sample" again      | Server returns 200, no duplicate `markOrderPaid`          |

If any step fails, see `../../reference/troubleshooting.md`.

## Production notes

- Replace `lib/orders-db.ts` with your real DB — the in-memory map resets on every restart.
- Move `TONPAY_API_SECRET` to your hosting provider's secret manager, never commit `.env.local`.
- For mainnet: create a separate mainnet API key + secret in the Dashboard, flip `NEXT_PUBLIC_TONPAY_CHAIN=mainnet`, register your production webhook URL.
