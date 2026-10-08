/*
 * Copyright 2025 e-UCM, Universidad Complutense de Madrid
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *	 http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

// The tracker classes are exercised through the built bundle: src/js-tracker.js imports JSON
// locales, which only the bundler can resolve, so it cannot be imported directly by Node.
// Run npm run build before this test.
import { expect } from 'chai';
import { JSScormTracker, JSTracker, SeriousGameTracker } from '../dist/js-tracker.bundle.js';

const EXT = 'https://simva.example';

/**
 * Builds a started tracker of the given class
 * @param  {Function} [TrackerClass] the tracker class to instantiate
 * @returns {Object} the started tracker
 */
function started(TrackerClass = SeriousGameTracker) {
	const tracker = new TrackerClass();
	tracker.trackerSettings.oauth_type = 'OAuth0';
	tracker.trackerSettings.default_uri = EXT;
	tracker.trackerSettings.platform = EXT;
	tracker.trackerSettings.actor_name = 'player1';
	tracker.start();
	return tracker;
}

describe('the ids of the xAPI profiles', function() {
	let tracker;

	beforeEach(function() {
		tracker = started(JSTracker);
	});

	afterEach(function() {
		// stop() cancels the pending batch timer, otherwise it would keep mocha alive
		tracker.stop();
	});

	const ALL = new JSTracker().ALL;

	describe('their shape', function() {
		it('exposes the five groups of ids the statements need', function() {
			expect(ALL).to.have.all.keys(
				'ACTIVITYTYPES', 'ACTIVITYEXTENSION', 'CATEGORYID', 'CONTEXTEXTENSION', 'RESULTEXTENSION', 'VERBS');
		});

		it('exposes every group as a frozen map', function() {
			['ACTIVITYTYPES', 'ACTIVITYEXTENSION', 'CATEGORYID', 'CONTEXTEXTENSION', 'RESULTEXTENSION', 'VERBS']
				.forEach(group => {
					expect(ALL[group], group).to.be.an('object');
					expect(Object.isFrozen(ALL[group]), group).to.equal(true);
				});
		});

		it('gives every id a value that is an absolute IRI', function() {
			// an id that is not absolute would be resolved against the default URI of a tracker,
			// which would silently point it at the game instead of at the profile that owns it
			Object.entries(ALL).forEach(([group, ids]) => {
				Object.entries(ids).forEach(([key, value]) => {
					expect(value, `${group}.${key}`).to.match(/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\/[^\s/$.?#].[^\s]*$/);
				});
			});
		});

		it('agrees on the id of every name that several profiles share', function() {
			// the ids are merged from every profile, so an id may carry an unqualified name and one
			// name per profile; whichever number of names it has, they must all hold the same IRI
			['VERBS', 'ACTIVITYTYPES', 'ACTIVITYEXTENSION', 'CONTEXTEXTENSION', 'RESULTEXTENSION']
				.forEach(group => {
					const byId = new Map();
					Object.entries(ALL[group]).forEach(([key, value]) => {
						if (!byId.has(value)) byId.set(value, []);
						byId.get(value).push(key);
					});
					byId.forEach((keys, value) => {
						expect(keys.length, `${group}: ${value}`).to.be.above(0);
					});
				});
		});

		it('agrees between an unqualified name and the qualified ones that share an IRI', function() {
			// an id may be declared by several profiles, in which case every name for it holds the
			// same IRI; where two profiles use different IRIs for the same concept, the unqualified
			// name resolves to one of them and each qualified name to its own
			const qualified = /^[A-Z0-9]+PROFILE_[A-Z0-9_]+$/;
			Object.entries(ALL).forEach(([group, ids]) => {
				Object.entries(ids).forEach(([key, value]) => {
					if (!qualified.test(key)) return;
					const unqualified = key.substring(key.indexOf('_') + 1);
					if (unqualified in ids && ids[unqualified] === value) {
						expect(ids[unqualified], `${group}.${key} against ${group}.${unqualified}`)
							.to.equal(value);
					}
				});
			});
		});

		it('keeps the IRI of a qualified name when the profiles disagree on one', function() {
			// ANNOTATED is declared by two profiles that use different IRIs, which is why the ids
			// carry a qualified name: each one has to keep the IRI of its own profile
			expect(ALL.VERBS.ACROSSXPROFILE_ANNOTATED)
				.to.equal('https://w3id.org/xapi/acrossx/verbs/annotated');
			expect(ALL.VERBS.PDFANNOTATORPROFILE_ANNOTATED)
				.to.equal('http://risc-inc.com/annotator/verbs/annotated');
			expect(ALL.VERBS.ANNOTATED).to.not.equal(ALL.VERBS.ACROSSXPROFILE_ANNOTATED);
		});
	});

	describe('the serious games profile', function() {
		it('carries the id of the category it declares', function() {
			expect(ALL.CATEGORYID.SERIOUSGAMESPROFILE).to.equal('https://w3id.org/xapi/seriousgames/v1.0');
		});

		it('carries the verbs the tracker sends', function() {
			expect(ALL.VERBS.SERIOUSGAMESPROFILE_ACCESSED)
				.to.equal('https://w3id.org/xapi/seriousgames/verbs/accessed');
			expect(ALL.VERBS.SERIOUSGAMESPROFILE_USED)
				.to.equal('https://w3id.org/xapi/seriousgames/verbs/used');
			expect(ALL.VERBS.SERIOUSGAMESPROFILE_UNLOCKED)
				.to.equal('https://w3id.org/xapi/seriousgames/verbs/unlocked');
		});

		it('carries the activity types the tracker sends', function() {
			expect(ALL.ACTIVITYTYPES.QUEST)
				.to.equal('https://w3id.org/xapi/seriousgames/activity-types/quest');
			expect(ALL.ACTIVITYTYPES.NON_PLAYER_CHARACTER)
				.to.equal('https://w3id.org/xapi/seriousgames/activity-types/non-player-character');
			expect(ALL.ACTIVITYTYPES.SERIOUS_GAME)
				.to.equal('https://w3id.org/xapi/seriousgames/activity-types/serious-game');
		});

		it('carries the result extensions the tracker sends', function() {
			expect(ALL.RESULTEXTENSION.SERIOUSGAMESPROFILE_PROGRESS)
				.to.equal('https://w3id.org/xapi/seriousgames/extensions/progress');
			expect(ALL.RESULTEXTENSION.SERIOUSGAMESPROFILE_HEALTH)
				.to.equal('https://w3id.org/xapi/seriousgames/extensions/health');
		});
	});

	describe('the other profiles', function() {
		it('carries the ids of the video profile', function() {
			expect(ALL.VERBS.VIDEOPROFILE_PLAYED).to.equal('https://w3id.org/xapi/video/verbs/played');
			expect(ALL.CATEGORYID.VIDEOPROFILE).to.equal('https://w3id.org/xapi/video/v/2');
			expect(ALL.RESULTEXTENSION.VIDEOPROFILE_PROGRESS)
				.to.equal('https://w3id.org/xapi/video/extensions/progress');
		});

		it('carries the ids of the cmi5 profile', function() {
			expect(ALL.CATEGORYID.CMI5PROFILE)
				.to.equal('https://w3id.org/xapi/cmi5/context/categories/cmi5/v/7');
			expect(ALL.CONTEXTEXTENSION.CMI5PROFILE_SESSION_ID)
				.to.equal('https://w3id.org/xapi/cmi5/context/extensions/sessionid');
			expect(ALL.RESULTEXTENSION.CMI5PROFILE_REASON)
				.to.equal('https://w3id.org/xapi/cmi5/result/extensions/reason');
		});

		it('carries the ids of the scorm profile', function() {
			expect(ALL.VERBS.SCORMPROFILE_INITIALIZED)
				.to.equal('http://adlnet.gov/expapi/verbs/initialized');
			expect(ALL.ACTIVITYTYPES.LESSON).to.equal('http://adlnet.gov/expapi/activities/lesson');
		});

		it('carries the ids of the adb profile', function() {
			expect(ALL.VERBS.ACTIONABLEDATABOOKADBPROFILE_SELECTED)
				.to.equal('https://w3id.org/xapi/adb/verbs/selected');
		});

		it('carries the ids of the acrossx profile', function() {
			expect(ALL.RESULTEXTENSION.ACROSSXPROFILE_RUBRICS)
				.to.equal('https://w3id.org/xapi/acrossx/extensions/rubrics');
			expect(ALL.ACTIVITYEXTENSION.ACROSSXPROFILE_PASS_SCORE)
				.to.equal('https://w3id.org/xapi/acrossx/extensions/pass-score');
		});

		it('carries the ids of the tincan vocabulary profile', function() {
			expect(ALL.VERBS.TINCANVOCABULARYPROFILE_SELECTED)
				.to.equal('http://id.tincanapi.com/verb/selected');
			expect(ALL.VERBS.TINCANVOCABULARYPROFILE_SKIPPED)
				.to.equal('http://id.tincanapi.com/verb/skipped');
		});

		it('carries the ids of the adl vocabulary profile', function() {
			expect(ALL.ACTIVITYTYPES.PROFILE).to.equal('http://adlnet.gov/expapi/activities/profile');
			expect(ALL.ACTIVITYTYPES.QUESTION).to.equal('http://adlnet.gov/expapi/activities/question');
			expect(ALL.ACTIVITYTYPES.ASSESSMENT).to.equal('http://adlnet.gov/expapi/activities/assessment');
			expect(ALL.ACTIVITYTYPES.CMI_INTERACTION)
				.to.equal('http://adlnet.gov/expapi/activities/cmi.interaction');
		});

		it('keeps a name per profile for an id that several profiles share', function() {
			// the profiles agree on this verb, so both names have to be there and have to agree
			expect(ALL.VERBS.INITIALIZED).to.equal(ALL.VERBS.SCORMPROFILE_INITIALIZED);
			expect(ALL.VERBS.COMPLETED).to.equal(ALL.VERBS.SCORMPROFILE_COMPLETED);
		});
	});
});

describe('statements built with the ids of other profiles', function() {
	let tracker;

	beforeEach(function() {
		tracker = started(JSTracker);
	});

	afterEach(function() {
		tracker.stop();
	});

	const ALL = new JSTracker().ALL;

	describe('verbs', function() {
		it('sends a verb taken from another profile unchanged', function() {
			const statement = tracker.trace(ALL.VERBS.VIDEOPROFILE_PLAYED, ALL.ACTIVITYTYPES.VIDEO, 'v1').toXAPI();

			expect(statement.verb.id).to.equal('https://w3id.org/xapi/video/verbs/played');
		});

		it('sends the tincan vocabulary verb unchanged', function() {
			const statement = tracker
				.trace(ALL.VERBS.TINCANVOCABULARYPROFILE_SELECTED, ALL.ACTIVITYTYPES.QUESTION, 'q1')
				.toXAPI();

			expect(statement.verb.id).to.equal('http://id.tincanapi.com/verb/selected');
		});

		it('takes the display of the verb out of its IRI', function() {
			const statement = tracker
				.trace(ALL.VERBS.VIDEOPROFILE_PLAYED, ALL.ACTIVITYTYPES.VIDEO, 'v1')
				.toXAPI();

			expect(statement.verb.display).to.deep.equal({ en: 'played' });
		});

		it('lets a verb of another profile be overridden for one language', function() {
			const statement = tracker
				.trace(ALL.VERBS.VIDEOPROFILE_PLAYED, ALL.ACTIVITYTYPES.VIDEO, 'v1')
				.withVerbDisplay('es', 'reprodujo')
				.toXAPI();

			expect(statement.verb.display).to.deep.equal({ en: 'played', es: 'reprodujo' });
		});

		it('does not resolve a verb of another profile against the default URI', function() {
			const statement = tracker.trace(ALL.VERBS.DODISDPROFILE_ANSWERED, 'question', 'q1').toXAPI();

			expect(statement.verb.id).to.equal('https://w3id.org/xapi/dod-isd/verbs/answered');
		});
	});

	describe('activity types', function() {
		it('sends an activity type of another profile unchanged', function() {
			const statement = tracker
				.trace(ALL.VERBS.VIDEOPROFILE_PLAYED, ALL.ACTIVITYTYPES.VIDEO, 'v1')
				.toXAPI();

			expect(statement.object.definition.type).to.equal(ALL.ACTIVITYTYPES.VIDEO);
		});

		it('keeps the id of the activity separate from its type', function() {
			const statement = tracker
				.trace(ALL.VERBS.VIDEOPROFILE_PLAYED, ALL.ACTIVITYTYPES.VIDEO, 'v1')
				.toXAPI();

			expect(statement.object.id).to.equal(`${EXT}/v1`);
			expect(statement.object.definition.type).to.equal(ALL.ACTIVITYTYPES.VIDEO);
		});

		it('builds an interaction object out of the cmi interaction type', function() {
			const statement = tracker
				.trace(ALL.VERBS.DODISDPROFILE_ANSWERED, ALL.ACTIVITYTYPES.CMI_INTERACTION, 'q1')
				.withInteractionType('choice')
				.withInteractionWithLang('choice', 'c1', 'en', 'First')
				.toXAPI();

			expect(statement.object.definition.type)
				.to.equal('http://adlnet.gov/expapi/activities/cmi.interaction');
			expect(statement.object.definition.interactionType).to.equal('choice');
		});
	});

	describe('result extensions', function() {
		it('sends a result extension of another profile unchanged', function() {
			const key = ALL.RESULTEXTENSION.ACROSSXPROFILE_RUBRICS;
			const statement = tracker.trace('v', 't', 'i').withResultExtension(key, 'a rubric').toXAPI();

			expect(statement.result.extensions).to.deep.equal({ [key]: 'a rubric' });
		});

		it('resolves the short name of a result extension to its IRI', function() {
			const statement = tracker
				.trace(ALL.VERBS.VIDEOPROFILE_PLAYED, ALL.ACTIVITYTYPES.VIDEO, 'v1')
				.withResultExtension('HEALTH', 100)
				.toXAPI();

			expect(statement.result.extensions)
				.to.deep.equal({ 'https://w3id.org/xapi/seriousgames/extensions/health': 100 });
		});

		it('resolves the short name of an extension of another profile', function() {
			const statement = tracker
				.trace('v', 't', 'i')
				.withResultExtension('SATISFACTION_SCORE', 4)
				.toXAPI();

			expect(statement.result.extensions).to.deep.equal({
				'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/satisfaction-score': 4
			});
		});

		it('resolves a short name that names the progress of the video profile', function() {
			// PROGRESS is an unqualified name, so it resolves to the first profile that declared it,
			// which is the video one rather than the serious games one
			const statement = tracker
				.trace(ALL.VERBS.VIDEOPROFILE_PLAYED, ALL.ACTIVITYTYPES.VIDEO, 'v1')
				.withResultExtension('PROGRESS', 0.5)
				.toXAPI();

			expect(statement.result.extensions)
				.to.deep.equal({ [ALL.RESULTEXTENSION.VIDEOPROFILE_PROGRESS]: 0.5 });
		});

		it('resolves the qualified name of the progress of the serious games profile', function() {
			const statement = tracker
				.trace(ALL.VERBS.SERIOUSGAMESPROFILE_ACCESSED, ALL.ACTIVITYTYPES.AREA, 'a1')
				.withResultExtension(ALL.RESULTEXTENSION.SERIOUSGAMESPROFILE_PROGRESS, 0.5)
				.toXAPI();

			expect(statement.result.extensions)
				.to.deep.equal({ [ALL.RESULTEXTENSION.SERIOUSGAMESPROFILE_PROGRESS]: 0.5 });
		});

		it('sends the progress of a completable under the serious games extension', function() {
			const game = started(SeriousGameTracker);
			const statement = game.completable('level1', ALL.ACTIVITYTYPES.QUEST).progressed(0.34).toXAPI();

			expect(statement.result.extensions)
				.to.deep.equal({ [ALL.RESULTEXTENSION.SERIOUSGAMESPROFILE_PROGRESS]: 0.34 });

			game.stop();
		});

		it('keeps a result extension of another profile next to a score', function() {
			const statement = tracker
				.trace('v', 't', 'i')
				.withScore({ raw: 4, max: 10 })
				.withResultExtension(ALL.RESULTEXTENSION.CMI5PROFILE_REASON, 'too fast')
				.toXAPI();

			expect(statement.result).to.deep.equal({
				score: { raw: 4, max: 10 },
				extensions: { 'https://w3id.org/xapi/cmi5/result/extensions/reason': 'too fast' }
			});
		});

		it('leaves a result extension that is not a number alone', function() {
			const statement = tracker
				.trace('v', 't', 'i')
				.withResultExtension(ALL.RESULTEXTENSION.SERIOUSGAMESPROFILE_POSITION, { x: 1, y: 2 })
				.toXAPI();

			expect(statement.result.extensions)
				.to.deep.equal({ 'https://w3id.org/xapi/seriousgames/extensions/position': { x: 1, y: 2 } });
		});
	});

	describe('context extensions', function() {
		it('sends a context extension of another profile unchanged', function() {
			const key = ALL.CONTEXTEXTENSION.CMI5PROFILE_LAUNCH_MODE;
			const statement = tracker.trace('v', 't', 'i').withContextExtension(key, 'Normal').toXAPI();

			expect(statement.context.extensions).to.deep.equal({ [key]: 'Normal' });
		});

		it('keeps a context extension of the cmi5 profile out of the default URI', function() {
			const statement = tracker
				.trace('v', 't', 'i')
				.withContextExtension(ALL.CONTEXTEXTENSION.CMI5PROFILE_SESSION_ID, 'a-session')
				.toXAPI();

			expect(statement.context.extensions).to.deep.equal({
				'https://w3id.org/xapi/cmi5/context/extensions/sessionid': 'a-session'
			});
		});
	});

	describe('activity extensions', function() {
		it('sends an activity extension of another profile unchanged', function() {
			const statement = tracker
				.trace('v', 't', 'i')
				.withObjectExtension(ALL.ACTIVITYEXTENSION.ACROSSXPROFILE_PASS_SCORE, 70)
				.toXAPI();

			expect(statement.object.definition.extensions).to.deep.equal({
				'https://w3id.org/xapi/acrossx/extensions/pass-score': 70
			});
		});
	});

	describe('categories', function() {
		it('categorizes a statement with the category of another profile', function() {
			const categorised = started(JSTracker);
			categorised.trackerSettings.category = ALL.CATEGORYID.VIDEOPROFILE;
			categorised.start();

			const statement = categorised
				.trace(ALL.VERBS.VIDEOPROFILE_PLAYED, ALL.ACTIVITYTYPES.VIDEO, 'v1')
				.toXAPI();
			const category = statement.context.contextActivities.category[0];

			expect(category.id).to.equal('https://w3id.org/xapi/video/v/2');
			expect(category.definition.type).to.equal('http://adlnet.gov/expapi/activities/profile');

			categorised.stop();
		});

		it('declares no category while the tracker sets none', function() {
			const statement = tracker.trace('v', 't', 'i').toXAPI();

			expect(statement.context).to.not.have.property('contextActivities');
		});

		it('keeps the serious games category of a serious game', function() {
			const game = started(SeriousGameTracker);
			const statement = game.completable('level1').initialized().toXAPI();

			expect(statement.context.contextActivities.category[0].id)
				.to.equal(ALL.CATEGORYID.SERIOUSGAMESPROFILE);

			game.stop();
		});
	});
});

describe('the serious game trackers against the profile they use', function() {
	let tracker;

	beforeEach(function() {
		tracker = started(SeriousGameTracker);
	});

	afterEach(function() {
		tracker.stop();
	});

	const ALL = new JSTracker().ALL;
	const SG = ALL.ACTIVITYTYPES;

	describe('accessible', function() {
		it('sends the accessed verb of the profile', function() {
			const statement = tracker.accessible('menu1', tracker.ACCESSIBLETYPE.SCREEN).accessed().toXAPI();

			expect(statement.verb.id).to.equal(ALL.VERBS.SERIOUSGAMESPROFILE_ACCESSED);
			expect(statement.object.definition.type).to.equal(SG.SCREEN);
		});

		it('sends the skipped verb of the tincan vocabulary', function() {
			const statement = tracker.accessible('menu1', tracker.ACCESSIBLETYPE.SCREEN).skipped().toXAPI();

			expect(statement.verb.id).to.equal(ALL.VERBS.TINCANVOCABULARYPROFILE_SKIPPED);
		});

		it('offers the activity types of the profile', function() {
			expect(tracker.ACCESSIBLETYPE.SCREEN).to.equal(SG.SCREEN);
			expect(tracker.ACCESSIBLETYPE.AREA).to.equal(SG.AREA);
			expect(tracker.ACCESSIBLETYPE.ZONE).to.equal(SG.ZONE);
			expect(tracker.ACCESSIBLETYPE.CUTSCENE).to.equal(SG.CUTSCENE);
		});

		it('sends the activity type of every accessible it offers', function() {
			['SCREEN', 'AREA', 'ZONE', 'CUTSCENE'].forEach(name => {
				const statement = tracker.accessible(`menu-${name}`, tracker.ACCESSIBLETYPE[name]).accessed().toXAPI();

				expect(statement.object.definition.type, name).to.equal(SG[name]);
			});
		});
	});

	describe('alternative', function() {
		it('sends the selected verb of the tincan vocabulary', function() {
			const statement = tracker
				.alternative('q1', tracker.ALTERNATIVETYPE.QUESTION)
				.selected('optionB')
				.toXAPI();

			expect(statement.verb.id).to.equal(ALL.VERBS.TINCANVOCABULARYPROFILE_SELECTED);
			expect(statement.result.response).to.equal('optionB');
		});

		it('sends the unlocked verb of the profile', function() {
			const statement = tracker
				.alternative('q1', tracker.ALTERNATIVETYPE.QUESTION)
				.unlocked('optionB')
				.toXAPI();

			expect(statement.verb.id).to.equal(ALL.VERBS.SERIOUSGAMESPROFILE_UNLOCKED);
		});

		it('offers the question type of the adl vocabulary', function() {
			expect(tracker.ALTERNATIVETYPE.QUESTION).to.equal(ALL.ACTIVITYTYPES.QUESTION);
		});

		it('offers the menu and the dialog types of the profile', function() {
			expect(tracker.ALTERNATIVETYPE.MENU).to.equal(SG.MENU);
			expect(tracker.ALTERNATIVETYPE.DIALOG).to.equal(SG.DIALOG_TREE);
		});
	});

	describe('completable', function() {
		it('sends the initialized and the completed verbs of the adl vocabulary', function() {
			const first = tracker.completable('level1', tracker.COMPLETABLETYPE.QUEST);
			const initialized = first.initialized().toXAPI();

			const second = tracker.completable('level2', tracker.COMPLETABLETYPE.QUEST);
			second.initialized();
			const completed = second.completed(true, false, 1).toXAPI();

			expect(initialized.verb.id).to.equal(ALL.VERBS.INITIALIZED);
			expect(completed.verb.id).to.equal(ALL.VERBS.COMPLETED);
		});

		it('sends the progressed verb of the adl vocabulary', function() {
			const statement = tracker.completable('level1', tracker.COMPLETABLETYPE.QUEST).progressed(0.5).toXAPI();

			expect(statement.verb.id).to.equal(ALL.VERBS.PROGRESSED);
		});

		it('sends the level and the quest types of the profile', function() {
			expect(tracker.COMPLETABLETYPE.LEVEL).to.equal(SG.LEVEL);
			expect(tracker.COMPLETABLETYPE.QUEST).to.equal(SG.QUEST);
			expect(tracker.COMPLETABLETYPE.GAME).to.equal(SG.SERIOUS_GAME);
		});

		it('sends a completable type the profile server does not declare as it is given', function() {
			// the tracker documents these as not being in the profile server, so the id it sends is
			// the one it declares rather than one that came from the generated profile
			expect(tracker.COMPLETABLETYPE.STAGE)
				.to.equal('https://w3id.org/xapi/seriousgames/activity-types/stage');
			expect(tracker.COMPLETABLETYPE.RACE)
				.to.equal('https://w3id.org/xapi/seriousgames/activity-types/race');
			expect(tracker.COMPLETABLETYPE.COMBAT)
				.to.equal('https://w3id.org/xapi/seriousgames/activity-types/combat');
		});
	});

	describe('game object', function() {
		it('sends the interacted verb of the adl vocabulary', function() {
			const statement = tracker
				.gameObject('go1', tracker.GAMEOBJECTTYPE.NPC)
				.interacted()
				.toXAPI();

			expect(statement.verb.id).to.equal(ALL.VERBS.INTERACTED);
			expect(statement.object.definition.type).to.equal(SG.NON_PLAYER_CHARACTER);
		});

		it('sends the used verb of the profile', function() {
			const statement = tracker.gameObject('go1', tracker.GAMEOBJECTTYPE.ITEM).used().toXAPI();

			expect(statement.verb.id).to.equal(ALL.VERBS.SERIOUSGAMESPROFILE_USED);
		});

		it('offers the enemy, the non player character and the item types of the profile', function() {
			expect(tracker.GAMEOBJECTTYPE.ENEMY).to.equal(SG.ENEMY);
			expect(tracker.GAMEOBJECTTYPE.NPC).to.equal(SG.NON_PLAYER_CHARACTER);
			expect(tracker.GAMEOBJECTTYPE.ITEM).to.equal(SG.ITEM);
		});
	});
});

describe('the SCORM tracker against the scorm profile', function() {
	let tracker;

	beforeEach(function() {
		tracker = new JSScormTracker();
		tracker.trackerSettings.oauth_type = 'OAuth0';
		tracker.trackerSettings.default_uri = EXT;
		tracker.trackerSettings.platform = EXT;
		tracker.trackerSettings.actor_name = 'player1';
		tracker.trackerSettings.parent_activity_id = `${EXT}/course`;
		tracker.trackerSettings.parent_activity_type = tracker.SCORMPROFILE.ACTIVITYTYPES.LESSON;
	});

	afterEach(function() {
		// the tracker is only started by the tests that need to log in, so stop() is only
		// safe once it holds a tracker of its own
		if (tracker.tracker) tracker.stop();
	});

	const ALL = new JSTracker().ALL;

	it('exposes the scorm activity types', function() {
		expect(tracker.SCORMPROFILE.ACTIVITYTYPES.LESSON).to.equal(ALL.ACTIVITYTYPES.LESSON);
	});

	it('sends the verbs of the scorm profile', async function() {
		await tracker.login();
		tracker.start();

		const scorm = tracker.scorm('sc1', tracker.SCORMPROFILE.ACTIVITYTYPES.LESSON);

		expect(scorm.initialized().toXAPI().verb.id).to.equal(ALL.VERBS.SCORMPROFILE_INITIALIZED);
		expect(scorm.suspended().toXAPI().verb.id).to.equal(ALL.VERBS.SUSPENDED);
		expect(scorm.resumed().toXAPI().verb.id).to.equal(ALL.VERBS.RESUMED);
		expect(scorm.terminated().toXAPI().verb.id).to.equal(ALL.VERBS.TERMINATED);
		expect(scorm.passed().toXAPI().verb.id).to.equal(ALL.VERBS.PASSED);
		expect(scorm.failed().toXAPI().verb.id).to.equal(ALL.VERBS.FAILED);
	});

	it('sends the score of a completed scorm', async function() {
		await tracker.login();
		tracker.start();

		const scorm = tracker.scorm('sc1', tracker.SCORMPROFILE.ACTIVITYTYPES.LESSON);
		scorm.initialized();
		const statement = scorm.completed(true, true, 0.8).toXAPI();

		expect(statement.verb.id).to.equal(ALL.VERBS.COMPLETED);
		expect(statement.result.success).to.equal(true);
		expect(statement.result.completion).to.equal(true);
		expect(statement.result.score).to.deep.equal({ raw: 0.8 });
	});

	it('declares the parent activity it was given, with its type', async function() {
		await tracker.login();
		tracker.start();

		const parent = tracker.trace('v', 't', 'i').toXAPI()
			.context.contextActivities.parent[0];

		expect(parent.id).to.equal(`${EXT}/course`);
		expect(parent.definition.type).to.equal(ALL.ACTIVITYTYPES.LESSON);
	});

	it('reuses one instance per scorm id and type', async function() {
		await tracker.login();
		tracker.start();

		expect(tracker.scorm('sc1')).to.equal(tracker.scorm('sc1'));
		expect(tracker.scorm('sc1')).to.not.equal(tracker.scorm('sc2'));
	});
});
