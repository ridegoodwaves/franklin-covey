"use client";

import { useEffect, useState } from "react";

type PortalRole = "ADMIN" | "COACH";

interface PortalSessionPayload {
  email: string;
  role: PortalRole;
}

interface PortalUser {
  name: string;
  roleLabel: string;
}

const ROLE_LABELS: Record<PortalRole, string> = {
  ADMIN: "Program Administrator",
  COACH: "Coach",
};

export function usePortalUser(fallback: PortalUser): PortalUser {
  const [portalUser, setPortalUser] = useState<PortalUser>(fallback);

  useEffect(() => {
    let active = true;

    async function loadPortalUser() {
      try {
        const response = await fetch("/api/portal/session", { cache: "no-store" });
        if (!response.ok) return;

        const data = (await response.json()) as PortalSessionPayload;
        if (!active) return;

        setPortalUser({
          name: data.email || fallback.name,
          roleLabel: ROLE_LABELS[data.role] || fallback.roleLabel,
        });
      } catch {
        // Keep fallback identity if session lookup fails.
      }
    }

    void loadPortalUser();
    return () => {
      active = false;
    };
  }, [fallback.name, fallback.roleLabel]);

  return portalUser;
}
