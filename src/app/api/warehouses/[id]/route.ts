import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {fail, handleError, ok, withManage} from "@/lib/api";
import { warehouseSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = withManage("warehouses", async (req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const parsed = warehouseSchema.partial().safeParse(await req.json());
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const warehouse = await prisma.warehouse.update({ where: { id }, data: parsed.data });
    return ok(warehouse);
  } catch (e) {
    return handleError(e);
  }
});

export const DELETE = withManage("warehouses", async (_req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const count = await prisma.stock.count({ where: { warehouseId: id, quantity: { gt: 0 } } });
    if (count > 0)
      return fail("Cannot delete a warehouse that still holds stock", 409);
    await prisma.warehouse.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
});
