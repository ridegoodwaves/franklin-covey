"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn, getStatusColor, getStatusLabel } from "@/lib/utils";
import { PortalShell } from "@/components/navigation";
import { ADMIN_NAV_ITEMS, ADMIN_PORTAL, AdminPortalIcon } from "@/lib/nav-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type {
  AdminEngagementRow,
  AdminEngagementsResponse,
  CoachUtilizationItem,
  DashboardKpiResponse,
  EngagementSortOption,
  EngagementTab,
} from "@/lib/types/dashboard";
import { resolveDashboardProgramOptions } from "@/lib/dashboard-program-options";
import { usePortalUser } from "@/lib/use-portal-user";

interface AdminEngagementRowApi
  extends Omit<AdminEngagementRow, "coachSelectedAt" | "lastActivityAt"> {
  coachSelectedAt: string | null;
  lastActivityAt: string | null;
}

interface AdminEngagementsResponseApi extends Omit<AdminEngagementsResponse, "items"> {
  items: AdminEngagementRowApi[];
}

interface CoachesResponseApi {
  items: Array<Omit<CoachUtilizationItem, "updatedAt"> & { updatedAt: string }>;
}

type CountKpiKey =
  | "total"
  | "invited"
  | "coachSelected"
  | "inProgress"
  | "onHold"
  | "completed"
  | "canceled"
  | "needsAttention";

const KPI_CARDS: Array<{ key: CountKpiKey; label: string }> = [
  { key: "total", label: "Total Engagements" },
  { key: "invited", label: "Invited" },
  { key: "coachSelected", label: "Coach Selected" },
  { key: "inProgress", label: "In Progress" },
  { key: "onHold", label: "On Hold" },
  { key: "completed", label: "Completed" },
  { key: "canceled", label: "Canceled" },
  { key: "needsAttention", label: "Needs Attention" },
];

const STATUS_OPTIONS = [
  "INVITED",
  "COACH_SELECTED",
  "IN_PROGRESS",
  "ON_HOLD",
  "COMPLETED",
  "CANCELED",
] as const;

const SORT_OPTIONS: Array<{ value: EngagementSortOption; label: string }> = [
  { value: "days_desc", label: "Days Since Activity (Desc)" },
  { value: "status", label: "Status" },
  { value: "coach", label: "Coach" },
];

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function PrinterIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function extractFilename(contentDisposition: string | null): string | null {
  if (!contentDisposition) return null;

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(contentDisposition);
  if (encoded?.[1]) {
    return decodeURIComponent(encoded[1]);
  }

  const plain = /filename=\"?([^\";]+)\"?/i.exec(contentDisposition);
  return plain?.[1] || null;
}

