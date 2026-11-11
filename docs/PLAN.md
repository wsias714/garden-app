# Garden Journal: plan and design (for the owner's approval)

Status: v0.1 built 2026-11-10 for the owner's review (see README). Public repo with GitHub Pages.
Working name: **Garden Journal** (rename freely).

## 1. What it is

A phone PWA for the family's ~10x10 ft plot (Irvine, CA). It answers three questions: *where is everything planted*, *what needs doing today and this week*, and *what did we learn this season*.

Built like workout-app: React + Vite, TypeScript sync layer, localStorage/IndexedDB cache, Dropbox sync, no backend. Chosen over Berry's single-file style because the map editor is real UI state. Conventions followed: `~/Projects/APPS.md` (items 2, 4, 8, 9, 10), skill `mobile-dropbox-sync`.

## 2. Scope

**v1 (the useful garden):**
- Plot map: 10x10 grid, draw beds / paths / obstacles / water spot / compass, place plants by tap, drag to move, 6-inch snap.
- Plant records: species, variety, planted date, seed or transplant, location (from the map), expected harvest window, status, notes, photos.
- Catalog of ~40 common Irvine crops plus a starter set of perennials and climbers (grapes, berries, citrus and other dwarf fruit trees, asparagus, artichoke, perennial herbs) with spacing, sun, water need, days to maturity, sowing months, care rules.
- **Projects** (one-time checklists with ordered steps and a progress bar; first two are in section 3a).
- Schedule engine (section 6) and a **Today / This week** screen with done, skip, snooze.
- "What to sow this month" list, driven by the UC Southern California chart.
- Care log (water, fertilize, prune, weed, pests) and harvest log (date, quantity, unit).
- Photo log per plant (stored as files in Dropbox, not in `data.json`).
- Rain-aware watering nudge (section 7).
- Settings sheet on every screen: Dropbox connect / sync now / disconnect, Send feedback, Data (export, backup, restore, size meter), per APPS.md items 9 and 10.
- Season log: one season = one year-half or the owner's choice; a plain-language "what worked" note at season end.

**Later (v2+):**
- Season history view: this year's map vs last year's (time scrub exists in v1; comparison view later), yield charts, rotation hints (do not repeat the same family in the same bed).
- Companion / avoid warnings on the map; shade-cast preview by month.
- Bench briefing hook and weekly Saturday garden digest (section 8).
- Soil-temperature-aware sowing, CIMIS ET-based watering amounts.
- Pest/disease identifier notes, a seed-inventory list, shopping list, cost tracking.
- AI "ask the garden coach" like workout-app's weekly Coach (Friday run writes `coach.json`); same pattern, cost about $0.05 a week.

## 3. Screens (bottom tabs, gear + sync pill fixed top-right on every screen)

| Tab | What it shows |
|---|---|
| **Today** | Overdue, today, this week (grouped, one tap to done). Weather strip with the rain nudge. "Sow now" card. |
| **Plot** | The map. Tools: select/move, add plant, add bed, add path, add obstacle, erase. Date scrubber to see the plot as it was or will be. Tap a plant: bottom sheet with its card. |
| **Plants** | List by bed/status; plant detail: facts, schedule, log, photos, harvests, notes. "Add plant" from catalog. |
| **Journal** | Chronological log (care, harvest, photos, notes), season summary, harvest totals per crop. |
| **Sow** | Month-by-month planting calendar for the catalog (optimal / acceptable), tap a crop to plan it onto the map. (May fold into Plants if the tab bar gets crowded.) |

Settings sheet is not a tab; it opens from the gear on every screen.

## 3a. First projects (the plot is not blank: start with reclaiming it)

Projects are ordered one-time checklists that live next to the recurring schedule on the Today screen. Two ship pre-loaded for this plot. **The steps below are general gardening practice and ASSUMPTIONS to check against the garden's rules and a UC source before the app presents them as advice.**

**1. Clear the mint (first major task).** Mint spreads by underground runners; leftover pieces regrow.
1. Photo and map the infestation on the plot (which beds, which edges). Mark it as "mint zone" polygons.
2. Check the garden rules on herbicide before choosing a method.
3. Pull and dig it out zone by zone, following runners and lifting as much root as possible. Do not rototill (it cuts roots into more plants).
4. Bag the roots for the green bin or trash. Do not compost them in a home pile.
5. Re-check every 1-2 weeks for regrowth and pull new shoots early; the schedule engine adds a repeating "check mint zone" task for about 8 weeks, then monthly.
6. Optional: cover cleared patches with cardboard and mulch to suppress what is left.
7. If mint is wanted later, only in a pot.

