import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {fail, handleError, ok, withManage, withModule} from "@/lib/api";
import { customerSchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export const GET = withModule("customers", async (_req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        salesOrders: { orderBy: { orderDate: "desc" }, take: 25 },
      },
    });
    if (!customer) return fail("Customer not found", 404);
    return ok(customer);
  } catch (e) {
    return handleError(e);
  }
});

export const PUT = withManage("customers", async (req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const parsed = customerSchema.partial().safeParse(await req.json());
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const d = parsed.data;
    const customer = await prisma.customer.update({
      where: { id },
      data: { ...d, ...(d.email !== undefined ? { email: d.email || null } : {}) },
    });
    return ok(customer);
  } catch (e) {
    return handleError(e);
  }
});

export const DELETE = withManage("customers", async (_req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const count = await prisma.salesOrder.count({ where: { customerId: id } });
    if (count > 0)
      return fail("Cannot delete a customer that has sales orders", 409);
    await prisma.customer.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
});
