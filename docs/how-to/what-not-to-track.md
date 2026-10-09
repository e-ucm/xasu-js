# How to decide what not to track

A **recipe for one task**: cutting statements that cost you storage and signal without answering
anything.

## What not to track

**Position and inventory as they change.** These are the game's internal state, not player
actions. If you want to know that the player ended with 340 coins, record it when the session
ends, not 400 times while they are playing.

**Every click on every button.** If two clicks mean the same thing, record one statement. Volume
buys you nothing and costs storage and signal.

**Anything you cannot act on.** Tracking the weather is fine if you will compare completion rates
by weather. It is noise otherwise.

**Data you would not want to see in a log.** The tracker sends to an LRS and, if configured, to a
backup endpoint. An id built from a username, an email address, or any other direct identifier is
a record of that person.

## See also

- [How-to index](./README.md)
- [API reference](../reference/index.md)
- [Decisions](../explanation/decisions/README.md)
