# Testing TON Pay

Every TON Pay integration should be exercised end-to-end on **testnet** before the first mainnet payment. Testnet uses the same SDK and the same API shape — the only difference is passing `chain: "testnet"` in your SDK calls.

## 1. API key (optional)

The TON Pay SDK works **without an API key** as long as you pass `recipientAddr` directly. For the dashboard-free path this whole section is a no-op — skip to §2.

If you do want webhooks (see `webhooks.md`), grab a testnet API key + secret: TON Pay Merchant Dashboard → switch environment to "Testnet" → Developer → API keys → create. The key prefix differs (`tp_test_…` vs `tp_live_…`) so a misplaced key fails loudly instead of silently charging real TON.

## 2. Get testnet TON

- **Telegram faucet:** @testgiver_ton_bot in Telegram
- **Web faucet:** https://t.me/testgiver_ton_bot (opens the same bot)
- Amount: the faucet gives ~2 TON per day, enough for dozens of test payments

## 3. Use a testnet wallet

- **Tonkeeper:** Settings → enable Developer Mode → Settings → Active account → switch to Testnet
- **MyTonWallet:** Settings → Testnet (toggle)
- **@wallet (Telegram):** testnet not supported; use Tonkeeper or MyTonWallet

## 4. Client-side polling pattern

For optimistic UX, poll the transfer status client-side even though the webhook is the source of truth. Pattern:

```ts
import { getTonPayTransferByReference } from "@ton-pay/api";

async function pollStatus(reference: string) {
  const deadline = Date.now() + 5 * 60 * 1000; // 5 min timeout
  let delay = 2000;                             // 2s → 4s → 6s → ... capped at 10s

  while (Date.now() < deadline) {
    const t = await getTonPayTransferByReference(reference, { chain: "testnet" });
    if (t.status === "success") return t;
    if (t.status === "failed")  throw new Error(t.errorMessage ?? "payment failed");
    await new Promise(r => setTimeout(r, delay));
    delay = Math.min(delay + 2000, 10_000);
  }
  throw new Error("payment timed out — try a server-side retry poll");
}
```

If you are ALSO using webhooks, the webhook is the trust boundary and polling is just for UI state. Without webhooks, the poll IS your trust boundary — mark the order paid when it returns `success`, and consider running the same poll server-side as a backstop in case the client tab closes.

## 5. Local webhook tunnel *(webhook-based setups only)*

Skip this section if you're on the dashboard-free path.

```bash
# Terminal 1: run your app
npm run dev

# Terminal 2: expose it
ngrok http 3000
# Copy the https://…ngrok-free.app URL

# Dashboard: register https://<ngrok-id>.ngrok-free.app/api/ton-pay/webhook
# Dashboard: click "Send sample" — you should see a 200 in your app logs
```

ngrok URLs rotate on every restart; paid ngrok plans give stable URLs. Alternatives: `cloudflared tunnel`, `localhost.run`, `localtunnel`.

## 6. What to actually test

Every path needs these:
- **Happy path:** testnet payment succeeds, `getTonPayTransferByReference(...)` returns `status: "success"`, order marked paid.
- **Failed path:** user rejects the wallet signature. No transfer created. Client polling returns no such reference and times out; order stays `pending`.
- **Tab close mid-payment:** user closes the tab after signing. Confirm your server-side poll (or webhook) still marks the order paid.

Webhook-based setups also need:
- **Webhook retry:** deliberately return 500 on the first request; confirm retries at 1s/5s/15s. Fix handler, confirm next retry writes the DB.
- **Duplicate delivery:** call the dashboard "Send sample" twice with the same reference; confirm the second call returns 200 without duplicate DB writes.
- **Signature failure:** flip one byte in your API secret env; confirm handler returns 401.
- **Wrong amount:** manually mutate the order's expected amount after payment; confirm the webhook rejects (log + 200 without marking paid).

## 7. Moving to mainnet

Only after every test in §6 passes:

1. **Dashboard-free path:** flip `chain: "testnet"` → `"mainnet"` in your SDK options; update `recipientAddr` to your mainnet address; deploy.
2. **Webhook path:** additionally, generate mainnet API key + secret (separate entries in dashboard), register your production webhook URL (HTTPS required), and swap the env.
3. Run one small real-TON payment end-to-end.
4. Monitor logs for the first hour of real traffic.
