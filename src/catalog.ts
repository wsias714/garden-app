/* Generic crop catalog. EVERY ROW IS AN ASSUMPTION (verified: false): typical coastal Southern
   California timing (Sunset zones 23-24) and seed-packet values, to be checked against the UC
   Master Gardener Southern California Vegetable Planting Schedule (UC ANR, 2026-04) and the
   Orange County chart. `opt`/`ok` are the months (1-12) to sow seed or, for perennials, to plant. */

export type CropKind = "veg" | "herb" | "fruit" | "berry" | "flower" | "perennial";
export interface Crop {
  key: string;
  name: string;
  kind: CropKind;
  opt: number[];
  ok: number[];
  days: [number, number] | null; // days to first harvest from planting; null for perennials
  water: number; // days between waterings in a mild month (spring/autumn)
  spacingIn: number;
  perennial: boolean;
  succession: number; // re-sow every N days while in season, 0 = no
  tip: string;
  climate: Climate;
  verified: false;
}

/** How a crop copes with Irvine's weather. ASSUMPTIONS from general extension guidance, to verify. */
export interface Climate {
  heat: "tender" | "ok" | "tough"; // tender: bolts, wilts or drops blossoms above about 85-90 F
  frostTender: boolean; // damaged near 32-35 F (rare in coastal Irvine, possible Dec-Feb)
  rainSensitive: boolean; // splits, rots or gets fungal disease after heavy rain or overhead water
  windTender: boolean; // seedlings, large leaves or shallow roots dry out in hot dry Santa Ana winds
  heatCare: string;
  rainCare: string;
  season: string; // Irvine seasonal pattern note
}

const R = (a: number, b: number) => {
  const out: number[] = [];
  for (let m = a; ; m = (m % 12) + 1) {
    out.push(m);
    if (m === b) break;
  }
  return out;
};

function c(key: string, name: string, kind: CropKind, opt: number[], ok: number[], days: [number, number] | null, water: number, spacingIn: number, tip: string, succession = 0): Crop {
  return { key, name, kind, opt, ok, days, water, spacingIn, perennial: days === null, succession, tip, climate: climateFor(key, kind), verified: false };
}

const COOL = ["lettuce", "spinach", "cilantro", "peas", "radish", "kale", "chard", "broccoli", "cabbage", "cauliflower", "carrots", "beets", "parsley"];
const WARM_TENDER = ["tomato", "pepper", "zucchini", "cucumber", "basil", "bushbean", "passionfruit"];
const TOUGH = ["rosemary", "thyme", "oregano", "sage", "lavender", "salvia", "yarrow", "artichoke", "grape", "persimmon", "olallieberry", "asparagus", "walkingonion", "garlicchive", "echinacea"];
const RAIN_SENSITIVE = ["tomato", "cucumber", "zucchini", "basil", "strawberry", "lettuce", "rosemary", "thyme", "lavender", "sage", "grape", "olallieberry"];

function climateFor(key: string, kind: CropKind): Climate {
  const cool = COOL.includes(key);
  const tough = TOUGH.includes(key) || kind === "flower";
  const heat: Climate["heat"] = cool ? "tender" : tough ? "tough" : "ok";
  const frostTender = WARM_TENDER.includes(key) || key === "lemon";
  const rainSensitive = RAIN_SENSITIVE.includes(key);
  const windTender = cool || ["cucumber", "zucchini", "basil", "strawberry", "lemon", "passionfruit"].includes(key);
  return {
    heat,
    frostTender,
    rainSensitive,
    windTender,
    heatCare: cool
      ? "Above about 85 F it bolts or turns bitter: water deeply early morning, add shade cloth on hot afternoons, keep mulched."
      : tough
        ? "Handles Irvine heat; in a heat wave give one deep soak rather than many sips."
        : WARM_TENDER.includes(key)
          ? "Above about 90 F blossoms drop: water deeply the evening before, mulch, light shade in the afternoon."
          : "Water deeply before a heat wave and keep the soil mulched.",
    rainCare: rainSensitive
      ? kind === "veg" && !WARM_TENDER.includes(key) || kind === "herb" || kind === "flower"
        ? "Soggy soil rots roots and leaves: skip watering, keep leaves dry, make sure the bed drains."
        : "Heavy rain splits fruit and spreads mildew: pick ripe fruit before the storm, skip watering, keep leaves dry."
      : "After 1/4 in or more of rain, skip the next watering and check the soil 2 in down.",
    season: cool
      ? "Cool-season: best sown Sep to Mar in Irvine; summer heat ends it."
      : WARM_TENDER.includes(key)
        ? "Warm-season: plant Mar to Jul once nights stay mild; May Gray and June Gloom slow it, Aug-Sep heat stresses it."
        : kind === "fruit" || kind === "berry"
          ? "Perennial: plant bare-root Dec to Feb; deep water through the dry summer and before Santa Ana winds (Sep to Jan)."
          : "Perennial: plant Oct to Mar so winter rain establishes roots; water less in winter, deeply in summer.",
  };
}

