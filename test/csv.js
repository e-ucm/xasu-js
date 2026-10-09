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

describe('SeriousGameTracker CSV export', function() {
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

	/**
	 * Splits a CSV row into its fields, honouring the backslash escaping of the separators
	 * @param  {string} row the CSV row
	 * @returns {string[]} the fields of the row
	 */
	function parseCSV(row) {
		const fields = [];
		let field = '';
		for (let i = 0; i < row.length; i++) {
			if (row[i] === '\\' && row[i + 1] === ',') {
				field += ',';
				i++;
			} else if (row[i] === ',') {
				fields.push(field);
				field = '';
			} else {
				field += row[i];
			}
		}
		fields.push(field);
		return fields;
	}

	/**
	 * Splits a CSV row into its first four fields, which hold the timestamp, the verb, the
	 * type and the id, and the remaining ones, which come in key/value pairs describing the result
	 * @param  {string} row the CSV row
	 * @returns {Object} the envelope and the result pairs of the row
	 */
	function splitRow(row) {
		const fields = parseCSV(row);
		return {
			timestamp: fields[0],
			verb: fields[1],
			type: fields[2],
			id: fields[3],
			result: fields.slice(4)
		};
	}

	/**
	 * Reads a CSV row as a plain object, the result fields being key/value pairs
	 * @param  {string} row the CSV row
	 * @returns {Object} the result of the row
	 */
	function resultOf(row) {
		const pairs = splitRow(row).result;
		const result = {};
		for (let i = 0; i < pairs.length; i += 2) {
			result[pairs[i]] = pairs[i + 1];
		}
		return result;
	}

	it('starts the row with the timestamp, even when there is none', function() {
		const row = tracker.completable('c1').initialized().statement.toCSV();

		expect(row.startsWith(',')).to.equal(true);
	});

	it('writes the verb, the type and the id as absolute URIs', function() {
		const row = splitRow(tracker.completable('c1', tracker.COMPLETABLETYPE.QUEST).initialized().statement.toCSV());

		expect(row.verb).to.equal('http://adlnet.gov/expapi/verbs/initialized');
		expect(row.type).to.equal('https://w3id.org/xapi/seriousgames/activity-types/quest');
		expect(row.id).to.equal(`${EXT}/c1`);
	});

	describe('result', function() {
		it('writes nothing while the statement carries no result', function() {
			expect(resultOf(tracker.accessible('a1').accessed().statement.toCSV())).to.deep.equal({});
		});

		it('writes the response', function() {
			const row = tracker.alternative('q1', tracker.ALTERNATIVETYPE.PATH)
				.selected('optionB')
				.statement.toCSV();

			expect(resultOf(row)).to.deep.equal({ response: 'optionB' });
		});

		it('writes success, completion and the score', function() {
			const completable = tracker.completable('c2', tracker.COMPLETABLETYPE.RACE);
			completable.initialized().send();
			const row = completable.completed(true, false, 0.54).statement.toCSV();
			const result = resultOf(row);

			expect(result.success).to.equal('true');
			expect(result.completion).to.equal('false');
			expect(result.score).to.equal('0.54');
		});

		it('writes every score part that is set', function() {
			const row = tracker.trace('selected', 'zone', 'a1')
				.withScore({ raw: 1.1, min: 2.2, max: 3.3, scaled: 4.4 })
				.statement.toCSV();
			const result = resultOf(row);

			expect(result).to.deep.equal({
				score: '1.1',
				score_min: '2.2',
				score_max: '3.3',
				score_scaled: '4.4'
			});
		});

		it('writes the progress under the serious games extension', function() {
			const row = tracker.completable('c3', tracker.COMPLETABLETYPE.STAGE)
				.progressed(0.34)
				.statement.toCSV();

			expect(resultOf(row)).to.deep.equal({
				'https://w3id.org/xapi/seriousgames/extensions/progress': '0.34'
			});
		});

		it('writes the extensions under the key they were given', function() {
			const row = tracker.accessible('a2').skipped()
				.withResultExtensions({ e1: 'v1', e2: 2 })
				.statement.toCSV();

			expect(resultOf(row)).to.deep.equal({ e1: 'v1', e2: '2' });
		});

		it('writes a map extension as key=value pairs', function() {
			const row = tracker.trace('selected', 'zone', 'a1')
				.withResultExtension('sub', { a: 1, b: 'two' })
				.statement.toCSV();

			expect(resultOf(row).sub).to.equal('a=1-b=two');
		});
	});

	describe('escaping', function() {
		it('escapes the separators of the id', function() {
			const row = splitRow(tracker.trace('Verb', 'Type', 'I,D').statement.toCSV());

			expect(row.id).to.equal(`${EXT}/I,D`);
		});

		it('leaves the separators of the verb and of the type untouched', function() {
			const row = splitRow(tracker.trace('Ve,rb', 'Ty,pe', 'ID').statement.toCSV());

			expect(row.verb).to.equal(`${EXT}/Ve`);
			expect(row.type).to.equal('rb');
		});

		it('escapes the separators of the response', function() {
			const row = tracker.alternative('q1').selected('a,b').statement.toCSV();

			expect(resultOf(row).response).to.equal('a,b');
		});

		it('escapes the separators of the extensions', function() {
			const row = tracker.trace('Verb', 'Type', 'ID')
				.withResultExtensions({ e1: 'ex,2', 'e,1': 'ex,2,' })
				.statement.toCSV();
			const result = resultOf(row);

			expect(result.e1).to.equal('ex,2');
			expect(result['e,1']).to.equal('ex,2,');
		});
	});
});
