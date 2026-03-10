import type {
  EngagementStatus,
  ProgramCode,
  ProgramTrack,
  SessionStatus,
} from "@prisma/client";

export interface CoachSessionRow {
  id: string;
  sessionNumber: number;
  status: SessionStatus;
  occurredAt: string | null;
  topic: string | null;
  outcome: string | null;
  durationMinutes: number | null;
  privateNotes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CoachEngagementListItem {
  engagementId: string;
  participantEmail: string;
  cohortCode: string;
  programCode: ProgramCode;
  programTrack: ProgramTrack;
  status: EngagementStatus;
  sessionsCompleted: number;
  totalSessions: number;
  lastSessionAt: string | null;
  lastActivityAt: string | null;
  needsAttention: boolean;
  meetingBookingUrl: string | null;
}

export interface CoachEngagementDetail {
  engagementId: string;
  participantEmail: string;
  organizationName: string;
  cohortCode: string;
  programCode: ProgramCode;
  programName: string;
  programTrack: ProgramTrack;
  status: EngagementStatus;
  totalSessions: number;
  sessionsCompleted: number;
  coachSelectedAt: string | null;
  lastActivityAt: string | null;
  meetingBookingUrl: string | null;
}

export interface CoachNeedsAttentionItem {
  engagementId: string;
  participantEmail: string;
  cohortCode: string;
  daysOverdue: number;
}

export interface CoachDashboardResponse {
  activeCount: number;
  completedCount: number;
  sessionsThisWeek: number;
  completionRate: number;
  needsAttention: CoachNeedsAttentionItem[];
  coachName: string;
  coachRole: string;
}
