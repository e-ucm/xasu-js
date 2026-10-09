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

// The tracker classes are exercised through the built bundle: src/xasu-js.js imports JSON
// locales, which only the bundler can resolve, so it cannot be imported directly by Node.
// Run npm run build before this test.
import { expect } from 'chai';
import { LRSTracker, SeriousGameTracker } from '../dist/xasu-js.bundle.js';

const EXT = 'https://simva.example';

describe('StatementBuilder', function() {
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
	 * Builds a statement for the given verb, type and id
	 * @param  {string} verb the verb id
	 * @param  {string} type the activity type
	 * @param  {string} id the activity id
	 * @returns {Object} the builder of the statement
	 */
	function builder(verb = 'accessed', type = 'gameobject', id = 'ObjectID') {
		return tracker.trace(verb, type, id);
	}

	describe('chaining', function() {
		it('returns the same builder from every setter', function() {
			const b = builder();

			expect(b.withResponse('r')).to.equal(b);
			expect(b.withSuccess(true)).to.equal(b);
			expect(b.withCompletion(true)).to.equal(b);
			expect(b.withScore({ raw: 1 })).to.equal(b);
			expect(b.withScoreRaw(1)).to.equal(b);
			expect(b.withScoreMin(0)).to.equal(b);
			expect(b.withScoreMax(2)).to.equal(b);
			expect(b.withScoreScaled(0.5)).to.equal(b);
			expect(b.withProgress(0.5)).to.equal(b);
			expect(b.withResultExtension('e', 'v')).to.equal(b);
			expect(b.withResultExtensions({ e: 'v' })).to.equal(b);
			expect(b.withDuration(new Date(0), new Date(1000))).to.equal(b);
			expect(b.withContextLanguage('es')).to.equal(b);
			expect(b.withContextPlatform('https://other.example')).to.equal(b);
			expect(b.withContextExtension('ce', 'v')).to.equal(b);
			expect(b.withContextActivity('parent', `${EXT}/p`)).to.equal(b);
			expect(b.withContextCategory(`${EXT}/about#category`)).to.equal(b);
			expect(b.withVerbDisplay('en', 'used')).to.equal(b);
			expect(b.withObjectDefinitionName('en', 'Sword')).to.equal(b);
			expect(b.withObjectDefinitionDescription('en', 'A sword')).to.equal(b);
			expect(b.withObjectExtension('oe', 'v')).to.equal(b);
			expect(b.withObjectExtensions({ oe: 'v' })).to.equal(b);
		});

		it('lets a chain be written in one expression', function() {
			const statement = builder()
				.withResponse('optionB')
				.withScore({ raw: 3 })
				.withSuccess(true)
				.toXAPI();

			expect(statement.result).to.deep.equal({
				response: 'optionB',
				score: { raw: 3 },
				success: true
			});
		});
	});

	describe('the result', function() {
		it('is left out while nothing was set', function() {
			expect(builder().toXAPI()).to.not.have.property('result');
		});

		it('is left out while it holds nothing but empty extensions', function() {
			builder().statement.result.setExtensions({});

			expect(builder().toXAPI()).to.not.have.property('result');
		});

		it('declares no extensions while they are empty', function() {
			const result = builder()
				.withResponse('optionB')
				.withResultExtensions({})
				.toXAPI().result;

			expect(result).to.deep.equal({ response: 'optionB' });
		});

		it('turns the score into numbers', function() {
			const result = builder().withScore({ raw: '4', min: '0', max: '10', scaled: '0.4' }).toXAPI().result;

			expect(result.score).to.deep.equal({ raw: 4, min: 0, max: 10, scaled: 0.4 });
		});

		it('keeps a score part that is zero', function() {
			// 0 is a legitimate score, so it must not be mistaken for an absent part
			const result = builder().withScore({ raw: 4, min: 0 }).toXAPI().result;

			expect(result.score).to.deep.equal({ raw: 4, min: 0 });
		});

		it('keeps every score part while they are all zero', function() {
			const result = builder().withScore({ raw: 0, min: 0, max: 0, scaled: 0 }).toXAPI().result;

			expect(result.score).to.deep.equal({ raw: 0, min: 0, max: 0, scaled: 0 });
		});

		it('keeps a negative score part', function() {
			const result = builder().withScore({ min: -5 }).toXAPI().result;

			expect(result.score).to.deep.equal({ min: -5 });
		});

		it('drops the score parts that are absent', function() {
			const result = builder().withScore({ raw: 4, min: undefined, max: null }).toXAPI().result;

			expect(result.score).to.deep.equal({ raw: 4 });
		});

		it('drops the score parts that are not a number', function() {
			// a part that is not a number would serialize as null, so it is left out instead
			const result = builder().withScore({ raw: 4, min: 'abc' }).toXAPI().result;

			expect(result.score).to.deep.equal({ raw: 4 });
		});

		it('drops a score part that is an empty string', function() {
			expect(builder().withScore({ raw: '' }).toXAPI()).to.not.have.property('result');
		});

		it('drops a score part that is not finite', function() {
			expect(builder().withScore({ raw: Infinity }).toXAPI()).to.not.have.property('result');
			expect(builder().withScore({ raw: NaN }).toXAPI()).to.not.have.property('result');
		});

		it('ignores a score without any part', function() {
			expect(builder().withScore({}).toXAPI()).to.not.have.property('result');
		});

		it('resolves the extension keys against the default URI', function() {
			const result = builder().withResultExtension('myKey', 'v').toXAPI().result;

			expect(result.extensions).to.deep.equal({ [`${EXT}/myKey`]: 'v' });
		});

		it('keeps the extension keys that are already absolute URIs', function() {
			const key = 'https://w3id.org/xapi/seriousgames/extensions/progress';
			const result = builder().withResultExtension(key, 0.5).toXAPI().result;

			expect(result.extensions).to.deep.equal({ [key]: 0.5 });
		});

		it('converts the flags to booleans', function() {
			const result = builder().withSuccess(0).withCompletion('yes').toXAPI().result;

			expect(result.success).to.equal(false);
			expect(result.completion).to.equal(true);
		});
	});

	describe('the context', function() {
		it('takes the language', function() {
			expect(builder().withContextLanguage('es').toXAPI().context.language).to.equal('es');
		});

		it('takes the platform', function() {
			expect(builder().withContextPlatform('https://other.example').toXAPI().context.platform)
				.to.equal('https://other.example');
		});

		it('takes an extension', function() {
			const context = builder().withContextExtension('myContextKey', 'v').toXAPI().context;

			expect(context.extensions.myContextKey).to.equal('v');
		});

		it('leaves out the extensions while there are none', function() {
			expect(builder().toXAPI().context).to.not.have.property('extensions');

			builder().statement.context.setExtensions({});

			expect(builder().toXAPI().context).to.not.have.property('extensions');
		});

		it('appends a category to the ones the tracker already declares', function() {
			// a serious game is categorized by default, so the category added here comes after it
			const categories = builder().withContextCategory(`${EXT}/about#category`).toXAPI().context
				.contextActivities.category;
			const added = categories[categories.length - 1];

			expect(categories).to.have.lengthOf(2);
			expect(added.id).to.equal(`${EXT}/about#category`);
			expect(added.definition.type).to.equal('http://adlnet.gov/expapi/activities/profile');
		});

		it('keeps the activities of every relation apart', function() {
			const context = builder()
				.withContextActivity('parent', `${EXT}/parent`)
				.withContextActivity('grouping', `${EXT}/grouping`)
				.toXAPI().context.contextActivities;

			expect(context.parent[0].id).to.equal(`${EXT}/parent`);
			expect(context.grouping[0].id).to.equal(`${EXT}/grouping`);
		});
	});

	describe('the object', function() {
		it('takes a name and a description per language', function() {
			const definition = builder()
				.withObjectDefinitionName('en', 'Sword')
				.withObjectDefinitionName('es', 'Espada')
				.withObjectDefinitionDescription('en', 'A sword')
				.toXAPI().object.definition;

			expect(definition.name).to.deep.equal({ en: 'Sword', es: 'Espada' });
			expect(definition.description).to.deep.equal({ en: 'A sword' });
		});

		it('takes several names at once', function() {
			const definition = builder()
				.withObjectDefinitionsName('en', new Set(['Sword', 'Blade']))
				.toXAPI().object.definition;

			expect(definition.name).to.deep.equal({ en: 'Blade' });
		});

		it('takes several descriptions at once', function() {
			const definition = builder()
				.withObjectDefinitionsDescription('en', new Set(['A sword', 'A blade']))
				.toXAPI().object.definition;

			expect(definition.description).to.deep.equal({ en: 'A blade' });
		});

		it('takes the extensions of the definition', function() {
			const definition = builder().withObjectExtensions({ myKey: 'v' }).toXAPI().object.definition;

			expect(definition.extensions).to.deep.equal({ myKey: 'v' });
		});

		it('leaves out the extensions of the definition while there are none', function() {
			expect(builder().toXAPI().object.definition).to.not.have.property('extensions');
			expect(builder().withObjectExtensions({}).toXAPI().object.definition)
				.to.not.have.property('extensions');
		});
	});

	describe('the verb', function() {
		it('takes a display per language', function() {
			expect(builder().withVerbDisplay('en', 'picked').toXAPI().verb.display)
				.to.deep.equal({ en: 'picked' });
		});

		it('defaults the display to the last part of the verb URI', function() {
			const b = tracker.trace('https://w3id.org/xapi/seriousgames/verbs/accessed', 'gameobject', 'o');

			expect(b.toXAPI().verb.display).to.deep.equal({ en: 'accessed' });
		});

		it('defaults the display to the verb itself when it is not a URI', function() {
			expect(builder().toXAPI().verb.display).to.deep.equal({ en: 'accessed' });
		});
	});

	describe('the attachments', function() {
		it('is left out while none was given', function() {
			expect(builder().toXAPI()).to.not.have.property('attachments');
		});

		it('takes one attachment given as a plain object', function() {
			const statement = builder()
				.withAttachment({
					usageType: 'http://example.com/attachment',
					display: { 'en-US': 'a.txt' },
					contentType: 'text/plain',
					length: 5,
					sha2: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
				})
				.toXAPI();

			expect(statement.attachments).to.have.lengthOf(1);
			expect(statement.attachments[0].usageType).to.equal('http://example.com/attachment');
			expect(statement.attachments[0].display['en-US']).to.equal('a.txt');
			expect(statement.attachments[0].contentType).to.equal('text/plain');
			expect(statement.attachments[0].length).to.equal(5);
		});

		it('takes an attachment whose usage type is not absolute', function() {
			const statement = builder()
				.withAttachment({ usageType: 'attachment' })
				.toXAPI();

			expect(statement.attachments[0].usageType).to.equal(`${EXT}/attachment`);
		});

		it('takes several attachments at once', function() {
			const statement = builder()
				.withAttachments([
					{ usageType: 'http://example.com/a' },
					{ usageType: 'http://example.com/b' }
				])
				.toXAPI();

			expect(statement.attachments.map(a => a.usageType))
				.to.deep.equal(['http://example.com/a', 'http://example.com/b']);
		});
	});

	describe('the whole converted statement', function() {
		it('holds every part that was set', function() {
			// a statement that exercises every setter at once, so a converter that drops or
			// reshapes any part of it shows up as a failure on that part alone
			const statement = builder()
				.withResponse('optionB')
				.withSuccess(true)
				.withCompletion(false)
				// a zero min would be dropped, the score setters skip the falsy parts
				.withScore({ raw: 1, min: 0.5, max: 2, scaled: 0.5 })
				.withDuration(new Date('2026-01-01T10:00:00.000Z'), new Date('2026-01-01T10:01:30.000Z'))
				.withResultExtension('resultKey', 'resultValue')
				.withContextLanguage('es')
				.withContextPlatform('https://platform.example')
				.withContextExtension('contextKey', 'contextValue')
				.withContextActivity('parent', `${EXT}/parent1`)
				.withContextActivity('parent', `${EXT}/parent2`)
				.withContextActivity('grouping', `${EXT}/grouping1`)
				.withVerbDisplay('en', 'picked')
				.withObjectDefinitionName('en', 'Sword')
				.withObjectDefinitionDescription('en', 'A sword')
				.withObjectExtension('objectKey', 'objectValue')
				.withAttachment({
					usageType: 'http://example.com/attachment',
					display: { 'en-US': 'a.txt' },
					description: { en: 'A text file' },
					contentType: 'text/plain',
					length: 5,
					sha2: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
					fileUrl: 'https://example.com/a.txt'
				})
				.toXAPI();

			expect(statement.id).to.match(/^[0-9a-f-]{36}$/);
			expect(statement.version).to.equal('1.0.3');

			expect(statement.actor).to.deep.equal({
				objectType: 'Agent',
				account: { name: 'player1', homePage: EXT }
			});

			expect(statement.verb).to.deep.equal({ id: `${EXT}/accessed`, display: { en: 'picked' } });

			expect(statement.object).to.deep.equal({
				id: `${EXT}/ObjectID`,
				definition: {
					name: { en: 'Sword' },
					description: { en: 'A sword' },
					type: `${EXT}/gameobject`,
					extensions: { objectKey: 'objectValue' }
				}
			});

			expect(statement.result).to.deep.equal({
				success: true,
				completion: false,
				response: 'optionB',
				score: { raw: 1, min: 0.5, max: 2, scaled: 0.5 },
				duration: 'P0DT0H1M30S',
				extensions: { [`${EXT}/resultKey`]: 'resultValue' }
			});

			expect(statement.context).to.deep.equal({
				registration: statement.context.registration,
				contextActivities: {
					category: [{
						id: 'https://w3id.org/xapi/seriousgames/v1.0',
						definition: { type: 'http://adlnet.gov/expapi/activities/profile' }
					}],
					parent: [{ id: `${EXT}/parent1` }, { id: `${EXT}/parent2` }],
					grouping: [{ id: `${EXT}/grouping1` }]
				},
				extensions: { contextKey: 'contextValue' },
				platform: 'https://platform.example',
				language: 'es'
			});

			expect(statement.attachments).to.deep.equal([{
				usageType: 'http://example.com/attachment',
				display: { 'en-US': 'a.txt' },
				contentType: 'text/plain',
				length: 5,
				sha2: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				description: { en: 'A text file' },
				fileUrl: 'https://example.com/a.txt'
			}]);
		});

		it('survives a JSON round trip with every part intact', function() {
			// the statements reach the LRS as JSON, so anything the conversion produces must
			// survive stringify and parse, which is where a Map or a Set would be lost
			const statement = builder()
				.withResponse('optionB')
				.withScore({ raw: 1, scaled: 0.5 })
				.withResultExtension('resultKey', 'resultValue')
				.withContextExtension('contextKey', 'contextValue')
				.withVerbDisplay('en', 'picked')
				.withObjectDefinitionName('en', 'Sword')
				.withObjectExtension('objectKey', 'objectValue')
				.withAttachment({
					usageType: 'http://example.com/attachment',
					display: { 'en-US': 'a.txt' },
					contentType: 'text/plain',
					length: 5,
					sha2: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
				})
				.toXAPI();

			const roundTripped = JSON.parse(JSON.stringify(statement));

			expect(roundTripped).to.deep.equal(statement);
		});

		it('keeps every part that came from an xAPI statement', function() {
			// the counterpart of the test above: a statement read back in must convert to the
			// same shape it arrived in
			const incoming = {
				actor: { objectType: 'Agent', mbox: 'mailto:player@example.com' },
				verb: { id: `${EXT}/answered`, display: { 'en-US': 'answered' } },
				object: {
					id: `${EXT}/q1`,
					definition: {
						name: { en: 'Q1' },
						description: { en: 'A question' },
						type: `${EXT}/question`,
						extensions: { objectKey: 'objectValue' }
					}
				},
				result: {
					success: true,
					completion: false,
					response: 'a',
					duration: 'PT1M',
					score: { raw: 1, min: 0, max: 2, scaled: 0.5 },
					extensions: { [`${EXT}/resultKey`]: 'resultValue' }
				},
				context: {
					registration: 'a-registration',
					platform: 'https://platform.example',
					language: 'es',
					contextActivities: {
						parent: [{ id: `${EXT}/parent1` }, { id: `${EXT}/parent2` }],
						grouping: [{ id: `${EXT}/grouping1` }]
					},
					extensions: { contextKey: 'contextValue' }
				},
				timestamp: '2026-01-01T00:00:00.000Z',
				version: '1.0.3',
				attachments: [{
					usageType: 'http://example.com/attachment',
					display: { 'en-US': 'a.txt' },
					description: { en: 'A text file' },
					contentType: 'text/plain',
					length: 5,
					sha2: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
					fileUrl: 'https://example.com/a.txt'
				}]
			};

			const statement = tracker.fromXAPI(incoming).toXAPI();

			expect(statement.actor).to.deep.equal(incoming.actor);
			expect(statement.verb.id).to.equal(incoming.verb.id);
			expect(statement.verb.display['en-US']).to.equal('answered');
			expect(statement.object).to.deep.equal(incoming.object);
			expect(statement.result).to.deep.equal(incoming.result);
			expect(statement.context).to.deep.equal(incoming.context);
			expect(statement.timestamp).to.equal(incoming.timestamp);
			expect(statement.version).to.equal(incoming.version);
			expect(statement.attachments).to.deep.equal(incoming.attachments);
		});

		it('declares no part that the statement does not hold', function() {
			const statement = builder().toXAPI();

			expect(Object.keys(statement).sort()).to.deep.equal(
				['actor', 'context', 'id', 'object', 'verb', 'version']);
		});
	});

	describe('an interaction object', function() {
		/**
		 * Builds an interaction activity, which is the object the cmi profile describes
		 * @param  {string} id the activity id
		 * @returns {Object} the builder of the statement
		 */
		function interaction(id = 'q1') {
			return tracker.trace('answered', tracker.ALL.ACTIVITYTYPES.CMI_INTERACTION, id);
		}

		it('is built for the cmi interaction type', function() {
			const statement = interaction().toXAPI();

			expect(statement.object.definition.type)
				.to.equal('http://adlnet.gov/expapi/activities/cmi.interaction');
			expect(statement.object.definition).to.not.have.property('interactionType');
		});

		it('takes the interaction type and the correct responses', function() {
			const definition = interaction()
				.withInteractionType('choice')
				.withCorrectResponsesPattern(['c1', 'c2'])
				.toXAPI().object.definition;

			expect(definition.interactionType).to.equal('choice');
			expect(definition.correctResponsesPattern).to.deep.equal(['c1', 'c2']);
		});

		it('takes a single correct response', function() {
			const definition = interaction()
				.withInteractionType('fill-in')
				.withCorrectResponsesPattern('answer')
				.toXAPI().object.definition;

			expect(definition.correctResponsesPattern).to.deep.equal(['answer']);
		});

		it('discards the blank and the repeated correct responses', function() {
			const definition = interaction()
				.withInteractionType('fill-in')
				.withCorrectResponsesPattern(['answer', '  ', '', 'answer'])
				.toXAPI().object.definition;

			expect(definition.correctResponsesPattern).to.deep.equal(['answer']);
		});

		it('takes the choices with a description per language', function() {
			const definition = interaction()
				.withInteractionType('choice')
				.withInteractionWithLang('choice', 'c1', 'en', 'First')
				.withInteractionWithLang('choice', 'c2', 'en', 'Second')
				.withInteractionWithLang('choice', 'c1', 'es', 'Primero')
				.toXAPI().object.definition;

			expect(definition.interactionType).to.equal('choice');
			expect(definition.choices).to.deep.equal([
				{ id: 'c1', description: { en: 'First', es: 'Primero' } },
				{ id: 'c2', description: { en: 'Second' } }
			]);
		});

		it('takes the scale of a likert interaction', function() {
			const definition = interaction()
				.withInteractionType('likert')
				.withInteractionWithLang('likert', 's1', 'en', 'Strongly agree')
				.toXAPI().object.definition;

			expect(definition.scale).to.deep.equal([
				{ id: 's1', description: { en: 'Strongly agree' } }
			]);
		});

		it('keeps the rest of the statement untouched', function() {
			const statement = interaction()
				.withResponse('c1')
				.withInteractionType('choice')
				.withInteractionWithLang('choice', 'c1', 'en', 'First')
				.toXAPI();

			expect(statement.object.id).to.equal(`${EXT}/q1`);
			expect(statement.verb.id).to.equal(`${EXT}/answered`);
			expect(statement.result.response).to.equal('c1');
		});

		it('ignores the interaction setters on a plain object', function() {
			const statement = builder()
				.withInteractionType('choice')
				.withInteractionWithLang('choice', 'c1', 'en', 'First')
				.toXAPI();

			expect(statement.object.definition).to.deep.equal({ type: `${EXT}/gameobject` });
		});
	});

	describe('sending', function() {
		it('queues the statement', async function() {
			await builder().withResponse('optionB').send();

			expect(tracker.tracker.statementsToSend).to.have.lengthOf(1);
			expect(tracker.tracker.statementsToSend[0].result.Response).to.equal('optionB');
		});

		it('queues the statement only once when send is called twice', async function() {
			const b = builder();
			await b.send();
			await b.send();

			expect(tracker.tracker.statementsToSend).to.have.lengthOf(1);
		});

		it('resolves even while the tracker is offline', async function() {
			tracker.tracker.online = false;

			await builder().send();

			expect(tracker.tracker.statementsToSend).to.have.lengthOf(1);
		});
	});
});

