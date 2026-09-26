import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {fail, handleError, ok, withManage} from "@/lib/api";
import { categorySchema } from "@/lib/validators";

type Ctx = { params: Promise<{ id: string }> };

export const PUT = withManage("categories", async (req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const parsed = categorySchema.partial().safeParse(await req.json());
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const category = await prisma.category.update({ where: { id }, data: parsed.data });
    return ok(category);
  } catch (e) {
    return handleError(e);
  }
});

export const DELETE = withManage("categories", async (_req: NextRequest, ctx: Ctx) => {
  try {
    const { id } = await ctx.params;
    const count = await prisma.product.count({ where: { categoryId: id } });
    if (count > 0)
      return fail(`Cannot delete: ${count} product(s) use this category`, 409);
    await prisma.category.delete({ where: { id } });
    return ok({ deleted: true });
  } catch (e) {
    return handleError(e);
  }
});
