"use client";

import React, { useState } from "react";
import { PortalShell } from "@/components/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn, getInitials, getStatusColor, getStatusLabel } from "@/lib/utils";
import { COACH_NAV_ITEMS, COACH_PORTAL, CoachPortalIcon } from "@/lib/nav-config";

// ─── Icons (inline SVGs) ──────────────────────────────────────────────────────

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

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ArrowRightIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="m12 5 7 7-7 7" />
    </svg>
  );
}

function TrendUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function CheckCircleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
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

const upcomingSessions = [
  {
    id: "s1",
    participantName: "James Rodriguez",
    participantOrg: "Dept. of Commerce",
    date: "Feb 12, 2026",
    time: "10:00 AM EST",
    sessionNumber: 3,
    totalSessions: 5,
    engagementStatus: "IN_PROGRESS",
    engagementId: "eng-1",
  },
  {
    id: "s2",
    participantName: "Aisha Patel",
    participantOrg: "Treasury Dept.",
    date: "Feb 13, 2026",
    time: "2:30 PM EST",
    sessionNumber: 1,
    totalSessions: 5,
    engagementStatus: "IN_PROGRESS",
    engagementId: "eng-2",
  },
  {
    id: "s3",
    participantName: "Michael Chen",
    participantOrg: "State Dept.",
    date: "Feb 14, 2026",
    time: "9:00 AM EST",
    sessionNumber: 4,
    totalSessions: 5,
    engagementStatus: "IN_PROGRESS",
    engagementId: "eng-3",
  },
  {
    id: "s4",
    participantName: "Laura Mitchell",
    participantOrg: "Dept. of Energy",
    date: "Feb 17, 2026",
    time: "11:00 AM EST",
    sessionNumber: 2,
    totalSessions: 2,
    engagementStatus: "IN_PROGRESS",
    engagementId: "eng-4",
  },
];

const needsAttention = [
  {
    id: "na1",
    participantName: "David Kim",
    participantOrg: "Dept. of Defense",
    issue: "Session not logged for 5 days",
    lastActivity: "Feb 5, 2026",
    engagementId: "eng-5",
    severity: "high" as const,
  },
  {
    id: "na2",
    participantName: "Rebecca Torres",
    participantOrg: "EPA",
    issue: "Engagement stalled - no session scheduled",
    lastActivity: "Jan 28, 2026",
    engagementId: "eng-6",
    severity: "medium" as const,
  },
];

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

// ─── Nav Items (centralized in src/lib/nav-config.tsx) ────────────────────────

// ─── Summary Stat Card ────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  icon,
  trend,
  className,
  delay,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  trend?: string;
  className?: string;
  delay: number;
}) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden opacity-0 animate-fade-in",
        className
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{label}</p>
            <p className="font-display text-3xl font-semibold tracking-tight text-fc-900">
              {value}
            </p>
            {trend && (
              <p className="flex items-center gap-1 text-xs font-medium text-emerald-600">
                <TrendUpIcon />
                {trend}
              </p>
            )}
          </div>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-fc-50 text-fc-600">
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Upcoming Session Row ─────────────────────────────────────────────────────

