"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { SessionStatus } from "@prisma/client";
import { PortalShell } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { COACH_NAV_ITEMS, COACH_PORTAL, CoachPortalIcon } from "@/lib/nav-config";
import { DURATION_OPTIONS, SESSION_OUTCOMES, SESSION_TOPICS_BY_PROGRAM } from "@/lib/config";
import { cn, formatDate, getStatusColor, getStatusLabel } from "@/lib/utils";
import { usePortalUser } from "@/lib/use-portal-user";
import {
  CoachApiError,
  createCoachSession,
  fetchCoachEngagementDetail,
  fetchCoachSessions,
  updateCoachSession,
} from "@/lib/coach-api-client";
import type { CoachEngagementDetail, CoachSessionRow } from "@/lib/types/coach";
import { useAutoSave } from "@/hooks/use-auto-save";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";

interface SessionFormState {
  status: SessionStatus;
  occurredAt: string;
  topic: string;
  outcome: string;
  durationMinutes: number | null;
  privateNotes: string;
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
    outcome: "",
    durationMinutes: null,
    privateNotes: "",
  };
}

function toPatchPayload(form: SessionFormState): {
  occurredAt: string | null;
  topic: string | null;
  outcome: string | null;
  durationMinutes: number | null;
  privateNotes: string | null;
} {
  return {
    occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : null,
    topic: form.topic.trim() || null,
    outcome: form.outcome.trim() || null,
    durationMinutes: form.durationMinutes,
    privateNotes: form.privateNotes.trim() || null,
  };
}

function hasForfeitStatus(status: SessionStatus): boolean {
  return status === SessionStatus.FORFEITED_CANCELLED || status === SessionStatus.FORFEITED_NOT_USED;
}

