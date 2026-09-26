import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {fail, handleError, ok, withManage, withModule} from "@/lib/api";
import { supplierSchema } from "@/lib/validators";

export const GET = withModule("suppliers", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const suppliers = await prisma.supplier.findMany({
      where: q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" } },
              { contactPerson: { contains: q, mode: "insensitive" } },
              { phone: { contains: q, mode: "insensitive" } },
            ],
          }
        : {},
      include: {
        _count: { select: { products: true, purchaseOrders: true } },
      },
      orderBy: { name: "asc" },
    });
    return ok(suppliers);
  } catch (e) {
    return handleError(e);
  }
});

export const POST = withManage("suppliers", async (req: NextRequest) => {
  try {
    const parsed = supplierSchema.safeParse(await req.json());
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const d = parsed.data;
    const supplier = await prisma.supplier.create({
      data: { ...d, email: d.email || null, code: d.code || null },
    });
    return ok(supplier, 201);
  } catch (e) {
    return handleError(e);
  }
});
