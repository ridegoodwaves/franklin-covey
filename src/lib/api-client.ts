// ---------------------------------------------------------------------------
// Participant Portal API Client — Sub-agent D
// Typed fetch wrappers for all participant API endpoints.
// All functions return typed responses and normalize errors.
// TODO: Replace stub implementations with real fetch calls once
//       backend endpoints are live at /api/participant/...
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

// POST /api/participant/auth/verify-access-code  ← PRIMARY AUTH (Slice 1)
export interface VerifyAccessCodeInput {
  email: string;
  accessCode: string;
}
export type VerifyAccessCodeErrorCode =
  | "INVALID_CREDENTIALS" // Bad email or bad code — same message for both (enumeration prevention)
  | "WINDOW_CLOSED"       // Cohort selection window has closed
  | "RATE_LIMITED";       // Too many attempts

export interface VerifyAccessCodeResponse {
  success: boolean;
  /** True when participant has already selected a coach. */
  alreadySelected?: boolean;
  error?: VerifyAccessCodeErrorCode;
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
 * POST /api/participant/auth/verify-access-code
 * PRIMARY AUTH for Slice 1. Verifies email + USPS-delivered access code.
 * On success: sets participant session. Returns alreadySelected if coach already chosen.
 * Security: INVALID_CREDENTIALS covers both bad email and bad code to prevent enumeration.
 */
export async function verifyAccessCode(
  input: VerifyAccessCodeInput
): Promise<VerifyAccessCodeResponse> {
  // TODO: uncomment when backend is live
  // return apiFetch<VerifyAccessCodeResponse>("POST", "/api/participant/auth/verify-access-code", input);

  // ── Stub: any valid email + access code "A1B2C3" = success ──
  // Use "CLOSED1" as access code to trigger WINDOW_CLOSED for QA testing.
  await delay(800);
  const normalizedCode = input.accessCode.toUpperCase();
  if (normalizedCode === "CLOSED1") {
    return { success: false, error: "WINDOW_CLOSED" };
  }
  if (normalizedCode === "RATEME1") {
    return { success: false, error: "RATE_LIMITED" };
  }
  if (input.email.toLowerCase() === "already@test.com") {
    return { success: true, alreadySelected: true };
  }
  // Any other email + any non-empty code = success for dev/QA
  if (!input.accessCode.trim()) {
    return { success: false, error: "INVALID_CREDENTIALS" };
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
