# CinemaCalmly Handoff Memo

Last updated: 2026-04-28

## One-Sentence Summary

CinemaCalmly is a quiet, editorial-style Next.js prototype for browsing Houston cinema showtimes from local JSON data, deployed on Vercel at https://cinemacalmly.vercel.app.

## Current Status

- Local project path: `/Users/th5/Dropbox/Codex/Private/CinemaCalmly`
- Git branch: `main`
- GitHub remote: `git@github.com:thebartender123/CinemaCalmly.git`
- Current live/local commit: `399e729 Tighten responsive layout spacing`
- Vercel URL: `https://cinemacalmly.vercel.app`
- Build status: `npm run build` passes.
- Data status: local JSON only, no backend.
- Current data size:
  - 27 movies
  - 4 theaters
  - 341 showtimes
  - Dates covered: 2026-04-28 through 2026-05-03

## Product Intent

The concept is a quiet, elegant showtime browser for Houston.

Working headline:

```text
Cinema, calmly found.
```

Supporting line:

```text
A quieter way to browse Houston showtimes.
```

The product should feel restrained, editorial, fast, and calm. It should not feel like a conventional ticketing platform. The goal is to help someone quickly see what is playing, search/filter listings, and decide what showtime is worth considering.

## Prototype Definition

This is technically a real deployed web app, but product-wise it is a prototype. Vercel treats it as a normal production deployment. The "prototype" label means:

- data can be static and manually gathered
- listings may need verification before attending
- no accounts, database, analytics, ticketing, checkout, or live APIs
- design and interaction should prove the product shape before expanding scope
- friends can use it for general feedback

## Hard Product Boundaries

Do not add these unless the user explicitly changes the scope:

- city selection
- genre menus
- sort controls
- ticket checkout
- user accounts
- personalization
- analytics
- AI features
- live APIs
- database
- end-time calculations
- tracking scripts
- cookies

The app should show start showtimes only. Do not calculate or display end times.

Use "Showtime" in visible UI, not "Time" or "Times." Internal code can still have historical names like `times` if changing them would be noisy, but visible text should say "Showtime" or "Showtimes."

## Technical Stack

- Next.js 15
- React 19
- TypeScript
- Tailwind CSS
- Local JSON data
- Vercel deployment
- No backend infrastructure

Useful commands:

```bash
cd "/Users/th5/Dropbox/Codex/Private/CinemaCalmly"
npm install
npm run dev
npm run build
npm run start
```

The deployed Vercel app uses the Next.js app, not the static `preview/` folder.

## Repository Structure

Important files:

```text
app/
  globals.css
  layout.tsx
  page.tsx
  privacy/page.tsx

components/
  ShowtimeBrowser.tsx

data/
  movies.json
  showtimes.json
  theaters.json

types/
  cinema.ts

preview/
  index.html
  app.js
  styles.css
  privacy.html
  server.mjs

package.json
tailwind.config.ts
tsconfig.json
README.md
HANDOFF_MEMO.md
```

`components/ShowtimeBrowser.tsx` is the main interactive UI. Most product behavior lives there.

`app/page.tsx` joins movies, theaters, and showtimes into enriched `ShowtimeListing` records before passing them to the browser component.

`data/*.json` are the source data files. Showtimes cross-link with `movieId` and `theaterId`.

`preview/` is a static prototype mirror used earlier for quick local viewing. It is not the primary deployed app. If behavior changes substantially, keep `preview/` in sync only if the user still wants that static preview maintained.

## Data Model

Types are defined in `types/cinema.ts`.

Movie fields:

```ts
id
slug
title
releaseYear
runtimeMinutes
country
languages
languageDisplay
director
synopsis
movieTags
sourceUrl
contentNote
```

Theater fields:

```ts
id
slug
name
neighborhood
area
venueType
shortDescription
theaterTags
amenities
accessibility
sourceUrl
sampleNote
```

Showtime fields:

```ts
id
movieId
theaterId
date
startTime
tags
sourceUrl
```

Current theaters:

- MFAH Films
- River Oaks Theatre
- Regal Edwards Houston Marq'E
- IPIC Houston

The current data was assembled as a real near-term snapshot from public source pages, but it is still local/manual prototype data. The UI should not imply that listings are guaranteed current.

## Current UI Behavior

The interface has three main modes in the left navigation:

- Movies
- Showtimes
- Theaters

The left side also contains:

- search
- date selector
- tag filters
- clear filters button

The selected date scopes the browsing experience. The middle panel no longer repeats dates in each showtime row because the selected date already defines the day.

### Movies Mode

The middle panel lists movie tiles.

Each movie tile currently shows:

- movie title
- theaters showing the movie under the title
- director
- release year/runtime/language metadata
- faint preview of the next three showtimes on the right, such as `Regal, 11:20 a.m.`

Clicking a movie opens that movie's showtimes in the middle panel. In that view:

- showtime is on the left
- theater name is the main title
- no repeated movie metadata
- no repeated tags

Clicking a specific showtime fills the right detail panel.

