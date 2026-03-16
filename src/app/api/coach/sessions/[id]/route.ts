import { Prisma, SessionStatus, type ProgramCode } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { validateSessionPatchInput } from "@/lib/validation/session-validation";
import {
  deserializeOutcomes,
  isConflictPrismaError,
  isTimeoutPrismaError,
  jsonNoStore,
  mapSessionRow,
  parseIsoDateOrNull,
  requireCoachScope,
  serializeOutcomes,
  toNullableTrimmed,
} from "@/app/api/coach/_shared";

const ALLOWED_PATCH_KEYS = new Set([
  "occurredAt",
  "topic",
  "outcomes",
  "nextSteps",
  "engagementLevel",
  "actionCommitment",
  "notes",
]);

function parsePatchBody(body: Record<string, unknown>): {
  errors: string[];
  occurredAt?: Date | null;
  topic?: string | null;
  outcomes?: string[] | null;
  nextSteps?: string | null;
  engagementLevel?: number | null;
  actionCommitment?: string | null;
  notes?: string | null;
} {
  const errors: string[] = [];
  const parsed: {
    errors: string[];
    occurredAt?: Date | null;
    topic?: string | null;
    outcomes?: string[] | null;
    nextSteps?: string | null;
    engagementLevel?: number | null;
    actionCommitment?: string | null;
    notes?: string | null;
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

  if (body.outcomes !== undefined) {
    if (body.outcomes === null) {
      parsed.outcomes = null;
    } else if (
      Array.isArray(body.outcomes) &&
      body.outcomes.every((value): value is string => typeof value === "string")
    ) {
      parsed.outcomes = body.outcomes.map((value) => value.trim());
    } else {
      errors.push("outcomes must be a string array or null");
    }
  }

  if (body.nextSteps !== undefined) {
    if (typeof body.nextSteps !== "string" && body.nextSteps !== null) {
      errors.push("nextSteps must be a string or null");
    } else {
      parsed.nextSteps =
        typeof body.nextSteps === "string" ? toNullableTrimmed(body.nextSteps) : null;
    }
  }

  if (body.engagementLevel !== undefined) {
    if (
      body.engagementLevel !== null &&
      (typeof body.engagementLevel !== "number" || !Number.isInteger(body.engagementLevel))
    ) {
      errors.push("engagementLevel must be an integer or null");
    } else {
      parsed.engagementLevel = body.engagementLevel as number | null;
    }
  }

  if (body.actionCommitment !== undefined) {
    if (typeof body.actionCommitment !== "string" && body.actionCommitment !== null) {
      errors.push("actionCommitment must be a string or null");
    } else {
      parsed.actionCommitment =
        typeof body.actionCommitment === "string"
          ? toNullableTrimmed(body.actionCommitment)
          : null;
    }
  }

  if (body.notes !== undefined) {
    if (typeof body.notes !== "string" && body.notes !== null) {
      errors.push("notes must be a string or null");
    } else {
      parsed.notes = body.notes;
    }
  }

  return parsed;
}

function areDatesEqual(left: Date | null, right: Date | null): boolean {
  if (left === null || right === null) {
    return left === right;
  }
  return left.getTime() === right.getTime();
}

function areOutcomesEqual(left: string[] | null, right: string[] | null): boolean {
  if (left === null || right === null) {
    return left === right;
  }
  return serializeOutcomes(left) === serializeOutcomes(right);
}

function ensureCompletedInvariant(input: {
  status: SessionStatus;
  existingOccurredAt: Date | null;
  existingTopic: string | null;
  existingOutcomes: string | null;
  existingNextSteps: string | null;
  existingEngagementLevel: number | null;
  existingActionCommitment: string | null;
  patchOccurredAt?: Date | null;
  patchTopic?: string | null;
  patchOutcomes?: string[] | null;
  patchNextSteps?: string | null;
  patchEngagementLevel?: number | null;
  patchActionCommitment?: string | null;
}): string | null {
  if (input.status !== SessionStatus.COMPLETED) return null;

  const occurredAt =
    input.patchOccurredAt !== undefined ? input.patchOccurredAt : input.existingOccurredAt;
  const topic = input.patchTopic !== undefined ? input.patchTopic : input.existingTopic;
  const outcomes =
    input.patchOutcomes !== undefined
      ? input.patchOutcomes
      : deserializeOutcomes(input.existingOutcomes);
  const nextSteps =
    input.patchNextSteps !== undefined ? input.patchNextSteps : input.existingNextSteps;
  const engagementLevel =
    input.patchEngagementLevel !== undefined
      ? input.patchEngagementLevel
      : input.existingEngagementLevel;
  const actionCommitment =
    input.patchActionCommitment !== undefined
      ? input.patchActionCommitment
      : input.existingActionCommitment;

  if (
    !occurredAt ||
    !topic ||
    !outcomes ||
    outcomes.length === 0 ||
    !nextSteps ||
    engagementLevel === null ||
    !actionCommitment
  ) {
    return "completed sessions must keep occurredAt, topic, outcomes, nextSteps, engagementLevel, and actionCommitment";
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

  let bodyRecord: Record<string, unknown>;
  try {
    const body = await request.json();
    if (body === null || typeof body !== "object" || Array.isArray(body)) {
      return jsonNoStore({ error: "Invalid JSON body" }, { status: 422 });
    }
    bodyRecord = body as Record<string, unknown>;
  } catch {
    return jsonNoStore({ error: "Invalid JSON body" }, { status: 422 });
  }

  if (Object.prototype.hasOwnProperty.call(bodyRecord, "status")) {
    return jsonNoStore({ error: "status is not allowed on PATCH" }, { status: 422 });
  }

  const unknownKeys = Object.keys(bodyRecord).filter((key) => !ALLOWED_PATCH_KEYS.has(key));
  const providedAllowedKeys = Object.keys(bodyRecord).filter((key) => ALLOWED_PATCH_KEYS.has(key));
  const parseErrors: string[] = [];
  if (unknownKeys.length > 0) {
    parseErrors.push(`Unknown fields: ${unknownKeys.join(", ")}`);
  }
  if (providedAllowedKeys.length === 0) {
    parseErrors.push("At least one mutable field is required");
  }

  const parsedBody = parsePatchBody(bodyRecord);
  if (parseErrors.length > 0 || parsedBody.errors.length > 0) {
    return jsonNoStore({ error: [...parseErrors, ...parsedBody.errors].join("; ") }, { status: 422 });
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
        outcomes: true,
        nextSteps: true,
        engagementLevel: true,
        actionCommitment: true,
        notes: true,
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
      outcomes: parsedBody.outcomes,
      nextSteps: parsedBody.nextSteps,
      engagementLevel: parsedBody.engagementLevel,
      actionCommitment: parsedBody.actionCommitment,
      notes: parsedBody.notes,
    });

    if (validated.errors.length > 0) {
      return jsonNoStore({ error: validated.errors.join("; ") }, { status: 422 });
    }

    const invariantError = ensureCompletedInvariant({
      status: existing.status,
      existingOccurredAt: existing.occurredAt,
      existingTopic: existing.topic,
      existingOutcomes: existing.outcomes,
      existingNextSteps: existing.nextSteps,
      existingEngagementLevel: existing.engagementLevel,
      existingActionCommitment: existing.actionCommitment,
      patchOccurredAt: validated.values.occurredAt,
      patchTopic: validated.values.topic,
      patchOutcomes: validated.values.outcomes,
      patchNextSteps: validated.values.nextSteps,
      patchEngagementLevel: validated.values.engagementLevel,
      patchActionCommitment: validated.values.actionCommitment,
    });
    if (invariantError) {
      return jsonNoStore({ error: invariantError }, { status: 422 });
    }

    const data: Prisma.SessionUpdateManyMutationInput = {};
    const existingOutcomes = deserializeOutcomes(existing.outcomes);

    if (
      validated.values.occurredAt !== undefined &&
      !areDatesEqual(validated.values.occurredAt, existing.occurredAt)
    ) {
      data.occurredAt = validated.values.occurredAt;
    }

    if (validated.values.topic !== undefined && validated.values.topic !== existing.topic) {
      data.topic = validated.values.topic;
    }

    if (
      validated.values.outcomes !== undefined &&
      !areOutcomesEqual(validated.values.outcomes, existingOutcomes)
    ) {
      data.outcomes = validated.values.outcomes ? serializeOutcomes(validated.values.outcomes) : null;
    }

    if (validated.values.nextSteps !== undefined && validated.values.nextSteps !== existing.nextSteps) {
      data.nextSteps = validated.values.nextSteps;
    }

    if (
      validated.values.engagementLevel !== undefined &&
      validated.values.engagementLevel !== existing.engagementLevel
    ) {
      data.engagementLevel = validated.values.engagementLevel;
    }

    if (
      validated.values.actionCommitment !== undefined &&
      validated.values.actionCommitment !== existing.actionCommitment
    ) {
      data.actionCommitment = validated.values.actionCommitment;
    }

    if (validated.values.notes !== undefined && validated.values.notes !== existing.notes) {
      data.notes = validated.values.notes;
    }

    if (Object.keys(data).length === 0) {
      return jsonNoStore(
        { error: "At least one mutable field with a changed value is required" },
        { status: 422 }
      );
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
