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

function applyConsumeSecurityHeaders(response: NextResponse): NextResponse {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
  response.headers.set("Pragma", "no-cache");
  response.headers.set("Referrer-Policy", "no-referrer");
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  return response;
}

function redirectToExpired(request: NextRequest, status: 303 | 307 = 307): NextResponse {
  const target = new URL("/auth/signin", resolveSiteUrl(request));
  target.searchParams.set("error", "expired");
  const response = NextResponse.redirect(target, status);
  return applyConsumeSecurityHeaders(response);
}

function escapeHtmlAttr(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function renderLandingPage(token: string): string {
  const escapedToken = escapeHtmlAttr(token);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="referrer" content="no-referrer" />
    <title>Sign in to FranklinCovey</title>
  </head>
  <body style="margin:0;background:#ffffff;color:#141928;font-family:Arial,sans-serif;">
    <main style="min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;">
      <section style="width:100%;max-width:400px;text-align:center;border:1px solid #e5e7eb;border-radius:16px;padding:28px 24px;">
        <div style="display:flex;justify-content:center;margin-bottom:18px;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 143.98 143.98" width="44" height="44" aria-hidden="true">
            <defs>
              <radialGradient id="fcg" cx="143.77" cy="0" r="203.37" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#67dfff"></stop>
                <stop offset="1" stop-color="#3253ff"></stop>
              </radialGradient>
            </defs>
            <path fill="url(#fcg)" d="M42.52,48.88,2.29,66.38A1.63,1.63,0,0,1,.13,64.26l14.67-36A24.49,24.49,0,0,1,28.26,14.8L64.26.13a1.63,1.63,0,0,1,2.12,2.16L48.88,42.52A12.27,12.27,0,0,1,42.52,48.88Zm58.93,0,40.23,17.5a1.64,1.64,0,0,0,2.17-2.12l-14.67-36A24.55,24.55,0,0,0,115.72,14.8L79.71.13a1.63,1.63,0,0,0-2.12,2.16L95.1,42.52A12.29,12.29,0,0,0,101.45,48.88ZM95.1,101.45,77.59,141.68a1.64,1.64,0,0,0,2.12,2.17l36-14.67a24.62,24.62,0,0,0,13.46-13.46l14.67-36a1.64,1.64,0,0,0-2.17-2.12L101.45,95.1A12.3,12.3,0,0,0,95.1,101.45ZM42.52,95.1,2.29,77.59A1.63,1.63,0,0,0,.13,79.71l14.67,36a24.55,24.55,0,0,0,13.46,13.46l36,14.67a1.64,1.64,0,0,0,2.12-2.17l-17.5-40.23A12.29,12.29,0,0,0,42.52,95.1Z"></path>
          </svg>
        </div>
        <h1 style="margin:0;font-size:28px;line-height:1.2;font-weight:400;">Sign in to FranklinCovey</h1>
        <p style="margin:14px 0 0;color:#4b5563;font-size:15px;line-height:1.5;">Click below to access your coaching portal.</p>
        <p style="margin:8px 0 0;color:#6b7280;font-size:13px;line-height:1.4;">This link can only be used once.</p>
        <form method="POST" action="/api/auth/magic-link/consume" style="margin-top:20px;">
          <input type="hidden" name="token" value="${escapedToken}" />
          <input type="hidden" name="_redirect" value="1" />
          <button type="submit" style="width:100%;border:0;border-radius:9999px;padding:12px 16px;background:#3253FF;color:#ffffff;font-size:15px;font-weight:700;cursor:pointer;">Sign in</button>
        </form>
      </section>
    </main>
  </body>
</html>`;
}

async function consumeToken(token: string | null, request: NextRequest) {
  if (!token) {
    console.error("[magic-link/consume] Missing token in consume request");
    return { ok: false as const, error: "INVALID_TOKEN" as const };
  }

  const payload = verifyMagicLinkToken(token);
  if (!payload) {
    console.error("[magic-link/consume] Token verification failed (expired or tampered)");
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
    const emailDomain = payload.email.split("@")[1] ?? "";
    console.error("[magic-link/consume] User not found for payload", {
      userId: payload.userId,
      role: payload.role,
      emailDomain,
    });
    return { ok: false as const, error: "INVALID_TOKEN" as const };
  }

  const firstUse = await consumeMagicLinkOneTime({
    token,
    userId: user.id,
    email: user.email,
    role: user.role,
    ipAddress: getRequestIpAddress(request),
    userAgent: request.headers.get("user-agent") || undefined,
  });

  if (!firstUse) {
    console.error("[magic-link/consume] Token already consumed (one-time guard rejected)");
    return { ok: false as const, error: "INVALID_TOKEN" as const };
  }

  return {
    ok: true as const,
    user,
  };
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  if (!token) {
    return redirectToExpired(request);
  }

  const payload = verifyMagicLinkToken(token);
  if (!payload) {
    console.error("[magic-link/consume] Token verification failed (expired or tampered)");
    return redirectToExpired(request);
  }

  const html = renderLandingPage(token);
  const response = new NextResponse(html, {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
    },
  });
  return applyConsumeSecurityHeaders(response);
}

export async function POST(request: NextRequest) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const isFormMode = contentType.includes("application/x-www-form-urlencoded");

  if (isFormMode) {
    let token: string | null = null;
    try {
      const form = await request.formData();
      const value = form.get("token");
      token = typeof value === "string" ? value : null;
    } catch {
      return redirectToExpired(request, 303);
    }

    const consumed = await consumeToken(token, request);
    if (!consumed.ok) {
      return redirectToExpired(request, 303);
    }

    const destination = new URL(dashboardPathForRole(consumed.user.role), resolveSiteUrl(request));
    const response = NextResponse.redirect(destination, 303);
    writePortalSession(response, {
      userId: consumed.user.id,
      email: consumed.user.email,
      role: consumed.user.role,
    });
    return applyConsumeSecurityHeaders(response);
  }

  let token: string | null = null;

  try {
    const body = (await request.json()) as { token?: string };
    token = body.token ?? null;
  } catch {
    const response = NextResponse.json({ success: false, error: "INVALID_TOKEN" }, { status: 400 });
    return applyConsumeSecurityHeaders(response);
  }

  const consumed = await consumeToken(token, request);
  if (!consumed.ok) {
    const response = NextResponse.json({ success: false, error: "INVALID_TOKEN" }, { status: 400 });
    return applyConsumeSecurityHeaders(response);
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

  return applyConsumeSecurityHeaders(response);
}
