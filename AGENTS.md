# free-at-sea-site

Site for the film Free at Sea. The film is about Seasteading, the movement to build settlements in international waters.

## Design Principes

**Sea**: The film is about the sea, and the design should reflect that across the board. But not in tacky or overbearing ways.
**Mobile First, Desktop Too**: Design for phones first (from 360px), then scale up. Desktop is fully supported, not an afterthought: wide layouts should use the space well, with hover and keyboard interactions.

## Coding Principles

**Type Safety**: Write type safe code to ensure correctness wherever possible.
**Don't Repeat Yourself**: Don't unnecessarily redefine constants, helpers, and types locally if they could reasonably be used elsewhere. Derive types from existing types, including library types if applicable, wherever possible.
**Conciseness**: Keep code and any wording concise and to the point. Sacrifice grammar for the sake of concision.
**Reduce comments**: Avoid comments unless absolutely required to explain unusual or complex logic. Comments in jsdocs are acceptable but should be kept to a minimum.
**Responsive Design**: Ensure the site is responsive and works well on all devices.

## Development Workflow

pnpm workspaces, Node >= 22.12.

### Session start

Ensure the dev site (http://localhost:4324) and Sanity Studio (http://localhost:3335) are running; if either port
isn't responding, start it in the background (`pnpm --filter site dev` / `pnpm --filter studio dev`, or `pnpm dev`
for both). Don't start a second copy of one already running.

### Commands

- **dev** — `pnpm dev`
- **deploy** — GitHub Actions (`.github/workflows/deploy.yml`): `main` deploys all three after CI passes, the Sanity
  publish webhook (`repository_dispatch: sanity-publish`) deploys production, and "Run workflow" deploys one target.
  Manual: `pnpm build` (or `pnpm --filter site build:staging`) then `pnpm --filter site run deploy` (bare
  `wrangler deploy`, so an un-built `dist/` ships stale). Studio: `pnpm --filter studio run deploy`.
- **typecheck** — `pnpm typecheck`
- **lint** — `pnpm lint`
- **codegen** — `pnpm codegen` after any Sanity schema or GROQ change

### Validation Steps

If changing more than a few lines, run these validation steps after completing all changes:

1. pnpm fix
2. pnpm typecheck

### Running Exploratory Code

If you need to run some code for exploration or debugging purposes, create a new file *.scratch.ts(x) in the most convenient location. You can then run the file with tsx or typecheck it. Unless told otherwise, delete the file after you are done testing.

## Architecture

Three workspace packages:

- **`apps/site`** — Astro, Cloudflare adapter, Worker with static assets. Everything prerenders; there are no server routes.
  `freeatseafilm.com`; `staging.freeatseafilm.com` (`CLOUDFLARE_ENV=staging`) builds from Sanity drafts and is noindexed.
- **`apps/studio`** — Sanity Studio, self-hosted as a static-assets Worker at `studio.freeatseafilm.com`. Never bundled into the site build.
- **`packages/content`** (`@fas/content`) — the boundary between the two. GROQ queries, TypeGen output, and the `@sanity/client` factory.

Content fetching uses `@sanity/client` at build time. Site-wide copy lives in the `siteSettings` singleton, read via
`getSite()` (`apps/site/src/lib/site.ts`); navigation stays in code.

### React islands

React is wired up but should stay rare. Native HTML first (`<details>`, `<dialog>`), then plain `.astro`, then a React
island only when a component needs real client state. Always use the narrowest hydration directive available.

### Styling

StyleX everywhere, on the Astryx theme (`@astryxdesign/core`). No Tailwind, no `<style>` blocks.

- Theme: `apps/site/src/theme/freeAtSeaTheme.ts`. After any edit run `pnpm --filter site theme` and commit
  `src/theme/built/`. `<html data-astryx-theme="free-at-sea">` applies it; never use Astryx's `<Theme>` (runtime compiler).
- Colours and fonts: consts in `src/theme/tokens.stylex.ts`, never hard-coded. Shared styles: `src/styles/{layout,text}.ts`.
- StyleX doesn't compile `.astro`. Styles go in a sibling `Foo.styles.ts`, applied with `sx()` (`src/lib/sx.ts`):
  `<div {...sx(styles.a, cond && styles.b)}>`. Calls that need compiling (`stylex.defaultMarker()`) go there too.
- Media queries are literal string keys: `{ default: "1rem", "@media (min-width: 48rem)": "2rem" }`. Never a key
  from a const: StyleX can't order those, so a phone value can beat a desktop one. `md` is `48rem`.
- State set by scripts: `":is([data-x])"` keys on the element; on an ancestor, `stylex.when.ancestor("[open]")`
  plus a marker.
- `client:only` islands: their styles reach the stylesheet only if the server build imports the module, so add a bare
  `import "@/components/Foo";` in the page frontmatter and check a production build, not just dev.
- `stylex.mjs`: Astro builds server then client; only the server build may write the stylesheet. Dev serves atoms
  at `/virtual:stylex.css`, linked from `Layout.astro` behind `import.meta.env.DEV`; a new layout needs the same.
- Layers: `reset < astryx-base < astryx-theme < product`. Global overrides of the theme's element styles go in
  `astryx-base` (unlayered or `product` rules beat StyleX atoms).
- Needs Chrome 123+ / Safari 17.5+ / Firefox 146+: theme tokens live in `@scope`, older browsers get no colours.

### Types

TypeScript 6 across the whole workspace, pinned once at the root — TS 7 cannot run `astro check` yet.

### Known tooling quirks

- Biome parses `.astro` frontmatter only, not template markup, so `noUnusedVariables` is off for `.astro`.
- `apps/site/worker-configuration.d.ts` is generated by `pnpm --filter site cf-types` and gitignored.
  Cloudflare secrets are declared by hand in `apps/site/src/env.d.ts` — `wrangler types` cannot see them.
- Cloudflare packages (`wrangler`, `workerd`, `miniflare`, `@cloudflare/vite-plugin`) are pinned together in
  `pnpm-workspace.yaml` overrides. `@astrojs/cloudflare` refuses to load if the vite plugin wants a newer wrangler; bump them as a set.
- GROQ queries must be wrapped in `defineQuery()` from `groq`, or TypeGen silently finds 0 queries.
- TypeGen output is committed and `overloadClientMethods` is on, so `client.fetch(SOME_QUERY)` is typed
  from the query string with no type argument. There is no runtime validation of responses, so `pnpm codegen`
  after any schema or GROQ change is what keeps types honest.
- GROQ projections return `null` for absent fields, never `undefined`. Handle `null`.
- The content client sets `useCdn: false` on purpose: builds run seconds after a publish webhook, and the API CDN
  caches for ~60s.
- `apps/site/wrangler.jsonc` is **not** the deployed config. The adapter regenerates
  `dist/client/wrangler.json` from it (flattened for `CLOUDFLARE_ENV`) at build time and wrangler deploys that — always
  `pnpm build` after editing `wrangler.jsonc`, or your change is silently dropped.
