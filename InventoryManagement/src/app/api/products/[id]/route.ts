import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {fail, handleError, ok, withManage, withModule} from "@/lib/api";
import { productSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withModule("products", async (_req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        supplier: true,
        warehouse: true,
        stock: { include: { warehouse: true } },
      },
    });
    if (!product) return fail("Product not found", 404);
    const movements = await prisma.stockMovement.findMany({
      where: { productId: id },
      include: { warehouse: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    return ok({ ...product, movements });
  } catch (e) {
    return handleError(e);
  }
});

export const PUT = withManage("products", async (req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const body = await req.json();
    const parsed = productSchema.partial().safeParse(body);
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const d = parsed.data;

    const product = await prisma.product.update({
      where: { id },
      data: {
        ...(d.name !== undefined ? { name: d.name } : {}),
        ...(d.sku !== undefined ? { sku: d.sku } : {}),
        ...(d.barcode !== undefined ? { barcode: d.barcode } : {}),
        ...(d.description !== undefined ? { description: d.description } : {}),
        ...(d.unit !== undefined ? { unit: d.unit } : {}),
        ...(d.costPrice !== undefined ? { costPrice: d.costPrice } : {}),
        ...(d.sellingPrice !== undefined ? { sellingPrice: d.sellingPrice } : {}),
        ...(d.reorderLevel !== undefined ? { reorderLevel: d.reorderLevel } : {}),
        ...(d.image !== undefined ? { image: d.image } : {}),
        ...(d.status !== undefined ? { status: d.status } : {}),
        ...(d.expiryDate !== undefined ? { expiryDate: d.expiryDate } : {}),
        ...(d.categoryId !== undefined ? { categoryId: d.categoryId } : {}),
        ...(d.supplierId !== undefined ? { supplierId: d.supplierId || null } : {}),
        ...(d.warehouseId !== undefined ? { warehouseId: d.warehouseId || null } : {}),
      },
      include: { category: true, supplier: true, warehouse: true },
    });
    return ok(product);
  } catch (e) {
    return handleError(e);
  }
});

export const DELETE = withManage("products", async (_req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    await prisma.stock.deleteMany({ where: { productId: id } });
    await prisma.stockMovement.deleteMany({ where: { productId: id } });
    await prisma.notification.deleteMany({ where: { productId: id } });
    await prisma.product.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
});
