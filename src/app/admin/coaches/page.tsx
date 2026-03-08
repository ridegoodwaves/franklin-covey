"use client";

import React, { useMemo, useState } from "react";
import { cn, getInitials } from "@/lib/utils";
import { PortalShell } from "@/components/navigation";
import { ADMIN_NAV_ITEMS, ADMIN_PORTAL, AdminPortalIcon } from "@/lib/nav-config";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { CoachUtilizationItem } from "@/lib/types/dashboard";
import { usePortalUser } from "@/lib/use-portal-user";

interface CoachesResponseApi {
  items: Array<Omit<CoachUtilizationItem, "updatedAt"> & { updatedAt: string }>;
}

interface PatchCoachResponse {
  item: Omit<CoachUtilizationItem, "updatedAt"> & { updatedAt: string };
}

interface EditCoachState {
  organizationCoachId: string;
  name: string;
  current: number;
  maxEngagements: string;
  active: boolean;
  updatedAt: string;
}

function EditIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  );
}

function getCapacityColor(percent: number) {
  if (percent >= 90) {
    return { bar: "bg-red-500", text: "text-red-700", badge: "destructive" as const };
  }
  if (percent >= 70) {
    return { bar: "bg-amber-500", text: "text-amber-700", badge: "warning" as const };
  }
  return { bar: "bg-emerald-500", text: "text-emerald-700", badge: "info" as const };
}

