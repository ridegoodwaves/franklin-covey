import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import {
  CAPACITY_COUNT_STATUSES,
  getSessionContext,
  listCoachPool,
  toParticipantCoachCards,
} from "@/lib/server/participant-coach-service";
import { readParticipantSession } from "@/lib/server/session";

interface SelectionResult {
  ok: boolean;
  error?: "CAPACITY_FULL" | "ALREADY_SELECTED" | "INVALID_SESSION" | "WINDOW_CLOSED";
  coachId?: string;
}

export async function POST(request: NextRequest) {
  const participantSession = readParticipantSession(request);
  if (!participantSession) {
    return NextResponse.json({ success: false, error: "INVALID_SESSION" });
  }

  let coachId = "";
  try {
    const body = (await request.json()) as { coachId?: string };
    coachId = String(body.coachId || "").trim();
  } catch {
    return NextResponse.json({ success: false, error: "CAPACITY_FULL" });
  }

  if (!coachId) {
    return NextResponse.json({ success: false, error: "CAPACITY_FULL" });
  }

  try {
    const context = await getSessionContext({
      participantId: participantSession.participantId,
      engagementId: participantSession.engagementId,
      organizationId: participantSession.organizationId,
    });

    if (!context) {
      return NextResponse.json({ success: false, error: "INVALID_SESSION" });
    }

    if (context.cohort.coachSelectionEnd < new Date()) {
      return NextResponse.json({ success: false, error: "WINDOW_CLOSED" });
    }

    const selection = await prisma.$transaction(async (tx): Promise<SelectionResult> => {
      const engagement = await tx.engagement.findFirst({
        where: {
          id: participantSession.engagementId,
          participantId: participantSession.participantId,
          organizationId: participantSession.organizationId,
          archivedAt: null,
        },
        include: {
          program: true,
        },
      });

      if (!engagement) {
        return { ok: false, error: "INVALID_SESSION" };
      }

      if (engagement.status !== "INVITED") {
        return { ok: false, error: "ALREADY_SELECTED" };
      }

      const selectedCoach = await tx.organizationCoach.findFirst({
        where: {
          id: coachId,
          organizationId: engagement.organizationId,
          active: true,
          archivedAt: null,
          poolMemberships: {
            some: {
              pool: engagement.program.pool,
              archivedAt: null,
            },
          },
        },
      });

      if (!selectedCoach) {
        return { ok: false, error: "CAPACITY_FULL" };
      }

      // Non-blocking lock: fail fast on contention instead of waiting and timing out.
      const lockRows = await tx.$queryRaw<Array<{ locked: boolean }>>`
        select pg_try_advisory_xact_lock(hashtext(${selectedCoach.id})) as locked
      `;
      if (!lockRows[0]?.locked) {
        return { ok: false, error: "CAPACITY_FULL" };
      }

      const activeCount = await tx.engagement.count({
        where: {
          organizationCoachId: selectedCoach.id,
          archivedAt: null,
          status: {
            in: CAPACITY_COUNT_STATUSES,
          },
        },
      });

      if (activeCount >= selectedCoach.maxEngagements) {
        return { ok: false, error: "CAPACITY_FULL" };
      }

      const updated = await tx.engagement.updateMany({
        where: {
          id: engagement.id,
          status: "INVITED",
          statusVersion: engagement.statusVersion,
        },
        data: {
          organizationCoachId: selectedCoach.id,
          status: "COACH_SELECTED",
          coachSelectedAt: new Date(),
          lastActivityAt: new Date(),
          statusVersion: {
            increment: 1,
          },
        },
      });

      if (updated.count === 0) {
        const latest = await tx.engagement.findUnique({ where: { id: engagement.id } });
        if (latest && latest.status !== "INVITED") {
          return { ok: false, error: "ALREADY_SELECTED" };
        }
        return { ok: false, error: "INVALID_SESSION" };
      }

      return {
        ok: true,
        coachId: selectedCoach.id,
      };
    });

    if (!selection.ok) {
      return NextResponse.json({ success: false, error: selection.error || "CAPACITY_FULL" });
    }

    const poolCoaches = await listCoachPool({
      organizationId: context.organizationId,
      pool: context.program.pool,
    });

    const selected = poolCoaches.find((coach) => coach.id === selection.coachId);
    if (!selected) {
      return NextResponse.json({ success: true });
    }

    const [coach] = await toParticipantCoachCards([selected], true);

    return NextResponse.json({
      success: true,
      coach,
      bookingUrl: selected.bookingLinkPrimary,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[participant/select] Transaction error", message);
    return NextResponse.json({ success: false, error: "SERVER_ERROR" }, { status: 500 });
  }
}
