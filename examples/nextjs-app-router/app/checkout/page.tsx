"use client";
import { TonPayButton, useTonPay } from "@ton-pay/ui-react";
import { createTonPayTransfer, getTonPayTransferByReference } from "@ton-pay/api";
import { useState } from "react";
import { TON_PAY_CONFIG } from "@/lib/ton-pay-config";

type Status = "idle" | "pending" | "success" | "error";

export default function CheckoutPage() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  const { pay } = useTonPay();

  const amount = 1.5;       // TON
  const orderId = "demo-order-001";

  async function handlePay() {
    setStatus("idle");
    setError(null);

    try {
      await pay(async (senderAddr: string) => {
        const { message, reference } = await createTonPayTransfer(
          {
            amount,
            asset: "TON",
            recipientAddr: TON_PAY_CONFIG.recipientAddr,
            senderAddr,
            commentToSender: orderId,
          },
          { chain: TON_PAY_CONFIG.chain, apiKey: TON_PAY_CONFIG.apiKey }
        );

        // Persist the reference on the server BEFORE returning. Webhook arrives
        // asynchronously and needs to map `reference` → order.
        await fetch("/api/orders", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ orderId, reference, amount, asset: "TON" }),
        });

        // Kick off status polling in parallel — UX only, source of truth is the webhook.
        void pollStatus(reference).catch(() => {});

        return { message: { ...message, payload: message.payload }, reference };
      });
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "payment failed");
    }
  }

  async function pollStatus(reference: string) {
    setStatus("pending");
    const deadline = Date.now() + 5 * 60 * 1000;
    let delay = 2000;
    while (Date.now() < deadline) {
      const t = await getTonPayTransferByReference(reference, {
        chain: TON_PAY_CONFIG.chain,
        apiKey: TON_PAY_CONFIG.apiKey,
      });
      if (t.status === "success") {
        setStatus("success");
        setTxHash(t.txHash ?? null);
        return;
      }
      if (t.status === "error") {
        setStatus("error");
        setError(t.errorMessage ?? "payment failed");
        return;
      }
      await new Promise(r => setTimeout(r, delay));
      delay = Math.min(delay + 2000, 10_000);
    }
    setStatus("error");
    setError("timed out — check the dashboard");
  }

  return (
    <main style={{ maxWidth: 480 }}>
      <h1>Checkout</h1>
      <p>Order: <code>{orderId}</code></p>
      <p>Amount: <strong>{amount} TON</strong></p>

      <TonPayButton handlePay={handlePay} />

      <div style={{ marginTop: 24 }}>
        {status === "pending" && <p>Waiting for confirmation...</p>}
        {status === "success" && (
          <p>Paid. Tx: <code>{txHash?.slice(0, 10)}...</code></p>
        )}
        {status === "error" && <p style={{ color: "crimson" }}>{error}</p>}
      </div>
    </main>
  );
}
