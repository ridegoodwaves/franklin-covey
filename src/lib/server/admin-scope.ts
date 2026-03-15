import "server-only";

import type { PortalSession } from "@/lib/server/session";
import { prisma } from "@/lib/db";

const MVP_ORG_CODE = "USPS";

export async function resolveAdminOrgScope(_session: PortalSession): Promise<string> {
  const organization = await prisma.organization.findFirst({
    where: {
      code: MVP_ORG_CODE,
      active: true,
      archivedAt: null,
    },
    select: { id: true },
  });

  if (!organization) {
    throw new Error(`Organization with code ${MVP_ORG_CODE} not found`);
  }

  return organization.id;
}
