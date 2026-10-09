# ADR-0001 — Trackers are composed over one asset

- **Status:** Accepted, with couplings that were not designed
- **Date:** 2026-04-20 → 2026-05-12

## Context

The first version of the tracker was one `TrackerAsset` class with everything on it: settings,
login, a queue, and the game object factories (`Accessible`, `Completable`, `Alternative`,
`GameObject`) as *properties*. It had been that shape since the first proof of concept in 2017,
through an offline mode with a `localStorage` fallback, and into three OAuth protocols.

By April 2026 the class carried OAuth 0, 1 and 2, SCORM, and an LRS query surface, and the
properties had collided with the methods. `tracker.Accessible.Accessed(id, type)` was three levels
of indirection to reach one verb, and `tracker.Completable` was a property holding an object whose
methods were called like a namespace.

`0cfb0b0` (2026-04-20) and `cb63bb4` (2026-04-21) began the split.

## Decision

Four classes over one asset.

- **`xAPITrackerAsset`** owns the queue, the retry policy, the backup endpoint, the actor, the
  context, and the LRS client. It knows nothing about game objects.
- **`JSTracker`** owns the settings and the lifecycle — `login()`, `start()`, `stop()`,
  `flush()` — and holds the asset as `tracker.tracker`. It is the base for everything else.
- **`SeriousGameTracker`**, **`JSScormTracker`** and **`LRSTracker`** extend it and add capability:
  the game object factories, a SCORM instance registry, and the LRS queries.

The factory properties became methods:

```js
tracker.Accessible.Accessed(id, type)   →   tracker.accessible(id, type).accessed()
```

The asset stayed reachable rather than being hidden behind a private field, because the tests need
to replace its LRS client and observe what would have been sent.

`LRSStatement` and `LRSStatementBuilder` were added in the same period (`cb63bb4`), as the LRS
statement variant, and `withPlatform()` plus the whole `LRSTracker` query surface in `6fcfa63`
(2026-05-12).

## Consequences

**Positive**

- The four concerns can be read separately, and a game that only reads from an LRS does not inherit
  the batching machinery's surface.
- The game object API reads like the domain: `completable().initialized().send()`.
- The asset is testable on its own, which is where most of the queue and failure tests live.

**Negative**

- **An extra level.** Reaching the queue from a game is `tracker.tracker.statementsToSend`, which
  is awkward and reads like an accident even though it is not.
- **The boundaries did not hold.** `LRSTracker.trace()` passes `this.tracker.context` straight into
  the asset rather than the tracker's own state, and `SeriousGameTracker` reaches into
  `this.tracker.context_without_parent` to give SCORM instances the same category. Neither is
  visible in the type signatures, and the class structure does not prevent them.
- **The old behaviour did not survive the rewrite.** `6fb62c7` (2024-06-25) had already deleted
  1,232 lines including the `localStorage` fallback; the class split is the other half of the same
  discontinuity, and the two are easy to mistake for one change.

**Carried forward**

- Every decision about the context — [ADR-0004](0004-normalize-the-context.md),
  [ADR-0005](0005-each-statement-gets-its-own-context.md) and
  [ADR-0006](0006-only-what-a-statement-holds.md) — sits on top of `ContextStatement`, which was
  reshaped in this period to carry the platform and to be clonable.

## Evidence

- `6fb62c7` — 2024-06-25, the xAPI-js rewrite that removed the offline storage fallback
- `0cfb0b0`, `cb63bb4` — 2026-04-20/21, the split into the four classes
- `2570fdf` — 2026-04-21, `trace()` and `fromXAPI()` on every tracker
- `6fcfa63`, `e1ab4ee` — 2026-05-12, the LRS query surface

## Related

- [Architecture](../architecture.md)