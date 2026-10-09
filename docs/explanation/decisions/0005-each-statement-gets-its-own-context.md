# ADR-0005 — Each statement gets its own context

- **Status:** Accepted
- **Date:** 2026-05-12 → 2026-10-08

## Context

`trace()` passed the tracker's context object to every statement **by reference**. All statements
therefore shared one `ContextStatement` instance.

The consequence is that a builder method which adds to the context — `withContextActivity`,
`withContextExtension`, `withContextCategory` — mutated the tracker's context and every other
statement already built or yet to be built. Adding a parent to one statement added it to all of
them. In a loop, which is how a game instruments anything, this is not a subtle bug.

`0485530` (2026-05-12) introduced `ContextStatement.clone()` for the SCORM instances, which needed
the same context without the parent. `c0e070d` (2026-10-08) reused it for every statement.

## Decision

Clone the context per statement, in `trace()`:

```js
const statement = new Statement(
    this.actor, verbId, objectId, objectType, context.clone(), this.settings.default_uri
);
```

## Consequences

**Positive**

- A statement can be enriched without affecting any other, which is what makes the builder chain
  safe to use inside a loop.

**Negative**

- **The clone was initially wrong, in a way that only showed once it started running.** It used
  `JSON.parse(JSON.stringify(...))` for the deep copy, which flattens an `ObjectStatement` into its
  internal fields. A parent activity shipped as:

  ```json
  { "id": "…", "definitionType": "…", "definitionName": {}, "definitionDescription": {}, "defaultURI": "…" }
  ```

  instead of `{ "id": "…", "definition": { "type": "…" } }`. Not valid xAPI, and the type under the
  wrong key.

  This was invisible until the clone ran on a non-empty context. Until then `start()` cloned an
  empty one and the bug cost nothing. The clone now converts each activity through `toXAPI()`
  before copying.

- **A copy per statement.** Cheap, but not free on a path that runs thousands of times in a long
  session, and the copy is of a structure that is mostly constant for a given tracker.

- **The category interaction.** Cloning per statement is what made [ADR-0003](0003-every-statement-carries-the-category.md)'s
  ordering load-bearing — the category is added before the clone, or the clones do not have it.

## Evidence

- `0485530` — 2026-05-12, `clone()` added for the SCORM instances
- `e0b2408` — guarding the clone against undefined activities and extensions
- `c0e070d` — 2026-10-08, `trace()` clones, and the fix for the flattened `ObjectStatement`

## Related

- [ADR-0003](0003-every-statement-carries-the-category.md) — the ordering dependency
- [Architecture](../architecture.md)