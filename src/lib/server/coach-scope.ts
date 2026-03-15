import "server-only";

import type { PortalSession } from "@/lib/server/session";
import { prisma } from "@/lib/db";

const MVP_ORG_CODE = "USPS";

export interface CoachScope {
  coachProfileId: string;
  organizationCoachId: string;
  organizationId: string;
}

export type CoachScopeErrorCode = "COACH_PROFILE_NOT_FOUND" | "COACH_ACCESS_DISABLED";

export class CoachScopeError extends Error {
  readonly code: CoachScopeErrorCode;

  constructor(code: CoachScopeErrorCode) {
    super(code);
    this.code = code;
  }
}

export async function resolveCoachScope(session: PortalSession): Promise<CoachScope> {
  const coachProfile = await prisma.coachProfile.findUnique({
    where: { userId: session.userId },
    select: {
      id: true,
      active: true,
      archivedAt: true,
    },
  });

  if (!coachProfile) {
    throw new CoachScopeError("COACH_PROFILE_NOT_FOUND");
  }

  if (!coachProfile.active || coachProfile.archivedAt !== null) {
    throw new CoachScopeError("COACH_ACCESS_DISABLED");
  }

  const organizationCoach = await prisma.organizationCoach.findFirst({
    where: {
      coachProfileId: coachProfile.id,
      organization: {
        code: MVP_ORG_CODE,
        active: true,
        archivedAt: null,
      },
    },
    select: {
      id: true,
      active: true,
      archivedAt: true,
      organizationId: true,
    },
  });

  if (!organizationCoach || !organizationCoach.active || organizationCoach.archivedAt !== null) {
    throw new CoachScopeError("COACH_ACCESS_DISABLED");
  }

  return {
    coachProfileId: coachProfile.id,
    organizationCoachId: organizationCoach.id,
    organizationId: organizationCoach.organizationId,
  };
}
