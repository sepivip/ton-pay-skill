# TON Pay Troubleshooting

## Wallet doesn't open when I click the button

**Most common cause:** `manifestUrl` is wrong.

Checks:
1. `manifestUrl` is an **absolute** `https://` URL (not a relative path, not `http://`, not a data URI)
2. The URL responds with `Content-Type: application/json`
3. The JSON contains at minimum `url`, `name`, `iconUrl`, all absolute HTTPS URLs
4. `iconUrl` serves with permissive CORS (`Access-Control-Allow-Origin: *` or the wallet's origin)
5. On localhost, Tonkeeper desktop works; Tonkeeper mobile will not reach `localhost` URLs — use ngrok

Verify by fetching the manifest in an incognito browser tab. If it doesn't open cleanly, no wallet will.

## `useTonPay` fires twice in dev

React Strict Mode double-renders effects in development. TON Pay's API is safe for this — every call uses your `reference`, and creating the same transfer twice returns the same object. Always treat `reference` as your idempotency key, and never allocate a new reference inside a render path without stable keys.

## Webhook returns 401 even though the signature looks right

**You're verifying against the parsed body, not the raw bytes.**

In Next.js App Router: use `await request.text()`, never `await request.json()` before verifying.
In Express: use `app.post('/webhook', express.raw({ type: 'application/json' }), handler)`, not `app.use(express.json())` on the webhook route.
In Fastify: register the raw body plugin or set `config: { rawBody: true }` on the route.

JSON re-serialisation changes whitespace and key order; HMAC is sensitive to both.

## Payment stuck `pending` for more than 2 minutes

TON mainnet typically finalises in <10s. If the client poll shows `pending` for 2+ min:

1. Check TON Center status: https://status.toncenter.com
2. Check the TON Pay dashboard — the transfer may show `success` there already (webhook delayed but client poll missed it)
3. Look up the `traceId` in TON Pay support if available
4. **Do not** manually mark the order paid — wait for the webhook

## "Invalid chain" error from `createTonPayTransfer`

The `chain` option is required. Pass `{ chain: "testnet" }` or `{ chain: "mainnet" }` explicitly — there is no default.

## API returns 401 / "invalid API key"

The key belongs to the wrong environment. Testnet keys do not authenticate mainnet requests and vice versa. Check the key prefix:

- `tp_test_…` → testnet only
- `tp_live_…` → mainnet only

## Reference collision / "reference already exists"

`reference` must be globally unique per transfer. Good patterns:

```ts
import { randomUUID } from "crypto";
const reference = `order_${order.id}_${randomUUID()}`;
```

Never reuse a reference across retries of the same order — create a new reference (and store it alongside the original) if the user attempts payment a second time.

## Telegram Mini App wallet flow weirdness

TMA wallet connection goes through Telegram's in-app browser, which differs on iOS vs Android and between Telegram clients. Test on real devices. See `telegram-mini-app.md` for the full list of quirks.

## `tonconnect-manifest.json` caches forever

Wallets aggressively cache the manifest. If you change `iconUrl` or `name`, users on their previous connection will keep seeing the old values. Bump the manifest's `url` path (e.g. `/tonconnect-manifest.v2.json`) to force a re-read, or wait out the cache (24–48 hours).
