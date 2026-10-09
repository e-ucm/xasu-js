# ADR-0008 — The batch timer is cancelled, not just forgotten

- **Status:** Accepted
- **Date:** 2026-10-08

## Context

`xAPITrackerAsset.#startTimer()` arms a `setTimeout` when a statement is queued, and re-arms it
whenever the batch does not fully drain. Two places nulled the field without cancelling the
handle:

- **`stop()`** did `this.timer = null`.
- **the catch block in `#sendBatch()`** did `this.timer = null` before re-arming.

Setting the field to `null` does nothing to the handle the runtime is holding. The timeout stays
armed, keeps the event loop alive, and fires into a tracker that believes it has no timer.

The symptom was the test suite finishing — every test green — and then the process never exiting.
`mocha` reports the run as complete and the shell hangs. It reproduces only where a statement was
actually queued: a batch of statements that all send cleanly has its timer consumed normally, so a
test that only exercises the happy path never sees it.

`#startTimer` had the mirror problem in reverse: it set `this.timer = null` *after* awaiting
`#sendBatch()`, so a failing batch — which arms a new timer itself — had that new timer cleared by
the old one's callback.

## Decision

One private helper, used by every path that ends a timer:

```js
#stopTimer() {
    if (this.timer) {
        clearTimeout(this.timer);
        this.timer = null;
    }
}
```

And `#startTimer()` releases its own handle *before* awaiting:

```js
this.timer = setTimeout(async () => {
    this.timer = null;
    await this.#sendBatch();
    if (this.offset < this.statementsToSend.length) this.#startTimer();
}, timeout);
```

`stop()` also clears `retryDelay`, so a restarted tracker does not inherit the backoff of the one
before it.

## Consequences

**Positive**

- `stop()` means what it says. A test that queues a statement and stops the tracker lets the
  process exit.
- A failing batch has exactly one timer, not two pointing at the same work.

**Negative**

- **The tests had to be changed too.** They had been reaching into `tracker.tracker.timer` and
  calling `clearTimeout` by hand, which worked but encoded the bug: each test was compensating
  for the missing cleanup. They now call `tracker.stop()`, which is the right thing for a test to
  do and does not depend on the field being there.

## Evidence

- the 2026-10-08 timer fix, pinned by `test/connection.js`, which fails without it by hanging
  rather than by asserting

## Related

- [ADR-0007](0007-a-rejected-batch-is-skipped.md) — the failure path that re-arms the timer
- [How to write a test](../../how-to/write-a-test.md) — why `stop()` belongs in `afterEach`