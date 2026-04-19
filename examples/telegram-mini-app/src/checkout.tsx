import { useState, useRef } from "react";
import { useTonPay, TonPayButton } from "@ton-pay/ui-react";
import { createTonPayTransfer, getTonPayTransferByReference } from "@ton-pay/api";
import {
  useSignal,
  themeParamsButtonColor,
  themeParamsButtonTextColor,
} from "@telegram-apps/sdk-react";

// API key is OPTIONAL — only needed for webhook-based confirmation via the
// TON Pay Merchant Dashboard. Leave unset for the dashboard-free path.
const API_KEY = (import.meta.env.VITE_TONPAY_API_KEY as string | undefined) || undefined;
const RECIPIENT_ADDR = (import.meta.env.VITE_TON_RECIPIENT_ADDR as string | undefined) ?? "";
const CHAIN = ((import.meta.env.VITE_TONPAY_CHAIN as string | undefined) ?? "testnet") as "mainnet" | "testnet";

// USDT address on TON
const USDT_ASSET = "EQCxE6mUtQJKFnGfaROTKOt1lZbDiiX1kCixRv7Nw2Id_sDs";

type PayStatus = "idle" | "pending" | "success" | "error";

export default function Checkout() {
  const { pay } = useTonPay();
  const [status, setStatus] = useState<PayStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [txRef, setTxRef] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Telegram theme signals — fall back gracefully when outside TMA
  const buttonBg = useSignal(themeParamsButtonColor);
  const buttonText = useSignal(themeParamsButtonTextColor);

  function stopPolling() {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }

  function startPolling(reference: string) {
    stopPolling();
    pollRef.current = setInterval(async () => {
      try {
        const info = await getTonPayTransferByReference(reference, {
          chain: CHAIN,
          apiKey: API_KEY,
        });
        if (info.status === "success") {
          stopPolling();
          setStatus("success");
        } else if (info.status === "failed") {
          stopPolling();
          setStatus("error");
          setError("Payment failed on-chain.");
        }
      } catch {
        // Not found yet — keep polling
      }
    }, 3000);
  }

  const handlePay = async () => {
    setError(null);
    setStatus("pending");
    try {
      const result = await pay(async (senderAddr: string) => {
        const { message, reference } = await createTonPayTransfer(
          {
            amount: 1, // 1 USDT demo charge
            asset: USDT_ASSET,
            recipientAddr: RECIPIENT_ADDR,
            senderAddr,
            commentToSender: "TON Pay TMA demo",
          },
          { chain: CHAIN, apiKey: API_KEY }
        );
        return { message, reference };
      });

      // result.reference is available from the getMessage return value merged
      // into PayInfo by useTonPay
      const reference = (result as { reference?: string }).reference;
      if (reference) {
        setTxRef(reference);
        startPolling(reference);
      } else {
        // No reference — assume success from wallet confirmation
        setStatus("success");
      }
    } catch (err: unknown) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Payment cancelled or failed.");
    }
  };

  const buttonStyle: React.CSSProperties = {
    ...(buttonBg ? { "--ton-pay-button-bg": buttonBg } as React.CSSProperties : {}),
    ...(buttonText ? { "--ton-pay-button-text": buttonText } as React.CSSProperties : {}),
  };

  return (
    <div
      style={{
        width: "100%",
        maxWidth: 400,
        display: "flex",
        flexDirection: "column",
        gap: 24,
        alignItems: "center",
      }}
    >
      <h1
        style={{
          fontSize: 22,
          fontWeight: 700,
          margin: 0,
          color: "var(--tg-theme-text-color, #000)",
        }}
      >
        Demo Checkout
      </h1>

      <div
        style={{
          background: "var(--tg-theme-secondary-bg-color, #f5f5f5)",
          borderRadius: 16,
          padding: "20px 24px",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
          <span style={{ color: "var(--tg-theme-hint-color, #888)" }}>Item</span>
          <span style={{ fontWeight: 600 }}>TMA Demo Pass</span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between" }}>
          <span style={{ color: "var(--tg-theme-hint-color, #888)" }}>Amount</span>
          <span style={{ fontWeight: 700, fontSize: 18 }}>1 USDT</span>
        </div>
      </div>

      {status === "idle" || status === "pending" ? (
        <div style={{ width: "100%", ...buttonStyle }}>
          <TonPayButton
            handlePay={handlePay}
            isLoading={status === "pending"}
            network={CHAIN}
            apiKey={API_KEY}
            amount={1}
            currency="USDT"
            itemTitle="TMA Demo Pass"
            recipientWalletAddress={RECIPIENT_ADDR}
          />
        </div>
      ) : null}

      {status === "success" && (
        <div
          style={{
            background: "#e6f9ec",
            color: "#1a7a3c",
            borderRadius: 12,
            padding: "16px 20px",
            width: "100%",
            boxSizing: "border-box",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>✓</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Payment confirmed!</div>
          {txRef && (
            <div
              style={{ fontSize: 12, marginTop: 8, color: "#2a9a5c", wordBreak: "break-all" }}
            >
              Ref: {txRef}
            </div>
          )}
        </div>
      )}

      {status === "error" && (
        <div
          style={{
            background: "#fdecea",
            color: "#b71c1c",
            borderRadius: 12,
            padding: "16px 20px",
            width: "100%",
            boxSizing: "border-box",
            textAlign: "center",
          }}
        >
          <div style={{ fontSize: 28, marginBottom: 8 }}>✗</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>Payment failed</div>
          {error && <div style={{ fontSize: 13, marginTop: 6 }}>{error}</div>}
          <button
            onClick={() => {
              setStatus("idle");
              setError(null);
              setTxRef(null);
              stopPolling();
            }}
            style={{
              marginTop: 14,
              padding: "8px 20px",
              borderRadius: 8,
              border: "none",
              background: "#b71c1c",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: 14,
            }}
          >
            Try again
          </button>
        </div>
      )}

      {status === "pending" && (
        <p
          style={{
            fontSize: 13,
            color: "var(--tg-theme-hint-color, #888)",
            margin: 0,
            textAlign: "center",
          }}
        >
          Waiting for on-chain confirmation…
        </p>
      )}
    </div>
  );
}
