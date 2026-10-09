# js-tracker Agent Guidelines

## Project Overview
This is a JavaScript xAPI tracker for serious games analytics. It helps track player interactions and analytics for games by sending statements to a Learning Record Store (LRS).

## Core Classes
- `JSTracker` - Base tracker class with authentication and core functionality
- `SeriousGameTracker` - Extends JSTracker with game-specific tracking methods
- `JSScormTracker` - SCORM-specific tracker
- `LRSTracker` - LRS-specific tracker with query capabilities

## Key Usage Patterns

### 1. Basic Tracker Setup
```javascript
const tracker = new SeriousGameTracker();
tracker.trackerSettings.batch_endpoint = "https://your-lrs-endpoint.com";
tracker.trackerSettings.platform = "https://your-game.com";
tracker.trackerSettings.actor_name = "player123";
await tracker.login();
tracker.start();
```

### 2. Tracking Game Objects
```javascript
// Completable objects (quests, levels, etc.)
tracker.completable("quest123", tracker.SERIOUSGAMEPROFILE.ACTIVITYTYPES.Quest)
  .initialized()
  .send();

// Accessible objects (screens, areas, etc.)
tracker.accessible("MainMenu", tracker.SERIOUSGAMEPROFILE.ACTIVITYTYPES.SCREEN)
  .accessed()
  .send();

// Alternative objects (questions, menus, etc.)
tracker.alternative("question1", tracker.ALL.ACTIVITYTYPES.ASSESSMENT)
  .selected("optionB")
  .send();

// Game objects (items, NPCs, etc.)
tracker.gameObject("healthPotion", tracker.SERIOUSGAMEPROFILE.ACTIVITYTYPES.ITEM)
  .used()
  .send();
```

### 3. Authentication
- OAuth0: Direct token authentication
- OAuth1: Basic username/password authentication
- OAuth2: Token-based authentication with grant types

#### OAuth2 Device Mode (`urn:ietf:params:oauth:grant-type:device_code`)
- `login()` immediately shows the built-in blocking overlay (loading state), then updates it in place with the QR code, `user_code`, and `verification_uri_complete` once the device code arrives. The overlay blocks all pointer/touch/keyboard input and scroll until the token is obtained.
- There is no host-provided `onDeviceAuthorizationInfo` callback; a legacy value is ignored with a warning. Host games must not render their own device UI.
- On failure the overlay stays blocked and shows the error message; it is dismissed only after an access token is received.
- `getUsername()` decodes `preferred_username` from the access token JWT.

#### Device sign-in screen languages (EN / ES / FR)
- Strings live in `src/Auth/locales/*.json` (`en.json`, `es.json`, `fr.json`) and are bundled via `src/Auth/deviceI18n.js`. Keep all three files with identical keys; countdown uses the `{time}` placeholder (`codeValidFor`).
- Resolution order: `oauth2Settings.language` (or `?sso_language=`) > `?lang=` / `?locale=` URL param > stored selector choice (`localStorage`) > browser language > English.
- The screen has a built-in language selector (English / Español / Français) that re-renders the current state, persists the choice, and updates `?lang=` in the URL.
- Bundler notes: JSON uses `@rollup/plugin-json` (devDependency, wired in `rollup.config.js`); `tsconfig.json` has `resolveJsonModule` + `allowSyntheticDefaultImports` for the type build.

## Build and Test Commands
- `npm run build` - Build the project (webpack + types)
- `npm run verify` - Type check, lint, tests, and build — what CI runs
- `npm run test` - Run linting and tests
- `npm run lint` - Run linting only
- `npm run typecheck` - `tsc --noEmit`
- `npm run build:types` - Build TypeScript definitions
- `npm run build:webpack` - Build webpack bundles only
- `npm run docs:reference` - Regenerate `docs/reference/**` from the JSDoc

## Releasing
- The tracker is **not published to a registry**. It is consumed straight from the repository:
  `npm install github:e-ucm/js-tracker#v2.2.1-beta`. A tag, a commit hash, a branch, or
  `#semver:<range>` all work after the `#`.
- See `docs/how-to/install-from-github.md` for the procedure.
- `dist/` is **not committed** — it is gitignored. `package.json` has `"prepare": "npm run build"`,
  so a git install builds the consumer's copy from source. `npm ci` runs `prepare`, so `npx mocha`
  works on a fresh clone without a manual build.
- Pushing a `v*` tag triggers `.github/workflows/release.yml`: it verifies, packs, and attaches
  `js-tracker-<version>.tgz` plus `js-tracker-webpack.bundle.js` to a GitHub Release. Those assets
  are the only prebuilt copies now.
- The tag must name the version in `package.json`; the release workflow fails if it does not.
  `v2.1.2-beta` sits on a commit that says `2.1.0-beta`, so a tag can resolve to something other
  than what its name claims.
- `package.json` has a `files` allowlist (`dist`, `README.md`, `LICENSE`) — it applies to git
  installs too, and it wins over `.gitignore`, so `npm pack --dry-run` must contain every entry
  point in `main`/`module`/`types`/`exports` even though `dist` is gitignored.
- Verified against npm 10: `NODE_ENV=production`, `--omit=dev` and `--ignore-scripts` all still
  build a git dependency, because npm installs its devDependencies to run `prepare`. A script-policy
  filter is the one case that can skip it, and it fails silently.

## Tests
- `test/*.js` - mocha, ESM, run against `dist/js-tracker.bundle.js` and not `src/` (the locale
  JSON in `src/Auth/deviceI18n.js` is unresolvable by Node). `npm ci` builds `dist/` via `prepare`.
- Any test that queues a statement must call `tracker.stop()` in `afterEach`, or the pending batch
  timer keeps the process alive and mocha hangs after reporting success.

## Documentation
- `docs/index.md` - Diátaxis landing page, the four quadrants
- `docs/tutorials/**` - lessons, numbered
- `docs/how-to/**` - one task per file
- `docs/reference/**` - **generated**; do not edit, run `npm run docs:reference`. CI fails on drift.
- `docs/explanation/**` - why the code is this way
- `docs/explanation/decisions/**` - ADRs, one per decision, with context/decision/consequences and
  commit citations. Adding a decision means adding a numbered record and an index row.

## Important Files
- `src/js-tracker.js` - Main entry point with all tracker classes
- `src/HighLevel/SeriousGames/*` - Game-specific tracking components
- `src/HighLevel/Scorm/*` - SCORM tracking components
- `src/HighLevel/StatementBuilder/*` - Statement building components
- `src/Auth/*` - Authentication components

## Key Constants
- `SERIOUSGAMESPROFILE.ACTIVITYTYPES` - Game object types
- `ALL.ACTIVITYTYPES` - Generic activity types
- `SCORMPROFILE.ACTIVITYTYPES` - SCORM activity types