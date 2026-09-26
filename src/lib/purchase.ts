import prisma from "./prisma";
import { applyStock } from "./stock";

/** Marks a purchase order received and pushes all pending items into stock. */
export async function receiveOrder(orderId: string, userId: string) {
  const order = await prisma.purchaseOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error("Purchase order not found");
  if (order.status === "received") throw new Error("Order already received");
  if (order.status === "cancelled")
    throw new Error("A cancelled order cannot be received");
  if (!order.warehouseId)
    throw new Error("Assign a warehouse before receiving this order");

  for (const item of order.items) {
    if (item.receivedQty >= item.quantity) continue;
    const qty = item.quantity - item.receivedQty;
    await applyStock({
      productId: item.productId,
      warehouseId: order.warehouseId,
      quantity: qty,
      type: "IN",
      reference: order.orderNumber,
      referenceType: "purchase",
      note: `Goods received for ${order.orderNumber}`,
      createdById: userId,
    });
    await prisma.purchaseItem.update({
      where: { id: item.id },
      data: { receivedQty: item.quantity },
    });
  }

  const updated = await prisma.purchaseOrder.update({
    where: { id: orderId },
    data: { status: "received", receivedDate: new Date() },
    include: { items: { include: { product: true } }, supplier: true },
  });

  await prisma.notification.create({
    data: {
      type: "order",
      title: `Purchase received: ${order.orderNumber}`,
      message: `Goods for purchase order ${order.orderNumber} have been received and stock updated.`,
      severity: "success",
      link: "/purchases",
    },
  });
  return updated;
}
