import { UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getRequestIpAddress } from "@/lib/server/rate-limit";
import { consumeMagicLinkOneTime } from "@/lib/server/security-guards";
import { verifyMagicLinkToken, writePortalSession } from "@/lib/server/session";

function dashboardPathForRole(role: UserRole): string {
  return role === UserRole.ADMIN ? "/admin/dashboard" : "/coach/dashboard";
}

function resolveSiteUrl(request: NextRequest): URL {
  return new URL("/", request.url);
}

async function consumeToken(token: string | null, request: NextRequest) {
  if (!token) {
    return { ok: false as const, error: "INVALID_TOKEN" as const };
  }

  const payload = verifyMagicLinkToken(token);
  if (!payload) {
    return { ok: false as const, error: "INVALID_TOKEN" as const };
  }

  const user = await prisma.user.findFirst({
    where: {
      id: payload.userId,
      email: payload.email,
      role: payload.role,
      active: true,
      archivedAt: null,
    },
    select: {
      id: true,
      email: true,
      role: true,
    },
  });

  if (!user) {
    return { ok: false as const, error: "INVALID_TOKEN" as const };
  }

  const firstUse = await consumeMagicLinkOneTime({
    token,
    userId: user.id,
    email: user.email,
    role: user.role,
    ipAddress: getRequestIpAddress(request.headers),
    userAgent: request.headers.get("user-agent") || undefined,
  });

  if (!firstUse) {
    return { ok: false as const, error: "INVALID_TOKEN" as const };
  }

  return {
    ok: true as const,
    user,
  };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const consumed = await consumeToken(token, request);

  if (!consumed.ok) {
    const target = new URL("/auth/signin", resolveSiteUrl(request));
    target.searchParams.set("error", "expired");
    return NextResponse.redirect(target);
  }

  const destination = new URL(dashboardPathForRole(consumed.user.role), resolveSiteUrl(request));
  const response = NextResponse.redirect(destination);
  writePortalSession(response, {
    userId: consumed.user.id,
    email: consumed.user.email,
    role: consumed.user.role,
  });
  return response;
}

export async function POST(request: NextRequest) {
  let token: string | null = null;

  try {
    const body = (await request.json()) as { token?: string };
    token = body.token ?? null;
  } catch {
    return NextResponse.json({ success: false, error: "INVALID_TOKEN" }, { status: 400 });
  }

  const consumed = await consumeToken(token, request);
  if (!consumed.ok) {
    return NextResponse.json({ success: false, error: "INVALID_TOKEN" }, { status: 400 });
  }

  const response = NextResponse.json({
    success: true,
    role: consumed.user.role,
    redirectTo: dashboardPathForRole(consumed.user.role),
  });

  writePortalSession(response, {
    userId: consumed.user.id,
    email: consumed.user.email,
    role: consumed.user.role,
  });

  return response;
}