function AutoSaveText({
  status,
  savedAt,
}: {
  status: "idle" | "saving" | "saved" | "error";
  savedAt: string | null;
}) {
  if (status === "saving") return <p className="text-xs text-fc-600">Saving...</p>;
  if (status === "error") return <p className="text-xs text-red-700">Auto-save failed. Changes remain in the form.</p>;
  if (status === "saved") return <p className="text-xs text-emerald-700">Saved</p>;
  if (savedAt) {
    const date = new Date(savedAt);
    return (
      <p className="text-xs text-muted-foreground">
        Last saved {date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
      </p>
    );
  }
  return null;
}

export default function CoachEngagementDetailPage() {
  const params = useParams<{ id: string }>();
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

  const selectedSession = useMemo(
    () => (selectedSessionId ? sessions.find((row) => row.id === selectedSessionId) || null : null),
    [selectedSessionId, sessions]
  );

  const isEditingExisting = Boolean(selectedSession);
  const isForfeited = hasForfeitStatus(form.status);

  const topics = useMemo(() => {
    if (!engagement) return [] as readonly string[];
    return SESSION_TOPICS_BY_PROGRAM[engagement.programCode] as readonly string[];
  }, [engagement]);

  const nextSessionNumber = useMemo(() => {
    if (!engagement) return 1;
    return Math.min(sessions.length + 1, engagement.totalSessions);
  }, [engagement, sessions.length]);

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
        const message = error instanceof CoachApiError ? error.message : "Failed to load engagement";
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
    if (!selectedSession) {
      setForm(defaultFormState());
      setLastSavedAt(null);
      return;
    }

    setForm({
      status: selectedSession.status,
      occurredAt: toDateInput(selectedSession.occurredAt),
      topic: selectedSession.topic || "",
      outcome: selectedSession.outcome || "",
      durationMinutes: selectedSession.durationMinutes,
      privateNotes: selectedSession.privateNotes || "",
    });
    setLastSavedAt(selectedSession.updatedAt);
  }, [selectedSession]);

  const autoSavePayload = useMemo(() => toPatchPayload(form), [form]);

  const autoSave = useAutoSave({
    data: autoSavePayload,
    identity: selectedSessionId || "new",
    enabled: isEditingExisting,
    debounceMs: 5000,
    onSave: async (payload) => {
      if (!selectedSessionId) return;
      const response = await updateCoachSession(selectedSessionId, payload);
      setSessions((previous) =>
        previous.map((row) => (row.id === response.item.id ? response.item : row))
      );
      setLastSavedAt(response.item.updatedAt);
      setSubmitError(null);
    },
  });

  const hasComposeChanges =
    !isEditingExisting &&
    (form.occurredAt.length > 0 ||
      form.topic.length > 0 ||
      form.outcome.length > 0 ||
      form.durationMinutes !== null ||
      form.privateNotes.trim().length > 0 ||
      form.status !== SessionStatus.COMPLETED);

  const unsaved = useUnsavedChangesWarning({
    hasUnsavedChanges:
      hasComposeChanges || autoSave.hasPendingChanges || autoSave.isSaving || autoSave.hasError,
  });

  const handleShellNavigate = useCallback(
    async (_href: string) => {
      if (isEditingExisting && autoSave.hasPendingChanges) {
        await autoSave.flush();
      }
      return unsaved.confirmNavigation();
    },
    [autoSave, isEditingExisting, unsaved]
  );

  const canSubmit = useMemo(() => {
    if (isEditingExisting || !engagement) return false;
    if (sessions.length >= engagement.totalSessions) return false;
    if (isForfeited) return true;
    return (
      form.occurredAt.length > 0 &&
      form.topic.length > 0 &&
      form.outcome.length > 0 &&
      form.durationMinutes !== null
    );
  }, [engagement, form, isEditingExisting, isForfeited, sessions.length]);

  async function handleSubmitNewSession() {
    if (!engagement || !canSubmit || submitLoading) return;
    setSubmitLoading(true);
    setSubmitError(null);

    try {
      const response = await createCoachSession({
        engagementId: engagement.engagementId,
        status: form.status,
        occurredAt: form.occurredAt ? new Date(form.occurredAt).toISOString() : null,
        topic: form.topic.trim() || null,
        outcome: form.outcome.trim() || null,
        durationMinutes: form.durationMinutes,
        privateNotes: form.privateNotes.trim() || null,
      });

      setSessions((previous) => {
        const next = [...previous, response.item];
        next.sort((a, b) => a.sessionNumber - b.sessionNumber);
        return next;
      });
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
    if (isEditingExisting && autoSave.hasPendingChanges) {
      await autoSave.flush();
    }
    await unsaved.guardedPush("/coach/engagements");
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
          <CardContent className="py-12 text-center text-sm text-muted-foreground">Loading engagement...</CardContent>
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
          <CardContent className="py-12 text-center text-sm text-red-700">{loadError || "Engagement not found"}</CardContent>
        </Card>
      </PortalShell>
    );
  }

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
      <div className="mb-6 flex items-center justify-between">
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
          <p className="text-xs text-muted-foreground">Contact your program administrator for scheduling.</p>
        )}
      </div>

      <Card className="mb-6">
        <CardContent className="py-5">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-2xl font-semibold text-fc-900">{engagement.participantEmail}</h1>
            <Badge className={cn("text-[10px]", getStatusColor(engagement.status))}>
              {getStatusLabel(engagement.status)}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {getStatusLabel(engagement.programCode)}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {engagement.organizationName} · {engagement.cohortCode}
          </p>
          <p className="mt-2 text-xs text-fc-700">
            Progress: {engagement.sessionsCompleted}/{engagement.totalSessions}
          </p>
        </CardContent>
      </Card>

      {loadError ? (
        <Card className="mb-6 border-red-200">
          <CardContent className="py-4 text-sm text-red-700">{loadError}</CardContent>
        </Card>
      ) : null}

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "log" | "history")}>
        <TabsList className="mb-5">
          <TabsTrigger value="log">Log Session {nextSessionNumber}</TabsTrigger>
          <TabsTrigger value="history">Session History ({sessions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="log" className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                {isEditingExisting
                  ? `Editing Session ${selectedSession?.sessionNumber}`
                  : `Session ${nextSessionNumber} Details`}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label htmlFor="session-status" className="mb-1 block text-xs font-medium text-fc-800">
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
                        ? { topic: "", outcome: "", durationMinutes: null }
                        : {}),
                    }));
                  }}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                >
                  <option value={SessionStatus.COMPLETED}>Completed</option>
                  <option value={SessionStatus.FORFEITED_CANCELLED}>Forfeited - Cancelled &lt;24h</option>
                  <option value={SessionStatus.FORFEITED_NOT_USED}>Forfeited - Not Used</option>
                </select>
              </div>

              <div>
                <label htmlFor="occurred-at" className="mb-1 block text-xs font-medium text-fc-800">
                  Session Date
                </label>
                <input
                  id="occurred-at"
                  type="date"
                  value={form.occurredAt}
                  onChange={(event) => setForm((previous) => ({ ...previous, occurredAt: event.target.value }))}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                />
              </div>

              {!isForfeited ? (
                <>
                  <div>
                    <label htmlFor="topic" className="mb-1 block text-xs font-medium text-fc-800">
                      Topic
                    </label>
                    <select
                      id="topic"
                      value={form.topic}
                      onChange={(event) => setForm((previous) => ({ ...previous, topic: event.target.value }))}
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

                  <div>
                    <label htmlFor="outcome" className="mb-1 block text-xs font-medium text-fc-800">
                      Outcome
                    </label>
                    <select
                      id="outcome"
                      value={form.outcome}
                      onChange={(event) => setForm((previous) => ({ ...previous, outcome: event.target.value }))}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <option value="">Select outcome</option>
                      {SESSION_OUTCOMES.map((outcome) => (
                        <option key={outcome} value={outcome}>
                          {outcome}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="duration" className="mb-1 block text-xs font-medium text-fc-800">
                      Duration
                    </label>
                    <select
                      id="duration"
                      value={form.durationMinutes === null ? "" : String(form.durationMinutes)}
                      onChange={(event) => {
                        const value = event.target.value;
                        setForm((previous) => ({
                          ...previous,
                          durationMinutes: value ? Number.parseInt(value, 10) : null,
                        }));
                      }}
                      className="w-full rounded-md border border-border px-3 py-2 text-sm"
                    >
                      <option value="">Select duration</option>
                      {DURATION_OPTIONS.map((duration) => (
                        <option key={duration} value={duration}>
                          {duration} minutes
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              ) : null}

              <div>
                <label htmlFor="private-notes" className="mb-1 block text-xs font-medium text-fc-800">
                  Private Notes
                </label>
                <textarea
                  id="private-notes"
                  value={form.privateNotes}
                  onChange={(event) => setForm((previous) => ({ ...previous, privateNotes: event.target.value }))}
                  rows={5}
                  className="w-full rounded-md border border-border px-3 py-2 text-sm"
                />
              </div>

              <AutoSaveText status={autoSave.saveStatus} savedAt={lastSavedAt} />

              {submitError ? <p className="text-sm text-red-700">{submitError}</p> : null}

              <div className="flex flex-wrap items-center gap-2">
                {!isEditingExisting ? (
                  <Button onClick={() => void handleSubmitNewSession()} disabled={!canSubmit || submitLoading}>
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
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Session Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {sessions.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No sessions logged yet.</p>
              ) : (
                <div className="space-y-2">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={cn(
                        "rounded-md border px-4 py-3",
                        selectedSessionId === session.id ? "border-fc-400 bg-fc-50" : "border-border/60"
                      )}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-fc-900">
                            Session {session.sessionNumber} · {getStatusLabel(session.status)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {session.occurredAt
                              ? formatDate(session.occurredAt)
                              : "No date"}
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
