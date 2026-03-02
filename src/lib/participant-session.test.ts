import { describe, expect, it } from "vitest";
import {
  clearParticipantClientState,
  isStoredCoachOwnedByParticipant,
  normalizeParticipantEmailForClient,
  PARTICIPANT_SESSION_KEYS,
  readStoredCoachSessionMeta,
} from "./participant-session";

describe("participant-session", () => {
  it("normalizes participant email with trim + lowercase", () => {
    expect(normalizeParticipantEmailForClient("  Test.User@USPS.GOV ")).toBe("test.user@usps.gov");
  });

  it("reads participantEmail metadata from stored selected-coach payload", () => {
    const raw = JSON.stringify({ id: "coach-1", participantEmail: "  A.User@USPS.GOV " });
    expect(readStoredCoachSessionMeta(raw)).toEqual({ participantEmail: "a.user@usps.gov" });
  });

  it("treats legacy payload without participantEmail as metadata-empty", () => {
    const raw = JSON.stringify({ id: "coach-1", name: "Coach Name" });
    expect(readStoredCoachSessionMeta(raw)).toEqual({});
  });

  it("returns null for malformed selected-coach payload", () => {
    expect(readStoredCoachSessionMeta("{oops")).toBeNull();
    expect(readStoredCoachSessionMeta(JSON.stringify(["not", "an", "object"]))).toBeNull();
  });

  it("matches stored selection ownership to current participant email", () => {
    const raw = JSON.stringify({ participantEmail: "first.last@usps.gov" });
    expect(isStoredCoachOwnedByParticipant(raw, " FIRST.LAST@USPS.GOV ")).toBe(true);
    expect(isStoredCoachOwnedByParticipant(raw, "other.user@usps.gov")).toBe(false);
  });

  it("does not trust selected-coach payloads that have no participantEmail", () => {
    const raw = JSON.stringify({ id: "coach-1" });
    expect(isStoredCoachOwnedByParticipant(raw, "first.last@usps.gov")).toBe(false);
  });

  it("clears participant client storage keys", () => {
    const removedKeys: string[] = [];
    const fakeStorage = {
      removeItem(key: string) {
        removedKeys.push(key);
      },
    };

    clearParticipantClientState(fakeStorage);

    expect(removedKeys).toEqual([
      PARTICIPANT_SESSION_KEYS.selectedCoach,
      PARTICIPANT_SESSION_KEYS.verified,
      PARTICIPANT_SESSION_KEYS.email,
    ]);
  });
});
