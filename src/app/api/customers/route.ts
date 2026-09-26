import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {fail, handleError, ok, withManage, withModule} from "@/lib/api";
import { customerSchema } from "@/lib/validators";

export const GET = withModule("customers", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const customers = await prisma.customer.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      include: { _count: { select: { salesOrders: true } } },
      orderBy: { name: "asc" },
    });
    return ok(customers);
  } catch (e) {
    return handleError(e);
  }
});

export const POST = withManage("customers", async (req: NextRequest) => {
  try {
    const parsed = customerSchema.safeParse(await req.json());
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const d = parsed.data;
    const customer = await prisma.customer.create({
      data: { ...d, email: d.email || null, code: d.code || null },
    });
    return ok(customer, 201);
  } catch (e) {
    return handleError(e);
  }
});
