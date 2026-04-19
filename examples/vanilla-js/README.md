# TON Pay — Vanilla JS Example

A minimal, framework-free TON Pay integration. No React, no bundler required.

| Component | Technology |
|-----------|-----------|
| Static client | Plain HTML + browser ES modules (`public/`) |
| TON Pay button | `@ton-pay/ui` embed script (`ton-pay-embed.js`) |
| Wallet connection | `@ton-pay/ui/vanilla` `createTonPay()` + `@tonconnect/ui` |
| Webhook server | Node.js + Express 4 (`server/webhook.js`) |

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Configure credentials

```bash
cp .env.example .env
# Edit .env with your real values
```

Then open `public/index.html` and update the `<script>` block at the top of `<head>`:

```html
<script>
  window.__TONPAY_API_KEY__     = "YOUR_API_KEY";
  window.__TONPAY_CHAIN__       = "testnet";   // or "mainnet"
  window.__TON_RECIPIENT_ADDR__ = "EQ...";     // your wallet address
  window.__APP_URL__            = "https://your-ngrok-id.ngrok-free.app";
</script>
```

> **Why inject in HTML?** Browser JS cannot read `.env` files directly. For production, use a bundler such as Vite with `import.meta.env.VITE_*` instead.

### 3. Set up a local tunnel (ngrok)

TonConnect requires an HTTPS manifest URL, so you need a tunnel when developing locally.

```bash
# Install ngrok once: https://ngrok.com/download
ngrok http 3000
```

Copy the HTTPS URL (e.g. `https://abc123.ngrok-free.app`) and set it:

- In `public/index.html` → `window.__APP_URL__`
- In `public/tonconnect-manifest.json` → `"url"` and `"iconUrl"`

### 4. Run the static site

```bash
npm run dev:static
# Serves public/ on http://localhost:3000
```

Visit `http://localhost:3000` in your browser. Click the TON Pay button to test the wallet flow.

### 5. Run the webhook server

In a separate terminal:

```bash
# Load environment variables, then start the server
export $(cat .env | grep -v '^#' | xargs)
npm run dev:webhook
# Listens on http://localhost:3001
```

Point your ngrok tunnel at port 3001 for webhook delivery:

```bash
ngrok http 3001
```

Register `https://<your-ngrok-id>.ngrok-free.app/api/ton-pay/webhook` in the TON Pay dashboard.

---

## Architecture

```
public/
  index.html          # Shell: config globals, import map, loads main.js + embed button
  main.js             # ES module: createTonPay + createTonPayTransfer + onTonPayClick
  ton-pay-embed.js    # Copied from @ton-pay/ui/dist — renders the styled button
  tonconnect-manifest.json

server/
  webhook.js          # Express server — verifies signature, 7-step validation
```

### How the button works

1. `ton-pay-embed.js` renders a styled button into `<div id="ton-pay-btn">`.
2. On click it calls `window.onTonPayClick()` (the `callback` query param).
3. `main.js` defines `window.onTonPayClick`:
   - Calls `tonPay.pay(getMessage)` which opens the TonConnect wallet modal.
   - Once the user connects, `getMessage(senderAddr)` calls `createTonPayTransfer` to build the TON transfer.
   - TonConnectUI sends the transaction and returns `txResult`.
4. The TON Pay backend emits a `transfer.completed` webhook to your server once the transaction is confirmed on-chain.

### Webhook 7-step validation

The webhook handler in `server/webhook.js` validates in order:

| Step | Check |
|------|-------|
| 1 | HMAC signature (`verifySignature` from `@ton-pay/api`) |
| 2 | `event === "transfer.completed"` |
| 3 | `reference` exists in order store |
| 7 | Order is still `"pending"` (idempotency) |
| 4 | `amount` matches stored order |
| 5 | `asset` matches stored order |
| 6 | `status === "success"` → mark paid, else mark failed |

> Steps are numbered to match the canonical 7-step validation spec. The order-of-checks differs slightly (7 before 4/5/6) for efficiency — an already-processed order is ack'd immediately without further validation.

> **Demo note:** Orders are stored in an in-memory `Map`. They are lost on server restart. Replace with a real database for production.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:static` | Serves `public/` on port 3000 (requires `npx serve`) |
| `npm run dev:webhook` | Starts the Express webhook server on port 3001 |
| `npm run build` | Syntax-checks `public/main.js` and `server/webhook.js` |

---

## Production path

For a production deployment, bundle `public/main.js` with Vite:

```bash
npm install --save-dev vite
```

Replace the `window.__*__` globals with `import.meta.env.VITE_*` variables in `main.js`, and set them in `.env`:

```
VITE_TONPAY_API_KEY=...
VITE_TONPAY_CHAIN=mainnet
VITE_TON_RECIPIENT_ADDR=EQ...
VITE_APP_URL=https://yourapp.com
```

Then `vite build` produces an optimised bundle in `dist/`.

---

## Dependencies

| Package | Version | Role |
|---------|---------|------|
| `@ton-pay/api` | 0.3.2 | `createTonPayTransfer`, `verifySignature`, `TON` constant |
| `@ton-pay/ui` | 0.1.2 | `createTonPay` (vanilla client), embed button script |
| `@tonconnect/ui` | 2.4.4 | TonConnect wallet modal (peer dep of `@ton-pay/ui`) |
| `express` | 4.21.0 | Webhook HTTP server |
