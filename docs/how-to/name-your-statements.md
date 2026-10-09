# How to name statements

A **recipe for one task**: choosing ids that stay groupable, and reaching the right xAPI
vocabulary.

## Ids and profiles

The tracker bundles the ids of around 50 xAPI profiles. They are on the tracker as `tracker.ALL`,
in six groups: `VERBS`, `ACTIVITYTYPES`, `ACTIVITYEXTENSION`, `CONTEXTEXTENSION`,
`RESULTEXTENSION`, and `CATEGORYID`.

The one that trips people up: **an unqualified name is not always the profile you would expect.**

```js
tracker.ALL.RESULTEXTENSION.PROGRESS
// 'https://w3id.org/xapi/video/extensions/progress'  — the video profile, not serious games
```

The unqualified name takes whichever profile was merged first. When you want a specific profile,
use the qualified name:

```js
tracker.ALL.RESULTEXTENSION.SERIOUSGAMESPROFILE_PROGRESS
// 'https://w3id.org/xapi/seriousgames/extensions/progress'
```

In practice the tracker already does this for you: `progressed()` on a completable sends the
serious games progress extension, so you only need the raw ids when you are reaching outside the
serious games profile yourself.

## Naming

Ids become URIs, so they are permanent once they reach an LRS. Treat them as a schema.

**Namespace by meaning, not by class name.** `Item/HealthPotion` survives a refactor;
`HealthPotionScript` does not.

**Keep them stable.** Renaming an id splits your history: old statements point at an id nothing
sends any more.

**Do not embed volatile values.** A timestamp, a session counter, or a score inside the id makes
every instance unique and ungroupable. `Level4/difficulty-hard` groups; `Level4/1743` does not.
For per-attempt records, a counter is fine — that is what the difficulty example does — as long
as the grouping happens at a level above it.

**Lowercase and hyphenate.** The serious games profile does, so it matches by default.

## See also

- [How-to index](./README.md)
- [API reference](../reference/index.md)
- [Decisions](../explanation/decisions/README.md)
