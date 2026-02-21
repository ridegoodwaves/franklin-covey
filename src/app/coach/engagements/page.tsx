"use client";

import React, { useState } from "react";
import { PortalShell } from "@/components/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, getInitials, getStatusColor, getStatusLabel } from "@/lib/utils";
import { COACH_NAV_ITEMS, COACH_PORTAL, CoachPortalIcon } from "@/lib/nav-config";

// ─── Icons ────────────────────────────────────────────────────────────────────

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function EmptyStateIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-fc-200">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <line x1="3" y1="9" x2="21" y2="9" />
      <line x1="9" y1="21" x2="9" y2="9" />
    </svg>
  );
}

// ─── Demo Data ────────────────────────────────────────────────────────────────
// TODO: fetch from /api/coach/engagements

const engagements = [
  {
    id: "eng-1",
    participantName: "James Rodriguez",
    participantOrg: "Dept. of Commerce",
    programTrack: "FIVE_SESSION",
    status: "IN_PROGRESS",
    progress: 40,
    sessionsCompleted: 2,
    totalSessions: 5,
    lastActivity: "Feb 8, 2026",
    nextSession: "Feb 12, 2026",
  },
  {
    id: "eng-2",
    participantName: "Aisha Patel",
    participantOrg: "Treasury Dept.",
    programTrack: "FIVE_SESSION",
    status: "IN_PROGRESS",
    progress: 0,
    sessionsCompleted: 0,
    totalSessions: 5,
    lastActivity: "Feb 6, 2026",
    nextSession: "Feb 13, 2026",
  },
  {
    id: "eng-3",
    participantName: "Michael Chen",
    participantOrg: "State Dept.",
    programTrack: "FIVE_SESSION",
    status: "IN_PROGRESS",
    progress: 60,
    sessionsCompleted: 3,
    totalSessions: 5,
    lastActivity: "Feb 7, 2026",
    nextSession: "Feb 14, 2026",
  },
  {
    id: "eng-4",
    participantName: "Laura Mitchell",
    participantOrg: "Dept. of Energy",
    programTrack: "TWO_SESSION",
    status: "IN_PROGRESS",
    progress: 50,
    sessionsCompleted: 1,
    totalSessions: 2,
    lastActivity: "Feb 3, 2026",
    nextSession: "Feb 17, 2026",
  },
  {
    id: "eng-5",
    participantName: "David Kim",
    participantOrg: "Dept. of Defense",
    programTrack: "FIVE_SESSION",
    status: "IN_PROGRESS",
    progress: 20,
    sessionsCompleted: 1,
    totalSessions: 5,
    lastActivity: "Feb 5, 2026",
    nextSession: null,
  },
  {
    id: "eng-6",
    participantName: "Rebecca Torres",
    participantOrg: "EPA",
    programTrack: "FIVE_SESSION",
    status: "ON_HOLD",
    progress: 40,
    sessionsCompleted: 2,
    totalSessions: 5,
    lastActivity: "Jan 28, 2026",
    nextSession: null,
  },
  {
    id: "eng-7",
    participantName: "Thomas Wright",
    participantOrg: "USDA",
    programTrack: "FIVE_SESSION",
    status: "COMPLETED",
    progress: 100,
    sessionsCompleted: 5,
    totalSessions: 5,
    lastActivity: "Jan 20, 2026",
    nextSession: null,
  },
  {
    id: "eng-8",
    participantName: "Sarah Nakamura",
    participantOrg: "HHS",
    programTrack: "TWO_SESSION",
    status: "COMPLETED",
    progress: 100,
    sessionsCompleted: 2,
    totalSessions: 2,
    lastActivity: "Jan 15, 2026",
    nextSession: null,
  },
];

// ─── Engagement Row ───────────────────────────────────────────────────────────

