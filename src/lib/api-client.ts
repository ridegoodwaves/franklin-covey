// ---------------------------------------------------------------------------
// Participant Portal API Client
// Typed fetch wrappers for all participant API endpoints.
// All functions return typed responses and normalize errors.
// Auth model: roster-matched email entry (no access codes — de-scoped 2026-02-24d)
// ---------------------------------------------------------------------------

// ─── Shared Types ────────────────────────────────────────────────────────────

export interface ParticipantCoachCard {
  id: string;
  name: string;
  initials: string;
  photo?: string;
  bio: string;
  specialties: string[];
  credentials: string[];
  location: string;
  /** Video intro link — text-only per spec (no thumbnail) */
  videoUrl?: string;
  /** Coach booking URL (Calendly, Acuity, etc.). May be absent in MVP. */
  meetingBookingUrl?: string;
  atCapacity: boolean;
  remainingCapacity: number;
  yearsExperience: number;
  /** Client testimonial quotes for the bio modal. */
  quotes: Array<{ quote: string; attribution?: string }>;
}

// ─── Request / Response Contracts ────────────────────────────────────────────

// POST /api/participant/auth/verify-email  ← PRIMARY AUTH (Slice 1)
// Roster-matched email entry — no access code (de-scoped 2026-02-24d per Kari confirmation)
export interface VerifyEmailInput {
  email: string;
}
export type VerifyEmailErrorCode =
  | "UNRECOGNIZED_EMAIL" // Email not found in participant roster
  | "WINDOW_CLOSED"      // Cohort selection window has closed
  | "RATE_LIMITED";      // Too many attempts

export interface VerifyEmailResponse {
  success: boolean;
  /** True when participant has already selected a coach. */
  alreadySelected?: boolean;
  error?: VerifyEmailErrorCode;
}

// GET /api/participant/coaches
export interface CoachesResponse {
  coaches: ParticipantCoachCard[];
  /** True when every coach in this participant's pool is at capacity. */
  allAtCapacity: boolean;
}

// POST /api/participant/coaches/remix
export interface RemixResponse {
  coaches: ParticipantCoachCard[];
  /** True when the pool is exhausted and coaches may overlap with prior batch. */
  poolExhausted: boolean;
}

// POST /api/participant/coaches/select
export interface SelectCoachInput {
  coachId: string;
}
export type SelectCoachErrorCode =
  | "CAPACITY_FULL"    // Coach filled between render and submit
  | "ALREADY_SELECTED" // Participant already has a coach (idempotency guard)
  | "INVALID_SESSION"  // Session expired mid-flow
  | "WINDOW_CLOSED";   // Selection window closed after session creation

export interface SelectCoachResponse {
  success: boolean;
  /** Present on success — the confirmed coach record. */
  coach?: ParticipantCoachCard;
  bookingUrl?: string;
  error?: SelectCoachErrorCode;
}

// ─── API Error Wrapper ────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status?: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

// ─── Core Fetch Helper ────────────────────────────────────────────────────────

async function apiFetch<T>(
  method: "GET" | "POST",
  path: string,
  body?: unknown
): Promise<T> {
  const res = await fetch(path, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    credentials: "same-origin",
  });

  if (!res.ok) {
    let code = "UNKNOWN_ERROR";
    try {
      const json = await res.json();
      code = json?.error ?? code;
    } catch {
      // ignore parse error
    }
    throw new ApiError(code, `API error ${res.status} on ${path}`, res.status);
  }

  return res.json() as Promise<T>;
}

// ─── Endpoint Functions ───────────────────────────────────────────────────────

/**
 * POST /api/participant/auth/verify-email
 * PRIMARY AUTH for Slice 1. Roster-matched email entry — no access code.
 * On success: sets participant session. Returns alreadySelected if coach already chosen.
 * Decision: access codes de-scoped 2026-02-24d (USPS group-email workflow + FC sender restrictions).
 */
export async function verifyParticipantEmail(
  input: VerifyEmailInput
): Promise<VerifyEmailResponse> {
  try {
    return await apiFetch<VerifyEmailResponse>("POST", "/api/participant/auth/verify-email", input);
  } catch (error) {
    if (error instanceof ApiError) {
      if (
        error.code === "UNRECOGNIZED_EMAIL" ||
        error.code === "WINDOW_CLOSED" ||
        error.code === "RATE_LIMITED"
      ) {
        return { success: false, error: error.code };
      }
    }
    throw error;
  }
}

/**
 * GET /api/participant/coaches
 */
export async function fetchCoaches(): Promise<CoachesResponse> {
  return apiFetch<CoachesResponse>("GET", "/api/participant/coaches");
}

/**
 * POST /api/participant/coaches/remix
 */
export async function remixCoaches(): Promise<RemixResponse> {
  return apiFetch<RemixResponse>("POST", "/api/participant/coaches/remix");
}

/**
 * POST /api/participant/coaches/select
 */
export async function selectCoach(
  input: SelectCoachInput
): Promise<SelectCoachResponse> {
  try {
    return await apiFetch<SelectCoachResponse>("POST", "/api/participant/coaches/select", input);
  } catch (error) {
    if (error instanceof ApiError) {
      if (
        error.code === "CAPACITY_FULL" ||
        error.code === "ALREADY_SELECTED" ||
        error.code === "INVALID_SESSION" ||
        error.code === "WINDOW_CLOSED"
      ) {
        return { success: false, error: error.code };
      }
    }
    throw error;
  }
}
