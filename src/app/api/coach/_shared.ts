import { Prisma, UserRole, type Session } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import {
  CoachScopeError,
  type CoachScope,
  resolveCoachScope,
} from "@/lib/server/coach-scope";
import { clearPortalSession, readPortalSession } from "@/lib/server/session";
import type { CoachSessionRow } from "@/lib/types/coach";

export function jsonNoStore(body: object, init?: ResponseInit): NextResponse {
  const response = NextResponse.json(body, init);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export type CoachAuthResult = { scope: CoachScope } | { response: NextResponse };

export async function requireCoachScope(request: NextRequest): Promise<CoachAuthResult> {
  const session = readPortalSession(request);
  if (!session || session.role !== UserRole.COACH) {
    return { response: jsonNoStore({ error: "Unauthorized" }, { status: 401 }) };
  }

  try {
    const scope = await resolveCoachScope(session);
    return { scope };
  } catch (error) {
    if (error instanceof CoachScopeError && error.code === "COACH_ACCESS_DISABLED") {
      const response = jsonNoStore({ error: "Forbidden" }, { status: 403 });
      clearPortalSession(response);
      return { response };
    }

    if (error instanceof CoachScopeError && error.code === "COACH_PROFILE_NOT_FOUND") {
      return {
        response: jsonNoStore({ error: "Coach profile not found" }, { status: 500 }),
      };
    }

    return { response: jsonNoStore({ error: "Failed to resolve coach scope" }, { status: 500 }) };
  }
}

export function mapSessionRow(session: Session): CoachSessionRow {
  return {
    id: session.id,
    sessionNumber: session.sessionNumber,
    status: session.status,
    occurredAt: session.occurredAt ? session.occurredAt.toISOString() : null,
    topic: session.topic,
    outcome: session.outcome,
    durationMinutes: session.durationMinutes,
    privateNotes: session.privateNotes,
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  };
}

export function isPrismaKnownError(
  error: object | null | undefined
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export function isConflictPrismaError(
  error: object | null | undefined
): boolean {
  if (!isPrismaKnownError(error)) return false;
  return error.code === "P2002" || error.code === "P2034";
}

export function isTimeoutPrismaError(
  error: object | null | undefined
): boolean {
  if (!isPrismaKnownError(error)) return false;
  return error.code === "P2028";
}

export function parseIsoDateOrNull(value: string | null): Date | null | "invalid" {
  if (value === null) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return "invalid";
  return parsed;
}

export function toNullableTrimmed(value: string | null): string | null {
  if (value === null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