export default function CoachesPage() {
  const portalUser = usePortalUser({
    name: "Admin User",
    roleLabel: "Program Administrator",
  });

  const [coaches, setCoaches] = React.useState<CoachesResponseApi["items"]>([]);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [formError, setFormError] = React.useState<string | null>(null);
  const [editingCoach, setEditingCoach] = useState<EditCoachState | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    async function loadCoaches() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/admin/coaches", {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load coaches (${response.status})`);
        }

        const data = (await response.json()) as CoachesResponseApi;
        setCoaches(data.items);
      } catch (err) {
        if (controller.signal.aborted) return;
        const message = err instanceof Error ? err.message : "Failed to load coaches";
        setError(message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadCoaches();
    return () => controller.abort();
  }, []);

  const activeCoaches = useMemo(
    () => coaches.filter((coach) => coach.active).length,
    [coaches]
  );
  const totalCapacity = useMemo(
    () => coaches.reduce((sum, coach) => sum + coach.max, 0),
    [coaches]
  );
  const totalActive = useMemo(
    () => coaches.reduce((sum, coach) => sum + coach.current, 0),
    [coaches]
  );
  const utilization = useMemo(() => {
    if (totalCapacity <= 0) return 0;
    return Math.round((totalActive / totalCapacity) * 1000) / 10;
  }, [totalActive, totalCapacity]);

  const currentMax = Number(editingCoach?.maxEngagements ?? "0");
  const showLowCapacityWarning =
    editingCoach !== null &&
    Number.isFinite(currentMax) &&
    currentMax >= 0 &&
    currentMax < editingCoach.current;

  function openEditor(coach: CoachesResponseApi["items"][number]) {
    setFormError(null);
    setEditingCoach({
      organizationCoachId: coach.organizationCoachId,
      name: coach.name,
      current: coach.current,
      maxEngagements: String(coach.max),
      active: coach.active,
      updatedAt: coach.updatedAt,
    });
  }

  function closeEditor() {
    if (saving) return;
    setEditingCoach(null);
    setFormError(null);
  }

  async function submitEdit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editingCoach) return;

    const parsedMax = Number.parseInt(editingCoach.maxEngagements, 10);
    if (!Number.isInteger(parsedMax) || parsedMax < 0) {
      setFormError("Max engagements must be a non-negative integer.");
      return;
    }

    setSaving(true);
    setFormError(null);

    try {
      const response = await fetch(`/api/admin/coaches/${editingCoach.organizationCoachId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          maxEngagements: parsedMax,
          active: editingCoach.active,
          updatedAt: editingCoach.updatedAt,
        }),
      });

      if (response.status === 409) {
        setFormError("Another admin updated this coach. Refresh and try again.");
        return;
      }

      if (!response.ok) {
        throw new Error(`Failed to update coach (${response.status})`);
      }

      const payload = (await response.json()) as PatchCoachResponse;
      setCoaches((previous) =>
        previous.map((coach) =>
          coach.organizationCoachId === payload.item.organizationCoachId ? payload.item : coach
        )
      );
      setEditingCoach(null);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to save coach";
      setFormError(message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PortalShell
      portalName={ADMIN_PORTAL.portalName}
      portalIcon={<AdminPortalIcon />}
      userName={portalUser.name}
      userRole={portalUser.roleLabel}
      navItems={ADMIN_NAV_ITEMS}
      activeItem="/admin/coaches"
    >
      <div className="mb-8">
        <h1 className="font-display text-3xl font-semibold tracking-tight text-fc-900">
          Coach Roster
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage coach capacity for USPS engagements
        </p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Active Coaches
            </p>
            <p className="mt-2 font-display text-3xl font-semibold text-fc-900">{activeCoaches}</p>
            <p className="mt-1 text-xs text-muted-foreground">of {coaches.length} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Active Engagements
            </p>
            <p className="mt-2 font-display text-3xl font-semibold text-fc-900">{totalActive}</p>
            <p className="mt-1 text-xs text-muted-foreground">capacity units in use</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Overall Utilization
            </p>
            <p className="mt-2 font-display text-3xl font-semibold text-fc-900">{utilization}%</p>
            <div className="mt-2">
              <Progress value={utilization} className="h-1.5" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-xl">Coach Directory</CardTitle>
        </CardHeader>

        <CardContent>
          {loading ? (
            <div className="py-12 text-center">
              <p className="text-sm text-muted-foreground">Loading coaches...</p>
            </div>
          ) : null}

          {error ? <p className="mb-4 text-sm font-medium text-red-600">{error}</p> : null}

          {!loading && !error ? (
            <div className="-mx-6 overflow-x-auto">
              <table className="w-full min-w-[880px]">
                <thead>
                  <tr className="border-b border-border/60">
                    <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Coach
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Email
                    </th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Pool
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Active
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Max
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Capacity
                    </th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {coaches.map((coach) => {
                    const colors = getCapacityColor(coach.utilizationPct);
                    return (
                      <tr
                        key={coach.organizationCoachId}
                        className={cn(
                          "border-b border-border/30 transition-colors hover:bg-fc-50/60",
                          !coach.active && "opacity-70"
                        )}
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="bg-fc-100 text-xs font-semibold text-fc-800">
                                {getInitials(coach.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="text-sm font-medium text-fc-900">{coach.name}</p>
                            </div>
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center gap-1.5 text-xs text-fc-700">
                            <MailIcon />
                            {coach.email}
                          </div>
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex flex-wrap gap-1">
                            {coach.pools.map((pool) => (
                              <Badge key={`${coach.organizationCoachId}-${pool}`} variant="outline" className="text-[10px]">
                                {pool}
                              </Badge>
                            ))}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center text-sm font-semibold text-fc-800">
                          {coach.current}
                        </td>

                        <td className="px-4 py-4 text-center text-sm text-muted-foreground">
                          {coach.max}
                        </td>

                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <div className="relative h-2 w-20 overflow-hidden rounded-full bg-fc-100/60">
                              <div
                                className={cn("h-full rounded-full", colors.bar)}
                                style={{ width: `${Math.min(100, coach.utilizationPct)}%` }}
                              />
                            </div>
                            <span className={cn("w-10 text-right text-xs font-semibold", colors.text)}>
                              {coach.utilizationPct}%
                            </span>
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <Badge variant={coach.active ? "default" : "secondary"} className="text-[11px]">
                            {coach.active ? "Active" : "Inactive"}
                          </Badge>
                        </td>

                        <td className="px-6 py-4 text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 gap-1.5 px-2 text-xs"
                            onClick={() => openEditor(coach)}
                          >
                            <EditIcon />
                            Edit
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : null}

          <Separator className="my-4 opacity-50" />
          <p className="text-xs text-muted-foreground">
            Showing <span className="font-medium text-fc-800">{coaches.length}</span> coaches
          </p>
        </CardContent>
      </Card>

      {editingCoach ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-xl border border-border bg-white p-6 shadow-xl">
            <h2 className="font-display text-2xl font-semibold text-fc-900">
              Edit {editingCoach.name}
            </h2>

            <form className="mt-4 space-y-4" onSubmit={submitEdit}>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Max Engagements
                </label>
                <Input
                  type="number"
                  min={0}
                  step={1}
                  value={editingCoach.maxEngagements}
                  onChange={(event) =>
                    setEditingCoach((previous) =>
                      previous
                        ? { ...previous, maxEngagements: event.target.value }
                        : previous
                    )
                  }
                  required
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-fc-900">
                <input
                  type="checkbox"
                  checked={editingCoach.active}
                  onChange={(event) =>
                    setEditingCoach((previous) =>
                      previous
                        ? { ...previous, active: event.target.checked }
                        : previous
                    )
                  }
                />
                Coach is active
              </label>

              {showLowCapacityWarning ? (
                <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium text-amber-700">
                  New max is below current active engagements ({editingCoach.current}). This can block future assignments.
                </p>
              ) : null}

              {formError ? <p className="text-sm font-medium text-red-600">{formError}</p> : null}

              <div className="flex items-center justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={closeEditor} disabled={saving}>
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </PortalShell>
  );
}
