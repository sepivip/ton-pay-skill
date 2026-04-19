type Order = {
  id: string;
  reference: string;
  amount: number;
  asset: string;
  status: "pending" | "paid" | "failed";
  txHash?: string;
};

const orders = new Map<string, Order>();              // key: reference
const byOrderId = new Map<string, Order>();           // key: orderId

export function createOrder(input: { orderId: string; reference: string; amount: number; asset: string }): Order {
  const order: Order = { id: input.orderId, reference: input.reference, amount: input.amount, asset: input.asset, status: "pending" };
  orders.set(input.reference, order);
  byOrderId.set(input.orderId, order);
  return order;
}

export function getOrderByReference(reference: string): Order | undefined {
  return orders.get(reference);
}

export function markOrderPaid(reference: string, txHash: string): void {
  const order = orders.get(reference);
  if (!order) return;
  order.status = "paid";
  order.txHash = txHash;
}

export function markOrderFailed(reference: string): void {
  const order = orders.get(reference);
  if (!order) return;
  order.status = "failed";
}
