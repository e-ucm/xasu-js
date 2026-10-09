# API reference

Reference for the tracker, its builders, and the classes underneath them. Each page lists the members of one group, with their parameters, defaults, and what they return.

This index lists the pages. Start at [the reference README](./README.md) for what each page covers.

This section describes what the code *is*. For how to use it, see the [tutorials](../tutorials/README.md) and the [how-to guides](../how-to/README.md); for why the code works this way, see the [explanation](../explanation/README.md).

## Trackers

- [Tracker classes](trackers.md) — `XasuJS`, `SeriousGameTracker`, `JSScormTracker`, `LRSTracker`, and every setting they take

## Statements

- [Statement builders](statement-builders.md) — the builder every tracking method returns
- [LRS statement builder](lrs-statement-builder.md) — the builder an LRS tracker returns
- [Game objects](game-objects.md) — the four kinds of game object and their type constants
- [Statements](statements.md) — the statement classes the builders drive

## Underneath

- [Tracker asset](tracker-asset.md) — the queue, the retries, and the connection to the LRS
- [Authentication](authentication.md) — the OAuth layers
- [SCORM](scorm.md) — the SCORM tracker
- [Helpers](helpers.md) — the utilities the statements are built on

## Profiles

The ids of around 50 xAPI profiles ship with the tracker and are read at runtime rather than listed here. They are on every tracker as `tracker.ALL`, in `VERBS`, `ACTIVITYTYPES`, `ACTIVITYEXTENSION`, `CONTEXTEXTENSION`, `RESULTEXTENSION`, and `CATEGORYID`; on a serious game the serious games ids are also on `tracker.SERIOUSGAMEPROFILE`, and on a SCORM tracker the SCORM ids are on `tracker.SCORMPROFILE`.

One thing to know about them: an unqualified name resolves to whichever profile was merged first, so `ALL.RESULTEXTENSION.PROGRESS` is the video extension rather than the serious games one. Use the qualified name, such as `ALL.RESULTEXTENSION.SERIOUSGAMESPROFILE_PROGRESS`, when you mean a specific profile.
