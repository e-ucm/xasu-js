# Tutorial 2: instrumenting a game

Tutorial 1 sent a couple of statements by hand. This one does the part that actually takes
effort: wiring the tracker into real mechanics, and recording enough about them that an analyst
can answer a question afterwards.

It assumes the tracker from [tutorial 1](01-first-statements.md) is configured and started. It
also assumes you have already decided what you want to know — if not, read
[how to instrument a mechanic](../how-to/instrument-common-mechanics.md) first, which is about that
decision rather than about code.

## 5. Track a quest end to end

Progress on something with a start, a middle, and an end is a `completable`.

```js
const quest = tracker.completable('quest-1', tracker.COMPLETABLETYPE.QUEST);

await quest.initialized().send();

// ... the player works on it ...

await tracker.completable('quest-1', tracker.COMPLETABLETYPE.QUEST).progressed(0.5).send();

// ... the player finishes it ...

await quest.completed(true, true, 0.9).send();
```

`completed(success, completion, score)` takes three arguments. They all have defaults
(`true`, `false`, `1`), so `completed()` on its own is valid.

**`completed()` requires `initialized()` first.** It measures the duration from when the
completable was initialized, and it refuses otherwise — it logs a warning and returns `undefined`
rather than throwing, unless `debug` is on, in which case it throws. This is the trap worth
knowing about:

```js
// does not work: initialized() went to a builder, not to the tracker
await tracker.completable('quest-1', tracker.COMPLETABLETYPE.QUEST)
	.initialized()
	.completed(true, true, 0.9);   // undefined — completed is not on the builder

// works: hold on to the tracker for that id and type
const quest = tracker.completable('quest-1', tracker.COMPLETABLETYPE.QUEST);
await quest.initialized().send();
await quest.completed(true, true, 0.9).send();
```

The reason is that `completable(id, type)` hands back the same instance every time for the same
id and type, and that instance remembers whether it was initialized. Keeping a reference to it is
the natural way to use that.

## 6. The other three game object kinds

`SeriousGameTracker` gives you four kinds of game object. Pick by what happened, not by what the
thing is:

| Kind | For | Methods |
| --- | --- | --- |
| `completable` | Something with progress and an end | `initialized`, `progressed`, `completed` |
| `accessible` | Something the player moves through or past | `accessed`, `skipped` |
| `alternative` | A choice between options | `selected`, `unlocked` |
| `gameObject` | A thing in the world | `interacted`, `used` |

```js
// the player skipped the intro cutscene
await tracker.accessible('Intro', tracker.ACCESSIBLETYPE.CUTSCENE).skipped().send();

// the player answered a question
await tracker.alternative('q-1', tracker.ALTERNATIVETYPE.QUESTION)
	.selected('optionB')
	.send();

// the player unlocked Combat Mode in the start menu
await tracker.alternative('Menus/Start', tracker.ALTERNATIVETYPE.MENU)
	.unlocked('Combat Mode')
	.send();

// the player talked to a villager
await tracker.gameObject('NPC/Villager', tracker.GAMEOBJECTTYPE.NPC)
	.interacted()
	.send();

// the player drank a health potion
await tracker.gameObject('Item/HealthPotion', tracker.GAMEOBJECTTYPE.ITEM)
	.used()
	.send();
```

Each kind takes a type constant as its second argument. The constants are grouped by kind, so
`tracker.ACCESSIBLETYPE.SCREEN` and `tracker.GAMEOBJECTTYPE.ITEM` sit next to each other and there
is no way to pass one where the other belongs. The
[reference](../reference/game-objects.md) lists every one of them with the IRI it sends.

## 7. Enriching a statement

Every builder method returns the builder, so you can chain. `selected()` already sets the
response; the rest is up to you.

```js
await tracker.gameObject('Item/HealthPotion', tracker.GAMEOBJECTTYPE.ITEM)
	.used()
	.withScore({ raw: 3, max: 5 })
	.withDuration(startedAt, Date.now())
	.withResultExtension('playerLevel', 12)
	.send();
```

