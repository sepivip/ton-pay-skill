export const TON_PAY_CONFIG = {
  apiKey: process.env.NEXT_PUBLIC_TONPAY_API_KEY ?? "",
  chain: (process.env.NEXT_PUBLIC_TONPAY_CHAIN ?? "testnet") as "testnet" | "mainnet",
  recipientAddr: process.env.NEXT_PUBLIC_TON_RECIPIENT_ADDR ?? "",
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "",
};

export const TON_PAY_MANIFEST_URL = `${TON_PAY_CONFIG.appUrl}/tonconnect-manifest.json`;
