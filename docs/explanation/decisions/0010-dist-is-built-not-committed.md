# ADR-0010 — `dist/` is built at install time, and the tests run against it

- **Status:** Accepted, 2026-10-09. Reverses the earlier decision to commit `dist/`.
- **Date:** 2026-04-21 → 2026-10-09

## Context

`dist/` holds the webpack bundle, the UMD bundle, the four Rollup outputs (ESM, CJS and both
minified), and the generated type declarations.

The earlier decision (2026-04-21) was to commit them, so that `npm install github:e-ucm/xasu-js#<ref>`
would work: npm clones a git dependency and packs it, and a repository carrying its own build output
installs without anyone building anything.

That was right when the tracker was distributed as files a game copies into its project, and it got
expensive. `dist/` was 82 files and about 3.2 MB, appearing in nearly every commit that touched
`src/`; `d1bbb80` alone changed 271 lines of bundle. Reviewing a change meant reading the source and
ignoring the rest of the diff.

The distribution model changed: the tracker is consumed through `npm install`, not by copying files.

## Decision

**Do not commit `dist/`.** Add a `prepare` script to `package.json`:

```json
"scripts": { "prepare": "npm run build" }
```

npm installs a git dependency whose `package.json` has a `prepare` script by cloning it into a
temporary directory, installing that clone's `dependencies` **and** `devDependencies`, running
`prepare`, and only then packing and installing the result. The build therefore happens at install
time, from source. `dist/` moves to `.gitignore` and is untracked.

The second half of the earlier decision is **unchanged**: the test suite still imports the tracker
from `dist/xasu-js.bundle.js` rather than from `src/`. That part was forced, and it remains
correct — `src/xasu-js.js` imports the device screen's locale JSON through
`src/Auth/deviceI18n.js`, and Node will not resolve a JSON import inside a `.js` file, only a
bundler can. Importing the statement classes directly would test something other than the shipped
artifact.

Because `dist/` no longer exists in the repository, every release attaches the artifacts to a GitHub
Release instead: the packed tarball, and the UMD bundle on its own for a page that loads the tracker
with a `<script>` tag.

## Consequences

**Positive**

- Commits touch source only. The 3.2 MB of generated output leaves the diff.
- A tag can no longer ship a stale bundle. The consumer builds from the exact source in the commit.
- The repository is the single source of truth; there is no committed artifact to disagree with it.
- `npm ci` builds, so a fresh clone can run `npx mocha` without a manual build first. This removes
  the invisible ordering requirement described below.
- The UMD bundle is published per release, so the no-build page still has a file to load.

**Negative**

- **The consumer builds it.** 21 devDependencies, about 124 MB, per unique commit. Measured on a
  warm cache: about 30 seconds the first time, near-instant afterwards, because npm caches the
  packed result per commit. This is work a registry publish would have done once for everyone.
- **A script-policy filter can break it silently.** Some npm 11 configurations allow skipping
  lifecycle scripts for dependencies. If `prepare` is skipped the install still succeeds, `dist/` is
  absent, and it surfaces as a module-not-found in the browser. Documented in
  [the how-to](../../how-to/install-from-github.md), which also gives the release-tarball
  alternative.
- **A build failure is now an install failure.** For consumers this is worse than a broken game and
  better than a silently empty package: the error names the build.
- **A local checkout has no `dist/` until something builds it.** Every command that needs the
  artifacts — `npx mocha`, `npm run lint` on generated files, `npm pack` — has to run the build
  first. `npm run verify` puts the build in its sequence.

Checked rather than assumed, against npm 10: `NODE_ENV=production`, `npm install --omit=dev` and
`npm ci --ignore-scripts` all still build, because npm installs a git dependency's devDependencies
to run `prepare` regardless of what the outer install omits.

## What this resolves

The invisible ordering requirement the earlier decision carried — **a developer who ran `npx mocha`
on a fresh clone got an import error, and one with an old `dist/` got a test run that silently
validated stale code** — is gone. There is no stale `dist/` to have. The build now happens as part of
installing dependencies, which is where it belongs.

CI keeps its explicit `npm run build` step. It is redundant with `npm ci` and that is the point: it
also checks that a plain install produced the artifacts rather than relying on something already
being there.

## Evidence

- `e721ef1`, `838c4ad` — 2026-04-21, the first builds, and the origin of committing `dist/`
- `d1bbb80` — 2026-09-14, 271 lines of bundle for one source change
- `4425974` — 2026-10-08, the tests moved to the built bundle
- `6d3333a` — the `types` entry fixed to `dist/types/xasu-js.d.ts`
- npm documentation on [git dependencies](https://docs.npmjs.com/cli/installing-a-package-from-a-git-repository)
  and [the `prepare` lifecycle](https://docs.npmjs.com/cli/v11/using-npm/scripts#prepare)

## Related

- [How to install from GitHub](../../how-to/install-from-github.md)
- [How to run it locally](../../how-to/run-it-locally.md)
- [How to write a test](../../how-to/write-a-test.md)