import { useEffect, useMemo, useState } from "react";
import { MONTHS, pretty, today as todayStr } from "../dates.ts";
import { cToF, generateTasks, mmToIn, sowNow, weatherAlerts } from "../engine.ts";
import type { Forecast, Task } from "../engine.ts";
import { PROJECTS } from "../seed.ts";
import type { Store } from "../store.ts";
import { fetchForecast } from "../weather.ts";
import { Glyph, newPlant } from "../ui.tsx";

export function TodayTab({ store }: { store: Store }) {
  const { data } = store;
  const { lat, lon } = data.meta.settings;
  const [wx, setWx] = useState<Forecast | null>(null);
  const [wxState, setWxState] = useState<"loading" | "ok" | "none">("loading");
  const [openProj, setOpenProj] = useState("");
  const today = todayStr();
  const month = new Date().getMonth() + 1;

  useEffect(() => {
    let live = true;
    setWxState("loading");
    void fetchForecast(lat, lon).then((w) => {
      if (!live) return;
      setWx(w);
      setWxState(w ? "ok" : "none");
    });
    return () => { live = false; };
  }, [lat, lon]);

  const tasks = useMemo(() => generateTasks(data, wx, today, 7), [data, wx, today]);
  const alerts = useMemo(() => weatherAlerts(data, wx, today), [data, wx, today]);
  const groups = {
    overdue: tasks.filter((t) => !t.done && t.overdue),
    today: tasks.filter((t) => t.done || (!t.overdue && t.date <= today)),
    week: tasks.filter((t) => !t.done && t.date > today),
  };
  const sow = sowNow(data, month).slice(0, 8);

  const toggle = (t: Task) => {
    if (t.done) {
      store.setDone(t.id, t.title, "open", today);
      store.remove("logs", `log:${t.id}`);
    } else {
      store.setDone(t.id, t.title, "done", today);
      if (t.kind === "water") store.upsert("logs", { id: `log:${t.id}`, date: today, kind: "water", plantId: t.plantId, text: "Watered", qty: 0, unit: "", updated: 0 });
    }
  };

  const Row = ({ t }: { t: Task }) => (
    <div className={"task" + (t.done ? " done" : "")}>
      <button className="check" onClick={() => toggle(t)} aria-label={t.done ? "Undo" : "Mark done"}>{t.done ? "✓" : ""}</button>
      <div className="grow">
        <div>{t.title}</div>
        {(t.nudge || t.note) && <div className="muted small">{t.nudge || t.note}</div>}
      </div>
      <span className="muted small">{t.overdue ? "overdue" : t.monthly && !t.done ? "this month" : pretty(t.date)}</span>
    </div>
  );

  const nextSteps = Object.keys(PROJECTS).map((k) => ({ key: k, steps: data.steps.filter((s) => s.project === k).sort((a, b) => a.order - b.order) }));

  return (
    <div className="page">
      <h1 className="title">Today</h1>
      <p className="date">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
      <div className="card wx">
        {wxState === "loading" && <div className="muted">Loading the forecast…</div>}
        {wxState === "none" && <div className="muted">No forecast right now (offline?). Watering reminders still work.</div>}
        {wx && (
          <div className="outlook">
            {wx.days.map((d) => (
              <div key={d.date} className={"wxday" + (d.rainMm >= 2.5 ? " wet" : d.tMaxC >= 32 ? " hot" : "")}>
                <span className="small">{d.date === today ? "Today" : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][new Date(d.date + "T12:00").getDay()]}</span>
                <span className="wxicon" aria-hidden>{d.rainMm >= 2.5 ? "☂" : d.tMaxC >= 32 ? "☀" : d.rainProb >= 40 ? "☁" : "○"}</span>
                <b>{cToF(d.tMaxC)}°</b>
                <span className="muted small">{cToF(d.tMinC)}°</span>
                <span className="muted small">{d.rainMm >= 0.5 ? `${mmToIn(d.rainMm)}"` : ""}</span>
              </div>
            ))}
          </div>
        )}
      </div>
      {alerts.length > 0 && (
        <section>
          <h3>Weather alerts</h3>
          {alerts.map((a) => (
            <div key={a.id} className={"alert " + a.kind}>
              <b>{a.title}</b>
              <div className="small">{a.detail}</div>
            </div>
          ))}
        </section>
      )}

      {groups.overdue.length > 0 && <section><h3>Overdue</h3>{groups.overdue.map((t) => <Row key={t.id} t={t} />)}</section>}
      <section>
        <h3>Today</h3>
        {groups.today.length ? groups.today.map((t) => <Row key={t.id} t={t} />) : <p className="muted">Nothing due today. Plants you mark as planted get water, feed and harvest reminders.</p>}
      </section>
      {groups.week.length > 0 && <section><h3>This week</h3>{groups.week.map((t) => <Row key={t.id} t={t} />)}</section>}

      <section>
        <h3>Projects</h3>
        {nextSteps.map(({ key, steps }) => {
          const left = steps.filter((s) => !s.done);
          const shown = openProj === key ? steps : left.slice(0, 2);
          return (
            <div className="card" key={key}>
              <button className="proj-head" onClick={() => setOpenProj(openProj === key ? "" : key)}>
                <b>{PROJECTS[key]}</b>
                <span className="muted small">{steps.length - left.length} of {steps.length} done · {openProj === key ? "hide" : "all steps"}</span>
              </button>
              {shown.map((s) => (
                <div className={"task" + (s.done ? " done" : "")} key={s.id}>
                  <button className="check" onClick={() => store.upsert("steps", { ...s, done: !s.done, doneAt: s.done ? "" : today })}>{s.done ? "✓" : ""}</button>
                  <div className="grow">{s.title}{s.note && <div className="muted small">{s.note}</div>}</div>
                </div>
              ))}
              {left.length === 0 && <div className="muted small">All done.</div>}
            </div>
          );
        })}
      </section>

      <section>
        <h3>Good to sow or plant in {MONTHS[month - 1]}</h3>
        <p className="muted small">Typical coastal Southern California timing, still to be checked against the UC chart.</p>
        <div className="chips">
          {sow.map((c) => (
            <button key={c.key} className="chip" onClick={() => store.upsert("plants", newPlant(c))}>
              <Glyph kind={c.kind} size={16} /> {c.name}
            </button>
          ))}
        </div>
        <p className="muted small">Tap one to add it to the Plants list as planned.</p>
      </section>
    </div>
  );
}
