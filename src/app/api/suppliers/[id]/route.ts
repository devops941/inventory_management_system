import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {fail, handleError, ok, withManage, withModule} from "@/lib/api";
import { supplierSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withModule("suppliers", async (_req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const supplier = await prisma.supplier.findUnique({
      where: { id },
      include: {
        products: true,
        purchaseOrders: { orderBy: { orderDate: "desc" }, take: 25 },
      },
    });
    if (!supplier) return fail("Supplier not found", 404);
    return ok(supplier);
  } catch (e) {
    return handleError(e);
  }
});

export const PUT = withManage("suppliers", async (req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const parsed = supplierSchema.partial().safeParse(await req.json());
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const d = parsed.data;
    const supplier = await prisma.supplier.update({
      where: { id },
      data: { ...d, ...(d.email !== undefined ? { email: d.email || null } : {}) },
    });
    return ok(supplier);
  } catch (e) {
    return handleError(e);
  }
});

export const DELETE = withManage("suppliers", async (_req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const count = await prisma.purchaseOrder.count({ where: { supplierId: id } });
    if (count > 0)
      return fail("Cannot delete a supplier that has purchase orders", 409);
    await prisma.product.updateMany({
      where: { supplierId: id },
      data: { supplierId: null },
    });
    await prisma.supplier.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
});
