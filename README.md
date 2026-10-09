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

## Deploy to Vercel

The repository-root `vercel.json` explicitly configures this project as a **Vite static site**:

- Install command: `pnpm install --frozen-lockfile`
- Build command: `pnpm run build:vercel`
- Output directory: `dist/public`
- Root directory: repository root (leave blank in Vercel)
- SPA fallback: unmatched application paths resolve to `index.html`; existing images, scripts, styles, and AI-readable files are served normally.

Vercel serves the static output directly. It must **not** publish the parent `dist/` directory or use `dist/index.js` as the homepage. That file is the optional Express server for traditional Node hosting, not a browser entry point. No `pnpm start` command or Express server process is needed on Vercel.

`build:vercel` includes all bundled images, and repository configuration overrides build/output settings in the Vercel dashboard. A push to the linked production branch should trigger a new deployment.

## Google Analytics 4

The Google tag is initialized once in the page head, only in production builds. It sends the standard GA4 page-view event and supports Google's automatically collected events and any enhanced measurement enabled in the GA4 web stream. No names, email addresses, or other custom personal data are sent by this integration.

In **Vercel → Project Settings → Environment Variables**, add:

| Name | Value | Environment |
| --- | --- | --- |
| `VITE_GA_MEASUREMENT_ID` | `G-9661Q40LRG` | Production |

Redeploy after saving: Vite embeds `VITE_` variables at build time. The supplied measurement ID is also the default, so production tracking works without requiring additional configuration. This ID is public, not a secret.

To prevent test traffic from preview builds, set `VITE_GA_MEASUREMENT_ID=disabled` for **Preview**. Local development does not load the Google tag. The initializer prevents duplicate loading and duplicate initial page views.

After deployment, visit the website and check GA4 **Reports → Realtime**, or connect Google Tag Assistant. Browser blockers and consent settings can prevent collection. Review applicable privacy and cookie-consent requirements before using analytics; a consent-management interface is not included in this integration.

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

## Executive Operations Team

The final homepage section (after Breaking News and before the footer) contains four current executive cards. `client/src/components/ExecutiveTeam.tsx` renders the photo-ready design from `client/src/data/executiveTeam.json`.

To replace a placeholder, provide the approved portrait and set the corresponding member's `photo_url` in `client/src/data/executiveTeam.json`. Keep `client/public/team.json` synchronized for AI discovery. Use the managed storage URL in the preview and include the same image in `static-assets/manus-storage/` for Vercel. Portraits use consistent proportional crops, lazy loading, descriptive alt text, and an initials fallback if an image fails to load.

Keep current names and titles synchronized in `team.md`, `platform.json`, the Markdown/text mirrors, and the Person/Organization structured data in `client/index.html`. Historical company announcements intentionally retain the titles that appeared in the original dated releases.

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
- Google Analytics uses `VITE_GA_MEASUREMENT_ID`; the unused template analytics placeholder has been removed.
- The active marketing website does not require a database or OAuth flow. Optional template components may use managed integrations; those unused capabilities are separate from the portable recruiting site.
- Company reference PDFs, private session configuration, temporary files, build output, and dependencies are deliberately not committed. The repository includes all deployed content and image assets.

## Security and provenance

Private API keys, authentication tokens, `.env` files, managed session metadata, runtime logs, and `node_modules/` are excluded. The GitHub portability additions were made in a separate export; they do not change the managed website preview.

Company logo and partner marks are provided or approved for website use by the project owner. Bundled visuals match the live website. This repository does not establish any additional trademark license beyond that authorization.
