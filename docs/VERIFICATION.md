# Local verification record — 10 November 2026

Work is local on `feature/portfolio-readiness`, based on merged PR #1 (`6b6b689`). Existing uncommitted location/form and map edits were preserved. Nothing was pushed or deployed.

## Baseline

- Both applications installed from their lockfiles using Node 22.13.1.
- Frontend production build passed, with a large bundle warning (about 3 MB uncompressed).
- Frontend lint: **55 errors, 4 warnings**. Findings included an undefined verification callback, sidebar components recreated during render, ref-based particle rendering, unused bindings and missing effect dependencies.
- Backend test initially failed because no MongoDB was available on port 27017. `npm run test:isolated` now starts a real temporary MongoDB on an ephemeral loopback port and runs the existing integration test without accessing application data.
- Initial npm audit: backend **13** findings (4 moderate, 8 high, 1 critical); frontend **21** (2 low, 4 moderate, 15 high).

## Dependency changes and remaining findings

Applied `npm audit fix` without `--force`, retaining the declared major versions. Express's transitive `qs` is overridden to compatible `^6.16.2` because its pinned older copy remained vulnerable. Runtime fixes include the Express parser/proxy stack, Mongoose and Multer. Frontend fixes include Axios/React Router and build tooling; Node-only Axios/server-rendering advisories have different exposure from this client-rendered SPA, but compatible updates were still applied.

Final frontend audit: **0 findings**. Final backend audit: **5 findings — 3 high, 2 moderate**:

