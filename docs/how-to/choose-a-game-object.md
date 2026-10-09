# How to choose a game object

A **recipe for one task**: deciding what kind of game object a mechanic is, before writing any
code. It assumes you have the tracker configured and you already know what you want to learn
from the game.

If you want the code rather than the decision, [tutorial 2](../tutorials/02-instrumenting-a-game.md)
covers the four kinds. If you want to know what is *not* worth tracking, see
[what not to track](what-not-to-track.md).

## Start from the question

Write down, before you touch the tracker, the two or three questions you actually want answered.
Not "what happened in the game" — that is infinite. Something like:

- Where do players stop progressing, and at which step?
- Which of the three difficulty settings do players finish, and which do they abandon?
- Does using the hint system correlate with completing the level?

Each of those has a different answer below. If a statement you are about to add does not serve one
of your questions, leave it out. Analytics that answer nothing get ignored, and then the whole
set gets ignored.

The other half of this is that xAPI records *actions a player took*, not state. The tracker is
built to record events; a variable that changes 60 times a second is not an event, and an event
per frame is not data.

## Pick the game object that matches

Four kinds, and the choice is driven by the shape of the interaction rather than by what the
thing is called in your codebase.

| The player... | Use | Because |
| --- | --- | --- |
| Made progress, or finished something | `completable` | It has a start, a middle, and an end |
| Moved through something, or passed it by | `accessible` | There is presence, not completion |
| Chose between options | `alternative` | There is a decision and an answer |
| Touched or used something in the world | `gameObject` | It is a thing with no inherent progress |

Some judgement calls that come up:

**A dialogue with a single next button is not a choice.** It is `accessible`. Use `alternative`
only once there are real options to pick between.

**A menu is usually both.** Opening the menu is `accessible` — the player arrived. Choosing
*Combat Mode* inside it is `alternative` — a decision with consequences. Both are true statements
about the same moment.

**A boss fight is a `completable`, and the fight is also a `gameObject`.** Recording the fight as a
completable gives you completion and score. Recording damage to a specific phase is a game object.
Usually the first is enough.

**A tutorial you can skip is `accessible` with a type that says so.** `accessed()` when they read
it, `skipped()` when they jump past it. The ratio is a real quality signal.

When you are unsure, `gameObject` is the safe default. It carries the least commitment.

## See also

- [How-to index](./README.md)
- [API reference](../reference/index.md)
- [Decisions](../explanation/decisions/README.md)
