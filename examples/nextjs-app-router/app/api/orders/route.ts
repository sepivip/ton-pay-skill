import { NextResponse } from "next/server";
import { createOrder } from "@/lib/orders-db";

export async function POST(request: Request) {
  const body = await request.json();
  const order = createOrder({
    orderId:   body.orderId,
    reference: body.reference,
    amount:    body.amount,
    asset:     body.asset,
  });
  return NextResponse.json(order);
}
