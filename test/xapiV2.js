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

// The tracker classes are exercised through the built bundle: src/xasu-js.js imports JSON
// locales, which only the bundler can resolve, so it cannot be imported directly by Node.
// Run npm run build before this test.
import { expect } from 'chai';
import { SeriousGameTracker } from '../dist/xasu-js.bundle.js';

const EXT = 'https://simva.example';

describe('SeriousGameTracker instances', function() {
	let tracker;

	beforeEach(function() {
		tracker = new SeriousGameTracker();
		tracker.trackerSettings.oauth_type = 'OAuth0';
		tracker.trackerSettings.default_uri = EXT;
		tracker.trackerSettings.platform = EXT;
		tracker.trackerSettings.actor_name = 'player1';
		tracker.start();
	});

	afterEach(function() {
		// stop() cancels the pending batch timer, otherwise it would keep mocha alive
		tracker.stop();
	});

	describe('caching', function() {
		it('hands out the same instance for the same id and type', function() {
			expect(tracker.gameObject('sword')).to.equal(tracker.gameObject('sword'));
			expect(tracker.completable('level1')).to.equal(tracker.completable('level1'));
			expect(tracker.alternative('q1')).to.equal(tracker.alternative('q1'));
			expect(tracker.accessible('menu')).to.equal(tracker.accessible('menu'));
		});

		it('hands out a different instance for a different type', function() {
			expect(tracker.gameObject('sword'))
				.to.not.equal(tracker.gameObject('sword', tracker.GAMEOBJECTTYPE.NPC));
			expect(tracker.completable('x'))
				.to.not.equal(tracker.completable('x', tracker.COMPLETABLETYPE.LEVEL));
		});

		it('keeps the instances of the four kinds apart', function() {
			expect(tracker.gameObject('shared')).to.not.equal(tracker.completable('shared'));
		});

		it('starts each kind with its own default type', function() {
			expect(tracker.gameObject('a').Type)
				.to.equal(tracker.SERIOUSGAMEPROFILE.ACTIVITYTYPES.ITEM);
			expect(tracker.completable('a').Type)
				.to.equal(tracker.SERIOUSGAMEPROFILE.ACTIVITYTYPES.SERIOUS_GAME);
			expect(tracker.alternative('a').Type).to.equal(tracker.ALL.ACTIVITYTYPES.ASSESSMENT);
			expect(tracker.accessible('a').Type)
				.to.equal(tracker.SERIOUSGAMEPROFILE.ACTIVITYTYPES.AREA);
		});
	});

	describe('exposing the profile ids', function() {
		it('reaches the serious games profile through the tracker', function() {
			expect(tracker.SERIOUSGAMEPROFILE.VERBS.ACCESSED)
				.to.equal('https://w3id.org/xapi/seriousgames/verbs/accessed');
		});

		it('reaches the four kinds of object type through the tracker', function() {
			expect(tracker.ACCESSIBLETYPE.SCREEN).to.be.a('string');
			expect(tracker.COMPLETABLETYPE.QUEST).to.be.a('string');
			expect(tracker.ALTERNATIVETYPE.QUESTION).to.be.a('string');
			expect(tracker.GAMEOBJECTTYPE.NPC).to.be.a('string');
		});

		it('reaches the statement ids through the tracker', function() {
			expect(tracker.STATEMENT_BUILDER_IDS).to.be.an('object');
			expect(tracker.STATEMENT_BUILDER_IDS.CONTEXT.ACTIVITIES.PARENT).to.be.a('string');
		});
	});

	describe('the parent activity', function() {
		it('is left out while no parent is configured', function() {
			const statement = tracker.completable('c1').initialized().toXAPI();

			expect(statement.context.contextActivities).to.not.have.property('parent');
		});

		it('is added to the context while a parent is configured', function() {
			const parented = new SeriousGameTracker();
			parented.trackerSettings.oauth_type = 'OAuth0';
			parented.trackerSettings.default_uri = EXT;
			parented.trackerSettings.platform = EXT;
			parented.trackerSettings.parent_activity_id = `${EXT}/simlets/1/sessions/2`;
			parented.start();

			const context = parented.completable('c1').initialized().statement.context.contextActivities;

			expect(context.parent[0].id).to.equal(`${EXT}/simlets/1/sessions/2`);
			parented.stop();
		});
	});
});
