---
name: ton-pay
description: Integrate TON Pay (@ton-pay/api + @ton-pay/ui) checkout into a web app, Vanilla JS site, or Telegram Mini App. Use when the user says "add TON Pay", "accept TON payments", "TON checkout", "jetton payment", "@ton-pay/api", "tonconnect checkout", "TON Connect payment", "accept crypto on TON", or is wiring a user-pays-merchant flow on TON. Not for custodial deposit-and-sweep exchange patterns.
---

# TON Pay

Integrate TON Pay into a web app, Vanilla JS site, or Telegram Mini App. TON Pay is a merchant payment SDK: the user clicks a button, their wallet opens, they sign, funds arrive at your recipient address, and a webhook fires to your backend.

## §1 When to use this skill

Use this skill when:
- You want to **accept TON or jetton (USDT, etc.) payments** from users on a site, dApp, or Telegram Mini App
- The flow is **user-pays-merchant**: one user, one payment, one recipient address (yours)
- You want first-party UI (a button component) rather than building from scratch

**Do NOT use this skill if:**
- You are building a **custodial exchange** — per-user deposit addresses, detect incoming, sweep to master. That requires highload v3 wallets and is a different problem; look for a `ton-custodial-payments` skill or build against `@ton/ton` directly.
- You are doing **pure on-chain transfers without a UI** — use `@ton/ton` or `tonweb`, not TON Pay.
- You want to **build your own button / UX from scratch** — that's fine, but TON Pay SDK + `@tonconnect/ui` is a lower cost path.

## §2 Prerequisites

Before running any code:

1. **TON Pay merchant account** — sign up at https://docs.ton.org/ecosystem/ton-pay/overview (links to the dashboard)
2. **Testnet API key + secret** — Dashboard → switch to Testnet → Developer → API keys
3. **Publicly hosted `tonconnect-manifest.json`** — absolute HTTPS URL, permissive CORS on `iconUrl`. In development, this can be a file served by your dev server.
4. **Node 18+**
5. **For Telegram Mini App integration only:** a registered bot and Mini App URL in @BotFather

## §3 Quickstart — pick your framework

### A. Next.js App Router

**Install:**

```bash
npm i @ton-pay/api@0.3.2 @ton-pay/ui-react@0.3.2 @tonconnect/ui-react@2.4.4
```

**Host the manifest** at `public/tonconnect-manifest.json`:

```json
{
  "url": "https://your-app.example.com",
  "name": "Your App",
  "iconUrl": "https://your-app.example.com/icon-180.png"
}
```

**Wrap your root layout** (`app/layout.tsx`):

```tsx
"use client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <TonConnectUIProvider manifestUrl="https://your-app.example.com/tonconnect-manifest.json">
          {children}
        </TonConnectUIProvider>
      </body>
    </html>
  );
}
```

**Create a checkout page** (`app/checkout/page.tsx`):

```tsx
"use client";
import { TonPayButton } from "@ton-pay/ui-react";
import { createTonPayTransfer } from "@ton-pay/api";

const RECIPIENT = process.env.NEXT_PUBLIC_TON_RECIPIENT_ADDR!;
const API_KEY   = process.env.NEXT_PUBLIC_TONPAY_API_KEY!;

export default function CheckoutPage() {
  const amount = 1.5;              // TON
  const orderId = "order-42";

  async function createMessage(senderAddr: string) {
    const { message, reference } = await createTonPayTransfer(
      {
        amount,
        asset: "TON",
        recipientAddr: RECIPIENT,
        senderAddr,
        commentToSender: orderId,
      },
      { chain: "testnet", apiKey: API_KEY }
    );
    // Persist `reference` alongside your order BEFORE returning.
    await fetch("/api/orders", {
      method: "POST",
      body: JSON.stringify({ orderId, reference, amount, asset: "TON" }),
    });
    return { message, reference };
  }

  return <TonPayButton createMessage={createMessage} />;
}
```

**Set up the webhook** — see `reference/webhooks.md`. Register your webhook URL in the Merchant Dashboard after deploying.

