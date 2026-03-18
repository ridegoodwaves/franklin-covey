import {
  EngagementStatus,
  SessionStatus,
  type ProgramCode,
  type Session,
} from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { transitionEngagement } from "@/lib/server/engagement-transitions";
import { validateSessionCreateInput } from "@/lib/validation/session-validation";
import {
  isConflictPrismaError,
  isTimeoutPrismaError,
  jsonNoStore,
  mapSessionRow,
  parseIsoDateOrNull,
  requireCoachScope,
  serializeOutcomes,
  toNullableTrimmed,
} from "@/app/api/coach/_shared";

interface CreateSessionBody {
  engagementId?: string;
  occurredAt?: string | null;
  topic?: string | null;
  outcomes?: string[] | null;
  nextSteps?: string | null;
  engagementLevel?: number | null;
  actionCommitment?: string | null;
  notes?: string | null;
  status?: SessionStatus;
}

class NotFoundError extends Error {}
class ConflictError extends Error {}
class ValidationError extends Error {
  readonly messages: string[];

  constructor(messages: string[]) {
    super(messages.join("; "));
    this.messages = messages;
  }
}

function parseCreateSessionBody(body: CreateSessionBody): {
  engagementId: string | null;
  occurredAt: Date | null | "invalid";
  topic: string | null;
  outcomes: string[] | null;
  nextSteps: string | null;
  engagementLevel: number | null;
  actionCommitment: string | null;
  notes: string | null;
  status: SessionStatus | null;
  errors: string[];
} {
  const errors: string[] = [];

  const engagementId =
    typeof body.engagementId === "string" ? body.engagementId.trim() : "";
  if (!engagementId) {
    errors.push("engagementId is required");
  }

  const occurredAtRaw = body.occurredAt ?? null;
  const occurredAt =
    typeof occurredAtRaw === "string" || occurredAtRaw === null
      ? parseIsoDateOrNull(occurredAtRaw)
      : "invalid";
  if (occurredAt === "invalid") {
    errors.push("occurredAt must be a valid ISO date string or null");
  }

  const topicRaw = body.topic ?? null;
  const topic =
    typeof topicRaw === "string" || topicRaw === null
      ? toNullableTrimmed(topicRaw)
      : null;
  if (topicRaw !== null && topicRaw !== undefined && typeof topicRaw !== "string") {
    errors.push("topic must be a string or null");
  }

  const outcomesRaw = body.outcomes ?? null;
  let outcomes: string[] | null = null;
  if (outcomesRaw === null) {
    outcomes = null;
  } else if (
    Array.isArray(outcomesRaw) &&
    outcomesRaw.every((value): value is string => typeof value === "string")
  ) {
    outcomes = outcomesRaw.map((value) => value.trim());
  } else {
    errors.push("outcomes must be a string array or null");
  }

  const nextStepsRaw = body.nextSteps ?? null;
  const nextSteps =
    typeof nextStepsRaw === "string" || nextStepsRaw === null
      ? toNullableTrimmed(nextStepsRaw)
      : null;
  if (nextStepsRaw !== null && nextStepsRaw !== undefined && typeof nextStepsRaw !== "string") {
    errors.push("nextSteps must be a string or null");
  }

  const engagementLevelRaw = body.engagementLevel ?? null;
  let engagementLevel: number | null = null;
  if (engagementLevelRaw === null) {
    engagementLevel = null;
  } else if (
    typeof engagementLevelRaw === "number" &&
    Number.isInteger(engagementLevelRaw)
  ) {
    engagementLevel = engagementLevelRaw;
  } else {
    errors.push("engagementLevel must be an integer or null");
  }

  const actionCommitmentRaw = body.actionCommitment ?? null;
  const actionCommitment =
    typeof actionCommitmentRaw === "string" || actionCommitmentRaw === null
      ? toNullableTrimmed(actionCommitmentRaw)
      : null;
  if (
    actionCommitmentRaw !== null &&
    actionCommitmentRaw !== undefined &&
    typeof actionCommitmentRaw !== "string"
  ) {
    errors.push("actionCommitment must be a string or null");
  }

  const notesRaw = body.notes ?? null;
  const notes =
    typeof notesRaw === "string" || notesRaw === null
      ? notesRaw
      : null;
  if (
    notesRaw !== null &&
    notesRaw !== undefined &&
    typeof notesRaw !== "string"
  ) {
    errors.push("notes must be a string or null");
  }

  const status = Object.values(SessionStatus).includes(body.status as SessionStatus)
    ? (body.status as SessionStatus)
    : null;
  if (!status) {
    errors.push("status is required and must be a valid SessionStatus");
  }

  return {
    engagementId: engagementId || null,
    occurredAt,
    topic,
    outcomes,
    nextSteps,
    engagementLevel,
    actionCommitment,
    notes,
    status,
    errors,
  };
}

