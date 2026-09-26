import { NextRequest } from "next/server";
import {handleError, ok, withManage} from "@/lib/api";
import { scanExpiringProducts } from "@/lib/stock";

export const POST = withManage("alerts", async (req: NextRequest) => {
  try {
    const { searchParams } = new URL(req.url);
    const windowDays = Number(searchParams.get("days") ?? 30);
    const created = await scanExpiringProducts(
      Number.isFinite(windowDays) && windowDays > 0 ? windowDays : 30
    );
    return ok({ created });
  } catch (e) {
    return handleError(e);
  }
});
