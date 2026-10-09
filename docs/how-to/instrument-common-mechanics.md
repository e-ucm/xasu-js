# How to instrument common mechanics

A **recipe for one task**: the code for the mechanics serious games actually have. Each example
assumes the tracker is configured and started, and shows the ids and the statement that results.

Start with [choosing a game object](choose-a-game-object.md) — every example below is one kind,
and the choice is the part that is hard to undo.

## The mechanics

## Difficulty funnel

The question is where players drop off. Each attempt is a completable:

```js
function onLevelStart(levelId) {
	attempt = tracker.completable(`${levelId}/${attemptNumber++}`, tracker.COMPLETABLETYPE.STAGE);
	attempt.initialized().send();
}

function onLevelProgress(levelId, progress) {
	tracker.completable(`${levelId}/${attemptNumber - 1}`, tracker.COMPLETABLETYPE.STAGE)
		.progressed(progress)
		.send();
}

async function onLevelEnd(levelId, won, score) {
	const attemptNumber = attemptsByLevel[levelId].length - 1;
	await tracker
		.completable(`${levelId}/${attemptNumber}`, tracker.COMPLETABLETYPE.STAGE)
		.initialized()
		.send();
	await tracker
		.completable(`${levelId}/${attemptNumber}`, tracker.COMPLETABLETYPE.STAGE)
		.completed(won, true, score)
		.send();
}
```

Two things make this work. Each attempt gets its own id, so a retry is a new statement rather than
an overwrite. And the type is `STAGE`, which distinguishes one segment of play from the level as a
whole.

Because `completable(id, type)` returns the same instance for the same id and type, you can look
it up again later without having held on to anything.

## Which difficulty setting gets finished

```js
await tracker
	.completable(`Level4/difficulty-${settings.difficulty}`, tracker.COMPLETABLETYPE.LEVEL)
	.initialized()
	.send();

// on finish:
const completable = tracker
	.completable(`Level4/difficulty-${settings.difficulty}`, tracker.COMPLETABLETYPE.LEVEL);
completable.initialized();
await completable.completed(won, true, score).send();
```

One statement per difficulty setting. The id encodes the variable you want to slice by, which
means you can group on it later without having invented a custom extension.

## Hint usage

The player used a hint. That is a `gameObject`, and the interesting part is the context:

```js
await tracker.gameObject('Hint/Puzzle2', tracker.GAMEOBJECTTYPE.ITEM)
	.used()
	.withContextActivity('parent', `${baseUri}/puzzles/Puzzle2`)
	.send();
```

The parent puts the hint in relation to the puzzle it was used on, so the LRS can tell you that
Puzzle 2's hints were reached *during that puzzle* rather than somewhere in the session.

## A dialogue where the player backs out

Both halves are worth having:

```js
// the dialogue was reached
await tracker.accessible('Dialog/NPCIntro', tracker.ACCESSIBLETYPE.SCREEN).accessed().send();

// the player picked an option
await tracker.alternative('Dialog/NPCIntro/ask-about-smith', tracker.ALTERNATIVETYPE.DIALOG)
	.selected('option-refuse')
	.send();
```

The selected option is the response on the alternative statement, so you get the branch
distribution without inventing an extension for it.

## A quiz

The object describes the interaction, which is what makes the response meaningful:

```js
await tracker.trace('answered', tracker.ALL.ACTIVITYTYPES.CMI_INTERACTION, 'quiz-final-q3')
	.withInteractionType('choice')
	.withInteractionWithLang('choice', 'option-a', 'en', 'Mercury')
	.withInteractionWithLang('choice', 'option-b', 'en', 'Venus')
	.withInteractionWithLang('choice', 'option-c', 'en', 'Mars')
	.withCorrectResponsesPattern(['option-b'])
	.withResponse('option-c')
	.withSuccess(false)
	.withCompletion(true)
	.send();
```

`correctResponsesPattern` is what lets a consumer score the attempt after the fact. `success`
still tells you the same thing directly, so you are not obliged to describe the choices — but
when the answer set lives in the statement, the LRS is self-contained.

## An epic that could not be finished

```js
const session = tracker.completable('campaign-run-1', tracker.COMPLETABLETYPE.SESSION);
await session.initialized().send();

// hours later, the player quits to the menu
await session.completed(false, false, 0.35).send();
```

`success: false` with `completion: false` and a partial score is a distinct, useful statement: the
player stopped. Distinguishing that from "completed, score 0.35" is worth the two extra fields.

## See also

- [How to name statements](name-your-statements.md) — why these examples use the ids they do
- [How to record score and duration](record-score-and-duration.md)
- [API reference](../reference/game-objects.md) — every activity type constant
