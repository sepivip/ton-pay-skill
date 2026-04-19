import { NextResponse } from "next/server";
import { verifySignature } from "@ton-pay/api";
import { getOrderByReference, markOrderPaid, markOrderFailed } from "@/lib/orders-db";

export async function POST(request: Request) {
  const rawBody = await request.text();
  const signature = request.headers.get("x-tonpay-signature") ?? "";
  const secret = process.env.TONPAY_API_SECRET;

  if (!secret) {
    console.error("TONPAY_API_SECRET is not configured");
    return NextResponse.json({ error: "server misconfigured" }, { status: 500 });
  }

  // 1. Signature
  if (!verifySignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  const payload = JSON.parse(rawBody);

  // 2. Event type
  if (payload.event !== "transfer.completed") {
    // Unknown event — ack to stop retries, don't touch orders.
    return NextResponse.json({ received: true });
  }

  const data = payload.data;
  const order = getOrderByReference(data.reference);

  // 3. Reference exists
  if (!order) {
    console.warn("webhook for unknown reference", { reference: data.reference });
    return NextResponse.json({ received: true });     // 200 so retries stop
  }

  // 7. Already processed → idempotent ack
  if (order.status !== "pending") {
    return NextResponse.json({ received: true });
  }

  // 4. Amount
  if (Number(data.amount) !== order.amount) {
    console.error("amount mismatch", { expected: order.amount, got: data.amount, reference: data.reference });
    return NextResponse.json({ received: true });     // log + ack, do not mark paid
  }

  // 5. Asset
  if (data.asset !== order.asset) {
    console.error("asset mismatch", { expected: order.asset, got: data.asset, reference: data.reference });
    return NextResponse.json({ received: true });
  }

  // 6. Status
  if (data.status === "success") {
    markOrderPaid(data.reference, data.txHash);
  } else {
    markOrderFailed(data.reference);
  }

  return NextResponse.json({ received: true });
}
