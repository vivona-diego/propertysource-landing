# Property Hub Exchange

The complete recruiting website and private investor data room for Property Hub Exchange, Inc. This release synchronizes the managed website checkpoint **05e0cb2e** into the GitHub repository while preserving portable public images and Google Analytics.

## Included in this release

The current homepage includes the updated marketplace headline, AI-powered exchange messaging, strategic partner carousel, clarified revenue model, company news and current Operations and Channel Team profiles. All 33 currently referenced public image assets are bundled under `static-assets/manus-storage/`.

The investor data room includes individual password logins, owner-verified administrator setup, an administration dashboard, invitations, expiration and revocation controls, PDF viewing, Excel downloads, encrypted document storage and activity history. The latest sign-in fixes remove the temporary page flash and provide an explicit standalone-tab recovery option when an embedded browser blocks its secure session cookie.

**Private investor documents, accounts, passwords, database contents and deployment secrets are not in this repository.** They remain in the configured database and private object storage.

## Install, test and build

Use Node.js 22 and pnpm 10:

```sh
pnpm install --frozen-lockfile
pnpm check
pnpm test
pnpm build:standalone
pnpm start
```

`build:standalone` produces the frontend in `dist/public/`, copies the bundled public images, and builds the full Express server in `dist/index.js`. For local full-stack development, use `pnpm dev:standalone` after privately configuring the backend variables. The original managed `dev` and `build` scripts remain available.

The standalone server supports the application's 15 MB document-file limit. Run it behind HTTPS: investor sessions use Secure, HttpOnly cookies. Ordinary password-based investor/admin access does not require a Manus website hostname.

## GitHub and Vercel deployment

Pushing this repository's `main` branch should trigger the existing GitHub-linked Vercel project. The root `vercel.json` builds the Vite frontend into `dist/public/` and routes `/api/*` to the Express Function in `api/index.js`. The API is **not** rewritten to the homepage. Investor HTML responses receive private/no-store and noindex headers.

Keep the Vercel root directory set to the repository root. The configuration specifies:

- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm run build:vercel`
- Output: `dist/public`

### Backend configuration is required

Set these values privately in **Vercel → Project Settings → Environment Variables**, then redeploy:

- `DATABASE_URL`: the approved MySQL/TiDB connection, including TLS configuration where required.
- `JWT_SECRET`: the existing server secret. Preserve it when the current private files were encrypted using this secret.
- `BUILT_IN_FORGE_API_URL` and `BUILT_IN_FORGE_API_KEY`: credentials for the current encrypted document-storage integration.
- `DATA_ROOM_ENCRYPTION_KEY`: only if an explicit separate encryption key was already in use. Do not introduce a different key for existing files: they would no longer decrypt.

For the optional verified-owner OAuth login and initial admin-email configuration, also supply `VITE_APP_ID`, `VITE_OAUTH_PORTAL_URL`, `OAUTH_SERVER_URL` and `OWNER_OPEN_ID`, and configure an approved OAuth callback for the new hostname. Existing individual password logins use the data-room database and do not require owner OAuth.

**Never prefix database, storage API keys or encryption secrets with `VITE_`.** Those variables are exposed to frontend builds. `.env.example` contains names and empty placeholders only; actual `.env` files are ignored.

To preserve existing investors, administrator credentials and uploaded documents, use the approved existing database/storage and the unchanged encryption secret. Do not run the room's initial migration against a database where its tables already exist. For a fresh database, review and apply the versioned SQL under `drizzle/`, and establish the first administrator through the verified-owner setup flow.

Without the backend variables, the public website and sign-in page can load, but the investor data room is not operational. Login and document access fail closed; this is not a public-document fallback.

### Important file-size constraint on Vercel

[Vercel Functions limit request and response payloads to 4.5 MB](https://vercel.com/docs/functions/limitations). This application's upload API submits base64 inside JSON, so it is **not suitable for 15 MB uploads through a Vercel Function**. Files of roughly 3 MB or less leave room for base64 and JSON overhead. Larger private downloads can also exceed the Function response limit.

The code retains the existing 15 MB application limit for a normal Node deployment; it does not claim to bypass Vercel's platform limit. If your pitch decks or workbooks exceed the Vercel limit, use the standalone backend on a suitable HTTPS Node host or implement a separately reviewed private direct-upload/streaming workflow before advertising full 15 MB Vercel support. No confidential files should ever be placed in the static frontend output.

Official deployment references: [Express on Vercel](https://vercel.com/docs/frameworks/backend/express) and [Vite on Vercel](https://vercel.com/docs/frameworks/frontend/vite).

## Google Analytics

The public website uses GA4 measurement ID `G-9661Q40LRG`, with `VITE_GA_MEASUREMENT_ID` as the build-time override. The existing ID remains the default. Use `VITE_GA_MEASUREMENT_ID=disabled` for Preview deployments if you do not want test traffic counted.

Analytics do not initialize on `/data-room` routes, including invitation and admin pages. No investor names, email addresses, passwords or document details are sent by the Google Analytics initializer. Review your privacy and consent requirements separately.

## Updating content

The homepage lives in `client/src/pages/Home.tsx`; shared messaging is in `client/src/data/exchangeMessaging.json`. Leadership profiles are in `client/src/data/executiveTeam.json`. Keep current public team facts synchronized in `client/public/team.json`, `team.md`, `platform.json`, the Markdown/text mirrors and JSON-LD. The two team groups retain their current card design and photo formatting.

Company announcement records use unique IDs and ISO dates and display newest first. Keep their card data synchronized with the public news JSON/Markdown feeds and schema. Historical news is not automatically changed when a current job title changes.

Canonical marketing references currently retain `https://propertysource.app/`, and registration links retain the approved application URL. Change canonical URLs only when your final marketing domain is confirmed; working registration URLs are intentionally unchanged.

## Security

Passwords are salted scrypt hashes, room tokens are opaque and stored as hashes, and private file bytes use authenticated AES-GCM encryption. All file delivery rechecks account/document authorization, including after object-storage fetches. Spreadsheet downloads retain their original file bytes/formulas; format validation is not a malware scan.

The repository excludes runtime secrets, private documents, QA credentials, dependency folders and generated build output. Public logos and portraits are only the images already approved for the public website.
