import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";
import { fail, getSession, handleError, ok } from "@/lib/api";
import { runSeed } from "@/lib/seed";
import { ROLES } from "@/lib/rbac";

/**
 * POST /api/seed - loads the demo dataset.
 * An empty database can be bootstrapped without a session; once users exist
 * only an Admin may force a reload with ?force=true.
 */
export async function POST(req: NextRequest) {
  try {
    const force = new URL(req.url).searchParams.get("force") === "true";
    const existing = await prisma.user.count();

    if (existing > 0) {
      const session = await getSession(req);
      if (!session) return fail("Unauthorized", 401);
      if (!force || session.role !== ROLES.ADMIN)
        return fail(
          "Database already contains users. Only an admin can force a reload.",
          403
        );
    }

    const counts = await runSeed();
    return ok({ seeded: true, counts });
  } catch (e) {
    return handleError(e);
  }
}
