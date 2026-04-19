"use client";
import { TonConnectUIProvider } from "@tonconnect/ui-react";
import { TON_PAY_MANIFEST_URL } from "@/lib/ton-pay-config";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", margin: 0, padding: 24 }}>
        <TonConnectUIProvider manifestUrl={TON_PAY_MANIFEST_URL}>
          {children}
        </TonConnectUIProvider>
      </body>
    </html>
  );
}
