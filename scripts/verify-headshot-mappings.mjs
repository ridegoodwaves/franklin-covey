#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const COACHES_CSV = path.join(ROOT, "fc-assets", "normalized", "staging-coaches.csv");
const EXEC_LOCAL_DIR = path.join(ROOT, "fc-assets", "coach-bios", "Executive Coach Bios", "headshots");
const MLP_LOCAL_DIR = path.join(ROOT, "fc-assets", "coach-bios", "MLP-ALP Coach Bios", "headshots");

const EXEC_BUCKET_PREFIX = "executive-coach-photos";
const MLP_BUCKET_PREFIX = "mlp-alp-coach-photos";

const GENERATED_MAP_PATH = path.join(ROOT, "src", "lib", "headshots", "generated-map.json");
const REPORT_PATH = path.join(ROOT, "fc-assets", "normalized", "staging-headshot-mapping-report.md");

const FIRST_NAME_ALIASES = {
  missy: ["moira"],
};

const LAST_NAME_ALIASES = {
  perrileux: ["perilleux"],
  perilleux: ["perrileux"],
};

function slugify(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function clean(value) {
  return String(value || "").replace(/\u00a0/g, " ").trim();
}

function parseCsv(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const lines = raw.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => clean(h));
  return lines.slice(1).map((line) => {
    const cols = line.split(",").map((v) => clean(v));
    const row = {};
    headers.forEach((header, idx) => {
      row[header] = cols[idx] ?? "";
    });
    return row;
  });
}

function listHeadshots(localDir, bucketPrefix) {
  const files = fs
    .readdirSync(localDir)
    .filter((name) => /\.(png|jpe?g|webp)$/i.test(name))
    .sort((a, b) => a.localeCompare(b));

  return files.map((fileName) => ({
    fileName,
    slug: slugify(fileName.replace(/\.[^.]+$/, "")),
    path: `${bucketPrefix}/${fileName}`,
  }));
}

function getCoachPoolAndPrefix(row) {
  const linkMode = String(row.linkMode || "").toLowerCase();
  if (linkMode === "dual") {
    return { pool: "EF_EL", prefix: EXEC_BUCKET_PREFIX };
  }
  return { pool: "MLP_ALP", prefix: MLP_BUCKET_PREFIX };
}

function pushCandidate(target, value) {
  const slug = slugify(value);
  if (!slug) return;
  if (!target.includes(slug)) target.push(slug);
}

function candidateSlugs(displayName, email) {
  const candidates = [];
  const localPart = String(email || "").split("@")[0] || "";
  const nameTokens = slugify(displayName)
    .split("-")
    .filter(Boolean)
    .filter((token) => !["dr", "mr", "mrs", "ms"].includes(token));

  pushCandidate(candidates, localPart);
  pushCandidate(candidates, localPart.replace(/[._]/g, "-"));
  pushCandidate(candidates, displayName);

  if (nameTokens.length >= 2) {
    const first = nameTokens[0];
    const last = nameTokens[nameTokens.length - 1];
    pushCandidate(candidates, `${first}-${last}`);
    pushCandidate(candidates, `${first[0]}-${last}`);

    const aliases = FIRST_NAME_ALIASES[first] || [];
    for (const alias of aliases) {
      pushCandidate(candidates, `${alias}-${last}`);
    }
  }

  return candidates;
}

function candidateNamePairs(displayName, email) {
  const pairs = [];
  const localPart = String(email || "")
    .split("@")[0]
    .replace(/[._]/g, "-");

  const fromDisplay = slugify(displayName)
    .split("-")
    .filter(Boolean)
    .filter((token) => !["dr", "mr", "mrs", "ms"].includes(token));
  const fromLocal = slugify(localPart).split("-").filter(Boolean);

  const sources = [fromDisplay, fromLocal];
  for (const tokens of sources) {
    if (tokens.length < 2) continue;
    const first = tokens[0];
    const last = tokens[tokens.length - 1];
    pairs.push([first, last]);
    const lastAliases = LAST_NAME_ALIASES[last] || [];
    for (const alias of lastAliases) {
      pairs.push([first, alias]);
    }
  }

  return pairs;
}

function matchHeadshot(entries, displayName, email) {
  const candidates = candidateSlugs(displayName, email);

  for (const candidate of candidates) {
    const exact = entries.find((entry) => entry.slug === candidate);
    if (exact) return { match: exact, reason: `exact:${candidate}` };
  }

  for (const candidate of candidates) {
    const contains = entries.find((entry) => entry.slug.includes(candidate));
    if (contains) return { match: contains, reason: `contains:${candidate}` };
  }

  const pairs = candidateNamePairs(displayName, email);
  for (const [first, last] of pairs) {
    const firstLast = entries.find((entry) => {
      const tokens = entry.slug.split("-").filter(Boolean);
      if (tokens.length < 2) return false;
      return tokens[0] === first && tokens[tokens.length - 1] === last;
    });
    if (firstLast) return { match: firstLast, reason: `first-last:${first}-${last}` };
  }

  return { match: null, reason: "none" };
}

function main() {
  const rows = parseCsv(COACHES_CSV);
  const execEntries = listHeadshots(EXEC_LOCAL_DIR, EXEC_BUCKET_PREFIX);
  const mlpEntries = listHeadshots(MLP_LOCAL_DIR, MLP_BUCKET_PREFIX);

  const mapping = {};
  const missing = [];
  const matched = [];

  for (const row of rows) {
    const email = String(row.email || "").toLowerCase();
    const displayName = row.displayName || "";
    const { pool } = getCoachPoolAndPrefix(row);
    const entries = pool === "EF_EL" ? execEntries : mlpEntries;

    const { match, reason } = matchHeadshot(entries, displayName, email);
    if (!match) {
      missing.push({ email, displayName, pool, reason });
      continue;
    }

    mapping[email] = match.path;
    matched.push({ email, displayName, pool, path: match.path, reason });
  }

  const total = rows.length;
  const mappedCount = matched.length;
  const missingCount = missing.length;

  fs.mkdirSync(path.dirname(GENERATED_MAP_PATH), { recursive: true });
  fs.writeFileSync(GENERATED_MAP_PATH, `${JSON.stringify(mapping, null, 2)}\n`, "utf8");

  const reportLines = [
    "# Staging Headshot Mapping Report",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Total coaches: ${total}`,
    `Mapped: ${mappedCount}`,
    `Missing: ${missingCount}`,
    "",
    "## Missing mappings",
    "",
  ];

  if (missingCount === 0) {
    reportLines.push("None.");
  } else {
    reportLines.push("| Coach | Email | Pool | Reason |");
    reportLines.push("|---|---|---|---|");
    for (const row of missing) {
      reportLines.push(`| ${row.displayName} | ${row.email} | ${row.pool} | ${row.reason} |`);
    }
  }

  reportLines.push("", "## Sample mapped entries", "", "| Coach | Email | Path | Match reason |", "|---|---|---|---|");
  for (const row of matched.slice(0, 12)) {
    reportLines.push(`| ${row.displayName} | ${row.email} | ${row.path} | ${row.reason} |`);
  }

  fs.writeFileSync(REPORT_PATH, `${reportLines.join("\n")}\n`, "utf8");

  console.log(
    JSON.stringify(
      {
        total,
        mapped: mappedCount,
        missing: missingCount,
        generatedMapPath: path.relative(ROOT, GENERATED_MAP_PATH),
        reportPath: path.relative(ROOT, REPORT_PATH),
      },
      null,
      2
    )
  );
}

main();
