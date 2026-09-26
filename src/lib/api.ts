import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { AUTH_COOKIE, verifyToken, type JwtPayload } from "./auth";
import { canAccess, canManage, type ModuleKey } from "./rbac";

export type RouteContext<P = Record<string, string>> = {
  params: Promise<P>;
};

export type ApiHandler<P = Record<string, string>> = (
  req: NextRequest,
  ctx: RouteContext<P>
) => Promise<NextResponse> | NextResponse;

export function ok<T>(data: T, status = 200) {
  return NextResponse.json({ success: true, data }, { status });
}

export function fail(message: string, status = 400, errors?: unknown) {
  return NextResponse.json(
    { success: false, message, errors: errors ?? null },
    { status }
  );
}

export async function getSession(req?: NextRequest): Promise<JwtPayload | null> {
  let token: string | undefined;
  if (req) {
    token = req.cookies.get(AUTH_COOKIE)?.value;
  }
  if (!token) {
    try {
      const store = await cookies();
      token = store.get(AUTH_COOKIE)?.value;
    } catch {
      token = undefined;
    }
  }
  if (!token) return null;
  return verifyToken(token);
}

/** Wrap a handler so it requires a valid session. */
export function withAuth<P = Record<string, string>>(
  handler: ApiHandler<P>
): ApiHandler<P> {
  return async (req, ctx) => {
    const session = await getSession(req);
    if (!session) return fail("Unauthorized", 401);
    (req as AuthedRequest).session = session;
    return handler(req, ctx);
  };
}

/** Wrap a handler so it requires a valid session AND access to a module. */
export function withModule<P = Record<string, string>>(
  mod: ModuleKey,
  handler: ApiHandler<P>
): ApiHandler<P> {
  return async (req, ctx) => {
    const session = await getSession(req);
    if (!session) return fail("Unauthorized", 401);
    if (!canAccess(session.role, mod))
      return fail("Forbidden: insufficient role permissions", 403);
    (req as AuthedRequest).session = session;
    return handler(req, ctx);
  };
}

/**
 * Wrap a mutating handler so it requires a session that may actually change the
 * module (see WRITE_PERMISSIONS). Reading is governed by withModule instead.
 */
export function withManage<P = Record<string, string>>(
  mod: ModuleKey,
  handler: ApiHandler<P>
): ApiHandler<P> {
  return async (req, ctx) => {
    const session = await getSession(req);
    if (!session) return fail("Unauthorized", 401);
    if (!canManage(session.role, mod))
      return fail("Forbidden: insufficient role permissions", 403);
    (req as AuthedRequest).session = session;
    return handler(req, ctx);
  };
}

export interface AuthedRequest extends NextRequest {
  session?: JwtPayload;
}

export function sessionOf(req: NextRequest): JwtPayload {
  const s = (req as AuthedRequest).session;
  if (!s) throw new Error("Session missing");
  return s;
}

export function handleError(e: unknown) {
  const message = e instanceof Error ? e.message : "Unexpected server error";
  const code = (e as { code?: string })?.code;

  // Invalid ObjectId / malformed foreign key supplied by the client.
  // Checked before the unique-constraint rule: Prisma error messages name the
  // failing call (e.g. `findUnique`), which would otherwise look like a
  // duplicate-key error.
  if (
    code === "P2023" ||
    message.includes("Malformed ObjectID") ||
    message.includes("Inconsistent column data") ||
    message.includes("is not a valid ObjectId")
  ) {
    return fail("One of the referenced records does not exist", 422);
  }
  // Duplicate key (P2002) or raw MongoDB E11000.
  if (
    code === "P2002" ||
    message.includes("E11000") ||
    message.includes("Unique constraint failed")
  ) {
    return fail("A record with these unique values already exists", 409);
  }
  // Cannot delete: other records still reference this one (P2014).
  if (code === "P2014" || message.includes("would violate the required relation")) {
    return fail(
      "This record is referenced by existing orders or stock history and cannot be deleted. Archive it instead.",
      409
    );
  }
  // Referenced record is missing (P2025 / P2003) or a required relation came
  // back empty because the related document does not exist.
  if (
    code === "P2025" ||
    code === "P2003" ||
    message.includes("P2025") ||
    message.includes("P2003") ||
    message.includes("Inconsistent query result") ||
    message.includes("required to return data") ||
    message.toLowerCase().includes("foreign key constraint")
  ) {
    return fail("Referenced record not found", 404);
  }
  console.error("[API ERROR]", e);
  return fail(message, 500);
}

/** Sequential document number generator, e.g. PO-2024-0007 */
export function nextDocNumber(prefix: string, count: number) {
  const year = new Date().getFullYear();
  return `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;
}
