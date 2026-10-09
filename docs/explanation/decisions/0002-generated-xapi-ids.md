# ADR-0002 — The xAPI ids are generated, not hand-written

- **Status:** Accepted; the merge it produces has an unresolved sharp edge
- **Date:** 2026-04-22

## Context

The tracker needs IRIs from about 50 xAPI profiles: every verb, activity type, result extension,
context extension, activity extension and category id. Roughly 2,150 of them.

Written by hand they rot. The vocabulary moves — the profile server adds and retires ids — and two
people pick different IRIs for the same concept, which produces statements that do not join. The
[xapi-authored-profiles](https://github.com/adlnet/xapi-authored-profiles) repository exists
upstream to hold the canonical definitions, and this project took it as a submodule.

## Decision

Generate the maps into `src/HighLevel/Statement/Ids/Profiles/Generated` with
`scripts/generateProfiles.js`, and commit the output.

Each profile keeps its own module — `SeriousGamesProfile.js`, `Cmi5Profile.js` — and they are also
merged into one `ALL` object so a single import reaches everything. Every generated file carries a
header saying not to edit it, naming the command that produces it.

The ids a consumer is most likely to want are also re-exported: `ALL` is on every tracker as
`tracker.ALL`, and `SeriousGameTracker` carries `tracker.SERIOUSGAMEPROFILE` for the serious games
ids specifically.

## Consequences

**Positive**

- `ALL.RESULTEXTENSION.SERIOUSGAMESPROFILE_PROGRESS` is that profile's own IRI, by construction
  rather than by convention.
- Adding a profile is a regeneration, not a hand-written file.
- Because the output is committed, a build needs no network access and no submodule checkout.

**Negative**

- **`ALL` is large.** 1,324 verbs and 399 activity types, most of them for profiles a given game
  will never touch, and all of them in the bundle.
- **The unqualified name is a trap.** Each id carries an unqualified name and one per profile, and
  the unqualified one resolves to whichever profile was merged first:

  ```js
  tracker.ALL.RESULTEXTENSION.PROGRESS
  // 'https://w3id.org/xapi/video/extensions/progress'   — not the serious games one
  ```

  The high-level API avoids it by using the qualified name internally, so
  `completable().progressed()` sends the serious games extension. Anyone reaching for `ALL`
  directly has to know this, and nothing at the point of use says so.
- **`ALL.VERBS.ANNOTATED` and `ALL.ACTIVITYTYPES.VIDEO` are misleading names.** `ANNOTATED`
  resolves to the pdf-annotator IRI rather than acrossx's, and `VIDEO` is
  `https://w3id.org/xapi/video/activity-type/video`, not the adl one. Both are a consequence of
  the merge order.

**Not settled**

Whether the merge should keep the unqualified names at all is unresolved. They are convenient when
several profiles agree on an IRI, which is often, and misleading when they do not. The current
shape makes the difference invisible from the name.

## Evidence

- `70ca185` — 2026-04-22, the generated profiles for all xAPI specifications
- `bb7b01c` — 2026-04-22, the activity type and statement refactor that consumed them
- `3504ff2` — 2026-05-21, the submodule and the 2.1.0 version

## Related

- [Statements and the xAPI profiles](../statements-and-profiles.md)
- [How to name statements](../../how-to/name-your-statements.md)
- [ADR-0001](0001-trackers-are-composed-over-one-asset.md)