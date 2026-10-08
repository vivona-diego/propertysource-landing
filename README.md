# Property Source Exchange

Recruiting website for Property Source Exchange, owned and operated by Property Hub Exchange, Inc.

This repository contains the complete website source and development history through the October 8, 2026 checkpoint `6865a2da`, including:

- Responsive recruiting homepage, official company branding, full-width strategic partner carousel, and platform features.
- Marketplace revenue-share model, turnkey setup steps, and registration calls to action.
- Breaking News announcement cards with independent press-release pop-ups and visible Close controls.
- Five company announcements, including the Diego Vivona Chief Product Officer appointment, Arise Impact Labs partnership, Dreamweaver Tech agreement, and Mark Kole Chief Operating Officer appointment.
- Search and AI discovery files: semantic HTML, Schema.org JSON-LD, robots.txt, sitemap.xml, Markdown mirrors, llms.txt, and machine-readable platform, partner, and news JSON.
- All 22 images currently referenced by the website, bundled under `static-assets/manus-storage/` with their original storage filenames.

## Requirements

- Node.js 22 or later.
- pnpm 10.x. The package.json `packageManager` field records the original version.

## Install and run

```sh
pnpm install --frozen-lockfile
pnpm dev:standalone
```

Open the address printed by Vite (normally http://localhost:3000). The standalone configuration serves bundled images directly, so no private managed-storage credentials are required.

## Validate and build

```sh
pnpm check
pnpm build:standalone
pnpm start
```

The production website is generated in `dist/public/`. `build:standalone` includes the bundled images at `dist/public/manus-storage/`. `pnpm start` serves that output using the existing Express static server. Alternatively, deploy `dist/public/` to a static host with an index.html fallback for routes.

The original `dev` and `build` scripts and `vite.config.ts` remain available for the managed-preview workflow. For a fresh GitHub checkout, use the `:standalone` scripts above.

## Project layout

```text
client/src/pages/Home.tsx      Homepage, partner carousel, announcements, and modal
client/src/index.css           Branding, responsive layout, and carousel motion
client/index.html             SEO metadata, JSON-LD, and semantic initial HTML
client/public/                Crawlable AI/search reference files
server/index.ts               Existing production static server
static-assets/manus-storage/   Exact website images, portable outside hosted storage
static-assets/manifest.json    Image manifest and source checkpoint
vite.standalone.config.ts      Portable image serving and production asset copying
```

## Updating announcements

The visible announcement list is defined in `client/src/pages/Home.tsx`. Preserve a unique announcement ID and an ISO date (`YYYY-MM-DD`); the list is sorted newest first. Each entry uses the shared card and modal presentation. Full press-release content is currently represented by a forthcoming-document placeholder.

Keep announcement content synchronized with:

- `client/public/news.json`
- `client/public/news.md`
- `client/public/index.md`
- `client/public/llms-full.txt`
- NewsArticle JSON-LD and initial semantic HTML in `client/index.html`

## Deployment notes

- Canonical website references are currently set to `https://propertysource.app/`. Update these references and the sitemap if deploying to a different production domain.
- Registration calls to action open `https://app.propertysource.app/register`.
- Optional analytics placeholders are inherited from the managed template. Configure them in your deployment environment if analytics are wanted.
- The active marketing website does not require a database or OAuth flow. Optional template components may use managed integrations; those unused capabilities are separate from the portable recruiting site.
- Company reference PDFs, private session configuration, temporary files, build output, and dependencies are deliberately not committed. The repository includes all deployed content and image assets.

## Security and provenance

Private API keys, authentication tokens, `.env` files, managed session metadata, runtime logs, and `node_modules/` are excluded. The GitHub portability additions were made in a separate export; they do not change the managed website preview.

Company logo and partner marks are provided or approved for website use by the project owner. Bundled visuals match the live website. This repository does not establish any additional trademark license beyond that authorization.
