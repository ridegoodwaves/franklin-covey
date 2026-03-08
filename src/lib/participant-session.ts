export const PARTICIPANT_SESSION_KEYS = {
  email: "participant-email",
  verified: "participant-verified",
  selectedCoach: "selected-coach",
} as const;

export interface StoredCoachSessionMeta {
  participantEmail?: string;
}

interface RemovableStorage {
  removeItem(key: string): void;
}

export function normalizeParticipantEmailForClient(email: string): string {
  return email.trim().toLowerCase();
}

export function clearParticipantClientState(storage: RemovableStorage): void {
  storage.removeItem(PARTICIPANT_SESSION_KEYS.selectedCoach);
  storage.removeItem(PARTICIPANT_SESSION_KEYS.verified);
  storage.removeItem(PARTICIPANT_SESSION_KEYS.email);
}

export function readStoredCoachSessionMeta(raw: string | null): StoredCoachSessionMeta | null {
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as object | null;
    if (!parsed || Array.isArray(parsed)) return null;

    const withParticipantEmail = parsed as { participantEmail?: string };
    if (typeof withParticipantEmail.participantEmail !== "string") {
      return {};
    }

    const normalized = normalizeParticipantEmailForClient(withParticipantEmail.participantEmail);
    if (!normalized) return {};

    return { participantEmail: normalized };
  } catch {
    return null;
  }
}

export function isStoredCoachOwnedByParticipant(
  rawSelectedCoach: string | null,
  participantEmail: string | null
): boolean {
  if (!participantEmail) return false;

  const storedMeta = readStoredCoachSessionMeta(rawSelectedCoach);
  if (!storedMeta?.participantEmail) return false;

  return storedMeta.participantEmail === normalizeParticipantEmailForClient(participantEmail);
}
