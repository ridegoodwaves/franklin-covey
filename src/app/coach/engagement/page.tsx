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

// ─── Icons ────────────────────────────────────────────────────────────────────

function DashboardIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
  );
}

function EngagementIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function ProfileIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

function CoachPortalIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

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

function FileTextIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
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

const topicOptions = [
  "Goal Setting",
  "Leadership Development",
  "Communication Skills",
  "Time Management",
  "Conflict Resolution",
  "Team Building",
  "Career Planning",
  "Stress Management",
  "Decision Making",
  "Other",
];

const outcomeOptions = [
  "Action Plan Created",
  "Goal Achieved",
  "In Progress",
  "Needs Follow-up",
  "Participant Satisfied",
  "Referred to Resources",
];

const durationOptions = [15, 30, 45, 60, 90];

// ─── Nav Items ────────────────────────────────────────────────────────────────

const navItems = [
  { label: "Dashboard", href: "/coach/dashboard", icon: <DashboardIcon /> },
  {
    label: "My Engagements",
    href: "/coach/engagements",
    icon: <EngagementIcon />,
    active: true,
    badge: 6,
  },
  { label: "Profile", href: "/coach/profile", icon: <ProfileIcon /> },
];

// ─── Stylish Checkbox ─────────────────────────────────────────────────────────

