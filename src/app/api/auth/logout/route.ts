import { NextResponse } from "next/server";
import { clearParticipantSession, clearPortalSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const response = new NextResponse(null, {
    status: 204,
    headers: {
      "Cache-Control": "no-store",
    },
  });

  clearPortalSession(response);
  clearParticipantSession(response);

  return response;
}
