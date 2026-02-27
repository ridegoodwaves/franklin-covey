#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const ROOT = process.cwd();
const MAP_PATH = path.join(ROOT, "src", "lib", "headshots", "generated-map.json");

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

function loadPhotoMap() {
  if (!fs.existsSync(MAP_PATH)) {
    throw new Error(`Missing mapping file: ${MAP_PATH}`);
  }

  const raw = fs.readFileSync(MAP_PATH, "utf8");
  const parsed = JSON.parse(raw);
  return new Map(
    Object.entries(parsed).map(([email, photoPath]) => [
      String(email).toLowerCase(),
      String(photoPath),
    ])
  );
}

async function main() {
  const args = parseArgs(process.argv);

  const fileEnv = args.envFile ? loadEnvFile(args.envFile) : {};
  const databaseUrl = fileEnv.DATABASE_URL || process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required. Provide --env-file or export DATABASE_URL.");
  }

  const prisma = new PrismaClient({
    datasources: {
      db: {
        url: databaseUrl,
      },
    },
  });

  const mapByEmail = loadPhotoMap();
  const emails = [...mapByEmail.keys()];

  const users = await prisma.user.findMany({
    where: {
      email: {
        in: emails,
      },
      archivedAt: null,
    },
    include: {
      coach: true,
    },
  });

  const updates = [];
  const missingCoachProfile = [];

  for (const user of users) {
    const targetPath = mapByEmail.get(user.email.toLowerCase());
    if (!targetPath) continue;

    if (!user.coach) {
      missingCoachProfile.push(user.email);
      continue;
    }

    if (user.coach.photoPath !== targetPath) {
      updates.push({
        coachProfileId: user.coach.id,
        email: user.email,
        previousPhotoPath: user.coach.photoPath,
        nextPhotoPath: targetPath,
      });
    }
  }

  if (args.apply) {
    for (const update of updates) {
      await prisma.coachProfile.update({
        where: { id: update.coachProfileId },
        data: { photoPath: update.nextPhotoPath },
      });
    }
  }

  await prisma.$disconnect();

  console.log(
    JSON.stringify(
      {
        mode: args.apply ? "apply" : "dry-run",
        mappedEmails: emails.length,
        matchedUsers: users.length,
        updatedOrPending: updates.length,
        missingCoachProfileCount: missingCoachProfile.length,
        missingCoachProfile,
        sampleUpdates: updates.slice(0, 10),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
