#!/usr/bin/env node
/**
 * upload-headshots-to-storage.mjs
 *
 * Uploads all coach headshots from local fc-assets/ to a Supabase Storage bucket.
 * Uses the Supabase REST API directly (no @supabase/supabase-js needed).
 *
 * Usage:
 *   # Dry run — show what would be uploaded
 *   node scripts/upload-headshots-to-storage.mjs --env-file .env.production.local
 *
 *   # Actually upload
 *   node scripts/upload-headshots-to-storage.mjs --env-file .env.production.local --apply
 *
 * Required env vars (in --env-file or environment):
 *   NEXT_PUBLIC_SUPABASE_URL    e.g. https://voatlvpgyqhjhuqvhsiv.supabase.co
 *   SUPABASE_SERVICE_ROLE_KEY   service role key (not anon key)
 *
 * The script reads src/lib/headshots/generated-map.json to determine which files
 * to upload and what bucket paths to use. All 32 coach headshots are uploaded to
 * the "headshots" bucket under mlp-alp-coach-photos/ or executive-coach-photos/.
 */

import fs from "node:fs";
import path from "node:path";

const ROOT = process.cwd();
const MAP_PATH = path.join(ROOT, "src", "lib", "headshots", "generated-map.json");
const BUCKET = "headshots";

// Local source folder mapping: bucket folder prefix → local fc-assets subfolder
const FOLDER_MAP = {
  "mlp-alp-coach-photos": path.join(ROOT, "fc-assets", "coach-bios", "MLP-ALP Coach Bios", "headshots"),
  "executive-coach-photos": path.join(ROOT, "fc-assets", "coach-bios", "Executive Coach Bios", "headshots"),
};

// ── arg parsing ──────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { apply: false, envFile: null };
  for (let i = 2; i < argv.length; i++) {
    if (argv[i] === "--apply") { args.apply = true; continue; }
    if (argv[i] === "--env-file") { args.envFile = argv[i + 1] ?? null; i++; continue; }
  }
  return args;
}

function stripQuotes(v) {
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
    return v.slice(1, -1);
  }
  return v;
}

function parseEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  const out = {};
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx <= 0) continue;
    const key = trimmed.slice(0, idx).trim();
    const value = stripQuotes(trimmed.slice(idx + 1).trim());
    out[key] = value;
  }
  return out;
}

// ── mime type helper ─────────────────────────────────────────────────────────

function mimeType(filename) {
  const ext = path.extname(filename).toLowerCase();
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".webp") return "image/webp";
  return "application/octet-stream";
}

// ── main ─────────────────────────────────────────────────────────────────────

async function main() {
  const args = parseArgs(process.argv);

  // Load env
  let fileEnv = {};
  if (args.envFile) {
    const resolved = path.resolve(ROOT, args.envFile);
    if (!fs.existsSync(resolved)) {
      console.error(`Env file not found: ${resolved}`);
      process.exit(1);
    }
    fileEnv = parseEnvFile(resolved);
    console.log(`Loaded env: ${resolved}`);
  }
  const env = { ...process.env, ...fileEnv };

  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL"); process.exit(1); }
  if (!serviceRoleKey) { console.error("Missing SUPABASE_SERVICE_ROLE_KEY"); process.exit(1); }

  // Load generated map — unique bucket paths only
  const generatedMap = JSON.parse(fs.readFileSync(MAP_PATH, "utf8"));
  const uniqueBucketPaths = [...new Set(Object.values(generatedMap))];

  console.log(`\nFound ${uniqueBucketPaths.length} unique headshot paths in generated-map.json`);
  console.log(`Target bucket: ${BUCKET} on ${supabaseUrl}`);
  console.log(`Mode: ${args.apply ? "APPLY (will upload)" : "DRY RUN (pass --apply to upload)"}\n`);

  let uploaded = 0;
  let skipped = 0;
  let errors = 0;

  for (const bucketPath of uniqueBucketPaths) {
    // Determine local source file
    const [folderPrefix, ...rest] = bucketPath.split("/");
    const filename = rest.join("/");
    const localDir = FOLDER_MAP[folderPrefix];

    if (!localDir) {
      console.warn(`  [SKIP] Unknown folder prefix "${folderPrefix}" for: ${bucketPath}`);
      skipped++;
      continue;
    }

    const localPath = path.join(localDir, filename);

    if (!fs.existsSync(localPath)) {
      // Try case-insensitive match in directory
      const dir = path.dirname(localPath);
      const base = path.basename(localPath).toLowerCase();
      const candidates = fs.existsSync(dir)
        ? fs.readdirSync(dir).filter(f => f.toLowerCase() === base)
        : [];

      if (candidates.length === 0) {
        console.warn(`  [MISSING] Local file not found: ${localPath}`);
        skipped++;
        continue;
      }
      // Use the found candidate
      const resolvedLocal = path.join(dir, candidates[0]);
      console.log(`  [MATCH]  ${bucketPath} ← ${candidates[0]} (case-adjusted)`);
      if (args.apply) {
        const result = await uploadFile(supabaseUrl, serviceRoleKey, BUCKET, bucketPath, resolvedLocal);
        if (result.ok) { uploaded++; console.log(`    ✓ Uploaded`); }
        else { errors++; console.error(`    ✗ Failed: ${result.error}`); }
      }
      continue;
    }

    console.log(`  [UPLOAD] ${bucketPath}`);

    if (!args.apply) {
      console.log(`    → dry run — would upload from ${path.relative(ROOT, localPath)}`);
      uploaded++;
      continue;
    }

    const result = await uploadFile(supabaseUrl, serviceRoleKey, BUCKET, bucketPath, localPath);
    if (result.ok) {
      uploaded++;
      console.log(`    ✓ Uploaded (${result.status})`);
    } else {
      errors++;
      console.error(`    ✗ Failed (${result.status}): ${result.error}`);
    }
  }

  console.log(`\n─────────────────────────────────────`);
  if (args.apply) {
    console.log(`Uploaded: ${uploaded}  |  Skipped: ${skipped}  |  Errors: ${errors}`);
    if (errors > 0) {
      console.error(`\n${errors} file(s) failed. Re-run with --apply to retry — already-uploaded files will return 409 (conflict) which is safe to ignore.`);
      process.exit(1);
    } else {
      console.log(`\nAll headshots uploaded successfully.`);
      console.log(`\nNext step: run the photo-path backfill against the production DB:`);
      console.log(`  node scripts/backfill-coach-photo-paths.mjs --env-file .env.production.local --apply`);
    }
  } else {
    console.log(`Dry run complete. ${uploaded} files would be uploaded, ${skipped} skipped.`);
    console.log(`Run with --apply to execute.`);
  }
}

async function uploadFile(supabaseUrl, serviceRoleKey, bucket, bucketPath, localPath) {
  const fileBuffer = fs.readFileSync(localPath);
  const mime = mimeType(localPath);
  const uploadUrl = `${supabaseUrl}/storage/v1/object/${bucket}/${encodeURIComponent(bucketPath).replace(/%2F/g, "/")}`;

  try {
    const res = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": mime,
        "x-upsert": "true", // overwrite if exists — safe for re-runs
      },
      body: fileBuffer,
    });

    if (res.ok || res.status === 200 || res.status === 409) {
      return { ok: true, status: res.status };
    }

    const body = await res.text().catch(() => "");
    return { ok: false, status: res.status, error: body };
  } catch (err) {
    return { ok: false, status: 0, error: err.message };
  }
}

main().catch(err => {
  console.error("Fatal:", err);
  process.exit(1);
});
