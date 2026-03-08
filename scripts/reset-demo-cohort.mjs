#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const ROOT = process.cwd();
const DEFAULTS = {
  organizationCode: "USPS",
  cohortCode: "USPS-DEMO-RECORDING-2026-03",
  maxRows: 10,
};

function parseArgs(argv) {
  const args = {
    apply: false,
    confirm: false,
    envFile: null,
    organizationCode: DEFAULTS.organizationCode,
    cohortCode: DEFAULTS.cohortCode,
    cohortId: null,
    maxRows: DEFAULTS.maxRows,
    allowNonDemoCohort: false,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--apply") {
      args.apply = true;
      continue;
    }
    if (token === "--confirm") {
      args.confirm = true;
      continue;
    }
    if (token === "--env-file") {
      args.envFile = argv[i + 1] || null;
      i += 1;
      continue;
    }
    if (token === "--organization-code") {
      args.organizationCode = String(argv[i + 1] || args.organizationCode).trim().toUpperCase();
      i += 1;
      continue;
    }
    if (token === "--cohort-code") {
      args.cohortCode = String(argv[i + 1] || args.cohortCode).trim();
      i += 1;
      continue;
    }
    if (token === "--cohort-id") {
      args.cohortId = String(argv[i + 1] || "").trim() || null;
      i += 1;
      continue;
    }
    if (token === "--max-rows") {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed)) {
        args.maxRows = Math.floor(parsed);
      }
      i += 1;
      continue;
    }
    if (token === "--allow-non-demo-cohort") {
      args.allowNonDemoCohort = true;
      continue;
    }
  }

  return args;
}

function stripQuotes(value) {
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }
  return value;
}

function loadEnvFile(filePath) {
  const resolved = path.resolve(ROOT, filePath);
  if (!fs.existsSync(resolved)) {
    throw new Error(`Env file not found: ${resolved}`);
  }

  const raw = fs.readFileSync(resolved, "utf8");
  const out = {};

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const splitAt = trimmed.indexOf("=");
    if (splitAt <= 0) continue;
    const key = trimmed.slice(0, splitAt).trim();
    const value = stripQuotes(trimmed.slice(splitAt + 1).trim());
    out[key] = value;
  }

  return out;
}

function resolveDatabaseUrl(args) {
  const fileEnv = args.envFile ? loadEnvFile(args.envFile) : {};
  const direct = fileEnv.DIRECT_URL || process.env.DIRECT_URL;
  const pooled = fileEnv.DATABASE_URL || process.env.DATABASE_URL;
  const url = direct || pooled;
  if (!url) {
    throw new Error("DIRECT_URL or DATABASE_URL is required. Provide --env-file or export env vars.");
  }
  return url;
}

function ensureDemoCohort(args, cohortCode) {
  if (args.allowNonDemoCohort) return;
  if (String(cohortCode || "").toLowerCase().includes("demo")) return;
  throw new Error(
    `Refusing to reset cohort "${cohortCode}" because it does not look like a demo cohort. ` +
      "Pass --allow-non-demo-cohort to override."
  );
}

async function loadTargetCohort(prisma, args) {
  if (args.cohortId) {
    const cohort = await prisma.cohort.findUnique({
      where: { id: args.cohortId },
      select: { id: true, code: true, organizationId: true },
    });
    if (!cohort) throw new Error(`Cohort not found: ${args.cohortId}`);
    return cohort;
  }

  const organization = await prisma.organization.findUnique({
    where: { code: args.organizationCode },
    select: { id: true, code: true },
  });
  if (!organization) {
    throw new Error(`Organization not found: ${args.organizationCode}`);
  }

  const cohort = await prisma.cohort.findUnique({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: args.cohortCode,
      },
    },
    select: { id: true, code: true, organizationId: true },
  });
  if (!cohort) {
    throw new Error(`Cohort not found for code: ${args.cohortCode}`);
  }
  return cohort;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.maxRows < 1) {
    throw new Error("max-rows must be at least 1");
  }
  if (args.apply && !args.confirm) {
    throw new Error("Refusing to apply reset without --confirm");
  }

  const databaseUrl = resolveDatabaseUrl(args);
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  const cohort = await loadTargetCohort(prisma, args);
  ensureDemoCohort(args, cohort.code);

  const engagements = await prisma.engagement.findMany({
    where: {
      cohortId: cohort.id,
      archivedAt: null,
    },
    select: {
      id: true,
      status: true,
      organizationCoachId: true,
      participant: {
        select: {
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  if (engagements.length > args.maxRows) {
    throw new Error(
      `Safety abort: ${engagements.length} engagements matched in cohort ${cohort.code}, above max-rows ${args.maxRows}`
    );
  }

  const engagementIds = engagements.map((row) => row.id);
  const coachIds = [...new Set(engagements.map((row) => row.organizationCoachId).filter(Boolean))];
  const participantEmails = engagements.map((row) => row.participant.email);
  const statusCounts = {};

  for (const row of engagements) {
    statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
  }

  const summary = {
    mode: args.apply ? "apply" : "dry-run",
    cohortId: cohort.id,
    cohortCode: cohort.code,
    engagementCount: engagements.length,
    coachLockCount: coachIds.length,
    maxRows: args.maxRows,
    statusCounts,
    participantEmails,
    deletedSessions: 0,
    deletedNeedsAttention: 0,
    resetEngagements: 0,
  };

  if (!args.apply || engagementIds.length === 0) {
    await prisma.$disconnect();
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const result = await prisma.$transaction(async (tx) => {
    const lockedRows = await tx.$queryRaw`
      select id, "organizationCoachId"
      from "Engagement"
      where "cohortId" = ${cohort.id}
      and "archivedAt" is null
      for update
    `;

    if (lockedRows.length > args.maxRows) {
      throw new Error(
        `Safety abort in transaction: ${lockedRows.length} rows matched in cohort ${cohort.code}, above max-rows ${args.maxRows}`
      );
    }

    for (const coachId of coachIds) {
      await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${coachId}))`;
    }

    const deletedSessions = await tx.session.deleteMany({
      where: {
        engagementId: {
          in: engagementIds,
        },
      },
    });

    const deletedNeedsAttention = await tx.needsAttentionFlag.deleteMany({
      where: {
        engagementId: {
          in: engagementIds,
        },
      },
    });

    const resetEngagements = await tx.engagement.updateMany({
      where: {
        id: {
          in: engagementIds,
        },
      },
      data: {
        status: "INVITED",
        organizationCoachId: null,
        coachSelectedAt: null,
        lastActivityAt: null,
        statusVersion: {
          increment: 1,
        },
        updatedBy: "reset-demo-cohort.mjs",
      },
    });

    return {
      deletedSessions: deletedSessions.count,
      deletedNeedsAttention: deletedNeedsAttention.count,
      resetEngagements: resetEngagements.count,
    };
  });

  summary.deletedSessions = result.deletedSessions;
  summary.deletedNeedsAttention = result.deletedNeedsAttention;
  summary.resetEngagements = result.resetEngagements;

  await prisma.$disconnect();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
