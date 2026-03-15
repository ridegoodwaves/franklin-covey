import { EngagementStatus } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCoachNeedsAttentionEngagements } from "@/lib/needs-attention";
import type { CoachDashboardResponse } from "@/lib/types/coach";
import { jsonNoStore, requireCoachScope } from "@/app/api/coach/_shared";

export const dynamic = "force-dynamic";

function toPct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export async function GET(request: NextRequest) {
  const auth = await requireCoachScope(request);
  if ("response" in auth) {
    return auth.response;
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  try {
    const [statusCounts, sessionsThisWeek, needsAttention, coachProfile] = await Promise.all([
      prisma.engagement.groupBy({
        by: ["status"],
        where: {
          organizationCoachId: auth.scope.organizationCoachId,
          archivedAt: null,
        },
        _count: {
          _all: true,
        },
      }),
      prisma.session.count({
        where: {
          archivedAt: null,
          occurredAt: {
            gte: sevenDaysAgo,
          },
          engagement: {
            organizationCoachId: auth.scope.organizationCoachId,
            archivedAt: null,
          },
        },
      }),
      getCoachNeedsAttentionEngagements({
        organizationId: auth.scope.organizationId,
        organizationCoachId: auth.scope.organizationCoachId,
      }),
      prisma.coachProfile.findUnique({
        where: {
          id: auth.scope.coachProfileId,
        },
        select: {
          displayName: true,
        },
      }),
    ]);

    let activeCount = 0;
    let completedCount = 0;
    for (const group of statusCounts) {
      if (
        group.status === EngagementStatus.COACH_SELECTED ||
        group.status === EngagementStatus.IN_PROGRESS ||
        group.status === EngagementStatus.ON_HOLD
      ) {
        activeCount += group._count._all;
      }
      if (group.status === EngagementStatus.COMPLETED) {
        completedCount += group._count._all;
      }
    }

    const response: CoachDashboardResponse = {
      activeCount,
      completedCount,
      sessionsThisWeek,
      completionRate: toPct(completedCount, activeCount + completedCount),
      needsAttention,
      coachName: coachProfile?.displayName || "Coach",
      coachRole: "Coach",
    };

    return jsonNoStore(response);
  } catch (error) {
    console.error("GET /api/coach/dashboard failed", error);
    return jsonNoStore({ error: "Failed to load dashboard" }, { status: 500 });
  }
}
