"use client";

import React, { useState } from "react";
import { cn, getInitials } from "@/lib/utils";
import { PortalShell } from "@/components/navigation";
import { ADMIN_NAV_ITEMS, ADMIN_PORTAL, AdminPortalIcon } from "@/lib/nav-config";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" />
      <path d="M12 5v14" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function MoreVerticalIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="1" />
      <circle cx="12" cy="5" r="1" />
      <circle cx="12" cy="19" r="1" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Nav items
// ---------------------------------------------------------------------------

// Nav items centralized in src/lib/nav-config.tsx

// ---------------------------------------------------------------------------
// Coach data
// ---------------------------------------------------------------------------

interface Coach {
  id: string;
  name: string;
  email: string;
  specialties: string[];
  activeEngagements: number;
  maxCapacity: number;
  status: "Active" | "On Leave" | "Inactive";
  avatarColor: string;
}

const coachData: Coach[] = [
  {
    id: "C-001",
    name: "Dr. Angela Ford",
    email: "angela.ford@franklincovey.com",
    specialties: ["Executive Presence", "Strategic Thinking", "Change Management"],
    activeEngagements: 18,
    maxCapacity: 20,
    status: "Active",
    avatarColor: "bg-fc-200 text-fc-800",
  },
  {
    id: "C-002",
    name: "Michael Chen",
    email: "michael.chen@franklincovey.com",
    specialties: ["Team Leadership", "Communication", "Conflict Resolution"],
    activeEngagements: 12,
    maxCapacity: 18,
    status: "Active",
    avatarColor: "bg-fc-100 text-fc-800",
  },
  {
    id: "C-003",
    name: "Lisa Patel",
    email: "lisa.patel@franklincovey.com",
    specialties: ["Emotional Intelligence", "Coaching Leaders", "Resilience"],
    activeEngagements: 15,
    maxCapacity: 16,
    status: "Active",
    avatarColor: "bg-emerald-100 text-emerald-800",
  },
  {
    id: "C-004",
    name: "Jennifer Williams",
    email: "jennifer.williams@franklincovey.com",
    specialties: ["Organizational Culture", "Performance Management"],
    activeEngagements: 9,
    maxCapacity: 15,
    status: "Active",
    avatarColor: "bg-blue-100 text-blue-800",
  },
  {
    id: "C-005",
    name: "David Okafor",
    email: "david.okafor@franklincovey.com",
    specialties: ["Public Sector Leadership", "Stakeholder Engagement"],
    activeEngagements: 6,
    maxCapacity: 14,
    status: "Active",
    avatarColor: "bg-purple-100 text-purple-800",
  },
  {
    id: "C-006",
    name: "Susan Nakamura",
    email: "susan.nakamura@franklincovey.com",
    specialties: ["Mindfulness", "Work-Life Integration", "Women in Leadership"],
    activeEngagements: 0,
    maxCapacity: 12,
    status: "On Leave",
    avatarColor: "bg-amber-100 text-amber-800",
  },
  {
    id: "C-007",
    name: "Marcus Johnson",
    email: "marcus.johnson@franklincovey.com",
    specialties: ["Innovation Leadership", "Digital Transformation"],
    activeEngagements: 14,
    maxCapacity: 16,
    status: "Active",
    avatarColor: "bg-red-100 text-red-800",
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getCapacityPercent(active: number, max: number) {
  return Math.round((active / max) * 100);
}

function getCapacityColor(percent: number) {
  if (percent >= 90) return { bar: "bg-red-500", text: "text-red-700", bg: "bg-red-50", badge: "destructive" as const };
  if (percent >= 70) return { bar: "bg-amber-500", text: "text-amber-700", bg: "bg-amber-50", badge: "warning" as const };
  return { bar: "bg-emerald-500", text: "text-emerald-700", bg: "bg-emerald-50", badge: "info" as const };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CoachesPage() {
  const [search, setSearch] = useState("");

  const activeCoaches = coachData.filter((c) => c.status === "Active");
  const totalCapacity = coachData.reduce((sum, c) => sum + c.maxCapacity, 0);
  const totalActive = coachData.reduce((sum, c) => sum + c.activeEngagements, 0);

  const filteredCoaches = coachData.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      c.name.toLowerCase().includes(q) ||
      c.email.toLowerCase().includes(q) ||
      c.specialties.some((s) => s.toLowerCase().includes(q))
    );
  });

  return (
    <PortalShell
      portalName={ADMIN_PORTAL.portalName}
      portalIcon={<AdminPortalIcon />}
      userName={ADMIN_PORTAL.userName}
      userRole={ADMIN_PORTAL.userRole}
      navItems={ADMIN_NAV_ITEMS}
      activeItem="/admin/coaches"
    >
      {/* Page header */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-fc-900">
            Coach Roster
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage coaches and monitor capacity utilization
          </p>
        </div>
        <Button className="gap-2 self-start">
          <PlusIcon />
          Add Coach
        </Button>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Overview Stats                                                     */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 mb-8">
        <Card className="opacity-0 animate-fade-in stagger-1">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Active Coaches</p>
            <p className="mt-2 font-display text-3xl font-semibold text-fc-900">{activeCoaches.length}</p>
            <p className="mt-1 text-xs text-muted-foreground">of {coachData.length} total</p>
          </CardContent>
        </Card>
        <Card className="opacity-0 animate-fade-in stagger-2">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Total Engagements</p>
            <p className="mt-2 font-display text-3xl font-semibold text-fc-900">{totalActive}</p>
            <p className="mt-1 text-xs text-muted-foreground">across all coaches</p>
          </CardContent>
        </Card>
        <Card className="opacity-0 animate-fade-in stagger-3">
          <CardContent className="p-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Overall Utilization</p>
            <p className="mt-2 font-display text-3xl font-semibold text-fc-900">{getCapacityPercent(totalActive, totalCapacity)}%</p>
            <div className="mt-2">
              <Progress value={getCapacityPercent(totalActive, totalCapacity)} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Capacity Overview - Hero visual                                    */}
      {/* ------------------------------------------------------------------ */}
      <Card className="mb-8 opacity-0 animate-fade-in stagger-4">
        <CardHeader>
          <CardTitle className="text-xl">Capacity Overview</CardTitle>
          <CardDescription>Real-time coach workload and availability</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {coachData.map((coach) => {
              const percent = getCapacityPercent(coach.activeEngagements, coach.maxCapacity);
              const colors = getCapacityColor(percent);
              const available = coach.maxCapacity - coach.activeEngagements;
              const isOnLeave = coach.status !== "Active";

              return (
                <div
                  key={coach.id}
                  className={cn(
                    "group relative rounded-xl border border-border/60 p-4 transition-all duration-300 hover:shadow-md hover:border-border",
                    isOnLeave && "opacity-60"
                  )}
                >
                  {/* Coach info */}
                  <div className="flex items-center gap-3 mb-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className={cn("text-sm font-semibold", coach.avatarColor)}>
                        {getInitials(coach.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-fc-900 truncate">{coach.name}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {isOnLeave ? (
                          <span className="text-amber-600 font-medium">On Leave</span>
                        ) : (
                          <>{available} slot{available !== 1 ? "s" : ""} available</>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Capacity bar */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {coach.activeEngagements} / {coach.maxCapacity}
                      </span>
                      <span className={cn("text-xs font-semibold", colors.text)}>
                        {isOnLeave ? "--" : `${percent}%`}
                      </span>
                    </div>
                    <div className="relative h-3 w-full overflow-hidden rounded-full bg-fc-100/60">
                      <div
                        className={cn(
                          "h-full rounded-full transition-all duration-700 ease-out",
                          colors.bar,
                          isOnLeave && "bg-gray-300"
                        )}
                        style={{ width: isOnLeave ? "0%" : `${percent}%` }}
                      />
                    </div>
                  </div>

                  {/* Capacity badge */}
                  {!isOnLeave && percent >= 90 && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-red-500 animate-pulse-subtle" />
                      <span className="text-[11px] font-medium text-red-600">Near capacity</span>
                    </div>
                  )}
                  {!isOnLeave && percent >= 70 && percent < 90 && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                      <span className="text-[11px] font-medium text-amber-600">High utilization</span>
                    </div>
                  )}
                  {!isOnLeave && percent < 70 && (
                    <div className="mt-3 flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      <span className="text-[11px] font-medium text-emerald-600">Available</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ------------------------------------------------------------------ */}
      {/* Coach Roster Table                                                 */}
      {/* ------------------------------------------------------------------ */}
      <Card className="opacity-0 animate-fade-in stagger-5">
        <CardHeader className="pb-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-xl">Coach Directory</CardTitle>
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search coaches..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-56 pl-8 text-xs"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="overflow-x-auto -mx-6">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-border/60">
                  <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Coach</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Email</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Specialties</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Active</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Max</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Capacity</th>
                  <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Status</th>
                  <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCoaches.map((coach) => {
                  const percent = getCapacityPercent(coach.activeEngagements, coach.maxCapacity);
                  const colors = getCapacityColor(percent);
                  const isOnLeave = coach.status !== "Active";

                  return (
                    <tr
                      key={coach.id}
                      className={cn(
                        "group border-b border-border/30 transition-colors hover:bg-fc-50/50",
                        isOnLeave && "opacity-60"
                      )}
                    >
                      {/* Coach name + avatar */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className={cn("text-xs font-semibold", coach.avatarColor)}>
                              {getInitials(coach.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium text-fc-900">{coach.name}</p>
                            <p className="text-[11px] text-muted-foreground">{coach.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1.5 text-sm text-fc-600">
                          <MailIcon />
                          <span className="text-xs">{coach.email}</span>
                        </div>
                      </td>

                      {/* Specialties */}
                      <td className="px-4 py-4">
                        <div className="flex flex-wrap gap-1">
                          {coach.specialties.slice(0, 2).map((s) => (
                            <Badge key={s} variant="outline" className="text-[10px] px-1.5 py-0">
                              {s}
                            </Badge>
                          ))}
                          {coach.specialties.length > 2 && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                              +{coach.specialties.length - 2}
                            </Badge>
                          )}
                        </div>
                      </td>

                      {/* Active */}
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm font-semibold text-fc-800">
                          {coach.activeEngagements}
                        </span>
                      </td>

                      {/* Max */}
                      <td className="px-4 py-4 text-center">
                        <span className="text-sm text-muted-foreground">{coach.maxCapacity}</span>
                      </td>

                      {/* Capacity bar in table */}
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2 justify-center">
                          <div className="relative h-2 w-20 overflow-hidden rounded-full bg-fc-100/60">
                            <div
                              className={cn("h-full rounded-full transition-all duration-500", colors.bar, isOnLeave && "bg-gray-300")}
                              style={{ width: isOnLeave ? "0%" : `${percent}%` }}
                            />
                          </div>
                          <span className={cn("text-xs font-semibold w-8 text-right", isOnLeave ? "text-gray-400" : colors.text)}>
                            {isOnLeave ? "--" : `${percent}%`}
                          </span>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center">
                        <Badge
                          variant={
                            coach.status === "Active" ? "default" :
                            coach.status === "On Leave" ? "warning" : "secondary"
                          }
                          className="text-[11px]"
                        >
                          {coach.status}
                        </Badge>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button variant="ghost" size="sm" className="h-8 gap-1.5 px-2 text-xs">
                            <EditIcon />
                            Edit
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVerticalIcon />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Footer */}
          <Separator className="my-4 opacity-50" />
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Showing <span className="font-medium text-fc-800">{filteredCoaches.length}</span> of{" "}
              <span className="font-medium text-fc-800">{coachData.length}</span> coaches
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>&lt;70%</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-amber-500" />
                <span>70-90%</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                <div className="h-2 w-2 rounded-full bg-red-500" />
                <span>&gt;90%</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </PortalShell>
  );
}
