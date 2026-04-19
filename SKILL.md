---
name: ton-pay
description: Integrate TON Pay (@ton-pay/api + @ton-pay/ui) checkout into a web app, Vanilla JS site, or Telegram Mini App. Non-custodial — funds go directly from user's wallet to your recipient address. Works without a merchant dashboard or API key; the dashboard is optional and only needed for push-based webhook notifications. Use when the user says "add TON Pay", "accept TON payments", "TON checkout", "jetton payment", "@ton-pay/api", "tonconnect checkout", "TON Connect payment", "accept crypto on TON", or is wiring a user-pays-merchant flow on TON. Not for custodial deposit-and-sweep exchange patterns.
---

# TON Pay

Integrate TON Pay into a web app, Vanilla JS site, or Telegram Mini App. TON Pay is a **non-custodial** checkout SDK — the user signs with their own wallet and funds go directly on-chain to your recipient address. TON Pay never touches the money.

## §1 When to use this skill

Use this skill when:
- You want to **accept TON or jetton (USDT, etc.) payments** from users on a site, dApp, or Telegram Mini App
- The flow is **user-pays-merchant**: one user, one payment, one recipient address (yours)
- You want first-party UI (a button component) rather than building from scratch

**Do NOT use this skill if:**
- You are building a **custodial exchange** — per-user deposit addresses, detect incoming, sweep to master. That requires highload v3 wallets and is a different problem; look for a `ton-custodial-payments` skill or build against `@ton/ton` directly.
- You are doing **pure on-chain transfers without a UI** — use `@ton/ton` or `tonweb`, not TON Pay.

## §2 How TON Pay is architected

Understanding this prevents the most common confusion:

| Component | What it does | Centralized? | Required? |
|---|---|---|---|
| User's wallet | Holds funds, signs transfers | No (user-owned) | Yes |
| TON Connect protocol | Wallet ↔ dApp connection | No (peer-to-peer) | Yes |
| Your merchant address | Receives funds on-chain | No (you own it) | Yes |
| TON blockchain | Settles the transfer | No | Yes |
| `pay.ton.org` SDK server | Builds TON Connect payload, hosts status-lookup API | **Yes** (run by TON Foundation) | **Only for SDK convenience — can be bypassed** |
| Merchant Dashboard at `pay.ton.org` | Webhook delivery + API secret for signature verification | Yes | **Optional — only if you want webhooks** |

**Bottom line:**
- **No merchant account needed** for a working checkout. The SDK works without an API key as long as you pass `recipientAddr` yourself.
- **An API key + secret from the merchant dashboard unlocks webhooks.** Without it you poll `getTonPayTransferByReference(reference)` client-side (or from your own server).
- **Funds are always non-custodial.** Regardless of path, TON Pay never holds the money.

This skill treats the **no-dashboard path as the default quickstart**, and treats webhooks as an optional production upgrade (`reference/webhooks.md`).

## §3 Prerequisites

For the default (no-dashboard) path:
1. A TON wallet address you control — this is your `recipientAddr`
2. **Publicly hosted `tonconnect-manifest.json`** — absolute HTTPS URL, permissive CORS on `iconUrl`
3. **Node 18+**
4. **For Telegram Mini App integration only:** a registered bot and Mini App URL in @BotFather

Additionally, if you want webhooks:
5. A TON Pay merchant account + API key + API secret ("TON Pay Merchant Dashboard → Developer → Webhooks")

## §4 Quickstart — pick your framework

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

**Create a checkout page** (`app/checkout/page.tsx`) — dashboard-free, polling only:

```tsx
"use client";
import { TonPayButton, useTonPay } from "@ton-pay/ui-react";
import { createTonPayTransfer, getTonPayTransferByReference } from "@ton-pay/api";
import { useState } from "react";

const RECIPIENT = process.env.NEXT_PUBLIC_TON_RECIPIENT_ADDR!;

export default function CheckoutPage() {
  const { pay } = useTonPay();
  const [status, setStatus] = useState<"idle" | "pending" | "paid" | "failed">("idle");
  const amount = 1.5;              // TON
  const orderId = "order-42";

  async function handlePay() {
    await pay(async (senderAddr: string) => {
      const { message, reference } = await createTonPayTransfer(
        {
          amount,
          asset: "TON",
          recipientAddr: RECIPIENT,      // required when no apiKey is passed
          senderAddr,
          commentToSender: orderId,
        },
        { chain: "testnet" }             // NOTE: no apiKey — SDK works without it
      );

      // Persist `reference` alongside your order, then poll.
      await fetch("/api/orders", {
        method: "POST",
        body: JSON.stringify({ orderId, reference }),
      });
      pollStatus(reference);

      return { message, reference };
    });
  }

  async function pollStatus(reference: string) {
    setStatus("pending");
    const deadline = Date.now() + 5 * 60 * 1000;
    let delay = 2000;
    while (Date.now() < deadline) {
      const t = await getTonPayTransferByReference(reference, { chain: "testnet" });
      if (t.status === "success") { setStatus("paid");   return; }
      if (t.status === "failed")  { setStatus("failed"); return; }
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay + 2000, 10_000);
    }
    setStatus("failed");
  }

  return <TonPayButton handlePay={handlePay} />;
}
```

**Key API shape:** `useTonPay()` returns `{ pay }`. `pay(getMessage)` invokes your async callback with the connected wallet's `senderAddr` and expects you to return `{ message, reference }` — it submits `message` to the wallet for signing. `getTonPayTransferByReference(reference, { chain })` reads the transfer status from `pay.ton.org`; **no API key required**.

