"use client";

import { useEffect, useState } from "react";
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
  fetchCoachEngagements,
  type CoachEngagementsResponse,
} from "@/lib/coach-api-client";

type CoachTab = "active" | "completed";

interface TabState {
  page: number;
  data: CoachEngagementsResponse | null;
  loading: boolean;
  error: string | null;
}

function makeInitialTabState(activeLoading: boolean): Record<CoachTab, TabState> {
  return {
    active: { page: 1, data: null, loading: activeLoading, error: null },
    completed: { page: 1, data: null, loading: false, error: null },
  };
}

export default function CoachEngagementsPage() {
  const portalUser = usePortalUser({
    name: COACH_PORTAL.userName,
    roleLabel: COACH_PORTAL.userRole,
  });

  const [tab, setTab] = useState<CoachTab>("active");
  const [tabs, setTabs] = useState<Record<CoachTab, TabState>>(makeInitialTabState(true));

  useEffect(() => {
    const controller = new AbortController();
    const current = tabs[tab];

    async function loadPage() {
      setTabs((previous) => ({
        ...previous,
        [tab]: { ...previous[tab], loading: true, error: null },
      }));

      try {
        const data = await fetchCoachEngagements(tab, current.page, controller.signal);
        setTabs((previous) => ({
          ...previous,
          [tab]: {
            ...previous[tab],
            data,
            loading: false,
            error: null,
          },
        }));
      } catch (error) {
        if (controller.signal.aborted) return;
        const message = error instanceof CoachApiError ? error.message : "Failed to load engagements";
        setTabs((previous) => ({
          ...previous,
          [tab]: {
            ...previous[tab],
            loading: false,
            error: message,
          },
        }));
      }
    }

    void loadPage();
    return () => controller.abort();
  }, [tab, tabs[tab].page]);

  const activeCount = tabs.active.data?.totalItems || 0;
  const completedCount = tabs.completed.data?.totalItems || 0;
  const current = tabs[tab];

  function changePage(nextPage: number) {
    setTabs((previous) => ({
      ...previous,
      [tab]: {
        ...previous[tab],
        page: Math.max(1, nextPage),
      },
    }));
  }

  return (
    <PortalShell
      portalName={COACH_PORTAL.portalName}
      portalIcon={<CoachPortalIcon />}
      userName={portalUser.name}
      userRole={portalUser.roleLabel}
      navItems={COACH_NAV_ITEMS}
      activeItem="/coach/engagements"
    >
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold text-fc-900">My Engagements</h1>
        <p className="mt-1 text-sm text-muted-foreground">All engagements assigned to you.</p>
      </div>

      <Tabs value={tab} onValueChange={(value) => setTab(value as CoachTab)} className="mb-4">
        <TabsList>
          <TabsTrigger value="active">
            Active
            <span className="ml-1.5 text-[10px] font-semibold">{activeCount}</span>
          </TabsTrigger>
          <TabsTrigger value="completed">
            Completed
            <span className="ml-1.5 text-[10px] font-semibold">{completedCount}</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{tab === "active" ? "Active" : "Completed"} Engagements</CardTitle>
        </CardHeader>
        <CardContent>
          {current.error ? <p className="mb-4 text-sm font-medium text-red-700">{current.error}</p> : null}

          {current.loading ? (
            <p className="py-10 text-center text-sm text-muted-foreground">Loading engagements...</p>
          ) : current.data && current.data.items.length > 0 ? (
            <div className="space-y-2">
              {current.data.items.map((item) => (
                <a
                  key={item.engagementId}
                  href={`/coach/engagements/${item.engagementId}`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-4 py-3 transition-colors hover:bg-fc-50"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-fc-900">{item.participantEmail}</p>
                    <p className="text-xs text-muted-foreground">
                      {item.cohortCode} · {getStatusLabel(item.programCode)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-fc-700">
                      {item.sessionsCompleted}/{item.totalSessions}
                    </span>
                    <Badge className={cn("text-[10px]", getStatusColor(item.status))}>
                      {getStatusLabel(item.status)}
                    </Badge>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <p className="py-10 text-center text-sm text-muted-foreground">No engagements found.</p>
          )}

          {current.data && current.data.totalPages > 1 ? (
            <div className="mt-6 flex items-center justify-between">
              <Button
                variant="outline"
                size="sm"
                disabled={current.data.page <= 1 || current.loading}
                onClick={() => changePage(current.data ? current.data.page - 1 : 1)}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {current.data.page} of {current.data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={current.data.page >= current.data.totalPages || current.loading}
                onClick={() => changePage(current.data ? current.data.page + 1 : 1)}
              >
                Next
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PortalShell>
  );
}
