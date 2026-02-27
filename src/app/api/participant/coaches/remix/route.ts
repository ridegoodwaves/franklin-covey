import { NextRequest, NextResponse } from "next/server";
import {
  getSessionContext,
  listCoachPool,
  pickCoachBatch,
  toParticipantCoachCards,
} from "@/lib/server/participant-coach-service";
import { readParticipantSession, writeParticipantSession } from "@/lib/server/session";

const COACH_BATCH_SIZE = 3;

export async function POST(request: NextRequest) {
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

  if (participantSession.remixUsed) {
    return NextResponse.json({ error: "REMIX_ALREADY_USED" }, { status: 409 });
  }

  const coaches = await listCoachPool({
    organizationId: context.organizationId,
    pool: context.program.pool,
  });

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
    poolExhausted: batch.poolExhausted,
  });

  writeParticipantSession(response, {
    ...participantSession,
    shownCoachIds: nextShownIds,
    currentBatchIds: cards.map((coach) => coach.id),
    remixUsed: true,
  });

  return response;
}
