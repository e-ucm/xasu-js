# ADR-0003 — Every statement carries the profile category

- **Status:** Accepted
- **Date:** 2026-04-21 → 2026-10-07

## Context

An LRS holds statements from many sources: several games, several instruments, several years. A
consumer asking "show me everything this game produced" has no way to answer unless the statements
declare which profile they follow. The `category` relation of the context is how an xAPI statement
says so, and without it the statements are only distinguishable by their activity IRIs.

The tracker's own `ContextStatement.addCategory()` existed from `0b39875` (2026-04-21), but nothing
called it.

## Decision

Add `category` to the tracker settings, defaulting to empty, and have the *tracker class* supply
the default rather than the asset:

```js
// SeriousGameTracker
if (!this.trackerSettings.category) {
    this.trackerSettings.category = SERIOUSGAMESPROFILE.CATEGORYID;
}
```

`xAPITrackerAsset.start()` then adds it to the context. A game that sets `category` itself keeps
its own; setting it to `''` sends no category at all.

## Consequences

**Positive**

- A serious game's statements are categorized without the game doing anything, which is what makes
  them queryable as a set.
- A plain `XasuJS` sends no category, which is right: it makes no claim about which profile it
  follows.

**Negative**

- **The ordering in `start()` is load-bearing.** The category is added *before*
  `this.context_without_parent = this.context.clone()`, precisely because that clone is what the
  SCORM instances use. Reversing the two lines silently drops the category from every SCORM
  statement, and nothing fails. The source carries a comment saying so; without it the order looks
  arbitrary.
- **The default is set in a constructor.** Reading `new SeriousGameTracker()` tells you the
  category, but reading `trackerSettings` before the constructor runs does not, and a subclass
  that wants a different default has to remember the check is already there.

## Evidence

- `0b39875` — 2026-04-21, category management on `ContextStatement` and `StatementBuilder`
- `a51041e` — 2026-10-07, the `category` setting, the `SeriousGameTracker` default, and the tests
  that pin both, including the SCORM case

## Related

- [ADR-0005](0005-each-statement-gets-its-own-context.md) — the clone this ordering depends on
- [API reference](../../reference/trackers.md#trackersettings)