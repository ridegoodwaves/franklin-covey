import "server-only";

import type { EngagementStatus, Prisma } from "@prisma/client";

export async function transitionEngagement(
  tx: Prisma.TransactionClient,
  engagementId: string,
  targetStatus: EngagementStatus,
  currentStatusVersion: number
): Promise<{ newStatusVersion: number }> {
  const updated = await tx.engagement.updateMany({
    where: {
      id: engagementId,
      statusVersion: currentStatusVersion,
    },
    data: {
      status: targetStatus,
      statusVersion: {
        increment: 1,
      },
      lastActivityAt: new Date(),
    },
  });

  if (updated.count === 0) {
    throw new Error("CONCURRENT_STATUS_CHANGE");
  }

  return { newStatusVersion: currentStatusVersion + 1 };
}