function StylishCheckbox({
  label,
  checked,
  onChange,
  variant = "default",
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  variant?: "default" | "outcome";
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "group flex items-center gap-2.5 rounded-lg border px-3 py-2 text-sm transition-all duration-200 text-left",
        checked
          ? variant === "outcome"
            ? "border-emerald-300 bg-emerald-50/80 text-emerald-800"
            : "border-fc-300 bg-fc-50/80 text-fc-800"
          : "border-border/60 bg-white text-muted-foreground hover:border-fc-200 hover:bg-fc-50/30 hover:text-fc-700"
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-200",
          checked
            ? variant === "outcome"
              ? "border-emerald-500 bg-emerald-500 text-white"
              : "border-fc-700 bg-fc-700 text-white"
            : "border-border group-hover:border-fc-300"
        )}
      >
        {checked && <CheckIcon />}
      </span>
      <span className="font-medium text-xs">{label}</span>
    </button>
  );
}

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
      {durationOptions.map((mins) => (
        <button
          key={mins}
          type="button"
          onClick={() => onChange(mins)}
          className={cn(
            "rounded-lg border px-4 py-2 text-sm font-medium transition-all duration-200",
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
          <span className="text-xs text-muted-foreground">
            {session.date}
          </span>
          <span className="text-xs text-muted-foreground">&middot;</span>
          <span className="text-xs text-muted-foreground">
            {session.duration} min
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5 mb-2">
          {session.topics.map((topic) => (
            <Badge
              key={topic}
              variant="outline"
              className="text-[10px] font-normal"
            >
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
                <Badge
                  key={outcome}
                  variant="info"
                  className="text-[10px] font-normal"
                >
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

// ─── Previous Session Context Panel ───────────────────────────────────────────

function PreviousSessionPanel({ delay }: { delay: number }) {
  const prevSession = sessionHistory[sessionHistory.length - 1];
  if (!prevSession) return null;

  return (
    <Card
      className="border-fc-100/80 bg-fc-50/30 opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileTextIcon />
          <CardTitle className="text-sm">
            Previous Session Context
          </CardTitle>
        </div>
        <CardDescription className="text-xs">
          Session {prevSession.sessionNumber} &middot; {prevSession.date} &middot;{" "}
          {prevSession.duration} min
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Topics Covered
          </p>
          <div className="flex flex-wrap gap-1.5">
            {prevSession.topics.map((topic) => (
              <Badge
                key={topic}
                variant="outline"
                className="text-[10px] font-normal"
              >
                {topic}
              </Badge>
            ))}
          </div>
        </div>

        <Separator className="opacity-40" />

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Session Notes
          </p>
          <p className="text-xs leading-relaxed text-fc-700">
            {prevSession.notesPreview}
          </p>
        </div>

        <Separator className="opacity-40" />

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
            Outcomes
          </p>
          <div className="flex flex-wrap gap-1.5">
            {prevSession.outcomes.map((outcome) => (
              <Badge
                key={outcome}
                variant="info"
                className="text-[10px] font-normal"
              >
                {outcome}
              </Badge>
            ))}
          </div>
        </div>

        {/* Private notes from previous session */}
        <div className="rounded-lg border border-dashed border-fc-200/60 bg-white/60 p-3">
          <div className="flex items-center gap-1.5 mb-1.5">
            <LockIcon />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Your Private Notes
            </p>
          </div>
          <p className="text-xs leading-relaxed text-fc-600 italic">
            {prevSession.privateNotes}
          </p>
        </div>
      </CardContent>
    </Card>
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

export default function CoachEngagementDetail() {
  // Form state
  const [selectedTopics, setSelectedTopics] = useState<string[]>([]);
  const [selectedOutcomes, setSelectedOutcomes] = useState<string[]>([]);
  const [duration, setDuration] = useState<number | null>(null);
  const [privateNotes, setPrivateNotes] = useState("");
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "draft"
  >("idle");
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("log");

  // Track whether the form has any content for auto-save
  const hasFormContent =
    selectedTopics.length > 0 ||
    selectedOutcomes.length > 0 ||
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
  }, [selectedTopics, selectedOutcomes, duration, privateNotes, hasFormContent, triggerAutoSave]);

  // Toggle topic
  const toggleTopic = (topic: string) => {
    setSelectedTopics((prev) =>
      prev.includes(topic) ? prev.filter((t) => t !== topic) : [...prev, topic]
    );
  };

  // Toggle outcome
  const toggleOutcome = (outcome: string) => {
    setSelectedOutcomes((prev) =>
      prev.includes(outcome)
        ? prev.filter((o) => o !== outcome)
        : [...prev, outcome]
    );
  };

  // Handle submit
  const handleSubmit = () => {
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
      portalName="Coach Portal"
      portalIcon={<CoachPortalIcon />}
      userName="Dr. Sarah Chen"
      userRole="Executive Coach"
      navItems={navItems}
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
              <Badge
                variant="default"
                className="text-xs"
              >
                {getStatusLabel(participant.programTrack)}
              </Badge>
              <Badge
                className={cn("text-xs", getStatusColor(participant.engagementStatus))}
              >
                {getStatusLabel(participant.engagementStatus)}
              </Badge>
              <Separator
                orientation="vertical"
                className="h-5 hidden lg:block"
              />
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
                Session {participant.currentSession} of{" "}
                {participant.totalSessions}
              </span>
            </div>
            <div className="relative">
              <Progress value={progressPercent} className="h-2" />
              {/* Session dots */}
              <div className="absolute inset-0 flex items-center justify-between px-0">
                {Array.from({ length: participant.totalSessions }).map(
                  (_, i) => {
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
                  }
                )}
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
                  Session {participant.currentSession} for {participant.name}{" "}
                  has been recorded. The participant can view the shared notes.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <Button variant="outline" size="sm" asChild>
                    <a href="/coach/dashboard">Return to Dashboard</a>
                  </Button>
                  <Button size="sm">
                    Schedule Next Session
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            /* Session logging form */
            <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
              {/* Main form */}
              <div className="space-y-6 order-2 lg:order-1">
                {/* Topics */}
                <Card
                  className="opacity-0 animate-fade-in"
                  style={{ animationDelay: "250ms" }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          Topics Discussed
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          Select all topics covered in this session
                        </CardDescription>
                      </div>
                      {selectedTopics.length > 0 && (
                        <Badge variant="outline" className="text-[10px]">
                          {selectedTopics.length} selected
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {topicOptions.map((topic) => (
                        <StylishCheckbox
                          key={topic}
                          label={topic}
                          checked={selectedTopics.includes(topic)}
                          onChange={() => toggleTopic(topic)}
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Outcomes */}
                <Card
                  className="opacity-0 animate-fade-in"
                  style={{ animationDelay: "300ms" }}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-base">
                          Session Outcomes
                        </CardTitle>
                        <CardDescription className="text-xs mt-1">
                          What was accomplished in this session?
                        </CardDescription>
                      </div>
                      {selectedOutcomes.length > 0 && (
                        <Badge variant="info" className="text-[10px]">
                          {selectedOutcomes.length} selected
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {outcomeOptions.map((outcome) => (
                        <StylishCheckbox
                          key={outcome}
                          label={outcome}
                          checked={selectedOutcomes.includes(outcome)}
                          onChange={() => toggleOutcome(outcome)}
                          variant="outcome"
                        />
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Duration */}
                <Card
                  className="opacity-0 animate-fade-in"
                  style={{ animationDelay: "350ms" }}
                >
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base">
                      Session Duration
                    </CardTitle>
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
                          <CardTitle className="text-base">
                            Private Notes
                          </CardTitle>
                          <CardDescription className="text-[11px] mt-0.5">
                            Only visible to you &mdash; never shared with the
                            participant
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
                          Once submitted, session notes will be visible to the
                          program administrator.
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <AutoSaveIndicator status={saveStatus} />
                        <Button
                          onClick={handleSubmit}
                          disabled={
                            selectedTopics.length === 0 ||
                            selectedOutcomes.length === 0 ||
                            duration === null
                          }
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
                    {(selectedTopics.length === 0 ||
                      selectedOutcomes.length === 0 ||
                      duration === null) && (
                      <div className="mt-4 rounded-lg bg-fc-50/50 px-4 py-2.5 text-xs text-muted-foreground">
                        <span className="font-medium">To submit:</span>{" "}
                        {selectedTopics.length === 0 && "Select at least one topic. "}
                        {selectedOutcomes.length === 0 && "Select at least one outcome. "}
                        {duration === null && "Choose a session duration."}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Previous session context (sidebar on desktop, above on mobile) */}
              <div className="order-1 lg:order-2 lg:sticky lg:top-6 lg:self-start">
                <PreviousSessionPanel delay={220} />
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── SESSION HISTORY TAB ─────────────────────────────────── */}
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Session History</CardTitle>
              <CardDescription className="text-xs">
                {sessionHistory.length} of {participant.totalSessions} sessions
                completed
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
