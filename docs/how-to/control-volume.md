# How to control volume and shape a session

A **recipe for one task**: setting batching so players do not wait at the edge of the event, and
nesting a session so a whole run can be reconstructed.

## Volume and batching

Defaults are `batch_length: 100` and `batch_timeout: 30s`. Both matter for how long your players
wait at the edge of the event.

A full batch goes out the moment it fills, so `batch_length` is the knob for latency. A long
session that never reaches 100 statements waits for the timeout, so `batch_timeout` is the other
one. If you are closing a session or leaving a level, flush rather than waiting:

```js
await tracker.flush();
```

When you need a second copy of everything, configure the backup endpoint:

```js
tracker.trackerSettings.backup_endpoint = 'https://backup.example/collect';
tracker.trackerSettings.backup_type = 'CSV';   // or 'XAPI' for JSON

await tracker.flush({ withBackup: true });
```

CSV rows are `timestamp, verb, type, id` followed by result key/value pairs, all as absolute
IRIs. Useful for a spreadsheet, useless for queries — prefer `XAPI` unless you know you want CSV.

While the LRS is unreachable, statements queue in memory and the retry delay doubles up to
`max_retry_delay`. A player who plays for an hour with no network will have their queue grow, and
if they close the tab it is gone. Nothing here persists to storage. If your game can be played
entirely offline, that is a real limitation and `backup_endpoint` is the closest mitigation
available.

## Session structure

Give the session a completable and nest the rest under it:

```js
tracker.trackerSettings.parent_activity_id = `${baseUri}/sessions/run-1`;
```

Every statement then carries that session as its parent context activity, which is what lets a
consumer reconstruct one player's run rather than a flat pile of events.

For content launched from an LMS, the parent is the course activity the player came from, and the
`registration_id` ties the statements to that attempt at the material.

## See also

- [How-to index](./README.md)
- [API reference](../reference/index.md)
- [Decisions](../explanation/decisions/README.md)
