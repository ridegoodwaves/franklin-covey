import { createHmac, timingSafeEqual } from "node:crypto";
import type { UserRole } from "@prisma/client";
import type { NextRequest, NextResponse } from "next/server";

const PARTICIPANT_SESSION_COOKIE = "fc_participant_session";
const PORTAL_SESSION_COOKIE = "fc_portal_session";

const PARTICIPANT_SESSION_TTL_SECONDS = 60 * 60 * 4;
const PORTAL_SESSION_TTL_SECONDS = 60 * 60 * 12;

interface SessionEnvelope<T> {
  scope: string;
  payload: T;
  exp: number;
}

export interface ParticipantSession {
  participantId: string;
  engagementId: string;
  organizationId: string;
  cohortId: string;
  email: string;
  shownCoachIds: string[];
  remixUsed: boolean;
  /** IDs of the coaches currently displayed to this participant. Pinned until remix or selection. */
  currentBatchIds: string[];
}

export interface PortalSession {
  userId: string;
  email: string;
  role: UserRole;
}

export interface MagicLinkPayload {
  userId: string;
  email: string;
  role: UserRole;
}

function getAuthSecret(): string {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) {
    throw new Error("AUTH_SECRET is required for session signing");
  }
  return secret;
}

function encodeJson(value: unknown): string {
  return Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
}

function decodeJson<T>(value: string): T | null {
  try {
    return JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

function signSegment(segment: string): string {
  return createHmac("sha256", getAuthSecret()).update(segment).digest("base64url");
}

function createSignedToken<T>(scope: string, payload: T, ttlSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const envelope: SessionEnvelope<T> = { scope, payload, exp };
  const encoded = encodeJson(envelope);
  const signature = signSegment(encoded);
  return `${encoded}.${signature}`;
}

function verifySignedToken<T>(token: string, expectedScope: string): T | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;

  const expectedSignature = signSegment(encoded);
  if (signature.length !== expectedSignature.length) return null;

  const provided = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);
  if (!timingSafeEqual(provided, expected)) return null;

  const envelope = decodeJson<SessionEnvelope<T>>(encoded);
  if (!envelope) return null;
  if (envelope.scope !== expectedScope) return null;

  const now = Math.floor(Date.now() / 1000);
  if (envelope.exp <= now) return null;

  return envelope.payload;
}

function cookieSecure(): boolean {
  return process.env.NODE_ENV === "production";
}

export function readParticipantSession(request: NextRequest): ParticipantSession | null {
  const raw = request.cookies.get(PARTICIPANT_SESSION_COOKIE)?.value;
  if (!raw) return null;
  return verifySignedToken<ParticipantSession>(raw, "participant");
}

export function writeParticipantSession(response: NextResponse, session: ParticipantSession): void {
  const token = createSignedToken("participant", session, PARTICIPANT_SESSION_TTL_SECONDS);
  response.cookies.set({
    name: PARTICIPANT_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: PARTICIPANT_SESSION_TTL_SECONDS,
  });
}

export function clearParticipantSession(response: NextResponse): void {
  response.cookies.set({
    name: PARTICIPANT_SESSION_COOKIE,
    value: "",
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}

export function createMagicLinkToken(payload: MagicLinkPayload): string {
  const ttlMinutes = Number(process.env.MAGIC_LINK_TTL_MINUTES || 30);
  const ttlSeconds = Number.isFinite(ttlMinutes) ? Math.max(60, ttlMinutes * 60) : 30 * 60;
  return createSignedToken("magic-link", payload, ttlSeconds);
}

export function verifyMagicLinkToken(token: string): MagicLinkPayload | null {
  return verifySignedToken<MagicLinkPayload>(token, "magic-link");
}

export function writePortalSession(response: NextResponse, session: PortalSession): void {
  const token = createSignedToken("portal", session, PORTAL_SESSION_TTL_SECONDS);
  response.cookies.set({
    name: PORTAL_SESSION_COOKIE,
    value: token,
    httpOnly: true,
    secure: cookieSecure(),
    sameSite: "lax",
    path: "/",
    maxAge: PORTAL_SESSION_TTL_SECONDS,
  });
}

export function readPortalSession(request: NextRequest): PortalSession | null {
  const raw = request.cookies.get(PORTAL_SESSION_COOKIE)?.value;
  if (!raw) return null;
  return verifySignedToken<PortalSession>(raw, "portal");
}
