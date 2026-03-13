#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { PrismaClient, UserRole, CoachPool } from "@prisma/client";

const ROOT = process.cwd();

const DEFAULTS = {
  organizationCode: "USPS",
  cohortCode: "USPS-DEMO-RECORDING-2026-03",
  email: "amit+coach@onusleadership.com",
  displayName: "Amit Demo Coach",
  pool: "MLP_ALP",
  maxEngagements: 20,
  sourceFile: "staging-demo-coach",
  demoBatch: "usps-recording-2026-03-04",
};

function parseArgs(argv) {
  const args = {
    apply: false,
    confirm: false,
    envFile: null,
    databaseUrl: null,
    organizationCode: DEFAULTS.organizationCode,
    cohortCode: DEFAULTS.cohortCode,
    email: DEFAULTS.email,
    displayName: DEFAULTS.displayName,
    pool: DEFAULTS.pool,
    maxEngagements: DEFAULTS.maxEngagements,
    sourceFile: DEFAULTS.sourceFile,
    demoBatch: DEFAULTS.demoBatch,
    linkDemoParticipants: true,
    setCoachSelected: true,
    maxRows: 10,
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
    if (token === "--database-url") {
      args.databaseUrl = argv[i + 1] || null;
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
    if (token === "--email") {
      args.email = String(argv[i + 1] || args.email).trim().toLowerCase();
      i += 1;
      continue;
    }
    if (token === "--display-name") {
      args.displayName = String(argv[i + 1] || args.displayName).trim();
      i += 1;
      continue;
    }
    if (token === "--pool") {
      args.pool = String(argv[i + 1] || args.pool).trim().toUpperCase();
      i += 1;
      continue;
    }
    if (token === "--max-engagements") {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed)) {
        args.maxEngagements = Math.max(1, Math.floor(parsed));
      }
      i += 1;
      continue;
    }
    if (token === "--source-file") {
      args.sourceFile = String(argv[i + 1] || args.sourceFile).trim();
      i += 1;
      continue;
    }
    if (token === "--demo-batch") {
      args.demoBatch = String(argv[i + 1] || args.demoBatch).trim();
      i += 1;
      continue;
    }
    if (token === "--no-link-demo-participants") {
      args.linkDemoParticipants = false;
      continue;
    }
    if (token === "--no-set-coach-selected") {
      args.setCoachSelected = false;
      continue;
    }
    if (token === "--max-rows") {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed)) {
        args.maxRows = Math.max(1, Math.floor(parsed));
      }
      i += 1;
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

  const out = {};
  const raw = fs.readFileSync(resolved, "utf8");
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index <= 0) continue;
    const key = trimmed.slice(0, index).trim();
    const value = stripQuotes(trimmed.slice(index + 1).trim());
    out[key] = value;
  }
  return out;
}

function resolveDatabaseUrl(args) {
  if (args.databaseUrl) return args.databaseUrl;
  const fileEnv = args.envFile ? loadEnvFile(args.envFile) : {};
  const direct = fileEnv.DIRECT_URL || process.env.DIRECT_URL;
  const pooled = fileEnv.DATABASE_URL || process.env.DATABASE_URL;
  const url = direct || pooled;
  if (!url) {
    throw new Error(
      "Database URL required. Pass --database-url, --env-file, or export DIRECT_URL/DATABASE_URL."
    );
  }
  return url;
}

function ensureValidPool(pool) {
  if (!Object.values(CoachPool).includes(pool)) {
    throw new Error(`Invalid pool "${pool}". Must be one of: ${Object.values(CoachPool).join(", ")}`);
  }
}

function ensureDemoEmail(email) {
  if (!email.includes("@")) throw new Error("Invalid email");
  const domain = email.split("@")[1] || "";
  if (!domain.endsWith(".example") && !domain.endsWith("onusleadership.com")) {
    throw new Error("Demo coach email must use .example or approved internal domain");
  }
}

