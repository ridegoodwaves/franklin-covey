import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PORTAL_SESSION_COOKIE = "fc_portal_session";
const PORTAL_SESSION_TTL_SECONDS = 60 * 60 * 12;
const PORTAL_IDLE_THRESHOLD_SECONDS = 60;
const COOKIE_SCOPE = "portal";

type PortalRole = "ADMIN" | "COACH";

interface PortalSessionPayload {
  userId: string;
  email: string;
  role: PortalRole;
}

interface SessionEnvelope<T> {
  scope: string;
  payload: T;
  exp: number;
}

function getAuthSecret(): string | null {
  const secret = process.env.AUTH_SECRET?.trim();
  return secret && secret.length > 0 ? secret : null;
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
    const padding = "=".repeat((4 - (base64.length % 4)) % 4);
    const binary = atob(base64 + padding);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function decodeJson<T>(value: string): T | null {
  const bytes = fromBase64Url(value);
  if (!bytes) return null;

  try {
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json) as T;
  } catch {
    return null;
  }
}

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

async function signSegment(segment: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(segment)
  );

  return toBase64Url(new Uint8Array(signatureBuffer));
}

async function verifyPortalSessionToken(
  token: string,
  secret: string
): Promise<SessionEnvelope<PortalSessionPayload> | null> {
  const tokenParts = token.split(".");
  if (tokenParts.length !== 2) return null;

  const [encoded, providedSignature] = tokenParts;
  if (!encoded || !providedSignature) return null;

  const expectedSignature = await signSegment(encoded, secret);
  if (!constantTimeEqual(providedSignature, expectedSignature)) return null;

  const envelope = decodeJson<SessionEnvelope<PortalSessionPayload>>(encoded);
  if (!envelope) return null;

  if (envelope.scope !== COOKIE_SCOPE) return null;
  if (!envelope.exp || envelope.exp <= Math.floor(Date.now() / 1000)) return null;

  return envelope;
}

async function createPortalSessionToken(
  payload: PortalSessionPayload,
  secret: string
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + PORTAL_SESSION_TTL_SECONDS;
  const envelope: SessionEnvelope<PortalSessionPayload> = {
    scope: COOKIE_SCOPE,
    payload,
    exp,
  };
  const encoded = toBase64Url(new TextEncoder().encode(JSON.stringify(envelope)));
  const signature = await signSegment(encoded, secret);
  return `${encoded}.${signature}`;
}

function isSecureCookie(request: NextRequest): boolean {
  if (request.nextUrl.protocol === "https:") return true;
  if (process.env.NODE_ENV === "production") return true;
  if (process.env.VERCEL === "1") return true;

  const vercelUrl = process.env.VERCEL_URL?.trim();
  return Boolean(vercelUrl && vercelUrl.length > 0);
}

function unauthorizedApiResponse(): NextResponse {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbiddenApiResponse(): NextResponse {
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

function unauthorizedPageResponse(request: NextRequest): NextResponse {
  return NextResponse.redirect(new URL("/auth/signin", request.url));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith("/participant/engagement")) {
    return NextResponse.redirect(new URL("/participant/", request.url));
  }

  const isAdminPage = pathname === "/admin" || pathname.startsWith("/admin/");
  const isCoachPage = pathname === "/coach" || pathname.startsWith("/coach/");
  const isAdminApi = pathname === "/api/admin" || pathname.startsWith("/api/admin/");
  const isCoachApi = pathname === "/api/coach" || pathname.startsWith("/api/coach/");

  const requiredRole: PortalRole | null = isAdminPage || isAdminApi
    ? "ADMIN"
    : isCoachPage || isCoachApi
      ? "COACH"
      : null;

  if (!requiredRole) {
    return NextResponse.next();
  }

  const isApiRoute = isAdminApi || isCoachApi;
  const secret = getAuthSecret();
  if (!secret) {
    return isApiRoute ? unauthorizedApiResponse() : unauthorizedPageResponse(request);
  }

  const token = request.cookies.get(PORTAL_SESSION_COOKIE)?.value;
  if (!token) {
    return isApiRoute ? unauthorizedApiResponse() : unauthorizedPageResponse(request);
  }

  const sessionEnvelope = await verifyPortalSessionToken(token, secret);
  if (!sessionEnvelope) {
    return isApiRoute ? unauthorizedApiResponse() : unauthorizedPageResponse(request);
  }

  const now = Math.floor(Date.now() / 1000);
  if (now > sessionEnvelope.exp - PORTAL_IDLE_THRESHOLD_SECONDS) {
    return isApiRoute ? unauthorizedApiResponse() : unauthorizedPageResponse(request);
  }

  if (sessionEnvelope.payload.role !== requiredRole) {
    return isApiRoute ? forbiddenApiResponse() : unauthorizedPageResponse(request);
  }

  const refreshedToken = await createPortalSessionToken(sessionEnvelope.payload, secret);
  const isImportPage = pathname === "/admin/import";
  const response = isImportPage
    ? NextResponse.redirect(new URL("/admin/dashboard", request.url))
    : NextResponse.next();
  response.cookies.set({
    name: PORTAL_SESSION_COOKIE,
    value: refreshedToken,
    httpOnly: true,
    secure: isSecureCookie(request),
    sameSite: "lax",
    path: "/",
    maxAge: PORTAL_SESSION_TTL_SECONDS,
  });

  return response;
}

export const config = {
  matcher: [
    "/participant/engagement/:path*",
    "/admin/:path*",
    "/coach/:path*",
    "/api/admin/:path*",
    "/api/coach/:path*",
  ],
};
