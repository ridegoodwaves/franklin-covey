import { EngagementStatus, type Prisma } from "@prisma/client";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getCoachNeedsAttentionEngagements } from "@/lib/needs-attention";
import type { CoachEngagementListItem } from "@/lib/types/coach";
import { jsonNoStore, requireCoachScope } from "@/app/api/coach/_shared";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 20;

type CoachEngagementTab = "active" | "completed";

function parseTab(value: string | null): CoachEngagementTab {
  return value === "completed" ? "completed" : "active";
}

function parsePage(value: string | null): number {
  const parsed = Number.parseInt(value || "", 10);
  if (!Number.isFinite(parsed) || parsed < 1) return 1;
  return parsed;
}

function buildWhere(
  organizationCoachId: string,
  tab: CoachEngagementTab
): Prisma.EngagementWhereInput {
  const statuses =
    tab === "active"
      ? [
          EngagementStatus.COACH_SELECTED,
          EngagementStatus.IN_PROGRESS,
          EngagementStatus.ON_HOLD,
        ]
      : [EngagementStatus.COMPLETED];

  return {
    organizationCoachId,
    archivedAt: null,
    status: {
      in: statuses,
    },
  };
}

export async function GET(request: NextRequest) {
  const auth = await requireCoachScope(request);
  if ("response" in auth) {
    return auth.response;
  }

  const tab = parseTab(request.nextUrl.searchParams.get("tab"));
  const page = parsePage(request.nextUrl.searchParams.get("page"));
  const where = buildWhere(auth.scope.organizationCoachId, tab);

  try {
    const totalItems = await prisma.engagement.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const boundedPage = Math.min(page, totalPages);

    const rows = await prisma.engagement.findMany({
      where,
      orderBy: [
        { lastActivityAt: { sort: "desc", nulls: "last" } },
        { participant: { email: "asc" } },
      ],
      skip: (boundedPage - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        status: true,
        totalSessions: true,
        lastActivityAt: true,
        participant: {
          select: {
            email: true,
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
        sessions: {
          where: {
            archivedAt: null,
          },
          orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
          take: 1,
          select: {
            occurredAt: true,
            createdAt: true,
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
    const needsAttentionIds = new Set<string>();
    if (rowIds.length > 0) {
      const needsAttentionRows = await getCoachNeedsAttentionEngagements({
        organizationId: auth.scope.organizationId,
        organizationCoachId: auth.scope.organizationCoachId,
      });
      for (const item of needsAttentionRows) {
        if (rowIds.includes(item.engagementId)) {
          needsAttentionIds.add(item.engagementId);
        }
      }
    }

    const items: CoachEngagementListItem[] = rows.map((row) => {
      const lastSession = row.sessions[0];
      const lastSessionAt = lastSession?.occurredAt ?? lastSession?.createdAt ?? null;
      return {
        engagementId: row.id,
        participantEmail: row.participant.email,
        cohortCode: row.cohort.code,
        programCode: row.program.code,
        programTrack: row.program.track,
        status: row.status,
        sessionsCompleted: row._count.sessions,
        totalSessions: row.totalSessions,
        lastSessionAt: lastSessionAt ? lastSessionAt.toISOString() : null,
        lastActivityAt: row.lastActivityAt ? row.lastActivityAt.toISOString() : null,
        needsAttention: needsAttentionIds.has(row.id),
        meetingBookingUrl: row.organizationCoach?.coachProfile.bookingLinkPrimary ?? null,
      };
    });

    return jsonNoStore({
      items,
      page: boundedPage,
      pageSize: PAGE_SIZE,
      totalItems,
      totalPages,
      tab,
    });
  } catch (error) {
    console.error("GET /api/coach/engagements failed", error);
    return jsonNoStore({ error: "Failed to load engagements" }, { status: 500 });
  }
}
