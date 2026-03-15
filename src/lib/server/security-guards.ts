import { createHash } from "node:crypto";
import type { UserRole } from "@prisma/client";
import { prisma } from "@/lib/db";

const EVENT_PARTICIPANT_VERIFY_EMAIL_ATTEMPT = "PARTICIPANT_VERIFY_EMAIL_ATTEMPT";
const ENTITY_PARTICIPANT_EMAIL = "PARTICIPANT_EMAIL";

const EVENT_MAGIC_LINK_TOKEN_CONSUMED = "MAGIC_LINK_TOKEN_CONSUMED";
const ENTITY_MAGIC_LINK_TOKEN = "MAGIC_LINK_TOKEN";
const EVENT_MAGIC_LINK_REQUEST_EMAIL_ATTEMPT = "MAGIC_LINK_REQUEST_EMAIL_ATTEMPT";
const ENTITY_MAGIC_LINK_EMAIL = "MAGIC_LINK_EMAIL";
const EVENT_MAGIC_LINK_REQUEST_IP_ATTEMPT = "MAGIC_LINK_REQUEST_IP_ATTEMPT";
const ENTITY_MAGIC_LINK_IP = "MAGIC_LINK_IP";

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
    await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${`participant-auth:${emailHash}`}))`;

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
    await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${`magic-link:${tokenHash}`}))`;

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

export interface ConsumeMagicLinkRequestRateLimitInput {
  email: string;
  ipAddress: string;
  userAgent?: string;
  maxRequestsPerHourPerEmail: number;
  maxRequestsPerHourPerIp: number;
  cooldownSeconds: number;
  burstWindowMs?: number;
  maxRequestsPerBurstWindow?: number;
}

export interface ConsumeMagicLinkRequestRateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
  reason: "EMAIL_COOLDOWN" | "EMAIL_RATE_LIMIT" | "IP_RATE_LIMIT" | "IP_BURST_LIMIT" | null;
}