export default function AdminDashboardPage() {
  const portalUser = usePortalUser({
    name: "Admin User",
    roleLabel: "Program Administrator",
  });

  const [kpis, setKpis] = useState<DashboardKpiResponse | null>(null);
  const [rows, setRows] = useState<AdminEngagementRowApi[]>([]);
  const [coaches, setCoaches] = useState<CoachesResponseApi["items"]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exportError, setExportError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);

  const [tab, setTab] = useState<EngagementTab>("all");
  const [sort, setSort] = useState<EngagementSortOption>("days_desc");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [coachFilter, setCoachFilter] = useState<string>("");
  const [programFilter, setProgramFilter] = useState<string>("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalItems, setTotalItems] = useState(0);
  const [totalPages, setTotalPages] = useState(1);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    let active = true;

    async function loadCoaches() {
      try {
        const response = await fetch("/api/admin/coaches", { cache: "no-store" });
        if (!response.ok) {
          throw new Error(`Failed to load coaches (${response.status})`);
        }
        const data = (await response.json()) as CoachesResponseApi;
        if (active) {
          setCoaches(data.items);
        }
      } catch {
        if (active) {
          setCoaches([]);
        }
      }
    }

    loadCoaches();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError(null);

    async function loadDashboardData() {
      try {
        const kpiParams = new URLSearchParams();
        if (programFilter) {
          kpiParams.set("programId", programFilter);
        }

        const engagementsParams = new URLSearchParams({
          page: String(page),
          sort,
          tab,
        });

        if (statusFilter) engagementsParams.set("status", statusFilter);
        if (coachFilter) engagementsParams.set("coachId", coachFilter);
        if (programFilter) engagementsParams.set("programId", programFilter);
        if (search) engagementsParams.set("search", search);

        const [kpiResponse, engagementsResponse] = await Promise.all([
          fetch(`/api/admin/dashboard/kpis?${kpiParams.toString()}`, {
            cache: "no-store",
            signal: controller.signal,
          }),
          fetch(`/api/admin/engagements?${engagementsParams.toString()}`, {
            cache: "no-store",
            signal: controller.signal,
          }),
        ]);

        if (!kpiResponse.ok) {
          throw new Error(`Failed to load KPIs (${kpiResponse.status})`);
        }

        if (!engagementsResponse.ok) {
          throw new Error(`Failed to load engagements (${engagementsResponse.status})`);
        }

        const kpiData = (await kpiResponse.json()) as DashboardKpiResponse;
        const engagementData = (await engagementsResponse.json()) as AdminEngagementsResponseApi;

        setKpis(kpiData);
        setRows(engagementData.items);
        setPage(engagementData.page);
        setPageSize(engagementData.pageSize);
        setTotalItems(engagementData.totalItems);
        setTotalPages(engagementData.totalPages);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Failed to load dashboard";
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadDashboardData();
    return () => controller.abort();
  }, [coachFilter, page, programFilter, search, sort, statusFilter, tab]);

  const programOptions = useMemo(() => resolveDashboardProgramOptions(kpis), [kpis]);

  const reportDate = useMemo(
    () =>
      new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    []
  );

  const needsAttentionCount = kpis?.needsAttention ?? 0;
  const allCount = kpis?.total ?? 0;
  const startRow = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const endRow = Math.min(page * pageSize, totalItems);

  async function handleExport() {
    setIsExporting(true);
    setExportError(null);

    try {
      const params = new URLSearchParams({
        format: "csv",
        tab,
      });

      if (statusFilter) params.set("status", statusFilter);
      if (coachFilter) params.set("coachId", coachFilter);
      if (programFilter) params.set("programId", programFilter);
      if (search) params.set("search", search);

      const response = await fetch(`/api/export?${params.toString()}`, {
        method: "GET",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Export failed (${response.status})`);
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const fileName =
        extractFilename(response.headers.get("content-disposition")) ||
        `fc-export-${new Date().toISOString().slice(0, 10)}.csv`;

      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 100);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to export CSV";
      setExportError(message);
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <PortalShell
      portalName={ADMIN_PORTAL.portalName}
      portalIcon={<AdminPortalIcon />}
      userName={portalUser.name}
      userRole={portalUser.roleLabel}
      navItems={ADMIN_NAV_ITEMS}
      activeItem="/admin/dashboard"
    >
      <div className="print-only print-report-header hidden items-center justify-between border-b border-border/70 pb-3">
        <img src="/fc-logo.svg" alt="FranklinCovey" className="h-6 w-auto" />
        <div className="text-xs text-fc-cool-black">Report Date: {reportDate}</div>
      </div>

      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-fc-cool-black">
          Coaching Program Overview
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          USPS engagement visibility and operational reporting
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((card) => (
          <Card key={card.key}>
            <CardContent className="p-5">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {card.label}
              </p>
              <p className="mt-2 font-display text-3xl font-semibold text-fc-cool-black">
                {kpis ? kpis[card.key] : "—"}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-xl">Engagements</CardTitle>
            <div className="print-hide flex items-center gap-2 self-start">
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={handleExport}
                disabled={isExporting}
              >
                <DownloadIcon />
                {isExporting ? "Exporting..." : "Generate Report"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.print()}
              >
                <PrinterIcon />
                Save as PDF
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs
            value={tab}
            onValueChange={(value) => {
              setTab(value as EngagementTab);
              setPage(1);
            }}
          >
            <div className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <TabsList>
                <TabsTrigger value="all">All Engagements ({allCount})</TabsTrigger>
                <TabsTrigger value="needs_attention" className="gap-1.5">
                  Needs Attention
                  {needsAttentionCount > 0 ? (
                    <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-fc-golden px-1.5 text-[10px] font-semibold text-fc-cool-black">
                      {needsAttentionCount}
                    </span>
                  ) : null}
                </TabsTrigger>
              </TabsList>

              <div className="print-hide flex flex-wrap items-center gap-2">
                <select
                  value={statusFilter}
                  onChange={(event) => {
                    setStatusFilter(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-lg border border-input bg-white px-3 text-xs font-medium text-foreground"
                >
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>
                      {getStatusLabel(status)}
                    </option>
                  ))}
                </select>

                <select
                  value={coachFilter}
                  onChange={(event) => {
                    setCoachFilter(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-lg border border-input bg-white px-3 text-xs font-medium text-foreground"
                >
                  <option value="">All Coaches</option>
                  {coaches.map((coach) => (
                    <option key={coach.organizationCoachId} value={coach.organizationCoachId}>
                      {coach.name}
                    </option>
                  ))}
                </select>

                <select
                  value={programFilter}
                  onChange={(event) => {
                    setProgramFilter(event.target.value);
                    setPage(1);
                  }}
                  className="h-9 rounded-lg border border-input bg-white px-3 text-xs font-medium text-foreground"
                >
                  <option value="">All Programs</option>
                  {programOptions.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>

                <select
                  value={sort}
                  onChange={(event) => {
                    setSort(event.target.value as EngagementSortOption);
                    setPage(1);
                  }}
                  className="h-9 rounded-lg border border-input bg-white px-3 text-xs font-medium text-foreground"
                >
                  {SORT_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      Sort: {option.label}
                    </option>
                  ))}
                </select>

                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search by email..."
                    value={searchInput}
                    onChange={(event) => setSearchInput(event.target.value)}
                    className="h-9 w-52 pl-8 text-xs"
                  />
                </div>
              </div>
            </div>

            <TabsContent value="all" className="mt-0">
              <EngagementTable rows={rows} loading={loading} />
            </TabsContent>
            <TabsContent value="needs_attention" className="mt-0">
              <EngagementTable rows={rows} loading={loading} />
            </TabsContent>
          </Tabs>

          {error ? (
            <p className="mt-4 text-sm font-medium text-red-600">{error}</p>
          ) : null}
          {exportError ? (
            <p className="mt-2 text-sm font-medium text-red-600">{exportError}</p>
          ) : null}

          <Separator className="my-4 opacity-50" />
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-fc-cool-black">{startRow}</span> to{" "}
              <span className="font-medium text-fc-cool-black">{endRow}</span> of{" "}
              <span className="font-medium text-fc-cool-black">{totalItems}</span> engagements
            </p>

            <div className="print-hide flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                disabled={page <= 1}
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              >
                Previous
              </Button>
              <span className="text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 px-2 text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </PortalShell>
  );
}

function EngagementTable({
  rows,
  loading,
}: {
  rows: AdminEngagementRowApi[];
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Loading engagements...</p>
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">No engagements found for the selected filters.</p>
      </div>
    );
  }

  return (
    <div className="print-table-wrap -mx-6 overflow-x-auto">
      <table className="w-full min-w-[780px]">
        <thead>
          <tr className="border-b border-border/60">
            <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Participant Email
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Coach
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Program
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Status
            </th>
            <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Sessions
            </th>
            <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Days Since Activity
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.engagementId}
              className={cn(
                "border-b border-border/30 transition-colors hover:bg-fc-deep-blue/5",
                row.needsAttention && "bg-fc-golden/5"
              )}
            >
              <td className="px-6 py-3.5 text-sm text-fc-cool-black">{row.participantEmail}</td>
              <td className="px-4 py-3.5 text-sm text-foreground">{row.coachName || "Unassigned"}</td>
              <td className="px-4 py-3.5 text-sm text-foreground">{row.programCode}</td>
              <td className="px-4 py-3.5">
                <Badge className={cn("text-[11px]", getStatusColor(row.status))}>
                  {getStatusLabel(row.status)}
                </Badge>
              </td>
              <td className="px-4 py-3.5 text-sm text-foreground">
                {row.sessionsCompleted}/{row.totalSessions}
              </td>
              <td
                className={cn(
                  "px-6 py-3.5 text-right text-sm",
                  row.daysSinceActivity !== null && row.daysSinceActivity > 14
                    ? "font-semibold text-red-600"
                    : "text-muted-foreground"
                )}
              >
                {row.daysSinceActivity === null ? "—" : row.daysSinceActivity}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
