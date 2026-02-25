import { NextRequest, NextResponse } from "next/server";
import { consumeRateLimit, getRequestIpAddress } from "@/lib/server/rate-limit";
import { consumeParticipantEmailRateLimit } from "@/lib/server/security-guards";
import { lookupParticipantForEmailAuth, normalizeParticipantEmail } from "@/lib/server/participant-coach-service";
import { clearParticipantSession, writeParticipantSession } from "@/lib/server/session";

const MAX_REQUESTS_PER_HOUR = 10;
const MAX_REQUESTS_PER_HOUR_PER_EMAIL = 10;
const WINDOW_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  let email = "";

  try {
    const body = (await request.json()) as { email?: string };
    email = normalizeParticipantEmail(body.email || "");
  } catch {
    return NextResponse.json({ success: false, error: "UNRECOGNIZED_EMAIL" });
  }

  if (!email) {
    return NextResponse.json({ success: false, error: "UNRECOGNIZED_EMAIL" });
  }

  try {
    const ip = getRequestIpAddress(request.headers);
    const rateLimit = consumeRateLimit({
      key: `participant-verify-email:${ip}`,
      maxRequests: MAX_REQUESTS_PER_HOUR,
      windowMs: WINDOW_MS,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "RATE_LIMITED" },
        {
          status: 429,
          headers: {
            "Retry-After": String(rateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const emailRateLimit = await consumeParticipantEmailRateLimit({
      email,
      maxRequests: MAX_REQUESTS_PER_HOUR_PER_EMAIL,
      windowMs: WINDOW_MS,
      ipAddress: ip,
      userAgent: request.headers.get("user-agent") || undefined,
    });

    if (!emailRateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: "RATE_LIMITED" },
        {
          status: 429,
          headers: {
            "Retry-After": String(emailRateLimit.retryAfterSeconds),
          },
        }
      );
    }

    const match = await lookupParticipantForEmailAuth(email);
    if (!match) {
      const response = NextResponse.json({ success: false, error: "UNRECOGNIZED_EMAIL" });
      clearParticipantSession(response);
      return response;
    }

    if (match.selectionWindowClosed) {
      const response = NextResponse.json({ success: false, error: "WINDOW_CLOSED" });
      clearParticipantSession(response);
      return response;
    }

    const response = NextResponse.json({
      success: true,
      alreadySelected: match.alreadySelected,
    });

    writeParticipantSession(response, {
      participantId: match.participantId,
      engagementId: match.engagementId,
      organizationId: match.organizationId,
      cohortId: match.cohortId,
      email: match.email,
      shownCoachIds: [],
      remixUsed: false,
    });

    return response;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error("[verify-email] Unhandled error", message);
    return NextResponse.json(
      { success: false, error: "SERVER_ERROR" },
      { status: 500 }
    );
  }
}
