#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

function parseArgs(argv) {
  const out = { envFile: null, target: null };
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--env-file") {
      out.envFile = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
    if (token === "--target") {
      out.target = argv[i + 1] ?? null;
      i += 1;
      continue;
    }
  }
  return out;
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

function parseEnvFile(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
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

function isBlank(value) {
  return value === undefined || value === null || String(value).trim() === "";
}

function looksPlaceholder(value) {
  const v = String(value ?? "").trim();
  return (
    v.startsWith("[") ||
    v.includes("REDACTED") ||
    v.includes("example.com") ||
    v.includes("yourdomain")
  );
}

const { envFile, target } = parseArgs(process.argv);
const failures = [];
const warnings = [];

let fileEnv = {};
if (envFile) {
  const resolved = path.resolve(process.cwd(), envFile);
  if (!fs.existsSync(resolved)) {
    console.error(`Env file not found: ${resolved}`);
    process.exit(1);
  }
  fileEnv = parseEnvFile(resolved);
  console.log(`Loaded env file: ${resolved}`);
} else {
  console.log("No --env-file provided; validating current process environment.");
}

const env = { ...process.env, ...fileEnv };
const databaseUrl = String(env.DATABASE_URL || "");
const usingSupabasePooler =
  databaseUrl.includes(".pooler.supabase.com") || databaseUrl.includes(":6543/");
const hasPgbouncerFlag = /[?&]pgbouncer=true(?:&|$)/i.test(databaseUrl);

const required = [
  "NEXT_PUBLIC_APP_ENV",
  "NEXT_PUBLIC_SITE_URL",
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AUTH_SECRET",
  "RESEND_API_KEY",
  "EMAIL_FROM",
  "EMAIL_MODE",
  "EMAIL_OUTBOUND_ENABLED",
  "NUDGE_CRON_ENABLED",
  "CRON_SECRET",
  "LOG_REDACTION_ENABLED",
];

for (const key of required) {
  if (isBlank(env[key])) failures.push(`Missing required var: ${key}`);
}

const appEnv = env.NEXT_PUBLIC_APP_ENV;
if (appEnv !== "staging" && appEnv !== "production") {
  failures.push(
    `NEXT_PUBLIC_APP_ENV must be "staging" or "production" (got "${appEnv ?? ""}")`
  );
}

if (usingSupabasePooler && !hasPgbouncerFlag) {
  failures.push(
    'DATABASE_URL uses Supabase pooler and must include "?pgbouncer=true" to avoid PgBouncer prepared statement conflicts (42P05).'
  );
}

if (target && appEnv && target !== appEnv) {
  failures.push(
    `Target mismatch: --target ${target} but NEXT_PUBLIC_APP_ENV is ${appEnv}`
  );
}

if (appEnv === "staging") {
  if (env.EMAIL_MODE !== "sandbox") {
    failures.push('Staging requires EMAIL_MODE="sandbox"');
  }
  if (isBlank(env.EMAIL_ALLOWLIST)) {
    failures.push("Staging requires EMAIL_ALLOWLIST to be set");
  }
  if (String(env.EMAIL_OUTBOUND_ENABLED).toLowerCase() !== "false") {
    failures.push('Staging requires EMAIL_OUTBOUND_ENABLED="false"');
  }
  if (String(env.NUDGE_CRON_ENABLED).toLowerCase() !== "false") {
    failures.push('Staging requires NUDGE_CRON_ENABLED="false"');
  }
  if (String(env.EMAIL_FROM || "").toLowerCase().endsWith("@franklincovey.com")) {
    warnings.push(
      "EMAIL_FROM uses @franklincovey.com in staging; confirm DNS authorization and sandbox safety."
    );
  }
  if (String(env.TEST_ENDPOINTS_ENABLED).toLowerCase() === "true" && isBlank(env.TEST_ENDPOINTS_SECRET)) {
    failures.push(
      'Staging requires TEST_ENDPOINTS_SECRET when TEST_ENDPOINTS_ENABLED="true"'
    );
  }
}

  if (appEnv === "production") {
  if (env.EMAIL_MODE !== "live") {
    failures.push('Production requires EMAIL_MODE="live"');
  }
  if (String(env.EMAIL_OUTBOUND_ENABLED).toLowerCase() !== "true") {
    failures.push('Production requires EMAIL_OUTBOUND_ENABLED="true"');
  }
  if (String(env.NUDGE_CRON_ENABLED).toLowerCase() !== "true") {
    failures.push('Production requires NUDGE_CRON_ENABLED="true"');
  }
  if (String(env.DATABASE_URL || "").includes("localhost")) {
    failures.push("Production DATABASE_URL must not point to localhost");
  }
  if (String(env.DIRECT_URL || "").includes("localhost")) {
    failures.push("Production DIRECT_URL must not point to localhost");
  }
  if (String(env.TEST_ENDPOINTS_ENABLED).toLowerCase() === "true") {
    failures.push('Production must not enable TEST_ENDPOINTS_ENABLED');
  }
}

const secretKeys = [
  "DATABASE_URL",
  "DIRECT_URL",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "AUTH_SECRET",
  "RESEND_API_KEY",
  "CRON_SECRET",
];
for (const key of secretKeys) {
  if (!isBlank(env[key]) && looksPlaceholder(env[key])) {
    warnings.push(`${key} appears to use a placeholder value.`);
  }
}

if (warnings.length > 0) {
  console.log("\nWarnings:");
  for (const warning of warnings) {
    console.log(`- ${warning}`);
  }
}

if (failures.length > 0) {
  console.error("\nEnvironment validation failed:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log("\nEnvironment validation passed.");
