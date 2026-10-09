# Explanation

Explanation answers *why*. It is for reading when you want to understand a decision, not to
accomplish a task.

If you want to **do** something, use the [tutorials](../tutorials/README.md) or the
[how-to guides](../how-to/README.md). If you want to **look something up**, use the
[reference](../reference/README.md).

## How this section is sourced

Every claim here is traceable to the repository. Architectural decisions are written as ADRs in
[decisions/](./decisions/README.md) with:

- **Context** — the situation that made a decision necessary, with the dates and commits that
  establish the situation.
- **Decision** — what was chosen, and where in the code you can read it today.
- **Consequences** — what it cost. Including the parts that turned out badly, because those are
  the parts you cannot rediscover by reading the code.
- **Evidence** — the commits, so you can check them (`git show <hash>` works).

The commits are real and dated. Where the history shows a decision being made and then partly
undone, the ADR says so and links the reversal.

## The shape of the system

| Page | Covers |
| --- | --- |
| [Architecture](./architecture.md) | The layers, the statement path, and why each layer exists |
| [Statements and the xAPI profiles](./statements-and-profiles.md) | What a statement is made of, and where 1,700-odd vocabulary ids come from |
| [Sending and failure](./sending-and-failure.md) | Batching, retries, and what the tracker does when an LRS says no |
| [Authentication](./authentication.md) | The four flows, and what the device flow changes about the page |

## Decisions

[decisions/README.md](./decisions/README.md) — the ADR index, eleven records covering the
architecture, the statements, delivery, authentication and the project itself.

## Things worth knowing before you read any of it

- **The 2026 rewrite replaced the implementation, not the idea.** Commit `6fb62c7` (2024-06-25)
  deleted 1,232 lines from `src/xasu-js.js` — including the `localStorage` fallback — and the
  class-based tracker arrived in `cb63bb4` and `0cfb0b0` a year and a half later. Some behaviour
  that used to exist no longer does, and the ADRs say so rather than implying continuity.
- **The history is dominated by one author.** Of 246 commits, 170 are from one contributor, and the
  commits behind the 2026 decisions are effectively one person's work. There is no visible review
  layer in the log, which explains both how fast the xAPI details were got right and how several
  defects survived — a `Map` serialized as `{}`, a statement builder handed the wrong statement
  class, a `\\,'` escape that JavaScript collapsed to `','`.
- **Some decisions are still open.** Whether zero score parts should be dropped was settled only by
  accident, in a test written to pin a bug. The offline queue has no persistence at all, and the
  tracker's reconnect is one-sided. Where that is true, the ADR says it rather than pretending
  otherwise.