import type {
  CoachCertification,
  CoachClientQuote,
  CoachHighlight,
  CoachPool,
  EngagementStatus,
  OrganizationCoach,
  User,
  CoachProfile,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import { deriveCoachPhotoPath, resolveCoachPhotoUrl } from "@/lib/server/headshots";
import { resolveWistiaMediaId } from "@/lib/server/wistia";

export const CAPACITY_COUNT_STATUSES: EngagementStatus[] = [
  "COACH_SELECTED",
  "IN_PROGRESS",
  "ON_HOLD",
];

const SELECTED_ENGAGEMENT_STATUSES = new Set<EngagementStatus>([
  "COACH_SELECTED",
  "IN_PROGRESS",
  "COMPLETED",
  "ON_HOLD",
  "CANCELED",
]);

export interface AuthLookupResult {
  participantId: string;
  engagementId: string;
  organizationId: string;
  cohortId: string;
  email: string;
  selectionWindowClosed: boolean;
  alreadySelected: boolean;
}

interface CoachProfileBundle {
  id: string;
  organizationId: string;
  coachPool: CoachPool;
  maxEngagements: number;
  displayName: string;
  email: string;
  shortBio: string;
  location: string;
  yearsExperience: number;
  specialties: string[];
  credentials: string[];
  bookingLinkPrimary?: string;
  photoPath?: string;
  wistiaMediaId?: string;
  atCapacity: boolean;
  remainingCapacity: number;
  quotes: Array<{ quote: string; attribution?: string }>;
}

interface OrganizationCoachWithProfile
  extends OrganizationCoach {
  coachProfile: CoachProfile & {
    user: User;
    highlights: CoachHighlight[];
    certifications: CoachCertification[];
    clientQuotes: CoachClientQuote[];
  };
  _count: {
    engagements: number;
  };
}

function shuffleInPlace<T>(values: T[]): T[] {
  const out = [...values];
  for (let i = out.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function toInitials(displayName: string): string {
  const tokens = displayName
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  if (tokens.length === 0) return "??";
  if (tokens.length === 1) return tokens[0].slice(0, 2).toUpperCase();
  return `${tokens[0][0] ?? ""}${tokens[tokens.length - 1][0] ?? ""}`.toUpperCase();
}

function parseYearsExperience(sourcePayload: unknown, shortBio: string): number {
  if (sourcePayload && typeof sourcePayload === "object") {
    const value = (sourcePayload as { yearsExperience?: unknown }).yearsExperience;
    if (typeof value === "number" && Number.isFinite(value)) {
      return Math.max(0, Math.floor(value));
    }
  }

  const bioMatch = shortBio.match(/(\d{1,2})\+?\s+years?/i);
  if (bioMatch?.[1]) {
    const parsed = Number(bioMatch[1]);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 10;
}

function mapCoachRecord(record: OrganizationCoachWithProfile, pool: CoachPool): CoachProfileBundle {
  const activeCount = record._count.engagements;
  const maxEngagements = Math.max(1, record.maxEngagements || 20);
  const remainingCapacity = Math.max(0, maxEngagements - activeCount);
  const atCapacity = remainingCapacity <= 0;

  const specialties = record.coachProfile.highlights
    .map((item) => item.text.trim())
    .filter(Boolean)
    .slice(0, 3);

  const credentials = record.coachProfile.certifications
    .map((item) => item.text.trim())
    .filter(Boolean)
    .slice(0, 3);

  const quotes = (record.coachProfile.clientQuotes ?? [])
    .map((q) => ({
      quote: q.quote.trim(),
      attribution: q.attribution?.trim() ?? undefined,
    }))
    .filter((q) => q.quote.length > 0);

  return {
    id: record.id,
    organizationId: record.organizationId,
    coachPool: pool,
    maxEngagements,
    displayName: record.coachProfile.displayName,
    email: record.coachProfile.user.email,
    shortBio: record.coachProfile.shortBio?.trim() || "Bio coming soon.",
    location: record.coachProfile.location?.trim() || "Virtual",
    yearsExperience: parseYearsExperience(record.coachProfile.sourcePayload, record.coachProfile.shortBio || ""),
    specialties,
    credentials,
    bookingLinkPrimary: record.coachProfile.bookingLinkPrimary ?? undefined,
    photoPath: record.coachProfile.photoPath ?? undefined,
    wistiaMediaId: record.coachProfile.wistiaMediaId ?? undefined,
    atCapacity,
    remainingCapacity,
    quotes,
  };
}

export function normalizeParticipantEmail(email: string): string {
  return email.trim().toLowerCase();
}

export async function lookupParticipantForEmailAuth(email: string): Promise<AuthLookupResult | null> {
  const normalizedEmail = normalizeParticipantEmail(email);
  if (!normalizedEmail) return null;

  const now = new Date();

  const participants = await prisma.participant.findMany({
    where: {
      email: normalizedEmail,
      archivedAt: null,
      organization: { active: true, archivedAt: null },
      cohort: { active: true, archivedAt: null },
    },
    include: {
      cohort: true,
      engagement: true,
    },
    orderBy: {
      updatedAt: "desc",
    },
  });

  if (participants.length === 0) return null;

  const openRecord = participants.find((record) => record.cohort.coachSelectionEnd >= now);
  const record = openRecord ?? participants[0];
  if (!record?.engagement) return null;

  const engagementStatus = record.engagement.status;

  return {
    participantId: record.id,
    engagementId: record.engagement.id,
    organizationId: record.organizationId,
    cohortId: record.cohortId,
    email: record.email,
    selectionWindowClosed: record.cohort.coachSelectionEnd < now,
    alreadySelected: SELECTED_ENGAGEMENT_STATUSES.has(engagementStatus),
  };
}

export async function getSessionContext(input: {
  participantId: string;
  engagementId: string;
  organizationId: string;
}) {
  const engagement = await prisma.engagement.findFirst({
    where: {
      id: input.engagementId,
      participantId: input.participantId,
      organizationId: input.organizationId,
      archivedAt: null,
    },
    include: {
      participant: true,
      program: true,
      cohort: true,
      organizationCoach: {
        include: {
          coachProfile: {
            include: {
              user: true,
              highlights: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } },
              certifications: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } },
            },
          },
          _count: {
            select: {
              engagements: {
                where: {
                  archivedAt: null,
                  status: { in: CAPACITY_COUNT_STATUSES },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!engagement) return null;
  return engagement;
}

export async function listCoachPool(input: {
  organizationId: string;
  pool: CoachPool;
}): Promise<CoachProfileBundle[]> {
  const orgCoaches = (await prisma.organizationCoach.findMany({
    where: {
      organizationId: input.organizationId,
      active: true,
      archivedAt: null,
      poolMemberships: {
        some: {
          pool: input.pool,
          archivedAt: null,
        },
      },
    },
    include: {
      coachProfile: {
        include: {
          user: true,
          highlights: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } },
          certifications: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } },
          clientQuotes: { where: { archivedAt: null }, orderBy: { sortOrder: "asc" } },
        },
      },
      _count: {
        select: {
          engagements: {
            where: {
              archivedAt: null,
              status: { in: CAPACITY_COUNT_STATUSES },
            },
          },
        },
      },
    },
    orderBy: {
      updatedAt: "desc",
    },
  })) as OrganizationCoachWithProfile[];

  return orgCoaches
    .filter((row) => row.coachProfile.active && row.coachProfile.user.active)
    .map((row) => mapCoachRecord(row, input.pool));
}

export function pickCoachBatch(input: {
  coaches: CoachProfileBundle[];
  shownCoachIds: string[];
  count: number;
}): {
  selected: CoachProfileBundle[];
  poolExhausted: boolean;
} {
  const shown = new Set(input.shownCoachIds);
  const available = input.coaches.filter((coach) => !coach.atCapacity);
  const unseenAvailable = available.filter((coach) => !shown.has(coach.id));

  if (available.length === 0) {
    return { selected: [], poolExhausted: false };
  }

  if (unseenAvailable.length >= input.count) {
    return {
      selected: shuffleInPlace(unseenAvailable).slice(0, input.count),
      poolExhausted: false,
    };
  }

  const selected = shuffleInPlace(unseenAvailable);
  const selectedIds = new Set(selected.map((coach) => coach.id));
  const refill = shuffleInPlace(
    available.filter((coach) => !selectedIds.has(coach.id))
  ).slice(0, Math.max(0, input.count - selected.length));

  return {
    selected: [...selected, ...refill],
    poolExhausted: true,
  };
}

export async function toParticipantCoachCards(
  coaches: CoachProfileBundle[],
  includeBookingLink = false
): Promise<Array<{
  id: string;
  name: string;
  initials: string;
  photo?: string;
  bio: string;
  specialties: string[];
  credentials: string[];
  location: string;
  atCapacity: boolean;
  remainingCapacity: number;
  yearsExperience: number;
  wistiaMediaId?: string;
  meetingBookingUrl?: string;
  quotes: Array<{ quote: string; attribution?: string }>;
}>> {
  return Promise.all(
    coaches.map(async (coach) => {
      const photoPath = deriveCoachPhotoPath({
        email: coach.email,
        displayName: coach.displayName,
        pool: coach.coachPool,
        currentPhotoPath: coach.photoPath,
      });

      const photoUrl = await resolveCoachPhotoUrl(photoPath);

      return {
        id: coach.id,
        name: coach.displayName,
        initials: toInitials(coach.displayName),
        photo: photoUrl,
        bio: coach.shortBio,
        specialties: coach.specialties,
        credentials: coach.credentials,
        location: coach.location,
        atCapacity: coach.atCapacity,
        remainingCapacity: coach.remainingCapacity,
        yearsExperience: coach.yearsExperience,
        wistiaMediaId: coach.wistiaMediaId ?? resolveWistiaMediaId(coach.email),
        meetingBookingUrl: includeBookingLink ? coach.bookingLinkPrimary : undefined,
        quotes: coach.quotes,
      };
    })
  );
}
