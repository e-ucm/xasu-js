# How to run it locally

A **recipe for one task**: building the tracker from a clone and getting the tests to run.

## Install and build

```bash
npm ci
```

That is enough. `npm ci` installs the dependencies and builds, because `package.json` has a
`prepare` script — the same one that makes `npm install github:e-ucm/xasu-js#<tag>` build the
tracker's `dist/` instead of requiring a committed copy.

To rebuild without reinstalling:

```bash
npm run build
```

`npm run build` runs the bundlers (webpack for the UMD bundle, Rollup for ESM and CJS, minified)
and then the type declarations. The output is `dist/`, which is gitignored and therefore absent
from a fresh clone.

## Why the build has to come first

The tests import the tracker from `dist/xasu-js.bundle.js`, not from `src/`. `src/xasu-js.js`
imports the device screen's locale JSON, and Node will not resolve a JSON import inside a `.js`
file — only the bundler can. So a test run against an unbuilt `dist/` is not testing the current
source.

`npm ci` builds, so a fresh clone is fine. There is no way to end up with a stale `dist/` lying
around, because none is committed. CI still runs the build explicitly, which also checks that a
plain install produced the artifacts.

## The commands

| Command | Does |
| --- | --- |
| `npm ci` | Installs dependencies and builds `dist/` |
| `npm run build` | Bundles and type declarations |
| `npm run typecheck` | `tsc --noEmit`, no output written |
| `npm run lint` | ESLint, then `eslint --fix` |
| `npm test` | `lint` then mocha |
| `npm run verify` | `typecheck`, `test`, `build`, in that order |
| `npx mocha` | The tests alone, without the lint step |

`npm run verify` is what CI runs, and the one to run before pushing.

## Running a single test file

```bash
npx mocha test/statementBuilder.js
```

Or one case:

```bash
npx mocha test/statementBuilder.js --grep "score part"
```

## Poking at a real statement

`toXAPI()` gives you the statement without queueing it, which makes it safe anywhere — including
inside a live game:

```js
console.log(JSON.stringify(
	tracker.completable('level1', tracker.COMPLETABLETYPE.LEVEL).initialized().toXAPI(),
	null,
	2
));
```

`test_app.html` in the repository root is a page that loads the bundle directly and lets you try
this against a browser.

## See also

- [How to write a test](write-a-test.md)
- [How to regenerate the reference](regenerate-the-reference.md)