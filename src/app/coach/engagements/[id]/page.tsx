"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { EngagementStatus, SessionStatus } from "@prisma/client";
import { PortalShell } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ACTION_COMMITMENT_OPTIONS,
  ENGAGEMENT_LEVEL_OPTIONS,
  NEXT_STEPS_OPTIONS,
  SESSION_OUTCOMES,
  SESSION_TOPICS_BY_PROGRAM,
} from "@/lib/config";
import { COACH_NAV_ITEMS, COACH_PORTAL, CoachPortalIcon } from "@/lib/nav-config";
import { cn, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { usePortalUser } from "@/lib/use-portal-user";
import {
  CoachApiError,
  createCoachSession,
  fetchCoachEngagementDetail,
  fetchCoachSessions,
  updateCoachSession,
  type UpdateCoachSessionInput,
} from "@/lib/coach-api-client";
import type { CoachEngagementDetail, CoachSessionRow } from "@/lib/types/coach";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";

interface SessionFormState {
  status: SessionStatus;
  occurredAt: string;
  topic: string;
  outcomes: string[];
  nextSteps: string;
  engagementLevel: number | null;
  actionCommitment: string;
  notes: string;
}

function toDateInput(iso: string | null): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (!Number.isFinite(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function defaultFormState(): SessionFormState {
  return {
    status: SessionStatus.COMPLETED,
    occurredAt: "",
    topic: "",
    outcomes: [],
    nextSteps: "",
    engagementLevel: null,
    actionCommitment: "",
    notes: "",
  };
}

function hasForfeitStatus(status: SessionStatus): boolean {
  return status === SessionStatus.FORFEITED_CANCELLED || status === SessionStatus.FORFEITED_NOT_USED;
}

function toPatchPayload(form: SessionFormState): UpdateCoachSessionInput {
  const isForfeited = hasForfeitStatus(form.status);
  return {
    occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : null,
    topic: form.topic.trim() || null,
    outcomes: isForfeited ? null : form.outcomes,
    nextSteps: isForfeited ? null : (form.nextSteps || null),
    actionCommitment: isForfeited ? null : (form.actionCommitment || null),
    engagementLevel: isForfeited ? null : form.engagementLevel,
    notes: form.notes.trim() || null,
  };
}

const ENGAGEMENT_LIST_STALE_KEY = "engagement-list-stale";

function normalizeTextValue(value: string | null): string | null {
  const normalized = value?.trim() || "";
  return normalized.length > 0 ? normalized : null;
}

function normalizeOutcomeValue(value: string[] | null): string[] | null {
  if (!value) return null;
  const trimmed = value.map((entry) => entry.trim()).filter((entry) => entry.length > 0);
  if (trimmed.length === 0) return null;
  return [...trimmed].sort((left, right) => left.localeCompare(right));
}

function areOutcomesEqual(left: string[] | null, right: string[] | null): boolean {
  const normalizedLeft = normalizeOutcomeValue(left);
  const normalizedRight = normalizeOutcomeValue(right);
  if (normalizedLeft === null || normalizedRight === null) {
    return normalizedLeft === normalizedRight;
  }
  if (normalizedLeft.length !== normalizedRight.length) return false;
  return normalizedLeft.every((value, index) => value === normalizedRight[index]);
}

function buildAutoSavePayload(
  form: SessionFormState,
  selectedSession: CoachSessionRow | null
): UpdateCoachSessionInput {
  if (!selectedSession) return {};

  const payload: UpdateCoachSessionInput = {};
  const next = toPatchPayload(form);

  if (form.occurredAt !== toDateInput(selectedSession.occurredAt)) {
    payload.occurredAt = next.occurredAt ?? null;
  }

  if (normalizeTextValue(next.topic ?? null) !== normalizeTextValue(selectedSession.topic)) {
    payload.topic = next.topic ?? null;
  }

  if (!areOutcomesEqual(next.outcomes ?? null, selectedSession.outcomes ?? null)) {
    payload.outcomes = next.outcomes ?? null;
  }

  if (normalizeTextValue(next.nextSteps ?? null) !== normalizeTextValue(selectedSession.nextSteps)) {
    payload.nextSteps = next.nextSteps ?? null;
  }

  if (next.engagementLevel !== selectedSession.engagementLevel) {
    payload.engagementLevel = next.engagementLevel ?? null;
  }

  if (
    normalizeTextValue(next.actionCommitment ?? null) !==
    normalizeTextValue(selectedSession.actionCommitment)
  ) {
    payload.actionCommitment = next.actionCommitment ?? null;
  }

  if (normalizeTextValue(next.notes ?? null) !== normalizeTextValue(selectedSession.notes)) {
    payload.notes = next.notes ?? null;
  }

  return payload;
}

function AutoSaveText({
  status,
  savedAt,
}: {
  status: "idle" | "saving" | "saved" | "error";
  savedAt: string | null;
}) {
  if (status === "saving") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground animate-pulse-subtle">
        <span className="h-1.5 w-1.5 rounded-full bg-fc-400" />
        Saving...
      </p>
    );
  }
  if (status === "error") {
    return <p className="text-xs text-red-700">Auto-save failed. Changes remain in the form.</p>;
  }
  if (status === "saved") {
    return (
      <p className="flex items-center gap-1.5 text-xs text-emerald-700">
        <Check className="h-3.5 w-3.5" aria-hidden="true" />
        All changes saved
      </p>
    );
  }
  if (savedAt) {
    const date = new Date(savedAt);
    return (
      <p className="text-xs text-muted-foreground">
        All changes saved · Last updated{" "}
        {date.toLocaleString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </p>
    );
  }
  return null;
}

export default function CoachEngagementDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const engagementId = params.id;

  const portalUser = usePortalUser({
    name: COACH_PORTAL.userName,
    roleLabel: COACH_PORTAL.userRole,
  });

  const [activeTab, setActiveTab] = useState<"log" | "history">("log");
  const [engagement, setEngagement] = useState<CoachEngagementDetail | null>(null);
  const [sessions, setSessions] = useState<CoachSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [form, setForm] = useState<SessionFormState>(defaultFormState());
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitLoading, setSubmitLoading] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [outcomesError, setOutcomesError] = useState(false);
  const [nextStepsError, setNextStepsError] = useState(false);
  const [actionCommitmentError, setActionCommitmentError] = useState(false);
  const [engagementLevelError, setEngagementLevelError] = useState(false);

  const firstOutcomeRef = useRef<HTMLInputElement | null>(null);

  const selectedSession = useMemo(
    () => (selectedSessionId ? sessions.find((row) => row.id === selectedSessionId) || null : null),
    [selectedSessionId, sessions]
  );

  const isEditingExisting = Boolean(selectedSession);
  const isForfeited = hasForfeitStatus(form.status);
  const sessionsCompleted = sessions.length;
  const totalSessions = engagement?.totalSessions ?? 0;
  const allSessionsLogged = engagement !== null && sessionsCompleted >= totalSessions;
  const showLogTab = !allSessionsLogged || isEditingExisting;
  const visibleActiveTab: "log" | "history" = showLogTab ? activeTab : "history";

  const topics = useMemo(() => {
    if (!engagement) return [] as readonly string[];
    return SESSION_TOPICS_BY_PROGRAM[engagement.programCode] as readonly string[];
  }, [engagement]);

  const nextSessionNumber = useMemo(() => {
    if (!engagement) return 1;
    return Math.min(sessions.length + 1, engagement.totalSessions);
  }, [engagement, sessions.length]);

  const activeSessionNumber = selectedSession?.sessionNumber ?? nextSessionNumber;

  const showEarlyFinalOutcomeWarning =
    !isForfeited &&
    engagement !== null &&
    activeSessionNumber < engagement.totalSessions &&
    form.outcomes.includes("Engagement concluded / final session");

  const showEarlyProgramConcludedWarning =
    !isForfeited &&
    engagement !== null &&
    activeSessionNumber < engagement.totalSessions &&
    form.nextSteps === "Program concluded, no next session";

  useEffect(() => {
    if (allSessionsLogged && activeTab === "log" && !isEditingExisting) {
      setActiveTab("history");
    }
  }, [activeTab, allSessionsLogged, isEditingExisting]);

  useEffect(() => {
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const [detail, sessionList] = await Promise.all([
          fetchCoachEngagementDetail(engagementId, controller.signal),
          fetchCoachSessions(engagementId, controller.signal),
        ]);
        setEngagement(detail.item);
        setSessions(sessionList.items);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message =
          error instanceof CoachApiError ? error.message : "Failed to load engagement";
        setLoadError(message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    if (engagementId) {
      void load();
    }

    return () => controller.abort();
  }, [engagementId]);

  useEffect(() => {
    setHasAttemptedSubmit(false);
    setOutcomesError(false);
    setNextStepsError(false);
    setActionCommitmentError(false);
    setEngagementLevelError(false);

    if (!selectedSession) {
      setForm(defaultFormState());
      setLastSavedAt(null);
      return;
    }

    setForm({
      status: selectedSession.status,
      occurredAt: toDateInput(selectedSession.occurredAt),
      topic: selectedSession.topic || "",
      outcomes: selectedSession.outcomes ? [...selectedSession.outcomes] : [],
      nextSteps: selectedSession.nextSteps || "",
      engagementLevel: selectedSession.engagementLevel,
      actionCommitment: selectedSession.actionCommitment || "",
      notes: selectedSession.notes || "",
    });
    setLastSavedAt(selectedSession.updatedAt);
  }, [selectedSession]);

  const showRequiredValidation = isEditingExisting || hasAttemptedSubmit;

  useEffect(() => {
    if (!showRequiredValidation || isForfeited) {
      setOutcomesError(false);
      setNextStepsError(false);
      setActionCommitmentError(false);
      setEngagementLevelError(false);
      return;
    }

    setOutcomesError(form.outcomes.length === 0);
    setNextStepsError(form.nextSteps.length === 0);
    setActionCommitmentError(form.actionCommitment.length === 0);
    setEngagementLevelError(form.engagementLevel === null);
  }, [form, isForfeited, showRequiredValidation]);

  const autoSavePayload = useMemo(
    () => buildAutoSavePayload(form, selectedSession),
    [form, selectedSession]
  );
  const handleAutoSave = useCallback(
    async (payload: UpdateCoachSessionInput) => {
      if (!selectedSessionId) return;
      if (Object.keys(payload).length === 0) return;
      const response = await updateCoachSession(selectedSessionId, payload);
      setSessions((previous) =>
        previous.map((row) => (row.id === response.item.id ? response.item : row))
      );
      setLastSavedAt(response.item.updatedAt);
      setSubmitError(null);
    },
    [selectedSessionId]
  );

  const autoSave = useAutoSave({
    data: autoSavePayload,
    identity: selectedSessionId || "new",
    enabled: isEditingExisting,
    debounceMs: 5000,
    onSave: handleAutoSave,
  });

  const markEngagementListStale = useCallback(() => {
    if (typeof window === "undefined") return;
    window.sessionStorage.setItem(ENGAGEMENT_LIST_STALE_KEY, "true");
  }, []);

  const hasComposeChanges =
    !isEditingExisting &&
    (form.occurredAt.length > 0 ||
      form.topic.length > 0 ||
      form.outcomes.length > 0 ||
      form.nextSteps.length > 0 ||
      form.actionCommitment.length > 0 ||
      form.engagementLevel !== null ||
      form.notes.trim().length > 0 ||
      form.status !== SessionStatus.COMPLETED);

  const unsaved = useUnsavedChangesWarning({
    hasUnsavedChanges: hasComposeChanges || autoSave.hasPendingChanges || autoSave.hasError,
  });

  const confirmSafeNavigation = useCallback(async (): Promise<boolean> => {
    if (isEditingExisting && autoSave.hasPendingChanges) {
      const flushed = await autoSave.flush();
      if (flushed) {
        return true;
      }
    }
    return unsaved.confirmNavigation();
  }, [autoSave, isEditingExisting, unsaved]);

  const handleShellNavigate = useCallback(
    async () => confirmSafeNavigation(),
    [confirmSafeNavigation]
  );

  async function handleSubmitNewSession() {
    if (!engagement || isEditingExisting || submitLoading) return;
    if (sessions.length >= engagement.totalSessions) return;

    setHasAttemptedSubmit(true);

    if (!isForfeited) {
      const nextOutcomesError = form.outcomes.length === 0;
      const nextNextStepsError = form.nextSteps.length === 0;
      const nextActionCommitmentError = form.actionCommitment.length === 0;
      const nextEngagementLevelError = form.engagementLevel === null;

      setOutcomesError(nextOutcomesError);
      setNextStepsError(nextNextStepsError);
      setActionCommitmentError(nextActionCommitmentError);
      setEngagementLevelError(nextEngagementLevelError);

      if (
        nextOutcomesError ||
        nextNextStepsError ||
        nextActionCommitmentError ||
        nextEngagementLevelError
      ) {
        if (nextOutcomesError) {
          firstOutcomeRef.current?.focus();
        }
        return;
      }
    }

    setSubmitLoading(true);
    setSubmitError(null);

    try {
      const payload = toPatchPayload(form);
      const response = await createCoachSession({
        engagementId: engagement.engagementId,
        status: form.status,
        occurredAt: payload.occurredAt ?? null,
        topic: payload.topic ?? null,
        outcomes: payload.outcomes ?? null,
        nextSteps: payload.nextSteps ?? null,
        engagementLevel: payload.engagementLevel ?? null,
        actionCommitment: payload.actionCommitment ?? null,
        notes: payload.notes ?? null,
      });

      setSessions((previous) => {
        const next = [...previous, response.item];
        next.sort((a, b) => a.sessionNumber - b.sessionNumber);
        return next;
      });
      markEngagementListStale();
      setSelectedSessionId(response.item.id);
      setLastSavedAt(response.item.updatedAt);
    } catch (error) {
      const message = error instanceof CoachApiError ? error.message : "Failed to log session";
      setSubmitError(message);
    } finally {
      setSubmitLoading(false);
    }
  }

  async function handleBack() {
    const canNavigate = await confirmSafeNavigation();
    if (!canNavigate) return;
    router.push("/coach/engagements");
  }

  if (loading) {
    return (
      <PortalShell
        portalName={COACH_PORTAL.portalName}
        portalIcon={<CoachPortalIcon />}
        userName={portalUser.name}
        userRole={portalUser.roleLabel}
        navItems={COACH_NAV_ITEMS}
        activeItem="/coach/engagements"
      >
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            Loading engagement...
          </CardContent>
        </Card>
      </PortalShell>
    );
  }

  if (!engagement) {
    return (
      <PortalShell
        portalName={COACH_PORTAL.portalName}
        portalIcon={<CoachPortalIcon />}
        userName={portalUser.name}
        userRole={portalUser.roleLabel}
        navItems={COACH_NAV_ITEMS}
        activeItem="/coach/engagements"
      >
        <Card>
          <CardContent className="py-12 text-center text-sm text-red-700">
            {loadError || "Engagement not found"}
          </CardContent>
        </Card>
      </PortalShell>
    );
  }

  const engagementStatus = allSessionsLogged ? EngagementStatus.COMPLETED : engagement.status;

  return (
    <PortalShell
      portalName={COACH_PORTAL.portalName}
      portalIcon={<CoachPortalIcon />}
      userName={portalUser.name}
      userRole={portalUser.roleLabel}
      navItems={COACH_NAV_ITEMS}
      activeItem="/coach/engagements"
      onNavigate={handleShellNavigate}
    >
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" size="sm" onClick={() => void handleBack()}>
          Back to Engagements
        </Button>
        {engagement.meetingBookingUrl ? (
          <Button variant="outline" size="sm" asChild>
            <a href={engagement.meetingBookingUrl} target="_blank" rel="noreferrer">
              Book Next Session
            </a>
          </Button>
        ) : (
          <p className="text-xs text-muted-foreground">
            Contact your program administrator for scheduling.
          </p>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="py-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold text-fc-900">
              {engagement.participantEmail}
            </h1>
            <Badge className={cn("text-[10px]", getStatusColor(engagementStatus))}>
              {getStatusLabel(engagementStatus)}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {getStatusLabel(engagement.programCode)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {engagement.organizationName} · {engagement.cohortCode}
          </p>
          <p className="mt-2 text-xs text-fc-700">
            Progress: {sessionsCompleted}/{totalSessions}
          </p>
        </CardContent>
      </Card>

      {loadError ? (
        <Card className="mb-6 border-red-200">
          <CardContent className="py-4 text-sm text-red-700">{loadError}</CardContent>
        </Card>
      ) : null}

      <Tabs value={visibleActiveTab} onValueChange={(value) => setActiveTab(value as "log" | "history")}>
        <TabsList className="mb-5">
          {showLogTab ? (
            <TabsTrigger value="log">
              {isEditingExisting
                ? `Edit Session ${selectedSession?.sessionNumber ?? nextSessionNumber}`
                : `Log Session ${nextSessionNumber}`}
            </TabsTrigger>
          ) : null}
          <TabsTrigger value="history">Session History ({sessions.length})</TabsTrigger>
        </TabsList>

        {showLogTab ? (
          <TabsContent value="log" className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  {isEditingExisting
                    ? `Editing Session ${selectedSession?.sessionNumber}`
                    : `Session ${nextSessionNumber} Details`}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <label
                      htmlFor="session-status"
                      className="mb-1.5 block text-sm font-medium text-fc-950"
                    >
                      Session Status
                    </label>
                    <select
                      id="session-status"
                      value={form.status}
                      disabled={isEditingExisting}
                      onChange={(event) => {
                        const status = event.target.value as SessionStatus;
                        setForm((previous) => ({
                          ...previous,
                          status,
                          ...(hasForfeitStatus(status)
                            ? {
                                topic: "",
                                outcomes: [],
                                nextSteps: "",
                                actionCommitment: "",
                                engagementLevel: null,
                              }
                            : {}),
                        }));
                        if (hasForfeitStatus(status)) {
                          setOutcomesError(false);
                          setNextStepsError(false);
                          setActionCommitmentError(false);
                          setEngagementLevelError(false);
                        }
                      }}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <option value={SessionStatus.COMPLETED}>Completed</option>
                      <option value={SessionStatus.FORFEITED_CANCELLED}>
                        Forfeited - Cancelled &lt;24h
                      </option>
                      <option value={SessionStatus.FORFEITED_NOT_USED}>Forfeited - Not Used</option>
                    </select>
                  </div>

                  <div>
                    <label
                      htmlFor="occurred-at"
                      className="mb-1.5 block text-sm font-medium text-fc-950"
                    >
                      Session Date
                    </label>
                    <input
                      id="occurred-at"
                      type="date"
                      value={form.occurredAt}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, occurredAt: event.target.value }))
                      }
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    />
                  </div>

                  {!isForfeited ? (
                    <div>
                      <label htmlFor="topic" className="mb-1.5 block text-sm font-medium text-fc-950">
                        Topic
                      </label>
                      <select
                        id="topic"
                        value={form.topic}
                        onChange={(event) =>
                          setForm((previous) => ({ ...previous, topic: event.target.value }))
                        }
                        className="w-full rounded-md border border-border px-3 py-2 text-sm"
                      >
                        <option value="">Select topic</option>
                        {topics.map((topic) => (
                          <option key={topic} value={topic}>
                            {topic}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : null}
                </div>

                {!isForfeited ? (
                  <>
                    <hr className="border-border/60" />

                    <div className="space-y-5">
                      <h4 className="text-xs font-bold uppercase tracking-wider text-fc-800">
                        Session Assessment
                      </h4>

                      <fieldset style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                        <legend className="text-sm font-medium text-fc-950">
                          Session Outcomes{" "}
                          <span className="font-normal text-muted-foreground">
                            (required, select at least 1)
                          </span>
                        </legend>
                        <div className="mt-2 space-y-2 rounded-md border border-border/60 bg-muted/30 p-3">
                          {SESSION_OUTCOMES.map((value, index) => (
                            <label
                              key={value}
                              className="flex cursor-pointer items-center gap-2.5 text-sm text-fc-900"
                            >
                              <input
                                ref={index === 0 ? firstOutcomeRef : undefined}
                                type="checkbox"
                                checked={form.outcomes.includes(value)}
                                onChange={(event) => {
                                  setForm((previous) => {
                                    const nextOutcomes = event.target.checked
                                      ? [...previous.outcomes, value]
                                      : previous.outcomes.filter((entry) => entry !== value);
                                    return {
                                      ...previous,
                                      outcomes: SESSION_OUTCOMES.filter((entry) =>
                                        nextOutcomes.includes(entry)
                                      ),
                                    };
                                  });
                                  if (outcomesError) {
                                    setOutcomesError(false);
                                  }
                                }}
                                className="h-4 w-4 rounded border-gray-300 text-fc-600 focus:ring-fc-500"
                                aria-required="true"
                                aria-invalid={outcomesError || undefined}
                                aria-describedby={outcomesError ? "outcomes-error" : undefined}
                              />
                              {value}
                            </label>
                          ))}
                        </div>
                        {outcomesError ? (
                          <p id="outcomes-error" role="alert" className="mt-2 text-sm text-red-600">
                            At least one outcome is required.
                          </p>
                        ) : null}
                      </fieldset>

                      {showEarlyFinalOutcomeWarning ? (
                        <p className="text-xs text-amber-700">
                          This is session {activeSessionNumber} of {engagement.totalSessions}.
                          Selecting this outcome does not automatically close the engagement. Contact
                          your program administrator if this engagement should end early.
                        </p>
                      ) : null}

                      <div>
                        <label
                          htmlFor="next-steps"
                          className="mb-1.5 block text-sm font-medium text-fc-950"
                        >
                          Next Steps
                        </label>
                        <select
                          id="next-steps"
                          value={form.nextSteps}
                          onChange={(event) => {
                            const value = event.target.value;
                            setForm((previous) => ({ ...previous, nextSteps: value }));
                            if (nextStepsError && value.length > 0) {
                              setNextStepsError(false);
                            }
                          }}
                          className="w-full rounded-md border border-border px-3 py-2 text-sm"
                          aria-required="true"
                          aria-invalid={nextStepsError || undefined}
                          aria-describedby={nextStepsError ? "next-steps-error" : undefined}
                        >
                          <option value="">Select next steps...</option>
                          {NEXT_STEPS_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                        {nextStepsError ? (
                          <p id="next-steps-error" className="mt-2 text-sm text-red-600">
                            Next steps is required.
                          </p>
                        ) : null}
                      </div>

                      {showEarlyProgramConcludedWarning ? (
                        <p className="text-xs text-amber-700">
                          This is session {activeSessionNumber} of {engagement.totalSessions}.
                          Selecting this option does not automatically close the engagement. Contact
                          your program administrator if this engagement should end early.
                        </p>
                      ) : null}

                      <fieldset className="mt-6" style={{ border: 0, padding: 0, margin: 0, minWidth: 0 }}>
                        <legend className="text-sm font-medium text-fc-950">
                          Participant Engagement Level
                        </legend>
                        <div className="mt-3 flex items-center gap-2">
                          {ENGAGEMENT_LEVEL_OPTIONS.map(({ value }) => (
                            <label
                              key={value}
                              className={cn(
                                "flex h-10 w-full cursor-pointer items-center justify-center rounded-md border text-sm font-medium transition-colors",
                                form.engagementLevel === value
                                  ? "border-fc-600 bg-fc-50 text-fc-700"
                                  : "border-border text-muted-foreground hover:border-fc-300 hover:bg-fc-50/50"
                              )}
                            >
                              <input
                                type="radio"
                                name="engagementLevel"
                                value={value}
                                checked={form.engagementLevel === value}
                                onChange={() => {
                                  setForm((previous) => ({ ...previous, engagementLevel: value }));
                                  if (engagementLevelError) {
                                    setEngagementLevelError(false);
                                  }
                                }}
                                className="sr-only"
                                aria-required="true"
                                aria-invalid={engagementLevelError || undefined}
                                aria-describedby={engagementLevelError ? "engagement-level-error" : undefined}
                              />
                              {value}
                            </label>
                          ))}
                        </div>
                        <div className="mt-4 grid gap-2 md:grid-cols-3">
                          {ENGAGEMENT_LEVEL_OPTIONS.filter((option) => option.description).map(
                            ({ value, label, description }) => (
                              <div
                                key={value}
                                className={cn(
                                  "rounded-md border px-3 py-2 text-xs leading-relaxed",
                                  form.engagementLevel === value
                                    ? "border-fc-300 bg-fc-50/80 text-fc-900"
                                    : "border-border/60 bg-muted/20 text-muted-foreground"
                                )}
                              >
                                <p className="font-semibold text-fc-900">{label}</p>
                                <p className="mt-1">{description}</p>
                              </div>
                            )
                          )}
                        </div>
                        {engagementLevelError ? (
                          <p
                            id="engagement-level-error"
                            role="alert"
                            className="mt-2 text-sm text-red-600"
                          >
                            Participant engagement level is required.
                          </p>
                        ) : null}
                      </fieldset>

                      <div>
                        <label
                          htmlFor="action-commitment"
                          className="mb-1.5 block text-sm font-medium text-fc-950"
                        >
                          Action-Commitment Tracking
                        </label>
                        <select
                          id="action-commitment"
                          value={form.actionCommitment}
                          onChange={(event) => {
                            const value = event.target.value;
                            setForm((previous) => ({ ...previous, actionCommitment: value }));
                            if (actionCommitmentError && value.length > 0) {
                              setActionCommitmentError(false);
                            }
                          }}
                          className="w-full rounded-md border border-border px-3 py-2 text-sm"
                          aria-required="true"
                          aria-invalid={actionCommitmentError || undefined}
                          aria-describedby={actionCommitmentError ? "action-commitment-error" : undefined}
                        >
                          <option value="">Select action-commitment status...</option>
                          {ACTION_COMMITMENT_OPTIONS.map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                        {actionCommitmentError ? (
                          <p id="action-commitment-error" className="mt-2 text-sm text-red-600">
                            Action-commitment tracking is required.
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </>
                ) : null}

                <hr className="border-border/60" />

                <div className="space-y-3">
                  <div>
                    <label htmlFor="notes" className="mb-1.5 block text-sm font-medium text-fc-950">
                      Notes
                    </label>
                    <p className="mb-2 text-xs text-muted-foreground">
                      Visible to program administrators
                    </p>
                    <textarea
                      id="notes"
                      value={form.notes}
                      onChange={(event) =>
                        setForm((previous) => ({ ...previous, notes: event.target.value }))
                      }
                      rows={5}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    />
                  </div>

                  <AutoSaveText status={autoSave.saveStatus} savedAt={lastSavedAt} />

                  {submitError ? <p className="text-sm text-red-700">{submitError}</p> : null}

                  <div className="flex flex-wrap items-center gap-2">
                    {!isEditingExisting ? (
                      <Button
                        onClick={() => void handleSubmitNewSession()}
                        disabled={submitLoading || sessions.length >= engagement.totalSessions}
                      >
                        {submitLoading ? "Logging Session..." : "Log Session"}
                      </Button>
                    ) : null}

                    {isEditingExisting && sessions.length < engagement.totalSessions ? (
                      <Button
                        variant="outline"
                        onClick={() => {
                          setSelectedSessionId(null);
                          setSubmitError(null);
                        }}
                      >
                        Log Next Session
                      </Button>
                    ) : null}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        ) : null}

        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Session Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {allSessionsLogged ? (
                <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm font-medium text-emerald-800">
                    All {engagement.totalSessions} sessions have been logged for this engagement.
                  </p>
                </div>
              ) : null}

              {sessions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No sessions logged yet.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={cn(
                        "rounded-md border px-4 py-3",
                        selectedSessionId === session.id
                          ? "border-fc-400 bg-fc-50"
                          : "border-border/60"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-fc-900">
                            Session {session.sessionNumber} · {getStatusLabel(session.status)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.occurredAt ? formatDate(session.occurredAt) : "No date"}
                          </p>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedSessionId(session.id);
                            setActiveTab("log");
                          }}
                        >
                          Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PortalShell>
  );
}
