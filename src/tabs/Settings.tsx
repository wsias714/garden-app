import { useState } from "react";
import { APP_VERSION } from "../config.ts";
import { disconnect, finishAuthWithCode, getAppKey, isConnected, setAppKey, startAuth } from "../sync/dropbox.ts";
import type { Sync } from "../sync/useSync.ts";
import { openFeedback } from "../feedback.ts";
import type { Store } from "../store.ts";
import { SEED_ITEMS } from "../seed.ts";
import { withTomb } from "../sync/merge.ts";
import { Sheet } from "../ui.tsx";

export function SettingsSheet({ store, sync, onClose }: { store: Store; sync: Sync; onClose: () => void }) {
  const s = store.data.meta.settings;
  const [key, setKey] = useState(getAppKey());
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState("");

  const connect = async (manual: boolean) => {
    try {
      setAppKey(key);
      const url = await startAuth(manual);
      if (manual) window.open(url, "_blank");
      else window.location.href = url;
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };
  const finish = async () => {
    try {
      await finishAuthWithCode(code);
      setCode("");
      sync.refreshConnection();
      setMsg("Connected.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e));
    }
  };
  const exportJson = () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(store.data, null, 1)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `garden-journal-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };
  const round = (v: string) => Math.round(parseFloat(v) * 100) / 100;

  return (
    <Sheet title="Settings" onClose={onClose}>
      <h3>Dropbox sync</h3>
      {isConnected() ? (
        <>
          <p className="muted">Connected. {sync.lastSync ? `Last sync ${new Date(sync.lastSync).toLocaleTimeString()}.` : ""} {sync.dataBytes ? `Data file ${(sync.dataBytes / 1000).toFixed(1)} KB of 1000 KB.` : ""}</p>
          {sync.warning && <p className="muted">{sync.warning}</p>}
          {sync.error && <p className="err">{sync.error}</p>}
          <div className="btnrow">
            <button className="btn" onClick={sync.syncNow}>Sync now</button>
            <button className="btn danger" onClick={() => { disconnect(); sync.refreshConnection(); }}>Disconnect</button>
          </div>
        </>
      ) : (
        <>
          <p className="muted">Data stays on this phone until you connect Dropbox. Sync keeps it safe and shared between phones. It needs the Garden Journal Dropbox app key (not registered yet).</p>
          <label className="lbl">Dropbox app key<input className="field" value={key} onChange={(e) => setKey(e.target.value)} autoCapitalize="none" /></label>
          <div className="btnrow">
            <button className="btn primary" disabled={!key.trim()} onClick={() => void connect(false)}>Connect</button>
            <button className="btn" disabled={!key.trim()} onClick={() => void connect(true)}>Get a code</button>
          </div>
          <div className="btnrow">
            <input className="field" placeholder="Paste the code" value={code} onChange={(e) => setCode(e.target.value)} />
            <button className="btn" disabled={!code.trim()} onClick={() => void finish()}>Finish</button>
          </div>
        </>
      )}
      {msg && <p className="muted">{msg}</p>}

      <h3>Look</h3>
      <label className="check-row"><input type="checkbox" checked={s.plain} onChange={(e) => store.setSettings({ plain: e.target.checked })} /> Plain mode (no paper texture or pencil wobble, easier in bright sun)</label>

      <h3>Weather location</h3>
      <p className="muted small">City-level coordinates, rounded to 2 decimals. Used only for the rain forecast.</p>
      <div className="btnrow">
        <input className="field" inputMode="decimal" value={s.lat} onChange={(e) => { const v = round(e.target.value); if (!Number.isNaN(v)) store.setSettings({ lat: v }); }} />
        <input className="field" inputMode="decimal" value={s.lon} onChange={(e) => { const v = round(e.target.value); if (!Number.isNaN(v)) store.setSettings({ lon: v }); }} />
      </div>

      <h3>Map</h3>
      <button className="btn" onClick={() => { if (window.confirm("Replace the map's beds and trees with the starter layout? Plants stay.")) {
        const now = Date.now();
        store.apply((cur) => {
          let meta = cur.meta;
          for (const it of cur.items) if (!SEED_ITEMS.some((x) => x.id === it.id)) meta = withTomb(meta, "items", it.id, now);
          return { ...cur, items: SEED_ITEMS.map((x) => ({ ...x, updated: now })), meta };
        });
      } }}>Reset map to starter layout</button>

      <h3>Help</h3>
      <div className="btnrow">
        <button className="btn" onClick={() => { onClose(); openFeedback(); }}>Send feedback</button>
        <button className="btn" onClick={exportJson}>Export my data</button>
      </div>
      <p className="muted small">Garden Journal {APP_VERSION}</p>
    </Sheet>
  );
}
