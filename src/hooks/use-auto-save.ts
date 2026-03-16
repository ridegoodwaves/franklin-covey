"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

interface UseAutoSaveParams<T> {
  data: T;
  onSave: (data: T) => Promise<void>;
  debounceMs?: number;
  enabled?: boolean;
  identity?: string;
}

interface UseAutoSaveResult {
  saveStatus: SaveStatus;
  flush: () => Promise<void>;
  hasPendingChanges: boolean;
  isSaving: boolean;
  hasError: boolean;
}

export function useAutoSave<T>({
  data,
  onSave,
  debounceMs = 5000,
  enabled = true,
  identity = "default",
}: UseAutoSaveParams<T>): UseAutoSaveResult {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [hasPendingChanges, setHasPendingChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const isSavingRef = useRef(false);
  const hasErrorRef = useRef(false);
  const dataRef = useRef<T>(data);
  const lastSavedSerializedRef = useRef<string>(JSON.stringify(data));
  const hasPendingChangesRef = useRef(false);

  const serialized = useMemo(() => JSON.stringify(data), [data]);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const executeSave = useCallback(async () => {
    if (!enabled) return;
    if (isSavingRef.current) return;
    const snapshot = dataRef.current;
    const snapshotSerialized = JSON.stringify(snapshot);
    if (snapshotSerialized === lastSavedSerializedRef.current) {
      hasPendingChangesRef.current = false;
      setHasPendingChanges(false);
      if (!hasErrorRef.current) setSaveStatus("idle");
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    hasErrorRef.current = false;
    setHasError(false);
    setSaveStatus("saving");

    try {
      await onSave(snapshot);
      lastSavedSerializedRef.current = snapshotSerialized;

      if (JSON.stringify(dataRef.current) !== snapshotSerialized) {
        hasPendingChangesRef.current = true;
        setHasPendingChanges(true);
        clearTimer();
        timerRef.current = window.setTimeout(() => {
          void executeSave();
        }, debounceMs);
      } else {
        hasPendingChangesRef.current = false;
        setHasPendingChanges(false);
        setSaveStatus("saved");
        window.setTimeout(() => {
          if (!isSavingRef.current && !hasErrorRef.current && mountedRef.current) {
            setSaveStatus("idle");
          }
        }, 1200);
      }
    } catch {
      hasErrorRef.current = true;
      setHasError(true);
      setSaveStatus("error");
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, [clearTimer, debounceMs, enabled, onSave]);

  const flush = useCallback(async () => {
    clearTimer();
    await executeSave();
  }, [clearTimer, executeSave]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    dataRef.current = data;
    if (!enabled) {
      clearTimer();
      hasPendingChangesRef.current = false;
      setHasPendingChanges(false);
      hasErrorRef.current = false;
      setHasError(false);
      setSaveStatus("idle");
      lastSavedSerializedRef.current = serialized;
      return;
    }

    if (!mountedRef.current) return;
    if (serialized === lastSavedSerializedRef.current) return;

    hasPendingChangesRef.current = true;
    setHasPendingChanges(true);
    clearTimer();
    timerRef.current = window.setTimeout(() => {
      void executeSave();
    }, debounceMs);
  }, [data, debounceMs, enabled, executeSave, serialized, clearTimer]);

  useEffect(() => {
    clearTimer();
    hasPendingChangesRef.current = false;
    setHasPendingChanges(false);
    hasErrorRef.current = false;
    setHasError(false);
    isSavingRef.current = false;
    setIsSaving(false);
    setSaveStatus("idle");
    lastSavedSerializedRef.current = JSON.stringify(dataRef.current);
  }, [identity, clearTimer]);

  useEffect(() => {
    return () => {
      if (enabled && hasPendingChangesRef.current) {
        void executeSave();
      }
    };
  }, [enabled, executeSave]);

  return {
    saveStatus,
    flush,
    hasPendingChanges,
    isSaving,
    hasError,
  };
}
