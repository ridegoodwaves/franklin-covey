import type { ProgramCode, SessionStatus } from "@prisma/client";
import { DURATION_OPTIONS, SESSION_OUTCOMES, isValidTopicForProgram } from "@/lib/config";

const MIN_OCCURRED_AT = new Date("2026-01-01T00:00:00.000Z");
const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g;

function isDateValid(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function validateOccurredAt(occurredAt: Date): string | null {
  if (!isDateValid(occurredAt)) return "occurredAt must be a valid ISO date";
  if (occurredAt.getTime() > Date.now()) return "occurredAt cannot be in the future";
  if (occurredAt.getTime() < MIN_OCCURRED_AT.getTime()) {
    return "occurredAt must be on or after 2026-01-01";
  }
  return null;
}

export function sanitizePrivateNotes(input: string | null): string | null {
  if (input === null) return null;
  const cleaned = input.replace(CONTROL_CHARS_REGEX, "").trim();
  if (!cleaned) return null;
  return cleaned.slice(0, 5000);
}

export interface SessionCreateValidationInput {
  status: SessionStatus;
  programCode: ProgramCode;
  occurredAt: Date | null;
  topic: string | null;
  outcome: string | null;
  durationMinutes: number | null;
  privateNotes: string | null;
}

export interface SessionCreateValidationResult {
  errors: string[];
  values: {
    occurredAt: Date | null;
    topic: string | null;
    outcome: string | null;
    durationMinutes: number | null;
    privateNotes: string | null;
  };
}

export function validateSessionCreateInput(
  input: SessionCreateValidationInput
): SessionCreateValidationResult {
  const errors: string[] = [];
  const isForfeited =
    input.status === "FORFEITED_CANCELLED" || input.status === "FORFEITED_NOT_USED";

  const privateNotes = sanitizePrivateNotes(input.privateNotes);

  if (isForfeited) {
    if (input.occurredAt) {
      const occurredAtError = validateOccurredAt(input.occurredAt);
      if (occurredAtError) errors.push(occurredAtError);
    }

    return {
      errors,
      values: {
        occurredAt: input.occurredAt,
        topic: null,
        outcome: null,
        durationMinutes: null,
        privateNotes,
      },
    };
  }

  if (!input.occurredAt) {
    errors.push("occurredAt is required for completed sessions");
  } else {
    const occurredAtError = validateOccurredAt(input.occurredAt);
    if (occurredAtError) errors.push(occurredAtError);
  }

  if (!input.topic) {
    errors.push("topic is required for completed sessions");
  } else if (!isValidTopicForProgram(input.programCode, input.topic)) {
    errors.push("topic is not valid for this program");
  }

  if (!input.outcome) {
    errors.push("outcome is required for completed sessions");
  } else if (!(SESSION_OUTCOMES as readonly string[]).includes(input.outcome)) {
    errors.push("outcome is not valid");
  }

  if (input.durationMinutes === null) {
    errors.push("durationMinutes is required for completed sessions");
  } else if (!(DURATION_OPTIONS as readonly number[]).includes(input.durationMinutes)) {
    errors.push("durationMinutes is not valid");
  }

  return {
    errors,
    values: {
      occurredAt: input.occurredAt,
      topic: input.topic,
      outcome: input.outcome,
      durationMinutes: input.durationMinutes,
      privateNotes,
    },
  };
}

export interface SessionPatchValidationInput {
  status: SessionStatus;
  programCode: ProgramCode;
  occurredAt?: Date | null;
  topic?: string | null;
  outcome?: string | null;
  durationMinutes?: number | null;
  privateNotes?: string | null;
}

export interface SessionPatchValidationResult {
  errors: string[];
  values: {
    occurredAt?: Date | null;
    topic?: string | null;
    outcome?: string | null;
    durationMinutes?: number | null;
    privateNotes?: string | null;
  };
}

export function validateSessionPatchInput(
  input: SessionPatchValidationInput
): SessionPatchValidationResult {
  const errors: string[] = [];
  const values: SessionPatchValidationResult["values"] = {};
  const isForfeited =
    input.status === "FORFEITED_CANCELLED" || input.status === "FORFEITED_NOT_USED";

  if (input.occurredAt !== undefined) {
    if (input.occurredAt !== null) {
      const occurredAtError = validateOccurredAt(input.occurredAt);
      if (occurredAtError) errors.push(occurredAtError);
    }
    values.occurredAt = input.occurredAt;
  }

  if (input.topic !== undefined) {
    if (isForfeited && input.topic !== null) {
      errors.push("topic must be null for forfeited sessions");
    } else if (!isForfeited) {
      if (!input.topic) {
        errors.push("topic cannot be null or empty for completed sessions");
      } else if (!isValidTopicForProgram(input.programCode, input.topic)) {
        errors.push("topic is not valid for this program");
      }
    }
    values.topic = input.topic;
  }

  if (input.outcome !== undefined) {
    if (isForfeited && input.outcome !== null) {
      errors.push("outcome must be null for forfeited sessions");
    } else if (!isForfeited) {
      if (!input.outcome) {
        errors.push("outcome cannot be null or empty for completed sessions");
      } else if (!(SESSION_OUTCOMES as readonly string[]).includes(input.outcome)) {
        errors.push("outcome is not valid");
      }
    }
    values.outcome = input.outcome;
  }

  if (input.durationMinutes !== undefined) {
    if (isForfeited && input.durationMinutes !== null) {
      errors.push("durationMinutes must be null for forfeited sessions");
    } else if (!isForfeited) {
      if (input.durationMinutes === null) {
        errors.push("durationMinutes cannot be null for completed sessions");
      } else if (!(DURATION_OPTIONS as readonly number[]).includes(input.durationMinutes)) {
        errors.push("durationMinutes is not valid");
      }
    }
    values.durationMinutes = input.durationMinutes;
  }

  if (input.privateNotes !== undefined) {
    values.privateNotes = sanitizePrivateNotes(input.privateNotes);
  }

  return { errors, values };
}
