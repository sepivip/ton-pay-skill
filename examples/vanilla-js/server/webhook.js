/**
 * TON Pay webhook server — Express + ESM
 *
 * Mirrors the 7-step validation in the Next.js example
 * (examples/nextjs-app-router/app/api/ton-pay/webhook/route.ts).
 *
 * NOTE: orders are stored in-memory (Map). This is fine for demos;
 * replace with a real database in production.
 *
 * Run: node server/webhook.js
 */

import express from "express";
import { verifySignature } from "@ton-pay/api";

const app  = express();
const PORT = process.env.PORT ?? 3001;

// ---------------------------------------------------------------------------
// In-memory order store (demo only — restarts clear all orders)
// ---------------------------------------------------------------------------

/**
 * @typedef {{ id: string, reference: string, amount: number, asset: string, status: 'pending'|'paid'|'failed', txHash?: string }} Order
 */

/** @type {Map<string, Order>} key = reference */
const ordersByReference = new Map();

/** @type {Map<string, Order>} key = orderId */
const ordersByOrderId   = new Map();

/**
 * @param {{ orderId: string, reference: string, amount: number, asset: string }} input
 * @returns {Order}
 */
function createOrder(input) {
  const order = { id: input.orderId, reference: input.reference, amount: input.amount, asset: input.asset, status: "pending" };
  ordersByReference.set(input.reference, order);
  ordersByOrderId.set(input.orderId, order);
  return order;
}

/** @param {string} reference @returns {Order | undefined} */
function getOrderByReference(reference) {
  return ordersByReference.get(reference);
}

/** @param {string} reference @param {string} txHash */
function markOrderPaid(reference, txHash) {
  const order = ordersByReference.get(reference);
  if (!order) return;
  order.status = "paid";
  order.txHash = txHash;
}

/** @param {string} reference */
function markOrderFailed(reference) {
  const order = ordersByReference.get(reference);
  if (!order) return;
  order.status = "failed";
}

// ---------------------------------------------------------------------------
// Seed a demo order so the webhook has something to match in local testing.
// In a real app orders are created via your /api/orders endpoint.
// ---------------------------------------------------------------------------
createOrder({
  orderId:   "demo-order-1",
  reference: process.env.DEMO_REFERENCE ?? "demo-ref-001",
  amount:    1,
  asset:     "TON",
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

// Health check
app.get("/health", (_req, res) => res.json({ ok: true }));

// Create order endpoint (demo)
app.use(express.json());
app.post("/api/orders/create", (req, res) => {
  const { orderId, reference, amount, asset } = req.body ?? {};
  if (!orderId || !reference || !amount || !asset) {
    return res.status(400).json({ error: "missing fields: orderId, reference, amount, asset" });
  }
  const order = createOrder({ orderId, reference, amount: Number(amount), asset });
  res.json({ order });
});

// Order status endpoint (demo)
app.get("/api/orders/:reference", (req, res) => {
  const order = getOrderByReference(req.params.reference);
  if (!order) return res.status(404).json({ error: "not found" });
  res.json({ order });
});

// ---------------------------------------------------------------------------
// Webhook — MUST use express.raw so verifySignature sees the original bytes
// ---------------------------------------------------------------------------
app.post(
  "/api/ton-pay/webhook",
  express.raw({ type: "application/json" }),
  (req, res) => {
    const rawBody  = req.body;   // Buffer
    const rawStr   = rawBody.toString("utf8");
    const signature = req.headers["x-tonpay-signature"] ?? "";
    const secret    = process.env.TONPAY_API_SECRET;

    if (!secret) {
      console.error("TONPAY_API_SECRET is not configured");
      return res.status(500).json({ error: "server misconfigured" });
    }

    // 1. Signature
    if (!verifySignature(rawStr, signature, secret)) {
      console.warn("webhook: invalid signature");
      return res.status(401).json({ error: "invalid signature" });
    }

    let payload;
    try {
      payload = JSON.parse(rawStr);
    } catch {
      return res.status(400).json({ error: "invalid JSON" });
    }

    // 2. Event type — ack unknown events so TON Pay stops retrying
    if (payload.event !== "transfer.completed") {
      console.info("webhook: ignoring event", payload.event);
      return res.json({ received: true });
    }

    const data  = payload.data;
    const order = getOrderByReference(data.reference);

    // 3. Reference exists — ack unknown references (prevents endless retries)
    if (!order) {
      console.warn("webhook: unknown reference", data.reference);
      return res.json({ received: true });
    }

    // 7. Already processed — idempotent ack
    if (order.status !== "pending") {
      console.info("webhook: order already processed", data.reference, order.status);
      return res.json({ received: true });
    }

    // 4. Amount
    if (Number(data.amount) !== order.amount) {
      console.error("webhook: amount mismatch", { expected: order.amount, got: data.amount, reference: data.reference });
      return res.json({ received: true }); // log + ack; do not mark paid
    }

    // 5. Asset
    if (data.asset !== order.asset) {
      console.error("webhook: asset mismatch", { expected: order.asset, got: data.asset, reference: data.reference });
      return res.json({ received: true });
    }

    // 6. Status
    if (data.status === "success") {
      markOrderPaid(data.reference, data.txHash);
      console.info("webhook: order paid", data.reference, data.txHash);
    } else {
      markOrderFailed(data.reference);
      console.warn("webhook: order failed", data.reference, data.status);
    }

    res.json({ received: true });
  }
);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Webhook server listening on http://localhost:${PORT}`);
  console.log(`Webhook endpoint: POST http://localhost:${PORT}/api/ton-pay/webhook`);
});