function EngagementRow({
  engagement,
  delay,
}: {
  engagement: (typeof engagements)[0];
  delay: number;
}) {
  const isCompleted = engagement.status === "COMPLETED";

  return (
    <a
      href={`/coach/engagements/${engagement.id}`}
      className="group flex items-center gap-4 rounded-xl px-4 py-4 transition-all duration-200 hover:bg-fc-50/60 opacity-0 animate-fade-in border border-transparent hover:border-fc-100/60"
      style={{ animationDelay: `${delay}ms` }}
    >
      {/* Avatar */}
      <Avatar className="h-10 w-10 shrink-0">
        <AvatarFallback
          className={cn(
            "text-xs font-display font-semibold",
            isCompleted
              ? "bg-emerald-100 text-emerald-700"
              : "bg-fc-100 text-fc-700"
          )}
        >
          {getInitials(engagement.participantName)}
        </AvatarFallback>
      </Avatar>

      {/* Name + org */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fc-900 truncate group-hover:text-fc-700 transition-colors">
          {engagement.participantName}
        </p>
        <p className="text-xs text-muted-foreground truncate mt-0.5">
          {engagement.participantOrg}
        </p>
      </div>

      {/* Program + status badges */}
      <div className="hidden sm:flex items-center gap-2 flex-shrink-0">
        <Badge
          variant={engagement.programTrack === "TWO_SESSION" ? "outline" : "default"}
          className="text-[10px]"
        >
          {getStatusLabel(engagement.programTrack)}
        </Badge>
        <Badge className={cn("text-[10px]", getStatusColor(engagement.status))}>
          {getStatusLabel(engagement.status)}
        </Badge>
      </div>

      {/* Progress */}
      <div className="hidden md:flex flex-col gap-1 w-28 flex-shrink-0">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-muted-foreground">Progress</span>
          <span className="font-medium text-fc-700">
            {engagement.sessionsCompleted}/{engagement.totalSessions}
          </span>
        </div>
        <Progress
          value={engagement.progress}
          className={cn(
            "h-1.5",
            isCompleted && "[&>[data-state]]:bg-emerald-500 bg-emerald-100"
          )}
        />
      </div>

      {/* Last activity + next session */}
      <div className="hidden lg:block text-right flex-shrink-0 w-32">
        <p className="text-[10px] text-muted-foreground">
          Last: {engagement.lastActivity}
        </p>
        {engagement.nextSession ? (
          <p className="text-[10px] font-medium text-fc-700 mt-0.5">
            Next: {engagement.nextSession}
          </p>
        ) : isCompleted ? (
          <p className="text-[10px] font-medium text-emerald-600 mt-0.5 flex items-center justify-end gap-1">
            <CheckCircleIcon />
            Complete
          </p>
        ) : (
          <p className="text-[10px] font-medium text-amber-600 mt-0.5">
            No session scheduled
          </p>
        )}
      </div>

      {/* Arrow */}
      <div className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex-shrink-0">
        <ArrowRightIcon />
      </div>
    </a>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <EmptyStateIcon />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CoachEngagementsPage() {
  const [filter, setFilter] = useState<"active" | "completed">("active");

  const activeEngagements = engagements.filter(
    (e) => e.status !== "COMPLETED" && e.status !== "CANCELED"
  );
  const completedEngagements = engagements.filter(
    (e) => e.status === "COMPLETED"
  );
  const filteredEngagements =
    filter === "active" ? activeEngagements : completedEngagements;

  return (
    <PortalShell
      portalName={COACH_PORTAL.portalName}
      portalIcon={<CoachPortalIcon />}
      userName={COACH_PORTAL.userName}
      userRole={COACH_PORTAL.userRole}
      navItems={COACH_NAV_ITEMS}
      activeItem="/coach/engagements"
    >
      {/* Page header */}
      <div
        className="mb-8 opacity-0 animate-fade-in"
        style={{ animationDelay: "50ms" }}
      >
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl sm:text-3xl font-semibold text-fc-900 tracking-tight">
            My Engagements
          </h1>
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-fc-100 px-2 text-xs font-semibold text-fc-700">
            {engagements.length}
          </span>
        </div>
        <p className="mt-1.5 text-sm text-muted-foreground">
          All participants assigned to you across active and completed programs.
        </p>
      </div>

      {/* Filter tabs */}
      <div
        className="mb-5 opacity-0 animate-fade-in"
        style={{ animationDelay: "100ms" }}
      >
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as "active" | "completed")}
        >
          <TabsList>
            <TabsTrigger value="active">
              Active
              <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-fc-800 px-1 text-[9px] font-semibold text-white data-[state=active]:bg-fc-800">
                {activeEngagements.length}
              </span>
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed
              <span className="ml-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-200 px-1 text-[9px] font-semibold text-emerald-800">
                {completedEngagements.length}
              </span>
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {/* Engagements list */}
      <Card
        className="opacity-0 animate-fade-in"
        style={{ animationDelay: "150ms" }}
      >
        <CardContent className="p-2">
          {filteredEngagements.length > 0 ? (
            <div className="divide-y divide-border/40">
              {filteredEngagements.map((engagement, i) => (
                <EngagementRow
                  key={engagement.id}
                  engagement={engagement}
                  delay={180 + i * 50}
                />
              ))}
            </div>
          ) : (
            <EmptyState message="No engagements to show" />
          )}
        </CardContent>
      </Card>

      {/* Summary footer */}
      {filteredEngagements.length > 0 && (
        <div
          className="mt-4 opacity-0 animate-fade-in"
          style={{ animationDelay: "400ms" }}
        >
          <Separator className="mb-3 opacity-40" />
          <p className="text-xs text-muted-foreground text-center">
            Showing {filteredEngagements.length} of {engagements.length} engagements
          </p>
        </div>
      )}
    </PortalShell>
  );
}
