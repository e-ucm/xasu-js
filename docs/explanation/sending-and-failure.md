# Sending and failure

What happens between `send()` and a payload on the wire, and what the tracker does when the LRS
says no.

## Queueing is not sending

`send()` queues. Transmission happens on one of three triggers:

| Trigger | Setting |
| --- | --- |
| The batch fills | `batch_length`, default 100 |
| The timeout expires | `batch_timeout`, default 30s |
| The game asks | `flush()` |

`flush()` returns a promise that resolves once the queue has been handed to the LRS. Awaiting it
before tearing the game down is the difference between a full batch and a truncated one.

## Batching is a latency trade-off

Both knobs control how long a player waits at the edge of an event:

- `batch_length` bounds the latency of a busy session — a batch goes the moment it is full.
- `batch_timeout` bounds the latency of a quiet one — a session that never reaches the batch
  length waits for the timer.

A game that closes a session or leaves a level should `flush()` rather than wait for either.

## What happens on failure

`#sendBatch()` branches on what went wrong, because the three cases call for different responses:

| Status | Response |
| --- | --- |
| `400` Bad Request | Skip the batch. The statements are wrong and will stay wrong. The error is reported to the caller of `send()`. |
| `401` / `403` | Refresh the token and retry immediately. The statements are fine. |
| Other status, or no response | Go offline, double `retryDelay` up to `max_retry_delay`, and restart the timer. |
| Success | Advance the offset, reset `retryDelay`. |

The `400` case is the one that matters most. Without it, a single malformed statement blocks
everything queued behind it, forever, and nothing in the logs says why.

## The offline queue is in memory

While offline, statements keep queueing and `retryDelay` doubles up to `max_retry_delay`. Nothing
is written to storage.

**This is a real limitation.** A player who plays a long session with no network and then closes
the tab loses everything queued. The tracker used to have a `localStorage` fallback; it went when
the monolithic implementation was replaced (`6fb62c7`, 2024-06-25). `backup_endpoint` is the
remaining mitigation, and it is opt-in.

The reconnect is one-sided too: the tracker returns online through `login()`, not on its own. A
later `flush()` while offline sends nothing, so a game that wants to try again has to re-login.

## The backup endpoint

A second endpoint can receive a copy of everything, either as xAPI or as CSV:

```js
tracker.trackerSettings.backup_endpoint = 'https://backup.example/collect';
tracker.trackerSettings.backup_type = 'XAPI';

await tracker.flush({ withBackup: true });
```

CSV rows are `timestamp, verb, type, id` followed by result key/value pairs, all as absolute IRIs.
Useful for a spreadsheet, useless for queries.

One sharp edge: the backup reads the whole queue rather than the unsent remainder, so flushing
twice sends the same statements twice. That is harmless when the endpoint is a collector and a
problem when it is not.

## Where the timer lives

`xAPITrackerAsset` holds one `setTimeout` for the pending batch, and `stop()` cancels it. Getting
that wrong is how the tracker comes to hold the Node event loop open after the tests finish — see
[ADR-0008](decisions/0008-the-batch-timer-is-cancelled.md).

## See also

- [ADR-0007](decisions/0007-a-rejected-batch-is-skipped.md) — the failure policy, and what it cost
- [How to control volume](../how-to/control-volume.md) — the practical side
- [API reference](../reference/tracker-asset.md)