async function createSessionWithRetry(input: {
  engagementId: string;
  occurredAt: Date | null;
  topic: string | null;
  outcomes: string[] | null;
  nextSteps: string | null;
  engagementLevel: number | null;
  actionCommitment: string | null;
  notes: string | null;
  status: SessionStatus;
  organizationCoachId: string;
}): Promise<Session> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${input.engagementId}))`;

          const engagement = await tx.engagement.findFirst({
            where: {
              id: input.engagementId,
              organizationCoachId: input.organizationCoachId,
              archivedAt: null,
            },
            select: {
              id: true,
              status: true,
              statusVersion: true,
              totalSessions: true,
              program: {
                select: {
                  code: true,
                },
              },
            },
          });

          if (!engagement) {
            throw new NotFoundError("Engagement not found");
          }

          if (
            engagement.status !== EngagementStatus.COACH_SELECTED &&
            engagement.status !== EngagementStatus.IN_PROGRESS
          ) {
            throw new ConflictError("Engagement status does not allow session logging");
          }

          const sessionStats = await tx.session.aggregate({
            where: {
              engagementId: input.engagementId,
            },
            _max: {
              sessionNumber: true,
            },
          });

          const maxSessionNumber = sessionStats._max.sessionNumber ?? 0;
          if (maxSessionNumber >= engagement.totalSessions) {
            throw new ConflictError("All sessions already logged");
          }

          const validated = validateSessionCreateInput({
            status: input.status,
            programCode: engagement.program.code as ProgramCode,
            occurredAt: input.occurredAt,
            topic: input.topic,
            outcomes: input.outcomes,
            nextSteps: input.nextSteps,
            engagementLevel: input.engagementLevel,
            actionCommitment: input.actionCommitment,
            notes: input.notes,
          });

          if (validated.errors.length > 0) {
            throw new ValidationError(validated.errors);
          }

          const sessionNumber = maxSessionNumber + 1;
          const created = await tx.session.create({
            data: {
              engagementId: input.engagementId,
              sessionNumber,
              status: input.status,
              occurredAt: validated.values.occurredAt,
              topic: validated.values.topic,
              outcomes: validated.values.outcomes
                ? serializeOutcomes(validated.values.outcomes)
                : null,
              nextSteps: validated.values.nextSteps,
              engagementLevel: validated.values.engagementLevel,
              actionCommitment: validated.values.actionCommitment,
              notes: validated.values.notes,
            },
          });

          let currentVersion = engagement.statusVersion;
          if (maxSessionNumber === 0 && engagement.status === EngagementStatus.COACH_SELECTED) {
            const result = await transitionEngagement(
              tx,
              input.engagementId,
              EngagementStatus.IN_PROGRESS,
              currentVersion
            );
            currentVersion = result.newStatusVersion;
          }

          if (sessionNumber === engagement.totalSessions) {
            await transitionEngagement(
              tx,
              input.engagementId,
              EngagementStatus.COMPLETED,
              currentVersion
            );
          } else if (sessionNumber > 1) {
            await tx.engagement.update({
              where: { id: input.engagementId },
              data: {
                lastActivityAt: new Date(),
              },
            });
          }

          return created;
        },
        {
          maxWait: 3000,
          timeout: 8000,
        }
      );
    } catch (error) {
      if (
        error !== null &&
        typeof error === "object" &&
        isConflictPrismaError(error) &&
        attempt === 0
      ) {
        continue;
      }
      throw error;
    }
  }

  throw new ConflictError("Concurrent session creation conflict");
}

export async function POST(request: NextRequest) {
  const auth = await requireCoachScope(request);
  if ("response" in auth) {
    return auth.response;
  }

  let body: CreateSessionBody;
  try {
    body = (await request.json()) as CreateSessionBody;
  } catch {
    return jsonNoStore({ error: "Invalid JSON body" }, { status: 422 });
  }

  const parsed = parseCreateSessionBody(body);
  if (parsed.errors.length > 0 || !parsed.engagementId || !parsed.status || parsed.occurredAt === "invalid") {
    return jsonNoStore(
      {
        error: parsed.errors.join("; "),
      },
      { status: 422 }
    );
  }

  try {
    const created = await createSessionWithRetry({
      engagementId: parsed.engagementId,
      occurredAt: parsed.occurredAt,
      topic: parsed.topic,
      outcomes: parsed.outcomes,
      nextSteps: parsed.nextSteps,
      engagementLevel: parsed.engagementLevel,
      actionCommitment: parsed.actionCommitment,
      notes: parsed.notes,
      status: parsed.status,
      organizationCoachId: auth.scope.organizationCoachId,
    });

    return jsonNoStore({ item: mapSessionRow(created) }, { status: 201 });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return jsonNoStore({ error: "Not found" }, { status: 404 });
    }

    if (error instanceof ValidationError) {
      return jsonNoStore({ error: error.messages.join("; ") }, { status: 422 });
    }

    if (
      error instanceof ConflictError ||
      (error instanceof Error && error.message === "CONCURRENT_STATUS_CHANGE")
    ) {
      return jsonNoStore({ error: "Conflict" }, { status: 409 });
    }

    if (error !== null && typeof error === "object" && isConflictPrismaError(error)) {
      return jsonNoStore({ error: "Conflict" }, { status: 409 });
    }

    if (error !== null && typeof error === "object" && isTimeoutPrismaError(error)) {
      return jsonNoStore({ error: "Request timed out, retry" }, { status: 503 });
    }

    console.error("POST /api/coach/sessions failed", error);
    return jsonNoStore({ error: "Failed to create session" }, { status: 500 });
  }
}
