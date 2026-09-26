# Before deployment

Remaining setup before `.github/workflows/deploy.yml` can ship the site, staging, and Studio.

## GitHub repository settings

- [ ] **Variables**: `PUBLIC_SANITY_PROJECT_ID=k50pujy4`, `PUBLIC_SANITY_DATASET=production`
- [ ] **Secret** `CLOUDFLARE_API_TOKEN`: Workers deploy permissions on the account in `wrangler.jsonc`
- [ ] **Secret** `SANITY_API_READ_TOKEN`: Viewer token, lets the staging build read drafts

## Cloudflare

- [ ] Add `freeatseafilm.com` as a zone on the account in `apps/site/wrangler.jsonc` and `apps/studio/wrangler.jsonc`
  (currently the More Monuments account, `4009597948c3d6ff2b8c74ed78b418cd`; change both if Free at Sea gets its own).
  Custom domains `freeatseafilm.com`, `staging.freeatseafilm.com` and `studio.freeatseafilm.com` attach on first deploy.
- [ ] Optional: Cloudflare Access in front of `staging.` and `studio.`

## Sanity

- [ ] CORS origin `https://studio.freeatseafilm.com` with credentials allowed
  (`pnpm --filter studio exec sanity cors add https://studio.freeatseafilm.com --credentials`)
- [ ] Publish webhook → GitHub `repository_dispatch` with `event_type: sanity-publish`, so publishing rebuilds production
- [ ] Replace the placeholder Site Settings copy in Studio
