import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { jsonNoStore, mapSessionRow, requireCoachScope } from "@/app/api/coach/_shared";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const auth = await requireCoachScope(request);
  if ("response" in auth) {
    return auth.response;
  }

  const { id: engagementId } = await context.params;
  if (!engagementId?.trim()) {
    return jsonNoStore({ error: "Invalid engagement id" }, { status: 422 });
  }

  try {
    const engagement = await prisma.engagement.findFirst({
      where: {
        id: engagementId,
        organizationCoachId: auth.scope.organizationCoachId,
        archivedAt: null,
      },
      select: {
        id: true,
        totalSessions: true,
        sessions: {
          where: { archivedAt: null },
          orderBy: { sessionNumber: "asc" },
        },
      },
    });

    if (!engagement) {
      return jsonNoStore({ error: "Not found" }, { status: 404 });
    }

    return jsonNoStore({
      items: engagement.sessions.map(mapSessionRow),
      engagementId: engagement.id,
      totalSessions: engagement.totalSessions,
    });
  } catch (error) {
    console.error("GET /api/coach/engagements/[id]/sessions failed", error);
    return jsonNoStore({ error: "Failed to load sessions" }, { status: 500 });
  }
}
