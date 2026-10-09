# How to write a test

A **recipe for one task**: adding a test to `test/`.

## The shape of it

Tests are mocha, run against the built bundle, and written in ESM. There is no TypeScript.

```js
import { expect } from 'chai';
import { SeriousGameTracker } from '../dist/xasu-js.bundle.js';

describe('Thing under test', function() {
	let tracker;

	beforeEach(function() {
		tracker = new SeriousGameTracker();
		tracker.trackerSettings.oauth_type = 'OAuth0';
		tracker.trackerSettings.default_uri = 'https://simva.example';
		tracker.trackerSettings.platform = 'https://simva.example';
		tracker.trackerSettings.actor_name = 'player1';
		tracker.start();
	});

	afterEach(function() {
		// stop() cancels the pending batch timer, otherwise it would keep mocha alive
		tracker.stop();
	});

	it('does the thing', function() {
		expect(tracker.completable('level1').initialized().toXAPI().verb.id)
			.to.equal('http://adlnet.gov/expapi/verbs/initialized');
	});
});
```

## Two rules that are not stylistic

**Import from `dist/`, not `src/`.** `src/xasu-js.js` imports the device screen's locale JSON,
which Node cannot resolve inside a `.js` file. Only the bundle is importable, so `dist/` has to be
built before the tests — `npm ci` does it.

**Call `tracker.stop()` in `afterEach`.** The tracker arms a batch timer when a statement is
queued. Without `stop()` the handle stays referenced and mocha finishes its run but never exits,
which looks like a hang.

## Asserting the whole statement

When you change a converter, asserting the whole payload is usually better than asserting a field
here and there — the failure message then names the part that changed:

```js
const statement = tracker
	.completable('c1', tracker.COMPLETABLETYPE.QUEST)
	.initialized()
	.toXAPI();

expect(statement).to.deep.equal({ ... });
```

Where a part has to be compared on its own — because it holds a uuid or a timestamp — assert that
part separately and leave the rest out of the literal:

```js
expect(statement.id).to.match(/^[0-9a-f-]{36}$/);
expect(statement).to.not.have.property('id');
```

## Tests that would leak the network

Any test that actually sends has to replace the client:

```js
const sent = [];
tracker.tracker.xapi = {
	async sendStatements({ statements }) {
		sent.push(...statements);
		return { ok: true };
	}
};

await tracker.completable('c1').initialized().send();
await tracker.flush();

expect(sent).to.have.lengthOf(1);
```

`tracker.tracker` is the asset underneath the tracker, and it is reachable on purpose — see
[ADR-0001](../explanation/decisions/0001-trackers-are-composed-over-one-asset.md).

## What to assert against

`toXAPI()` renders a statement without queueing it, so it is safe to use as the subject of an
assertion anywhere. Prefer it over reaching into `statement.result.Response` or similar, because
it tests the thing that is actually sent.

## Running one file

```bash
npx mocha test/statementBuilder.js
npx mocha test/statementBuilder.js --grep "score part"
```

## See also

- [How to run it locally](run-it-locally.md) — the commands, and why the build comes first
- [Reference index](../reference/index.md) — what the behaviour under test is supposed to be