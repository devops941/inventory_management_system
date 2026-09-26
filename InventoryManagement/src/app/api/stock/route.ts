import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { handleError, ok, withModule } from "@/lib/api";

export const GET = withModule("stock", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");
    const productId = searchParams.get("productId");
    const q = searchParams.get("q")?.trim();

    const stocks = await prisma.stock.findMany({
      where: {
        ...(warehouseId ? { warehouseId } : {}),
        ...(productId ? { productId } : {}),
        ...(q ? { product: { name: { contains: q, mode: "insensitive" } } } : {}),
      },
      include: { product: { include: { category: true } }, warehouse: true },
      orderBy: { updatedAt: "desc" },
    });
    return ok(stocks);
  } catch (e) {
    return handleError(e);
  }
});
