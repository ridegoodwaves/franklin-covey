#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const ROOT = process.cwd();
const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULTS = {
  organizationCode: "USPS",
  programCode: "ALP",
  cohortCode: "USPS-DEMO-RECORDING-2026-03",
  count: 5,
  emailPrefix: "iamclient",
  emailDomain: "demo.usps.example",
  sourceFile: "staging-demo-participants",
  demoBatch: "usps-recording-2026-03-02",
};

function parseArgs(argv) {
  const args = {
    apply: false,
    envFile: null,
    organizationCode: DEFAULTS.organizationCode,
    programCode: DEFAULTS.programCode,
    cohortCode: DEFAULTS.cohortCode,
    count: DEFAULTS.count,
    emailPrefix: DEFAULTS.emailPrefix,
    emailDomain: DEFAULTS.emailDomain,
    sourceFile: DEFAULTS.sourceFile,
    demoBatch: DEFAULTS.demoBatch,
  };

  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];

    if (token === "--apply") {
      args.apply = true;
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
    if (token === "--program-code") {
      args.programCode = String(argv[i + 1] || args.programCode).trim().toUpperCase();
      i += 1;
      continue;
    }
    if (token === "--cohort-code") {
      args.cohortCode = String(argv[i + 1] || args.cohortCode).trim();
      i += 1;
      continue;
    }
    if (token === "--count") {
      const parsed = Number(argv[i + 1]);
      if (Number.isFinite(parsed)) {
        args.count = Math.floor(parsed);
      }
      i += 1;
      continue;
    }
    if (token === "--email-prefix") {
      args.emailPrefix = String(argv[i + 1] || args.emailPrefix).trim().toLowerCase();
      i += 1;
      continue;
    }
    if (token === "--email-domain") {
      args.emailDomain = String(argv[i + 1] || args.emailDomain).trim().toLowerCase();
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

function buildDemoEmails(prefix, domain, count) {
  const emails = [];
  for (let i = 1; i <= count; i += 1) {
    emails.push(`${prefix}${i}@${domain}`);
  }
  return emails;
}

function toIsoDate(dateValue) {
  return new Date(dateValue).toISOString();
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.count < 1 || args.count > 5) {
    throw new Error("count must be between 1 and 5");
  }
  if (!args.emailDomain.endsWith(".example")) {
    throw new Error("email-domain must use a reserved .example domain");
  }

  const databaseUrl = resolveDatabaseUrl(args);
  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  const now = new Date();
  const coachSelectionStart = new Date(now.getTime() - DAY_MS);
  const coachSelectionEnd = new Date(now.getTime() + 180 * DAY_MS);

  const organization = await prisma.organization.findUnique({
    where: { code: args.organizationCode },
    select: { id: true, code: true, name: true },
  });
  if (!organization) {
    throw new Error(`Organization not found for code: ${args.organizationCode}`);
  }

  const program = await prisma.program.findUnique({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: args.programCode,
      },
    },
    select: { id: true, code: true, defaultSessions: true },
  });
  if (!program) {
    throw new Error(`Program not found for code: ${args.programCode}`);
  }

  let cohort = await prisma.cohort.findUnique({
    where: {
      organizationId_code: {
        organizationId: organization.id,
        code: args.cohortCode,
      },
    },
    select: { id: true, code: true },
  });

  const emails = buildDemoEmails(args.emailPrefix, args.emailDomain, args.count);
  const summary = {
    mode: args.apply ? "apply" : "dry-run",
    organizationCode: organization.code,
    programCode: program.code,
    cohortCode: args.cohortCode,
    sourceFile: args.sourceFile,
    demoBatch: args.demoBatch,
    coachSelectionStart: toIsoDate(coachSelectionStart),
    coachSelectionEnd: toIsoDate(coachSelectionEnd),
    emails,
    cohortAction: "none",
    participantsCreated: 0,
    participantsUpdated: 0,
    engagementsCreated: 0,
    engagementsUpdated: 0,
    engagementStatuses: {},
  };

  if (!cohort) {
    summary.cohortAction = "create";
    if (args.apply) {
      cohort = await prisma.cohort.create({
        data: {
          organization: { connect: { id: organization.id } },
          program: { connect: { id: program.id } },
          code: args.cohortCode,
          coachSelectionStart,
          coachSelectionEnd,
          active: true,
        },
        select: { id: true, code: true },
      });
    }
  } else {
    summary.cohortAction = "update";
    if (args.apply) {
      await prisma.cohort.update({
        where: { id: cohort.id },
        data: {
          programId: program.id,
          coachSelectionStart,
          coachSelectionEnd,
          active: true,
        },
      });
    }
  }

  if (!cohort) {
    summary.participantsCreated = emails.length;
    summary.engagementsCreated = emails.length;
    await prisma.$disconnect();
    console.log(JSON.stringify(summary, null, 2));
    return;
  }

  for (let index = 0; index < emails.length; index += 1) {
    const email = emails[index];
    const existingParticipant = await prisma.participant.findUnique({
      where: {
        cohortId_email: {
          cohortId: cohort.id,
          email,
        },
      },
      select: { id: true },
    });

    const payload = {
      kind: "staging_demo_participant",
      demoBatch: args.demoBatch,
      demoIndex: index + 1,
      managedByScript: "seed-demo-participants.mjs",
      updatedAtIso: new Date().toISOString(),
    };

    let participantId = existingParticipant?.id || null;
    if (args.apply) {
      if (existingParticipant) {
        const updated = await prisma.participant.update({
          where: { id: existingParticipant.id },
          data: {
            organizationId: organization.id,
            cohortId: cohort.id,
            sourceFile: args.sourceFile,
            sourcePayload: payload,
            archivedAt: null,
          },
          select: { id: true },
        });
        participantId = updated.id;
        summary.participantsUpdated += 1;
      } else {
        const created = await prisma.participant.create({
          data: {
            email,
            organization: { connect: { id: organization.id } },
            cohort: { connect: { id: cohort.id } },
            sourceFile: args.sourceFile,
            sourcePayload: payload,
          },
          select: { id: true },
        });
        participantId = created.id;
        summary.participantsCreated += 1;
      }
    } else {
      if (existingParticipant) {
        summary.participantsUpdated += 1;
        participantId = existingParticipant.id;
      } else {
        summary.participantsCreated += 1;
      }
    }

    if (!participantId) continue;

    const existingEngagement = await prisma.engagement.findUnique({
      where: { participantId },
      select: { id: true, status: true },
    });

    if (args.apply) {
      if (existingEngagement) {
        await prisma.engagement.update({
          where: { id: existingEngagement.id },
          data: {
            organizationId: organization.id,
            programId: program.id,
            cohortId: cohort.id,
            totalSessions: program.defaultSessions,
            archivedAt: null,
          },
        });
        summary.engagementsUpdated += 1;
      } else {
        await prisma.engagement.create({
          data: {
            organization: { connect: { id: organization.id } },
            participant: { connect: { id: participantId } },
            program: { connect: { id: program.id } },
            cohort: { connect: { id: cohort.id } },
            status: "INVITED",
            totalSessions: program.defaultSessions,
          },
        });
        summary.engagementsCreated += 1;
      }
    } else if (existingEngagement) {
      summary.engagementsUpdated += 1;
    } else {
      summary.engagementsCreated += 1;
    }
  }

  const statusRows = await prisma.engagement.groupBy({
    by: ["status"],
    where: {
      cohortId: cohort.id,
      archivedAt: null,
    },
    _count: {
      _all: true,
    },
  });

  for (const row of statusRows) {
    summary.engagementStatuses[row.status] = row._count._all;
  }

  summary.cohortId = cohort.id;
  summary.demoParticipantsInCohort = await prisma.participant.count({
    where: {
      cohortId: cohort.id,
      archivedAt: null,
    },
  });

  await prisma.$disconnect();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
