# Statements and the xAPI profiles

What a statement is made of, how it is converted, and where its vocabulary comes from.

## The shape of a statement

An xAPI statement is an envelope around one player action:

```json
{
  "id": "…",
  "actor":   { "objectType": "Agent", "account": { "name": "player1", "homePage": "…" } },
  "verb":    { "id": "https://w3id.org/xapi/seriousgames/verbs/accessed",
               "display": { "en": "accessed" } },
  "object":  { "id": "https://game.example/MainMenu",
               "definition": { "type": "…/activity-types/screen" } },
  "result":  { "score": { "raw": 3, "max": 5 }, "success": true },
  "context": { "registration": "…", "platform": "…", "contextActivities": { … } },
  "timestamp": "…",
  "version": "1.0.3"
}
```

Each part is a class under `src/HighLevel/Statement/`. The interesting one is `ContextStatement`,
because the `context` of a statement is not optional in practice: it is what carries the
registration, the parent activity, and the profile category.

## Conversion is a deliberate step, not a formality

`toXAPI()` is where the internal representation becomes a payload, and it makes three decisions
worth knowing:

**Ids that are not absolute get resolved.** A verb, an activity type, an extension key — anything
that is not already an IRI is resolved against `default_uri`. A game writes `completable('level1')`
and the statement carries `https://game.example/level1`.

**Maps become plain objects.** Internally the verb display and the activity names are `Map`s,
because they are keyed by language tag. `JSON.stringify` turns a `Map` into `{}`, so
`VerbStatement.toXAPI()` calls `Object.fromEntries`. This was a real bug: for a long time every
statement that reached an LRS lost its verb display.

**Empty containers are omitted.** An untouched statement has no `result` key at all, no
`extensions`, no `contextActivities`. Not empty ones — absent ones. See
[ADR-0006](decisions/0006-only-what-a-statement-holds.md).

## Where the vocabulary comes from

`tracker.ALL` merges the ids of about 50 xAPI profiles: 1,324 verbs, 399 activity types, 264
context extensions, 62 activity extensions, 60 result extensions and 48 category ids. They are
generated from the [`xapi-authored-profiles`](https://github.com/adlnet/xapi-authored-profiles)
submodule and committed under `src/HighLevel/Statement/Ids/Profiles/Generated/`.

Each id comes in two forms: an unqualified name and one name per profile.

```js
tracker.ALL.RESULTEXTENSION.PROGRESS
// 'https://w3id.org/xapi/video/extensions/progress'   ← the video profile

tracker.ALL.RESULTEXTENSION.SERIOUSGAMESPROFILE_PROGRESS
// 'https://w3id.org/xapi/seriousgames/extensions/progress'
```

**The unqualified name is whichever profile was merged first, and that is rarely the one you
want.** The high-level API uses the qualified name internally, which is why
`completable().progressed()` sends the serious games extension and not the video one. See
[ADR-0002](decisions/0002-generated-xapi-ids.md).

## The serious games profile, encoded as behaviour

Two files are hand written rather than generated, because the high-level API *is* their
implementation:

- `SeriousGameProfile.js` — which verb each game object kind sends, and which activity types it
  accepts.
- `ScormProfile.js` — the same for SCORM content.

The generated profiles supply the IRIs those behaviours refer to. The split exists so that a
change to the profile server's vocabulary does not change what a `completable` does.

## Reading a statement back

`fromXAPI` is the inverse, and it is where malformed input is dealt with rather than trusted. The
`ContextStatement.normalizeContextActivities` static method exists because `contextActivities` is
the part of a statement most likely to arrive in a shape that does not throw and loses data
silently — see [ADR-0004](decisions/0004-normalize-the-context.md).

## See also

- [Architecture](./architecture.md)
- [API reference](../reference/statements.md) — every method of every statement class
- [How to name statements](../how-to/name-your-statements.md) — the practice side of this