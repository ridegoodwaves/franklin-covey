import "server-only";
import rawMediaMap from "@/lib/wistia/media-map.json";

const mediaMap: Readonly<Record<string, string>> = rawMediaMap;

export function resolveWistiaMediaId(email: string): string | undefined {
  return mediaMap[email.trim().toLowerCase()];
}
