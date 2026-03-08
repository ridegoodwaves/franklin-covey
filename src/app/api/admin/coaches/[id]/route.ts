import { EngagementStatus, UserRole } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { resolveAdminOrgScope } from "@/lib/server/admin-scope";
import { readPortalSession } from "@/lib/server/session";

interface UpdateCoachPayload {
  maxEngagements?: number;
  active?: boolean;
  updatedAt?: string;
}

function isValidMaxEngagements(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0;
}

function toUtilizationPct(current: number, max: number): number {
  if (max <= 0) return 0;
  return Math.round((current / max) * 1000) / 10;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const session = readPortalSession(request);
  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Invalid coach id" }, { status: 400 });
  }

  let payload: UpdateCoachPayload;
  try {
    payload = (await request.json()) as UpdateCoachPayload;
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (
    !isValidMaxEngagements(payload.maxEngagements) ||
    typeof payload.active !== "boolean" ||
    typeof payload.updatedAt !== "string"
  ) {
    return NextResponse.json(
      { error: "Expected maxEngagements (integer), active (boolean), and updatedAt (ISO string)" },
      { status: 400 }
    );
  }

  const clientUpdatedAt = new Date(payload.updatedAt);
  if (Number.isNaN(clientUpdatedAt.getTime())) {
    return NextResponse.json({ error: "Invalid updatedAt timestamp" }, { status: 400 });
  }

  try {
    const scopeOrgId = await resolveAdminOrgScope(session);

    const updated = await prisma.organizationCoach.updateMany({
      where: {
        id,
        organizationId: scopeOrgId,
        updatedAt: clientUpdatedAt,
        archivedAt: null,
      },
      data: {
        maxEngagements: payload.maxEngagements,
        active: payload.active,
      },
    });

    if (updated.count === 0) {
      return NextResponse.json(
        { error: "Conflict - coach was updated by another admin" },
        { status: 409 }
      );
    }

    const row = await prisma.organizationCoach.findFirst({
      where: {
        id,
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
    });

    if (!row) {
      return NextResponse.json({ error: "Coach not found" }, { status: 404 });
    }

    const current = row._count.engagements;

    return NextResponse.json({
      item: {
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
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to update coach";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
