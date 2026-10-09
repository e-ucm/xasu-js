# ADR-0007 — A rejected batch is skipped, a network failure is not

- **Status:** Accepted
- **Date:** 2026-05-07 → 2026-05-21

## Context

The LRS can refuse a batch for two unrelated reasons: the statements are wrong (`400`), or the
network or the server is unavailable (`5xx`, or no response at all). Treating them the same means
one malformed statement blocks the queue behind it indefinitely — the offset never advances, the
timer keeps retrying, and the LRS keeps saying no.

`6ffd6ab` (2026-05-07) had already separated network errors from response errors, and reset
`sendingInProgress` in each path so one failure did not wedge the queue. What was missing was the
`400`.

## Decision

Branch on the status inside `#sendBatch()`:

| Status | Response |
| --- | --- |
| `400` | Advance the offset past the batch. The statements will never be accepted. Report the error to the caller. |
| `401` / `403` | Refresh the token, retry immediately. The statements are fine. |
| Other, or no response | Go offline, double `retryDelay` up to `max_retry_delay`, restart the timer. |

The commit sequence records the mistake. `2074690` (2026-05-20) added `case 400` **without a
`break`**, so it fell through into the `401`/`403` branch: a bad batch also refreshed the token and
went offline. `152ab28` (2026-05-21) added the `break` and a `rethrow` flag to stop the 401 path
rethrowing into the retry logic it had just entered.

## Consequences

**Positive**

- A game cannot be blocked by a single malformed statement.
- A transient outage resolves itself with a growing delay.
- The error reaches the caller of `send()`, so a game that wants to log or report it can.

**Negative**

- **A skipped batch is gone.** The offset advances and the statements are never retried. That is
  the intent — an LRS that said `400` will say it again — but the tracker does not keep a copy
  anywhere, so the loss is silent to whoever is not reading the console.
- **The offline queue is in memory.** Nothing is persisted. A player who plays a long session with
  no network and then closes the tab loses everything queued. The tracker used to have a
  `localStorage` fallback; it went with `6fb62c7` (2024-06-25).
- **The reconnect is one-sided.** The tracker returns online through `login()`, never on its own.
  A later `flush()` while offline sends nothing.
- **`rethrow` is a loose end.** The flag is set in the 401 branch and read at the end of the catch
  block, but it is also the name of a field on the class that nothing else uses. It works; it is
  not obvious.

## Evidence

- `6ffd6ab` — 2026-05-07, network versus response errors
- `2074690` — 2026-05-20, `flush()` made async, `case 400` added without a `break`
- `152ab28` — 2026-05-21, the `break`, and `rethrow`
- `6fb62c7` — 2024-06-25, the removal of the local storage fallback

## Related

- [Sending and failure](../sending-and-failure.md)
- [ADR-0008](0008-the-batch-timer-is-cancelled.md) — the timer this policy arms