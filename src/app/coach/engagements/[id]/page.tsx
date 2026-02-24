/**
 * SLICE 2 PARTIAL — ships March 9, not March 2.
 *
 * This page is scaffolded and UI-complete but is NOT wired to the real API yet.
 * The session logging form (topic/outcome/duration/notes) renders with demo data.
 * Full wiring requires Slice 2 backend:
 *   - GET /api/coach/engagements/:id  (fetch real engagement by route param)
 *   - POST /api/coach/sessions         (submit session log)
 * Do not include this page in Slice 1 scope claims or beta test scripts.
 */
"use client";

import React, { useState, useEffect, useCallback } from "react";
import { PortalShell } from "@/components/navigation";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn, getInitials, getStatusColor, getStatusLabel } from "@/lib/utils";
import { COACH_NAV_ITEMS, COACH_PORTAL, CoachPortalIcon } from "@/lib/nav-config";
import { MLP_SESSION_TOPICS, SESSION_OUTCOMES, DURATION_OPTIONS } from "@/lib/config";

// ─── Icons ────────────────────────────────────────────────────────────────────

function CalendarIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}

function SaveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
      <path d="M9 22v-4h6v4" />
      <line x1="8" y1="6" x2="10" y2="6" />
      <line x1="14" y1="6" x2="16" y2="6" />
      <line x1="8" y1="10" x2="10" y2="10" />
      <line x1="14" y1="10" x2="16" y2="10" />
      <line x1="8" y1="14" x2="10" y2="14" />
      <line x1="14" y1="14" x2="16" y2="14" />
    </svg>
  );
}


function SpinnerIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="animate-spin">
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

// ─── Demo Data ────────────────────────────────────────────────────────────────

const participant = {
  name: "James Rodriguez",
  organization: "Dept. of Commerce",
  title: "Deputy Director, Office of Policy Analysis",
  email: "j.rodriguez@commerce.gov",
  programTrack: "FIVE_SESSION",
  engagementStatus: "IN_PROGRESS",
  startDate: "Jan 15, 2026",
  targetEndDate: "Mar 30, 2026",
  currentSession: 3,
  totalSessions: 5,
};

const sessionHistory = [
  {
    id: "sh-1",
    sessionNumber: 1,
    date: "Jan 20, 2026",
    duration: 60,
    status: "completed" as const,
    topics: ["Goal Setting", "Leadership Development"],
    outcomes: ["Action Plan Created", "In Progress"],
    notesPreview:
      "Established baseline leadership assessment. James identified three key areas for growth: delegation, strategic communication, and conflict resolution. Strong engagement and self-awareness.",
    privateNotes:
      "James seems highly motivated but may need support with delegation specifically. His 360 feedback highlighted a tendency to micromanage. Approach gently.",
  },
  {
    id: "sh-2",
    sessionNumber: 2,
    date: "Feb 3, 2026",
    duration: 45,
    status: "completed" as const,
    topics: ["Communication Skills", "Team Building"],
    outcomes: ["In Progress", "Needs Follow-up"],
    notesPreview:
      "Deep dive into communication frameworks. Practiced active listening techniques. James shared a recent team conflict situation that we role-played through. Good progress on awareness, needs practice.",
    privateNotes:
      "The team conflict he mentioned seems more serious than initially presented. May want to revisit next session. He responded well to the SBAR framework.",
  },
];

// ─── Duration Selector ────────────────────────────────────────────────────────

function DurationSelector({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (duration: number) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {DURATION_OPTIONS.map((mins) => (
        <button
          key={mins}
          type="button"
          onClick={() => onChange(mins)}
          className={cn(
            "rounded-full border px-4 py-2 text-sm font-medium transition-all duration-200",
            value === mins
              ? "border-fc-700 bg-fc-800 text-white shadow-sm"
              : "border-border/60 bg-white text-muted-foreground hover:border-fc-200 hover:bg-fc-50/30 hover:text-fc-700"
          )}
        >
          {mins} min
        </button>
      ))}
    </div>
  );
}

// ─── Session Timeline Item ────────────────────────────────────────────────────

