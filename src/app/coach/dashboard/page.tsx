"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { PortalShell } from "@/components/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { COACH_NAV_ITEMS, COACH_PORTAL, CoachPortalIcon } from "@/lib/nav-config";
import { cn, getStatusColor, getStatusLabel } from "@/lib/utils";
import { usePortalUser } from "@/lib/use-portal-user";
import {
  CoachApiError,
  fetchCoachDashboard,
  fetchCoachEngagements,
  type CoachEngagementsResponse,
} from "@/lib/coach-api-client";

type CoachTab = "active" | "completed";

function StatCard({
  title,
  value,
  subtitle,
}: {
  title: string;
  value: string;
  subtitle?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl font-semibold text-fc-900">{value}</p>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardContent>
    </Card>
  );
}

function LoadingRows({ label }: { label: string }) {
  return (
    <Card>
      <CardContent className="py-10 text-center text-sm text-muted-foreground">{label}</CardContent>
    </Card>
  );
}

export default function CoachDashboardPage() {
  const portalUser = usePortalUser({
    name: COACH_PORTAL.userName,
    roleLabel: COACH_PORTAL.userRole,
  });

  const todayLabel = useRef(
    new Date().toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    })
  ).current;

  const [dashboard, setDashboard] = useState<Awaited<ReturnType<typeof fetchCoachDashboard>> | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  const [tab, setTab] = useState<CoachTab>("active");
  const [engagementPages, setEngagementPages] = useState<Record<CoachTab, CoachEngagementsResponse | null>>({
    active: null,
    completed: null,
  });
  const [engagementLoading, setEngagementLoading] = useState<Record<CoachTab, boolean>>({
    active: true,
    completed: false,
  });
  const [engagementError, setEngagementError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function loadDashboard() {
      setDashboardLoading(true);
      setDashboardError(null);
      try {
        const data = await fetchCoachDashboard(controller.signal);
        setDashboard(data);
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof CoachApiError ? error.message : "Failed to load dashboard";
        setDashboardError(message);
      } finally {
        if (!controller.signal.aborted) {
          setDashboardLoading(false);
        }
      }
    }

    void loadDashboard();
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (engagementPages[tab]) return;

    const controller = new AbortController();

    async function loadEngagements() {
      setEngagementLoading((previous) => ({ ...previous, [tab]: true }));
      setEngagementError(null);
      try {
        const data = await fetchCoachEngagements(tab, 1, controller.signal);
        setEngagementPages((previous) => ({ ...previous, [tab]: data }));
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof CoachApiError ? error.message : "Failed to load engagements";
        setEngagementError(message);
      } finally {
        if (!controller.signal.aborted) {
          setEngagementLoading((previous) => ({ ...previous, [tab]: false }));
        }
      }
    }

    void loadEngagements();
    return () => controller.abort();
  }, [tab, engagementPages[tab]]);

  const activeRows = engagementPages.active?.items || [];
  const completedRows = engagementPages.completed?.items || [];
  const currentRows = tab === "active" ? activeRows : completedRows;
  const activeTabCount = engagementPages.active?.totalItems ?? dashboard?.activeCount ?? 0;
  const completedTabCount = engagementPages.completed?.totalItems ?? dashboard?.completedCount ?? 0;

  const coachName = useMemo(() => {
    if (dashboard?.coachName) return dashboard.coachName;
    return portalUser.name;
  }, [dashboard?.coachName, portalUser.name]);

  const coachRole = dashboard?.coachRole || portalUser.roleLabel;

  return (
    <PortalShell
      portalName={COACH_PORTAL.portalName}
      portalIcon={<CoachPortalIcon />}
      userName={coachName}
      userRole={coachRole}
      navItems={COACH_NAV_ITEMS}
      activeItem="/coach/dashboard"
    >
      <div className="mb-8">
        <p className="text-sm text-muted-foreground">{todayLabel}</p>
        <h1 className="mt-1 font-display text-3xl font-semibold text-fc-900">Welcome back, {coachName}</h1>
      </div>

      {dashboardError ? (
        <Card className="mb-8 border-red-200">
          <CardContent className="py-5 text-sm text-red-700">{dashboardError}</CardContent>
        </Card>
      ) : null}

      <div className="mb-8 grid gap-4 sm:grid-cols-3">
        {dashboardLoading || !dashboard ? (
          <LoadingRows label="Loading coach metrics..." />
        ) : (
          <>
            <StatCard title="Active Engagements" value={String(dashboard.activeCount)} />
            <StatCard title="Sessions This Week" value={String(dashboard.sessionsThisWeek)} />
            <StatCard
              title="Completion Rate"
              value={`${dashboard.completionRate}%`}
              subtitle={`${dashboard.completedCount} completed engagements`}
            />
          </>
        )}
      </div>

      <section className="mb-10">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-fc-900">Needs Attention</h2>
          <Badge variant="warning">{dashboard?.needsAttention.length || 0}</Badge>
        </div>

        {dashboardLoading || !dashboard ? (
          <LoadingRows label="Loading needs-attention items..." />
        ) : dashboard.needsAttention.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">No engagements need attention right now.</CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border/50 p-2">
              {dashboard.needsAttention.map((item) => (
                <a
                  key={item.engagementId}
                  href={`/coach/engagements/${item.engagementId}`}
                  className="flex items-center justify-between rounded-md px-3 py-3 transition-colors hover:bg-amber-50"
                >
                  <div>
                    <p className="text-sm font-medium text-fc-900">{item.participantEmail}</p>
                    <p className="text-xs text-muted-foreground">{item.cohortCode}</p>
                  </div>
                  <span className="text-xs font-semibold text-amber-700">{item.daysOverdue}d overdue</span>
                </a>
              ))}
            </CardContent>
          </Card>
        )}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-xl font-semibold text-fc-900">My Engagements</h2>
          <Button asChild variant="outline" size="sm">
            <a href="/coach/engagements">View All</a>
          </Button>
        </div>

        <Tabs
          value={tab}
          onValueChange={(value) => setTab(value as CoachTab)}
          className="mb-4"
        >
          <TabsList>
            <TabsTrigger value="active">
              Active
              <span className="ml-1.5 text-[10px] font-semibold">{activeTabCount}</span>
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed
              <span className="ml-1.5 text-[10px] font-semibold">{completedTabCount}</span>
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {engagementError ? (
          <Card className="border-red-200">
            <CardContent className="py-5 text-sm text-red-700">{engagementError}</CardContent>
          </Card>
        ) : null}

        {engagementLoading[tab] ? (
          <LoadingRows label={`Loading ${tab} engagements...`} />
        ) : currentRows.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-sm text-muted-foreground">
              No {tab} engagements to show.
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="divide-y divide-border/50 p-2">
              {currentRows.slice(0, 6).map((row) => (
                <a
                  key={row.engagementId}
                  href={`/coach/engagements/${row.engagementId}`}
                  className="flex items-center justify-between gap-4 rounded-md px-3 py-3 transition-colors hover:bg-fc-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fc-900">{row.participantEmail}</p>
                    <p className="text-xs text-muted-foreground">
                      {row.cohortCode} · {getStatusLabel(row.programCode)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-medium text-fc-700">
                      {row.sessionsCompleted}/{row.totalSessions}
                    </span>
                    <Badge className={cn("text-[10px]", getStatusColor(row.status))}>
                      {getStatusLabel(row.status)}
                    </Badge>
                  </div>
                </a>
              ))}
            </CardContent>
          </Card>
        )}
      </section>
    </PortalShell>
  );
}
