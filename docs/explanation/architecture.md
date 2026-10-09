# Architecture

How a statement travels from a call in a game to a payload on the wire, and which layer is
responsible for what.

## The layers

```
a game
  └─ SeriousGameTracker / JSScormTracker / LRSTracker / JSTracker   (src/js-tracker.js)
       │  settings, lifecycle, and the high-level API
       ├─ tracker.tracker : xAPITrackerAsset                        (src/xAPITrackerAsset.js)
       │     queue, retry policy, backup endpoint, the LRS client
       └─ a StatementBuilder per statement
                                          (src/HighLevel/StatementBuilder/StatementBuilder.js)
             │  describes a statement; queues it on send()
             └─ Statement
                  ├─ ActorStatement      who played
                  ├─ VerbStatement       what they did
                  ├─ ObjectStatement     what they did it to
                  ├─ ResultStatement     how it went
                  ├─ ContextStatement    what else was true
                  └─ AttachmentStatement[] what came with it
                       (src/HighLevel/Statement/*.js)
```

`LRSStatement` extends `Statement` with an authority and a stored timestamp;
`InteractionObjectStatement` extends `ObjectStatement` with the cmi interaction properties.

## The path of one statement

For `tracker.completable('level1').initialized().send()`:

1. **`SeriousGameTracker.completable(id, type)`** returns a `CompletableTracker`. Instances are
   cached per id and type, which is how a completable remembers it was initialized.
2. **`.initialized()`** calls `tracker.trace(...)`, which reaches `xAPITrackerAsset.trace()`. That
   clones the tracker's context, builds a `Statement` from the actor, the verb, and the object, and
   wraps it in a `StatementBuilder`.
3. **`.send()`** hands the statement to `xAPITrackerAsset.enqueue()`, which pushes it onto
   `statementsToSend`.
4. **The batch** goes out when `batch_length` statements are queued, when `batch_timeout`
   elapses, or when `flush()` is called. `#sendBatch()` serializes each statement with `toXAPI()`
   and hands the array to the LRS client.
5. **On failure**, the asset decides what to do based on the status. See
   [sending and failure](./sending-and-failure.md).

## Who owns what

| Concern | Owner |
| --- | --- |
| What the statements say | The statement classes, driven by the builder |
| Whether the statements say the right thing for this profile | `SeriousGameTracker` — the category, the game object kinds |
| When they are sent | `xAPITrackerAsset` |
| What happens when the LRS refuses | `xAPITrackerAsset` |
| Who the player is | `ActorStatement`, built by `xAPITrackerAsset.start()` from the settings |
| What else was true | `ContextStatement`, also built by `start()` and cloned per statement |

The asset is deliberately reachable as `tracker.tracker`. A game never needs it; the tests need
it, to swap the LRS client and observe what would have gone out.

## Why the layers are shaped this way

Each boundary here answers a decision record:

- [ADR-0001](decisions/0001-trackers-are-composed-over-one-asset.md) — why the tracker holds an asset rather than
  being one
- [ADR-0005](decisions/0005-each-statement-gets-its-own-context.md) — why the context is cloned per
  statement
- [ADR-0007](decisions/0008-the-batch-timer-is-cancelled.md) — why one flow reaches into the
  DOM

## The parts that are generated

`src/HighLevel/Statement/Ids/Profiles/Generated/` holds the xAPI vocabulary: verbs, activity
types, extensions and category ids from about 50 profiles. It is generated from the
`xapi-authored-profiles` submodule and committed, so a build needs no network access.

`src/HighLevel/Statement/Ids/Profiles/SeriousGameProfile.js` and `ScormProfile.js` are hand
written. They are the profiles the high-level API encodes as behaviour — which is why
`completable().progressed()` sends a particular extension — while the generated files are data.

## See also

- [Statements and the xAPI profiles](./statements-and-profiles.md)
- [API reference](../reference/index.md)