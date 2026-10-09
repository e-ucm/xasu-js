# Tutorial 1: your first statements

This tutorial takes you from nothing to statements arriving at an LRS. It assumes you have an LRS
endpoint to hand; a mock one works fine, since nothing here needs a real server to be understood.

Every snippet below was run against the built bundle, so the ids, verbs, and output shapes are the
ones the code actually produces.

## 1. Install

```bash
npm install github:e-ucm/xasu-js#v2.3.0-beta
```

npm builds the tracker from source during the install, so there is no separate build step for you.

For a bundler, import the classes:

```js
import { SeriousGameTracker } from 'xasu-js';
```

For a plain HTML page with no build step, download the UMD bundle from
[the release](https://github.com/e-ucm/xasu-js/releases) and load it locally:

```html
<script src="xasu-js-webpack.bundle.js"></script>
```

The bundle is also available as CommonJS (`xasu-js.bundle.cjs`), and TypeScript definitions
(`dist/types/xasu-js.d.ts`) are generated with it.

## 2. Create and configure a tracker

There are four classes, all exported:

| Class | Use it for |
| --- | --- |
| `SeriousGameTracker` | Games. Adds the serious games category and gives you the four game object kinds. |
| `XasuScormTracker` | SCORM content. Adds a `scorm()` factory and the SCORM activity types. |
| `LRSTracker` | Reading data back from the LRS. Everything `XasuJS` does, plus queries. |
| `XasuJS` | The base tracker. A plain tracker with no category and no game object methods. |

The tracker used to be called `js-tracker`, and `XasuJS` and `XasuScormTracker` used to be called
`JSTracker` and `JSScormTracker`. The old names are still exported and still work, but they are
deprecated: a new game should use the names in the table.

Pick `SeriousGameTracker` for the rest of this tutorial.

```js
import { SeriousGameTracker } from 'xasu-js';

const tracker = new SeriousGameTracker();

tracker.trackerSettings.batch_endpoint = 'https://lrs.example/xapi';
tracker.trackerSettings.default_uri = 'https://game.example';
tracker.trackerSettings.platform = 'https://game.example';
tracker.trackerSettings.actor_name = 'player1';
```

Four of these settings matter most:

- **`batch_endpoint`** — where statements are sent.
- **`default_uri`** — the base for any id you pass that is not already an absolute IRI. With
  `default_uri` of `https://game.example`, `completable('level1')` becomes
  `https://game.example/level1`.
- **`platform`** — the homepage of the game. It is recorded in the context of every statement,
  and used as the account homepage of the actor when you do not set `actor_homepage`.
- **`actor_name`** — who is playing.

The reference lists every setting with its default and what it does:
[`trackerSettings`](../reference/trackers.md#trackersettings).

### Configuring from the URL instead

If your game is embedded in a page you do not control, you can configure it with query
parameters:

```js
tracker.trackerSettings.generateSettingsFromURLParams = true;
```

With that on, the tracker reads `result_uri`, `backup_uri`, `backup_type`, `platform`,
`actor_user`, `actor_homepage`, `debug`, `batch_length`, `batch_timeout`, `max_retry_delay`,
and either `auth_token`, `username`+`password`, or the `sso_*` parameters for OAuth 2.

## 3. Start it

```js
tracker.start();
```

This builds the actor and the context from your settings. After it returns, `tracker.isStarted()`
is `true` and `tracker.completable(...)` and friends work.

`login()` is optional. Without it you get an anonymous actor named by `actor_name`; with it you
get the real user. Tutorial 2 covers the flows.

## 4. Send your first statement

Say the player opens the main menu. That is a screen the player *accesses*, so it is an
`accessible`:

```js
await tracker.accessible('MainMenu', tracker.ACCESSIBLETYPE.SCREEN)
	.accessed()
	.send();
```

`.send()` is what actually queues the statement. Until you call it, the builder is just an object
you have been configuring.

The statement that comes out looks like this:

```json
{
	"id": "c92db669-8309-4525-8911-a2313372722d",
	"actor": {
		"objectType": "Agent",
		"account": { "name": "player1", "homePage": "https://game.example" }
	},
	"verb": {
		"id": "https://w3id.org/xapi/seriousgames/verbs/accessed",
		"display": { "en": "accessed" }
	},
	"object": {
		"id": "https://game.example/MainMenu",
		"definition": {
			"type": "https://w3id.org/xapi/seriousgames/activity-types/screen"
		}
	},
	"context": {
		"registration": "ae9e2ced-31fb-4b1f-92f5-3a06e51b1ce7",
		"contextActivities": {
			"category": [{
				"id": "https://w3id.org/xapi/seriousgames/v1.0",
				"definition": { "type": "http://adlnet.gov/expapi/activities/profile" }
			}]
		},
		"platform": "https://game.example"
	},
	"version": "1.0.3"
}
```

Worth noticing: there is no `result`. The tracker omits parts a statement does not carry, rather
than sending them empty.

To get it out of the queue, wait for a batch, or flush it yourself:

```js
await tracker.flush();
```

## Where to go next

- [Tutorial 2](02-instrumenting-a-game.md) — wiring the tracker into real mechanics.
- [Tutorial 3](03-reading-data-back.md) — getting the data back out of the LRS.
- [How-to guides](../how-to/README.md) — recipes for one task at a time.