| Dependency/path | Scope | Remaining issue and disposition |
| --- | --- | --- |
| `cloudinary` / `multer-storage-cloudinary` | Optional runtime uploads; two audit entries | [SDK argument injection](https://github.com/advisories/GHSA-g4mf-96x5-5m2c). Cloudinary 1.x is constrained by the storage adapter. npm recommends a major SDK change/adapter replacement. Upload transformations/folders are server-defined, but this does not establish immunity. Deferred to a deliberate adapter migration with provider tests. |
| `nodemailer` | Optional runtime email; one entry | Multiple address-parser, message-content and SMTP issues remain; npm recommends 10.5.0 rather than declared 8.x. See `npm audit` for the complete current advisory list, including [message-content access bypass](https://github.com/advisories/GHSA-p6gq-j5cr-w38f) and [SMTP reply parsing](https://github.com/advisories/GHSA-4g23-2xm8-66gc). Major upgrade deferred; demo mode disables email. |
| `nodemon` → `minimatch` | Development only; two entries | [Glob amplification denial of service](https://github.com/advisories/GHSA-g3hv-75wg-m249). npm proposes replacing the declared nodemon version. It is not used by `npm start`; no forced downgrade/major transitive override was applied. |

Audit counts are package findings, not counts of distinct exploitable paths. The application is not represented as vulnerability-free. Reproduce with `npm audit --prefix backend` and `npm audit --prefix frontend`; runtime-only npm classification is available with `--omit=dev` (some frontend build tools are declared in dependencies).

## Automated coverage

| Check | Result |
| --- | --- |
| Clean `npm ci` for backend and frontend | Passed in the separate source/lockfile copy |
| Backend isolated MongoDB lifecycle | Passed |
| Frontend production build | Passed; large-bundle warning remains |
| Frontend lint | Passed, no warnings |
| Separate-context Chrome lifecycle | Passed: file, copy/search ID, bidirectional citizen/official chat with polling, resolution, timeline, rating, second-citizen `403` |
| Browser responsive checks | Passed at desktop (1280 px) and mobile (390 px); no horizontal page overflow |
| Clean-copy browser run | Passed with no browser runtime errors |

The expanded API integration test passed against isolated MongoDB after a clean backend install. It exercises registration/login, synthetic verification, pending approval, trusted approval command, approval revocation with an existing token, private-by-default creation, tracking IDs, citizen/official authorization, private detail/chat/delete restrictions, public projection, status history, escalation, chat exchange, resolution/rating and dashboard responses.

Regression assertions also cover null versus zero coordinates, invalid coordinate pairs/ranges, invalid IDs/statuses, invalid ratings and unavailable uploads. Tests deliberately clear all image/email credentials; multipart text submission and status changes pass without optional integrations. Random test databases are dropped in teardown.

The Node-only demo seeds an isolated database twice; repeated seeding preserves fixture records. The seed refuses non-loopback URIs and any database name other than `civicconnect_demo` and does not delete/reset existing records.

## Optional provider checks

Command: `cd backend` then `npm run check:integrations`.

- **Cloudinary:** a synthetic one-pixel image uploaded successfully; the unique test asset was deleted successfully. This verifies the configured SDK/provider path; the automated API suite separately verifies multipart text and disabled-upload handling.
- **Email:** SMTP authentication failed with **`EAUTH`**. No email was sent. To reproduce, run the command above using the existing ignored environment. Correct the Gmail account/app-password configuration and rerun before claiming email delivery works. Inbox delivery remains unverified even if SMTP authentication later passes.
- No credentials or real identity data were written to documentation, fixtures or screenshots.

## Environment notes

The Windows sandbox blocked npm downloads, Git metadata writes, esbuild parent-directory reads and MongoDB's binary cache. Those commands required local execution approval. PowerShell's execution policy blocks `npm.ps1`; `npm.cmd` works.

An existing user Vite process locked `esbuild.exe` during a repeat frontend `npm ci`. It was left running. Dependencies were restored with `npm install`; clean-install verification uses `.local/clean-check`, a separate copy containing source and lockfiles but no application environment/secrets. Temporary copies, caches, browser traces and test screenshots are ignored.

Routes now load separately: the shared entry JavaScript is about 298 kB minified (99 kB gzip), and dashboards no longer import the landing page's 3D visual. The production build's large chunk warning remains for the landing page (about 1.85 MB minified, 521 kB gzip). External map tiles, geocoding and fonts still need network access; complaint submission remains functional without geocoding.

Browser QA found duplicate mounting of desktop/mobile content, overflowing official navigation/tabs, an absent chat-opening control and mobile complaint titles squeezed by status badges. These were corrected while retaining the existing visual style. The existing CARTO tile URL returned an API-key watermark during inspection. The default now uses the standard OpenStreetMap URL with visible attribution; it is configurable through `VITE_MAP_TILE_URL`. See the [OSM tile usage policy](https://operations.osmfoundation.org/policies/tiles/) before changing usage or hosting. Automated browser tests block tile/geocoding requests to verify offline fallbacks and avoid relying on external providers.

The final browser run passed in 2.3 minutes on this host, including two-way chat and no page runtime errors. Earlier retries exposed a five-second navigation assertion that was too short under host load, and one Playwright trace-write failure during concurrent edits. The final test waits explicitly for the actual login response and passed with a clean runner exit. API requests have a 20-second timeout rather than an indefinite spinner. Screenshots in `docs/screenshots` are real captures from the completed local workflow, not mockups.

Unsupported encryption/compliance claims and fabricated live-login metrics were removed. Landing-page illustrative metrics are labeled as samples. Unimplemented external login/password-recovery controls are disabled and labeled unavailable; no OAuth or recovery implementation is claimed.

## Account and public-feed follow-up

Notification preferences now persist in MongoDB and control status/escalation email attempts. Profile updates refresh the session; password inputs retain focus while typing. Profile photos persist on the account through Cloudinary when configured; unavailable uploads are explained in the UI. Owners can share/unshare complaints, with API regression checks proving other citizens and officials cannot change the owner's visibility choice. Guest public-feed requests now work without login and expose a retry state on failure. CSV export quotes fields and neutralizes spreadsheet formula prefixes, with three passing unit tests.

The expanded isolated MongoDB test, frontend lint and production build pass. Chrome account regression checks cover guest-feed error recovery, saved preferences across reloads, profile editing, password-input focus and mobile overflow. The original separate-session complaint lifecycle remains covered by the browser suite.

Final follow-up browser run: **2 tests passed in 57.9 seconds**, including sharing the resolved complaint through the UI, checking its public response omits messages, then making it private and confirming it disappears from the feed. Frontend unit tests: **3 passed**. `git diff --check` also passed.

## Civic workflow expansion — 12 November 2026

- The citizen map searches accessible complaint IDs/titles, focuses the matching clustered or unclustered pin and opens its popup. A manually selected pin persists in MongoDB; reports without coordinates retain searchable written addresses.
- Nearby same-category open cases are suggested before submission. Citizens may open the public report, follow/unfollow it, or continue filing. API queries apply the same owner-or-public visibility rule used by tracking and the map.
- Department routing is configured by category, city and state. No verified pilot mapping exists in this checkout, so the sample environment intentionally has an empty mapping and unmatched complaints appear in the Admin Review Queue. Admin assignment/reassignment and correction review are recorded in complaint history.
- Citizens can edit pending unassigned cases before official action, then request corrections or withdraw while preserving history. Expected document versions prevent stale edits and return `409` when staff and citizen changes race.
- The feed defaults to the saved area; citizens without a saved area can choose a city/state or All areas. Area selection and filters use public records only.
- Chrome runs passed for the separate-session lifecycle with map pin selection/focus, nearby duplicate follow, official chat/resolution, citizen rating, and second-citizen private access denial; account/feed tests passed area persistence and profile photo persistence in a second session. Responsive checks passed at 390 px and 1280 px with no inherited black text, horizontal overflow, or browser runtime errors.
- `npm run test:isolated --prefix backend`, frontend lint, frontend unit tests, and production build passed. Cloudinary synthetic upload and profile photo persistence passed with configured credentials; cleanup removed the test image. SMTP auth returned `EAUTH`; no email was sent. The build still reports the existing 1.85 MB LandingPage/globe chunk warning.
- LandingPage/globe source remains byte-for-byte equal to the pre-task working copy. No screenshots or code changes were made inside it.

Remaining verification: obtain verified department mappings before routing to real agencies, correct SMTP credentials before claiming email delivery, and review provider operational limits before production use. Work remains local; nothing was pushed or deployed.
