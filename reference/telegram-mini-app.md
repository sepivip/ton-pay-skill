# TON Pay in a Telegram Mini App

Telegram Mini Apps (TMAs) are the primary distribution channel for TON dApps. Wiring TON Pay into a TMA is mostly the same as Next.js, with four TMA-specific concerns.

## 1. Manifest URL must match the Mini App web view origin

Your `tonconnect-manifest.json`'s `url` field must **exactly match** the URL you registered in @BotFather for the Mini App web view. Off-by-one on trailing slash, protocol, or subdomain and the wallet will refuse to connect.

```json
{
  "url": "https://my-mini-app.example.com",
  "name": "My Mini App",
  "iconUrl": "https://my-mini-app.example.com/icon-180.png"
}
```

## 2. Wallet redirect behaviour

| Environment             | Redirect                                                                             |
| ----------------------- | ------------------------------------------------------------------------------------ |
| Telegram iOS            | Opens wallet via in-app browser or universal link; returns to TMA on completion      |
| Telegram Android        | Opens wallet via deep link / Custom Tab; returns to TMA on completion                |
| Telegram Desktop        | Opens wallet browser extension or shows QR (Tonkeeper desktop)                       |
| Telegram Web            | Shows QR or opens wallet browser extension                                           |

You must test all four. TON Connect handles most of this, but theme inheritance and the back-button flow differ.

## 3. Back button handling

Telegram's hardware back button closes the Mini App by default. Inside a multi-step checkout, you want it to cancel the current step instead.

```ts
import { backButton } from "@telegram-apps/sdk-react";

useEffect(() => {
  if (!backButton.isMounted()) backButton.mount();
  backButton.show();
  const unsubscribe = backButton.onClick(() => {
    // navigate back in your router instead of closing the app
    router.back();
  });
  return () => {
    unsubscribe();
    backButton.hide();
  };
}, [router]);
```

## 4. Theming

Telegram exposes theme params (dark/light/colours) via the SDK. The default `<TonPayButton>` does not auto-theme — read theme params and pass them through:

```ts
import { themeParams } from "@telegram-apps/sdk-react";

const params = themeParams.state();
const buttonStyle = {
  background: params.buttonColor ?? "#0088cc",
  color:      params.buttonTextColor ?? "#ffffff",
};
```

Pass `style={buttonStyle}` to `<TonPayButton>` (or wrap it in a styled container).

## 5. Local development

- Develop against the deployed HTTPS URL, not `localhost` — Telegram will not load `http://` or `localhost` in the web view.
- Use a tunnel: `ngrok http 5173` → update @BotFather Mini App URL to the ngrok URL → reload in Telegram.
- Alternative: deploy every commit to a preview URL (Vercel, Netlify) and point @BotFather at that.

## 6. Testnet Mini App

The TMA environment itself has no concept of testnet — it is just a web view. Testnet is a client-side option (`chain: "testnet"` in `createTonPayTransfer`) and a wallet-side toggle (Tonkeeper → Developer Mode → Testnet). Use the same flow as §3.

## 7. Common TMA pitfalls

- **White screen on launch:** `@telegram-apps/sdk-react` not initialised before render. Wrap `main.tsx` with `init()`.
- **Wallet redirect returns to blank page:** your app state didn't persist across the redirect. Use `sessionStorage` or URL params for the pending reference.
- **Button not clickable:** TMA's initial scroll-lock blocks touch. Call `viewport.expand()` on mount.
