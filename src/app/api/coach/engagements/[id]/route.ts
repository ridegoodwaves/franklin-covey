import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import type { CoachEngagementDetail } from "@/lib/types/coach";
import { jsonNoStore, requireCoachScope } from "@/app/api/coach/_shared";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireCoachScope(request);
  if ("response" in auth) {
    return auth.response;
  }

  const { id: engagementId } = await context.params;
  if (!engagementId?.trim()) {
    return jsonNoStore({ error: "Invalid engagement id" }, { status: 422 });
  }

  try {
    const engagement = await prisma.engagement.findFirst({
      where: {
        id: engagementId,
        organizationCoachId: auth.scope.organizationCoachId,
        archivedAt: null,
      },
      select: {
        id: true,
        status: true,
        totalSessions: true,
        coachSelectedAt: true,
        lastActivityAt: true,
        participant: {
          select: {
            email: true,
          },
        },
        organization: {
          select: {
            name: true,
          },
        },
        cohort: {
          select: {
            code: true,
          },
        },
        program: {
          select: {
            code: true,
            name: true,
            track: true,
          },
        },
        organizationCoach: {
          select: {
            coachProfile: {
              select: {
                bookingLinkPrimary: true,
              },
            },
          },
        },
        _count: {
          select: {
            sessions: {
              where: {
                archivedAt: null,
              },
            },
          },
        },
      },
    });

    if (!engagement) {
      return jsonNoStore({ error: "Not found" }, { status: 404 });
    }

    const item: CoachEngagementDetail = {
      engagementId: engagement.id,
      participantEmail: engagement.participant.email,
      organizationName: engagement.organization.name,
      cohortCode: engagement.cohort.code,
      programCode: engagement.program.code,
      programName: engagement.program.name,
      programTrack: engagement.program.track,
      status: engagement.status,
      totalSessions: engagement.totalSessions,
      sessionsCompleted: engagement._count.sessions,
      coachSelectedAt: engagement.coachSelectedAt
        ? engagement.coachSelectedAt.toISOString()
        : null,
      lastActivityAt: engagement.lastActivityAt
        ? engagement.lastActivityAt.toISOString()
        : null,
      meetingBookingUrl: engagement.organizationCoach?.coachProfile.bookingLinkPrimary ?? null,
    };

    return jsonNoStore({ item });
  } catch (error) {
    console.error("GET /api/coach/engagements/[id] failed", error);
    return jsonNoStore({ error: "Failed to load engagement" }, { status: 500 });
  }
}
