import {
  EngagementStatus,
  ProgramCode,
  UserRole,
  type Prisma,
} from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { resolveAdminOrgScope } from "@/lib/server/admin-scope";
import { readPortalSession } from "@/lib/server/session";
import { buildNeedsAttentionWhere } from "@/lib/needs-attention";
import { prisma } from "@/lib/db";
import type {
  AdminEngagementRow,
  AdminEngagementsResponse,
  EngagementSortOption,
  EngagementTab,
} from "@/lib/types/dashboard";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 10;
const DAY_MS = 24 * 60 * 60 * 1000;

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

function parseTab(value: string | null): EngagementTab {
  return value === "needs_attention" ? "needs_attention" : "all";
}

function parseSort(value: string | null): EngagementSortOption {
  if (value === "status" || value === "coach") return value;
  return "days_desc";
}

function parseStatus(value: string | null): EngagementStatus | null {
  if (!value) return null;
  return Object.values(EngagementStatus).includes(value as EngagementStatus)
    ? (value as EngagementStatus)
    : null;
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

function daysSinceActivity(lastActivityAt: Date | null, now: Date): number | null {
  if (!lastActivityAt) return null;
  return Math.max(0, Math.floor((now.getTime() - lastActivityAt.getTime()) / DAY_MS));
}

function toOrderBy(sort: EngagementSortOption): Prisma.EngagementOrderByWithRelationInput[] {
  if (sort === "status") {
    return [
      { status: "asc" },
      { participant: { email: "asc" } },
    ];
  }

  if (sort === "coach") {
    return [
      { organizationCoach: { coachProfile: { displayName: "asc" } } },
      { participant: { email: "asc" } },
    ];
  }

  return [
    { lastActivityAt: { sort: "asc", nulls: "last" } },
    { participant: { email: "asc" } },
  ];
}

export async function GET(request: NextRequest) {
  const session = readPortalSession(request);
  if (!session || session.role !== UserRole.ADMIN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const statusFilter = parseStatus(request.nextUrl.searchParams.get("status"));
  const coachId = request.nextUrl.searchParams.get("coachId")?.trim() || undefined;
  const rawProgramFilter = request.nextUrl.searchParams.get("programId");
  const programFilter = parseProgramFilter(rawProgramFilter);
  const search = request.nextUrl.searchParams.get("search")?.trim() || undefined;
  const page = parsePage(request.nextUrl.searchParams.get("page"));
  const sort = parseSort(request.nextUrl.searchParams.get("sort"));
  const tab = parseTab(request.nextUrl.searchParams.get("tab"));

  try {
    const scopeOrgId = await resolveAdminOrgScope(session);
    const now = new Date();

    const whereClauses: Prisma.EngagementWhereInput[] = [
      { organizationId: scopeOrgId, archivedAt: null },
    ];

    if (statusFilter) {
      whereClauses.push({ status: statusFilter });
    }

    if (coachId) {
      whereClauses.push({ organizationCoachId: coachId });
    }

    if (programFilter) {
      whereClauses.push(programFilter);
    }

    if (search) {
      whereClauses.push({
        participant: {
          email: {
            contains: search,
            mode: "insensitive",
          },
        },
      });
    }

    if (tab === "needs_attention") {
      whereClauses.push(buildNeedsAttentionWhere(now));
    }

    const where: Prisma.EngagementWhereInput = { AND: whereClauses };

    const totalItems = await prisma.engagement.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const boundedPage = Math.min(page, totalPages);
    const rows = await prisma.engagement.findMany({
      where,
      orderBy: toOrderBy(sort),
      skip: (boundedPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        totalSessions: true,
        coachSelectedAt: true,
        lastActivityAt: true,
        organizationCoachId: true,
        participant: {
          select: {
            email: true,
          },
        },
        program: {
          select: {
            code: true,
          },
        },
        cohort: { select: { code: true } },
        organizationCoach: {
          select: {
            id: true,
            coachProfile: {
              select: {
                displayName: true,
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

    const rowIds = rows.map((row) => row.id);
    const needsAttentionIds = tab === "needs_attention" || rowIds.length === 0
      ? new Set<string>(rowIds)
      : new Set(
          (
            await prisma.engagement.findMany({
              where: {
                AND: [
                  { id: { in: rowIds } },
                  { organizationId: scopeOrgId, archivedAt: null },
                  ...(programFilter ? [programFilter] : []),
                  buildNeedsAttentionWhere(now),
                ],
              },
              select: { id: true },
            })
          ).map((row) => row.id)
        );

    const items: AdminEngagementRow[] = rows.map((row) => {
      const sessionsCompleted = row._count.sessions;
      const mapped: AdminEngagementRow = {
        engagementId: row.id,
        participantEmail: row.participant.email,
        coachName: row.organizationCoach?.coachProfile.displayName || null,
        coachId: row.organizationCoach?.id || row.organizationCoachId || null,
        cohortCode: row.cohort.code,
        programCode: row.program.code,
        status: row.status,
        sessionsCompleted,
        totalSessions: row.totalSessions,
        coachSelectedAt: row.coachSelectedAt,
        lastActivityAt: row.lastActivityAt,
        daysSinceActivity: daysSinceActivity(row.lastActivityAt, now),
        needsAttention: needsAttentionIds.has(row.id),
      };

      return mapped;
    });

    const response: AdminEngagementsResponse = {
      items,
      page: boundedPage,
      pageSize: PAGE_SIZE,
      totalItems,
      totalPages,
      tab,
      sort,
    };

    return NextResponse.json(response, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("GET /api/admin/engagements failed", error);
    return NextResponse.json({ error: "Failed to load engagements" }, { status: 500 });
  }
}
