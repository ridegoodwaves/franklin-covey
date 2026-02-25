#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const ROOT = process.cwd();
const ORG_CODE = "USPS";

const COHORTS_CSV = path.join(ROOT, "fc-assets", "normalized", "staging-cohorts.csv");
const COACHES_CSV = path.join(ROOT, "fc-assets", "normalized", "staging-coaches.csv");
const PARTICIPANTS_CSV = path.join(ROOT, "fc-assets", "normalized", "staging-participants.csv");

function parseArgs(argv) {
  const out = { adminEmails: [] };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--admin-emails") {
      const value = argv[i + 1] || "";
      out.adminEmails = value
        .split(",")
        .map((v) => v.trim().toLowerCase())
        .filter(Boolean);
      i += 1;
    }
  }
  return out;
}

function clean(value) {
  return String(value || "").replace(/\u00a0/g, " ").trim();
}

function parseCsv(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return [];

  const headers = lines[0].split(",").map((h) => clean(h));
  const rows = [];

  for (let i = 1; i < lines.length; i += 1) {
    const raw = lines[i];
    const cols = raw.split(",").map((v) => clean(v));
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = cols[idx] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

function toDate(value) {
  if (!value) return null;
  return new Date(`${value}T00:00:00.000Z`);
}

function addDays(dateValue, days) {
  if (!dateValue) return null;
  const d = new Date(dateValue);
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function programSeedRows(organizationId) {
  return [
    {
      organizationId,
      code: "MLP",
      name: "Managerial Leadership Program",
      track: "TWO_SESSION",
      defaultSessions: 2,
      pool: "MLP_ALP",
    },
    {
      organizationId,
      code: "ALP",
      name: "Advanced Leadership Program",
      track: "TWO_SESSION",
      defaultSessions: 2,
      pool: "MLP_ALP",
    },
    {
      organizationId,
      code: "EF",
      name: "Executive Foundations Program",
      track: "FIVE_SESSION",
      defaultSessions: 5,
      pool: "EF_EL",
    },
    {
      organizationId,
      code: "EL",
      name: "Executive Leadership Program",
      track: "FIVE_SESSION",
      defaultSessions: 5,
      pool: "EF_EL",
    },
  ];
}

async function seedOrganizationAndPrograms() {
  const org = await prisma.organization.upsert({
    where: { code: ORG_CODE },
    update: { name: "USPS", active: true },
    create: { code: ORG_CODE, name: "USPS", active: true },
  });

  for (const row of programSeedRows(org.id)) {
    await prisma.program.upsert({
      where: { organizationId_code: { organizationId: org.id, code: row.code } },
      update: {
        name: row.name,
        track: row.track,
        defaultSessions: row.defaultSessions,
        pool: row.pool,
        active: true,
      },
      create: row,
    });
  }

  return org;
}

async function seedCohorts(organizationId) {
  const rows = parseCsv(COHORTS_CSV);
  const programs = await prisma.program.findMany({ where: { organizationId } });
  const programByCode = new Map(programs.map((p) => [p.code, p]));

  for (const row of rows) {
    const program = programByCode.get(row.programCode);
    if (!program) continue;
    const coachSelectionStart = toDate(row.coachSelectionStart);
    const coachSelectionEnd = toDate(row.coachSelectionEnd) || addDays(coachSelectionStart, 19);

    await prisma.cohort.upsert({
      where: { organizationId_code: { organizationId, code: row.cohortCode } },
      update: {
        programId: program.id,
        coachSelectionStart,
        coachSelectionEnd,
        session1Start: toDate(row.session1Start),
        session1End: toDate(row.session1End),
        session2Start: toDate(row.session2Start),
        session2End: toDate(row.session2End),
        reportingWindowEnd: toDate(row.reportingWindowEnd),
      },
      create: {
        organization: { connect: { id: organizationId } },
        code: row.cohortCode,
        program: { connect: { id: program.id } },
        coachSelectionStart,
        coachSelectionEnd,
        session1Start: toDate(row.session1Start),
        session1End: toDate(row.session1End),
        session2Start: toDate(row.session2Start),
        session2End: toDate(row.session2End),
        reportingWindowEnd: toDate(row.reportingWindowEnd),
      },
    });
  }
}

async function seedCoaches(organizationId) {
  const rows = parseCsv(COACHES_CSV);

  for (const row of rows) {
    const user = await prisma.user.upsert({
      where: { email: row.email.toLowerCase() },
      update: { role: "COACH", active: true },
      create: { email: row.email.toLowerCase(), role: "COACH", active: true },
    });

    const coachProfile = await prisma.coachProfile.upsert({
      where: { userId: user.id },
      update: {
        displayName: row.displayName,
        bookingLinkPrimary: row.bookingLinkPrimary || null,
        bookingLinkSecondary: row.bookingLinkSecondary || null,
        sourceFile: row.sourceFile || null,
        active: true,
      },
      create: {
        userId: user.id,
        displayName: row.displayName,
        bookingLinkPrimary: row.bookingLinkPrimary || null,
        bookingLinkSecondary: row.bookingLinkSecondary || null,
        sourceFile: row.sourceFile || null,
        active: true,
      },
    });

    const membership = await prisma.organizationCoach.upsert({
      where: {
        organizationId_coachProfileId: {
          organizationId,
          coachProfileId: coachProfile.id,
        },
      },
      update: {
        maxEngagements: Number(row.maxEngagements || 20),
        active: true,
      },
      create: {
        organization: { connect: { id: organizationId } },
        coachProfile: { connect: { id: coachProfile.id } },
        maxEngagements: Number(row.maxEngagements || 20),
        active: true,
      },
    });

    const pool = row.linkMode === "dual" ? "EF_EL" : "MLP_ALP";
    await prisma.coachPoolMembership.upsert({
      where: {
        organizationCoachId_pool: {
          organizationCoachId: membership.id,
          pool,
        },
      },
      update: {},
      create: {
        organizationCoachId: membership.id,
        pool,
      },
    });
  }
}

async function seedParticipantsAndEngagements(organizationId) {
  const rows = parseCsv(PARTICIPANTS_CSV);

  const cohorts = await prisma.cohort.findMany({
    where: { organizationId },
    include: { program: true },
  });
  const cohortByCode = new Map(cohorts.map((c) => [c.code, c]));

  for (const row of rows) {
    const cohort = cohortByCode.get(row.cohortCode);
    if (!cohort) continue;

    const participant = await prisma.participant.upsert({
      where: {
        cohortId_email: {
          cohortId: cohort.id,
          email: row.email.toLowerCase(),
        },
      },
      update: {
        organizationId,
        sourceFile: row.sourceFile || null,
      },
      create: {
        email: row.email.toLowerCase(),
        organization: { connect: { id: organizationId } },
        cohort: { connect: { id: cohort.id } },
        sourceFile: row.sourceFile || null,
      },
    });

    await prisma.engagement.upsert({
      where: { participantId: participant.id },
      update: {
        organizationId,
        programId: cohort.programId,
        cohortId: cohort.id,
        totalSessions: cohort.program.defaultSessions,
        status: "INVITED",
      },
      create: {
        organization: { connect: { id: organizationId } },
        participant: { connect: { id: participant.id } },
        program: { connect: { id: cohort.programId } },
        cohort: { connect: { id: cohort.id } },
        totalSessions: cohort.program.defaultSessions,
        status: "INVITED",
      },
    });
  }
}

async function seedAdmins(adminEmails) {
  for (const email of adminEmails) {
    await prisma.user.upsert({
      where: { email },
      update: { role: "ADMIN", active: true },
      create: { email, role: "ADMIN", active: true },
    });
  }
}

async function main() {
  const args = parseArgs(process.argv);

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const org = await seedOrganizationAndPrograms();
  await seedCohorts(org.id);
  await seedCoaches(org.id);
  await seedParticipantsAndEngagements(org.id);
  await seedAdmins(args.adminEmails);

  const [programCount, cohortCount, coachCount, participantCount, engagementCount, adminCount] =
    await Promise.all([
      prisma.program.count({ where: { organizationId: org.id } }),
      prisma.cohort.count({ where: { organizationId: org.id } }),
      prisma.organizationCoach.count({ where: { organizationId: org.id } }),
      prisma.participant.count({ where: { organizationId: org.id } }),
      prisma.engagement.count({ where: { organizationId: org.id } }),
      prisma.user.count({ where: { role: "ADMIN" } }),
    ]);

  console.log(JSON.stringify({
    organization: ORG_CODE,
    programs: programCount,
    cohorts: cohortCount,
    coachMemberships: coachCount,
    participants: participantCount,
    engagements: engagementCount,
    admins: adminCount,
  }, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
