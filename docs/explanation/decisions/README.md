# Architecture decision records

Ten decisions that explain why xasu-js looks the way it does. Each one is written from the
repository's own history: the commits are real, the dates are real, and where a decision was later
partly reversed, the ADR says so and links the reversal.

## Reading them

Each record has:

- **Status** — Accepted, with a caveat, or accepted with an unresolved sharp edge.
- **Date** — when the decision was made, and where it took more than one commit to land.
- **Context** — the situation that made a decision necessary.
- **Decision** — what was chosen, and where to read it in the code today.
- **Consequences** — what it cost. Positive, negative, and carried forward.
- **Evidence** — the commits, so you can check them.

## Index

| # | Decision | Status | Date |
| --- | --- | --- | --- |
| [0001](./0001-trackers-are-composed-over-one-asset.md) | Trackers are composed over one asset | Accepted, with couplings that were not designed | 2026-04-20 → 2026-05-12 |
| [0002](./0002-generated-xapi-ids.md) | The xAPI ids are generated, not hand-written | Accepted; the merge has an unresolved sharp edge | 2026-04-22 |
| [0003](./0003-every-statement-carries-the-category.md) | Every statement carries the profile category | Accepted | 2026-04-21 → 2026-10-07 |
| [0004](./0004-normalize-the-context.md) | The context is normalized rather than trusted | Accepted | 2026-10-07 |
| [0005](./0005-each-statement-gets-its-own-context.md) | Each statement gets its own context | Accepted | 2026-05-12 → 2026-10-08 |
| [0006](./0006-only-what-a-statement-holds.md) | Only what a statement holds is serialized | Accepted | 2026-10-07 |
| [0007](./0007-a-rejected-batch-is-skipped.md) | A rejected batch is skipped, a network failure is not | Accepted | 2026-05-07 → 2026-05-21 |
| [0008](./0008-the-batch-timer-is-cancelled.md) | The batch timer is cancelled, not just forgotten | Accepted | 2026-10-08 |
| [0009](./0009-the-device-flow-owns-the-screen.md) | The device flow owns the screen | Accepted | 2026-09-09 → 2026-09-14 |
| [0010](./0010-dist-is-built-not-committed.md) | `dist/` is built at install time, and the tests run against it | Accepted; **reverses** the earlier decision to commit `dist/` | 2026-04-21 → 2026-10-09 |

## The one that was reversed

Visible in the history because it was adopted and then taken back:

| Attempt | Commits | What happened |
| --- | --- | --- |
| `case 400` falling through into the `401` handler | `2074690` → `152ab28` | No `break`, so a bad batch also refreshed the token and took the tracker offline. Fixed the next day; see [ADR-0007](./0007-a-rejected-batch-is-skipped.md). |
| A dismissible device popup | `3511451` → `d1bbb80` | Two days later replaced by a blocking overlay that only the tracker can dismiss. See [ADR-0009](./0009-the-device-flow-owns-the-screen.md). |
| `authority: null` in `LRSStatement.toXAPI()` | `a664a11` → `44b1d1d` | `null` is a value; the key should be absent. See [ADR-0006](./0006-only-what-a-statement-holds.md). |
| `localStorage` as the offline fallback | `7f316fd`, `c9f1369` → `6fb62c7` | Disabled by default, then removed with the 1,232-line rewrite. Not replaced. See [ADR-0007](./0007-a-rejected-batch-is-skipped.md). |

## Known open items

Things the project has not settled, collected so they are not mistaken for decided:

1. **Whether a zero score part should be dropped.** It was, until a test pinned the bug and the
   check became "is this part absent". Nothing in the code says which was intended — see
   [ADR-0006](./0006-only-what-a-statement-holds.md).
2. **Whether the offline queue should persist.** It does not. A player who plays offline and closes
   the tab loses the queue, and there is no storage layer to fix it in — see
   [ADR-0007](./0007-a-rejected-batch-is-skipped.md).
3. **How the tracker comes back online.** Only through `login()`. There is no reconnect on its own,
   so a game that loses connectivity mid-session needs to re-login to recover.
4. **Whether the unqualified profile ids should exist at all.** They are convenient when profiles
   agree on an IRI and misleading when they do not, and the name gives no hint — see
   [ADR-0002](./0002-generated-xapi-ids.md).
5. **The backup endpoint re-sends the whole queue**, not the unsent remainder, so a second
   `flush()` duplicates. Undecided.

## Status vocabulary

| Status | Meaning |
| --- | --- |
| Accepted | In force, no known intent to change |
| Accepted, with a caveat | In force, with a documented sharp edge |
| Accepted; X unresolved | In force, with a named question left open inside the record |