# ADR-0004 — The context is normalized rather than trusted

- **Status:** Accepted
- **Date:** 2026-10-07

## Context

`contextActivities` is the part of an xAPI statement most likely to arrive malformed, because the
parties producing it get the shape wrong in ways that do not throw.

The specification says it is an object keyed by relation — `parent`, `grouping`, `category`,
`other` — whose values are arrays of activities. The failure mode is specific and silent: give it an
*array* instead, and adding a relation attaches a string key to that array. Every serialization
drops string keys on an array. The activities are gone, no error is raised, and the statement that
reaches the LRS simply lacks a parent.

`d20f357` added normalization after reports of activities disappearing. `3d83c7e`, the same day,
widened it to cover a second discovery.

## Decision

`ContextStatement.normalizeContextActivities` is a static method applied wherever activities enter
a statement — through `fromXAPI`, through `clone()`, and inside `addContextActivity`.

It:

- wraps a single object into an array, since xAPI 2.0 accepts it where 1.0.3 requires one,
- discards an array given in place of the keyed object,
- discards values that cannot be an activity.

`3d83c7e` refined the last point: **a relation may hold plain IRIs as well as Activity Objects, but
only some relations do.** `grouping`, `category` and `other` accept IRIs; `parent` does not. So a
bare IRI is kept for the first three and dropped for `parent`.

A third change, in the same commit: when no relation ends up holding anything, the
`contextActivities` key is omitted rather than serialized empty, because an empty object declares
relations that hold no activity.

## Consequences

**Positive**

- A malformed context degrades instead of losing data silently.
- The behaviour is pinned by a table-driven test in `test/contextStatement.js` that runs each
  malformed shape and states how many activities survive.

**Negative**

- **Normalization is lossy by design.** An unknown relation key is discarded, so a future
  extension of the specification is dropped rather than passed through. Anything genuinely custom
  needs a context *extension*, not a relation.
- **The `parent` rule is a special case inside a general rule.** It is correct — `parent` takes
  only Activity Objects — but it means the function is not a pure filter, and the reason is only in
  the comment.
- **It runs on every entry point**, including `clone()`, which is on the path of every `trace()`.
  That is the point, but it is work on a hot path for a case that should be rare.

## Evidence

- `d20f357` — 2026-10-07, `normalizeContextActivities`, the constructor reset, and the first test
  table
- `3d83c7e` — 2026-10-07, IRIs retained for `grouping`/`category`/`other`, and the empty-key
  omission
- `c0e070d` — 2026-10-08, the clone path, see [ADR-0005](0005-each-statement-gets-its-own-context.md)

## Related

- [API reference](../../reference/statements.md)
- [How to write a test](../../how-to/write-a-test.md) — how the table-driven test is written