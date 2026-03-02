#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const ROOT = process.cwd();
const MAP_PATH = path.join(ROOT, "src", "lib", "wistia", "media-map.json");
const WISTIA_ID_PATTERN = /^[a-z0-9]{8,12}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function parseArgs(argv) {
  const args = {
    apply: false,
    envFile: null,
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
  const lines = raw.split(/\r?\n/);
  const parsed = {};

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = stripQuotes(trimmed.slice(idx + 1).trim());
    parsed[key] = value;
  }

  return parsed;
}

function loadValidatedMediaMap() {
  if (!fs.existsSync(MAP_PATH)) {
    throw new Error(`Missing mapping file: ${MAP_PATH}`);
  }

  const raw = fs.readFileSync(MAP_PATH, "utf8");
  const parsed = JSON.parse(raw);
  const normalized = new Map();

  for (const [emailRaw, mediaIdRaw] of Object.entries(parsed)) {
    const email = String(emailRaw).trim().toLowerCase();
    const mediaId = String(mediaIdRaw).trim();
    if (!EMAIL_PATTERN.test(email)) {
      throw new Error(`Invalid email key in media map: ${emailRaw}`);
    }
    if (!WISTIA_ID_PATTERN.test(mediaId)) {
      throw new Error(`Invalid media ID format for ${email}: ${mediaId}`);
    }
    normalized.set(email, mediaId);
  }

  return normalized;
}

async function main() {
  const args = parseArgs(process.argv);
  const fileEnv = args.envFile ? loadEnvFile(args.envFile) : {};
  const databaseUrl =
    fileEnv.DIRECT_URL ||
    process.env.DIRECT_URL ||
    fileEnv.DATABASE_URL ||
    process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DIRECT_URL or DATABASE_URL is required. Provide --env-file or export DIRECT_URL.");
  }

  const mapByEmail = loadValidatedMediaMap();
  const emails = [...mapByEmail.keys()];

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  const users = await prisma.user.findMany({
    where: {
      archivedAt: null,
      OR: emails.map((email) => ({
        email: { equals: email, mode: "insensitive" },
      })),
    },
    include: {
      coach: true,
    },
  });

  const usersByEmail = new Map(
    users.map((user) => [String(user.email).trim().toLowerCase(), user])
  );

  const missingProfiles = [];
  const pendingUpdates = [];
  let matchedProfiles = 0;
  let skippedAlreadySet = 0;

  for (const [email, mediaId] of mapByEmail.entries()) {
    const user = usersByEmail.get(email);
    if (!user?.coach) {
      missingProfiles.push(email);
      continue;
    }

    matchedProfiles += 1;

    if (user.coach.wistiaMediaId !== null) {
      skippedAlreadySet += 1;
      continue;
    }

    pendingUpdates.push({
      coachProfileId: user.coach.id,
      email,
      wistiaMediaId: mediaId,
    });
  }

  if (args.apply) {
    for (const update of pendingUpdates) {
      await prisma.coachProfile.update({
        where: { id: update.coachProfileId },
        data: { wistiaMediaId: update.wistiaMediaId },
      });
    }
  }

  const verifiedNonNullCount = await prisma.coachProfile.count({
    where: {
      wistiaMediaId: { not: null },
      archivedAt: null,
      active: true,
    },
  });

  const summary = {
    mode: args.apply ? "apply" : "dry-run",
    totalInMap: mapByEmail.size,
    matchedProfiles,
    updatedOrPending: pendingUpdates.length,
    skippedAlreadySet,
    missingProfiles,
    verifiedNonNullCount,
  };

  await prisma.$disconnect();
  console.log(JSON.stringify(summary, null, 2));
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  process.exit(1);
});
