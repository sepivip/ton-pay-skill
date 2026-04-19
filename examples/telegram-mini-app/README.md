# TON Pay — Telegram Mini App Example

A Vite + React + `@telegram-apps/sdk-react` example that opens inside a Telegram Mini App and uses TON Pay for checkout.

## Prerequisites

- Node.js 18+
- A TON Pay **testnet** API key (get one at [ton-pay.io](https://ton-pay.io))
- A TON recipient wallet address (testnet)
- A Telegram bot created via [@BotFather](https://t.me/BotFather) with a Mini App URL configured
- [ngrok](https://ngrok.com/) (or similar tunnel) to expose `localhost:5173` over HTTPS

## Setup

```bash
cp .env.example .env
# Fill in the values in .env
npm install
```

### Environment variables

| Variable | Description |
|---|---|
| `VITE_TONPAY_API_KEY` | Your TON Pay API key (`tp_test_…`) |
| `VITE_TON_RECIPIENT_ADDR` | Your TON wallet address to receive payments |
| `VITE_TONPAY_CHAIN` | `testnet` or `mainnet` |
| `VITE_APP_URL` | Public HTTPS URL (your ngrok URL during dev) |

## Running locally

```bash
# 1. Start the dev server
npm run dev

# 2. Expose it over HTTPS with ngrok
ngrok http 5173

# 3. Note the HTTPS forwarding URL (e.g. https://abc123.ngrok-free.app)
#    Set VITE_APP_URL=<that URL> in your .env and restart npm run dev
```

## Wiring the Mini App in Telegram

1. Open [@BotFather](https://t.me/BotFather) → select your bot → **Edit Bot** → **Edit Menu Button** or use `/newapp`.
2. Set the Web App URL to your ngrok HTTPS URL.
3. BotFather will give you a direct link like `https://t.me/<yourbot>/<appname>`.

Alternatively, use the **Menu Button** feature:

```
/mybots → <your bot> → Bot Settings → Menu Button → Set menu button URL → <ngrok URL>
```

4. Update `public/tonconnect-manifest.json` with your real URL and icon before deploying to production.

## Verification

| Step | Expected result |
|---|---|
| Open Mini App link in Telegram | App loads, shows "Demo Checkout" with 1 USDT |
| Click the TON Pay button | TonConnect wallet picker opens |
| Connect a testnet wallet and sign | "Waiting for on-chain confirmation…" appears |
| Wait ~10–30 s for chain confirmation | Green "Payment confirmed!" screen with reference ID |

## Troubleshooting

See `../../reference/telegram-mini-app.md` for detailed troubleshooting steps including:

- TonConnect manifest errors
- SDK init failures outside of Telegram
- Back button / viewport not mounting
- Testnet vs mainnet mismatches