export async function consumeMagicLinkRequestRateLimit(
  input: ConsumeMagicLinkRequestRateLimitInput
): Promise<ConsumeMagicLinkRequestRateLimitResult> {
  const normalizedEmail = input.email.trim().toLowerCase();
  const normalizedIp = input.ipAddress.trim() || "unknown";

  const emailHash = sha256Hex(normalizedEmail);
  const ipHash = sha256Hex(normalizedIp);

  const now = Date.now();
  const oneHourWindowStart = new Date(now - 60 * 60 * 1000);
  const burstWindowStart = input.burstWindowMs ? new Date(now - input.burstWindowMs) : null;

  return prisma.$transaction(async (tx) => {
    const lockKeys = [`magic-link-email:${emailHash}`, `magic-link-ip:${ipHash}`].sort();
    for (const lockKey of lockKeys) {
      await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${lockKey}))`;
    }

    const [emailCount, ipCount, latestEmailAttempt, ipBurstCount] = await Promise.all([
      tx.auditEvent.count({
        where: {
          eventType: EVENT_MAGIC_LINK_REQUEST_EMAIL_ATTEMPT,
          entityType: ENTITY_MAGIC_LINK_EMAIL,
          entityId: emailHash,
          createdAt: { gte: oneHourWindowStart },
        },
      }),
      tx.auditEvent.count({
        where: {
          eventType: EVENT_MAGIC_LINK_REQUEST_IP_ATTEMPT,
          entityType: ENTITY_MAGIC_LINK_IP,
          entityId: ipHash,
          createdAt: { gte: oneHourWindowStart },
        },
      }),
      tx.auditEvent.findFirst({
        where: {
          eventType: EVENT_MAGIC_LINK_REQUEST_EMAIL_ATTEMPT,
          entityType: ENTITY_MAGIC_LINK_EMAIL,
          entityId: emailHash,
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      burstWindowStart && input.maxRequestsPerBurstWindow
        ? tx.auditEvent.count({
            where: {
              eventType: EVENT_MAGIC_LINK_REQUEST_IP_ATTEMPT,
              entityType: ENTITY_MAGIC_LINK_IP,
              entityId: ipHash,
              createdAt: { gte: burstWindowStart },
            },
          })
        : Promise.resolve(0),
    ]);

    if (latestEmailAttempt) {
      const cooldownMsRemaining =
        input.cooldownSeconds * 1000 - (now - latestEmailAttempt.createdAt.getTime());
      if (cooldownMsRemaining > 0) {
        return {
          allowed: false,
          retryAfterSeconds: Math.ceil(cooldownMsRemaining / 1000),
          reason: "EMAIL_COOLDOWN" as const,
        };
      }
    }

    if (emailCount >= input.maxRequestsPerHourPerEmail) {
      const oldestEmailAttempt = await tx.auditEvent.findFirst({
        where: {
          eventType: EVENT_MAGIC_LINK_REQUEST_EMAIL_ATTEMPT,
          entityType: ENTITY_MAGIC_LINK_EMAIL,
          entityId: emailHash,
          createdAt: { gte: oneHourWindowStart },
        },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });

      const retryAfterMs = oldestEmailAttempt
        ? oldestEmailAttempt.createdAt.getTime() + 60 * 60 * 1000 - now
        : 60 * 60 * 1000;

      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(Math.max(0, retryAfterMs) / 1000),
        reason: "EMAIL_RATE_LIMIT" as const,
      };
    }

    if (ipCount >= input.maxRequestsPerHourPerIp) {
      const oldestIpAttempt = await tx.auditEvent.findFirst({
        where: {
          eventType: EVENT_MAGIC_LINK_REQUEST_IP_ATTEMPT,
          entityType: ENTITY_MAGIC_LINK_IP,
          entityId: ipHash,
          createdAt: { gte: oneHourWindowStart },
        },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });

      const retryAfterMs = oldestIpAttempt
        ? oldestIpAttempt.createdAt.getTime() + 60 * 60 * 1000 - now
        : 60 * 60 * 1000;

      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(Math.max(0, retryAfterMs) / 1000),
        reason: "IP_RATE_LIMIT" as const,
      };
    }

    if (
      input.maxRequestsPerBurstWindow &&
      input.burstWindowMs &&
      ipBurstCount >= input.maxRequestsPerBurstWindow
    ) {
      const oldestBurstAttempt = await tx.auditEvent.findFirst({
        where: {
          eventType: EVENT_MAGIC_LINK_REQUEST_IP_ATTEMPT,
          entityType: ENTITY_MAGIC_LINK_IP,
          entityId: ipHash,
          createdAt: { gte: burstWindowStart! },
        },
        orderBy: { createdAt: "asc" },
        select: { createdAt: true },
      });

      const retryAfterMs = oldestBurstAttempt
        ? oldestBurstAttempt.createdAt.getTime() + input.burstWindowMs - now
        : input.burstWindowMs;

      return {
        allowed: false,
        retryAfterSeconds: Math.ceil(Math.max(0, retryAfterMs) / 1000),
        reason: "IP_BURST_LIMIT" as const,
      };
    }

    await tx.auditEvent.create({
      data: {
        eventType: EVENT_MAGIC_LINK_REQUEST_EMAIL_ATTEMPT,
        entityType: ENTITY_MAGIC_LINK_EMAIL,
        entityId: emailHash,
        metadata: {
          emailHash,
        },
        ipAddress: normalizedIp,
        userAgent: input.userAgent || null,
      },
    });

    await tx.auditEvent.create({
      data: {
        eventType: EVENT_MAGIC_LINK_REQUEST_IP_ATTEMPT,
        entityType: ENTITY_MAGIC_LINK_IP,
        entityId: ipHash,
        metadata: {
          ipHash,
        },
        ipAddress: normalizedIp,
        userAgent: input.userAgent || null,
      },
    });

    return {
      allowed: true,
      retryAfterSeconds: 0,
      reason: null,
    };
  });
}