function SessionRow({
  session,
  delay,
}: {
  session: (typeof upcomingSessions)[0];
  delay: number;
}) {
  const isToday = session.date === "Feb 10, 2026";
  const isTomorrow = session.date === "Feb 11, 2026";

  return (
    <a
      href={`/coach/engagements/${session.engagementId}`}
      className={cn(
        "group flex items-center gap-4 rounded-xl px-4 py-3.5 transition-all duration-200 hover:bg-fc-50/60 opacity-0 animate-fade-in",
        isToday && "bg-amber-50/50 hover:bg-amber-50"
      )}
      style={{ animationDelay: `${delay}ms` }}
    >
      <Avatar className="h-10 w-10">
        <AvatarFallback className="bg-fc-100 text-fc-700 text-xs font-display font-semibold">
          {getInitials(session.participantName)}
        </AvatarFallback>
      </Avatar>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-fc-900 truncate">
            {session.participantName}
          </p>
          {isToday && (
            <Badge variant="default" className="text-[10px] px-1.5 py-0">
              Today
            </Badge>
          )}
          {isTomorrow && (
            <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-fc-200">
              Tomorrow
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {session.participantOrg}
        </p>
      </div>

      <div className="hidden sm:flex flex-col items-end gap-0.5">
        <div className="flex items-center gap-1.5 text-xs text-fc-700">
          <CalendarIcon />
          <span>{session.date}</span>
        </div>
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <ClockIcon />
          <span>{session.time}</span>
        </div>
      </div>

      <div className="hidden md:block">
        <Badge variant="outline" className="text-[10px] font-medium">
          Session {session.sessionNumber} of {session.totalSessions}
        </Badge>
      </div>

      <div className="text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <ArrowRightIcon />
      </div>
    </a>
  );
}

// ─── Needs Attention Item ─────────────────────────────────────────────────────

function AttentionItem({
  item,
  delay,
}: {
  item: (typeof needsAttention)[0];
  delay: number;
}) {
  return (
    <a
      href={`/coach/engagements/${item.engagementId}`}
      className="group flex items-center gap-4 rounded-xl border border-amber-200/60 bg-amber-50/30 px-4 py-3.5 transition-all duration-200 hover:border-amber-300/80 hover:bg-amber-50/60 hover:shadow-sm opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div
        className={cn(
          "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
          item.severity === "high"
            ? "bg-amber-100 text-amber-700"
            : "bg-amber-100 text-amber-700"
        )}
      >
        <AlertIcon />
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-fc-900">
          {item.participantName}
        </p>
        <p className="text-xs text-amber-800 mt-0.5">{item.issue}</p>
      </div>

      <div className="hidden sm:block text-right">
        <p className="text-xs text-muted-foreground">Last activity</p>
        <p className="text-xs font-medium text-fc-700">{item.lastActivity}</p>
      </div>

      <Button
        variant="outline"
        size="sm"
        className="hidden md:inline-flex text-xs h-7"
      >
        Review
      </Button>

      <div className="md:hidden text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <ArrowRightIcon />
      </div>
    </a>
  );
}

// ─── Engagement Card ──────────────────────────────────────────────────────────

function EngagementCard({
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
      className="group block opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <Card className="h-full transition-all duration-300 hover:shadow-md hover:border-fc-200/80 hover:-translate-y-0.5">
        <CardContent className="p-5">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 mb-4">
            <div className="flex items-center gap-3 min-w-0">
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
              <div className="min-w-0">
                <p className="text-sm font-medium text-fc-900 truncate group-hover:text-fc-700 transition-colors">
                  {engagement.participantName}
                </p>
                <p className="text-xs text-muted-foreground truncate mt-0.5">
                  {engagement.participantOrg}
                </p>
              </div>
            </div>
          </div>

          {/* Badges */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <Badge
              variant={engagement.programTrack === "TWO_SESSION" ? "outline" : "default"}
              className="text-[10px]"
            >
              {getStatusLabel(engagement.programTrack)}
            </Badge>
            <Badge
              className={cn("text-[10px]", getStatusColor(engagement.status))}
            >
              {getStatusLabel(engagement.status)}
            </Badge>
          </div>

          {/* Progress */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium text-fc-700">
                {engagement.sessionsCompleted} of {engagement.totalSessions} sessions
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

          {/* Footer */}
          <Separator className="mb-3 opacity-40" />
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">
              Last: {engagement.lastActivity}
            </span>
            {engagement.nextSession ? (
              <span className="text-fc-700 font-medium">
                Next: {engagement.nextSession}
              </span>
            ) : isCompleted ? (
              <span className="flex items-center gap-1 text-emerald-600 font-medium">
                <CheckCircleIcon />
                Complete
              </span>
            ) : (
              <span className="text-amber-600 font-medium">
                No session scheduled
              </span>
            )}
          </div>
        </CardContent>
      </Card>
    </a>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <EmptyStateIcon />
      <p className="mt-3 text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

// ─── Section Header ───────────────────────────────────────────────────────────

function SectionHeader({
  title,
  count,
  countVariant = "default",
  action,
  delay,
}: {
  title: string;
  count?: number;
  countVariant?: "default" | "attention";
  action?: { label: string; href: string; disabled?: boolean };
  delay: number;
}) {
  return (
    <div
      className="flex items-center justify-between mb-4 opacity-0 animate-fade-in"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center gap-2.5">
        <h2 className="font-display text-lg font-semibold text-fc-900">
          {title}
        </h2>
        {count !== undefined && (
          <span
            className={cn(
              "flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
              countVariant === "attention"
                ? "bg-amber-100 text-amber-800"
                : "bg-fc-100 text-fc-700"
            )}
          >
            {count}
          </span>
        )}
      </div>
      {action && !action.disabled && (
        <a
          href={action.href}
          className="group flex items-center gap-1 text-xs font-medium text-fc-600 hover:text-fc-800 transition-colors"
        >
          {action.label}
          <span className="transition-transform duration-200 group-hover:translate-x-0.5">
            <ArrowRightIcon />
          </span>
        </a>
      )}
    </div>
  );
}

// ─── Main Dashboard ───────────────────────────────────────────────────────────

export default function CoachDashboard() {
  const [engagementFilter, setEngagementFilter] = useState<"active" | "completed">("active");

  const activeEngagements = engagements.filter(
    (e) => e.status !== "COMPLETED" && e.status !== "CANCELED"
  );
  const completedEngagements = engagements.filter(
    (e) => e.status === "COMPLETED"
  );
  const filteredEngagements =
    engagementFilter === "active" ? activeEngagements : completedEngagements;

  const sessionsThisWeek = 4;
  const completionRate = 92;

  return (
    <PortalShell
      portalName={COACH_PORTAL.portalName}
      portalIcon={<CoachPortalIcon />}
      userName={COACH_PORTAL.userName}
      userRole={COACH_PORTAL.userRole}
      navItems={COACH_NAV_ITEMS}
      activeItem="/coach/dashboard"
    >
      {/* Welcome Header */}
      <div className="mb-8 opacity-0 animate-fade-in" style={{ animationDelay: "50ms" }}>
        <p className="text-sm text-muted-foreground mb-1">
          {new Date().toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </p>
        <h1 className="font-display text-2xl sm:text-3xl font-semibold text-fc-900 tracking-tight">
          Welcome back,{" "}
          <span className="text-fc-700">Dr. Sarah Chen</span>
        </h1>
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 sm:grid-cols-3 mb-10">
        <StatCard
          label="Active Engagements"
          value={activeEngagements.length}
          icon={<EngagementIcon />}
          trend="+2 this month"
          delay={100}
        />
        <StatCard
          label="Sessions This Week"
          value={sessionsThisWeek}
          icon={<ActivityIcon />}
          delay={150}
        />
        <StatCard
          label="Completion Rate"
          value={`${completionRate}%`}
          icon={<CheckCircleIcon />}
          trend="Above average"
          delay={200}
        />
      </div>

      {/* Needs Attention */}
      {needsAttention.length > 0 && (
        <section className="mb-10">
          <SectionHeader
            title="Needs Attention"
            count={needsAttention.length}
            countVariant="attention"
            delay={250}
          />
          <div className="space-y-2">
            {needsAttention.map((item, i) => (
              <AttentionItem
                key={item.id}
                item={item}
                delay={280 + i * 60}
              />
            ))}
          </div>
        </section>
      )}

      {/* Upcoming Sessions */}
      <section className="mb-10">
        <SectionHeader
          title="Upcoming Sessions"
          count={upcomingSessions.length}
          action={{ label: "View All", href: "/coach/calendar", disabled: true }}
          delay={400}
        />
        <Card className="opacity-0 animate-fade-in" style={{ animationDelay: "420ms" }}>
          <CardContent className="p-2">
            {upcomingSessions.length > 0 ? (
              <div className="divide-y divide-border/40">
                {upcomingSessions.map((session, i) => (
                  <SessionRow
                    key={session.id}
                    session={session}
                    delay={450 + i * 60}
                  />
                ))}
              </div>
            ) : (
              <EmptyState message="No upcoming sessions scheduled." />
            )}
          </CardContent>
        </Card>
      </section>

      {/* My Engagements */}
      <section>
        <SectionHeader
          title="My Engagements"
          count={engagements.length}
          action={{ label: "See All", href: "/coach/engagements" }}
          delay={650}
        />

        {/* Filter tabs */}
        <div
          className="mb-5 opacity-0 animate-fade-in"
          style={{ animationDelay: "670ms" }}
        >
          <Tabs
            value={engagementFilter}
            onValueChange={(v) => setEngagementFilter(v as "active" | "completed")}
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

        {/* Engagement grid */}
        {filteredEngagements.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredEngagements.map((eng, i) => (
              <EngagementCard
                key={eng.id}
                engagement={eng}
                delay={700 + i * 70}
              />
            ))}
          </div>
        ) : (
          <Card>
            <EmptyState
              message={
                engagementFilter === "active"
                  ? "No active engagements at this time."
                  : "No completed engagements yet."
              }
            />
          </Card>
        )}
      </section>
    </PortalShell>
  );
}
