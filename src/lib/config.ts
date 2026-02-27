// Session topics by program type — from Kari Sadler (Feb 17, 2026)
// "OTHER" shows static note: "Please email the coaching practice" (no free-text input)

export const MLP_SESSION_TOPICS = [
  "Solving Problems",
  "Facilitating Change",
  "Driving Unit Performance",
  "Building Relationships",
  "Managing People",
  "Setting Expectations",
  "Other",
] as const;

export const EXECUTIVE_SESSION_TOPICS = [
  "Implementing Strategies",
  "Promoting Change",
  "Driving Functional Excellence",
  "Collaborating for Success",
  "Developing People",
  "Leading by Example",
  "Other",
] as const;

// Map program to topic list
// MLP = Managerial Leadership Program (2-session, new managers)
// ALP = Advanced Leadership Program (2-session, experienced managers)
// EF = Executive Foundations (5-session, new execs)
// EL = Executive Leadership (5-session, execs)
export const SESSION_TOPICS_BY_PROGRAM = {
  MLP: MLP_SESSION_TOPICS,
  ALP: EXECUTIVE_SESSION_TOPICS,
  EF: EXECUTIVE_SESSION_TOPICS,
  EL: EXECUTIVE_SESSION_TOPICS,
} as const;

// Flat union for backward compatibility (e.g., Zod validation across all programs)
export const ALL_SESSION_TOPICS = [
  ...MLP_SESSION_TOPICS,
  ...EXECUTIVE_SESSION_TOPICS.filter(
    (t) => !MLP_SESSION_TOPICS.includes(t as (typeof MLP_SESSION_TOPICS)[number])
  ),
] as const;

// Legacy alias — use SESSION_TOPICS_BY_PROGRAM for program-aware code
export const SESSION_TOPICS = ALL_SESSION_TOPICS;

export const SESSION_OUTCOMES = [
  "Action Plan Created",
  "Goal Achieved",
  "In Progress",
  "Needs Follow-up",
  "Participant Satisfied",
  "Referred to Resources",
] as const;

export const DURATION_OPTIONS = [15, 30, 45, 60, 90] as const;

// Updated workshop decisions:
// - Day 0 for nudge timing = cohort start date
// - Email nudges at Day 5/10 (FC Ops sends manually via USPS/email)
// - Day 15: ops manually assigns coach from dashboard (system does NOT auto-assign in MVP)
export const NUDGE_THRESHOLDS = {
  participantReminder1Days: 5,        // Day 5: threshold for ops manual reminder (not system email)
  participantReminder2Days: 10,       // Day 10: threshold for ops firmer reminder (not system email)
  opsManualAssignThresholdDays: 15,   // Day 15: ops assigns coach manually from dashboard (no system auto-assign in MVP)
  coachAttentionDays: 14,             // No session logged in 14+ days (dashboard flag)
  opsEscalationDays: 21,              // Critically stalled (dashboard flag + ops email)
} as const;

export const PROGRAM_TRACK_SESSIONS = {
  TWO_SESSION: 2,
  FIVE_SESSION: 5,
} as const;

// All coach pools: 20 participants per coach (Kari confirmed 2026-02-24 — MLP/ALP updated from 15 to 20)
// Authoritative source: CoachProfile.maxEngagements in DB. Use this constant for validation only.
export const COACH_CAPACITY = 20 as const;

export const PROGRAM_TYPES = {
  MLP: { name: "Managerial Leadership Program", track: "TWO_SESSION" as const, coachPanel: "MLP_ALP" },
  ALP: { name: "Advanced Leadership Program", track: "TWO_SESSION" as const, coachPanel: "MLP_ALP" },
  EF:  { name: "Executive Foundations", track: "FIVE_SESSION" as const, coachPanel: "EF_EL" },
  EL:  { name: "Executive Leadership", track: "FIVE_SESSION" as const, coachPanel: "EF_EL" },
} as const;

export type MlpSessionTopic = (typeof MLP_SESSION_TOPICS)[number];
export type ExecutiveSessionTopic = (typeof EXECUTIVE_SESSION_TOPICS)[number];
export type SessionTopic = MlpSessionTopic | ExecutiveSessionTopic;
export type SessionOutcome = (typeof SESSION_OUTCOMES)[number];
export type DurationOption = (typeof DURATION_OPTIONS)[number];
export type ProgramType = keyof typeof PROGRAM_TYPES;
