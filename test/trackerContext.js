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
import { SeriousGameTracker, JSTracker } from '../dist/js-tracker.bundle.js';

const EXT = 'https://simva.example';
const PROFILE_CATEGORY = 'https://w3id.org/xapi/seriousgames/v1.0';

describe('SeriousGameTracker category', function() {
	/**
	 * Builds a started tracker of the given class with the given settings
	 * @param  {Function} TrackerClass tracker to build
	 * @param  {Object} settings extra tracker settings
	 * @returns {Object} the started tracker
	 */
	function started(TrackerClass, settings = {}) {
		const tracker = new TrackerClass();
		tracker.trackerSettings.oauth_type = 'OAuth0';
		tracker.trackerSettings.default_uri = EXT;
		tracker.trackerSettings.platform = EXT;
		tracker.trackerSettings.actor_name = 'player1';
		Object.assign(tracker.trackerSettings, settings);
		tracker.start();
		return tracker;
	}

	it('categorizes every statement of a serious game by default', function() {
		const tracker = started(SeriousGameTracker);

		expect(tracker.trackerSettings.category).to.equal(PROFILE_CATEGORY);

		const statements = [
			tracker.completable('level1').initialized(),
			tracker.gameObject('sword').interacted(),
			tracker.accessible('menu').accessed(),
			tracker.alternative('question1').selected('optionB'),
			tracker.trace('http://activitystrea.ms/access', `${EXT}/about#activity`, `${EXT}/activities/1`)
		];

		statements.forEach(function(statement, index) {
			const contextActivities = statement.statement.context.contextActivities;
			expect(contextActivities, `statement ${index} must have contextActivities`).to.be.an('object');
			expect(contextActivities, `statement ${index} must be categorized`).to.have.property('category');
			expect(contextActivities.category[0].id).to.equal(PROFILE_CATEGORY);
		});
	});

	it('serializes the category of a serious game statement', function() {
		const tracker = started(SeriousGameTracker);

		const xapi = tracker.completable('level1').initialized().toXAPI();

		expect(xapi.context.contextActivities).to.have.property('category');
		expect(xapi.context.contextActivities.category[0].id).to.equal(PROFILE_CATEGORY);
		expect(xapi.context.contextActivities.category[0].definition.type)
			.to.equal('http://adlnet.gov/expapi/activities/profile');
	});

	it('keeps the category in the context used by the SCORM instances', function() {
		const tracker = started(SeriousGameTracker);

		expect(tracker.tracker.context_without_parent.contextActivities).to.have.property('category');
	});

	it('lets a game set its own category', function() {
		const tracker = started(SeriousGameTracker, { category: 'https://w3id.org/xapi/serious-game' });

		expect(tracker.completable('level1').initialized().toXAPI().context.contextActivities.category[0].id)
			.to.equal('https://w3id.org/xapi/serious-game');
	});

	it('lets a game disable the category', function() {
		const tracker = started(SeriousGameTracker, { category: '' });

		expect(tracker.completable('level1').initialized().toXAPI().context)
			.to.not.have.property('contextActivities');
	});

	it('keeps the category alongside the parent activity', function() {
		const tracker = started(SeriousGameTracker, {
			parent_activity_id: `${EXT}/simlets/1/sessions/2/activities/3`
		});

		const contextActivities = tracker.completable('level1').initialized().statement.context.contextActivities;

		expect(contextActivities).to.have.property('category');
		expect(contextActivities).to.have.property('parent');
	});

	it('does not categorize the statements of a plain tracker unless asked to', function() {
		const withoutCategory = started(JSTracker);

		expect(withoutCategory.trace('v', `${EXT}/about#activity`, `${EXT}/activities/1`).toXAPI().context)
			.to.not.have.property('contextActivities');

		const withCategory = started(JSTracker, { category: `${EXT}/about` });

		expect(withCategory.trace('v', `${EXT}/about#activity`, `${EXT}/activities/1`)
			.toXAPI().context.contextActivities.category[0].id).to.equal(`${EXT}/about`);
	});
});