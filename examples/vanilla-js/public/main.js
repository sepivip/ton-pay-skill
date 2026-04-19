/**
 * TON Pay — Vanilla JS main entry point
 *
 * Uses:
 *   - @ton-pay/ui/vanilla  → createTonPay(opts) → TonPayClient
 *   - @ton-pay/api         → createTonPayTransfer, TON
 *   - ton-pay-embed.js     → renders the button into #ton-pay-btn, calls window.onTonPayClick
 *
 * Config is injected via <script> globals in index.html:
 *   window.__TONPAY_API_KEY__, window.__TONPAY_CHAIN__,
 *   window.__TON_RECIPIENT_ADDR__, window.__APP_URL__
 */

import { createTonPay } from "https://esm.sh/@ton-pay/ui@0.1.2/vanilla";
import { createTonPayTransfer, TON } from "https://esm.sh/@ton-pay/api@0.3.2";

// ---------------------------------------------------------------------------
// Config (injected by index.html <script> globals)
// ---------------------------------------------------------------------------
const API_KEY       = window.__TONPAY_API_KEY__     ?? "";
const CHAIN         = window.__TONPAY_CHAIN__        ?? "testnet";
const RECIPIENT     = window.__TON_RECIPIENT_ADDR__  ?? "";
const APP_URL       = window.__APP_URL__             ?? location.origin;
const MANIFEST_URL  = `${APP_URL}/tonconnect-manifest.json`;

// ---------------------------------------------------------------------------
// Demo order — in a real app this would come from your server
// ---------------------------------------------------------------------------
const order = {
  id:     `order-${Math.random().toString(36).slice(2, 9)}`,
  amount: 1,            // TON
  asset:  TON,
};

// ---------------------------------------------------------------------------
// UI helpers
// ---------------------------------------------------------------------------
function setStatus(msg, kind = "") {
  const box = document.getElementById("status-box");
  box.textContent = msg;
  box.className = `status-box visible ${kind}`.trim();
  box.classList.add("visible");
}

// Populate order details
document.getElementById("order-id").textContent = order.id;
document.getElementById("order-amount").textContent = `${order.amount} TON`;

// ---------------------------------------------------------------------------
// TON Pay client (wraps TonConnectUI, handles wallet modal + sendTransaction)
// ---------------------------------------------------------------------------
const tonPay = createTonPay({ manifestUrl: MANIFEST_URL });

// ---------------------------------------------------------------------------
// Payment handler — called by the embed button via window.onTonPayClick
// ---------------------------------------------------------------------------
window.onTonPayClick = async () => {
  setStatus("Connecting wallet…");

  try {
    const result = await tonPay.pay(async (senderAddr) => {
      setStatus("Building transaction…");

      const transfer = await createTonPayTransfer(
        {
          amount:        order.amount,
          asset:         order.asset,
          recipientAddr: RECIPIENT || undefined,  // omit if API key provides default
          senderAddr,
          commentToSender:    `Payment for ${order.id}`,
          commentToRecipient: `Order ${order.id}`,
        },
        { chain: CHAIN, apiKey: API_KEY }
      );

      // Store reference on the order object so the webhook can match it
      order.reference    = transfer.reference;
      order.bodyB64Hash  = transfer.bodyBase64Hash;

      setStatus("Waiting for wallet confirmation…");
      return transfer;
    });

    setStatus(
      `Transaction sent!\nReference: ${result.reference}\nTx result: ${JSON.stringify(result.txResult)}`,
      "success"
    );
    console.info("TON Pay result", result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    setStatus(`Error: ${msg}`, "error");
    console.error("TON Pay error", err);
    // Re-throw so the embed button resets its loading state
    throw err;
  }
};