function TimelineItem({
  session,
  isLast,
  delay,
}: {
  session: (typeof sessionHistory)[0];
  isLast: boolean;
  delay: number;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="relative flex gap-4 opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Timeline line */}
      <div className="flex flex-col items-center">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 ring-4 ring-white">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        {!isLast && (
          <div className="w-px flex-1 bg-gradient-to-b from-emerald-200 to-border/30" />
        )}
      </div>

      {/* Content */}
      <div className={cn("flex-1 pb-8", isLast && "pb-0")}>
        <div className="flex items-center gap-2 mb-1">
          <p className="text-sm font-medium text-fc-900">
            Session {session.sessionNumber}
          </p>
          <span className="text-xs text-muted-foreground">&middot;</span>
          <span className="text-xs text-muted-foreground">{session.date}</span>
          <span className="text-xs text-muted-foreground">&middot;</span>
          <span className="text-xs text-muted-foreground">{session.duration} min</span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {session.topics.map((topic) => (
            <Badge key={topic} variant="outline" className="text-[10px] font-normal">
              {topic}
            </Badge>
          ))}
        </div>

        <p className="text-xs leading-relaxed text-muted-foreground line-clamp-2">
          {session.notesPreview}
        </p>

        {expanded && (
          <div className="mt-3 space-y-2 animate-fade-in">
            <div className="flex flex-wrap gap-1.5">
              {session.outcomes.map((outcome) => (
                <Badge key={outcome} variant="info" className="text-[10px] font-normal">
                  {outcome}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={() => setExpanded(!expanded)}
          className="mt-2 text-xs font-medium text-fc-600 hover:text-fc-800 transition-colors"
        >
          {expanded ? "Show less" : "Show more"}
        </button>
      </div>
    </div>
  );
}

// ─── Auto-Save Indicator ──────────────────────────────────────────────────────

function AutoSaveIndicator({
  status,
}: {
  status: "idle" | "saving" | "saved" | "draft";
}) {
  if (status === "idle") return null;

  return (
    <div
      className={cn(
        "flex items-center gap-1.5 text-xs font-medium transition-all duration-300",
        status === "saving" && "text-fc-500",
        status === "saved" && "text-emerald-600",
        status === "draft" && "text-fc-700"
      )}
    >
      {status === "saving" && (
        <>
          <SpinnerIcon />
          <span>Saving...</span>
        </>
      )}
      {status === "saved" && (
        <>
          <SaveIcon />
          <span>Saved as draft</span>
        </>
      )}
      {status === "draft" && (
        <>
          <div className="h-1.5 w-1.5 rounded-full bg-fc-500 animate-pulse-subtle" />
          <span>Draft</span>
        </>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CoachEngagementDetailPage() {
  // Form state — dropdowns per spec
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState("");
  const [duration, setDuration] = useState<number | null>(null);
  const [privateNotes, setPrivateNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "draft">("idle");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("log");

  // Track whether the form has any content for auto-save
  const hasFormContent =
    selectedTopic !== "" ||
    selectedOutcome !== "" ||
    duration !== null ||
    privateNotes.length > 0;

  // Auto-save simulation
  const triggerAutoSave = useCallback(() => {
    if (!hasFormContent || isSubmitted) return;
    setSaveStatus("saving");
    const timer = setTimeout(() => {
      setSaveStatus("saved");
      const resetTimer = setTimeout(() => {
        setSaveStatus("draft");
      }, 2000);
      return () => clearTimeout(resetTimer);
    }, 800);
    return () => clearTimeout(timer);
  }, [hasFormContent, isSubmitted]);

  // Trigger auto-save on form changes
  useEffect(() => {
    if (!hasFormContent) {
      setSaveStatus("idle");
      return;
    }
    const debounce = setTimeout(() => {
      triggerAutoSave();
    }, 1500);
    return () => clearTimeout(debounce);
  }, [selectedTopic, selectedOutcome, duration, privateNotes, hasFormContent, triggerAutoSave]);

  // Handle submit — require topic (any, including "Other"), outcome (non-empty), duration
  const canSubmit =
    selectedTopic !== "" &&
    selectedOutcome !== "" &&
    duration !== null;

  const handleSubmit = () => {
    if (!canSubmit) return;
    setSaveStatus("saving");
    setTimeout(() => {
      setIsSubmitted(true);
      setSaveStatus("idle");
    }, 1200);
  };

  const progressPercent =
    ((participant.currentSession - 1) / participant.totalSessions) * 100;

  return (
    <PortalShell
      portalName={COACH_PORTAL.portalName}
      portalIcon={<CoachPortalIcon />}
      userName={COACH_PORTAL.userName}
      userRole={COACH_PORTAL.userRole}
      navItems={COACH_NAV_ITEMS}
      activeItem="/coach/engagements"
    >
      {/* Back nav */}
      <div
        className="mb-6 opacity-0 animate-fade-in"
        style={{ animationDelay: "50ms" }}
      >
        <a
          href="/coach/dashboard"
          className="group inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-fc-800 transition-colors"
        >
          <span className="transition-transform duration-200 group-hover:-translate-x-0.5">
            <ArrowLeftIcon />
          </span>
          Back to Dashboard
        </a>
      </div>

      {/* Participant Info Header */}
      <Card
        className="mb-8 opacity-0 animate-fade-in"
        style={{ animationDelay: "100ms" }}
      >
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-center gap-5">
            {/* Avatar + name */}
            <div className="flex items-center gap-4 flex-1 min-w-0">
              <Avatar className="h-14 w-14 shrink-0">
                <AvatarFallback className="bg-fc-100 text-fc-700 font-display font-semibold text-lg">
                  {getInitials(participant.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <h1 className="font-display text-xl sm:text-2xl font-semibold text-fc-900 truncate">
                  {participant.name}
                </h1>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <BuildingIcon />
                    {participant.organization}
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    &middot;
                  </span>
                  <span className="text-xs text-muted-foreground hidden sm:inline">
                    {participant.title}
                  </span>
                </div>
              </div>
            </div>

            {/* Badges + dates */}
            <div className="flex flex-wrap items-center gap-3 lg:gap-4">
              <Badge variant="default" className="text-xs">
                {getStatusLabel(participant.programTrack)}
              </Badge>
              <Badge className={cn("text-xs", getStatusColor(participant.engagementStatus))}>
                {getStatusLabel(participant.engagementStatus)}
              </Badge>
              <Separator orientation="vertical" className="h-5 hidden lg:block" />
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <CalendarIcon />
                  {participant.startDate}
                </span>
                <span>&rarr;</span>
                <span>{participant.targetEndDate}</span>
              </div>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-5 pt-5 border-t border-border/40">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-medium text-fc-700">
                Engagement Progress
              </span>
              <span className="text-xs font-medium text-fc-700">
                Session {participant.currentSession} of {participant.totalSessions}
              </span>
            </div>
            <div className="relative">
              <Progress value={progressPercent} className="h-2" />
              {/* Session dots */}
              <div className="absolute inset-0 flex items-center justify-between px-0">
                {Array.from({ length: participant.totalSessions }).map((_, i) => {
                  const dotPos = (i / (participant.totalSessions - 1)) * 100;
                  const isCompleted = i < participant.currentSession - 1;
                  const isCurrent = i === participant.currentSession - 1;
                  return (
                    <div
                      key={i}
                      className={cn(
                        "absolute h-3 w-3 rounded-full border-2 transition-all duration-300",
                        isCompleted
                          ? "border-fc-600 bg-fc-600"
                          : isCurrent
                          ? "border-fc-600 bg-white ring-2 ring-fc-200"
                          : "border-fc-200 bg-white"
                      )}
                      style={{ left: `${dotPos}%`, transform: "translateX(-50%)" }}
                    />
                  );
                })}
              </div>
            </div>
            <div className="flex justify-between mt-2">
              {Array.from({ length: participant.totalSessions }).map((_, i) => (
                <span
                  key={i}
                  className={cn(
                    "text-[10px] font-medium",
                    i < participant.currentSession - 1
                      ? "text-fc-700"
                      : i === participant.currentSession - 1
                      ? "text-fc-800 font-semibold"
                      : "text-muted-foreground"
                  )}
                >
                  S{i + 1}
                </span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs: Log Session / History */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="opacity-0 animate-fade-in"
        style={{ animationDelay: "200ms" }}
      >
        <TabsList className="mb-6">
          <TabsTrigger value="log">
            Log Session {participant.currentSession}
          </TabsTrigger>
          <TabsTrigger value="history">
            Session History
            <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fc-100 px-1 text-[9px] font-semibold text-fc-700">
              {sessionHistory.length}
            </span>
          </TabsTrigger>
        </TabsList>

        {/* ─── LOG SESSION TAB ─────────────────────────────────────── */}
        <TabsContent value="log">
          {isSubmitted ? (
            /* Submitted confirmation */
            <Card className="animate-scale-in">
              <CardContent className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-700">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <h3 className="font-display text-xl font-semibold text-fc-900 mb-2">
                  Session Logged Successfully
                </h3>
                <p className="text-sm text-muted-foreground max-w-sm mx-auto mb-6">
                  Session {participant.currentSession} for {participant.name} has been
                  recorded. The participant can view the shared notes.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" size="sm" asChild>
                    <a href="/coach/dashboard">Return to Dashboard</a>
                  </Button>
                  <Button size="sm">Schedule Next Session</Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Session logging form */
            <div className="space-y-6">

                {/* Topic — single-select dropdown */}
                <Card
                  className="opacity-0 animate-fade-in"
                  style={{ animationDelay: "250ms" }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Topic Discussed</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      Select the primary topic covered in this session
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <select
                      value={selectedTopic}
                      onChange={(e) => setSelectedTopic(e.target.value)}
                      className="w-full border border-fc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fc-600/20 text-fc-800"
                    >
                      <option value="">Select a topic...</option>
                      {MLP_SESSION_TOPICS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>

                    {selectedTopic === "Other" && (
                      <div className="mt-3 rounded-lg border border-fc-200 bg-fc-50 px-4 py-3 text-sm text-fc-700">
                        Please email the coaching practice
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Outcome — single-select dropdown */}
                <Card
                  className="opacity-0 animate-fade-in"
                  style={{ animationDelay: "300ms" }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Session Outcome</CardTitle>
                    <CardDescription className="text-xs mt-1">
                      What was accomplished in this session?
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <select
                      value={selectedOutcome}
                      onChange={(e) => setSelectedOutcome(e.target.value)}
                      className="w-full border border-fc-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-fc-600/20 text-fc-800"
                    >
                      <option value="">Select an outcome...</option>
                      {SESSION_OUTCOMES.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </CardContent>
                </Card>

                {/* Duration — pill selector */}
                <Card
                  className="opacity-0 animate-fade-in"
                  style={{ animationDelay: "350ms" }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">Session Duration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <DurationSelector value={duration} onChange={setDuration} />
                  </CardContent>
                </Card>

                {/* Private Notes */}
                <Card
                  className="opacity-0 animate-fade-in border-dashed border-fc-200/80 bg-gradient-to-br from-white to-fc-50/20"
                  style={{ animationDelay: "400ms" }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="flex h-6 w-6 items-center justify-center rounded bg-fc-100 text-fc-600">
                          <LockIcon />
                        </div>
                        <div>
                          <CardTitle className="text-base">Private Notes</CardTitle>
                          <CardDescription className="text-[11px] mt-0.5">
                            Only visible to you &mdash; never shared with the participant
                          </CardDescription>
                        </div>
                      </div>
                      <AutoSaveIndicator status={saveStatus} />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <textarea
                      value={privateNotes}
                      onChange={(e) => setPrivateNotes(e.target.value)}
                      placeholder="Observations, follow-up ideas, notes for next session..."
                      rows={5}
                      className="w-full rounded-lg border border-fc-200/60 bg-white/80 px-4 py-3 text-sm font-body text-fc-800 placeholder:text-muted-foreground/50 focus:outline-none focus:ring-2 focus:ring-fc-300 focus:border-fc-300 transition-all duration-200 resize-none leading-relaxed"
                    />
                    <p className="mt-2 text-[11px] text-muted-foreground flex items-center gap-1">
                      <LockIcon />
                      Encrypted and private. Only accessible by you.
                    </p>
                  </CardContent>
                </Card>

                {/* Submit */}
                <Card
                  className="opacity-0 animate-fade-in"
                  style={{ animationDelay: "450ms" }}
                >
                  <CardContent className="p-5">
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                      <div className="space-y-1">
                        <p className="text-sm font-medium text-fc-800">
                          Ready to submit?
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Once submitted, session notes will be visible to the program
                          administrator.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <AutoSaveIndicator status={saveStatus} />
                        <Button
                          onClick={handleSubmit}
                          disabled={!canSubmit}
                          className="min-w-[140px]"
                        >
                          {saveStatus === "saving" ? (
                            <>
                              <SpinnerIcon />
                              Submitting...
                            </>
                          ) : (
                            <>
                              <SendIcon />
                              Submit Session
                            </>
                          )}
                        </Button>
                      </div>
                    </div>

                    {/* Validation hint */}
                    {!canSubmit && (
                      <div className="mt-4 rounded-lg bg-fc-50/50 px-4 py-2.5 text-xs text-muted-foreground">
                        <span className="font-medium">To submit:</span>{" "}
                        {selectedTopic === "" && "Select a topic. "}
                        {selectedOutcome === "" && "Select an outcome. "}
                        {duration === null && "Choose a session duration."}
                      </div>
                    )}
                  </CardContent>
                </Card>
          </div>
          )}
        </TabsContent>

        {/* ─── SESSION HISTORY TAB ─────────────────────────────────── */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session History</CardTitle>
              <CardDescription className="text-xs">
                {sessionHistory.length} of {participant.totalSessions} sessions completed
              </CardDescription>
            </CardHeader>
            <CardContent>
              {sessionHistory.length > 0 ? (
                <div className="space-y-0">
                  {sessionHistory.map((session, i) => (
                    <TimelineItem
                      key={session.id}
                      session={session}
                      isLast={i === sessionHistory.length - 1}
                      delay={250 + i * 80}
                    />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-fc-50 text-fc-300 mb-3">
                    <ClockIcon />
                  </div>
                  <p className="text-sm text-muted-foreground">
                    No sessions logged yet.
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Session notes will appear here after logging.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PortalShell>
  );
}
