import "server-only";

import { EngagementStatus, ProgramTrack, type Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { NUDGE_THRESHOLDS } from "@/lib/config";
import type { NeedsAttentionEngagement } from "@/lib/types/dashboard";

const COACH_STALL_DAYS = NUDGE_THRESHOLDS.coachAttentionDays;
const DAY_MS = 24 * 60 * 60 * 1000;

function subtractDays(date: Date, days: number): Date {
  return new Date(date.getTime() - days * DAY_MS);
}

function daysSince(date: Date, now: Date): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / DAY_MS));
}

function daysOverdue(dueAt: Date, now: Date): number {
  return Math.max(1, Math.floor((now.getTime() - dueAt.getTime()) / DAY_MS));
}

export function buildNeedsAttentionWhere(now: Date = new Date()): Prisma.EngagementWhereInput {
  const stallCutoff = subtractDays(now, COACH_STALL_DAYS);

  return {
    OR: [
      {
        status: EngagementStatus.INVITED,
        program: { track: ProgramTrack.TWO_SESSION },
        cohort: {
          coachSelectionEnd: { lt: now },
        },
      },
      {
        status: EngagementStatus.COACH_SELECTED,
        coachSelectedAt: { not: null, lt: stallCutoff },
        sessions: {
          none: { archivedAt: null },
        },
      },
      {
        status: EngagementStatus.IN_PROGRESS,
        lastActivityAt: { not: null, lt: stallCutoff },
      },
    ],
  };
}

export async function getNeedsAttentionCount(
  organizationId: string,
  programId?: string
): Promise<number> {
  return prisma.engagement.count({
    where: {
      organizationId,
      archivedAt: null,
      ...(programId ? { programId } : {}),
      ...buildNeedsAttentionWhere(),
    },
  });
}

export async function getNeedsAttentionEngagements(
  organizationId: string,
  programId?: string
): Promise<NeedsAttentionEngagement[]> {
  const now = new Date();
  const rows = await prisma.engagement.findMany({
    where: {
      organizationId,
      archivedAt: null,
      ...(programId ? { programId } : {}),
      ...buildNeedsAttentionWhere(now),
    },
    select: {
      id: true,
      status: true,
      coachSelectedAt: true,
      lastActivityAt: true,
      participant: { select: { email: true } },
      organizationCoach: {
        select: {
          coachProfile: { select: { displayName: true } },
        },
      },
      cohort: {
        select: {
          code: true,
          coachSelectionEnd: true,
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

  return rows.map((row) => {
    if (row.status === EngagementStatus.INVITED) {
      return {
        engagementId: row.id,
        participantEmail: row.participant.email,
        coachName: row.organizationCoach?.coachProfile.displayName ?? null,
        cohortCode: row.cohort.code,
        flagType: "SELECTION_OVERDUE" as const,
        daysOverdue: daysSince(row.cohort.coachSelectionEnd, now),
        coachSelectedAt: row.coachSelectedAt,
        lastActivityAt: row.lastActivityAt,
      };
    }

    const sourceDate =
      row.status === EngagementStatus.COACH_SELECTED && row.coachSelectedAt
        ? row.coachSelectedAt
        : row.lastActivityAt ?? row.coachSelectedAt ?? row.cohort.coachSelectionEnd;

    const dueAt = new Date(sourceDate.getTime() + COACH_STALL_DAYS * DAY_MS);

    return {
      engagementId: row.id,
      participantEmail: row.participant.email,
      coachName: row.organizationCoach?.coachProfile.displayName ?? null,
      cohortCode: row.cohort.code,
      flagType: "COACH_STALL" as const,
      daysOverdue:
        row.status === EngagementStatus.COACH_SELECTED
          ? row._count.sessions === 0
            ? daysOverdue(dueAt, now)
            : 0
          : daysOverdue(dueAt, now),
      coachSelectedAt: row.coachSelectedAt,
      lastActivityAt: row.lastActivityAt,
    };
  });
}
