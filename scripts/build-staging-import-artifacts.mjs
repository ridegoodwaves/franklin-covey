#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const ORG_CODE = "USPS";

const PARTICIPANT_DIR = path.join(ROOT, "fc-assets", "participant-rosters");
const COACH_LINKS_FILE = path.join(
  ROOT,
  "fc-assets",
  "calendly-links",
  "USPS Coach Calendly and Emails - final 2-24 Sheet1.csv"
);
const COHORT_TIMELINE_FILE = path.join(
  ROOT,
  "fc-assets",
  "cohort-timelines",
  "FY26 Coaching Timelines_FranklinCovey-v3.md"
);
const BIO_DIRS = [
  path.join(ROOT, "fc-assets", "coach-bios", "Executive Coach Bios", "md"),
  path.join(ROOT, "fc-assets", "coach-bios", "MLP-ALP Coach Bios", "md"),
];
const OUTPUT_DIR = path.join(ROOT, "fc-assets", "normalized");

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function readUtf8(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function cleanText(value) {
  return String(value || "")
    .replace(/\u00a0/g, " ")
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim();
}

function normalizeEmail(email) {
  return cleanText(email).toLowerCase();
}

function normalizeName(name) {
  return cleanText(name).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function escapeCsv(value) {
  const input = String(value ?? "");
  if (input.includes(",") || input.includes("\n") || input.includes('"')) {
    return `"${input.replace(/"/g, '""')}"`;
  }
  return input;
}

function writeCsv(filePath, rows) {
  const lines = rows.map((row) => row.map(escapeCsv).join(","));
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function toIsoDate(dateValue) {
  const y = dateValue.getUTCFullYear();
  const m = String(dateValue.getUTCMonth() + 1).padStart(2, "0");
  const d = String(dateValue.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function parseUsDateToken(token, defaultYear = 2026) {
  const cleaned = cleanText(token).replace(/[.]/g, "");
  if (!cleaned) return null;

  const match = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  const shortMatch = cleaned.match(/^(\d{1,2})\/(\d{1,2})$/);

  let month;
  let day;
  let year;

  if (match) {
    month = Number(match[1]);
    day = Number(match[2]);
    year = Number(match[3]);
    if (year < 100) year += 2000;
  } else if (shortMatch) {
    month = Number(shortMatch[1]);
    day = Number(shortMatch[2]);
    year = defaultYear;
  } else {
    return null;
  }

  if (!month || !day || !year) return null;
  return new Date(Date.UTC(year, month - 1, day));
}

function parseDateRange(value) {
  const cleaned = cleanText(value)
    .replace(/\*/g, "")
    .replace(/\\/g, "")
    .replace(/[–—]/g, "-")
    .replace(/\s+/g, "");
  if (!cleaned) return { start: null, end: null };

  const parts = cleaned.split("-").filter(Boolean);
  if (parts.length === 1) {
    const start = parseUsDateToken(parts[0]);
    return { start, end: null };
  }

  const start = parseUsDateToken(parts[0]);
  const endYear = start ? start.getUTCFullYear() : 2026;
  const end = parseUsDateToken(parts[parts.length - 1], endYear);
  return { start, end };
}

function addMonthsUtc(dateValue, months) {
  if (!dateValue) return null;
  const d = new Date(Date.UTC(dateValue.getUTCFullYear(), dateValue.getUTCMonth(), dateValue.getUTCDate()));
  d.setUTCMonth(d.getUTCMonth() + months);
  return d;
}

function parseCohortFromFilename(name) {
  const filename = cleanText(name);
  const upper = filename.toUpperCase();

  const cohortNumberMatch = upper.match(/PROGRAM\s+(\d+)/);
  const cohortNumber = cohortNumberMatch ? cohortNumberMatch[1] : "";

  if (upper.includes("MANAGERIAL LEADERSHIP")) {
    return { programCode: "MLP", cohortCode: `MLP-${cohortNumber}` };
  }
  if (upper.includes("ADVANCED LEADERSHIP")) {
    return { programCode: "ALP", cohortCode: `ALP-${cohortNumber}` };
  }
  if (upper.includes("EXECUTIVE FOUNDATIONS")) {
    return { programCode: "EF", cohortCode: `EF-${cohortNumber}` };
  }
  if (upper.includes("EXECUTIVE LEADERSHIP")) {
    return { programCode: "EL", cohortCode: `EL-${cohortNumber}` };
  }

  return { programCode: "", cohortCode: "" };
}

function extractParticipants() {
  const files = fs
    .readdirSync(PARTICIPANT_DIR)
    .filter((file) => file.toLowerCase().endsWith(".md"))
    .sort();

  const participants = [];
  const duplicates = [];
  const seen = new Set();
  const byCohort = {};

  for (const file of files) {
    const fullPath = path.join(PARTICIPANT_DIR, file);
    const text = readUtf8(fullPath);
    const { programCode, cohortCode } = parseCohortFromFilename(file);

    const emailMatches = text.match(/\|\s*[^|@\s]+@[^|\s]+\s*\|/g) || [];
    let cohortCount = 0;

    for (const rawLine of emailMatches) {
      const emailRaw = rawLine.replace(/^\|/, "").replace(/\|$/, "");
      const email = normalizeEmail(emailRaw);
      if (!email || email === "email address") continue;

      const key = `${ORG_CODE}|${cohortCode}|${email}`;
      if (seen.has(key)) {
        duplicates.push({ file, cohortCode, email });
        continue;
      }

      seen.add(key);
      participants.push({
        organizationCode: ORG_CODE,
        programCode,
        cohortCode,
        email,
        sourceFile: file,
      });
      cohortCount += 1;
    }

    byCohort[cohortCode || file] = cohortCount;
  }

  return { participants, duplicates, byCohort, fileCount: files.length };
}

function extractCohorts() {
  const text = readUtf8(COHORT_TIMELINE_FILE);
  const lines = text.split(/\r?\n/);

  const cohorts = [];
  const warnings = [];
  let currentProgramCode = "";

  for (const lineRaw of lines) {
    const line = cleanText(lineRaw);
    if (!line) continue;

    if (line.includes("Managerial Leadership Program (MLP)")) currentProgramCode = "MLP";
    if (line.includes("Advanced Leadership Program (ALP)")) currentProgramCode = "ALP";
    if (line.includes("Executive Foundations Program (EF)")) currentProgramCode = "EF";
    if (line.includes("Executive Leadership Program (EL)")) currentProgramCode = "EL";

    if (!line.startsWith("|")) continue;
    if (!line.includes("**")) continue;

    const cols = line
      .split("|")
      .map((v) => cleanText(v))
      .filter((v) => v !== "");

    if (cols.length < 2) continue;

    const cohortNumber = cols[0].replace(/\*/g, "");
    if (!/^\d+$/.test(cohortNumber)) continue;

    const cohortCode = `${currentProgramCode}-${cohortNumber}`;
    const selectionRange = parseDateRange(cols[1]);
    const isTwoSession = currentProgramCode === "MLP" || currentProgramCode === "ALP";

    let session1 = { start: null, end: null };
    let session2 = { start: null, end: null };
    let reportingWindowEnd = null;

    if (isTwoSession) {
      session1 = parseDateRange(cols[3] || "");
      session2 = parseDateRange(cols[5] || "");
      reportingWindowEnd = session2.end;
    } else {
      reportingWindowEnd = addMonthsUtc(selectionRange.start, 9);
    }

    if (!selectionRange.end) {
      warnings.push(`${cohortCode}: missing coach selection end date in timeline source`);
    }

    cohorts.push({
      organizationCode: ORG_CODE,
      programCode: currentProgramCode,
      cohortCode,
      coachSelectionStart: selectionRange.start ? toIsoDate(selectionRange.start) : "",
      coachSelectionEnd: selectionRange.end ? toIsoDate(selectionRange.end) : "",
      session1Start: session1.start ? toIsoDate(session1.start) : "",
      session1End: session1.end ? toIsoDate(session1.end) : "",
      session2Start: session2.start ? toIsoDate(session2.start) : "",
      session2End: session2.end ? toIsoDate(session2.end) : "",
      reportingWindowEnd: reportingWindowEnd ? toIsoDate(reportingWindowEnd) : "",
      sourceFile: path.basename(COHORT_TIMELINE_FILE),
    });
  }

  return { cohorts, warnings };
}

function parsePlatform(url) {
  const cleaned = cleanText(url).replace(/^:\s*/, "");
  if (!cleaned) return "";
  try {
    const host = new URL(cleaned).hostname.toLowerCase();
    if (host.includes("calendly")) return "calendly";
    if (host.includes("acuityscheduling") || host.includes("as.me")) return "acuity";
    if (host.includes("tidycal")) return "tidycal";
    return host;
  } catch {
    return "invalid";
  }
}

function parseCoachLinks() {
  const text = readUtf8(COACH_LINKS_FILE);
  const rows = text.split(/\r?\n/);

  const coaches = [];
  const invalidRows = [];
  const duplicateEmails = [];
  const seen = new Set();

  for (let i = 0; i < rows.length; i += 1) {
    const raw = rows[i];
    if (!raw || !raw.trim()) continue;

    const cols = raw.split(",").map((value) => cleanText(value));
    if (cols.length < 3) continue;

    const displayName = cols[0];
    const email = normalizeEmail(cols[1]);
    const link1 = cleanText(cols[2]).replace(/^:\s*/, "");
    const link2 = cleanText(cols[3] || "").replace(/^:\s*/, "");

    if (!email.includes("@")) continue;

    if (seen.has(email)) {
      duplicateEmails.push({ row: i + 1, email, displayName });
      continue;
    }
    seen.add(email);

    const hasTwoLinks = Boolean(link1 && link2);
    const bookingLinkPrimary = link1;
    const bookingLinkSecondary = hasTwoLinks ? link2 : "";

    const isInvalidPrimary = bookingLinkPrimary && parsePlatform(bookingLinkPrimary) === "invalid";
    const isInvalidSecondary = bookingLinkSecondary && parsePlatform(bookingLinkSecondary) === "invalid";

    if (isInvalidPrimary || isInvalidSecondary) {
      invalidRows.push({
        row: i + 1,
        email,
        displayName,
        bookingLinkPrimary,
        bookingLinkSecondary,
      });
    }

    coaches.push({
      organizationCode: ORG_CODE,
      displayName,
      email,
      bookingLinkPrimary,
      bookingLinkSecondary,
      defaultVisibleLink: bookingLinkPrimary,
      maxEngagements: 20,
      sourceFile: path.basename(COACH_LINKS_FILE),
      linkMode: hasTwoLinks ? "dual" : "single",
      primaryPlatform: parsePlatform(bookingLinkPrimary),
      secondaryPlatform: parsePlatform(bookingLinkSecondary),
    });
  }

  return { coaches, invalidRows, duplicateEmails };
}

function parseBioNames() {
  const names = [];

  for (const dir of BIO_DIRS) {
    if (!fs.existsSync(dir)) continue;

    const files = fs
      .readdirSync(dir)
      .filter((file) => file.toLowerCase().endsWith(".md"))
      .sort();

    for (const file of files) {
      const text = readUtf8(path.join(dir, file));
      let extracted = "";

      const lines = text.split(/\r?\n/).map(cleanText).filter(Boolean);
      for (const line of lines.slice(0, 8)) {
        if (/^#\s+[A-Za-z]/.test(line)) {
          extracted = cleanText(line.replace(/^#+\s*/, ""));
          if (!/executive coach|senior consultant/i.test(extracted)) break;
        }
      }

      if (!extracted) {
        const fromFilename = file
          .replace(/\.md$/i, "")
          .replace(/^FCEC Bio\s*-\s*/i, "")
          .replace(/^FCEC Bio\s+/i, "")
          .replace(/\s*\(\d+\)\s*/g, "")
          .trim();
        extracted = fromFilename;
      }

      names.push({
        displayName: extracted,
        normalized: normalizeName(extracted),
        sourceFile: file,
      });
    }
  }

  return names;
}

function buildQaSummary(participantData, coachData, bioNames, cohortData) {
  const bioIndex = new Map();
  for (const bio of bioNames) {
    if (!bio.normalized) continue;
    if (!bioIndex.has(bio.normalized)) bioIndex.set(bio.normalized, []);
    bioIndex.get(bio.normalized).push(bio.sourceFile);
  }

  const missingBioMatches = [];
  for (const coach of coachData.coaches) {
    const key = normalizeName(coach.displayName);
    if (!bioIndex.has(key)) {
      missingBioMatches.push({
        displayName: coach.displayName,
        email: coach.email,
      });
    }
  }

  const singleLinkCount = coachData.coaches.filter((c) => c.linkMode === "single").length;
  const dualLinkCount = coachData.coaches.filter((c) => c.linkMode === "dual").length;

  return {
    cohorts: {
      totalRows: cohortData.cohorts.length,
      warnings: cohortData.warnings,
    },
    participants: {
      fileCount: participantData.fileCount,
      totalRows: participantData.participants.length,
      duplicateRows: participantData.duplicates.length,
      byCohort: participantData.byCohort,
    },
    coaches: {
      totalRows: coachData.coaches.length,
      duplicateEmails: coachData.duplicateEmails,
      invalidRows: coachData.invalidRows,
      singleLinkCount,
      dualLinkCount,
      missingBioMatches,
    },
  };
}

function writeQaMarkdown(filePath, summary) {
  const lines = [];
  lines.push("# Staging Import QA Report");
  lines.push("");
  lines.push(`- Generated: ${new Date().toISOString()}`);
  lines.push(`- Organization: ${ORG_CODE}`);
  lines.push("");

  lines.push("## Cohort Snapshot");
  lines.push("");
  lines.push(`- Total cohort rows: ${summary.cohorts.totalRows}`);
  lines.push(`- Timeline warnings: ${summary.cohorts.warnings.length}`);
  if (summary.cohorts.warnings.length > 0) {
    lines.push("");
    lines.push("### Cohort Timeline Warnings");
    lines.push("");
    for (const warning of summary.cohorts.warnings) {
      lines.push(`- ${warning}`);
    }
  }
  lines.push("");

  lines.push("## Participant Snapshot");
  lines.push("");
  lines.push(`- Source files: ${summary.participants.fileCount}`);
  lines.push(`- Total participant rows: ${summary.participants.totalRows}`);
  lines.push(`- Duplicate participant rows: ${summary.participants.duplicateRows}`);
  lines.push("");
  lines.push("### Participant Counts by Cohort");
  lines.push("");
  lines.push("| Cohort | Count |");
  lines.push("|---|---:|");
  for (const [cohort, count] of Object.entries(summary.participants.byCohort)) {
    lines.push(`| ${cohort} | ${count} |`);
  }
  lines.push("");

  lines.push("## Coach Snapshot");
  lines.push("");
  lines.push(`- Total coach rows: ${summary.coaches.totalRows}`);
  lines.push(`- Single-link coaches: ${summary.coaches.singleLinkCount}`);
  lines.push(`- Dual-link coaches: ${summary.coaches.dualLinkCount}`);
  lines.push(`- Duplicate coach emails: ${summary.coaches.duplicateEmails.length}`);
  lines.push(`- Invalid booking-link rows: ${summary.coaches.invalidRows.length}`);
  lines.push("");

  lines.push("### Coach Names Missing Bio Match");
  lines.push("");
  if (summary.coaches.missingBioMatches.length === 0) {
    lines.push("- None");
  } else {
    for (const item of summary.coaches.missingBioMatches) {
      lines.push(`- ${item.displayName} (${item.email})`);
    }
  }
  lines.push("");

  fs.writeFileSync(filePath, `${lines.join("\n")}\n`, "utf8");
}

function main() {
  ensureDir(OUTPUT_DIR);

  const cohortData = extractCohorts();
  const participantData = extractParticipants();
  const coachData = parseCoachLinks();
  const bioNames = parseBioNames();
  const summary = buildQaSummary(participantData, coachData, bioNames, cohortData);

  writeCsv(path.join(OUTPUT_DIR, "staging-cohorts.csv"), [
    [
      "organizationCode",
      "programCode",
      "cohortCode",
      "coachSelectionStart",
      "coachSelectionEnd",
      "session1Start",
      "session1End",
      "session2Start",
      "session2End",
      "reportingWindowEnd",
      "sourceFile",
    ],
    ...cohortData.cohorts.map((c) => [
      c.organizationCode,
      c.programCode,
      c.cohortCode,
      c.coachSelectionStart,
      c.coachSelectionEnd,
      c.session1Start,
      c.session1End,
      c.session2Start,
      c.session2End,
      c.reportingWindowEnd,
      c.sourceFile,
    ]),
  ]);

  writeCsv(path.join(OUTPUT_DIR, "staging-participants.csv"), [
    ["organizationCode", "programCode", "cohortCode", "email", "sourceFile"],
    ...participantData.participants.map((p) => [
      p.organizationCode,
      p.programCode,
      p.cohortCode,
      p.email,
      p.sourceFile,
    ]),
  ]);

  writeCsv(path.join(OUTPUT_DIR, "staging-coaches.csv"), [
    [
      "organizationCode",
      "displayName",
      "email",
      "bookingLinkPrimary",
      "bookingLinkSecondary",
      "defaultVisibleLink",
      "maxEngagements",
      "linkMode",
      "primaryPlatform",
      "secondaryPlatform",
      "sourceFile",
    ],
    ...coachData.coaches.map((c) => [
      c.organizationCode,
      c.displayName,
      c.email,
      c.bookingLinkPrimary,
      c.bookingLinkSecondary,
      c.defaultVisibleLink,
      String(c.maxEngagements),
      c.linkMode,
      c.primaryPlatform,
      c.secondaryPlatform,
      c.sourceFile,
    ]),
  ]);

  fs.writeFileSync(
    path.join(OUTPUT_DIR, "staging-import-summary.json"),
    `${JSON.stringify(summary, null, 2)}\n`,
    "utf8"
  );

  writeQaMarkdown(path.join(OUTPUT_DIR, "staging-import-qa.md"), summary);

  console.log("Wrote artifacts:");
  console.log(`- ${path.relative(ROOT, path.join(OUTPUT_DIR, "staging-cohorts.csv"))}`);
  console.log(`- ${path.relative(ROOT, path.join(OUTPUT_DIR, "staging-participants.csv"))}`);
  console.log(`- ${path.relative(ROOT, path.join(OUTPUT_DIR, "staging-coaches.csv"))}`);
  console.log(`- ${path.relative(ROOT, path.join(OUTPUT_DIR, "staging-import-summary.json"))}`);
  console.log(`- ${path.relative(ROOT, path.join(OUTPUT_DIR, "staging-import-qa.md"))}`);
}

main();
