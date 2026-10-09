# How to regenerate the API reference

A **recipe for one task**: producing `docs/reference/` from the JSDoc in the source.

## The command

```bash
npm run docs:reference
```

That runs `scripts/generateApiReference.js`, which parses the JSDoc of the classes under `src/`
and writes ten pages into `docs/reference/`.

## What is generated and what is not

| Path | Kind |
| --- | --- |
| `docs/reference/*.md` | Generated. Do not edit; a regeneration will overwrite it. |
| `docs/index.md`, `docs/tutorials/`, `docs/how-to/`, `docs/explanation/` | Hand written. |

The generator also cross-checks the JSDoc against the actual signatures. If a parameter is
documented that does not exist, or a parameter exists that is not documented, it prints the
mismatch and exits non-zero. That is why a signature change without its JSDoc fails the build
rather than quietly making the reference wrong.

## CI keeps it honest

The workflow regenerates and then runs `git diff --exit-code -- docs/reference`. A stale page
fails the build.

## The xAPI vocabulary

A separate generator produces the profile ids:

```bash
npm run generate:profiles
```

That one needs the `xapi-authored-profiles` submodule, which `git submodule update --init
--recursive` fetches. Its output under
`src/HighLevel/Statement/Ids/Profiles/Generated/` is committed, so a normal build needs no network
access.

## Adding a method to the reference

You do not add it — you document it. Write the JSDoc in `src/` and regenerate:

```js
/**
 * Does the thing
 * @param {string} id the activity
 * @param {number} [progress=0] how far along
 * @returns {StatementBuilder} the builder, for chaining
 */
```

The generator picks it up and renders the parameter table, the defaults read out of the
signature, and the return type. The page it lands on is decided by which file the method is in,
configured by the `PAGES` array at the bottom of the generator.

## See also

- [Reference index](../reference/index.md)
- [How to run it locally](run-it-locally.md)