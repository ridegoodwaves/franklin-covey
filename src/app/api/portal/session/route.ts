import { NextRequest, NextResponse } from "next/server";
import { readPortalSession } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = readPortalSession(request);
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(
    {
      userId: session.userId,
      email: session.email,
      role: session.role,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    }
  );
}
