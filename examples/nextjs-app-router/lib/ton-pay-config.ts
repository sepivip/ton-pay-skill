export const TON_PAY_CONFIG = {
  chain: (process.env.NEXT_PUBLIC_TONPAY_CHAIN ?? "testnet") as "testnet" | "mainnet",
  recipientAddr: process.env.NEXT_PUBLIC_TON_RECIPIENT_ADDR ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
  // Optional: only needed if you opt into webhook-based notifications. Leave unset
  // to use the dashboard-free polling path (see app/checkout/page.tsx).
  apiKey: process.env.NEXT_PUBLIC_TONPAY_API_KEY || undefined,
};

export const TON_PAY_MANIFEST_URL = `${TON_PAY_CONFIG.appUrl}/tonconnect-manifest.json`;
