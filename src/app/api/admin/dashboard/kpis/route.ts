import {
  EngagementStatus,
  ProgramCode,
  UserRole,
  type Prisma,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { buildNeedsAttentionWhere } from "@/lib/needs-attention";
import { resolveAdminOrgScope } from "@/lib/server/admin-scope";
import { readPortalSession } from "@/lib/server/session";
import type { DashboardKpiResponse, ProgramHealthItem } from "@/lib/types/dashboard";

export const dynamic = "force-dynamic";

function toPct(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 1000) / 10;
}

function parseProgramFilter(value: string | null): Prisma.EngagementWhereInput | null {
  const normalized = value?.trim();
  if (!normalized) return null;

  if (Object.values(ProgramCode).includes(normalized as ProgramCode)) {
    return {
      program: {
        code: normalized as ProgramCode,
      },
    };
  }

  return { programId: normalized };
}

export async function GET(request: NextRequest) {
  const session = readPortalSession(request);
  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const programFilter = parseProgramFilter(request.nextUrl.searchParams.get("programId"));

  try {
    const scopeOrgId = await resolveAdminOrgScope(session);
    const where: Prisma.EngagementWhereInput = {
      organizationId: scopeOrgId,
      archivedAt: null,
      ...(programFilter ?? {}),
    };

    const needsAttentionWhere: Prisma.EngagementWhereInput = {
      AND: [
        { organizationId: scopeOrgId, archivedAt: null },
        ...(programFilter ? [programFilter] : []),
        buildNeedsAttentionWhere(),
      ],
    };

    const [statusGroups, needsAttention, programStatusGroups] = await Promise.all([
      prisma.engagement.groupBy({
        by: ["status"],
        where,
        _count: { _all: true },
      }),
      prisma.engagement.count({
        where: needsAttentionWhere,
      }),
      prisma.engagement.groupBy({
        by: ["programId", "status"],
        where,
        _count: { _all: true },
      }),
    ]);

    const counts = {
      invited: 0,
      coachSelected: 0,
      inProgress: 0,
      onHold: 0,
      completed: 0,
      canceled: 0,
    };

    for (const group of statusGroups) {
      const count = group._count._all;
      switch (group.status) {
        case EngagementStatus.INVITED:
          counts.invited = count;
          break;
        case EngagementStatus.COACH_SELECTED:
          counts.coachSelected = count;
          break;
        case EngagementStatus.IN_PROGRESS:
          counts.inProgress = count;
          break;
        case EngagementStatus.ON_HOLD:
          counts.onHold = count;
          break;
        case EngagementStatus.COMPLETED:
          counts.completed = count;
          break;
        case EngagementStatus.CANCELED:
          counts.canceled = count;
          break;
        default:
          break;
      }
    }

    const total =
      counts.invited +
      counts.coachSelected +
      counts.inProgress +
      counts.onHold +
      counts.completed +
      counts.canceled;

    const programIds = [...new Set(programStatusGroups.map((group) => group.programId))];
    const programs = await prisma.program.findMany({
      where: { id: { in: programIds } },
      select: { id: true, code: true },
    });

    const programCodeById = new Map(programs.map((program) => [program.id, program.code]));
    const programAccumulator = new Map<string, { total: number; completed: number }>();

    for (const group of programStatusGroups) {
      const record = programAccumulator.get(group.programId) ?? { total: 0, completed: 0 };
      record.total += group._count._all;
      if (group.status === EngagementStatus.COMPLETED) {
        record.completed += group._count._all;
      }
      programAccumulator.set(group.programId, record);
    }

    const programBreakdown: ProgramHealthItem[] = [...programAccumulator.entries()]
      .map(([programIdValue, aggregate]) => {
        const code = programCodeById.get(programIdValue);
        if (!code) return null;
        return {
          programCode: code,
          total: aggregate.total,
          completed: aggregate.completed,
          completionRate: toPct(aggregate.completed, aggregate.total),
        };
      })
      .filter((entry): entry is ProgramHealthItem => entry !== null)
      .sort((a, b) => a.programCode.localeCompare(b.programCode));

    const response: DashboardKpiResponse = {
      total,
      invited: counts.invited,
      coachSelected: counts.coachSelected,
      inProgress: counts.inProgress,
      onHold: counts.onHold,
      completed: counts.completed,
      canceled: counts.canceled,
      needsAttention,
      completionRate: toPct(counts.completed, total),
      programBreakdown,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/admin/dashboard/kpis failed", error);
    return NextResponse.json({ error: "Failed to load KPI data" }, { status: 500 });
  }
}
