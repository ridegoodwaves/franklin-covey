import { createHash } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";

const EVENT_PARTICIPANT_VERIFY_EMAIL_ATTEMPT = "PARTICIPANT_VERIFY_EMAIL_ATTEMPT";
const ENTITY_PARTICIPANT_EMAIL = "PARTICIPANT_EMAIL";

const EVENT_MAGIC_LINK_TOKEN_CONSUMED = "MAGIC_LINK_TOKEN_CONSUMED";
const ENTITY_MAGIC_LINK_TOKEN = "MAGIC_LINK_TOKEN";

function sha256Hex(value: string): string {
  return createHash("sha256").update(value, "utf8").digest("hex");
}

export interface ConsumeParticipantEmailRateLimitInput {
  email: string;
  maxRequests: number;
  windowMs: number;
  ipAddress?: string;
  userAgent?: string;
}

export interface ConsumeParticipantEmailRateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  remaining: number;
}

export async function consumeParticipantEmailRateLimit(
  input: ConsumeParticipantEmailRateLimitInput
): Promise<ConsumeParticipantEmailRateLimitResult> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const emailHash = sha256Hex(normalizedEmail);
  const now = Date.now();
  const windowStart = new Date(now - input.windowMs);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`select pg_advisory_xact_lock(hashtext(${`participant-auth:${emailHash}`}))`;

    const currentHits = await tx.auditEvent.count({
      where: {
        eventType: EVENT_PARTICIPANT_VERIFY_EMAIL_ATTEMPT,
        entityType: ENTITY_PARTICIPANT_EMAIL,
        entityId: emailHash,
        createdAt: { gte: windowStart },
      },
    });

    if (currentHits >= input.maxRequests) {
      const oldest = await tx.auditEvent.findFirst({
        where: {
          eventType: EVENT_PARTICIPANT_VERIFY_EMAIL_ATTEMPT,
          entityType: ENTITY_PARTICIPANT_EMAIL,
          entityId: emailHash,
          createdAt: { gte: windowStart },
        },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });

      const oldestTs = oldest?.createdAt?.getTime() ?? now;
      const retryAfterMs = Math.max(0, oldestTs + input.windowMs - now);

      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
        remaining: 0,
      };
    }

    await tx.auditEvent.create({
      data: {
        eventType: EVENT_PARTICIPANT_VERIFY_EMAIL_ATTEMPT,
        entityType: ENTITY_PARTICIPANT_EMAIL,
        entityId: emailHash,
        metadata: {
          emailHash,
        },
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
    });

    return {
      allowed: true,
      retryAfterSeconds: 0,
      remaining: Math.max(0, input.maxRequests - (currentHits + 1)),
    };
  });
}

export interface ConsumeMagicLinkOneTimeInput {
  token: string;
  userId: string;
  email: string;
  role: UserRole;
  ipAddress?: string;
  userAgent?: string;
}

export async function consumeMagicLinkOneTime(input: ConsumeMagicLinkOneTimeInput): Promise<boolean> {
  const tokenHash = sha256Hex(input.token);

  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`select pg_advisory_xact_lock(hashtext(${`magic-link:${tokenHash}`}))`;

    const existing = await tx.auditEvent.findFirst({
      where: {
        eventType: EVENT_MAGIC_LINK_TOKEN_CONSUMED,
        entityType: ENTITY_MAGIC_LINK_TOKEN,
        entityId: tokenHash,
      },
      select: { id: true },
    });

    if (existing) {
      return false;
    }

    await tx.auditEvent.create({
      data: {
        actorUserId: input.userId,
        actorEmail: input.email,
        actorRole: input.role,
        eventType: EVENT_MAGIC_LINK_TOKEN_CONSUMED,
        entityType: ENTITY_MAGIC_LINK_TOKEN,
        entityId: tokenHash,
        metadata: {
          tokenHashPrefix: tokenHash.slice(0, 12),
        },
        ipAddress: input.ipAddress || null,
        userAgent: input.userAgent || null,
      },
    });

    return true;
  });
}
