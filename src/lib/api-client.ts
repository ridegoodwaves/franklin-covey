// ---------------------------------------------------------------------------
// Participant Portal API Client
// Typed fetch wrappers for all participant API endpoints.
// All functions return typed responses and normalize errors.
// TODO: Replace stub implementations with real fetch calls once
//       backend endpoints are live at /api/participant/...
//
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
  | "INVALID_SESSION"; // Session expired mid-flow

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
  // TODO: uncomment when backend is live
  // return apiFetch<VerifyEmailResponse>("POST", "/api/participant/auth/verify-email", input);

  // ── Stub: any email not in the rejection list = success ──
  // QA trigger values:
  //   unknown@test.com        → UNRECOGNIZED_EMAIL
  //   closed@test.com         → WINDOW_CLOSED
  //   ratelimited@test.com    → RATE_LIMITED
  //   already@test.com        → success + alreadySelected: true
  //   any other email         → success
  await delay(800);
  const normalizedEmail = input.email.toLowerCase().trim();
  if (normalizedEmail === "unknown@test.com") {
    return { success: false, error: "UNRECOGNIZED_EMAIL" };
  }
  if (normalizedEmail === "closed@test.com") {
    return { success: false, error: "WINDOW_CLOSED" };
  }
  if (normalizedEmail === "ratelimited@test.com") {
    return { success: false, error: "RATE_LIMITED" };
  }
  if (normalizedEmail === "already@test.com") {
    return { success: true, alreadySelected: true };
  }
  return { success: true };
}

/**
 * GET /api/participant/coaches
 */
export async function fetchCoaches(): Promise<CoachesResponse> {
  // TODO: uncomment when backend is live
  // return apiFetch<CoachesResponse>("GET", "/api/participant/coaches");
  await delay(600);
  return { coaches: [], allAtCapacity: false };
}

/**
 * POST /api/participant/coaches/remix
 */
export async function remixCoaches(): Promise<RemixResponse> {
  // TODO: uncomment when backend is live
  // return apiFetch<RemixResponse>("POST", "/api/participant/coaches/remix");
  await delay(600);
  return { coaches: [], poolExhausted: false };
}

/**
 * POST /api/participant/coaches/select
 */
export async function selectCoach(
  input: SelectCoachInput
): Promise<SelectCoachResponse> {
  // TODO: uncomment when backend is live
  // return apiFetch<SelectCoachResponse>("POST", "/api/participant/coaches/select", input);
  await delay(1000);
  const lastChar = input.coachId.slice(-1);
  const coachIndex = parseInt(lastChar, 10);
  const hasBookingUrl = !isNaN(coachIndex) ? coachIndex % 2 !== 0 : Math.random() > 0.5;
  return {
    success: true,
    bookingUrl: hasBookingUrl ? "https://calendly.com/stub-coach/30min" : undefined,
  };
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
