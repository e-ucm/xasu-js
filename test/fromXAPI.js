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
const CMI = 'http://adlnet.gov/expapi/activities/cmi.interaction';
const AGENT = { objectType: 'Agent', account: { name: 'player1', homePage: EXT } };

/**
 * Builds a started tracker of the given class
 * @param  {Function} TrackerClass the tracker class to instantiate
 * @returns {Object} the started tracker
 */
function started(TrackerClass) {
	const tracker = new TrackerClass();
	tracker.trackerSettings.oauth_type = 'OAuth0';
	tracker.trackerSettings.default_uri = EXT;
	tracker.trackerSettings.platform = EXT;
	tracker.trackerSettings.actor_name = 'player1';
	tracker.start();
	return tracker;
}

describe('fromXAPI', function() {
	let tracker;

	beforeEach(function() {
		tracker = started(SeriousGameTracker);
	});

	afterEach(function() {
		// stop() cancels the pending batch timer, otherwise it would keep mocha alive
		tracker.stop();
	});

	/**
	 * Reads a statement back into a builder, merging the given parts over a minimal statement
	 * @param  {Object} parts the parts of the statement to read
	 * @returns {Object} the builder of the statement
	 */
	function read(parts = {}) {
		return tracker.fromXAPI({
			actor: AGENT,
			verb: { id: `${EXT}/accessed` },
			object: { id: `${EXT}/ObjectID` },
			...parts
		});
	}

	describe('the envelope', function() {
		it('keeps the id it was given', function() {
			const id = '18c01bd5-a384-42ad-a96a-9572d4674b87';

			expect(read({ id }).toXAPI().id).to.equal(id);
		});

		it('supplies an id when the statement has none', function() {
			expect(read().toXAPI().id).to.match(/^[0-9a-f-]{36}$/);
		});

		it('keeps the version it was given', function() {
			expect(read({ version: '1.0.2' }).toXAPI().version).to.equal('1.0.2');
		});

		it('defaults the version to 1.0.3', function() {
			expect(read().toXAPI().version).to.equal('1.0.3');
		});

		it('keeps the timestamp it was given', function() {
			expect(read({ timestamp: '2026-01-01T00:00:00.000Z' }).toXAPI().timestamp)
				.to.equal('2026-01-01T00:00:00.000Z');
		});

		it('declares no timestamp while the statement has none', function() {
			expect(read().toXAPI()).to.not.have.property('timestamp');
		});
	});

	describe('the actor', function() {
		it('keeps an account', function() {
			expect(read().toXAPI().actor).to.deep.equal(AGENT);
		});

		it('keeps an mbox', function() {
			const actor = read({ actor: { objectType: 'Agent', mbox: 'mailto:p@example.com' } })
				.toXAPI().actor;

			expect(actor).to.deep.equal({ objectType: 'Agent', mbox: 'mailto:p@example.com' });
		});

		it('keeps an mbox hash', function() {
			const actor = read({ actor: { objectType: 'Agent', mbox_sha1sum: 'abc123' } }).toXAPI().actor;

			expect(actor).to.deep.equal({ objectType: 'Agent', mbox_sha1sum: 'abc123' });
		});

		it('keeps an OpenID', function() {
			const actor = read({ actor: { objectType: 'Agent', openid: 'https://openid.example/1' } })
				.toXAPI().actor;

			expect(actor).to.deep.equal({ objectType: 'Agent', openid: 'https://openid.example/1' });
		});

		it('keeps a group and the name it declares', function() {
			const actor = read({ actor: { objectType: 'Group', name: 'Team' } }).toXAPI().actor;

			expect(actor).to.deep.equal({ objectType: 'Group', name: 'Team' });
		});

		it('keeps a group and every member of it', function() {
			const actor = read({
				actor: {
					objectType: 'Group',
					name: 'Team',
					member: [
						{ objectType: 'Agent', mbox: 'mailto:a@example.com' },
						{ objectType: 'Agent', account: { name: 'b', homePage: 'https://h.example' } }
					]
				}
			}).toXAPI().actor;

			expect(actor).to.deep.equal({
				objectType: 'Group',
				name: 'Team',
				member: [
					{ objectType: 'Agent', mbox: 'mailto:a@example.com' },
					{ objectType: 'Agent', account: { name: 'b', homePage: 'https://h.example' } }
				]
			});
		});

		it('keeps the first identifier when the actor declares more than one', function() {
			// an xAPI agent holds a single identifier, so the first one wins
			const actor = read({
				actor: { objectType: 'Agent', mbox: 'mailto:a@example.com', account: { name: 'n', homePage: 'h' } }
			}).toXAPI().actor;

			expect(actor).to.deep.equal({ objectType: 'Agent', mbox: 'mailto:a@example.com' });
		});
	});

	describe('the verb', function() {
		it('keeps the id it was given', function() {
			const verb = 'https://w3id.org/xapi/seriousgames/verbs/accessed';

			expect(read({ verb: { id: verb } }).toXAPI().verb.id).to.equal(verb);
		});

		it('resolves an id that is not absolute', function() {
			expect(read({ verb: { id: 'accessed' } }).toXAPI().verb.id).to.equal(`${EXT}/accessed`);
		});

		it('keeps every display it was given', function() {
			const verb = read({ verb: { id: `${EXT}/accessed`, display: { 'en-US': 'Accessed', es: 'Accedido' } } })
				.toXAPI().verb;

			expect(verb.display['en-US']).to.equal('Accessed');
			expect(verb.display.es).to.equal('Accedido');
		});

		it('supplies a display when the verb has none', function() {
			expect(read({ verb: { id: `${EXT}/accessed` } }).toXAPI().verb.display)
				.to.deep.equal({ en: 'accessed' });
		});
	});

	describe('the object', function() {
		it('keeps the id and the type it was given', function() {
			const object = read({
				object: { id: `${EXT}/q1`, definition: { type: `${EXT}/question` } }
			}).toXAPI().object;

			expect(object.id).to.equal(`${EXT}/q1`);
			expect(object.definition.type).to.equal(`${EXT}/question`);
		});

		it('resolves the ids that are not absolute', function() {
			const object = read({ object: { id: 'q1', definition: { type: 'question' } } }).toXAPI().object;

			expect(object.id).to.equal(`${EXT}/q1`);
			expect(object.definition.type).to.equal(`${EXT}/question`);
		});

		it('keeps the name and the description per language', function() {
			const definition = read({
				object: {
					id: `${EXT}/q1`,
					definition: {
						type: `${EXT}/question`,
						name: { en: 'Q1', es: 'P1' },
						description: { en: 'A question' }
					}
				}
			}).toXAPI().object.definition;

			expect(definition.name).to.deep.equal({ en: 'Q1', es: 'P1' });
			expect(definition.description).to.deep.equal({ en: 'A question' });
		});

		it('keeps the extensions of the definition', function() {
			const definition = read({
				object: { id: `${EXT}/q1`, definition: { type: `${EXT}/question`, extensions: { myKey: 'v' } } }
			}).toXAPI().object.definition;

			expect(definition.extensions).to.deep.equal({ myKey: 'v' });
		});

		it('declares no extensions while the definition has none', function() {
			const definition = read({ object: { id: `${EXT}/q1`, definition: { extensions: {} } } })
				.toXAPI().object.definition;

			expect(definition).to.not.have.property('extensions');
		});
	});

	describe('an interaction object', function() {
		/**
		 * Reads an interaction activity whose definition holds the given parts
		 * @param  {Object} definition the parts of the definition
		 * @returns {Object} the converted definition
		 */
		function readDefinition(definition) {
			return read({
				object: { id: `${EXT}/q1`, definition: { type: CMI, ...definition } }
			}).toXAPI().object.definition;
		}

		it('is read as an interaction object once the verb declares one', function() {
			expect(readDefinition({ interactionType: 'choice' }).interactionType).to.equal('choice');
		});

		it('keeps the correct responses given as an array', function() {
			expect(readDefinition({ interactionType: 'choice', correctResponsesPattern: ['a', 'b'] })
				.correctResponsesPattern).to.deep.equal(['a', 'b']);
		});

		it('keeps a single correct response given as a string', function() {
			expect(readDefinition({ interactionType: 'fill-in', correctResponsesPattern: 'answer' })
				.correctResponsesPattern).to.deep.equal(['answer']);
		});

		it('declares no correct responses while the object has none', function() {
			expect(readDefinition({ interactionType: 'choice' })).to.not.have.property('correctResponsesPattern');
		});

		it('keeps the choices with their descriptions', function() {
			expect(readDefinition({
				interactionType: 'choice',
				choices: [{ id: 'c1', description: { en: 'First' } }, { id: 'c2', description: { en: 'Second' } }]
			}).choices).to.deep.equal([
				{ id: 'c1', description: { en: 'First' } },
				{ id: 'c2', description: { en: 'Second' } }
			]);
		});

		it('keeps the scale of a likert interaction', function() {
			expect(readDefinition({
				interactionType: 'likert',
				scale: [{ id: 's1', description: { en: 'Strongly agree' } }]
			}).scale).to.deep.equal([{ id: 's1', description: { en: 'Strongly agree' } }]);
		});

		it('keeps both ends of a matching interaction', function() {
			const definition = readDefinition({
				interactionType: 'matching',
				source: [{ id: 's1', description: { en: 'Left' } }],
				target: [{ id: 't1', description: { en: 'Right' } }]
			});

			expect(definition.source).to.deep.equal([{ id: 's1', description: { en: 'Left' } }]);
			expect(definition.target).to.deep.equal([{ id: 't1', description: { en: 'Right' } }]);
		});

		it('keeps the steps of a performance interaction', function() {
			expect(readDefinition({
				interactionType: 'performance',
				steps: [{ id: 'st1', description: { en: 'Jump' } }]
			}).steps).to.deep.equal([{ id: 'st1', description: { en: 'Jump' } }]);
		});

		it('is read as a plain object while no interaction type is declared', function() {
			const object = read({ object: { id: `${EXT}/q1`, definition: { type: CMI } } }).toXAPI().object;

			expect(object.definition).to.deep.equal({ type: CMI });
		});
	});

	describe('the result', function() {
		it('keeps the flags, the response and the duration', function() {
			const result = read({
				result: { success: true, completion: false, response: 'a', duration: 'PT1M' }
			}).toXAPI().result;

			expect(result.success).to.equal(true);
			expect(result.completion).to.equal(false);
			expect(result.response).to.equal('a');
			expect(result.duration).to.equal('PT1M');
		});

		it('keeps every part of the score', function() {
			const result = read({ result: { score: { raw: 1, min: 0.5, max: 2, scaled: 0.5 } } }).toXAPI().result;

			expect(result.score).to.deep.equal({ raw: 1, min: 0.5, max: 2, scaled: 0.5 });
		});

		it('keeps a score part that is zero', function() {
			const result = read({ result: { score: { raw: 0, min: 0 } } }).toXAPI().result;

			expect(result.score).to.deep.equal({ raw: 0, min: 0 });
		});

		it('keeps the extensions against their URI', function() {
			const key = 'https://w3id.org/xapi/seriousgames/extensions/progress';
			const result = read({ result: { extensions: { [key]: 0.5 } } }).toXAPI().result;

			expect(result.extensions).to.deep.equal({ [key]: 0.5 });
		});

		it('resolves an extension key that is not absolute', function() {
			const result = read({ result: { extensions: { myKey: 'v' } } }).toXAPI().result;

			expect(result.extensions).to.deep.equal({ [`${EXT}/myKey`]: 'v' });
		});

		it('declares no result while the statement has none', function() {
			expect(read().toXAPI()).to.not.have.property('result');
		});

		it('declares no extensions while they are empty', function() {
			const result = read({ result: { response: 'a', extensions: {} } }).toXAPI().result;

			expect(result).to.deep.equal({ response: 'a' });
		});
	});

	describe('the context', function() {
		it('keeps the registration it was given', function() {
			expect(read({ context: { registration: 'a-registration' } }).toXAPI().context.registration)
				.to.equal('a-registration');
		});

		it('supplies a registration while the context has none', function() {
			expect(read({ context: {} }).toXAPI().context.registration).to.match(/^[0-9a-f-]{36}$/);
		});

		it('keeps the platform and the language it was given', function() {
			const context = read({
				context: { registration: 'r', platform: 'https://platform.example', language: 'es' }
			}).toXAPI().context;

			expect(context.platform).to.equal('https://platform.example');
			expect(context.language).to.equal('es');
		});

		it('prefers the platform of the context over the one of the tracker', function() {
			expect(read({ context: { registration: 'r', platform: 'https://platform.example' } })
				.toXAPI().context.platform).to.equal('https://platform.example');
		});

		it('keeps every activity of every relation, in order', function() {
			const contextActivities = read({
				context: {
					registration: 'r',
					contextActivities: {
						parent: [{ id: `${EXT}/p1` }, { id: `${EXT}/p2` }],
						grouping: [{ id: `${EXT}/g1` }],
						other: [{ id: `${EXT}/o1` }]
					}
				}
			}).toXAPI().context.contextActivities;

			expect(contextActivities.parent.map(a => a.id)).to.deep.equal([`${EXT}/p1`, `${EXT}/p2`]);
			expect(contextActivities.grouping.map(a => a.id)).to.deep.equal([`${EXT}/g1`]);
			expect(contextActivities.other.map(a => a.id)).to.deep.equal([`${EXT}/o1`]);
		});

		it('keeps the type of every activity', function() {
			const contextActivities = read({
				context: {
					registration: 'r',
					contextActivities: { parent: [{ id: `${EXT}/p1`, definition: { type: `${EXT}/about#p` } }] }
				}
			}).toXAPI().context.contextActivities;

			expect(contextActivities.parent[0].definition.type).to.equal(`${EXT}/about#p`);
		});

		it('keeps the plain IRIs of the relations that accept them', function() {
			const contextActivities = read({
				context: {
					registration: 'r',
					contextActivities: {
						grouping: ['https://w3id.org/xapi/seriousgames'],
						category: ['https://w3id.org/xapi/seriousgames/v1.0']
					}
				}
			}).toXAPI().context.contextActivities;

			expect(contextActivities.grouping).to.deep.equal(['https://w3id.org/xapi/seriousgames']);
			expect(contextActivities.category).to.deep.equal(['https://w3id.org/xapi/seriousgames/v1.0']);
		});

		it('keeps the extensions it was given', function() {
			expect(read({ context: { registration: 'r', extensions: { contextKey: 'v' } } })
				.toXAPI().context.extensions).to.deep.equal({ contextKey: 'v' });
		});

		it('declares no extensions while they are empty', function() {
			expect(read({ context: { registration: 'r', extensions: {} } }).toXAPI().context)
				.to.not.have.property('extensions');
		});

		it('builds a context out of the tracker settings while the statement has none', function() {
			const context = read().toXAPI().context;

			expect(context.platform).to.equal(EXT);
			expect(context.registration).to.match(/^[0-9a-f-]{36}$/);
		});
	});

	describe('the attachments', function() {
		it('keeps every field of an attachment', function() {
			const attachment = {
				usageType: 'http://example.com/attachment',
				display: { 'en-US': 'a.txt' },
				description: { en: 'A text file' },
				contentType: 'text/plain',
				length: 5,
				sha2: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
				fileUrl: 'https://example.com/a.txt'
			};

			expect(read({ attachments: [attachment] }).toXAPI().attachments).to.deep.equal([attachment]);
		});

		it('keeps several attachments in order', function() {
			const attachments = read({
				attachments: [{ usageType: 'http://example.com/a' }, { usageType: 'http://example.com/b' }]
			}).toXAPI().attachments;

			expect(attachments.map(a => a.usageType))
				.to.deep.equal(['http://example.com/a', 'http://example.com/b']);
		});

		it('resolves a usage type and a file URL that are not absolute', function() {
			const [attachment] = read({
				attachments: [{ usageType: 'attachment', fileUrl: 'a.txt' }]
			}).toXAPI().attachments;

			expect(attachment.usageType).to.equal(`${EXT}/attachment`);
			expect(attachment.fileUrl).to.equal(`${EXT}/a.txt`);
		});

		it('declares no attachments while the statement has none', function() {
			expect(read().toXAPI()).to.not.have.property('attachments');
		});
	});

	describe('chaining after a read', function() {
		it('accepts the setters of a plain statement builder', function() {
			const statement = read()
				.withResponse('optionB')
				.withScore({ raw: 1 })
				.withContextActivity('parent', `${EXT}/added`)
				.toXAPI();

			expect(statement.result).to.deep.equal({ response: 'optionB', score: { raw: 1 } });
			expect(statement.context.contextActivities.parent[0].id).to.equal(`${EXT}/added`);
		});

		it('keeps the parts that were read when another part is changed', function() {
			const statement = read({
				verb: { id: `${EXT}/accessed` },
				result: { response: 'a' }
			}).withScore({ raw: 2 }).toXAPI();

			expect(statement.verb.id).to.equal(`${EXT}/accessed`);
			expect(statement.result).to.deep.equal({ response: 'a', score: { raw: 2 } });
		});
	});

	describe('round trip', function() {
		it('returns the statement it was given', function() {
			const incoming = {
				id: '18c01bd5-a384-42ad-a96a-9572d4674b87',
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
					score: { raw: 1, min: 0.5, max: 2, scaled: 0.5 },
					extensions: { [`${EXT}/resultKey`]: 'resultValue' }
				},
				context: {
					registration: 'a-registration',
					platform: 'https://platform.example',
					language: 'es',
					contextActivities: {
						parent: [{ id: `${EXT}/p1`, definition: { type: `${EXT}/about#p` } }, { id: `${EXT}/p2` }],
						grouping: [{ id: `${EXT}/g1` }]
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

			const statement = read(incoming).toXAPI();

			expect(statement.id).to.equal(incoming.id);
			expect(statement.actor).to.deep.equal(incoming.actor);
			expect(statement.verb.id).to.equal(incoming.verb.id);
			expect(statement.object).to.deep.equal(incoming.object);
			expect(statement.result).to.deep.equal(incoming.result);
			expect(statement.context).to.deep.equal(incoming.context);
			expect(statement.timestamp).to.equal(incoming.timestamp);
			expect(statement.version).to.equal(incoming.version);
			expect(statement.attachments).to.deep.equal(incoming.attachments);
		});

		it('is stable when a statement is read twice', function() {
			const incoming = {
				actor: { objectType: 'Agent', account: { name: 'player1', homePage: EXT } },
				verb: { id: `${EXT}/accessed` },
				object: { id: `${EXT}/ObjectID` },
				context: { registration: 'r', contextActivities: { parent: [{ id: `${EXT}/p1` }] } }
			};

			const once = read(incoming).toXAPI();

			expect(read(once).toXAPI()).to.deep.equal(once);
		});

		it('reads back a statement that was built by a builder', function() {
			const built = tracker.trace('answered', CMI, 'q1')
				.withInteractionType('choice')
				.withCorrectResponsesPattern(['c1', 'c2'])
				.withInteractionWithLang('choice', 'c1', 'en', 'First')
				.withResponse('c1')
				.toXAPI();

			const read_back = read(built).toXAPI();

			expect(read_back.object).to.deep.equal(built.object);
			expect(read_back.result).to.deep.equal(built.result);
		});
	});

	describe('the LRS statement', function() {
		beforeEach(function() {
			tracker.stop();
			tracker = started(LRSTracker);
		});

		it('keeps the authority and the stored field it was given', function() {
			const statement = read({
				authority: { objectType: 'Agent', account: { name: 'lrs', homePage: 'https://lrs.example' } },
				stored: '2026-01-02T00:00:00.000Z'
			}).toXAPI();

			expect(statement.authority).to.deep.equal({
				objectType: 'Agent',
				account: { name: 'lrs', homePage: 'https://lrs.example' }
			});
			expect(statement.stored).to.equal('2026-01-02T00:00:00.000Z');
		});

		it('supplies a stored field while the statement has none', function() {
			expect(read().toXAPI().stored).to.match(/^\d{4}-\d{2}-\d{2}T/);
		});

		it('declares no authority while the statement has none', function() {
			expect(read().toXAPI()).to.not.have.property('authority');
		});

		it('keeps a group authority with its members', function() {
			const statement = read({
				authority: {
					objectType: 'Group',
					name: 'The LRS',
					member: [{ objectType: 'Agent', mbox: 'mailto:lrs@example.com' }]
				}
			}).toXAPI();

			expect(statement.authority).to.deep.equal({
				objectType: 'Group',
				name: 'The LRS',
				member: [{ objectType: 'Agent', mbox: 'mailto:lrs@example.com' }]
			});
		});

		it('reads back a statement that kept its id and its version', function() {
			const statement = read({ id: '18c01bd5-a384-42ad-a96a-9572d4674b87', version: '1.0.2' }).toXAPI();

			expect(statement.id).to.equal('18c01bd5-a384-42ad-a96a-9572d4674b87');
			expect(statement.version).to.equal('1.0.2');
		});
	});
});