**Optional upgrade — webhooks (requires merchant dashboard):** See `reference/webhooks.md`. You get push notifications instead of polling, but you must register at the dashboard to get an API secret for signature verification.

### B. Vanilla JS

The vanilla `@ton-pay/ui` package ships two complementary pieces:

- **`createTonPay({ manifestUrl })`** — returns a `TonPayClient` with a `pay(getMessage)` method.
- **`@ton-pay/ui/embed`** — a drop-in IIFE script that renders the styled TON Pay button into a container element and invokes a named global callback on click.

**Install:**

```bash
npm i @ton-pay/api@0.3.2 @ton-pay/ui@0.1.2 @tonconnect/ui@2.4.4
```

**HTML** (using the embed script + ESM import map):

```html
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>TON Pay Checkout</title>
    <script type="importmap">
      {
        "imports": {
          "@tonconnect/ui":  "https://esm.sh/@tonconnect/ui@2.4.4"
        }
      }
    </script>
  </head>
  <body>
    <div id="ton-pay-button"></div>

    <!-- Copy ton-pay-embed.js from node_modules/@ton-pay/ui/dist/ into your static assets -->
    <script src="./ton-pay-embed.js?containerId=ton-pay-button&callback=onTonPayClick"></script>
    <script type="module" src="./main.js"></script>
  </body>
</html>
```

**`main.js`** — dashboard-free:

```js
import { createTonPay } from "https://esm.sh/@ton-pay/ui@0.1.2/vanilla";
import { createTonPayTransfer, getTonPayTransferByReference } from "https://esm.sh/@ton-pay/api@0.3.2";

const APP_URL   = window.location.origin;
const RECIPIENT = "EQA...";                        // your TON address

const client = createTonPay({
  manifestUrl: `${APP_URL}/tonconnect-manifest.json`,
});

window.onTonPayClick = async () => {
  await client.pay(async (senderAddr) => {
    const { message, reference } = await createTonPayTransfer(
      {
        amount: 1.5,
        asset: "TON",
        recipientAddr: RECIPIENT,
        senderAddr,
        commentToSender: "order-42",
      },
      { chain: "testnet" }                         // no apiKey
    );
    pollStatus(reference);
    return { message, reference };
  });
};

async function pollStatus(reference) {
  const deadline = Date.now() + 5 * 60 * 1000;
  let delay = 2000;
  while (Date.now() < deadline) {
    const t = await getTonPayTransferByReference(reference, { chain: "testnet" });
    if (t.status === "success" || t.status === "failed") return t;
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay + 2000, 10_000);
  }
}
```

**Key shapes:**

```ts
// @ton-pay/ui
function createTonPay(opts: { manifestUrl: string; connectTimeoutMs?: number }): TonPayClient;
class TonPayClient {
  pay(getMessage: (senderAddr: string) => Promise<{ message, reference }>): Promise<PayResult>;
  waitForWalletConnection(): Promise<string>;
  disconnect(): Promise<void>;
}
```

For a Vite-bundled version and an optional webhook server, see `examples/vanilla-js/` in this repo.

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

**Checkout** uses the same `useTonPay()` + `<TonPayButton handlePay>` pattern as §4A (dashboard-free by default). The TMA-specific concerns are limited to init, back-button handling, and theming. The `manifestUrl` must match your @BotFather Mini App URL exactly — see `reference/telegram-mini-app.md`.

## §5 Production checklist

### Default path (polling, no merchant dashboard)

- [ ] `recipientAddr` is a TON address you control on mainnet (not a contract placeholder)
- [ ] `tonconnect-manifest.json` hosted at absolute HTTPS URL, `iconUrl` CORS-open
- [ ] Client-side polling is guarded by a 5-minute timeout and survives tab close (persist `reference` on your server so a refreshed page can resume polling)
- [ ] Ideally: your server also polls `getTonPayTransferByReference(reference, { chain: "mainnet" })` as a backup — the client may close the tab before `status === "success"`
- [ ] `reference` is stored with the order row the moment you call `createTonPayTransfer`
- [ ] Switch `chain: "testnet"` → `"mainnet"` only after end-to-end test on testnet

### With webhooks (optional upgrade, requires merchant dashboard)

Everything above, plus:

- [ ] Webhook endpoint deployed and reachable at an HTTPS URL, registered in the Merchant Dashboard
- [ ] `verifySignature(rawBody, signature, apiSecret)` passes on "Send sample" tests
- [ ] Handler validates in order: signature → event → reference → amount → asset → status → not-already-processed
- [ ] Handler returns 2xx only after the DB write is durable
- [ ] API secret stored server-side only (never in a client bundle)
- [ ] `reference` generation uses a UUID (never reused across retries)

## §6 Further reading

- [`reference/webhooks.md`](reference/webhooks.md) — **optional** webhook path: signature verification, retry, idempotency, 7-step validation
- [`reference/testing.md`](reference/testing.md) — testnet flow, faucet, polling, local tunnel
- [`reference/telegram-mini-app.md`](reference/telegram-mini-app.md) — TMA wiring, theme, back button
- [`reference/onramp.md`](reference/onramp.md) — fiat → TON for users without balance (requires API key)
- [`reference/troubleshooting.md`](reference/troubleshooting.md) — common pitfalls and fixes
- Official TON Pay docs: https://docs.ton.org/ecosystem/ton-pay/overview
- Runnable examples in this repo: `examples/nextjs-app-router`, `examples/vanilla-js`, `examples/telegram-mini-app`
