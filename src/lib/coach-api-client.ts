import type { SessionStatus } from "@prisma/client";
import type {
  CoachDashboardResponse,
  CoachEngagementDetail,
  CoachEngagementListItem,
  CoachSessionRow,
} from "@/lib/types/coach";

interface JsonErrorBody {
  error?: string;
}

export class CoachApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as JsonErrorBody;
    return body.error || `Request failed with status ${response.status}`;
  } catch {
    return `Request failed with status ${response.status}`;
  }
}

async function fetchJson<T>(
  input: string,
  init?: RequestInit,
  signal?: AbortSignal
): Promise<T> {
  const response = await fetch(input, {
    ...init,
    cache: "no-store",
    credentials: "same-origin",
    signal,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    throw new CoachApiError(response.status, await parseError(response));
  }

  return (await response.json()) as T;
}

export interface CoachEngagementsResponse {
  items: CoachEngagementListItem[];
  page: number;
  pageSize: number;
  totalItems: number;
  totalPages: number;
  tab: "active" | "completed";
}

export interface CoachEngagementDetailResponse {
  item: CoachEngagementDetail;
}

export interface CoachSessionsResponse {
  items: CoachSessionRow[];
  engagementId: string;
  totalSessions: number;
}

export interface CreateCoachSessionInput {
  engagementId: string;
  status: SessionStatus;
  occurredAt: string | null;
  topic: string | null;
  outcomes: string[] | null;
  nextSteps: string | null;
  engagementLevel: number | null;
  actionCommitment: string | null;
  notes: string | null;
}

export interface UpdateCoachSessionInput {
  occurredAt?: string | null;
  topic?: string | null;
  outcomes?: string[] | null;
  nextSteps?: string | null;
  engagementLevel?: number | null;
  actionCommitment?: string | null;
  notes?: string | null;
}

export async function fetchCoachDashboard(
  signal?: AbortSignal
): Promise<CoachDashboardResponse> {
  return fetchJson<CoachDashboardResponse>("/api/coach/dashboard", undefined, signal);
}

export async function fetchCoachEngagements(
  tab: "active" | "completed",
  page: number,
  signal?: AbortSignal
): Promise<CoachEngagementsResponse> {
  const params = new URLSearchParams({
    tab,
    page: String(page),
  });
  return fetchJson<CoachEngagementsResponse>(`/api/coach/engagements?${params.toString()}`, undefined, signal);
}

export async function fetchCoachEngagementDetail(
  engagementId: string,
  signal?: AbortSignal
): Promise<CoachEngagementDetailResponse> {
  return fetchJson<CoachEngagementDetailResponse>(
    `/api/coach/engagements/${encodeURIComponent(engagementId)}`,
    undefined,
    signal
  );
}

export async function fetchCoachSessions(
  engagementId: string,
  signal?: AbortSignal
): Promise<CoachSessionsResponse> {
  return fetchJson<CoachSessionsResponse>(
    `/api/coach/engagements/${encodeURIComponent(engagementId)}/sessions`,
    undefined,
    signal
  );
}

export async function createCoachSession(
  input: CreateCoachSessionInput
): Promise<{ item: CoachSessionRow }> {
  return fetchJson<{ item: CoachSessionRow }>("/api/coach/sessions", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export async function updateCoachSession(
  sessionId: string,
  input: UpdateCoachSessionInput
): Promise<{ item: CoachSessionRow }> {
  return fetchJson<{ item: CoachSessionRow }>(
    `/api/coach/sessions/${encodeURIComponent(sessionId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  );
}
