import { Prisma, SessionStatus, type ProgramCode } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { validateSessionPatchInput } from "@/lib/validation/session-validation";
import {
  isConflictPrismaError,
  isTimeoutPrismaError,
  jsonNoStore,
  mapSessionRow,
  parseIsoDateOrNull,
  requireCoachScope,
  toNullableTrimmed,
} from "@/app/api/coach/_shared";

type JsonScalar = string | number | boolean | null | undefined;

function hasOwnKey(record: Record<string, JsonScalar>, key: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function parsePatchBody(body: Record<string, JsonScalar>): {
  errors: string[];
  occurredAt?: Date | null;
  topic?: string | null;
  outcome?: string | null;
  durationMinutes?: number | null;
  privateNotes?: string | null;
} {
  const errors: string[] = [];
  const parsed: {
    errors: string[];
    occurredAt?: Date | null;
    topic?: string | null;
    outcome?: string | null;
    durationMinutes?: number | null;
    privateNotes?: string | null;
  } = { errors };

  if (body.occurredAt !== undefined) {
    if (typeof body.occurredAt !== "string" && body.occurredAt !== null) {
      errors.push("occurredAt must be a string or null");
    } else {
      const parsedDate = parseIsoDateOrNull(body.occurredAt);
      if (parsedDate === "invalid") {
        errors.push("occurredAt must be a valid ISO date");
      } else {
        parsed.occurredAt = parsedDate;
      }
    }
  }

  if (body.topic !== undefined) {
    if (typeof body.topic !== "string" && body.topic !== null) {
      errors.push("topic must be a string or null");
    } else {
      parsed.topic = typeof body.topic === "string" ? toNullableTrimmed(body.topic) : null;
    }
  }

  if (body.outcome !== undefined) {
    if (typeof body.outcome !== "string" && body.outcome !== null) {
      errors.push("outcome must be a string or null");
    } else {
      parsed.outcome =
        typeof body.outcome === "string" ? toNullableTrimmed(body.outcome) : null;
    }
  }

  if (body.durationMinutes !== undefined) {
    if (
      body.durationMinutes !== null &&
      (!Number.isInteger(body.durationMinutes) || typeof body.durationMinutes !== "number")
    ) {
      errors.push("durationMinutes must be an integer or null");
    } else {
      parsed.durationMinutes = body.durationMinutes;
    }
  }

  if (body.privateNotes !== undefined) {
    if (typeof body.privateNotes !== "string" && body.privateNotes !== null) {
      errors.push("privateNotes must be a string or null");
    } else {
      parsed.privateNotes = body.privateNotes;
    }
  }

  return parsed;
}

function ensureCompletedInvariant(input: {
  status: SessionStatus;
  existingOccurredAt: Date | null;
  existingTopic: string | null;
  existingOutcome: string | null;
  existingDurationMinutes: number | null;
  patchOccurredAt?: Date | null;
  patchTopic?: string | null;
  patchOutcome?: string | null;
  patchDurationMinutes?: number | null;
}): string | null {
  if (input.status !== SessionStatus.COMPLETED) return null;

  const occurredAt = input.patchOccurredAt !== undefined ? input.patchOccurredAt : input.existingOccurredAt;
  const topic = input.patchTopic !== undefined ? input.patchTopic : input.existingTopic;
  const outcome = input.patchOutcome !== undefined ? input.patchOutcome : input.existingOutcome;
  const durationMinutes =
    input.patchDurationMinutes !== undefined
      ? input.patchDurationMinutes
      : input.existingDurationMinutes;

  if (!occurredAt || !topic || !outcome || durationMinutes === null) {
    return "completed sessions must keep occurredAt, topic, outcome, and durationMinutes";
  }

  return null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireCoachScope(request);
  if ("response" in auth) {
    return auth.response;
  }

  const { id: sessionId } = await context.params;
  if (!sessionId?.trim()) {
    return jsonNoStore({ error: "Invalid session id" }, { status: 422 });
  }

  let bodyRecord: Record<string, JsonScalar>;
  try {
    const body = await request.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return jsonNoStore({ error: "Invalid JSON body" }, { status: 422 });
    }
    bodyRecord = body as Record<string, JsonScalar>;
  } catch {
    return jsonNoStore({ error: "Invalid JSON body" }, { status: 422 });
  }

  if (hasOwnKey(bodyRecord, "status")) {
    return jsonNoStore({ error: "status is not allowed on PATCH" }, { status: 422 });
  }

  const parsedBody = parsePatchBody(bodyRecord);
  if (parsedBody.errors.length > 0) {
    return jsonNoStore({ error: parsedBody.errors.join("; ") }, { status: 422 });
  }

  try {
    const existing = await prisma.session.findFirst({
      where: {
        id: sessionId,
        archivedAt: null,
        engagement: {
          organizationCoachId: auth.scope.organizationCoachId,
          archivedAt: null,
        },
      },
      select: {
        id: true,
        engagementId: true,
        sessionNumber: true,
        status: true,
        occurredAt: true,
        topic: true,
        outcome: true,
        durationMinutes: true,
        privateNotes: true,
        createdAt: true,
        updatedAt: true,
        engagement: {
          select: {
            program: {
              select: {
                code: true,
              },
            },
          },
        },
      },
    });

    if (!existing) {
      return jsonNoStore({ error: "Not found" }, { status: 404 });
    }

    const validated = validateSessionPatchInput({
      status: existing.status,
      programCode: existing.engagement.program.code as ProgramCode,
      occurredAt: parsedBody.occurredAt,
      topic: parsedBody.topic,
      outcome: parsedBody.outcome,
      durationMinutes: parsedBody.durationMinutes,
      privateNotes: parsedBody.privateNotes,
    });

    if (validated.errors.length > 0) {
      return jsonNoStore({ error: validated.errors.join("; ") }, { status: 422 });
    }

    const invariantError = ensureCompletedInvariant({
      status: existing.status,
      existingOccurredAt: existing.occurredAt,
      existingTopic: existing.topic,
      existingOutcome: existing.outcome,
      existingDurationMinutes: existing.durationMinutes,
      patchOccurredAt: validated.values.occurredAt,
      patchTopic: validated.values.topic,
      patchOutcome: validated.values.outcome,
      patchDurationMinutes: validated.values.durationMinutes,
    });
    if (invariantError) {
      return jsonNoStore({ error: invariantError }, { status: 422 });
    }

    const data: Prisma.SessionUpdateInput = {};
    if (validated.values.occurredAt !== undefined) data.occurredAt = validated.values.occurredAt;
    if (validated.values.topic !== undefined) data.topic = validated.values.topic;
    if (validated.values.outcome !== undefined) data.outcome = validated.values.outcome;
    if (validated.values.durationMinutes !== undefined) {
      data.durationMinutes = validated.values.durationMinutes;
    }
    if (validated.values.privateNotes !== undefined) {
      data.privateNotes = validated.values.privateNotes;
    }

    const updateResult = await prisma.session.updateMany({
      where: {
        id: existing.id,
        archivedAt: null,
        updatedAt: existing.updatedAt,
      },
      data,
    });

    if (updateResult.count === 0) {
      return jsonNoStore({ error: "Conflict" }, { status: 409 });
    }

    await prisma.engagement.updateMany({
      where: {
        id: existing.engagementId,
        organizationCoachId: auth.scope.organizationCoachId,
        archivedAt: null,
      },
      data: {
        lastActivityAt: new Date(),
      },
    });

    const updated = await prisma.session.findFirst({
      where: {
        id: existing.id,
        archivedAt: null,
        engagement: {
          organizationCoachId: auth.scope.organizationCoachId,
          archivedAt: null,
        },
      },
    });

    if (!updated) {
      return jsonNoStore({ error: "Conflict" }, { status: 409 });
    }

    return jsonNoStore({ item: mapSessionRow(updated) }, { status: 200 });
  } catch (error) {
    if (error !== null && typeof error === "object" && isConflictPrismaError(error)) {
      return jsonNoStore({ error: "Conflict" }, { status: 409 });
    }

    if (error !== null && typeof error === "object" && isTimeoutPrismaError(error)) {
      return jsonNoStore({ error: "Request timed out, retry" }, { status: 503 });
    }

    console.error("PATCH /api/coach/sessions/[id] failed", error);
    return jsonNoStore({ error: "Failed to update session" }, { status: 500 });
  }
}
