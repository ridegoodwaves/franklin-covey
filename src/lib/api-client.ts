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

// POST /api/participant/auth/request-otp
export interface RequestOtpInput {
  email: string;
}
export type RequestOtpErrorCode =
  | "EMAIL_NOT_FOUND"   // Email not in participant list
  | "WINDOW_CLOSED"     // Cohort selection window has passed
  | "RATE_LIMITED";     // Too many OTP requests

export interface RequestOtpResponse {
  success: boolean;
  error?: RequestOtpErrorCode;
}

// POST /api/participant/auth/verify-otp
export interface VerifyOtpInput {
  email: string;
  otp: string;
}
export type VerifyOtpErrorCode =
  | "INVALID_OTP"      // Wrong code
  | "EXPIRED_OTP"      // Code older than 10 minutes
  | "MAX_ATTEMPTS";    // Too many wrong attempts — must re-request

export interface VerifyOtpResponse {
  success: boolean;
  /** True when this participant has already selected a coach. */
  alreadySelected?: boolean;
  error?: VerifyOtpErrorCode;
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
  /**
   * The coach's booking URL. May be absent even on success.
   * When absent, UI must show the coach-outreach fallback message.
   * Per policy: "Your coach will reach out within 2 business days."
   */
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
 * POST /api/participant/auth/request-otp
 * Sends a 6-digit OTP to the participant's email.
 */
export async function requestOtp(
  input: RequestOtpInput
): Promise<RequestOtpResponse> {
  // TODO: uncomment when backend is live
  // return apiFetch<RequestOtpResponse>("POST", "/api/participant/auth/request-otp", input);

  // ── Stub: simulates network call ──
  await delay(800);
  if (input.email.toLowerCase() === "unknown@test.com") {
    return { success: false, error: "EMAIL_NOT_FOUND" };
  }
  return { success: true };
}

/**
 * POST /api/participant/auth/verify-otp
 * Verifies the OTP and establishes a participant session.
 */
export async function verifyOtp(
  input: VerifyOtpInput
): Promise<VerifyOtpResponse> {
  // TODO: uncomment when backend is live
  // return apiFetch<VerifyOtpResponse>("POST", "/api/participant/auth/verify-otp", input);

  // ── Stub ──
  await delay(800);
  if (input.otp === "000000") return { success: false, error: "EXPIRED_OTP" };
  if (input.otp === "999999") return { success: false, error: "MAX_ATTEMPTS" };
  if (input.otp !== "123456") return { success: false, error: "INVALID_OTP" };
  return { success: true };
}

/**
 * GET /api/participant/coaches
 * Returns 3 capacity-weighted randomized coaches for this participant's pool.
 */
export async function fetchCoaches(): Promise<CoachesResponse> {
  // TODO: uncomment when backend is live
  // return apiFetch<CoachesResponse>("GET", "/api/participant/coaches");

  // ── Stub: returns empty — UI should fall back to local demo data ──
  await delay(600);
  return { coaches: [], allAtCapacity: false };
}

/**
 * POST /api/participant/coaches/remix
 * Returns 3 entirely new coaches with zero overlap from the prior batch.
 * Only available once per participant.
 */
export async function remixCoaches(): Promise<RemixResponse> {
  // TODO: uncomment when backend is live
  // return apiFetch<RemixResponse>("POST", "/api/participant/coaches/remix");

  // ── Stub ──
  await delay(600);
  return { coaches: [], poolExhausted: false };
}

/**
 * POST /api/participant/coaches/select
 * Finalizes coach selection. Idempotent — safe to call once.
 * Returns bookingUrl when coach has an active scheduling link.
 * When bookingUrl is absent, UI must show outreach fallback message.
 */
export async function selectCoach(
  input: SelectCoachInput
): Promise<SelectCoachResponse> {
  // TODO: uncomment when backend is live
  // return apiFetch<SelectCoachResponse>("POST", "/api/participant/coaches/select", input);

  // ── Stub: alternates between booking-URL and fallback paths for QA coverage ──
  // Odd-indexed coach IDs (c1, c3, c5...) simulate coaches WITH a booking URL.
  // Even-indexed (c2, c4, c6...) simulate coaches WITHOUT — triggering fallback.
  // This lets QA test both confirmation paths without backend.
  await delay(1000);
  const lastChar = input.coachId.slice(-1);
  const coachIndex = parseInt(lastChar, 10);
  const hasBookingUrl = !isNaN(coachIndex) ? coachIndex % 2 !== 0 : Math.random() > 0.5;
  return {
    success: true,
    bookingUrl: hasBookingUrl
      ? "https://calendly.com/stub-coach/30min"
      : undefined,
  };
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
