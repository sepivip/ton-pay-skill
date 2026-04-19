import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import {
  init,
  backButton,
  viewport,
  themeParams,
  miniApp,
} from "@telegram-apps/sdk-react";
import App from "./App";

// Initialise the Telegram Mini App SDK.
// init() wires up the bridge between the web app and the Telegram client.
// Each component namespace (backButton, viewport, themeParams, miniApp) must
// be mounted individually before use — this is the v3 pattern replacing the
// old single-function SDK.
init();

if (backButton.isSupported()) {
  backButton.mount();
}

// viewport.mount() is async; await it so CSS vars and dimensions are ready
// before first render.  We fire it but don't block the render on it — the
// app still works while it settles.
if (viewport.mount.isAvailable()) {
  void viewport.mount().then(() => {
    viewport.bindCssVars();
  });
}

if (themeParams.mount.isAvailable()) {
  themeParams.mountSync();
  themeParams.bindCssVars();
}

if (miniApp.mount.isAvailable()) {
  miniApp.mountSync();
  miniApp.ready();
}

const container = document.getElementById("root");
if (!container) throw new Error("Root element not found");

createRoot(container).render(
  <StrictMode>
    <TonConnectUIProvider
      manifestUrl={`${import.meta.env.VITE_APP_URL}/tonconnect-manifest.json`}
    >
      <App />
    </TonConnectUIProvider>
  </StrictMode>
);
