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
    const response = NextResponse.json({
      coaches: [],
      allAtCapacity: true,
      remixUsed: participantSession.remixUsed,
    });
    writeParticipantSession(response, {
      ...participantSession,
      shownCoachIds: [],
      currentBatchIds: [],
    });
    return response;
  }

  // Pin-first: if this participant already has a batch assigned, return those same coaches.
  // Re-fetch from the pool so capacity data stays current, but never re-randomize.
  const currentBatchIds: string[] = participantSession.currentBatchIds ?? [];
  if (currentBatchIds.length > 0) {
    const coachById = new Map(coaches.map((c) => [c.id, c]));
    const pinnedCoaches = currentBatchIds
      .map((id) => coachById.get(id))
      .filter((c): c is NonNullable<typeof c> => c !== undefined);
    if (pinnedCoaches.length >= COACH_BATCH_SIZE) {
      const cards = await toParticipantCoachCards(pinnedCoaches, false);
      const response = NextResponse.json({
        coaches: cards,
        allAtCapacity: false,
        remixUsed: participantSession.remixUsed,
      });
      // Refresh cookie TTL without changing any state.
      writeParticipantSession(response, { ...participantSession, currentBatchIds });
      return response;
    }
  }

  // No pinned batch yet — pick a fresh one and pin it.
  const batch = pickCoachBatch({
    coaches,
    shownCoachIds: participantSession.shownCoachIds,
    count: COACH_BATCH_SIZE,
  });

  const cards = await toParticipantCoachCards(batch.selected, false);
  const batchIds = cards.map((coach) => coach.id);
  const nextShownIds = Array.from(
    new Set([...participantSession.shownCoachIds, ...batchIds])
  );

  const response = NextResponse.json({
    coaches: cards,
    allAtCapacity: false,
    remixUsed: participantSession.remixUsed,
  });

  writeParticipantSession(response, {
    ...participantSession,
    shownCoachIds: nextShownIds,
    currentBatchIds: batchIds,
  });

  return response;
}
