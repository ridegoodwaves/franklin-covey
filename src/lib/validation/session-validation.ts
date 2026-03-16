import type { ProgramCode, SessionStatus } from "@prisma/client";
import {
  ACTION_COMMITMENT_OPTIONS,
  NEXT_STEPS_OPTIONS,
  SESSION_OUTCOMES,
  isValidTopicForProgram,
} from "@/lib/config";

const MIN_OCCURRED_AT = new Date("2026-01-01T00:00:00.000Z");
const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g;

function isDateValid(value: Date): boolean {
  return Number.isFinite(value.getTime());
}

function isForfeitedStatus(status: SessionStatus): boolean {
  return status === "FORFEITED_CANCELLED" || status === "FORFEITED_NOT_USED";
}

function validateOccurredAt(occurredAt: Date): string | null {
  if (!isDateValid(occurredAt)) return "occurredAt must be a valid ISO date";
  if (occurredAt.getTime() > Date.now()) return "occurredAt cannot be in the future";
  if (occurredAt.getTime() < MIN_OCCURRED_AT.getTime()) {
    return "occurredAt must be on or after 2026-01-01";
  }
  return null;
}

function isValidEngagementLevel(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

function validateOutcomes(outcomes: string[]): string[] {
  const errors: string[] = [];

  if (outcomes.length === 0) {
    errors.push("outcomes is required for completed sessions");
    return errors;
  }

  if (new Set(outcomes).size !== outcomes.length) {
    errors.push("outcomes cannot contain duplicate values");
  }

  const invalid = outcomes.filter((outcome) => !(SESSION_OUTCOMES as readonly string[]).includes(outcome));
  if (invalid.length > 0) {
    errors.push("outcomes contains invalid values");
  }

  return errors;
}

export function sanitizeNotes(input: string | null): string | null {
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
  outcomes: string[] | null;
  nextSteps: string | null;
  engagementLevel: number | null;
  actionCommitment: string | null;
  notes: string | null;
}

export interface SessionCreateValidationResult {
  errors: string[];
  values: {
    occurredAt: Date | null;
    topic: string | null;
    outcomes: string[] | null;
    nextSteps: string | null;
    engagementLevel: number | null;
    actionCommitment: string | null;
    notes: string | null;
  };
}

export function validateSessionCreateInput(
  input: SessionCreateValidationInput
): SessionCreateValidationResult {
  const errors: string[] = [];
  const isForfeited = isForfeitedStatus(input.status);
  const notes = sanitizeNotes(input.notes);

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
        outcomes: null,
        nextSteps: null,
        engagementLevel: null,
        actionCommitment: null,
        notes,
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

  if (!input.outcomes) {
    errors.push("outcomes is required for completed sessions");
  } else {
    errors.push(...validateOutcomes(input.outcomes));
  }

  if (!input.nextSteps) {
    errors.push("nextSteps is required for completed sessions");
  } else if (!(NEXT_STEPS_OPTIONS as readonly string[]).includes(input.nextSteps)) {
    errors.push("nextSteps is not valid");
  }

  if (input.engagementLevel === null) {
    errors.push("engagementLevel is required for completed sessions");
  } else if (!isValidEngagementLevel(input.engagementLevel)) {
    errors.push("engagementLevel is not valid");
  }

  if (!input.actionCommitment) {
    errors.push("actionCommitment is required for completed sessions");
  } else if (!(ACTION_COMMITMENT_OPTIONS as readonly string[]).includes(input.actionCommitment)) {
    errors.push("actionCommitment is not valid");
  }

  return {
    errors,
    values: {
      occurredAt: input.occurredAt,
      topic: input.topic,
      outcomes: input.outcomes,
      nextSteps: input.nextSteps,
      engagementLevel: input.engagementLevel,
      actionCommitment: input.actionCommitment,
      notes,
    },
  };
}

export interface SessionPatchValidationInput {
  status: SessionStatus;
  programCode: ProgramCode;
  occurredAt?: Date | null;
  topic?: string | null;
  outcomes?: string[] | null;
  nextSteps?: string | null;
  engagementLevel?: number | null;
  actionCommitment?: string | null;
  notes?: string | null;
}

export interface SessionPatchValidationResult {
  errors: string[];
  values: {
    occurredAt?: Date | null;
    topic?: string | null;
    outcomes?: string[] | null;
    nextSteps?: string | null;
    engagementLevel?: number | null;
    actionCommitment?: string | null;
    notes?: string | null;
  };
}

export function validateSessionPatchInput(
  input: SessionPatchValidationInput
): SessionPatchValidationResult {
  const errors: string[] = [];
  const values: SessionPatchValidationResult["values"] = {};
  const isForfeited = isForfeitedStatus(input.status);

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

  if (input.outcomes !== undefined) {
    if (isForfeited && input.outcomes !== null) {
      errors.push("outcomes must be null for forfeited sessions");
    } else if (!isForfeited) {
      if (input.outcomes === null) {
        errors.push("outcomes cannot be null for completed sessions");
      } else {
        errors.push(...validateOutcomes(input.outcomes));
      }
    }
    values.outcomes = input.outcomes;
  }

  if (input.nextSteps !== undefined) {
    if (isForfeited && input.nextSteps !== null) {
      errors.push("nextSteps must be null for forfeited sessions");
    } else if (!isForfeited) {
      if (!input.nextSteps) {
        errors.push("nextSteps cannot be null or empty for completed sessions");
      } else if (!(NEXT_STEPS_OPTIONS as readonly string[]).includes(input.nextSteps)) {
        errors.push("nextSteps is not valid");
      }
    }
    values.nextSteps = input.nextSteps;
  }

  if (input.engagementLevel !== undefined) {
    if (isForfeited && input.engagementLevel !== null) {
      errors.push("engagementLevel must be null for forfeited sessions");
    } else if (!isForfeited) {
      if (input.engagementLevel === null) {
        errors.push("engagementLevel cannot be null for completed sessions");
      } else if (!isValidEngagementLevel(input.engagementLevel)) {
        errors.push("engagementLevel is not valid");
      }
    }
    values.engagementLevel = input.engagementLevel;
  }

  if (input.actionCommitment !== undefined) {
    if (isForfeited && input.actionCommitment !== null) {
      errors.push("actionCommitment must be null for forfeited sessions");
    } else if (!isForfeited) {
      if (!input.actionCommitment) {
        errors.push("actionCommitment cannot be null or empty for completed sessions");
      } else if (!(ACTION_COMMITMENT_OPTIONS as readonly string[]).includes(input.actionCommitment)) {
        errors.push("actionCommitment is not valid");
      }
    }
    values.actionCommitment = input.actionCommitment;
  }

  if (input.notes !== undefined) {
    values.notes = sanitizeNotes(input.notes);
  }

  return { errors, values };
}