describe('LRSStatementBuilder', function() {
	let tracker;

	beforeEach(function() {
		tracker = new LRSTracker();
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
	 * Builds an LRS statement for the given verb, type and id
	 * @param  {string} verb the verb id
	 * @param  {string} type the activity type
	 * @param  {string} id the activity id
	 * @returns {Object} the builder of the statement
	 */
	function builder(verb = 'accessed', type = 'gameobject', id = 'ObjectID') {
		return tracker.trace(verb, type, id);
	}

	it('builds an LRS statement', function() {
		expect(builder().statement.constructor.name).to.equal('LRSStatement');
	});

	describe('the stored field', function() {
		it('defaults to the moment the statement was built', function() {
			expect(builder().toXAPI().stored).to.match(/^\d{4}-\d{2}-\d{2}T/);
		});

		it('takes a Date', function() {
			const statement = builder().withStored(new Date('2026-02-04T05:06:07.008Z')).toXAPI();

			expect(statement.stored).to.equal('2026-02-04T05:06:07.008Z');
		});

		it('defaults to now', function() {
			const stored = builder().withStored().toXAPI().stored;

			expect(stored).to.match(/^\d{4}-\d{2}-\d{2}T/);
		});

		it('is absent when it is given no date', function() {
			expect(builder().withStored(null).toXAPI()).to.not.have.property('stored');
		});
	});

	describe('the authority', function() {
		it('is absent while it was not set', function() {
			expect(builder().toXAPI()).to.not.have.property('authority');
		});

		it('takes an account', function() {
			const statement = builder().withAutorityAccount('lrs', 'https://lrs.example').toXAPI();

			expect(statement.authority).to.deep.equal({
				objectType: 'Agent',
				account: { name: 'lrs', homePage: 'https://lrs.example' }
			});
		});

		it('takes an mbox', function() {
			expect(builder().withAutorityMbox('mailto:lrs@example.com').toXAPI().authority)
				.to.deep.equal({ objectType: 'Agent', mbox: 'mailto:lrs@example.com' });
		});

		it('takes an mbox hash', function() {
			expect(builder().withAutorityMboxSha1('abc123').toXAPI().authority)
				.to.deep.equal({ objectType: 'Agent', mbox_sha1sum: 'abc123' });
		});

		it('takes an OpenID', function() {
			expect(builder().withAutorityOpenID('https://openid.example/1').toXAPI().authority)
				.to.deep.equal({ objectType: 'Agent', openid: 'https://openid.example/1' });
		});
	});

	describe('the actor', function() {
		it('takes an account', function() {
			expect(builder().withActorAccount('player1', 'https://game.example').toXAPI().actor)
				.to.deep.equal({
					objectType: 'Agent',
					account: { name: 'player1', homePage: 'https://game.example' }
				});
		});

		it('takes an mbox', function() {
			expect(builder().withActorMbox('mailto:player@example.com').toXAPI().actor)
				.to.deep.equal({ objectType: 'Agent', mbox: 'mailto:player@example.com' });
		});

		it('takes an mbox hash', function() {
			expect(builder().withActorMboxSha1('abc123').toXAPI().actor)
				.to.deep.equal({ objectType: 'Agent', mbox_sha1sum: 'abc123' });
		});

		it('takes an OpenID', function() {
			expect(builder().withActorOpenID('https://openid.example/1').toXAPI().actor)
				.to.deep.equal({ objectType: 'Agent', openid: 'https://openid.example/1' });
		});

		it('keeps only the identifier that was set last', function() {
			const actor = builder()
				.withActorAccount('player1', 'https://game.example')
				.withActorMbox('mailto:player@example.com')
				.toXAPI().actor;

			expect(actor).to.deep.equal({ objectType: 'Agent', mbox: 'mailto:player@example.com' });
		});

		it('takes any of the supported types', function() {
			expect(builder().withActor('mbox', 'mailto:player@example.com').toXAPI().actor)
				.to.deep.equal({ objectType: 'Agent', mbox: 'mailto:player@example.com' });
		});
	});

	describe('the envelope', function() {
		it('takes the id', function() {
			expect(builder().withId('18c01bd5-a384-42ad-a96a-9572d4674b87').toXAPI().id)
				.to.equal('18c01bd5-a384-42ad-a96a-9572d4674b87');
		});

		it('takes the version', function() {
			expect(builder().withVersion('1.0.2').toXAPI().version).to.equal('1.0.2');
		});

		it('takes the timestamp', function() {
			expect(builder().withTimestamp(new Date('2026-02-03T04:05:06.007Z')).toXAPI().timestamp)
				.to.equal('2026-02-03T04:05:06.007Z');
		});

		it('defaults the timestamp to now', function() {
			expect(builder().withTimestamp().toXAPI().timestamp).to.match(/^\d{4}-\d{2}-\d{2}T/);
		});

		it('is absent when the timestamp is given no date', function() {
			expect(builder().withTimestamp(null).toXAPI()).to.not.have.property('timestamp');
		});

		it('takes the platform', function() {
			expect(builder().withPlatform('https://other.example').toXAPI().context.platform)
				.to.equal('https://other.example');
		});

		it('keeps the result setters of a plain statement builder', function() {
			const result = builder().withResponse('optionB').withScore({ raw: 2 }).toXAPI().result;

			expect(result.response).to.equal('optionB');
			expect(result.score).to.deep.equal({ raw: 2 });
		});
	});

	describe('the whole converted statement', function() {
		it('holds every part that was set', function() {
			const statement = builder()
				.withActorAccount('player2', 'https://game.example')
				.withId('18c01bd5-a384-42ad-a96a-9572d4674b87')
				.withVersion('1.0.2')
				.withTimestamp(new Date('2026-01-01T00:00:00.000Z'))
				.withStored(new Date('2026-01-02T00:00:00.000Z'))
				.withAutorityAccount('lrs', 'https://lrs.example')
				.withPlatform('https://platform.example')
				.withVerbDisplay('en', 'answered')
				.withObjectDefinitionName('en', 'Q1')
				.withObjectExtension('objectKey', 'objectValue')
				.withContextActivity('parent', `${EXT}/parent1`)
				.withContextExtension('contextKey', 'contextValue')
				.withResponse('a')
				.withScore({ raw: 1, max: 2 })
				.toXAPI();

			expect(statement.id).to.equal('18c01bd5-a384-42ad-a96a-9572d4674b87');
			expect(statement.version).to.equal('1.0.2');
			expect(statement.timestamp).to.equal('2026-01-01T00:00:00.000Z');
			expect(statement.stored).to.equal('2026-01-02T00:00:00.000Z');

			expect(statement.actor).to.deep.equal({
				objectType: 'Agent',
				account: { name: 'player2', homePage: 'https://game.example' }
			});
			expect(statement.authority).to.deep.equal({
				objectType: 'Agent',
				account: { name: 'lrs', homePage: 'https://lrs.example' }
			});

			expect(statement.verb).to.deep.equal({ id: `${EXT}/accessed`, display: { en: 'answered' } });
			expect(statement.object).to.deep.equal({
				id: `${EXT}/ObjectID`,
				definition: {
					name: { en: 'Q1' },
					type: `${EXT}/gameobject`,
					extensions: { objectKey: 'objectValue' }
				}
			});

			expect(statement.result).to.deep.equal({
				response: 'a',
				score: { raw: 1, max: 2 }
			});

			expect(statement.context).to.deep.equal({
				registration: statement.context.registration,
				platform: 'https://platform.example',
				contextActivities: { parent: [{ id: `${EXT}/parent1` }] },
				extensions: { contextKey: 'contextValue' }
			});
		});

		it('survives a JSON round trip with every part intact', function() {
			const statement = builder()
				.withActorMbox('mailto:player@example.com')
				.withId('18c01bd5-a384-42ad-a96a-9572d4674b87')
				.withVersion('1.0.2')
				.withTimestamp(new Date('2026-01-01T00:00:00.000Z'))
				.withStored(new Date('2026-01-02T00:00:00.000Z'))
				.withAutorityAccount('lrs', 'https://lrs.example')
				.withVerbDisplay('en', 'answered')
				.withObjectDefinitionName('en', 'Q1')
				.withContextActivity('parent', `${EXT}/parent1`)
				.withResponse('a')
				.withScore({ raw: 1, max: 2 })
				.toXAPI();

			expect(JSON.parse(JSON.stringify(statement))).to.deep.equal(statement);
		});

		it('keeps every part that came from an xAPI statement', function() {
			const incoming = {
				id: '18c01bd5-a384-42ad-a96a-9572d4674b87',
				actor: {
					objectType: 'Group',
					name: 'Team',
					member: [
						{ objectType: 'Agent', mbox: 'mailto:a@example.com' },
						{ objectType: 'Agent', account: { name: 'b', homePage: 'https://h.example' } }
					]
				},
				authority: { objectType: 'Agent', account: { name: 'lrs', homePage: 'https://lrs.example' } },
				verb: { id: `${EXT}/answered`, display: { 'en-US': 'answered' } },
				object: {
					id: `${EXT}/q1`,
					definition: {
						name: { en: 'Q1' },
						description: { en: 'A question' },
						type: `${EXT}/question`,
						extensions: { objectKey: 'objectValue' }
					}
				},
				result: {
					success: true,
					completion: false,
					response: 'a',
					duration: 'PT1M',
					score: { raw: 1, min: 0.5, max: 2, scaled: 0.5 },
					extensions: { [`${EXT}/resultKey`]: 'resultValue' }
				},
				context: {
					registration: 'a-registration',
					platform: 'https://platform.example',
					language: 'es',
					contextActivities: {
						parent: [{ id: `${EXT}/parent1` }, { id: `${EXT}/parent2` }],
						grouping: [{ id: `${EXT}/grouping1` }]
					},
					extensions: { contextKey: 'contextValue' }
				},
				timestamp: '2026-01-01T00:00:00.000Z',
				stored: '2026-01-02T00:00:00.000Z',
				version: '1.0.2'
			};

			const statement = tracker.fromXAPI(incoming).toXAPI();

			expect(statement.id).to.equal(incoming.id);
			expect(statement.actor).to.deep.equal(incoming.actor);
			expect(statement.authority).to.deep.equal(incoming.authority);
			expect(statement.verb.id).to.equal(incoming.verb.id);
			expect(statement.verb.display['en-US']).to.equal('answered');
			expect(statement.object).to.deep.equal(incoming.object);
			expect(statement.result).to.deep.equal(incoming.result);
			expect(statement.context).to.deep.equal(incoming.context);
			expect(statement.timestamp).to.equal(incoming.timestamp);
			expect(statement.stored).to.equal(incoming.stored);
			expect(statement.version).to.equal(incoming.version);
		});

		it('declares no part that the statement does not hold', function() {
			expect(Object.keys(builder().toXAPI()).sort()).to.deep.equal(
				['actor', 'context', 'id', 'object', 'stored', 'verb', 'version']);
		});
	});

	describe('fromXAPI', function() {
		it('keeps the authority and the stored field that were given', function() {
			const statement = tracker.fromXAPI({
				actor: { objectType: 'Agent', mbox: 'mailto:p@example.com' },
				verb: { id: `${EXT}/accessed` },
				object: { id: `${EXT}/ObjectID` },
				stored: '2026-02-04T05:06:07.008Z',
				authority: { objectType: 'Agent', account: { name: 'lrs', homePage: 'https://lrs.example' } }
			}).toXAPI();

			expect(statement.stored).to.equal('2026-02-04T05:06:07.008Z');
			expect(statement.authority.account.name).to.equal('lrs');
		});

		it('supplies a stored field when the statement has none', function() {
			const statement = tracker.fromXAPI({
				actor: { objectType: 'Agent', mbox: 'mailto:p@example.com' },
				verb: { id: `${EXT}/accessed` },
				object: { id: `${EXT}/ObjectID` }
			}).toXAPI();

			expect(statement.stored).to.match(/^\d{4}-\d{2}-\d{2}T/);
		});

		it('leaves the authority out while the statement has none', function() {
			const statement = tracker.fromXAPI({
				actor: { objectType: 'Agent', mbox: 'mailto:p@example.com' },
				verb: { id: `${EXT}/accessed` },
				object: { id: `${EXT}/ObjectID` }
			}).toXAPI();

			expect(statement).to.not.have.property('authority');
		});

		it('builds a group actor out of its members', function() {
			const statement = tracker.fromXAPI({
				actor: {
					objectType: 'Group',
					name: 'Team',
					member: [{ objectType: 'Agent', mbox: 'mailto:a@example.com' }]
				},
				verb: { id: `${EXT}/accessed` },
				object: { id: `${EXT}/ObjectID` }
			}).toXAPI();

			expect(statement.actor).to.deep.equal({
				objectType: 'Group',
				name: 'Team',
				member: [{ objectType: 'Agent', mbox: 'mailto:a@example.com' }]
			});
		});

		it('accepts a builder that is chained after it', function() {
			const statement = tracker
				.fromXAPI({
					actor: { objectType: 'Agent', mbox: 'mailto:p@example.com' },
					verb: { id: `${EXT}/accessed` },
					object: { id: `${EXT}/ObjectID` }
				})
				.withResponse('optionB')
				.toXAPI();

			expect(statement.result.response).to.equal('optionB');
		});
	});
});
