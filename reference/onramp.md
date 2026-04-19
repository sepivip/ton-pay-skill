# Fiat → TON Onramp

> **Onramp requires a TON Pay merchant account + API key.** Unlike the basic checkout flow (which is dashboard-free), the onramp feature uses MoonPay integration behind the scenes and the SDK needs your API key to authenticate the MoonPay call. If you want to stay fully dashboard-free, either skip onramp or route users to a separate fiat→crypto service of your choice.

If a user has no TON or jettons in their wallet, the payment will fail. TON Pay can route them through an onramp (credit card / bank transfer → TON) before the payment, turning a hard failure into a longer-but-successful flow.

## When to enable

- Consumer-facing checkout where most users won't be crypto-native
- Any mainnet flow targeting non-crypto audiences
- **Do not** enable for B2B flows where the user definitely holds TON

## How to enable

Pass `onramp: true` in the options to `createTonPayTransfer`:

```ts
const { message, reference } = await createTonPayTransfer(
  {
    amount: 12.34,
    asset: "TON",
    recipientAddr,
    senderAddr,
    commentToSender: orderReference,
  },
  {
    chain: "mainnet",
    apiKey: process.env.NEXT_PUBLIC_TONPAY_API_KEY!,
    onramp: true,  // ← routes users without funds through the onramp
  }
);
```

If the wallet has sufficient balance, onramp is skipped — the user signs directly.

## UX implications

Onramp adds **2–10 minutes** between "user approves payment" and "webhook fires":

- Credit card → onramp provider → TON on user's wallet → user signs payment → on-chain transfer
- Each step has its own failure mode (KYC reject, card decline, provider downtime)

Your checkout UI must explain the delay:

```
"Your payment is being prepared. This can take a few minutes while we
complete the bank transfer. You'll see a confirmation when it's done —
don't close this page."
```

Keep the polling UI up (see `testing.md` §4) but extend the timeout from 5 minutes to 15.

## Regional availability

Onramp providers vary by region. The SDK will surface an error at `createTonPayTransfer` time if the user's inferred region isn't supported — fall back to showing the crypto-only flow with a help link.

## Testing

Onramp is **mainnet-only** (testnet does not have a fake onramp). Test with the smallest available TON purchase (~$10) through a trusted card; confirm the funds arrive on the test wallet and the subsequent payment succeeds.

## Webhook handling

Webhook semantics are unchanged — you still get `transfer.completed` when the on-chain transfer completes. The webhook handler does not need to know whether an onramp was involved.
