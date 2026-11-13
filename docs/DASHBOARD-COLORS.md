# Dashboard text-color regression

Local verification: 11 November 2026.

## Cause and scope

The current Settings implementation omitted explicit text-color classes on its heading, section titles and account values. `DashboardLayout` set a dark background without a foreground color, so these elements inherited the browser's black default. Tailwind's reset inherits heading colors; it does not select a foreground for a dark theme. No competing global heading-color selector was found. `index.css` is unchanged, and the unused Vite `App.css` is not imported.

Git reference: `6b6b689` (`HEAD`, merged PR #1). The historical Settings page used `text-white` for its heading/row titles and `text-white/70` for account values. Historical screenshots were rendered from that file with only the auth-hook import adapted to the current module location; the historical component was never substituted into the working source.

The application changes in this task are only color classes:

- `frontend/src/pages/SettingsPage.jsx`: explicit white headings, 70% white account values, and 60% white account labels.
- `frontend/src/layouts/DashboardLayout.jsx`: a white inherited foreground for the existing dark dashboard shell.
- `frontend/src/pages/AdminDashboard.jsx`: the same foreground on its separate existing shell.

No handlers, APIs, preference state, sharing controls, layout, typography, spacing, cards, sidebar, gradients or animations were changed. Profile, Public Feed and Citizen Dashboard retain their existing source; their explicit colors take precedence over the inherited default. Leaflet zoom controls retain their intentional black-on-white colors.

## Visual references

| Width | Historical Settings | Before this fix | After this fix |
| --- | --- | --- | --- |
| 1280 px | [Original](screenshots/settings-colors/original-settings-1280.png) | [Before](screenshots/settings-colors/colors-before-citizen-settings-1280.png) | [After](screenshots/settings-colors/colors-after-citizen-settings-1280.png) |
| 390 px | [Original](screenshots/settings-colors/original-settings-390.png) | [Before](screenshots/settings-colors/colors-before-citizen-settings-390.png) | [After](screenshots/settings-colors/colors-after-citizen-settings-390.png) |

Screenshots use synthetic local accounts. The historical Settings content differs because the current page contains the implemented preferences and privacy explanation; only its original visual treatment serves as the reference.

## Contrast and verification

Against the existing card base (4% white over `#03070f`), white headings calculate to approximately **18.9:1**, 70% white account values **9.5:1**, and 60% white labels **7.2:1**. The prior 40% white labels calculated to **3.8:1**. These are base-color calculations, not a full accessibility certification; translucent cards and background glows affect individual pixels. Existing muted secondary labels elsewhere are preserved rather than globally recolored.

The browser regression checks Settings, Profile, Public Feed and the relevant role dashboard for both citizen and approved official accounts at 1280 and 390 px. It asserts Settings foreground colors, rejects unintended black text, checks horizontal overflow, collects runtime errors and saves full-page screenshots to ignored `frontend/test-results/`.

Run with installed Chrome on PowerShell:

```powershell
$env:PLAYWRIGHT_CHANNEL='chrome'
npm.cmd run test:e2e --prefix frontend -- dashboard-colors.spec.js
```

The existing account regression covers saved preferences across reloads and profile editing. The complaint lifecycle regression covers private complaints, chat, resolution/rating, owner sharing controls and second-citizen denial. Both passed after the application changes. Frontend lint and production build passed; the pre-existing landing-page large-chunk warning remains.

Final visual regression: **passed**, covering 16 role/page/width combinations, with no horizontal page overflow or browser runtime errors. Settings headings and account values match the asserted foreground colors at both widths. The historical, before and after Settings captures were visually compared; the other page captures were reviewed for the established typography, gradients and card layout. The first draft of the check incorrectly assumed Admin Dashboard used a `main` element and flagged Leaflet's black zoom glyph on a white control; the test was corrected without changing those intentional designs.
