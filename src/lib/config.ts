export const SESSION_TOPICS = [
  "Goal Setting",
  "Leadership Development",
  "Communication Skills",
  "Time Management",
  "Conflict Resolution",
  "Team Building",
  "Career Planning",
  "Stress Management",
  "Decision Making",
  "Other",
] as const;

export const SESSION_OUTCOMES = [
  "Action Plan Created",
  "Goal Achieved",
  "In Progress",
  "Needs Follow-up",
  "Participant Satisfied",
  "Referred to Resources",
] as const;

export const DURATION_OPTIONS = [15, 30, 45, 60, 90] as const;

export const NUDGE_THRESHOLDS = {
  coachReminderDays: 14,
  participantReminderDays: 7,
  opsEscalationDays: 21,
  nudgeCooldownDays: 7,
} as const;

export const PROGRAM_TRACK_SESSIONS = {
  TWO_SESSION: 2,
  FIVE_SESSION: 5,
} as const;

export type SessionTopic = (typeof SESSION_TOPICS)[number];
export type SessionOutcome = (typeof SESSION_OUTCOMES)[number];
export type DurationOption = (typeof DURATION_OPTIONS)[number];