async function main() {
  const args = parseArgs(process.argv);
  ensureValidPool(args.pool);
  ensureDemoEmail(args.email);

  if (args.apply && args.linkDemoParticipants && !args.confirm) {
    throw new Error("Refusing to mutate demo engagements without --confirm");
  }

  const databaseUrl = resolveDatabaseUrl(args);
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  const organization = await prisma.organization.findUnique({
    where: { code: args.organizationCode },
    select: { id: true, code: true },
  });
  if (!organization) {
    throw new Error(`Organization not found for code: ${args.organizationCode}`);
  }

  const cohort = await prisma.cohort.findUnique({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: args.cohortCode,
      },
    },
    select: { id: true, code: true },
  });
  if (!cohort) {
    throw new Error(`Cohort not found for code: ${args.cohortCode}`);
  }

  const targetEngagements = await prisma.engagement.findMany({
    where: {
      cohortId: cohort.id,
      archivedAt: null,
      participant: {
        archivedAt: null,
        email: {
          endsWith: "@demo.usps.example",
        },
      },
    },
    select: {
      id: true,
      status: true,
      participant: {
        select: {
          email: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  if (targetEngagements.length > args.maxRows) {
    throw new Error(
      `Safety abort: ${targetEngagements.length} demo engagements matched in ${cohort.code}, above max-rows ${args.maxRows}`
    );
  }

  const summary = {
    mode: args.apply ? "apply" : "dry-run",
    organizationCode: organization.code,
    cohortCode: cohort.code,
    demoCoachEmail: args.email,
    demoCoachDisplayName: args.displayName,
    coachPool: args.pool,
    linkDemoParticipants: args.linkDemoParticipants,
    setCoachSelected: args.setCoachSelected,
    matchedDemoEngagements: targetEngagements.length,
    matchedDemoParticipants: targetEngagements.map((row) => row.participant.email),
    upserts: {
      user: "pending",
      coachProfile: "pending",
      organizationCoach: "pending",
      coachPoolMembership: "pending",
    },
    linkedEngagements: 0,
  };

  if (!args.apply) {
    await prisma.$disconnect();
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  const now = new Date();

  const user = await prisma.user.upsert({
    where: { email: args.email },
    update: {
      role: UserRole.COACH,
      active: true,
      archivedAt: null,
    },
    create: {
      email: args.email,
      role: UserRole.COACH,
      active: true,
      createdBy: "seed-demo-coach.mjs",
      updatedBy: "seed-demo-coach.mjs",
    },
    select: { id: true, email: true },
  });
  summary.upserts.user = "applied";

  const coachProfile = await prisma.coachProfile.upsert({
    where: { userId: user.id },
    update: {
      displayName: args.displayName,
      location: "Virtual",
      shortBio: "Demo coach account for staging magic-link and portal testing.",
      active: true,
      sourceFile: args.sourceFile,
      sourcePayload: {
        kind: "staging_demo_coach",
        demoBatch: args.demoBatch,
        managedByScript: "seed-demo-coach.mjs",
        updatedAtIso: new Date().toISOString(),
      },
      archivedAt: null,
      updatedBy: "seed-demo-coach.mjs",
    },
    create: {
      userId: user.id,
      displayName: args.displayName,
      location: "Virtual",
      shortBio: "Demo coach account for staging magic-link and portal testing.",
      active: true,
      sourceFile: args.sourceFile,
      sourcePayload: {
        kind: "staging_demo_coach",
        demoBatch: args.demoBatch,
        managedByScript: "seed-demo-coach.mjs",
        updatedAtIso: new Date().toISOString(),
      },
      createdBy: "seed-demo-coach.mjs",
      updatedBy: "seed-demo-coach.mjs",
    },
    select: { id: true },
  });
  summary.upserts.coachProfile = "applied";

  const organizationCoach = await prisma.organizationCoach.upsert({
    where: {
      organizationId_coachProfileId: {
        organizationId: organization.id,
        coachProfileId: coachProfile.id,
      },
    },
    update: {
      maxEngagements: args.maxEngagements,
      active: true,
      archivedAt: null,
      updatedBy: "seed-demo-coach.mjs",
    },
    create: {
      organization: { connect: { id: organization.id } },
      coachProfile: { connect: { id: coachProfile.id } },
      maxEngagements: args.maxEngagements,
      active: true,
      createdBy: "seed-demo-coach.mjs",
      updatedBy: "seed-demo-coach.mjs",
    },
    select: { id: true },
  });
  summary.upserts.organizationCoach = "applied";

  await prisma.coachPoolMembership.upsert({
    where: {
      organizationCoachId_pool: {
        organizationCoachId: organizationCoach.id,
        pool: args.pool,
      },
    },
    update: {
      archivedAt: null,
      updatedBy: "seed-demo-coach.mjs",
    },
    create: {
      organizationCoachId: organizationCoach.id,
      pool: args.pool,
      createdBy: "seed-demo-coach.mjs",
      updatedBy: "seed-demo-coach.mjs",
    },
  });
  summary.upserts.coachPoolMembership = "applied";

  if (args.linkDemoParticipants && targetEngagements.length > 0) {
    const engagementIds = targetEngagements.map((row) => row.id);

    const linkedCount = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`select pg_advisory_xact_lock(hashtext(${organizationCoach.id}))`;

      const updated = await tx.engagement.updateMany({
        where: {
          id: {
            in: engagementIds,
          },
        },
        data: {
          organizationCoachId: organizationCoach.id,
          ...(args.setCoachSelected
            ? {
                status: "COACH_SELECTED",
                coachSelectedAt: now,
                lastActivityAt: now,
              }
            : {}),
          statusVersion: {
            increment: 1,
          },
          updatedBy: "seed-demo-coach.mjs",
        },
      });

      return updated.count;
    });

    summary.linkedEngagements = linkedCount;
  }

  await prisma.$disconnect();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
