import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import {fail, handleError, ok, withManage, withModule} from "@/lib/api";
import { categorySchema } from "@/lib/validators";

export const GET = withModule("categories", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q")?.trim();
    const categories = await prisma.category.findMany({
      where: q ? { name: { contains: q, mode: "insensitive" } } : {},
      include: { _count: { select: { products: true } } },
      orderBy: { name: "asc" },
    });
    return ok(categories);
  } catch (e) {
    return handleError(e);
  }
});

export const POST = withManage("categories", async (req: NextRequest) => {
  try {
    const parsed = categorySchema.safeParse(await req.json());
    if (!parsed.success) return fail("Invalid input", 422, parsed.error.flatten());
    const category = await prisma.category.create({ data: parsed.data });
    return ok(category, 201);
  } catch (e) {
    return handleError(e);
  }
});
