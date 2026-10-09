# Tutorials

A tutorial is a **lesson**. It is written for somebody who does not know the domain yet, and it
deliberately gets things working once before it explains anything. Read it start to finish, top to
bottom, without skipping.

If you already know what you want to do, skip these and use the
[how-to guides](../how-to/README.md). If you want to know *why* something works this way, read the
[explanation section](../explanation/README.md).

## Available tutorials

| Tutorial | You will | Time |
| --- | --- | --- |
| [1. Your first statements](./01-first-statements.md) | Install the tracker, configure it, and get your first statements queued and flushed | 20 min |
| [2. Instrumenting a game](./02-instrumenting-a-game.md) | Wire the four game objects into real mechanics, and add the result data an analyst needs | 30 min |
| [3. Reading data back](./03-reading-data-back.md) | Query an LRS with `LRSTracker`, and take a statement, change it, and send it again | 15 min |

## Before you start

All three assume:

- an LRS (Learning Record Store) endpoint and credentials. A mock LRS works fine, since none of
  this needs a real server to be understood,
- Node 18 or newer, and the tracker installed (`npm install js-tracker`),
- the bundle built locally, if you are running against a clone: `npm run build`.

```bash
export LRS_ENDPOINT='https://lrs.example/xapi'
export LRS_TOKEN='an-access-token'
```

If you do not have credentials yet, [tutorial 1](01-first-statements.md) works with an anonymous
actor and no login at all.