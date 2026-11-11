# Garden Journal

A phone PWA (React + Vite + TypeScript) to plan, plant and maintain a small community garden plot: a drawn plot map, plants and care schedule, a Today view with a rain-aware watering nudge, project checklists, and a harvest and season journal. Data lives on the phone and optionally syncs to the user's own Dropbox (no backend).

- Plan and design: `docs/PLAN.md`; design mock: `docs/design-mock.html`
- Run: `npm install`, `npm run dev` (phone on the same wifi: open the printed network URL), `npm run check` (tests, typecheck, build)
- Status: v0.1, first reviewable build. Not yet built: photos, date scrubber, undo, club calendar dates, drip drawing tools beyond simple lines.
- The crop catalog (`src/catalog.ts`) is marked unverified: typical coastal Southern California timing, to be checked against UC Master Gardener charts.

No personal data, child names or home address belong in this repo.
