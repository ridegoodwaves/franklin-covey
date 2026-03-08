import { EngagementStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAdminOrgScope } from "@/lib/server/admin-scope";
import { readPortalSession } from "@/lib/server/session";
import type { CoachUtilizationItem } from "@/lib/types/dashboard";

export const dynamic = "force-dynamic";

function toUtilizationPct(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((current / max) * 1000) / 10;
}

export async function GET(request: NextRequest) {
  const session = readPortalSession(request);
  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const scopeOrgId = await resolveAdminOrgScope(session);

    const rows = await prisma.organizationCoach.findMany({
      where: {
        organizationId: scopeOrgId,
        archivedAt: null,
      },
      select: {
        id: true,
        active: true,
        maxEngagements: true,
        updatedAt: true,
        coachProfile: {
          select: {
            id: true,
            displayName: true,
            user: {
              select: {
                email: true,
              },
            },
          },
        },
        poolMemberships: {
          where: { archivedAt: null },
          select: {
            pool: true,
          },
        },
        _count: {
          select: {
            engagements: {
              where: {
                archivedAt: null,
                status: {
                  in: [
                    EngagementStatus.COACH_SELECTED,
                    EngagementStatus.IN_PROGRESS,
                    EngagementStatus.ON_HOLD,
                  ],
                },
              },
            },
          },
        },
      },
      orderBy: {
        coachProfile: {
          displayName: "asc",
        },
      },
    });

    const items: CoachUtilizationItem[] = rows.map((row) => {
      const current = row._count.engagements;
      return {
        coachId: row.coachProfile.id,
        organizationCoachId: row.id,
        name: row.coachProfile.displayName,
        email: row.coachProfile.user.email,
        active: row.active,
        pools: row.poolMemberships.map((membership) => membership.pool),
        current,
        max: row.maxEngagements,
        utilizationPct: toUtilizationPct(current, row.maxEngagements),
        updatedAt: row.updatedAt,
      };
    });

    return NextResponse.json(
      { items },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load coaches";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
