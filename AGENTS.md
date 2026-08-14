<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Tapframe

A digital beer menu for a home kegerator. Elegant, plain, simple.

The admin writes an ordered tap list to a YAML file. Generate turns that list into a PNG. Display hardware is a plug-in adapter and must not leak into data or render.

## Product

- Ordered list of poured beers only. No empty slots, no tap numbers.
- Leftmost card is the leftmost handle.
- Typically 2–4 taps. One left-to-right row.
- Per tap: optional logo, name, style, ABV, short description.
- Missing logo → generic beer mark. The slot stays reserved.
- No IBU, SRM, brewery field, prices, catalog, or coming-soon.

## Stack

- Next.js App Router, TypeScript, Tailwind, pnpm
- Data: `data/taps.yaml` + `data/logos/` (the file is the database)
- Render: SVG → PNG via `@resvg/resvg-js`
- Display: one folder per device in `src/displays/`. The app hands a PNG to `adapter.send`. Modules never read tap files.
- Host needs a real disk. Not a serverless platform.

## Commands

| Command | Description |
| --- | --- |
| `pnpm dev` | Admin at http://localhost:3000 |
| `pnpm test` | Vitest |
| `pnpm build` | Production build |
| `pnpm lint` | ESLint |

## Layout

- `src/lib/taps.ts` — parse and validate (safe for the client)
- `src/lib/tap-store.ts` — YAML and logo files (server only)
- `src/lib/render.ts` — menu image
- `src/lib/display/` — display contract, registry, settings
- `src/displays/` — one folder per device (Fraimic lives here)
- `src/lib/display/store.ts` — `data/display.yaml`
- `src/app/page.tsx` — admin
- `src/app/api/taps` — GET / PUT
- `src/app/api/logos` — upload and serve
- `src/app/api/render` — POST → PNG

## Agent rules

- Do not commit or push unless explicitly asked.
- New devices are a folder in `src/displays/` plus one line in `src/displays/index.ts`. Do not put vendor APIs in render or tap storage.
- Do not introduce a database.
- Sample `data/taps.yaml` and `data/display.yaml` stay in git. Uploaded logos stay out.
- Prefer small, reviewable changes.
