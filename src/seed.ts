import type { GardenData, MapItem, Step } from "./sync/types.ts";
import { DEFAULT_LAT, DEFAULT_LON } from "./config.ts";

/* Starter content. Fixed ids and updated: 0, so two devices that both seed produce the same
   records and any real edit wins the merge. The map layout is a GUESS for the user to redraw. */

const item = (id: string, kind: MapItem["kind"], label: string, x: number, y: number, w: number, h: number): MapItem => ({ id, kind, label, x, y, w, h, updated: 0 });

export const SEED_ITEMS: MapItem[] = [
  item("seed-bed1", "bed", "Left bed", 6, 32, 24, 70),
  item("seed-bed2", "bed", "Right bed", 90, 32, 24, 70),
  item("seed-bed3", "bed", "Middle back", 42, 32, 36, 22),
  item("seed-bed4", "bed", "Middle front", 42, 80, 36, 22),
  item("seed-lemon", "tree", "Lemon", 28, 2, 26, 26),
  item("seed-tree2", "tree", "Tree? (confirm)", 66, 2, 22, 22),
];

let n = 0;
const step = (project: string, id: string, title: string, note = ""): Step => ({ id, project, title, note, done: false, doneAt: "", order: n++, updated: 0 });

export const SEED_STEPS: Step[] = [
  step("mint", "mint-1", "Choose a method: dig, or spot-treat", "The garden allows herbicide, but every product must sit closed inside a second sealed container, or be carried in and out each visit. Invasive plants must be controlled within a week of a notice."),
  step("mint", "mint-2", "Map where the mint is", "Mark mint zones on the Plot tab."),
  step("mint", "mint-3", "Pull and dig out the mint, zone by zone", "Follow runners and lift roots. Do not rototill: it cuts roots into more plants."),
  step("mint", "mint-4", "Bag the roots for the green bin or trash", "Not the compost. Chop and bag them; trash cans must be lidded and under 35 gal, and bags not left in the plot."),
  step("mint", "mint-5", "Re-check for regrowth", "The Today list adds a check every 2 weeks for 8 weeks once the pull step is ticked."),
  step("mint", "mint-6", "Optional: cover cleared soil with cardboard and mulch"),
  step("drip", "drip-1", "Draw the drip line on the Plot tab", "Source, filter, regulator, timer, main, branches."),
  step("drip", "drip-2", "Inspect every length", "Cracks, chewed or pulled fittings, missing end caps, clogged emitters. Note what to buy."),
  step("drip", "drip-3", "Flush the main, clean the filter, check the regulator"),
  step("drip", "drip-4", "Set the timer and record each zone's run time", "Winter needs far less than summer. Garden rules: automatic watering must be reachable by other gardeners if it fails, never flood a neighbour, and never leave a hose running while away."),
  step("drip", "drip-5", "Test-run and walk the line for leaks and dry spots"),
  step("replant", "replant-1", "Pick the top 5 or 6 plants to grow first"),
  step("replant", "replant-2", "Check the existing trees (variety, owner, height)", "Trees must be kept under the height limit (written rule 6 ft; Gary said up to 10 ft in person, so confirm in writing)."),
  step("replant", "replant-3", "Fit the plan to the garden rules", "Fruit trees: dwarf only, in a container or root barrier, pruned to the height limit each year (written rule 6 ft, 8 ft while fruiting; Gary verbally OK with up to 10 ft), no shade on neighbours. Trellises and arbors: 6 ft max, inside the plot, natural material, earth tone not white. Entry arch 7 ft max. Nothing spreads into other plots."),
  step("replant", "replant-4", "Bare-root fruit and berries, if allowed (December to February)"),
  step("replant", "replant-5", "Perennial herbs and vegetables in the beds"),
  step("replant", "replant-6", "Cool-season crops now: lettuce, kale, peas, radish"),
  step("replant", "replant-7", "Make the shopping list"),
];

export const PROJECTS: Record<string, string> = { mint: "Clear the mint", drip: "Set up the drip", replant: "Replant" };

export function emptyData(): GardenData {
  return {
    items: SEED_ITEMS,
    plants: [],
    steps: SEED_STEPS,
    logs: [],
    done: [],
    meta: { settings: { plain: false, lat: DEFAULT_LAT, lon: DEFAULT_LON }, settingsAt: 0, tomb: {} },
  };
}
