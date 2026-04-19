# TON Pay Webhooks

> **Webhooks are OPTIONAL.** They require signing up for a TON Pay Merchant Dashboard account to obtain an API key + API secret. If you don't want that dependency, skip this file — server-side polling of `getTonPayTransferByReference(reference, { chain })` is a valid alternative and requires no account. See `SKILL.md` §2 for the architecture overview.

If you opt in, TON Pay sends a `transfer.completed` webhook to your server when the on-chain transaction finishes. The webhook is a trustworthy source for marking an order paid — more reliable than client-side polling alone, because the user can close the tab mid-payment.

This reference covers: payload shape, HMAC-SHA256 signature verification, retry behaviour, idempotency, and a seven-step validation checklist.

## Polling alternative

If you skip webhooks, run a small server-side polling loop instead:

```ts
import { getTonPayTransferByReference } from "@ton-pay/api";

// Runs on your server. Kicked off when the client calls /api/orders with a reference.
async function watchOrder(reference: string) {
  const deadline = Date.now() + 30 * 60 * 1000;   // 30 min — server-side can afford a longer window
  while (Date.now() < deadline) {
    const t = await getTonPayTransferByReference(reference, { chain: "mainnet" });
    if (t.status === "success") { await markOrderPaid(reference, t.txHash); return; }
    if (t.status === "failed")  { await markOrderFailed(reference); return; }
    await new Promise(r => setTimeout(r, 5000));
  }
  // Timeout: leave the order `pending` — a manual reconcile job or a later poll can resolve it.
}
```

Trade-off: polling burns `pay.ton.org` bandwidth (fine at low volume), and there's no cryptographic signature on the response. Webhooks are cleaner at scale.

## Event types

| Event                 | Meaning                                                              | Implemented |
| --------------------- | -------------------------------------------------------------------- | ----------- |
| `transfer.completed`  | On-chain processing finished. Check `data.status` for success/fail.  | Yes         |
| `transfer.refunded`   | Refund completed.                                                    | Coming soon — do not rely on this yet. |

## Payload shape (`transfer.completed`)

```ts
interface TransferCompletedWebhookPayload {
  event: "transfer.completed";
  timestamp: string;        // ISO 8601
  data: CompletedTonPayTransferInfo;
}

interface CompletedTonPayTransferInfo {
  amount: string;           // Human-readable, e.g. "10.5"
  rawAmount: string;        // Base units (nanotons for TON), e.g. "10500000000"
  senderAddr: string;
  recipientAddr: string;
  asset: string;            // "TON" or jetton master address
  assetTicker: string;      // "TON", "USDT", etc.
  status: "success" | "failed";
  reference: string;        // Unique idempotency key from your createTonPayTransfer call
  txHash: string;           // On-chain tx hash
  traceId: string;          // TON Pay internal tracking id
  date: string;             // ISO 8601
  errorCode?: string;       // Present only when status === "failed"
  errorMessage?: string;
}
```

## Signature verification

Every webhook request includes an `X-TonPay-Signature` header. The signature is an HMAC-SHA256 of the **raw JSON body** using your TON Pay API secret (available in the Merchant Dashboard → Developer → Webhooks).

**CRITICAL:** you must verify against the raw request body, not a re-serialised JSON object. In Express this means `express.raw({ type: 'application/json' })`; in Next.js App Router it means reading `request.text()`; if your framework parses JSON for you, the whitespace-sensitive HMAC will fail.

```ts
import { verifySignature } from "@ton-pay/api";

const rawBody: string = await request.text();
const signature = request.headers.get("x-tonpay-signature") ?? "";

if (!verifySignature(rawBody, signature, process.env.TONPAY_API_SECRET!)) {
  return new Response(JSON.stringify({ error: "Invalid signature" }), { status: 401 });
}

const payload = JSON.parse(rawBody);
```

## Retry behaviour

TON Pay retries failed deliveries automatically:

- Up to **3 retries** on top of the initial attempt
- Backoff: **1s → 5s → 15s**
- **Any 2xx** stops retries
- 4xx / 5xx / network error → retry

**Return 2xx only after your DB write is durable.** If you return 2xx before writing, you lose deliveries on crash. If you return 5xx after writing, you get duplicates.

## Idempotency

Because retries exist and because the network can duplicate even without retries, your handler must be idempotent. The `reference` field is your key — it is the same value you passed into `createTonPayTransfer` on the client, and you should have stored it on the order at creation time.

```ts
const order = await db.getOrderByReference(payload.data.reference);
if (!order) {
  // Reference we don't recognise — log, return 200 to stop retries (nothing to do).
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
if (order.status === "paid" || order.status === "failed") {
  // Already processed — return 200 to stop retries.
  return new Response(JSON.stringify({ received: true }), { status: 200 });
}
```

## Seven-step validation checklist

Before marking an order paid, verify **all seven** in order:

1. **Signature:** `verifySignature(rawBody, signature, apiSecret)` is `true`
2. **Event type:** `payload.event === "transfer.completed"`
3. **Reference exists:** the `reference` maps to an order in your DB
4. **Amount matches:** `payload.data.amount` equals the amount you expected for that order
5. **Asset matches:** `payload.data.asset` equals the asset you expected (e.g., `"TON"` or the USDT jetton master)
6. **Status:** `payload.data.status === "success"` (treat `"failed"` as a separate code path that marks the order failed)
7. **Not already processed:** the order is not already `paid` or `failed`

Fail any of steps 1–2 → return 401/400. Fail 3–5 → log loudly, return 200 (reject but don't retry — the payment went through, something is wrong with your data). Step 6 failed status → mark order failed, return 200. Step 7 → return 200 without re-processing.

## Registering your webhook URL

In the TON Pay Merchant Dashboard → Developer → Webhooks:

1. Enter your webhook URL (must be HTTPS in production)
2. Save — the API secret is generated once per webhook config
3. Test with the "Send sample" button — your handler should log the sample payload

For local development, expose a tunnel with `ngrok http 3000` (or equivalent) and register the public ngrok URL.
