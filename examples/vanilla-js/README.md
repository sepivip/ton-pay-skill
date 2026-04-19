# TON Pay — Vanilla JS Example

A minimal, framework-free TON Pay integration. No React, no bundler required.

**Default path:** dashboard-free. No TON Pay merchant account required. The client polls `getTonPayTransferByReference` directly to detect payment completion.

**Optional upgrade:** webhook-based confirmation via an Express server (`server/webhook.js`). Only exercised if you register a webhook URL in the TON Pay Merchant Dashboard and fill in `TONPAY_API_SECRET`.

| Component | Technology |
|-----------|-----------|
| Static client | Plain HTML + browser ES modules (`public/`) |
| TON Pay button | `@ton-pay/ui` embed script (`ton-pay-embed.js`) |
| Wallet connection | `@ton-pay/ui/vanilla` `createTonPay()` + `@tonconnect/ui` |
| Webhook server *(optional)* | Node.js + Express 4 (`server/webhook.js`) |

---

## Quick Start (dashboard-free)

### 1. Install dependencies

```bash
npm install
```

### 2. Configure

```bash
cp .env.example .env
# Edit .env — set TON_RECIPIENT_ADDR, TONPAY_CHAIN, APP_URL.
# Leave TONPAY_API_KEY / TONPAY_API_SECRET commented out.
```

Open `public/index.html` and update the `<script>` block at the top of `<head>`:

```html
<script>
  window.__TONPAY_CHAIN__       = "testnet";   // or "mainnet"
  window.__TON_RECIPIENT_ADDR__ = "EQ...";     // your wallet address
  window.__APP_URL__            = "https://your-ngrok-id.ngrok-free.app";
  // window.__TONPAY_API_KEY__ = "tp_test_..."; // OPTIONAL
</script>
```

> **Why inject in HTML?** Browser JS cannot read `.env` files directly. For production, use a bundler such as Vite with `import.meta.env.VITE_*` instead.

### 3. Local tunnel (ngrok)

TonConnect requires an HTTPS manifest URL, so you need a tunnel when developing locally.

```bash
ngrok http 3000
```

Copy the HTTPS URL (e.g. `https://abc123.ngrok-free.app`) and set it:
- In `public/index.html` → `window.__APP_URL__`
- In `public/tonconnect-manifest.json` → `"url"` and `"iconUrl"`

### 4. Run

```bash
npm run dev:static
# Serves public/ on http://localhost:3000
```

Visit your ngrok HTTPS URL in the browser. Click the TON Pay button, connect a testnet wallet, sign. The status box updates as the client polls `pay.ton.org` for confirmation.

---

## Optional — enable webhooks

If you want server-push notifications instead of client polling:

1. Register at the TON Pay Merchant Dashboard and create a webhook entry.
2. Uncomment `TONPAY_API_KEY` and `TONPAY_API_SECRET` in `.env`.
3. Uncomment `window.__TONPAY_API_KEY__` in `public/index.html`.
4. Start the webhook server alongside the static site:

   ```bash
   export $(cat .env | grep -v '^#' | xargs)
   npm run dev:webhook
   # Listens on http://localhost:3001
   ```

5. Tunnel port 3001 separately:

   ```bash
   ngrok http 3001
   ```

6. Register `https://<your-ngrok-id>.ngrok-free.app/api/ton-pay/webhook` in the dashboard. Click "Send sample" — the Express log should show a 200.

---

## Architecture

```
public/
  index.html          # Shell: config globals, import map, loads main.js + embed button
  main.js             # ES module: createTonPay + createTonPayTransfer + polling + onTonPayClick
  ton-pay-embed.js    # Copied from @ton-pay/ui/dist — renders the styled button
  tonconnect-manifest.json

server/                 (OPTIONAL — only used if you enable webhooks)
  webhook.js          # Express server — verifies signature, 7-step validation
```

### How the button works

1. `ton-pay-embed.js` renders a styled button into `<div id="ton-pay-btn">`.
2. On click it calls `window.onTonPayClick()` (the `callback` query param).
3. `main.js` defines `window.onTonPayClick`:
   - Calls `tonPay.pay(getMessage)` which opens the TonConnect wallet modal.
   - `getMessage(senderAddr)` calls `createTonPayTransfer` to build the TON transfer payload.
   - TonConnectUI sends the transaction and returns `txResult`.
4. `main.js` then polls `getTonPayTransferByReference(reference, { chain })` until `status === "success"`.

### Webhook 7-step validation (optional path)

When a webhook URL is registered, the handler in `server/webhook.js` validates in order:

| Step | Check |
|------|-------|
| 1 | HMAC signature (`verifySignature` from `@ton-pay/api`) |
| 2 | `event === "transfer.completed"` |
| 3 | `reference` exists in order store |
| 7 | Order is still `"pending"` (idempotency) |
| 4 | `amount` matches stored order |
| 5 | `asset` matches stored order |
| 6 | `status === "success"` → mark paid, else mark failed |

> **Demo note:** Orders are stored in an in-memory `Map`. They are lost on server restart. Replace with a real database for production.

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev:static` | Serves `public/` on port 3000 (requires `npx serve`) |
| `npm run dev:webhook` | Starts the optional Express webhook server on port 3001 |
| `npm run build` | Syntax-checks `public/main.js` and `server/webhook.js` |

---

## Production path

For a production deployment, bundle `public/main.js` with Vite:

```bash
npm install --save-dev vite
```

Replace the `window.__*__` globals with `import.meta.env.VITE_*` variables in `main.js`, and set them in `.env`:

```
VITE_TONPAY_CHAIN=mainnet
VITE_TON_RECIPIENT_ADDR=EQ...
VITE_APP_URL=https://yourapp.com
# VITE_TONPAY_API_KEY=tp_live_...   # optional
```

Then `vite build` produces an optimised bundle in `dist/`.

---

## Dependencies

| Package | Version | Role |
|---------|---------|------|
| `@ton-pay/api` | 0.3.2 | `createTonPayTransfer`, `getTonPayTransferByReference`, `verifySignature`, `TON` constant |
| `@ton-pay/ui` | 0.1.2 | `createTonPay` (vanilla client), embed button script |
| `@tonconnect/ui` | 2.4.4 | TonConnect wallet modal (peer dep of `@ton-pay/ui`) |
| `express` | 4.21.0 | Webhook HTTP server *(optional)* |