export const CATALOG: Crop[] = [
  c("lettuce", "Lettuce", "veg", R(9, 3), [4, 8], [45, 60], 3, 8, "Cut outer leaves. Re-sow every 3 weeks.", 21),
  c("kale", "Kale", "veg", R(9, 2), [3, 8], [55, 75], 4, 18, "Pick lower leaves; plant keeps going."),
  c("spinach", "Spinach", "veg", R(10, 2), [9, 3], [40, 55], 3, 6, "Bolts in warm weather; sow cool months only.", 21),
  c("chard", "Chard", "veg", [9, 10, 11, 2, 3, 4], [12, 1, 8], [50, 60], 4, 12, "Cut outer stalks."),
  c("peas", "Peas", "veg", R(10, 1), [9, 2], [60, 75], 3, 3, "Needs a trellis or netting."),
  c("carrots", "Carrots", "veg", R(9, 3), [8, 4], [70, 80], 3, 3, "Keep seed bed evenly damp until sprouted.", 28),
  c("radish", "Radish", "veg", R(10, 3), [9, 4], [25, 35], 2, 2, "Fast; re-sow every 2 weeks.", 14),
  c("beets", "Beets", "veg", R(9, 3), [4], [55, 70], 4, 4, "Thin seedlings; eat the greens too."),
  c("broccoli", "Broccoli", "veg", R(9, 12), [1, 2, 8], [70, 100], 4, 18, "Side shoots keep coming after the main head."),
  c("cabbage", "Cabbage", "veg", R(9, 12), [1, 2, 8], [80, 100], 4, 18, "Watch for cabbage worms."),
  c("cauliflower", "Cauliflower", "veg", R(9, 11), [12, 8], [70, 100], 4, 18, "Tie leaves over the head to keep it white."),
  c("cilantro", "Cilantro", "herb", R(10, 3), [9], [45, 60], 3, 4, "Bolts fast in warm weather; re-sow.", 21),
  c("parsley", "Parsley", "herb", [9, 10, 11, 2, 3], [12, 1, 4], [70, 90], 4, 8, "Slow to germinate."),
  c("bushbean", "Bush beans", "veg", R(3, 8), [9], [50, 65], 3, 4, "Pick often to keep them producing.", 21),
  c("tomato", "Tomato", "veg", [3, 4, 5], [2, 6, 7], [70, 90], 3, 24, "Warm-season. Stake or cage at planting."),
  c("pepper", "Peppers", "veg", [4, 5], [3, 6], [70, 90], 4, 18, "Warm-season. Wait until nights stay mild."),
  c("zucchini", "Zucchini", "veg", R(4, 7), [3, 8], [45, 60], 3, 30, "Needs room; pick small."),
  c("cucumber", "Cucumber", "veg", R(4, 7), [3, 8], [55, 70], 2, 12, "Trellis to save space."),
  c("basil", "Basil", "herb", R(4, 8), [3, 9], [60, 75], 3, 10, "Pinch flower buds."),
  c("lemon", "Lemon tree", "fruit", [2, 3, 4, 9, 10], [1, 5, 11], null, 10, 120, "Deep water every 1-2 weeks; feed in spring and late summer."),
  c("apple", "Apple (low-chill)", "fruit", R(12, 2), [], null, 14, 96, "Bare-root in winter; prune while dormant."),
  c("persimmon", "Persimmon (Fuyu)", "fruit", R(12, 2), [], null, 14, 120, "Bare-root in winter; fruit in fall."),
  c("grape", "Grapes", "fruit", R(12, 2), [], null, 14, 72, "Bare-root in winter; needs a trellis; prune hard in winter."),
  c("passionfruit", "Passionfruit", "fruit", [4, 5, 9], [3, 10], null, 7, 72, "Evergreen vine on a trellis; protect from hard frost."),
  c("olallieberry", "Olallieberry / boysenberry", "berry", R(12, 2), [], null, 7, 60, "Bare-root in winter; trellis; cut fruited canes after harvest."),
  c("strawberry", "Alpine strawberry", "berry", R(10, 3), [], null, 4, 10, "Edible groundcover; runs less than regular strawberries."),
  c("asparagus", "Asparagus", "perennial", [12, 1, 2], [], null, 7, 12, "Crowns in winter. Do not harvest for 2 years; productive 15+."),
  c("artichoke", "Artichoke", "perennial", R(9, 1), [2], null, 7, 36, "Big plant; cut buds before they open."),
  c("walkingonion", "Walking onions", "perennial", R(10, 3), [], null, 5, 8, "Spreads: keep to one spot."),
  c("garlicchive", "Garlic chives", "herb", R(10, 3), [], null, 5, 8, "Self-seeds; deadhead."),
  c("sorrel", "Sorrel", "perennial", R(10, 3), [], null, 5, 12, "Spreads; keep to one spot."),
  c("rosemary", "Rosemary", "herb", R(10, 3), [], null, 14, 30, "Likes dry feet."),
  c("thyme", "Thyme", "herb", R(10, 3), [], null, 10, 12, "Low and tough."),
  c("oregano", "Oregano", "herb", R(10, 3), [], null, 10, 14, "Spreads; cut back after flowering."),
  c("sage", "Sage", "herb", R(10, 3), [], null, 12, 20, "Prune lightly after flowering."),
  c("lavender", "Lavender", "flower", R(10, 3), [], null, 14, 30, "Needs sun and drainage; trim after bloom."),
  c("salvia", "Salvia", "flower", R(10, 3), [], null, 10, 24, "Hummingbird magnet."),
  c("yarrow", "Yarrow", "flower", R(10, 3), [], null, 10, 18, "Tough; divide every few years."),
  c("echinacea", "Echinacea", "flower", R(10, 3), [], null, 7, 18, "Leave seed heads for birds."),
];

export const cropByKey = (k: string) => CATALOG.find((x) => x.key === k);

/** Water-interval factor for the month: longer in winter, shorter in summer. */
export function seasonFactor(month: number): number {
  if ([12, 1, 2].includes(month)) return 2;
  if ([3, 11].includes(month)) return 1.5;
  if ([6, 7, 8, 9].includes(month)) return 0.75;
  return 1;
}
