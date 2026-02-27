#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { PrismaClient } from "@prisma/client";

const ROOT = process.cwd();
const BIO_DIRS = [
  path.join(ROOT, "fc-assets", "coach-bios", "Executive Coach Bios", "md"),
  path.join(ROOT, "fc-assets", "coach-bios", "MLP-ALP Coach Bios", "md"),
];

const NAME_ALIASES = {
  "missy mcnabb": "moira mcnabb",
  "didier perrileux": "didier perilleux",
  "heather vassilev": "heather tibbles vassilev",
};

function parseArgs(argv) {
  const args = { apply: false };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i] === "--apply") {
      args.apply = true;
    }
  }
  return args;
}

function clean(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[\t ]+/g, " ")
    .trim();
}

function normalizeName(value) {
  return clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function titleCaseName(value) {
  return clean(value)
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0].toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function deriveNameFromFilename(fileName) {
  const base = clean(
    fileName
      .replace(/\.md$/i, "")
      .replace(/^FCEC\s*BI?o\s*-\s*/i, "")
      .replace(/\.pdf/gi, "")
      .replace(/\s*\(\d+\)\s*$/g, "")
  );

  if (!base.includes(" ") && /[a-z][A-Z]/.test(base)) {
    return clean(base.replace(/([a-z])([A-Z])/g, "$1 $2"));
  }

  return base;
}

function stripHeadingMarkers(value) {
  return clean(
    value
      .replace(/^#+\s*/, "")
      .replace(/\*+/g, "")
      .replace(/\s{2,}/g, " ")
  );
}

function parseSectionLines(text) {
  const lines = text.split(/\r?\n/);
  const sections = {
    intro: [],
    highlights: [],
    education: [],
  };

  let section = "intro";
  let location = "";

  for (const raw of lines) {
    const line = clean(raw);
    if (!line) continue;

    if (/^#{2,}/.test(line)) {
      const heading = stripHeadingMarkers(line).toLowerCase();

      if (heading.includes("what clients say") || heading.includes("what learners say")) {
        break;
      }

      if (heading.includes("highlights")) {
        section = "highlights";
        continue;
      }

      if (heading.includes("education") && heading.includes("certification")) {
        section = "education";
        continue;
      }

      if (!location && /^#{3,}/.test(line)) {
        const candidate = stripHeadingMarkers(line);
        const lower = candidate.toLowerCase();
        if (
          !lower.includes("coach") &&
          !lower.includes("consultant") &&
          !lower.includes("highlights") &&
          !lower.includes("education")
        ) {
          location = candidate;
        }
      }

      continue;
    }

    if (/^\*+"?/.test(line)) {
      continue;
    }

    sections[section].push(line);
  }

  return { location, sections };
}

function toSentences(lines) {
  const text = clean(lines.join(" "));
  if (!text) return [];

  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => clean(s))
    .filter((s) => s.length >= 40 && s.length <= 360);
}

function buildShortBio(introLines, highlightLines) {
  const introSentences = toSentences(introLines);
  const highlightSentences = toSentences(highlightLines);

  const merged = [...introSentences, ...highlightSentences];
  const deduped = [];
  const seen = new Set();

  for (const sentence of merged) {
    const key = sentence.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(sentence);
    if (deduped.length >= 2) break;
  }

  const shortBio = clean(deduped.join(" "));
  return shortBio || null;
}

function splitSegments(lines) {
  const segments = [];
  for (const line of lines) {
    const parts = line
      .split("•")
      .map((part) => clean(part))
      .filter(Boolean);
    segments.push(...parts);
  }
  return segments;
}

function buildHighlights(highlightLines) {
  const segments = splitSegments(highlightLines)
    .map((segment) => segment.replace(/^[-*]\s*/, ""))
    .filter((segment) => segment.length >= 24 && segment.length <= 200)
    .filter((segment) => !segment.toLowerCase().includes("what clients say"));

  const deduped = [];
  const seen = new Set();

  for (const segment of segments) {
    const key = segment.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(segment);
    if (deduped.length >= 4) break;
  }

  return deduped;
}

function buildCertifications(educationLines, highlightLines) {
  const keyword = /(certif|pcc|acc|mcc|cpcc|mba|m\.b\.a|m\.a|b\.a|j\.d|phd|ed\.d|university|icf|coach)/i;
  const candidates = [...splitSegments(educationLines), ...splitSegments(highlightLines)]
    .map((segment) => segment.replace(/^[-*]\s*/, ""))
    .filter((segment) => segment.length >= 8 && segment.length <= 220)
    .filter((segment) => keyword.test(segment));

  const deduped = [];
  const seen = new Set();

  for (const segment of candidates) {
    const key = segment.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(segment);
    if (deduped.length >= 6) break;
  }

  return deduped;
}

function parseBioFile(filePath) {
  const fileName = path.basename(filePath);
  const raw = fs.readFileSync(filePath, "utf8");
  const { location, sections } = parseSectionLines(raw);

  const displayName = deriveNameFromFilename(fileName);
  const shortBio = buildShortBio(sections.intro, sections.highlights);
  const highlights = buildHighlights(sections.highlights);
  const certifications = buildCertifications(sections.education, sections.highlights);

  return {
    fileName,
    filePath,
    displayName,
    normalizedName: normalizeName(displayName),
    location: location || null,
    shortBio,
    highlights,
    certifications,
  };
}

function loadBios() {
  const entries = [];
  for (const dir of BIO_DIRS) {
    if (!fs.existsSync(dir)) continue;
    const files = fs
      .readdirSync(dir)
      .filter((file) => file.toLowerCase().endsWith(".md"))
      .sort();

    for (const file of files) {
      entries.push(parseBioFile(path.join(dir, file)));
    }
  }
  return entries;
}

function resolveBioForCoach(coachDisplayName, biosByNormalizedName) {
  const normalizedCoachName = normalizeName(coachDisplayName);
  const aliasName = NAME_ALIASES[normalizedCoachName] || null;

  if (biosByNormalizedName.has(normalizedCoachName)) {
    return biosByNormalizedName.get(normalizedCoachName);
  }

  if (aliasName && biosByNormalizedName.has(aliasName)) {
    return biosByNormalizedName.get(aliasName);
  }

  return null;
}

async function main() {
  const args = parseArgs(process.argv);

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required");
  }

  const bios = loadBios();
  const biosByNormalizedName = new Map();
  for (const bio of bios) {
    if (!bio.normalizedName) continue;
    if (!biosByNormalizedName.has(bio.normalizedName)) {
      biosByNormalizedName.set(bio.normalizedName, bio);
    }
  }

  const prisma = new PrismaClient();

  const coaches = await prisma.coachProfile.findMany({
    where: { archivedAt: null, active: true },
    include: {
      user: { select: { email: true } },
      highlights: { where: { archivedAt: null } },
      certifications: { where: { archivedAt: null } },
    },
    orderBy: { displayName: "asc" },
  });

  const unmatched = [];
  const updates = [];

  for (const coach of coaches) {
    const bio = resolveBioForCoach(coach.displayName, biosByNormalizedName);
    if (!bio) {
      unmatched.push({ displayName: coach.displayName, email: coach.user.email });
      continue;
    }

    updates.push({
      coachProfileId: coach.id,
      displayName: coach.displayName,
      email: coach.user.email,
      sourceFile: bio.fileName,
      location: bio.location,
      shortBio: bio.shortBio,
      highlightCount: bio.highlights.length,
      certificationCount: bio.certifications.length,
      highlights: bio.highlights,
      certifications: bio.certifications,
    });
  }

  if (args.apply) {
    for (const update of updates) {
      await prisma.$transaction(async (tx) => {
        await tx.coachProfile.update({
          where: { id: update.coachProfileId },
          data: {
            location: update.location,
            shortBio: update.shortBio,
            sourceFile: update.sourceFile,
          },
        });

        await tx.coachHighlight.deleteMany({
          where: { coachProfileId: update.coachProfileId },
        });

        if (update.highlights.length > 0) {
          await tx.coachHighlight.createMany({
            data: update.highlights.map((text, index) => ({
              coachProfileId: update.coachProfileId,
              sortOrder: index,
              text,
            })),
          });
        }

        await tx.coachCertification.deleteMany({
          where: { coachProfileId: update.coachProfileId },
        });

        if (update.certifications.length > 0) {
          await tx.coachCertification.createMany({
            data: update.certifications.map((text, index) => ({
              coachProfileId: update.coachProfileId,
              sortOrder: index,
              text,
            })),
          });
        }
      });
    }
  }

  await prisma.$disconnect();

  console.log(
    JSON.stringify(
      {
        mode: args.apply ? "apply" : "dry-run",
        bioFilesLoaded: bios.length,
        activeCoaches: coaches.length,
        matched: updates.length,
        unmatchedCount: unmatched.length,
        unmatched,
        sampleUpdates: updates.slice(0, 8).map((u) => ({
          displayName: u.displayName,
          email: u.email,
          sourceFile: u.sourceFile,
          hasShortBio: Boolean(u.shortBio),
          location: u.location,
          highlightCount: u.highlightCount,
          certificationCount: u.certificationCount,
        })),
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
