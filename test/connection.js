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
const BATCH_LENGTH = 2;

/**
 * Builds a logged in tracker whose XAPI client is replaced by a stub, so the tests observe
 * the batches the tracker would have sent without reaching a real LRS
 * @param  {Object} [settings] extra tracker settings
 * @returns {Object} the tracker, its login and its stubbed client
 */
async function connected(settings = {}) {
	const tracker = new SeriousGameTracker();
	tracker.trackerSettings.oauth_type = 'OAuth0';
	tracker.trackerSettings.auth_token = 'a-token';
	tracker.trackerSettings.default_uri = EXT;
	tracker.trackerSettings.platform = EXT;
	tracker.trackerSettings.actor_name = 'player1';
	tracker.trackerSettings.batch_length = BATCH_LENGTH;
	Object.assign(tracker.trackerSettings, settings);

	await tracker.login();
	tracker.start();

	const batches = [];
	let failure = null;
	tracker.tracker.xapi = {
		sendStatements: async ({ statements }) => {
			batches.push(statements);
			if (failure) throw failure;
			return { ok: true };
		}
	};

	return {
		tracker,
		batches,
		failWith(error) { failure = error; },
		sent() { return batches.flat(); }
	};
}

describe('xAPITrackerAsset connection', function() {
	let subject;
	let tracker;

	beforeEach(async function() {
		subject = await connected();
		tracker = subject.tracker;
	});

	afterEach(function() {
		// stop() cancels the pending batch timer, otherwise it would keep mocha alive
		tracker.stop();
	});

	describe('login', function() {
		it('connects when a token was given', async function() {
			expect(tracker.isLoggedIn()).to.equal(true);
			expect(tracker.tracker.connected).to.equal(true);
		});

		it('stays disconnected without a token', async function() {
			const anonymous = await connected({ auth_token: '' });

			expect(anonymous.tracker.isLoggedIn()).to.equal(false);
			expect(anonymous.tracker.tracker.online).to.equal(false);
			anonymous.tracker.stop();
		});
	});

	describe('the actor', function() {
		it('is built from the actor settings', function() {
			expect(tracker.tracker.actor.toXAPI()).to.deep.equal({
				objectType: 'Agent',
				account: { name: 'player1', homePage: EXT }
			});
		});
	});

	describe('queueing', function() {
		it('holds a statement until the batch is full', async function() {
			await tracker.completable('c1').initialized().send();

			expect(tracker.tracker.statementsToSend).to.have.lengthOf(1);
			expect(subject.batches).to.have.lengthOf(0);
		});

		it('sends a batch once the batch is full', async function() {
			await tracker.completable('c1').initialized().send();
			await tracker.completable('c2').initialized().send();

			expect(subject.batches).to.have.lengthOf(1);
			expect(subject.batches[0]).to.have.lengthOf(BATCH_LENGTH);
			expect(tracker.tracker.offset).to.equal(BATCH_LENGTH);
		});

		it('sends the queued statements on flush', async function() {
			await tracker.completable('c1').initialized().send();
			await tracker.flush();

			expect(subject.sent()).to.have.lengthOf(1);
			expect(subject.sent()[0].object.id).to.equal(`${EXT}/c1`);
		});

		it('keeps the statements in the order they were queued', async function() {
			await tracker.completable('c1').initialized().send();
			await tracker.completable('c2').initialized().send();
			await tracker.completable('c3').initialized().send();
			await tracker.flush();

			expect(subject.sent().map(s => s.object.id)).to.deep.equal([
				`${EXT}/c1`, `${EXT}/c2`, `${EXT}/c3`
			]);
		});

		it('sends the actor and the context of every statement', async function() {
			await tracker.completable('c1').initialized().send();
			await tracker.flush();

			const [statement] = subject.sent();
			expect(statement.actor.account.name).to.equal('player1');
			expect(statement.context.platform).to.equal(EXT);
			expect(statement.context.contextActivities.category[0].id)
				.to.equal('https://w3id.org/xapi/seriousgames/v1.0');
		});

		it('does not resend the statements that were already sent', async function() {
			await tracker.completable('c1').initialized().send();
			await tracker.completable('c2').initialized().send();
			await tracker.flush();
			await tracker.flush();

			expect(subject.sent()).to.have.lengthOf(2);
		});
	});

	describe('while offline', function() {
		beforeEach(function() {
			tracker.tracker.online = false;
		});

		it('queues without sending', async function() {
			await tracker.completable('c1').initialized().send();
			await tracker.flush();

			expect(tracker.tracker.statementsToSend).to.have.lengthOf(1);
			expect(subject.batches).to.have.lengthOf(0);
		});
	});

	describe('flushing an empty queue', function() {
		it('sends nothing', async function() {
			await tracker.flush();
			await tracker.flush();

			expect(subject.batches).to.have.lengthOf(0);
			expect(tracker.tracker.offset).to.equal(0);
		});
	});

	describe('when the LRS refuses a batch', function() {
		/**
		 * Fills a batch so that the tracker tries to send it, which fails
		 * @returns {Promise<any>} the error the tracker reported, or undefined if it reported none
		 */
		async function sendFailingBatch() {
			try {
				await tracker.completable('c1').initialized().send();
				await tracker.completable('c2').initialized().send();
				return undefined;
			} catch (error) {
				return error;
			}
		}

		it('skips the batch and reports the failure', async function() {
			subject.failWith({ response: { status: 400, data: { message: 'Bad Request' } } });

			expect(await sendFailingBatch()).to.not.equal(undefined);
			expect(tracker.tracker.offset).to.equal(BATCH_LENGTH);
		});

		it('goes offline and backs off after a server error', async function() {
			subject.failWith({ response: { status: 500, data: { message: 'Server Error' } } });

			await sendFailingBatch();

			expect(tracker.tracker.online).to.equal(false);
			expect(tracker.tracker.offset).to.equal(0);
			expect(tracker.tracker.retryDelay).to.be.a('number');
		});

		it('keeps the statements queued while the tracker stays offline', async function() {
			subject.failWith({ response: { status: 500, data: { message: 'Server Error' } } });
			await sendFailingBatch();

			// the tracker only reconnects through login(), so a later flush sends nothing
			subject.failWith(null);
			await tracker.flush();

			expect(tracker.tracker.statementsToSend).to.have.lengthOf(2);
			expect(tracker.tracker.offset).to.equal(0);
		});
	});

	describe('stop', function() {
		it('drops the queue and goes offline', async function() {
			await tracker.completable('c1').initialized().send();
			tracker.stop();

			expect(tracker.tracker.statementsToSend).to.have.lengthOf(0);
			expect(tracker.tracker.offset).to.equal(0);
			expect(tracker.isStarted()).to.equal(false);
			expect(tracker.isLoggedIn()).to.equal(false);
		});
	});

	describe('the XAPI client', function() {
		it('is not handed out while the tracker is offline', function() {
			tracker.tracker.online = false;

			expect(() => tracker.tracker.getXAPIClient()).to.throw(/offline/);
		});

		it('is not handed out while the tracker is disconnected', function() {
			tracker.tracker.connected = false;

			expect(() => tracker.tracker.getXAPIClient()).to.throw(/not connected/);
		});

		it('is handed out once the tracker is online', function() {
			expect(tracker.tracker.getXAPIClient()).to.equal(tracker.tracker.xapi);
		});
	});
});
