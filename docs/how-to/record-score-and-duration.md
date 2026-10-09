# How to record score, progress and duration

A **recipe for one task**: recording the result data an analyst needs, so time-on-task and
normalised scores do not need custom extensions.

## Scoring, progress, duration

`withDuration(start, end)` gives you a real ISO 8601 duration, so time-on-task does not need a
custom extension:

```js
const startedAt = Date.now();
await tracker.completable('level1', tracker.COMPLETABLETYPE.LEVEL)
	.initialized()
	.send();

// later
await tracker.completable('level1', tracker.COMPLETABLETYPE.LEVEL)
	.completed(won, true, score)
	.send();
```

`completed()` sets the duration itself, measured from that initializable moment, so a completable
gets its timing for free.

For score, `withScore({raw, min, max, scaled})` takes whichever parts you give it. Supplying
`min` and `max` is what lets a consumer normalise: `{raw: 8, min: 0, max: 10}` can be read as 80%
by anyone. A bare `raw` cannot. Prefer `progressed()` over a custom extension for anything that is
a percentage — the serious games profile already defines it.

## See also

- [How-to index](./README.md)
- [API reference](../reference/index.md)
- [Decisions](../explanation/decisions/README.md)