**2. Set up the drip system.** The plot's drip is intact but not set up.
1. Draw the line on the map (source, filter, regulator, timer, main, branches, emitters): the map gets a "drip" layer.
2. Inspect every length for cracks, chewed or pulled fittings, missing end caps and clogged emitters; note what needs buying.
3. Flush the main, clean the filter, check the pressure regulator (low-pressure drip commonly runs around 20-30 psi; verify the parts' own ratings).
4. Set a timer; record each zone's run time and days. Start from the engine's seasonal baseline for November, then adjust (winter needs far less than summer).
5. Test-run and walk the line looking for leaks and dry spots; log the result.
6. Add a monthly "check drip" task and a seasonal "adjust timer" task (Mar, Jun, Sep, Nov). The rain nudge (section 7) can suggest pausing the timer, but a drip timer is not controlled from the app; it shows a reminder only.

**3. Replant** (after the mint is cleared and the drip is set up): the family's wish-list becomes ordered steps: confirm the existing trees, choose the top 5-6 plants, check club limits on trees and structures, then plant by season (bare-root fruit and berries in winter, perennial herbs and veg, cool-season crops from the "Sow now" list now) and place them on beds 1-3.

## 4. Data model (`Apps/GardenJournal/data.json`, minified, target under 1 MB)

All ids are device-generated (timestamp + random). Every editable record has `updated`; deletes write a tombstone (`withTomb`), same rules as `workout-app/docs/sync.md`.

```ts
Plot      { id, name, widthFt, heightFt, northDeg, grid:0.5, zones:[{id, polygon, sun:'full'|'part'|'shade', sunHours?}], updated }
Feature   { id, plotId, kind:'bed'|'path'|'obstacle'|'water'|'structure'|'label', shape:'rect'|'poly', pts:[x,y]..., raisedInches?, label?, updated }
Species   { id, name, family, kind, spacingIn, heightIn, sun, water:'low'|'med'|'high', daysToMaturity:[min,max],
            sow:{ [month1..12]: 'optimal'|'ok' }, method:'seed'|'transplant'|'both', succession?:{everyDays}, rules:[Rule], icon, source, verified }
            // bundled catalog in the app; a user edit stores an override { speciesId, fields, updated } in data.json
Planting  { id, speciesId, variety, plotId, x, y, footprintIn, method, plantedAt, status:'planned'|'planted'|'growing'|'harvesting'|'done'|'failed',
            endedAt?, notes, seasonId, updated }
LogEntry  { id, plantingId?, kind:'water'|'fertilize'|'prune'|'weed'|'pest'|'harvest'|'note'|'sow'|'other', at, qty?, unit?, note?, updated }
TaskState { key:'ruleId:plantingId:dueDate', state:'done'|'skipped'|'snoozed', until?, at, updated }   // only completions are stored, never the whole schedule
Photo     { id, plantingId?, at, path:'/photos/<id>.jpg', thumb:'/photos/<id>_t.jpg', note?, updated }  // refs only, bytes live in Dropbox files
Season    { id, name, startsOn, endsOn, summary?, updated }
Settings  { latRounded, lonRounded, units, notifyPrefs, settingsAt }   // coordinates rounded to 2 decimals (about 1 km): enough for weather, not a home address
Tombstones{ [id]: deletedAt }  // expire at 180 days
```

Rules this honors (from APPS.md / CLAUDE.md of workout-app): no media or base64 in `data.json`; no child names or addresses anywhere in the public code; real phone backups only in git-ignored `.local/`; hot/cold split with `archive/<year>.json` for finished seasons, rolled up first (harvest totals per crop and bed stay hot).

Dropbox folder layout: `data.json`, `backups/`, `photos/`, `archive/`, `feedback/`.

**Photo budget (decided by the owner 2026-11-08: keep photos modest).** Photos are optional and few. Resize on the phone to 1024 px JPEG (about 100 KB) plus a 256 px thumbnail (about 10 KB), so `photos/` holds about 400 photos under a proposed 50 MB cap, shown separately on the size meter with a warning at 70 percent; old-season photos can move to a Dropbox subfolder. The big "initial review" photo set of the plot (condition, mint, trees, drip layout) stays out of the app: the owner keeps those in his own phone/Dropbox, and the app only holds the few he chooses to attach. Camera capture is a plain `<input type=file accept="image/*" capture>`; offline photos queue in IndexedDB and upload on the next sync.

## 5. The plot map (interaction)

- SVG, 10 ft = 20 cells at 6 in. On a 360 px phone that is about 34 px/ft: a 12-inch plant is a 34 px circle, a comfortable touch target. Pinch-zoom and two-finger pan for tight spots.
- **Tap** a plant to open its sheet. **Drag** to move (snaps to 6 in; a dashed ghost shows the footprint and turns red on overlap or on a spacing conflict). **Long-press empty ground** with a tool armed to place. Bed corners get drag handles. Undo/redo, 20 steps.
- Spacing: each plant has a footprint circle from the catalog (`spacingIn`); overlap is a soft warning, not a block.
- Sun: zones are painted full/part/shade; a plant whose `sun` need exceeds its zone shows a small sun-warning doodle. The compass setting lets tall plants (tomatoes, corn, sunflowers) warn when planted on the south side of shorter ones.
- **Date scrubber**: plants render at their size for the chosen date (seedling to full), so you can plan next month's sowing around what will be big by then.
- Everything is a plain record, so the map and the Plants list are two views of the same data.

## 6. Schedule engine

A pure, deterministic function, unit-tested the way `merge.ts` is:

`generateTasks(state, catalog, weather, today, horizonDays) -> Task[]`

Nothing is stored except `TaskState` completions, so sync stays tiny and two phones never produce conflicting copies of the schedule. Rule kinds:

1. **Interval** (water, weed, check for pests): every N days, N chosen from the species water need x season factor x growth stage (seedlings more often, established less). Winter factor lengthens N; hot weeks shorten it. Resets from the last logged water.
2. **Anchored to planting** (thin at +14 d, first fertilize at +21 d then every 28 d, stake/trellis at +14 d, pinch/prune by crop, expected harvest window = `plantedAt + daysToMaturity[min..max]`, then pick-every-N-days while status is `harvesting`).
3. **Seasonal sowing windows**: for each month, the catalog says optimal / acceptable. "Sow now" lists crops optimal this month that are not already planted; **succession** crops (lettuce, radish, carrots, bush beans) re-offer every `succession.everyDays` while the month stays optimal.
4. **Calendar rules** (monthly compost top-up, mulch before summer, clean and prep in Aug and Jan) and **community-garden club dates** (annual plot renewal window, annual meeting, spring and fall cleanup-bin dates, soil-amendment deliveries). Club dates and rules are entered by the user and live only in their Dropbox data; the code carries no club or location specifics.
5. **Event rules** (heat and rain from the weather feed, section 7).
6. **Multi-year rules** for perennials and trees: bare-root planting window (winter), dormant pruning, annual feeding, trellis/training tasks, first-harvest delay (for example asparagus 2-3 years), and a yearly review; a planting spans seasons instead of ending at harvest.

**Learning loop** (the "next year improves" goal): when a planting has a real `plantedAt` and first harvest, the app records the actual days-to-first-harvest. After 1+ season, the catalog default for that crop in this plot is replaced by the observed value (shown as "your plot: 62 d, catalog: 70 d").

### Sources for Irvine timing

| Use | Source | Status |
|---|---|---|
| Sowing months for ~44 vegetables, Southern California Zones 23-24, optimal / acceptable / not recommended | UC Master Gardener Program (Ventura County), *Southern California Vegetable Planting Schedule*, UC ANR PDF dated 2026-04: https://ucanr.edu/sites/default/files/2026-04/SoCal%20Vegetable%20Planting%20Schedule%202026.04.pdf (credits "Digital Gardener") | **Cited.** I read the chart image; it is the seed-sowing table for the catalog's `sow` field. It covers Ventura County's coastal climate; Irvine is similar (marine-influenced, Sunset Zone 24) but not identical. Caveat in the PDF's source guides: older tables reflect 1950s-70s practice and temperatures are warmer now. |
| Transplants | Same PDF: "adjust for the age of the plant (about 1-2 months)" | **Cited.** Engine shifts the window earlier by `transplantAgeWeeks`. |
| Frost | Urban Farmer Irvine calendar: last frost about Feb 1, first about Dec 10: https://www.ufseeds.com/pages/irvine-vegetable-planting-calendar | **ASSUMPTION** (commercial site citing UC and USDA 2023 zone map). Frost is rare and light in coastal Irvine; used only to hold back peppers/tomatoes/basil before March and to warn on cold nights. |
| USDA zone | the owner: "about 10" (Irvine is around 10b) | the owner's statement; matches the 2023 USDA map per Urban Farmer. |
| Days to maturity, spacing, water need per crop | Seed-packet / extension typical values | **ASSUMPTION** for every catalog row until verified; each row carries `source` and `verified:false`. Verification pass in build phase 2 against UC ANR pages. |
| Care intervals (fertilize every 4 weeks, water every N days) | General extension guidance | **ASSUMPTION**, tunable per crop and per plot; the app asks "was this right?" to nudge intervals. |
| OC-specific monthly chart | UC Master Gardeners of Orange County planting chart (ucanr.edu, OC MG page; hotline ucceocmghotline@ucanr.edu) | **Not retrieved.** The search only surfaced pages pointing at it. Build phase 2: fetch it by hand and compare with the Ventura chart; if it differs, it wins. |

Current-season note (today is 2026-11-08): per the UC chart, November is optimal for beets, broccoli, cabbage, carrots, cauliflower, kale, lettuce, peas, radish, spinach, chard, and others, and not recommended for tomatoes, peppers, and corn. So the first plan for the new plot is a cool-season one.

## 7. Weather-aware watering nudge

- Source: **Open-Meteo** forecast API (no key, free for non-commercial use, per their site; daily `precipitation_sum`, `temperature_2m_max`, `timezone=auto`). Called straight from the phone with the rounded coordinates; no backend, no key. ASSUMPTION to verify during build: browser CORS and the exact free-tier limit (one third-party page claims about 10,000 requests/day; confirm on open-meteo.com/en/docs). Cached for 3 hours; the app works with no weather.
- Rules (thresholds are ASSUMPTIONS to tune): rain of 0.1 in (2.5 mm) or more in the next 24 h, or 0.25 in in the last 48 h -> water task becomes "Skip, it rained or will: check soil 2 in down" (still shown, one tap to override). Max temp 90 F or more -> water interval shortens by one step and a "mulch / shade cloth" tip appears. Santa Ana wind / dry-wind days (low humidity and gusts, fetched with `relative_humidity_2m` and `wind_gusts_10m`) -> check seedlings.
- Always a nudge, never an auto-skip; the person has the final say, and the log records the decision for learning.
- Later: CIMIS Irvine-area ET0 for volume ("about 1 gallon per sq ft this week").

## 8. Reminders (honest options; no backend)

iOS web push needs an installed PWA plus a push server, which this stack does not have. So:
- **v1:** Today screen with an app-icon badge where supported, plus a "this week" list you check. Cheap and reliable.
- **v1.5 (recommended):** a Bench hook (APPS.md item 7): a small desktop timer reads `data.json` through the rclone Dropbox mount, runs the same engine in Node, writes `~/.local/state/garden/today.json`; Bench puts "Garden: water beds, sow lettuce" in the 06:00 email. Read-only on the data, so it never fights the phone for the single-writer rule. Needs a `garden-<job>.timer` per APPS.md item 3 and a registry entry in `automations.json`.
- **Later:** calendar events for big milestones (harvest windows) only if the owner wants them; web push only if a free relay turns out worth the complexity.

## 9. Design: refined Field Journal (chosen by the owner 2026-11-08)

the owner picked A and asked for it **feminine and refined, not a kid's or dinosaur field journal.** B (Seed Packet: bold flat colour blocks, thick outlines, slab type) and C (Doodle Notebook: marker and crayon on lined paper, bright and playful) are dropped.

Interactive mock: `docs/design-mock.html` (open in a browser). The same plot drawn in the chosen style; tap a bed or plant, drag to move.

- **Feel:** a botanical sketchbook / heirloom garden diary. Warm ivory paper with a barely-there dot texture (no graph-paper grid, no tape, no stickers). Fine pencil and ink linework, thin and slightly imperfect, with a very light SVG displacement so edges look pencilled, not cartoonish.
- **Palette:** ivory `#fbf7f0`, warm charcoal ink `#4a4041`, blush bed fill `#f1e4da`, dusty rose accent `#b5707a`, sage `#8fa98a`, mint green (for the mint-clearing zone) `#6fa57a`, soft slate blue for drip lines `#7f9db0`. Muted watercolour washes, nothing saturated.
- **Type:** Cormorant Garamond (italic for titles and plant names), one fine script face for the app title only, Nunito for small text and numbers so it stays readable in sun. Self-hosted (OFL), no CDN.
- **Icons:** single-weight botanical line drawings (leaf, vine, root, herb, tree, flower, bulb), about 12 archetypes tinted per crop; a proper per-crop line drawing later for favourites (lemon, tomato, herbs).
- **Map:** beds as softly rounded blush rectangles with a fine rose outline; paths ivory; drip lines slate-blue dashes; plants as line icons inside a faint footprint circle (dashed while only planned); trees larger; a small italic N compass. Today's view and the Plants list use the same ink-and-ivory cards with hairline borders.
- **Rules kept:** 44 px touch targets, high contrast for text, a Plain mode toggle in Settings (no texture or displacement) for bright sun. Dark mode is out of scope for v1.

## 10. Conventions checklist (for the build, in order)

1. Repo `~/Projects/garden-app`. **Public GitHub repo** `wsias714/garden-app` with GitHub Pages, like the other apps (the code holds no family data and no secret). Public repo contains code and the generic crop catalog only: no neighborhood, plot number, photos, coordinates, names or real data (those live in the user's Dropbox).
2. Dropbox app registration (the owner, in the console): app folder `Garden Journal`, scopes files.metadata read+write and files.content read+write, redirect URIs: the Pages URL, `http://localhost:5173/`, `http://localhost:4173/`. Lift `src/sync/{dropbox,remote,useSync,archive}.ts` from workout-app; rewrite `merge.ts` for this schema, with tests (commutative, idempotent, tombstone-wins).
3. Feedback button: vendor `_shared/feedback/feedback.js`, add `src/feedback.ts` (same `upload` as workout-app), and add the app row to `ai-housekeeping/config/feedback-apps.json`. Not done until a test tap lands in the ledger.
4. Settings reachable from every tab (gear + sync pill, top-right); open every tab before calling it done.
5. `npm run check` (test + typecheck + build) before every commit; `.gitignore` covers `node_modules dist .local .claude .idea`.
6. Register: `bench/config/projects.json`, `bench/projects/garden-app.md`, and an `apps.md` section (done at planning time; see Bench). `./cos book` is Chief of Staff's job.
7. No child names, no home address in code, repo, synced data, screenshots, or the catalog. Who-does-what, if wanted, is stored as free-text labels in the Dropbox data only.

## 11. Build phases (relative size)

| # | Phase | Size |
|---|---|---|
| 0 | Scaffold, sync, Settings, Feedback, deploy to a branch | M |
| 1 | Plot map editor (SVG, beds/paths/plants, drag, undo, zoom) | L |
| 2 | Catalog + Plants list/detail; verify catalog against UC sources | M |
| 3 | Schedule engine + Today / This week + Sow tab | L |
| 4 | Care log, harvest log, photos, Journal | M |
| 5 | Weather nudge | S |
| 6 | Polish, theme, icons, season rollover, v1.5 Bench hook | M |

## 12. Questions for the owner

**Known so far (the owner, 2026-11-08):** the plot has three planter beds line the middle. A lemon tree stands at the back, plus 1 or 2 other trees to confirm. A drip system is intact and needs proper set-up. A large mint infestation is the first job. Design: refined Field Journal. Photos: modest. Repo: public.

**Still open (answer what you can; the app starts with guesses and you correct them on the map):**
1. Plot shape and orientation: a clean 10x10? Which edge is north? Do the three beds run lengthwise down the middle? Roughly how big is each (feet), and how deep are they (raised height)?
2. The trees: lemon variety (Eureka or Meyer?), and what are the 1-2 others (citrus? avocado? something shared?). Any tree roots or shade over the beds?
3. Sun: hours of direct sun per bed, and which end is shadiest (the lemon will shade the back).
4. Soil in the beds: what is in them now (mint roots, amended soil, tested)?
5. Drip: where does the line enter (spigot, filter, regulator, timer?) and how does it run (a main with branches to each bed)? Are the emitters, tubing and fittings in good shape, and do you know who controls the water schedule (the garden or us)?
6. Mint: where is it (inside the beds, between them, along the edges)? How much of the plot, roughly (a quarter, half)? Do garden rules allow herbicide, or must it be by hand/tarp?
7. Community-garden rules: allowed heights, trees, pesticides, compost, watering days or hours, and any "keep your plot weeded" deadlines. A manager or group chat worth linking?
8. What do you want to grow first? Must-haves (tomatoes, herbs in pots, strawberries, cut flowers)? Anything the boys want?
9. Who tends it and which days? (Initials only, no child names.)
10. Phones (iPhone or Android), and do you share one Dropbox login?
11. Reminders: in the app only, or also a line in the 6:00 briefing email (v1.5)?
12. Organic-only? Plants to avoid (pets, allergies; no names)?
