# Reference

Material you look things up in. Reference is not a lesson and not a task guide: it describes what
exists, precisely, without narrative.

**Everything in this section is generated** from the JSDoc in `src/` by
`npm run docs:reference`. Do not edit these pages — a regeneration overwrites them, and CI fails
if they are stale. To change what they say, change the JSDoc.

## Trackers

| Page | Contents |
| --- | --- |
| [Tracker classes](./trackers.md) | `XasuJS`, `SeriousGameTracker`, `JSScormTracker`, `LRSTracker` — every method, plus `trackerSettings`, `oauth1` and `oauth2` with their defaults |

## Statements

| Page | Contents |
| --- | --- |
| [Statement builders](./statement-builders.md) | every `with*` setter, its parameter, and what it returns |
| [LRS statement builder](./lrs-statement-builder.md) | the builder an LRS tracker returns: actor, authority, stored, id, version, timestamp |
| [Game objects](./game-objects.md) | the four kinds and every activity type constant, with the IRI each sends |
| [Statements](./statements.md) | the statement classes: actor, verb, object, result, context, attachments, interaction objects |

## Underneath

| Page | Contents |
| --- | --- |
| [Tracker asset](./tracker-asset.md) | the queue, the batch timer, `flush()`, `enqueue()`, and the LRS client |
| [Authentication](./authentication.md) | the OAuth layers and the token protocol |
| [SCORM](./scorm.md) | the SCORM tracker and its activity types |
| [Helpers](./helpers.md) | `setAsUri` and `isUri`, the two functions everything else is built on |

## The xAPI profiles

The vocabulary of about 50 profiles — 2,157 ids — ships with the tracker and is **read at
runtime rather than listed here**. To see what is available, read it off a tracker:

```js
import { XasuJS } from 'xasu-js';

const { ALL } = new XasuJS();

Object.keys(ALL);
// ['ACTIVITYTYPES', 'ACTIVITYEXTENSION', 'CATEGORYID', 'CONTEXTEXTENSION', 'RESULTEXTENSION', 'VERBS']

ALL.RESULTEXTENSION.SERIOUSGAMESPROFILE_PROGRESS;
// 'https://w3id.org/xapi/seriousgames/extensions/progress'
```

On a serious game the serious games ids are also on `tracker.SERIOUSGAMEPROFILE`; on a SCORM
tracker, `tracker.SCORMPROFILE`.

**One thing to know before you use them:** an unqualified name resolves to whichever profile was
merged first, so `ALL.RESULTEXTENSION.PROGRESS` is the *video* extension, not the serious games
one. Use the qualified name when you mean a specific profile — see
[ADR-0002](../explanation/decisions/0002-generated-xapi-ids.md).

## Conventions used in these pages

**Types are written as they appear in the JSDoc.** `StatementBuilder`, `Partial<{raw: number}>`,
`Promise<void>`.

**Defaults are read out of the source**, not out of the JSDoc, so a default in the table is the one
that actually runs.

**Optional parameters are marked** with the type in brackets where the JSDoc does.

## See also

- [How-to guides](../how-to/README.md)
- [Explanation](../explanation/README.md) — why the code is this way