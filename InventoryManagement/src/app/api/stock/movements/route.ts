import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handleError, ok, withModule } from "@/lib/api";

export const GET = withModule("stock", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const productId = searchParams.get("productId");
    const warehouseId = searchParams.get("warehouseId");
    const type = searchParams.get("type");
    const take = Math.min(Number(searchParams.get("take") ?? 100), 500);

    const movements = await prisma.stockMovement.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(warehouseId ? { warehouseId } : {}),
        ...(type ? { type } : {}),
      },
      include: {
        product: true,
        warehouse: true,
        createdBy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take,
    });
    return ok(movements);
  } catch (e) {
    return handleError(e);
  }
});
