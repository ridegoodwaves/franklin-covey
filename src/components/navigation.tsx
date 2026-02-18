"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  active?: boolean;
  disabled?: boolean;
}

interface PortalShellProps {
  portalName: string;
  portalIcon: React.ReactNode;
  userName: string;
  userRole: string;
  userAvatar?: string;
  navItems: NavItem[];
  activeItem?: string;
  children: React.ReactNode;
}

export function PortalShell({
  portalName,
  portalIcon,
  userName,
  userRole,
  userAvatar,
  navItems,
  activeItem,
  children,
}: PortalShellProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-fc-cool-black/20 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-border/40 bg-white transition-transform duration-300 ease-out lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 px-6">
          <img src="/fc-logomark.svg" alt="FranklinCovey" className="h-8 w-8" />
          <div>
            <p className="font-display text-base font-semibold text-fc-cool-black">
              FranklinCovey
            </p>
            <p className="text-xs text-muted-foreground">{portalName}</p>
          </div>
        </div>

        <Separator className="opacity-50" />

        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-3 py-4">
          {navItems.map((item) => {
            if (item.disabled) {
              return (
                <span
                  key={item.href}
                  className="group flex cursor-default items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground/50"
                  title="Coming soon"
                >
                  <span className="flex h-8 w-8 items-center justify-center rounded-md bg-muted/30 text-muted-foreground/40">
                    {item.icon}
                  </span>
                  <span className="flex-1">{item.label}</span>
                  <span className="rounded-full bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground/60">
                    Soon
                  </span>
                </span>
              );
            }

            return (
              <a
                key={item.href}
                href={item.href}
                className={cn(
                  "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                  item.active || item.href === activeItem
                    ? "bg-fc-deep-blue/10 text-fc-cool-black"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-fc-cool-black"
                )}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-md transition-colors",
                    item.active || item.href === activeItem
                      ? "bg-fc-deep-blue text-white"
                      : "bg-muted/60 text-muted-foreground group-hover:bg-fc-deep-blue/10 group-hover:text-fc-deep-blue"
                  )}
                >
                  {item.icon}
                </span>
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-fc-deep-blue px-1.5 text-[10px] font-semibold text-white">
                    {item.badge}
                  </span>
                )}
              </a>
            );
          })}
        </nav>

        <Separator className="opacity-50" />

        {/* User */}
        <div className="flex items-center gap-3 p-4">
          <Avatar className="h-9 w-9">
            {userAvatar && <AvatarImage src={userAvatar} alt={userName} />}
            <AvatarFallback>
              {userName
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-medium text-fc-cool-black">
              {userName}
            </p>
            <p className="truncate text-xs text-muted-foreground">{userRole}</p>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
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
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
              <polyline points="16 17 21 12 16 7" />
              <line x1="21" y1="12" x2="9" y2="12" />
            </svg>
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {/* Top bar (mobile) */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/40 bg-white/80 px-6 backdrop-blur-md lg:hidden">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(true)}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="4" y1="12" x2="20" y2="12" />
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="4" y1="18" x2="20" y2="18" />
            </svg>
          </Button>
          <span className="font-display text-lg font-semibold text-fc-cool-black">
            {portalName}
          </span>
        </header>

        <div className="px-6 py-8 lg:px-10 lg:py-10">{children}</div>
      </main>
    </div>
  );
}
