import type { CoachPool } from "@prisma/client";
import generatedMap from "@/lib/headshots/generated-map.json";

const HEADSHOTS_BUCKET = "headshots";
const EXEC_FOLDER = "executive-coach-photos";
const MLP_FOLDER = "mlp-alp-coach-photos";
const LEGACY_FOLDER_ALIASES: Record<string, string> = {
  "executive-coach-photos": "executive coach photos",
  "mlp-alp-coach-photos": "mlp alp coach photos",
};

const PUBLIC_MODE = (process.env.SUPABASE_HEADSHOTS_BUCKET_MODE || "private").toLowerCase() === "public";
const SIGNED_URL_TTL_SECONDS = Number(process.env.SUPABASE_HEADSHOTS_SIGNED_URL_TTL_SECONDS || 3600);

function encodeStoragePath(pathValue: string): string {
  return pathValue
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function normalizeStoredPhotoPath(pathValue: string): string {
  const trimmed = pathValue.trim().replace(/^\/+/, "");
  if (trimmed.startsWith(`${HEADSHOTS_BUCKET}/`)) {
    return trimmed.slice(HEADSHOTS_BUCKET.length + 1);
  }
  return trimmed;
}

function slugify(value: string): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function resolveFolder(pool: CoachPool): string {
  return pool === "EF_EL" ? EXEC_FOLDER : MLP_FOLDER;
}

export function deriveCoachPhotoPath(input: {
  email: string;
  displayName: string;
  pool: CoachPool;
  currentPhotoPath?: string | null;
}): string | null {
  if (input.currentPhotoPath?.trim()) {
    return normalizeStoredPhotoPath(input.currentPhotoPath);
  }

  const email = input.email.toLowerCase();
  const mapped = (generatedMap as Record<string, string>)[email];
  if (mapped) return normalizeStoredPhotoPath(mapped);

  const folder = resolveFolder(input.pool);
  const baseSlug = slugify(input.displayName) || slugify(email.split("@")[0] || "");
  const deterministicGuess = baseSlug ? `${folder}/${baseSlug}.png` : null;

  // We intentionally do not return guessed paths until verified in storage.
  // This keeps the UI on fallback initials/avatar instead of broken images.
  void deterministicGuess;
  return null;
}

export async function resolveCoachPhotoUrl(photoPath: string | null | undefined): Promise<string | undefined> {
  if (!photoPath) return undefined;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!supabaseUrl) return undefined;

  const normalizedPath = normalizeStoredPhotoPath(photoPath);

  const pathCandidates = new Set<string>([normalizedPath]);
  for (const [canonical, legacy] of Object.entries(LEGACY_FOLDER_ALIASES)) {
    if (normalizedPath.startsWith(`${canonical}/`)) {
      pathCandidates.add(normalizedPath.replace(`${canonical}/`, `${legacy}/`));
    } else if (normalizedPath.startsWith(`${legacy}/`)) {
      pathCandidates.add(normalizedPath.replace(`${legacy}/`, `${canonical}/`));
    }
  }

  if (PUBLIC_MODE) {
    for (const candidate of pathCandidates) {
      const encodedPath = encodeStoragePath(candidate);
      return `${supabaseUrl}/storage/v1/object/public/${HEADSHOTS_BUCKET}/${encodedPath}`;
    }
    return undefined;
  }

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!serviceRoleKey) return undefined;

  const ttlSeconds = Number.isFinite(SIGNED_URL_TTL_SECONDS)
    ? Math.max(60, SIGNED_URL_TTL_SECONDS)
    : 3600;

  for (const candidate of pathCandidates) {
    const encodedPath = encodeStoragePath(candidate);
    const signUrl = `${supabaseUrl}/storage/v1/object/sign/${HEADSHOTS_BUCKET}/${encodedPath}`;
    const response = await fetch(signUrl, {
      method: "POST",
      headers: {
        apikey: serviceRoleKey,
        Authorization: `Bearer ${serviceRoleKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: ttlSeconds }),
      cache: "no-store",
    });

    if (!response.ok) {
      continue;
    }

    const payload = (await response.json()) as { signedURL?: string; signedUrl?: string };
    const signedPath = payload.signedURL || payload.signedUrl;
    if (!signedPath) {
      continue;
    }
    if (signedPath.startsWith("http://") || signedPath.startsWith("https://")) {
      return signedPath;
    }
    // Supabase returns signedURL relative to /storage/v1 (e.g. "/object/sign/...")
    // so we must prepend the full storage base, not just supabaseUrl.
    const storagePath = signedPath.startsWith("/storage/v1")
      ? signedPath
      : `/storage/v1${signedPath}`;
    return `${supabaseUrl}${storagePath}`;
  }

  return undefined;
}
