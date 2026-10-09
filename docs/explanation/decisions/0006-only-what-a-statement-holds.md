# ADR-0006 — Only what a statement holds is serialized

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

Several serializers built their output by assigning keys and testing for truthiness:

```js
if (this.extensions) { ret.extensions = this.extensions; }
```

An empty object is truthy. A statement that had no extensions shipped `extensions: {}`. The same
bug was in three places: `ResultStatement`, `ContextStatement`, and the definition of an
`ObjectStatement`.

It matters because an LRS validates what it receives, and `extensions: {}` — like
`contextActivities: {}` — is a declaration about nothing that some validators reject. The cost is
small per statement and it is paid by every one of them.

## Decision

Test for **content**, not existence. A key is written only when there is something behind it:
at least one extension, at least one activity in at least one relation, a name that was given.

This extends to properties the constructors always initialize. `LRSStatement` sets an authority and
a stored field, so both are omitted when empty rather than serialized as `undefined` — which is a
key that exists in the object and vanishes only on `JSON.stringify`, so it corrupted anything that
inspected the statement in between. `44b1d1d` and `a664a11` fixed this the other way round, turning
`null` into `undefined`, which left the key present.

## Consequences

**Positive**

- An untouched statement serializes to exactly what the specification requires and nothing more.
- A consumer cannot distinguish "not set" from "set to nothing" — for these fields, correctly, the
  two are the same thing.

**Negative**

- **Three separate checks that all had to be found.** Nothing enforces the rule; a fourth
  serializer will not inherit it. The tests are what hold it in place, one per container.

## The score is the counter-example

While fixing the containers, a test for the opposite habit turned up: `setScore` guarded each part
with `if (min)`, so a legitimate score of `0` was silently dropped. Zero is a valid raw score, a
valid min, and a valid scaled score. It now checks whether a part is *absent*.

Fixing that exposed the mirror image in `setScoreValue`, which stored `Number(value)`
unconditionally: a non-numeric string produced `NaN`, and `NaN` serializes to `null`. A null score
part is worse than a missing one — it says the score is undefined rather than absent. Values that
are not finite numbers, and the empty string, are now rejected.

Both are the same mistake in opposite directions: truthiness as a proxy for presence.

## Evidence

- `a664a11`, `44b1d1d` — 2026-10-07, the authority and stored fields
- the empty-extension and score fixes of 2026-10, pinned in `test/statementBuilder.js`

## Related

- [ADR-0004](0004-normalize-the-context.md) — the same rule, applied on the way in
- [API reference](../../reference/statement-builders.md)