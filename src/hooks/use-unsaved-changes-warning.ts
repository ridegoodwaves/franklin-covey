"use client";

import { useCallback, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

interface UseUnsavedChangesWarningParams {
  hasUnsavedChanges: boolean;
  message?: string;
}

interface UseUnsavedChangesWarningResult {
  confirmNavigation: () => boolean;
  guardedPush: (href: string) => Promise<boolean>;
}

const DEFAULT_MESSAGE = "You have unsaved changes. Leave this page?";

export function useUnsavedChangesWarning({
  hasUnsavedChanges,
  message = DEFAULT_MESSAGE,
}: UseUnsavedChangesWarningParams): UseUnsavedChangesWarningResult {
  const router = useRouter();
  const hasUnsavedRef = useRef(hasUnsavedChanges);

  useEffect(() => {
    hasUnsavedRef.current = hasUnsavedChanges;
  }, [hasUnsavedChanges]);

  useEffect(() => {
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!hasUnsavedRef.current) return;
      event.preventDefault();
      event.returnValue = message;
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [message]);

  const confirmNavigation = useCallback((): boolean => {
    if (!hasUnsavedRef.current) return true;
    return window.confirm(message);
  }, [message]);

  const guardedPush = useCallback(
    async (href: string): Promise<boolean> => {
      if (!confirmNavigation()) return false;
      router.push(href);
      return true;
    },
    [confirmNavigation, router]
  );

  return { confirmNavigation, guardedPush };
}
