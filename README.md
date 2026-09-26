# Free at Sea website

Site for the film Free at Sea. Astro on Cloudflare Workers, content in Sanity.

| Piece     | What it is                                         | Where                     |
| --------- | -------------------------------------------------- | ------------------------- |
| Studio    | Editing dashboard (Sanity)                         | studio.freeatseafilm.com  |
| Staging   | Private preview, including unpublished drafts      | staging.freeatseafilm.com |
| Live site | Public site                                        | freeatseafilm.com         |

## Develop

```sh
cp .env.example .env   # fill in PUBLIC_SANITY_PROJECT_ID
pnpm install
pnpm --filter site cf-types
pnpm dev               # site on :4321, Studio on :3333
```

See [`CLAUDE.md`](CLAUDE.md) for commands, architecture and tooling quirks.

## Deploy setup

GitHub repository settings:

- **Variables**: `PUBLIC_SANITY_PROJECT_ID`, `PUBLIC_SANITY_DATASET`
- **Secrets**: `CLOUDFLARE_API_TOKEN` (Workers deploy), `SANITY_API_READ_TOKEN` (Viewer, for staging drafts)

Sanity webhook on publish → GitHub `repository_dispatch` with `event_type: sanity-publish` rebuilds production.
