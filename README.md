[![Build Status](https://travis-ci.org/e-ucm/js-tracker.svg?branch=master)](https://travis-ci.org/e-ucm/js-tracker) [![Coverage Status](https://coveralls.io/repos/e-ucm/js-tracker/badge.svg?branch=master&service=github)](https://coveralls.io/github/e-ucm/js-tracker?branch=master) [![Maintainability](https://api.codeclimate.com/v1/badges/8332c331fee826d6ed36/maintainability)](https://codeclimate.com/github/e-ucm/js-tracker/maintainability) [![Dependency Status](https://david-dm.org/e-ucm/js-tracker.svg)](https://david-dm.org/e-ucm/js-tracker) [![devDependency Status](https://david-dm.org/e-ucm/js-tracker/dev-status.svg)](https://david-dm.org/e-ucm/js-tracker#info=devDependencies) [![Pull Request Stats](http://issuestats.com/github/e-ucm/js-tracker)](http://issuestats.com/github/e-ucm/js-tracker) [![Issue Stats](http://issuestats.com/github/e-ucm/js-tracker)](http://issuestats.com/github/e-ucm/js-tracker)

# Xasu JS — xAPI Analytics Supplier for the browser

<img src="https://user-images.githubusercontent.com/3171485/173609418-2cc2def0-2631-4c1a-adeb-b68e072a02e0.png" width="180px" height="180px" align="right">

Xasu (xAPI Analytics Supplier) collects [xAPI](https://xapi.com/) Learning Analytics from a game and
sends the statements to a Learning Record Store. Xasu is a *tracker*: integrated into a game, it
records the player's interactions for later analysis. That matters when a serious game has to show
it works, whether it teaches, trains, or shifts a player's perspective on a real-world issue. Rather
than making every developer learn xAPI, Xasu offers a high-level API that fills in the structure of
a statement with sane defaults, and lets them refine anything it builds.

Xasu is developed by the [e-UCM group](https://www.e-ucm.es) as part of its ecosystem for Learning
Analytics (Simva, T-Mon, Pumva, μfasa and Xasu). This repository is the JavaScript implementation,
for games and web applications that run in a browser. There is a separate Unity asset for Unity
projects, with the same API and the same xAPI profiles.

## The "Super" in Xasu

The *su* also stands for *super*, since it is:

- Super **Simple** (high-level API): the four game objects of the serious games profile —
  `completable()`, `accessible()`, `alternative()`, `gameObject()` — build a complete statement from
  an id and an activity type. Everything else is optional refinement on top. The result is that the
  learning curve is xAPI's semantics, not xAPI's syntax.

- Super **Supportive** (multi-platform, multi-protocol, cmi5): Xasu runs wherever a browser does, in
  any engine that exports to JavaScript. It supports OAuth 0, OAuth 1 and OAuth 2 (including the
  device code flow, for consoles and TVs with no keyboard), and the cmi5 profile through `JSScormTracker`.

- Super **Asynchronous** (uses async/await): the tracker owns a queue, so a game never blocks on the
  network. `send()` returns a promise, and `flush()` resolves once the queue has been handed to the
  LRS even though statements travel in batches.

- Super **Flexible** (batching, backups, configuration): statements go out in batches whose length
  and timeout you choose. A second endpoint can receive a copy of everything, as xAPI or as CSV. The
  whole configuration can also be read from the query string, which lets one build serve many
  deployments.

- Super **Reliable** (communication policy and error resiliency): a failed batch is retried with an
  exponential backoff up to `max_retry_delay`. A statement the LRS rejects outright is skipped so it
  cannot block everything queued behind it, while a network failure takes the tracker offline and
  keeps the statements for later.

## Documentation

The documentation is split by what you are doing, following [Diátaxis](https://diataxis.fr/):

| | |
| --- | --- |
| **[Tutorials](docs/tutorials/)** | Learning. From nothing to statements arriving at an LRS, in three lessons. |
| **[How-to guides](docs/how-to/)** | Doing. One task at a time — instrument a mechanic, name your statements, tune batching. |
| **[Reference](docs/reference/)** | Looking up. Every class, method, parameter, and return value. Generated from the JSDoc. |
| **[Explanation](docs/explanation/)** | Understanding. Why the code works the way it does, and what each choice cost. |

An example page to poke at is in [`test_app.html`](test_app.html).

## Installation

The tracker is not published to a registry. It is consumed straight from this repository, pinned
to a tag or a commit:

```bash
npm install github:e-ucm/js-tracker#v2.2.1-beta
```

```js
import { SeriousGameTracker } from 'js-tracker';
```

A commit hash works too, which is what you want when reproducing a specific build, and a semver
range resolves against the tags:

```bash
npm install github:e-ucm/js-tracker#semver:^2.2.0-beta
```

See [how to install from GitHub](docs/how-to/install-from-github.md) for every form.

npm builds the tracker from source during the install, because the repository carries a `prepare`
script and does not commit its `dist/`. That costs about 30 seconds and a build toolchain on the
first install of a given commit. If you would rather not, install the packed tarball attached to
the [release](https://github.com/e-ucm/js-tracker/releases) instead.

For a plain page with no build step, download the UMD bundle from the
[same release](https://github.com/e-ucm/js-tracker/releases) and load it locally:

```html
<script src="js-tracker-webpack.bundle.js"></script>
```

## Getting started

```js
import { SeriousGameTracker } from 'js-tracker';

const tracker = new SeriousGameTracker();

tracker.trackerSettings.batch_endpoint = 'https://lrs.example/xapi';
tracker.trackerSettings.default_uri = 'https://game.example';
tracker.trackerSettings.platform = 'https://game.example';
tracker.trackerSettings.actor_name = 'player1';

await tracker.login();   // optional: without it the actor is anonymous
tracker.start();

await tracker.completable('quest-1', tracker.COMPLETABLETYPE.QUEST).initialized().send();
await tracker.accessible('MainMenu', tracker.ACCESSIBLETYPE.SCREEN).accessed().send();
```

Every tracking method returns a builder that you can chain onto, and nothing is queued until you
call `send()`:

```js
await tracker.gameObject('Item/HealthPotion', tracker.GAMEOBJECTTYPE.ITEM)
	.used()
	.withScore({ raw: 3, max: 5 })
	.withResultExtension('playerLevel', 12)
	.send();
```

The [tutorial](docs/index.md) takes this further, and the
[reference](docs/reference/statement-builders.md) lists every setter.

## Game objects

A **game object** is an element of the game on which the player performs an action. The kind is
chosen by the shape of the action, not by what the thing is called:

| Game object | For | Methods |
| --- | --- | --- |
| `completable` | Something with progress and an end | `initialized`, `progressed`, `completed` |
| `accessible` | Something the player moves through or past | `accessed`, `skipped` |
| `alternative` | A choice between options | `selected`, `unlocked` |
| `gameObject` | A thing in the world | `interacted`, `used` |

Each takes an activity type as its second argument, drawn from `COMPLETABLETYPE`, `ACCESSIBLETYPE`,
`ALTERNATIVETYPE` and `GAMEOBJECTTYPE` respectively. The
[reference](docs/reference/game-objects.md) lists every type constant, and
[how to choose a game object](docs/how-to/choose-a-game-object.md) works through when to use which.

## Development

```bash
npm ci                  # installs dependencies and builds dist/
npm run build           # bundles in dist/ and the type declarations
npm run verify          # type check, lint, and tests
npm run docs:reference  # regenerates docs/reference from the JSDoc
```

`dist/` is gitignored and `npm ci` builds it, so a fresh clone can run the tests straight away. The
tests import the tracker from `dist/` rather than from `src/`.

## Credits and acknowledgements

Developed by the e-UCM research group in the context of the H2020 BEACONING project. The xAPI
vocabulary under `src/HighLevel/Statement/Ids/Profiles/Generated` is generated from the
[xAPI-authored-profiles](https://github.com/adlnet/xapi-authored-profiles) repository and is
committed to this one, so building needs no network access.