import { beforeEach, vi } from "vitest";
import { mockReset } from "vitest-mock-extended";
import { prismaMock } from "../lib/__mocks__/db";

// Required: prevent 'server-only' from throwing in test environment
vi.mock("server-only", () => ({}));

// Global Prisma mock — all route/service tests get this automatically
vi.mock("@/lib/db", () => ({ prisma: prismaMock }));

// Mock headshots module — tests don't need real Supabase storage
vi.mock("@/lib/server/headshots", () => ({
  deriveCoachPhotoPath: vi.fn(() => null),
  resolveCoachPhotoUrl: vi.fn(async () => undefined),
}));

// Mock headshots JSON import
vi.mock("@/lib/headshots/generated-map.json", () => ({ default: {} }));

beforeEach(() => {
  mockReset(prismaMock);
  globalThis.__rateLimitBuckets = undefined; // reset in-memory IP rate limiter
  vi.unstubAllEnvs();
});
