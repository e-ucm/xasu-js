# ADR-0010 — The bundle is committed, and the tests run against it

- **Status:** Accepted; the cost is real and mitigated in two places
- **Date:** 2026-04-21 → 2026-10-08

## Context

`dist/` holds the webpack bundle, the four Rollup outputs (ESM, CJS and both minified), and the
generated type declarations. They are committed, and they appear in nearly every commit that
touches `src/`.

The reason goes back to the first builds (`e721ef1`, `838c4ad`, 2026-04-21): the tracker was
distributed as files a game copies into its project. The Unity asset and the CDN copies are built
from `dist/` too.

## Decision

Keep the artifacts committed, and make the test suite import the tracker from
`dist/js-tracker.bundle.js` rather than from `src/`.

The second half is forced. `src/js-tracker.js` imports the device screen's locale JSON through
`src/Auth/deviceI18n.js`, and Node will not resolve a JSON import inside a `.js` file — only a
bundler can. Importing the statement classes directly would work, but it would test something
other than the shipped artifact.

## Consequences

**Positive**

- A consumer can clone the repository and include the bundle with no build step.
- `package.json` can point at `dist/` for both `main` and `types`.
- The tests exercise what consumers actually get.

**Negative**

- **Every source change produces a large, noisy diff.** `d1bbb80` alone changed 271 lines of
  bundle. Reviewing a change means reviewing the source and ignoring the rest of the diff, which
  trains reviewers to skim large diffs.
- **The bundles can disagree with the source.** Nothing in the repository makes them agree except
  discipline and CI.
- **The ordering requirement is invisible.** A developer who runs `npx mocha` on a fresh clone gets
  an import error, and one who has an old `dist/` gets a test run that silently validates stale
  code. CI runs `npm run build` before `npx mocha` for exactly this reason, and
  `npm run verify` puts the build in the sequence.

## The mitigations

1. **`npm run build` before `npm run verify`**, and CI builds before it tests.
2. **CI fails on a stale `docs/reference`**: it regenerates from the JSDoc and runs
   `git diff --exit-code`. That catches drift in the documentation, which is generated from the
   same source, so a commit that changed `src/` without rebuilding is likely to fail there too —
   though not necessarily, since a comment-only change would not.

What is *not* mitigated: `npm test` alone, and `npx mocha` alone, both happily run against a stale
bundle. The [how-to](../../how-to/run-it-locally.md) says so, and so does the comment at the top of
every test file.

## Evidence

- `e721ef1`, `838c4ad` — 2026-04-21, the first builds
- `d1bbb80` — 2026-09-14, 271 lines of bundle for one source change
- `4425974` — 2026-10-08, the tests moved to the built bundle
- `6d3333a` — the `types` entry fixed to `dist/types/js-tracker.d.ts`

## Related

- [How to run it locally](../../how-to/run-it-locally.md)
- [How to write a test](../../how-to/write-a-test.md)