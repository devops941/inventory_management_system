import prisma from "./prisma";
import { applyStock } from "./stock";

/**
 * Issues a sales order: reduces stock for every line from the chosen warehouse,
 * flips the order to "issued" and raises a notification. Throws if any line
 * would drive stock negative (checked before any write).
 */
export async function issueSalesOrder(orderId: string, userId: string) {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: { items: true, customer: true },
  });
  if (!order) throw new Error("Sales order not found");
  if (order.status === "issued") throw new Error("Order already issued");
  if (order.status === "cancelled")
    throw new Error("A cancelled order cannot be issued");
  if (!order.warehouseId)
    throw new Error("Assign a warehouse before issuing this order");

  // Pre-flight stock availability check so partial writes never happen.
  for (const item of order.items) {
    const stock = await prisma.stock.findUnique({
      where: {
        productId_warehouseId: {
          productId: item.productId,
          warehouseId: order.warehouseId,
        },
      },
    });
    const available = stock?.quantity ?? 0;
    if (available < item.quantity) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
      });
      throw new Error(
        `Insufficient stock for ${product?.name ?? "item"}: available ${available}, required ${item.quantity}`
      );
    }
  }

  for (const item of order.items) {
    await applyStock({
      productId: item.productId,
      warehouseId: order.warehouseId,
      quantity: item.quantity,
      type: "OUT",
      reference: order.orderNumber,
      referenceType: "sale",
      note: `Stock issued for ${order.orderNumber}`,
      createdById: userId,
    });
  }

  const updated = await prisma.salesOrder.update({
    where: { id: orderId },
    data: { status: "issued" },
    include: { items: { include: { product: true } }, customer: true },
  });

  await prisma.notification.create({
    data: {
      type: "order",
      title: `Sale issued: ${order.orderNumber}`,
      message: `Stock for sales order ${order.orderNumber} (${order.customer?.name ?? "customer"}) has been issued.`,
      severity: "info",
      link: "/sales",
    },
  });
  return updated;
}

/** Returns issued stock back into the warehouse and marks the order returned. */
export async function returnSalesOrder(orderId: string, userId: string) {
  const order = await prisma.salesOrder.findUnique({
    where: { id: orderId },
    include: { items: true },
  });
  if (!order) throw new Error("Sales order not found");
  if (order.status !== "issued")
    throw new Error("Only issued orders can be returned");
  if (!order.warehouseId) throw new Error("Order has no warehouse");

  for (const item of order.items) {
    await applyStock({
      productId: item.productId,
      warehouseId: order.warehouseId,
      quantity: item.quantity,
      type: "IN",
      reference: order.orderNumber,
      referenceType: "return",
      note: `Sales return for ${order.orderNumber}`,
      createdById: userId,
    });
  }

  return prisma.salesOrder.update({
    where: { id: orderId },
    data: { status: "returned" },
    include: { items: { include: { product: true } }, customer: true },
  });
}
