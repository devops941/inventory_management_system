import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {fail, handleError, ok, withManage, withModule} from "@/lib/api";
import { warehouseSchema } from "@/lib/validators";

export const GET = withModule("warehouses", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const warehouses = await prisma.warehouse.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : {},
      include: {
        _count: { select: { stock: true, purchaseOrders: true, salesOrders: true } },
      },
      orderBy: { name: "asc" },
    });
    return ok(warehouses);
  } catch (e) {
    return handleError(e);
  }
});

export const POST = withManage("warehouses", async (req: NextRequest) => {
  try {
    const parsed = warehouseSchema.safeParse(await req.json());
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const warehouse = await prisma.warehouse.create({ data: parsed.data });
    return ok(warehouse, 201);
  } catch (e) {
    return handleError(e);
  }
});
