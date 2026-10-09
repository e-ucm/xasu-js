# js-tracker documentation

js-tracker collects [xAPI](https://xapi.com/) Learning Analytics from a game and sends the
statements to a Learning Record Store. It is the JavaScript implementation of
[Xasu](https://www.e-ucm.es), and it is aimed at serious games: it speaks the
[xAPI serious games profile](https://github.com/e-ucm/xapi-seriousgames), and it carries the
vocabulary of about 50 other profiles.

The documentation is organised with the [Diátaxis](https://diataxis.fr) method. The four
sections answer four different questions, and each one is written so it can be read on its
own:

| Section | Question it answers | Start here |
| --- | --- | --- |
| [Tutorials](./tutorials/) | *I am new here. Walk me through something that works.* | [Your first statements](./tutorials/01-first-statements.md) |
| [How-to guides](./how-to/) | *I know the domain. Do this specific task for me.* | [Instrument a mechanic](./how-to/choose-a-game-object.md) |
| [Reference](./reference/) | *What exactly does this method accept and return?* | [Tracker classes](./reference/trackers.md) |
| [Explanation](./explanation/) | *Why is it built this way? What were the trade-offs?* | [Decisions](./explanation/decisions/README.md) |

Do not read them in order. Pick the question you have.

## The 30 second mental model

```
a game
  └─ tracker (SeriousGameTracker / JSScormTracker / LRSTracker / JSTracker)
       ├─ settings      : what to send, to whom, as whom       (tracker.trackerSettings)
       └─ tracker.tracker : xAPITrackerAsset
            ├─ actor     : who is playing
            ├─ context   : registration, platform, parent, category
            ├─ queue     : statementsToSend, offset, batch timer
            └─ xapi      : the LRS client
                 ▲
                 └─ a builder per statement (StatementBuilder)
                      ├─ verb / object / result / context / attachments
                      └─ send()  ->  enqueue  ->  batch  ->  LRS
```

Vocabulary you will meet everywhere:

- **Statement** — one player action, as xAPI defines it. Built by a `StatementBuilder`, which
  only queues it when you call `send()`.
- **Game object** — an element of the game the player acts on. Four kinds: `completable`,
  `accessible`, `alternative`, `gameObject`. The kind follows the shape of the action, not the
  name of the thing.
- **Gameplay** — the ordered sequence of interactions a player performs over those objects.
- **Actor** — who played. An account with a name and a homepage, by default from
  `actor_name` and `platform`.
- **Context** — what else was true when the statement happened: the registration, the platform,
  the parent activity, and the profile category.
- **Batch** — the unit of transmission. `batch_length` statements, or `batch_timeout`
  milliseconds, whichever comes first.
- **Profile** — a published xAPI vocabulary. The tracker merges about 50 of them into
  `tracker.ALL`.

## Running it locally

```bash
npm ci
npm run build   # bundles into dist/, then the type declarations
npm run verify  # type check, lint, tests
```

The tests import the tracker from `dist/`, so `npm run build` has to run before them.

## Generated documentation

| Command | Produces |
| --- | --- |
| `npm run docs:reference` | `docs/reference/**` — every class, method, parameter and return value, from the JSDoc |
| `npm run generate:profiles` | `src/HighLevel/Statement/Ids/Profiles/Generated/**` — the xAPI vocabulary, from the `xapi-authored-profiles` submodule |

`docs/reference/` is generated and carries a "do not edit" banner. CI regenerates it and fails
on a diff, so the reference cannot drift away from the code. Everything else is hand written.