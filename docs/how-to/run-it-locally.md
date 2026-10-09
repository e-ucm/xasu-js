# How to run it locally

A **recipe for one task**: building the tracker from a clone and getting the tests to run.

## Install and build

```bash
npm ci
npm run build
```

`npm run build` runs the bundlers (webpack for the UMD bundle, Rollup for ESM and CJS, minified)
and then the type declarations. The output is `dist/`.

## Why the build has to come first

The tests import the tracker from `dist/js-tracker.bundle.js`, not from `src/`. `src/js-tracker.js`
imports the device screen's locale JSON, and Node will not resolve a JSON import inside a `.js`
file — only the bundler can. So a test run against an unbuilt or stale `dist/` is not testing the
current source.

CI runs the build before the tests for this reason, and so should you.

## The commands

| Command | Does |
| --- | --- |
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