| Method | Sets |
| --- | --- |
| `withSuccess(bool)` | Result success |
| `withCompletion(bool)` | Result completion |
| `withScore({raw, min, max, scaled})` | The score. Only the parts you pass are kept. |
| `withScoreRaw/ScoreMin/ScoreMax/ScoreScaled(n)` | One score part |
| `withResponse(str)` | Result response |
| `withProgress(n)` | The serious games progress extension |
| `withDuration(start, end)` | Result duration, as ISO 8601 |
| `withResultExtension(key, value)` | One result extension |
| `withResultExtensions(obj)` | Several result extensions |
| `withContextActivity(relation, id, type)` | Adds a parent, grouping, category, or other activity |
| `withContextCategory(id)` | Adds a category |
| `withContextLanguage(str)` / `withContextPlatform(str)` | Context language and platform |
| `withContextExtension(key, value)` | One context extension |
| `withVerbDisplay(lang, text)` | Verb display, e.g. `{ es: 'usado' }` |
| `withObjectDefinitionName/Description(lang, text)` | Name and description of the activity |
| `withObjectExtension(key, value)` / `withObjectExtensions(obj)` | Activity definition extensions |
| `withAttachment(obj)` / `withAttachments([...])` | Attachments |

Two things about scores. A part of `0` is kept — `withScore({raw: 0, min: 0})` gives you
`{raw: 0, min: 0}`. But a part that is not a number at all is dropped rather than sent as
`null`, so `withScore({raw: 'abc'})` produces no score.

Extension keys that are not absolute IRIs get resolved against `default_uri`, so
`withResultExtension('playerLevel', 12)` is sent as
`https://game.example/playerLevel`. If you want an IRI from another xAPI profile, pass it whole:

```js
await tracker.completable('level1', tracker.COMPLETABLETYPE.LEVEL)
	.progressed(0.5)
	.send();  // uses https://w3id.org/xapi/seriousgames/extensions/progress
```

### Interaction activities

For cmi questions and quizzes, the object can describe the interaction:

```js
await tracker.trace(
	'http://adlnet.gov/expapi/verbs/answered',
	tracker.ALL.ACTIVITYTYPES.CMI_INTERACTION,
	'q-1'
)
	.withInteractionType('choice')
	.withInteractionWithLang('choice', 'option-a', 'en', 'First answer')
	.withInteractionWithLang('choice', 'option-b', 'en', 'Second answer')
	.withCorrectResponsesPattern(['option-b'])
	.withResponse('option-a')
	.send();
```

The object type has to be `CMI_INTERACTION` for the interaction setters to apply. On any other
object they warn and do nothing.

## 8. When statements leave the tracker

`send()` queues, it does not transmit. Transmission happens on its own:

- as soon as `batch_length` statements are queued, or
- when `batch_timeout` elapses, or
- when you call `flush()`.

```js
await tracker.flush();
```

`flush()` resolves when the queue has been handed to the LRS. If the LRS refuses the batch, the
error is reported to the caller of `send()`, and a `400` is treated as a statement the LRS will
never accept: that batch is skipped so it cannot block everything behind it. A server error takes
the tracker offline and backs off, doubling the delay up to `max_retry_delay`.

While offline, statements keep queueing. Nothing is lost, but note that the tracker only comes
back online through `login()` — a later `flush()` on its own sends nothing.

Flush a copy elsewhere at the same time with the backup endpoint:

```js
tracker.trackerSettings.backup_endpoint = 'https://backup.example/collect';
tracker.trackerSettings.backup_type = 'CSV';   // or 'XAPI' for JSON

await tracker.flush({ withBackup: true });
```

Call `stop()` when you are done. It clears the queue, cancels the pending batch timer, and drops
the connection.

```js
tracker.stop();
```

## Where to go next

- [How to instrument a mechanic](../how-to/instrument-common-mechanics.md) — which game object fits
  which mechanic, and what is worth recording at all.
- [Tutorial 3](03-reading-data-back.md) — getting the data back out.
- [Explanation](../explanation/README.md) — why the tracker behaves the way it does.

Every snippet here was run against the built bundle.
