import type { EngagementStatus, ProgramCode } from "@prisma/client";

export interface DashboardKpiResponse {
  total: number;
  invited: number;
  coachSelected: number;
  inProgress: number;
  onHold: number;
  completed: number;
  canceled: number;
  needsAttention: number;
  completionRate: number;
  programBreakdown: ProgramHealthItem[];
}

export interface ProgramHealthItem {
  programCode: ProgramCode;
  total: number;
  completed: number;
  completionRate: number;
}

export type NeedsAttentionFlagType = "SELECTION_OVERDUE" | "COACH_STALL";

export interface NeedsAttentionEngagement {
  engagementId: string;
  participantEmail: string;
  coachName: string | null;
  cohortCode: string;
  flagType: NeedsAttentionFlagType;
  daysOverdue: number;
  coachSelectedAt: Date | null;
  lastActivityAt: Date | null;
}

export interface CoachUtilizationItem {
  coachId: string;
  organizationCoachId: string;
  name: string;
  email: string;
  active: boolean;
  pools: string[];
  current: number;
  max: number;
  utilizationPct: number;
  updatedAt: Date;
}

export type EngagementSortOption = "days_desc" | "status" | "coach";
export type EngagementTab = "all" | "needs_attention";

/**
 * Slice 2 semantics:
 * - Activity starts at coach selection.
 * - `lastActivityAt` is independent from session count.
 * - Session count reflects logged sessions only (expected 0/n before Slice 3 logging starts).
 */
export interface AdminEngagementRow {
  engagementId: string;
  participantEmail: string;
  coachName: string | null;
  coachId: string | null;
  cohortCode: string;
  programCode: ProgramCode;
  status: EngagementStatus;
  sessionsCompleted: number;
  totalSessions: number;
  coachSelectedAt: Date | null;
  lastActivityAt: Date | null;
  daysSinceActivity: number | null;
  needsAttention: boolean;
}

export interface AdminEngagementsResponse {
  items: AdminEngagementRow[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  tab: EngagementTab;
  sort: EngagementSortOption;
}
