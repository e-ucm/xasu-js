# How to check your instrumentation

A **recipe for one task**: the mistakes that survive to production, and a checklist to run before
you ship.

## Common mistakes

**Calling `completed()` on the chain instead of the tracker.** `completed` is not a builder
method; it belongs to the completable. This returns `undefined` and does nothing:

```js
// wrong, silently does nothing
await tracker.completable('q1', tracker.COMPLETABLETYPE.QUEST)
	.initialized().completed(true, true, 1);
```

```js
// right: hold the completable, initialize, then complete
const quest = tracker.completable('q1', tracker.COMPLETABLETYPE.QUEST);
await quest.initialized().send();
await quest.completed(true, true, 1).send();
```

**Forgetting `send()`.** Every builder method is inert until you call it.

**Forgetting to await `login()`.** It is async. `start()` before the token arrives and you get an
anonymous actor.

**Expecting a throw on misuse.** By default the tracker warns to the console and carries on. Set
`trackerSettings.debug = true` while developing to turn those warnings into thrown errors.

**Leaking identifiers.** `actor_name` should be a player id your system assigns, not an email
address.

## Reviewing before you ship

- [ ] Every statement id is namespaced and stable.
- [ ] No identifier contains a name, an email, or anything directly identifying.
- [ ] `actor_name` is a player id, not a display name.
- [ ] Completables initialize before they complete, and you held the instance.
- [ ] Every statement that needs it has a score with `min` and `max`, or uses `progressed()`.
- [ ] `flush()` runs on level end and on quit.
- [ ] `debug` is `false`.
- [ ] You have looked at one real statement as raw JSON and it reads the way you expected. The
      fastest way to catch a wrong id, a missing extension, or a duplicated statement is to print
      the output:

```js
const statement = tracker.completable('level1', tracker.COMPLETABLETYPE.LEVEL)
	.initialized()
	.toXAPI();

console.log(JSON.stringify(statement, null, 2));
```

`.toXAPI()` gives you the statement without queueing it, which makes this safe to do anywhere,

## See also

- [How-to index](./README.md)
- [API reference](../reference/index.md)
- [Decisions](../explanation/decisions/README.md)
