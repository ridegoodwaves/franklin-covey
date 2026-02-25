import { NextRequest, NextResponse } from "next/server";
import {
  getSessionContext,
  listCoachPool,
  pickCoachBatch,
  toParticipantCoachCards,
} from "@/lib/server/participant-coach-service";
import { readParticipantSession, writeParticipantSession } from "@/lib/server/session";

const COACH_BATCH_SIZE = 3;

export async function GET(request: NextRequest) {
  const participantSession = readParticipantSession(request);
  if (!participantSession) {
    return NextResponse.json({ error: "INVALID_SESSION" }, { status: 401 });
  }

  const context = await getSessionContext({
    participantId: participantSession.participantId,
    engagementId: participantSession.engagementId,
    organizationId: participantSession.organizationId,
  });

  if (!context) {
    return NextResponse.json({ error: "INVALID_SESSION" }, { status: 401 });
  }

  if (context.status !== "INVITED") {
    return NextResponse.json({ error: "ALREADY_SELECTED" }, { status: 409 });
  }

  if (context.cohort.coachSelectionEnd < new Date()) {
    return NextResponse.json({ error: "WINDOW_CLOSED" }, { status: 409 });
  }

  const coaches = await listCoachPool({
    organizationId: context.organizationId,
    pool: context.program.pool,
  });

  const allAtCapacity = coaches.length === 0 || coaches.every((coach) => coach.atCapacity);
  if (allAtCapacity) {
    const response = NextResponse.json({ coaches: [], allAtCapacity: true });
    writeParticipantSession(response, {
      ...participantSession,
      shownCoachIds: [],
    });
    return response;
  }

  const batch = pickCoachBatch({
    coaches,
    shownCoachIds: participantSession.shownCoachIds,
    count: COACH_BATCH_SIZE,
  });

  const cards = await toParticipantCoachCards(batch.selected, false);
  const nextShownIds = Array.from(
    new Set([...participantSession.shownCoachIds, ...cards.map((coach) => coach.id)])
  );

  const response = NextResponse.json({
    coaches: cards,
    allAtCapacity: false,
  });

  writeParticipantSession(response, {
    ...participantSession,
    shownCoachIds: nextShownIds,
  });

  return response;
}