### Showtimes Mode

Showtimes mode starts with daypart buckets:

- Prior to noon
- Early afternoon
- Late afternoon
- Evening

Each bucket has a faint preview of the next few showtimes. Clicking a bucket opens the chronological showtime rows for that bucket.

This was a deliberate conceptual change so Showtimes follows the same pattern as Movies and Theaters: choose a lens first, then choose a concrete showtime.

### Theaters Mode

The middle panel lists theater tiles.

Each theater tile currently shows:

- theater title
- neighborhood/area
- venue type
- faint preview of the next three showtimes, such as `1:20 p.m. The Mummy`

Clicking a theater opens that theater's showtimes in the middle panel. In that view:

- showtime is on the left
- movie title is the main title
- movie director/year/runtime metadata appears beneath
- tags appear

Clicking a specific showtime fills the right detail panel.

### Right Detail Panel

The right detail panel is hidden until a showtime is selected.

It currently shows:

- poster placeholder
- "Selected showtime"
- movie title
- movie metadata
- selected showtime with date
- theater
- driving distance placeholder
- synopsis
- tags

The poster and driving distance are placeholders. Do not implement real distance calculation without explicit user approval because it may require location/ZIP handling and possibly external services.

## Visual Direction

The intended design is:

- minimal
- flat
- spacious
- high contrast
- typography-led
- calm
- refined
- editorial rather than commercial

Avoid:

- heavy shadows
- glossy effects
- decorative clutter
- large marketing hero sections
- noisy cards
- ticketing-platform visual language
- overly rounded card-like surfaces
- excessive gradients or ornamental backgrounds

Recent spacing fix:

- The headline is now intentionally split into two lines:
  - `Cinema,`
  - `calmly found.`
- Smaller screens have tighter top spacing.
- The two-column layout now starts at the Tailwind `md` breakpoint instead of waiting until `lg`, so medium-width browser windows do not become one long filter column.

## Privacy and Security

The prototype should remain legally and technically simple:

- no accounts
- no cookies
- no analytics
- no advertising cookies
- no third-party scripts
- no collection of personal preferences
- no tracking

There is a privacy page at `/privacy`.

Do not add tracking, analytics, forms that collect user data, or external scripts without explicit user approval.

## Deployment Notes

The workflow is:

```text
Local repo -> GitHub main branch -> Vercel automatic deployment
```

Current GitHub remote uses SSH:

```bash
git@github.com:thebartender123/CinemaCalmly.git
```

The user created an SSH key named:

```text
~/.ssh/cinemacalmly_ed25519
```

For manual pushes from Terminal, this command works:

```bash
GIT_SSH_COMMAND='ssh -i ~/.ssh/cinemacalmly_ed25519' git push
```

Important: do not ask for or handle the user's GitHub password or private SSH key. The public key is safe to paste into GitHub, but the private key must stay on the user's computer.

Vercel should auto-deploy on pushes to `main`. The current deployment target is:

```text
https://cinemacalmly.vercel.app
```

Vercel settings should remain standard:

```text
Framework: Next.js
Root Directory: .
Install Command: npm install
Build Command: npm run build
Output Directory: default
Environment Variables: none
```

## Verification Checklist

Before pushing changes:

```bash
npm run build
```

After pushing:

- wait for Vercel to redeploy
- reload https://cinemacalmly.vercel.app
- verify the visible change
- check browser console for errors if possible

The most recent pushed fix was verified live after Vercel redeployed.

## Known Limitations

- Data is local and manually assembled.
- Showtimes are not guaranteed current.
- No live API integration.
- No ticket links.
- No accounts or saved preferences.
- Poster is a placeholder.
- Driving distance is a placeholder.
- Static `preview/` may drift from the Next app unless deliberately maintained.
- The GitHub README is minimal.

## Good Next Steps

Useful improvements that stay within the prototype spirit:

- Improve README with setup/deployment instructions.
- Add a small data-refresh note explaining how to update JSON.
- Add a visually calmer empty state for filters with no matches.
- Add better placeholder poster styling or remove the poster placeholder if it feels too product-y.
- Review the live site on iPhone Safari dimensions.
- Decide whether `preview/` should be removed, kept, or clearly labeled as legacy static preview.
- Add a short "data last checked" note if the user wants more transparency.

Avoid expanding into accounts, live ticketing, data scraping, analytics, or location-aware distance calculation unless the user explicitly asks for that scope.

## Guidance for Another LLM

When continuing this project:

1. Work only inside `/Users/th5/Dropbox/Codex/Private/CinemaCalmly`.
2. Do not search the user's computer outside this project folder.
3. Read `components/ShowtimeBrowser.tsx`, `app/page.tsx`, and `types/cinema.ts` before making UI or data changes.
4. Keep the interface quiet and editorial.
5. Keep visible language consistent with "Showtime" rather than "Time."
6. Do not add product scope casually.
7. Run `npm run build` before committing or pushing.
8. Ask before pushing to GitHub or making changes that publish externally.

