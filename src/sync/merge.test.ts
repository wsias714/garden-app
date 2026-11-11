import assert from "node:assert/strict";
import { test } from "node:test";
import { emptyData } from "../seed.ts";
import { mergeData, pruneTombstones, sameData, withTomb } from "./merge.ts";
import { ConflictError, backupDue, backupsToDelete, syncGarden } from "./remote.ts";
import type { Remote } from "./remote.ts";
import type { GardenData, Plant } from "./types.ts";

const plant = (id: string, name: string, updated: number): Plant => ({ id, name, cropKey: "", itemId: "", x: 0, y: 0, planted: "", status: "planned", notes: "", updated });
const base = (): GardenData => ({ ...emptyData(), items: [], steps: [] });
const withPlants = (...ps: Plant[]): GardenData => ({ ...base(), plants: ps });

test("union, later updated wins, commutative and idempotent", () => {
  const a = withPlants(plant("1", "old", 1), plant("2", "only-a", 5));
  const b = withPlants(plant("1", "new", 2), plant("3", "only-b", 5));
  const ab = mergeData(a, b);
  const ba = mergeData(b, a);
  assert.ok(sameData(ab, ba));
  assert.ok(sameData(mergeData(ab, ab), ab));
  assert.deepEqual(ab.plants.map((p) => p.name), ["new", "only-a", "only-b"]);
});

test("equal stamps tie-break identically both ways", () => {
  const a = withPlants(plant("1", "x", 3));
  const b = withPlants(plant("1", "y", 3));
  assert.ok(sameData(mergeData(a, b), mergeData(b, a)));
});

test("tombstone beats an older copy, later edit resurrects", () => {
  const a = { ...withPlants(), meta: withTomb(base().meta, "plants", "1", 10) };
  const old = withPlants(plant("1", "gone", 5));
  assert.equal(mergeData(a, old).plants.length, 0);
  assert.equal(mergeData(old, a).plants.length, 0);
  const edited = withPlants(plant("1", "back", 20));
  assert.equal(mergeData(a, edited).plants.length, 1);
});

test("settings: later settingsAt wins as a whole", () => {
  const a = base();
  const b = base();
  a.meta = { ...a.meta, settings: { ...a.meta.settings, plain: true }, settingsAt: 5 };
  b.meta = { ...b.meta, settingsAt: 9 };
  assert.equal(mergeData(a, b).meta.settings.plain, false);
  assert.equal(mergeData(b, a).meta.settings.plain, false);
});

test("two devices seeding the same starter data do not duplicate it", () => {
  const m = mergeData(emptyData(), emptyData());
  assert.equal(m.items.length, emptyData().items.length);
  assert.equal(m.steps.length, emptyData().steps.length);
});

test("old tombstones are pruned", () => {
  const d = { ...base(), meta: withTomb(withTomb(base().meta, "plants", "a", 1), "plants", "b", Date.now()) };
  assert.deepEqual(Object.keys(pruneTombstones(d, Date.now()).meta.tomb), ["plants:b"]);
});

function fakeRemote(): Remote & { files: Map<string, { text: string; rev: number }>; failNext: boolean } {
  const files = new Map<string, { text: string; rev: number }>();
  let rev = 0;
  const r = {
    files,
    failNext: false,
    async read(p: string) {
      const f = files.get(p);
      return f ? { text: f.text, rev: String(f.rev) } : null;
    },
    async write(p: string, text: string, expect: string | null) {
      const f = files.get(p);
      if (r.failNext && p === "/data.json") {
        r.failNext = false;
        files.set(p, { text: JSON.stringify(withPlants(plant("z", "sneaky", 50))), rev: ++rev });
        throw new ConflictError();
      }
      if ((expect === null && f) || (expect !== null && String(f?.rev) !== expect)) throw new ConflictError();
      files.set(p, { text, rev: ++rev });
      return { rev: String(rev) };
    },
    async list(dir: string) {
      return [...files].filter(([p]) => p.startsWith(dir + "/")).map(([path, f]) => ({ path, modified: "", size: f.text.length }));
    },
    async remove(p: string) {
      files.delete(p);
    },
  };
  return r;
}

test("sync pushes, then is a no-op, and merges a remote edit", async () => {
  const remote = fakeRemote();
  const r1 = await syncGarden(remote, withPlants(plant("1", "a", 1)));
  assert.equal(r1.pushed, true);
  assert.equal((await syncGarden(remote, r1.data)).pushed, false);
  const other = await syncGarden(remote, withPlants(plant("2", "b", 2)));
  assert.deepEqual(other.data.plants.map((p) => p.id), ["1", "2"]);
});

test("sync survives a write conflict without losing the other side", async () => {
  const remote = fakeRemote();
  await syncGarden(remote, withPlants(plant("1", "a", 1)));
  remote.failNext = true;
  const r = await syncGarden(remote, withPlants(plant("1", "a", 1), plant("2", "b", 2)));
  assert.deepEqual(r.data.plants.map((p) => p.id).sort(), ["1", "2", "z"]);
});

test("backups: weekly, keep eight", () => {
  const now = Date.parse("2026-11-10T00:00:00Z");
  assert.equal(backupDue([], now), true);
  assert.equal(backupDue(["/backups/auto-2026-11-08.json"], now), false);
  assert.equal(backupDue(["/backups/auto-2026-11-01.json"], now), true);
  const many = Array.from({ length: 10 }, (_, i) => `/backups/auto-2026-0${i + 1 > 9 ? 9 : i + 1}-0${i + 1}.json`);
  assert.equal(backupsToDelete(many).length, 2);
});
