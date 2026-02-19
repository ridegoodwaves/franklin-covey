"use client";

import React, { useState } from "react";
import { cn, getStatusColor, getStatusLabel, formatRelativeTime, getInitials } from "@/lib/utils";
import { PortalShell } from "@/components/navigation";
import { ADMIN_NAV_ITEMS, ADMIN_PORTAL, AdminPortalIcon } from "@/lib/nav-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

// ---------------------------------------------------------------------------
// Icons (inline SVGs to avoid external deps)
// ---------------------------------------------------------------------------

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

function DownloadIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}

function ChevronUpDown({ className }: { className?: string }) {
  return (
    <svg className={className} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m7 15 5 5 5-5" />
      <path d="m7 9 5-5 5 5" />
    </svg>
  );
}

function MoreHorizontalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" />
      <circle cx="19" cy="12" r="1" />
      <circle cx="5" cy="12" r="1" />
    </svg>
  );
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Sparkline - Mini trend chart for KPI cards
// ---------------------------------------------------------------------------

function Sparkline({ data, color = "#FFB93C", className }: { data: number[]; color?: string; className?: string }) {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const w = 80;
  const h = 28;
  const padding = 2;

  const points = data
    .map((v, i) => {
      const x = padding + (i / (data.length - 1)) * (w - padding * 2);
      const y = h - padding - ((v - min) / range) * (h - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const areaPoints = `${padding},${h - padding} ${points} ${w - padding},${h - padding}`;

  return (
    <svg className={className} width={w} height={h} viewBox={`0 0 ${w} ${h}`}>
      <defs>
        <linearGradient id={`grad-${color.replace("#", "")}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.02" />
        </linearGradient>
      </defs>
      <polygon points={areaPoints} fill={`url(#grad-${color.replace("#", "")})`} />
      <polyline points={points} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

// Nav items centralized in src/lib/nav-config.tsx

// ---------------------------------------------------------------------------
// KPI data
// ---------------------------------------------------------------------------

const kpis = [
  {
    label: "Total Engagements",
    value: 400,
    change: "+24 this month",
    changeType: "positive" as const,
    sparkData: [320, 335, 350, 342, 358, 370, 380, 390, 395, 400],
    color: "#141928",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      </svg>
    ),
  },
  {
    label: "In Progress",
    value: 248,
    change: "62% of total",
    changeType: "neutral" as const,
    sparkData: [200, 210, 215, 225, 230, 235, 238, 242, 245, 248],
    color: "#3253FF",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    label: "Needs Attention",
    value: 37,
    change: "+5 since last week",
    changeType: "attention" as const,
    sparkData: [18, 20, 22, 28, 25, 30, 32, 29, 34, 37],
    color: "#FFB93C",
    icon: <AlertTriangleIcon />,
  },
  {
    label: "Completed",
    value: 98,
    change: "+12 this month",
    changeType: "positive" as const,
    sparkData: [50, 55, 60, 65, 70, 75, 80, 85, 92, 98],
    color: "#45D8B4",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
    ),
  },
  {
    label: "Canceled",
    value: 17,
    change: "4.3% rate",
    changeType: "neutral" as const,
    sparkData: [8, 9, 10, 10, 11, 12, 13, 14, 15, 17],
    color: "#FF585D",
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10" />
        <path d="m15 9-6 6" />
        <path d="m9 9 6 6" />
      </svg>
    ),
  },
];

// ---------------------------------------------------------------------------
// Demo engagement data
// ---------------------------------------------------------------------------

type EngagementStatus = "INVITED" | "COACH_SELECTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELED" | "ON_HOLD";
type ProgramTrack = "TWO_SESSION" | "FIVE_SESSION";

interface Engagement {
  id: string;
  participant: string;
  coach: string;
  status: EngagementStatus;
  programTrack: ProgramTrack;
  lastActivity: string;
  needsAttention: boolean;
}

const engagements: Engagement[] = [
  { id: "ENG-001", participant: "Sarah Mitchell", coach: "Dr. Angela Ford", status: "IN_PROGRESS", programTrack: "FIVE_SESSION", lastActivity: "2026-02-10", needsAttention: false },
  { id: "ENG-002", participant: "James Rodriguez", coach: "Michael Chen", status: "IN_PROGRESS", programTrack: "TWO_SESSION", lastActivity: "2026-02-09", needsAttention: false },
  { id: "ENG-003", participant: "Emily Watkins", coach: "Dr. Angela Ford", status: "INVITED", programTrack: "FIVE_SESSION", lastActivity: "2026-01-28", needsAttention: true },
  { id: "ENG-004", participant: "Robert Kim", coach: "Lisa Patel", status: "IN_PROGRESS", programTrack: "FIVE_SESSION", lastActivity: "2026-02-08", needsAttention: false },
  { id: "ENG-005", participant: "Diana Brooks", coach: "Michael Chen", status: "ON_HOLD", programTrack: "TWO_SESSION", lastActivity: "2026-01-15", needsAttention: true },
  { id: "ENG-006", participant: "Thomas Grant", coach: "Jennifer Williams", status: "COMPLETED", programTrack: "TWO_SESSION", lastActivity: "2026-02-05", needsAttention: false },
  { id: "ENG-007", participant: "Michelle Alvarez", coach: "Lisa Patel", status: "IN_PROGRESS", programTrack: "FIVE_SESSION", lastActivity: "2026-02-10", needsAttention: false },
  { id: "ENG-008", participant: "Kevin O'Brien", coach: "Dr. Angela Ford", status: "COACH_SELECTED", programTrack: "TWO_SESSION", lastActivity: "2026-02-03", needsAttention: true },
  { id: "ENG-009", participant: "Patricia Nguyen", coach: "Jennifer Williams", status: "IN_PROGRESS", programTrack: "FIVE_SESSION", lastActivity: "2026-02-07", needsAttention: false },
  { id: "ENG-010", participant: "Steven Clarke", coach: "Michael Chen", status: "CANCELED", programTrack: "TWO_SESSION", lastActivity: "2026-01-20", needsAttention: false },
  { id: "ENG-011", participant: "Amanda Foster", coach: "Lisa Patel", status: "IN_PROGRESS", programTrack: "FIVE_SESSION", lastActivity: "2026-02-09", needsAttention: false },
  { id: "ENG-012", participant: "Daniel Martinez", coach: "Dr. Angela Ford", status: "INVITED", programTrack: "TWO_SESSION", lastActivity: "2026-01-25", needsAttention: true },
  { id: "ENG-013", participant: "Rachel Thompson", coach: "Jennifer Williams", status: "IN_PROGRESS", programTrack: "FIVE_SESSION", lastActivity: "2026-02-10", needsAttention: false },
  { id: "ENG-014", participant: "Christopher Lee", coach: "Michael Chen", status: "COMPLETED", programTrack: "TWO_SESSION", lastActivity: "2026-02-01", needsAttention: false },
  { id: "ENG-015", participant: "Laura Henderson", coach: "Lisa Patel", status: "IN_PROGRESS", programTrack: "FIVE_SESSION", lastActivity: "2026-02-06", needsAttention: false },
  { id: "ENG-016", participant: "Mark Sullivan", coach: "Dr. Angela Ford", status: "ON_HOLD", programTrack: "TWO_SESSION", lastActivity: "2026-01-18", needsAttention: true },
  { id: "ENG-017", participant: "Jessica Ramirez", coach: "Jennifer Williams", status: "IN_PROGRESS", programTrack: "FIVE_SESSION", lastActivity: "2026-02-08", needsAttention: false },
  { id: "ENG-018", participant: "Andrew Walker", coach: "Michael Chen", status: "COACH_SELECTED", programTrack: "TWO_SESSION", lastActivity: "2026-02-04", needsAttention: false },
  { id: "ENG-019", participant: "Samantha Price", coach: "Lisa Patel", status: "COMPLETED", programTrack: "FIVE_SESSION", lastActivity: "2026-01-30", needsAttention: false },
  { id: "ENG-020", participant: "Brian Cooper", coach: "Dr. Angela Ford", status: "IN_PROGRESS", programTrack: "FIVE_SESSION", lastActivity: "2026-02-09", needsAttention: false },
];

const coaches = ["All Coaches", "Dr. Angela Ford", "Michael Chen", "Lisa Patel", "Jennifer Williams"];
const statuses = ["All Statuses", "INVITED", "COACH_SELECTED", "IN_PROGRESS", "COMPLETED", "CANCELED", "ON_HOLD"];
const tracks = ["All Tracks", "TWO_SESSION", "FIVE_SESSION"];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AdminDashboard() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("All Statuses");
  const [filterCoach, setFilterCoach] = useState("All Coaches");
  const [filterTrack, setFilterTrack] = useState("All Tracks");
  const [activeTab, setActiveTab] = useState("all");
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const perPage = 10;

  // Filtering
  const filtered = engagements.filter((e) => {
    if (activeTab === "attention" && !e.needsAttention) return false;
    if (filterStatus !== "All Statuses" && e.status !== filterStatus) return false;
    if (filterCoach !== "All Coaches" && e.coach !== filterCoach) return false;
    if (filterTrack !== "All Tracks" && e.programTrack !== filterTrack) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        e.participant.toLowerCase().includes(q) ||
        e.coach.toLowerCase().includes(q) ||
        e.id.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Sorting
  const sorted = [...filtered].sort((a, b) => {
    if (!sortCol) return 0;
    const dir = sortAsc ? 1 : -1;
    if (sortCol === "participant") return a.participant.localeCompare(b.participant) * dir;
    if (sortCol === "coach") return a.coach.localeCompare(b.coach) * dir;
    if (sortCol === "status") return a.status.localeCompare(b.status) * dir;
    if (sortCol === "programTrack") return a.programTrack.localeCompare(b.programTrack) * dir;
    if (sortCol === "lastActivity") return (new Date(a.lastActivity).getTime() - new Date(b.lastActivity).getTime()) * dir;
    return 0;
  });

  // Pagination
  const totalPages = Math.ceil(sorted.length / perPage);
  const paginated = sorted.slice((currentPage - 1) * perPage, currentPage * perPage);

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  };

  const attentionCount = engagements.filter((e) => e.needsAttention).length;

  return (
    <PortalShell
      portalName={ADMIN_PORTAL.portalName}
      portalIcon={<AdminPortalIcon />}
      userName={ADMIN_PORTAL.userName}
      userRole={ADMIN_PORTAL.userRole}
      navItems={ADMIN_NAV_ITEMS}
      activeItem="/admin/dashboard"
    >
      {/* Page header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-fc-cool-black">
          Dashboard
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Program overview and engagement monitoring
        </p>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* KPI Cards                                                          */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5 mb-8">
        {kpis.map((kpi, idx) => {
          const isAttention = kpi.changeType === "attention";
          return (
            <Card
              key={kpi.label}
              className={cn(
                "relative overflow-hidden opacity-0 animate-fade-in",
                `stagger-${idx + 1}`,
                isAttention && "border-fc-golden/40 bg-gradient-to-br from-fc-golden/10 to-white shadow-fc-golden/20 shadow-md"
              )}
            >
              {/* Gold shimmer on attention card */}
              {isAttention && <div className="hidden absolute inset-0 pointer-events-none" />}

              <CardContent className="relative p-5">
                <div className="flex items-start justify-between">
                  <div
                    className={cn(
                      "flex h-10 w-10 items-center justify-center rounded-lg",
                      isAttention
                        ? "bg-fc-golden/20 text-fc-golden"
                        : "bg-fc-deep-blue/10 text-fc-deep-blue"
                    )}
                  >
                    {kpi.icon}
                  </div>
                  <Sparkline data={kpi.sparkData} color={kpi.color} className="mt-1" />
                </div>

                <div className="mt-4">
                  <p className="font-display text-3xl font-semibold tracking-tight text-fc-cool-black">
                    {kpi.value}
                  </p>
                  <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                    {kpi.label}
                  </p>
                </div>

                <div className="mt-3 flex items-center gap-1.5">
                  {kpi.changeType === "positive" && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#45D8B4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                      <polyline points="17 6 23 6 23 12" />
                    </svg>
                  )}
                  {kpi.changeType === "attention" && (
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#FFB93C" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                      <polyline points="17 18 23 18 23 12" />
                    </svg>
                  )}
                  <span className={cn(
                    "text-[11px] font-medium",
                    kpi.changeType === "positive" && "text-fc-green",
                    kpi.changeType === "attention" && "text-fc-golden",
                    kpi.changeType === "neutral" && "text-muted-foreground"
                  )}>
                    {kpi.change}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Engagement Table                                                   */}
      {/* ------------------------------------------------------------------ */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-xl">Engagements</CardTitle>
            <Button variant="outline" size="sm" className="gap-2 self-start">
              <DownloadIcon />
              Export CSV
            </Button>
          </div>
        </CardHeader>

        <CardContent>
          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setCurrentPage(1); }}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between mb-5">
              <TabsList>
                <TabsTrigger value="all">
                  All Engagements
                </TabsTrigger>
                <TabsTrigger value="attention" className="gap-1.5">
                  Needs Attention
                  <span className="ml-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-fc-golden px-1.5 text-[10px] font-semibold text-fc-cool-black">
                    {attentionCount}
                  </span>
                </TabsTrigger>
              </TabsList>

              {/* Filter bar */}
              <div className="flex flex-wrap items-center gap-2">
                {/* Status filter */}
                <div className="relative">
                  <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    className="h-9 appearance-none rounded-lg border border-input bg-white pl-3 pr-8 text-xs font-medium text-foreground transition-colors hover:border-fc-deep-blue/50 focus:outline-none focus:ring-2 focus:ring-fc-deep-blue/30"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s === "All Statuses" ? s : getStatusLabel(s)}
                      </option>
                    ))}
                  </select>
                  <ChevronUpDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>

                {/* Coach filter */}
                <div className="relative">
                  <select
                    value={filterCoach}
                    onChange={(e) => { setFilterCoach(e.target.value); setCurrentPage(1); }}
                    className="h-9 appearance-none rounded-lg border border-input bg-white pl-3 pr-8 text-xs font-medium text-foreground transition-colors hover:border-fc-deep-blue/50 focus:outline-none focus:ring-2 focus:ring-fc-deep-blue/30"
                  >
                    {coaches.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronUpDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>

                {/* Track filter */}
                <div className="relative">
                  <select
                    value={filterTrack}
                    onChange={(e) => { setFilterTrack(e.target.value); setCurrentPage(1); }}
                    className="h-9 appearance-none rounded-lg border border-input bg-white pl-3 pr-8 text-xs font-medium text-foreground transition-colors hover:border-fc-deep-blue/50 focus:outline-none focus:ring-2 focus:ring-fc-deep-blue/30"
                  >
                    {tracks.map((t) => (
                      <option key={t} value={t}>
                        {t === "All Tracks" ? t : getStatusLabel(t)}
                      </option>
                    ))}
                  </select>
                  <ChevronUpDown className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                </div>

                {/* Search */}
                <div className="relative">
                  <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search participants..."
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    className="h-9 w-48 pl-8 text-xs"
                  />
                </div>
              </div>
            </div>

            {/* Single table used for both tabs */}
            <TabsContent value="all" className="mt-0">
              <EngagementTable
                data={paginated}
                sortCol={sortCol}
                sortAsc={sortAsc}
                onSort={handleSort}
              />
            </TabsContent>

            <TabsContent value="attention" className="mt-0">
              <EngagementTable
                data={paginated}
                sortCol={sortCol}
                sortAsc={sortAsc}
                onSort={handleSort}
              />
            </TabsContent>
          </Tabs>

          {/* Pagination */}
          <Separator className="my-4 opacity-50" />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-fc-cool-black">
                {Math.min((currentPage - 1) * perPage + 1, sorted.length)}
              </span>
              {" "}to{" "}
              <span className="font-medium text-fc-cool-black">
                {Math.min(currentPage * perPage, sorted.length)}
              </span>
              {" "}of{" "}
              <span className="font-medium text-fc-cool-black">{sorted.length}</span>
              {" "}engagements
            </p>

            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="h-8 px-2 text-xs"
              >
                Previous
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <Button
                  key={page}
                  variant={page === currentPage ? "default" : "ghost"}
                  size="sm"
                  onClick={() => setCurrentPage(page)}
                  className={cn("h-8 w-8 p-0 text-xs", page === currentPage && "pointer-events-none")}
                >
                  {page}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="h-8 px-2 text-xs"
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

// ---------------------------------------------------------------------------
// Table sub-component
// ---------------------------------------------------------------------------

interface EngagementTableProps {
  data: Engagement[];
  sortCol: string | null;
  sortAsc: boolean;
  onSort: (col: string) => void;
}

function SortHeader({
  label,
  col,
  sortCol,
  sortAsc,
  onSort,
}: {
  label: string;
  col: string;
  sortCol: string | null;
  sortAsc: boolean;
  onSort: (col: string) => void;
}) {
  const active = sortCol === col;
  return (
    <button
      onClick={() => onSort(col)}
      className="group inline-flex items-center gap-1 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground transition-colors hover:text-fc-cool-black"
    >
      {label}
      <span className={cn("transition-opacity", active ? "opacity-100" : "opacity-0 group-hover:opacity-50")}>
        {active && sortAsc ? (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m18 15-6-6-6 6" /></svg>
        ) : (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m6 9 6 6 6-6" /></svg>
        )}
      </span>
    </button>
  );
}

function EngagementTable({ data, sortCol, sortAsc, onSort }: EngagementTableProps) {
  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-muted/80">
          <SearchIcon className="text-muted-foreground" />
        </div>
        <p className="mt-4 font-display text-lg font-medium text-fc-cool-black">No engagements found</p>
        <p className="mt-1 text-sm text-muted-foreground">Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto -mx-6">
      <table className="w-full min-w-[800px]">
        <thead>
          <tr className="border-b border-border/60">
            <th className="px-6 py-3 text-left">
              <SortHeader label="Participant" col="participant" sortCol={sortCol} sortAsc={sortAsc} onSort={onSort} />
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader label="Coach" col="coach" sortCol={sortCol} sortAsc={sortAsc} onSort={onSort} />
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader label="Status" col="status" sortCol={sortCol} sortAsc={sortAsc} onSort={onSort} />
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader label="Program" col="programTrack" sortCol={sortCol} sortAsc={sortAsc} onSort={onSort} />
            </th>
            <th className="px-4 py-3 text-left">
              <SortHeader label="Last Activity" col="lastActivity" sortCol={sortCol} sortAsc={sortAsc} onSort={onSort} />
            </th>
            <th className="px-6 py-3 text-right">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Actions
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          {data.map((eng) => (
            <tr
              key={eng.id}
              className={cn(
                "group border-b border-border/30 transition-colors hover:bg-fc-deep-blue/5",
                eng.needsAttention && "bg-fc-golden/5"
              )}
            >
              {/* Participant */}
              <td className="px-6 py-3.5">
                <div className="flex items-center gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-medium">
                      {getInitials(eng.participant)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium text-fc-cool-black">{eng.participant}</p>
                    <p className="text-[11px] text-muted-foreground">{eng.id}</p>
                  </div>
                  {eng.needsAttention && (
                    <AlertTriangleIcon className="ml-1 h-3.5 w-3.5 text-fc-golden" />
                  )}
                </div>
              </td>

              {/* Coach */}
              <td className="px-4 py-3.5">
                <span className="text-sm text-foreground">{eng.coach}</span>
              </td>

              {/* Status */}
              <td className="px-4 py-3.5">
                <Badge className={cn("text-[11px]", getStatusColor(eng.status))}>
                  {getStatusLabel(eng.status)}
                </Badge>
              </td>

              {/* Program Track */}
              <td className="px-4 py-3.5">
                <Badge variant={eng.programTrack === "FIVE_SESSION" ? "info" : "outline"} className="text-[11px]">
                  {getStatusLabel(eng.programTrack)}
                </Badge>
              </td>

              {/* Last Activity */}
              <td className="px-4 py-3.5">
                <span className="text-sm text-muted-foreground">
                  {formatRelativeTime(eng.lastActivity)}
                </span>
              </td>

              {/* Actions */}
              <td className="px-6 py-3.5 text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <MoreHorizontalIcon />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
