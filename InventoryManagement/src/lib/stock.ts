import prisma from "./prisma";

export type MovementType =
  | "IN"
  | "OUT"
  | "ADJUSTMENT"
  | "TRANSFER_IN"
  | "TRANSFER_OUT";

export interface ApplyStockInput {
  productId: string;
  warehouseId: string;
  quantity: number; // always positive; direction implied by type
  type: MovementType;
  reference?: string | null;
  referenceType?: string | null;
  note?: string | null;
  createdById?: string | null;
}

/**
 * Applies a stock change in a single place: updates the per-warehouse Stock row,
 * keeps the product aggregate quantity in sync and writes a StockMovement audit
 * record. All purchase/sale/adjustment/transfer flows funnel through here.
 */
export async function applyStock(input: ApplyStockInput) {
  const {
    productId,
    warehouseId,
    quantity,
    type,
    reference,
    referenceType,
    note,
    createdById,
  } = input;

  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) throw new Error("Product not found");

  const stock = await prisma.stock.findUnique({
    where: { productId_warehouseId: { productId, warehouseId } },
  });

  const current = stock?.quantity ?? 0;
  const isIn = type === "IN" || type === "TRANSFER_IN";
  const isOut = type === "OUT" || type === "TRANSFER_OUT";

  let delta: number;
  if (type === "ADJUSTMENT") {
    delta = quantity - current; // quantity is the counted target
  } else if (isIn) {
    delta = quantity;
  } else if (isOut) {
    delta = -quantity;
  } else {
    throw new Error("Unknown movement type");
  }

  const newQty = current + delta;
  if (newQty < 0) throw new Error("Insufficient stock for this operation");

  const updated = await prisma.stock.upsert({
    where: { productId_warehouseId: { productId, warehouseId } },
    create: { productId, warehouseId, quantity: Math.max(newQty, 0) },
    update: { quantity: newQty },
  });

  await prisma.stockMovement.create({
    data: {
      productId,
      warehouseId,
      type,
      quantity: delta,
      balance: newQty,
      reference: reference ?? null,
      referenceType: referenceType ?? null,
      note: note ?? null,
      createdById: createdById ?? null,
    },
  });

  await syncProductQuantity(productId);

  if (newQty <= product.reorderLevel) {
    await notifyLowStock(productId, newQty, product.reorderLevel);
  }

  return updated;
}

/** Recomputes the product-level aggregate quantity from all warehouses. */
export async function syncProductQuantity(productId: string) {
  const agg = await prisma.stock.aggregate({
    where: { productId },
    _sum: { quantity: true },
  });
  const total = agg._sum.quantity ?? 0;
  await prisma.product.update({
    where: { id: productId },
    data: { quantity: total },
  });
  return total;
}

export async function notifyLowStock(
  productId: string,
  qty: number,
  reorderLevel: number
) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) return;
  // Avoid stacking duplicate unread alerts for the same product.
  const existing = await prisma.notification.findFirst({
    where: { productId, type: "low_stock", isRead: false },
  });
  if (existing) return;

  await prisma.notification.create({
    data: {
      type: "low_stock",
      title: `Low stock: ${product.name}`,
      message: `${product.name} (${product.sku}) is at ${qty} ${product.unit}, at or below the reorder level of ${reorderLevel}.`,
      severity: qty === 0 ? "critical" : "warning",
      link: "/products",
      productId,
    },
  });

  const { sendAlertMail } = await import("./mailer");
  await sendAlertMail(
    `Low stock alert: ${product.name}`,
    `${product.name} (${product.sku}) is at ${qty} ${product.unit}. Reorder level is ${reorderLevel}.`
  );
}

const EXPIRY_WINDOW_DAYS = 30;

/**
 * Creates in-app (and email) alerts for products expiring within the window.
 * Safe to call repeatedly: one unread alert per product is kept.
 */
export async function scanExpiringProducts(windowDays = EXPIRY_WINDOW_DAYS) {
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + windowDays);

  const products = await prisma.product.findMany({
    where: {
      expiryDate: { not: null, lte: horizon },
      status: "active",
    },
  });

  let created = 0;
  for (const product of products) {
    const existing = await prisma.notification.findFirst({
      where: { productId: product.id, type: "expiry", isRead: false },
    });
    if (existing) continue;

    const expired = product.expiryDate! <= new Date();
    await prisma.notification.create({
      data: {
        type: "expiry",
        title: `${expired ? "Expired" : "Expiring soon"}: ${product.name}`,
        message: `${product.name} (${product.sku}) ${
          expired ? "expired on" : "expires on"
        } ${product.expiryDate!.toISOString().slice(0, 10)}.`,
        severity: expired ? "critical" : "warning",
        link: "/products",
        productId: product.id,
      },
    });
    created += 1;
  }

  if (created > 0) {
    const { sendAlertMail } = await import("./mailer");
    await sendAlertMail(
      `${created} product(s) expiring or expired`,
      `${created} product(s) are expiring within ${windowDays} days or already expired. Review the Alerts page.`
    );
  }
  return created;
}

export async function getStockLevels() {
  const stocks = await prisma.stock.findMany({
    include: { product: true, warehouse: true },
    orderBy: { updatedAt: "desc" },
  });
  return stocks;
}