### B. Vanilla JS

**Install:**

```bash
npm i @ton-pay/api@0.3.2 @ton-pay/ui@0.1.2 @tonconnect/ui@2.4.4
```

**HTML:**

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>TON Pay Checkout</title>
  </head>
  <body>
    <div id="ton-pay-button"></div>
    <script type="module" src="./main.js"></script>
  </body>
</html>
```

**`main.js`:**

```js
import { TonConnectUI } from "@tonconnect/ui";
import { createTonPayButton } from "@ton-pay/ui";
import { createTonPayTransfer } from "@ton-pay/api";

const tonConnectUI = new TonConnectUI({
  manifestUrl: "https://your-app.example.com/tonconnect-manifest.json",
});

const RECIPIENT = "EQA...";
const API_KEY   = "tp_test_...";

createTonPayButton({
  rootId: "ton-pay-button",
  tonConnectUI,
  createMessage: async (senderAddr) => {
    const { message, reference } = await createTonPayTransfer(
      {
        amount: 1.5,
        asset: "TON",
        recipientAddr: RECIPIENT,
        senderAddr,
        commentToSender: "order-42",
      },
      { chain: "testnet", apiKey: API_KEY }
    );
    // POST the reference to your backend here before returning.
    return { message, reference };
  },
});
```

Pair with a Node webhook server — see `examples/vanilla-js/server/webhook.js` in this repo.

### C. Telegram Mini App

**Install:**

```bash
npm i @ton-pay/api@0.3.2 @ton-pay/ui-react@0.3.2 @tonconnect/ui-react@2.4.4 @telegram-apps/sdk-react@3.3.9
```

**Init TMA before render** (`src/main.tsx`):

```tsx
import { init, backButton } from "@telegram-apps/sdk-react";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { createRoot } from "react-dom/client";
import App from "./App";

init();
backButton.mount();

createRoot(document.getElementById("root")!).render(
  <TonConnectUIProvider manifestUrl="https://your-tma.example.com/tonconnect-manifest.json">
    <App />
  </TonConnectUIProvider>
);
```

**Checkout** is identical to the Next.js snippet above (§3A). The `manifestUrl` must match your @BotFather Mini App URL exactly — see `reference/telegram-mini-app.md`.

## §4 Production checklist

Before flipping `chain: "testnet"` → `"mainnet"`:

- [ ] Webhook endpoint deployed and reachable at an HTTPS URL
- [ ] Webhook URL registered in Merchant Dashboard (mainnet environment)
- [ ] `verifySignature(rawBody, signature, apiSecret)` passes on your "Send sample" tests
- [ ] Handler validates in order: signature → event → reference → amount → asset → status → not-already-processed
- [ ] Handler returns 2xx only after the DB write is durable
- [ ] API secret stored in server env only (never shipped in a client bundle)
- [ ] Every scenario in `reference/testing.md` §6 tested and passing on testnet
- [ ] Client-side poll timeout is ≥5 min (15 min if `onramp: true`)
- [ ] `reference` generation uses a UUID (never reused across retries)
- [ ] `NEXT_PUBLIC_*` env vars only hold the API **key**, never the **secret**

## §5 Further reading

- [`reference/webhooks.md`](reference/webhooks.md) — signature verification, retry, idempotency, 7-step validation
- [`reference/testing.md`](reference/testing.md) — testnet flow, faucet, polling, local tunnel
- [`reference/telegram-mini-app.md`](reference/telegram-mini-app.md) — TMA wiring, theme, back button
- [`reference/onramp.md`](reference/onramp.md) — fiat → TON for users without balance
- [`reference/troubleshooting.md`](reference/troubleshooting.md) — common pitfalls and fixes
- Official TON Pay docs: https://docs.ton.org/ecosystem/ton-pay/overview
- TON Pay API reference: https://docs.ton.org/ecosystem/ton-pay/api-reference
- Runnable examples in this repo: `examples/nextjs-app-router`, `examples/vanilla-js`, `examples/telegram-mini-app`
