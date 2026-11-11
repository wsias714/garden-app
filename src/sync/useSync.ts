import { useCallback, useEffect, useRef, useState } from "react";
import { dropboxRemote, finishAuthFromUrl, isConnected } from "./dropbox.ts";
import { mergeData, sameData } from "./merge.ts";
import { syncGarden } from "./remote.ts";
import type { GardenData } from "./types.ts";

export type SyncState = "off" | "idle" | "syncing" | "offline" | "error";

export interface Sync {
  state: SyncState;
  error: string;
  lastSync: string;
  dataBytes: number;
  warning: string;
  connected: boolean;
  syncNow: () => void;
  refreshConnection: () => void;
}

export function useSync(lib: GardenData, applyLib: (fn: (cur: GardenData) => GardenData) => void, flash: (m: string) => void, ready: boolean): Sync {
  const [state, setState] = useState<SyncState>(isConnected() ? "idle" : "off");
  const [error, setError] = useState("");
  const [lastSync, setLastSync] = useState("");
  const [dataBytes, setDataBytes] = useState(0);
  const [warning, setWarning] = useState("");
  const [connected, setConnected] = useState(isConnected());

  const libRef = useRef(lib);
  libRef.current = lib;
  const readyRef = useRef(ready);
  readyRef.current = ready;
  const synced = useRef<GardenData | null>(null);
  const busy = useRef(false);
  const again = useRef(false);

  const run = useCallback(async () => {
    if (!isConnected() || !readyRef.current) return;
    if (busy.current) {
      again.current = true;
      return;
    }
    busy.current = true;
    setState("syncing");
    try {
      const res = await syncGarden(dropboxRemote(), libRef.current);
      synced.current = res.data;
      applyLib((cur) => {
        const merged = mergeData(cur, res.data);
        return sameData(merged, cur) ? cur : merged;
      });
      setDataBytes(res.dataBytes);
      setWarning(res.warning);
      setLastSync(new Date().toISOString());
      setError("");
      setState("idle");
    } catch (e) {
      const offline = !navigator.onLine || (e instanceof TypeError && /fetch|network/i.test(e.message));
      setState(offline ? "offline" : "error");
      setError(offline ? "" : e instanceof Error ? e.message : String(e));
    } finally {
      busy.current = false;
      if (again.current) {
        again.current = false;
        setTimeout(run, 500);
      }
    }
  }, [applyLib]);

  useEffect(() => {
    if (!ready) return;
    finishAuthFromUrl()
      .then((r) => {
        if (r === "connected") {
          setConnected(true);
          flash("Dropbox connected.");
        }
      })
      .catch((e: Error) => {
        setState("error");
        setError(e.message);
      })
      .finally(() => void run());
  }, [ready, run, flash]);

  useEffect(() => {
    if (!connected || !ready) return;
    if (synced.current && sameData(lib, synced.current)) return;
    const t = setTimeout(() => void run(), 1500);
    return () => clearTimeout(t);
  }, [lib, connected, ready, run]);

  useEffect(() => {
    const onVisible = () => document.visibilityState === "visible" && void run();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onVisible);
    };
  }, [run]);

  const refreshConnection = useCallback(() => {
    const c = isConnected();
    setConnected(c);
    setState(c ? "idle" : "off");
    if (c) void run();
  }, [run]);

  return { state, error, lastSync, dataBytes, warning, connected, syncNow: () => void run(), refreshConnection };
}
