/*
 * Copyright 2017 e-UCM, Universidad Complutense de Madrid
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
import { SeriousGameTracker, JSTracker } from '../dist/js-tracker.bundle.js';

const EXT = 'https://simva.example';

/**
 * Builds a started tracker whose ids resolve against the given base URI
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

describe('SeriousGameTracker xAPI statements', function() {
	let tracker;

	beforeEach(function() {
		tracker = started();
	});

	afterEach(function() {
		// stop() cancels the pending batch timer, otherwise it would keep mocha alive
		tracker.stop();
	});

	it('builds a statement for every member of the statement envelope', function() {
		const statement = tracker.completable('level1', tracker.COMPLETABLETYPE.QUEST).initialized().toXAPI();

		expect(statement).to.have.all.keys('id', 'actor', 'verb', 'object', 'context', 'version');
		expect(statement.id).to.match(/^[0-9a-f-]{36}$/);
		expect(statement.version).to.equal('1.0.3');
		expect(statement.actor).to.deep.equal({
			objectType: 'Agent',
			account: { name: 'player1', homePage: EXT }
		});
		expect(statement.context.platform).to.equal(EXT);
		expect(statement.context.registration).to.be.a('string');
	});

	it('omits the result while the statement carries none', function() {
		const statement = tracker.completable('level1').initialized().toXAPI();

		expect(statement).to.not.have.property('result');
	});

	describe('accessible', function() {
		it('records an accessed verb on the given activity type', function() {
			const statement = tracker.accessible('menu1', tracker.ACCESSIBLETYPE.CUTSCENE).accessed().toXAPI();

			expect(statement.verb.id).to.equal('https://w3id.org/xapi/seriousgames/verbs/accessed');
			expect(statement.object.definition.type)
				.to.equal('https://w3id.org/xapi/seriousgames/activity-types/cutscene');
			expect(statement.object.id).to.equal(`${EXT}/menu1`);
		});

		it('records a skipped verb with a result extension', function() {
			const statement = tracker.accessible('menu2', tracker.ACCESSIBLETYPE.SCREEN)
				.skipped()
				.withResultExtension('extension1', 'value1')
				.toXAPI();

			expect(statement.verb.id).to.equal('http://id.tincanapi.com/verb/skipped');
			expect(statement.object.definition.type)
				.to.equal('https://w3id.org/xapi/seriousgames/activity-types/screen');
			expect(statement.result.extensions[`${EXT}/extension1`]).to.equal('value1');
		});
	});

	describe('alternative', function() {
		it('records the selected option as the response', function() {
			const statement = tracker.alternative('q1', tracker.ALTERNATIVETYPE.PATH)
				.selected('optionB')
				.toXAPI();

			expect(statement.verb.id).to.equal('http://id.tincanapi.com/verb/selected');
			expect(statement.object.definition.type)
				.to.equal('https://w3id.org/xapi/seriousgames/activity-types/path');
			expect(statement.result.response).to.equal('optionB');
		});

		it('records the unlocked option and keeps extra extensions', function() {
			const statement = tracker.alternative('q2', tracker.ALTERNATIVETYPE.QUESTION)
				.unlocked('Answer number 3')
				.withResultExtension('SubCompletableScore', 0.8)
				.toXAPI();

			expect(statement.verb.id).to.equal('https://w3id.org/xapi/seriousgames/verbs/unlocked');
			expect(statement.object.definition.type).to.equal('http://adlnet.gov/expapi/activities/question');
			expect(statement.result.response).to.equal('Answer number 3');
			expect(statement.result.extensions[`${EXT}/SubCompletableScore`]).to.equal(0.8);
		});
	});

	describe('completable', function() {
		it('records an initialized verb', function() {
			const statement = tracker.completable('c1', tracker.COMPLETABLETYPE.QUEST).initialized().toXAPI();

			expect(statement.verb.id).to.equal('http://adlnet.gov/expapi/verbs/initialized');
			expect(statement.object.definition.type)
				.to.equal('https://w3id.org/xapi/seriousgames/activity-types/quest');
		});

		it('records the progress as the serious games progress extension', function() {
			const statement = tracker.completable('c2', tracker.COMPLETABLETYPE.STAGE)
				.progressed(0.34)
				.toXAPI();

			expect(statement.verb.id).to.equal('http://adlnet.gov/expapi/verbs/progressed');
			expect(statement.result.extensions['https://w3id.org/xapi/seriousgames/extensions/progress'])
				.to.equal(0.34);
		});

		it('records success, completion and score once completed after initialized', function() {
			const completable = tracker.completable('c3', tracker.COMPLETABLETYPE.RACE);
			completable.initialized().send();

			const statement = completable.completed(true, false, 0.54).toXAPI();

			expect(statement.verb.id).to.equal('http://adlnet.gov/expapi/verbs/completed');
			expect(statement.object.definition.type)
				.to.equal('https://w3id.org/xapi/seriousgames/activity-types/race');
			expect(statement.result.success).to.equal(true);
			expect(statement.result.completion).to.equal(false);
			expect(statement.result.score).to.deep.equal({ raw: 0.54 });
			expect(statement.result.duration).to.be.a('string');
		});

		it('refuses to complete a completable that was never initialized', function() {
			expect(tracker.completable('c4').completed()).to.be.undefined;
		});
	});

	describe('gameObject', function() {
		it('records an interacted verb', function() {
			const statement = tracker.gameObject('go1', tracker.GAMEOBJECTTYPE.NPC).interacted().toXAPI();

			expect(statement.verb.id).to.equal('http://adlnet.gov/expapi/verbs/interacted');
			expect(statement.object.definition.type)
				.to.equal('https://w3id.org/xapi/seriousgames/activity-types/non-player-character');
		});

		it('records a used verb', function() {
			const statement = tracker.gameObject('go2', tracker.GAMEOBJECTTYPE.ITEM).used().toXAPI();

			expect(statement.verb.id).to.equal('https://w3id.org/xapi/seriousgames/verbs/used');
			expect(statement.object.definition.type)
				.to.equal('https://w3id.org/xapi/seriousgames/activity-types/item');
		});
	});

	describe('trace', function() {
		it('resolves the verb, the type and the id against the default URI', function() {
			const statement = tracker.trace('accessed', 'gameobject', 'ObjectID').toXAPI();

			expect(statement.verb.id).to.equal(`${EXT}/accessed`);
			expect(statement.object.definition.type).to.equal(`${EXT}/gameobject`);
			expect(statement.object.id).to.equal(`${EXT}/ObjectID`);
		});

		it('keeps the parts that are already absolute URIs', function() {
			const statement = tracker.trace(
				'https://w3id.org/xapi/seriousgames/verbs/accessed',
				'https://w3id.org/xapi/seriousgames/activity-types/game-object',
				'https://simva.example/ObjectID'
			).toXAPI();

			expect(statement.verb.id).to.equal('https://w3id.org/xapi/seriousgames/verbs/accessed');
			expect(statement.object.definition.type)
				.to.equal('https://w3id.org/xapi/seriousgames/activity-types/game-object');
			expect(statement.object.id).to.equal('https://simva.example/ObjectID');
		});

		it('builds the result out of the chained result setters', function() {
			const statement = tracker.trace('selected', 'zone', 'ObjectID3')
				.withResponse('AnotherResponse')
				.withScore({ raw: 123.456 })
				.withSuccess(false)
				.withCompletion(true)
				.withResultExtensions({
					extension1: 'value1',
					extension2: 'value2',
					extension3: 3,
					extension4: 4.56
				})
				.toXAPI();

			expect(statement.result).to.have.all.keys('response', 'score', 'success', 'completion', 'extensions');
			expect(statement.result.response).to.equal('AnotherResponse');
			expect(statement.result.score).to.deep.equal({ raw: 123.456 });
			expect(statement.result.success).to.equal(false);
			expect(statement.result.completion).to.equal(true);
			expect(statement.result.extensions).to.deep.equal({
				[`${EXT}/extension1`]: 'value1',
				[`${EXT}/extension2`]: 'value2',
				[`${EXT}/extension3`]: 3,
				[`${EXT}/extension4`]: 4.56
			});
		});

		it('stores every score part that is given', function() {
			const statement = tracker.trace('selected', 'zone', 'a1')
				.withResponse('o1')
				.withScore({ raw: 1.1, min: 2.2, max: 3.3, scaled: 4.4 })
				.toXAPI();

			expect(statement.result.score).to.deep.equal({ raw: 1.1, min: 2.2, max: 3.3, scaled: 4.4 });
		});

		it('ignores the score parts that are left out', function() {
			const statement = tracker.trace('selected', 'zone', 'a1')
				.withScore({ raw: 1.1, max: 3.3 })
				.toXAPI();

			expect(statement.result.score).to.deep.equal({ raw: 1.1, max: 3.3 });
		});

		it('accepts the score parts one by one', function() {
			const statement = tracker.trace('selected', 'zone', 'a1')
				.withScoreRaw(1.1)
				.withScoreMin(2.2)
				.withScoreMax(3.3)
				.withScoreScaled(4.4)
				.toXAPI();

			expect(statement.result.score).to.deep.equal({ raw: 1.1, min: 2.2, max: 3.3, scaled: 4.4 });
		});

		it('converts a duration between two dates into an ISO 8601 string', function() {
			const init = new Date('2026-01-01T10:00:00.000Z');
			const end = new Date('2026-01-01T11:30:15.000Z');

			const statement = tracker.trace('selected', 'zone', 'a1').withDuration(init, end).toXAPI();

			expect(statement.result.duration).to.equal('P0DT1H30M15S');
		});

		it('carries the verb display, the object name and the context activity', function() {
			const statement = tracker.trace('selected', 'zone', 'a1')
				.withVerbDisplay('en', 'picked')
				.withObjectDefinitionName('en', 'Zone A')
				.withContextActivity('parent', `${EXT}/simlets/1`, `${EXT}/about#simlet`)
				.toXAPI();

			expect(statement.verb.display).to.deep.equal({ en: 'picked' });
			expect(statement.object.definition.name).to.deep.equal({ en: 'Zone A' });
			expect(statement.context.contextActivities.parent[0].id).to.equal(`${EXT}/simlets/1`);
		});
	});

	describe('without a started tracker', function() {
		it('refuses to build a trace', function() {
			expect(function() {
				new JSTracker().trace('v', 't', 'i');
			}).to.throw(/not initialized/);
		});
	});
});
