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

import { expect } from 'chai';
import ContextStatement from '../src/HighLevel/Statement/ContextStatement.js';
import ObjectStatement from '../src/HighLevel/Statement/ObjectStatement.js';
import { STATEMENT } from '../src/HighLevel/Statement/Ids/Statements.js';

const BASE = 'https://simva.example';
const PARENT = STATEMENT.CONTEXT.ACTIVITIES.PARENT;
const GROUPING = STATEMENT.CONTEXT.ACTIVITIES.GROUPING;

describe('ContextStatement context activities', function() {
	/**
	 * Builds a context from an xAPI context object holding the given contextActivities
	 * @param  {any} contextActivities the malformed or well formed contextActivities value
	 * @returns {ContextStatement} the context built from it
	 */
	function contextWith(contextActivities) {
		const xapiContext = { registration: '18c01bd5-a384-42ad-a96a-9572d4674b87', platform: BASE };
		if (contextActivities !== undefined) {
			xapiContext.contextActivities = contextActivities;
		}
		return ContextStatement.fromXAPI(xapiContext, BASE);
	}

	/**
	 * The values a client may send for contextActivities: only an object keyed by relation is valid,
	 * the rest are malformed but must not lose the activities nor throw. Each case states how many
	 * parent activities survive the normalization, that is, how many the client contributed.
	 */
	const malformed = {
		'an array': { value: [], seeded: 0 },
		'an array of objects': { value: [{ id: `${BASE}/old` }], seeded: 0 },
		'a single object per relation': { value: { parent: { id: `${BASE}/old` } }, seeded: 1 },
		'an array per relation': { value: { parent: [{ id: `${BASE}/old` }] }, seeded: 1 },
		'a string per relation': { value: { parent: 'nonsense' }, seeded: 0 },
		'a null relation': { value: { parent: null }, seeded: 0 },
		'a number per relation': { value: { parent: 7 }, seeded: 0 },
		'a string instead of an object': { value: 'nonsense', seeded: 0 },
	};

	Object.keys(malformed).forEach(function(label) {
		it(`keeps the activities when the client sends ${label}`, function() {
			const context = contextWith(malformed[label].value);

			expect(context.contextActivities, 'contextActivities must not be an array').to.not.be.an('array');
			expect(context.contextActivities).to.be.an('object');

			context.addContextActivity(PARENT, `${BASE}/simlets/1`, `${BASE}/about#simlet`);
			context.addContextActivity(GROUPING, `${BASE}/simlets/1/sessions/2`, `${BASE}/about#session`);

			expect(context.contextActivities).to.have.property(PARENT);
			expect(context.contextActivities).to.have.property(GROUPING);
			expect(context.contextActivities[PARENT]).to.have.lengthOf(malformed[label].seeded + 1);
			expect(context.contextActivities[GROUPING]).to.have.lengthOf(1);

			// the added activities must survive the serialization that drops array string keys
			const serialized = context.toXAPI().contextActivities;
			expect(serialized[PARENT]).to.be.an('array').with.lengthOf(malformed[label].seeded + 1);
			expect(serialized[GROUPING]).to.be.an('array').with.lengthOf(1);
			expect(serialized[PARENT].pop().id).to.equal(`${BASE}/simlets/1`);
			expect(serialized[GROUPING][0].id).to.equal(`${BASE}/simlets/1/sessions/2`);

			// and the clone must not lose them either
			expect(context.clone().contextActivities).to.have.property(PARENT);
		});
	});

	it('keeps the activities already sent by the client', function() {
		const context = contextWith({ parent: [{ id: `${BASE}/old` }] });

		context.addContextActivity(PARENT, `${BASE}/simlets/1`, `${BASE}/about#simlet`);

		expect(context.contextActivities[PARENT]).to.have.lengthOf(2);
		expect(context.contextActivities[PARENT][0].id).to.equal(`${BASE}/old`);
		expect(context.contextActivities[PARENT][1].id).to.equal(`${BASE}/simlets/1`);
	});

	it('builds empty context activities when the client sends none', function() {
		const context = contextWith(undefined);

		expect(context.contextActivities).to.deep.equal({});

		context.addContextActivity(PARENT, `${BASE}/simlets/1`, `${BASE}/about#simlet`);

		expect(context.contextActivities).to.have.property(PARENT);
	});

	it('discards unknown relations instead of storing them', function() {
		const context = contextWith({});
		const before = Object.keys(context.contextActivities).length;

		context.addContextActivity('not-a-relation', `${BASE}/simlets/1`, `${BASE}/about#simlet`);

		expect(Object.keys(context.contextActivities)).to.have.lengthOf(before);
	});

	it('normalizes an array into an object keyed by relation', function() {
		expect(ContextStatement.normalizeContextActivities([{ id: 'a' }])).to.deep.equal({});
		expect(ContextStatement.normalizeContextActivities('nonsense')).to.deep.equal({});
		expect(ContextStatement.normalizeContextActivities(null)).to.deep.equal({});
		expect(ContextStatement.normalizeContextActivities({ parent: null })).to.deep.equal({});
		expect(ContextStatement.normalizeContextActivities({ parent: 'nonsense' })).to.deep.equal({});
		expect(ContextStatement.normalizeContextActivities({ parent: 7 })).to.deep.equal({});
		expect(ContextStatement.normalizeContextActivities({ parent: { id: 'a' } })).to.deep.equal({ parent: [{ id: 'a' }] });
	});
});

describe('ObjectStatement definition type', function() {
	it('accepts an object without the optional definition type', function() {
		expect(function() {
			ObjectStatement.fromXAPI({ id: `${BASE}/activities/1` }, BASE);
		}).to.not.throw();
	});

	it('omits the definition type when it is not given', function() {
		const object = ObjectStatement.fromXAPI({ id: `${BASE}/activities/1` }, BASE);

		expect(object.id).to.equal(`${BASE}/activities/1`);
		expect(object.toXAPI().definition).to.not.have.property('type');
	});

	it('keeps the definition type when it is given', function() {
		const object = ObjectStatement.fromXAPI(
			{ id: `${BASE}/activities/1`, definition: { type: `${BASE}/about#activity` } },
			BASE
		);

		expect(object.toXAPI().definition.type).to.equal(`${BASE}/about#activity`);
	});
});