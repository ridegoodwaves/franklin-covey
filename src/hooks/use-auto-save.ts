"use client";

import { useCallback, useEffect, useRef, useState } from "react";

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
  const [isSaving, setIsSaving] = useState(false);
  const [hasError, setHasError] = useState(false);
  const timerRef = useRef<number | null>(null);
  const mountedRef = useRef(false);
  const isSavingRef = useRef(false);
  const hasErrorRef = useRef(false);
  const dataRef = useRef<T>(data);
  const onSaveRef = useRef(onSave);
  const enabledRef = useRef(enabled);

  const serialized = JSON.stringify(data);
  const lastSavedSerializedRef = useRef<string>(serialized);
  const hasPendingChanges = enabled && serialized !== lastSavedSerializedRef.current;

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  useEffect(() => {
    onSaveRef.current = onSave;
  }, [onSave]);

  useEffect(() => {
    enabledRef.current = enabled;
  }, [enabled]);

  const executeSave = useCallback(async () => {
    if (!enabledRef.current || isSavingRef.current) return;

    const snapshot = dataRef.current;
    const snapshotSerialized = JSON.stringify(snapshot);

    if (snapshotSerialized === lastSavedSerializedRef.current) {
      if (!hasErrorRef.current) setSaveStatus("idle");
      return;
    }

    isSavingRef.current = true;
    setIsSaving(true);
    hasErrorRef.current = false;
    setHasError(false);
    setSaveStatus("saving");

    try {
      await onSaveRef.current(snapshot);
      lastSavedSerializedRef.current = snapshotSerialized;

      setSaveStatus("saved");
      window.setTimeout(() => {
        if (!isSavingRef.current && !hasErrorRef.current && mountedRef.current) {
          if (JSON.stringify(dataRef.current) === lastSavedSerializedRef.current) {
            setSaveStatus("idle");
          }
        }
      }, 1200);
    } catch {
      hasErrorRef.current = true;
      setHasError(true);
      setSaveStatus("error");
    } finally {
      isSavingRef.current = false;
      setIsSaving(false);
    }
  }, []);

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
    if (!enabled) {
      clearTimer();
      hasErrorRef.current = false;
      setHasError(false);
      setSaveStatus("idle");
      lastSavedSerializedRef.current = serialized;
      return;
    }

    if (!mountedRef.current) return;
    if (serialized === lastSavedSerializedRef.current) return;
    if (isSaving) return;

    clearTimer();
    timerRef.current = window.setTimeout(() => {
      void executeSave();
    }, debounceMs);
  }, [clearTimer, debounceMs, enabled, executeSave, isSaving, serialized]);

  useEffect(() => {
    clearTimer();
    hasErrorRef.current = false;
    setHasError(false);
    isSavingRef.current = false;
    setIsSaving(false);
    setSaveStatus("idle");
    lastSavedSerializedRef.current = JSON.stringify(dataRef.current);
  }, [clearTimer, identity]);

  useEffect(() => {
    return () => {
      if (
        enabledRef.current &&
        JSON.stringify(dataRef.current) !== lastSavedSerializedRef.current
      ) {
        void executeSave();
      }
    };
  }, [executeSave]);

  return {
    saveStatus,
    flush,
    hasPendingChanges,
    isSaving,
    hasError,
  };
}
