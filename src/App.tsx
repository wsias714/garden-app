import { useCallback, useState } from "react";
import { JournalTab } from "./tabs/Journal.tsx";
import { PlantsTab } from "./tabs/Plants.tsx";
import { PlotTab } from "./tabs/Plot.tsx";
import { SettingsSheet } from "./tabs/Settings.tsx";
import { TodayTab } from "./tabs/Today.tsx";
import { useStore } from "./store.ts";
import { useSync } from "./sync/useSync.ts";

type Tab = "today" | "plot" | "plants" | "journal";
const TABS: { id: Tab; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "plot", label: "Plot" },
  { id: "plants", label: "Plants" },
  { id: "journal", label: "Journal" },
];
const PILL = { off: "Local only", idle: "Synced", syncing: "Syncing…", offline: "Offline", error: "Sync error" } as const;

export default function App() {
  const store = useStore();
  const [tab, setTab] = useState<Tab>(() => {
    const t = new URLSearchParams(window.location.search).get("tab");
    return TABS.some((x) => x.id === t) ? (t as Tab) : "today";
  });
  const [settings, setSettings] = useState(false);
  const [toast, setToast] = useState("");
  const flash = useCallback((m: string) => {
    setToast(m);
    setTimeout(() => setToast(""), 3000);
  }, []);
  const sync = useSync(store.data, store.apply, flash, store.ready);
  const plain = store.data.meta.settings.plain;

  return (
    <div className={"app" + (plain ? " plain" : "")}>
      <div className="topbar">
        <button className={"pill " + sync.state} onClick={() => setSettings(true)}>{PILL[sync.state]}</button>
        <button className="gear" onClick={() => setSettings(true)} aria-label="Settings">⚙</button>
      </div>
      <main>
        {tab === "today" && <TodayTab store={store} />}
        {tab === "plot" && <PlotTab store={store} plain={plain} />}
        {tab === "plants" && <PlantsTab store={store} />}
        {tab === "journal" && <JournalTab store={store} />}
      </main>
      <nav className="tabs">
        {TABS.map((t) => <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => setTab(t.id)}>{t.label}</button>)}
      </nav>
      {settings && <SettingsSheet store={store} sync={sync} onClose={() => setSettings(false)} />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
