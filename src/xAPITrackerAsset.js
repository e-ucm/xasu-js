import XAPI from "@xapi/xapi";
import ActorStatement from "./HighLevel/Statement/ActorStatement.js";
import ContextStatement from "./HighLevel/Statement/ContextStatement.js";
import Statement from "./HighLevel/Statement/Statement.js";
import StatementBuilder from "./HighLevel/StatementBuilder/StatementBuilder.js";
import axios from 'axios';
import * as ms from "ms";
import LRSStatementBuilder from "./HighLevel/StatementBuilder/LRSStatementBuilder.js";
import LRSStatement from "./HighLevel/Statement/LRSStatement.js";
const msFn = ms.default || ms;
import { ALL } from "./HighLevel/Statement/Ids/Profiles/Generated/All.js";

/**
 * XAPI Tracker Asset Class
 * Handles xAPI tracking with batch processing, retry logic, and backup capabilities
 */
export default class xAPITrackerAsset {
    // XAPI PARAMETERS

    /**
     * XAPI Tracker instance
     * @type {XAPI|null}
     */
    xapi=null;

    /**
     * Settings of XAPI Tracker Asset
     * @typedef {Object} settings
     * @property {boolean} batch_mode
     * @property {string} batch_endpoint
     * @property {number} batch_length
     * @property {number} batch_timeout
     * @property {string} platform
     * @property {string} actor_name
     * @property {string} actor_homepage
     * @property {boolean} backup_mode
     * @property {string} backup_endpoint
     * @property {string} backup_type
     * @property {string} default_uri
     * @property {number} max_retry_delay
     * @property {boolean} debug
     * @property {string} parent_activity_id
     * @property {string} registration_id
    * @property {string} parent_activity_type
     */
    settings={
        batch_mode:true,
        batch_endpoint:"http://myurl.com/endpoint",
        batch_length:100,
        batch_timeout:msFn("30sec"),
        platform:"http://myhomepage.com",
        actor_name:"my_default_actor",
        actor_homepage:"",
        backup_mode:false,
        backup_endpoint:"http://myurl.com/backup-endpoint",
        backup_type:"XAPI",
        default_uri:"mydefaulturi",
        max_retry_delay:msFn("2min"),
        debug:false,
        parent_activity_id:'',
        registration_id: '',
        parent_activity_type:ALL.ACTIVITYTYPES.LESSON
    };

    /**
     * Authentication token for xAPI requests
     * @type {string|null}
     */
    auth_token = null;

    /**
     * Current online status
     * @type {boolean}
     */
    online = false;

    /**
     * Current connected status
     * @type {boolean}
     */
    connected = false;

    /**
     * Current started status
     * @type {boolean}
     */
    started = false;

    // STATEMENTS PARAMETERS

    /**
     * Queue of statements to be sent
     * @type {Array<Statement>}
     */
    statementsToSend = [];

    /**
     * Flag indicating if sending is currently in progress
     * @type {boolean}
     */
    sendingInProgress = false;

    /**
     * Current offset in the statements queue
     * @type {number}
     */
    offset = 0;

    // BACKUP PARAMETERS
    /**
     * Additional parameters for backup requests
     * @type {Object|null}
     */
    backupRequestParameters = null;

    // ACTOR PARAMETERS
    /**
     * Actor statement object
     * @type {ActorStatement}
     */
    actor;

    /**
     * Context statement object
     * @type {ContextStatement}
     */
    context;
    
    /**
     * Context statement without parent object
     * @type {ContextStatement}
     */
    context_without_parent;

    // BATCH AND RETRY PARAMETERS
    /**
     * Current retry delay in milliseconds
     * @type {number|null}
     */
    retryDelay;

    /**
     * Timer reference for batch processing
     * @type {NodeJS.Timeout|null}
     */
    timer = null;

    /**
     * Creates an instance of xAPITrackerAsset
     */
    constructor() {
        this.#onOffline();
    }

    /**
     * Logs out the current session by clearing the authentication token
     */
    logout() {
         if(this.connected) {
            this.auth_token = null;
         }
    }
    
    isLoggedIn() {
        return this.connected && this.auth_token != null;
    }
    
    /**
     * Event handler called when the client goes offline
     */
    #onOffline() {
        this.online = false;        
        if (this.settings.debug) console.warn("XAPI Tracker for Serious Games went offline");
    }

    start() {
        this.started = true;
        const actorName = this.settings.actor_name || this.getUsername() || '';
        const homePage = this.settings.actor_homepage || this.settings.platform || '';
        this.actor = new ActorStatement({account :{name: actorName, homePage: homePage}});
        if(this.settings.registration_id) {
            this.context = new ContextStatement(this.settings.default_uri, this.settings.platform, this.settings.registration_id);
        } else {
            this.context = new ContextStatement(this.settings.default_uri, this.settings.platform);
        }
        // the category classifies every statement of this tracker, so it is added before cloning the
        // context, otherwise the cloned context used by the SCORM instances would lose it
        if(this.settings.category) {
            this.context.addCategory(this.settings.category);
        }
        this.context_without_parent = this.context.clone();
        if(this.settings.parent_activity_id) {
            this.context.addContextActivity("parent", this.settings.parent_activity_id, this.settings.parent_activity_type);
        }
        if(this.connected) {
            this.xapi = new XAPI({
                endpoint: this.settings.batch_endpoint,
                auth: this.auth_token
            });
        }
        if(this.xapi != null) {
            this.#onOnline();
        } else {
            this.#onOffline();
        }
    }

    stop() {
        this.started = false;
        this.connected=false;
        this.online=false;
        this.offset = 0;
        this.statementsToSend = [];
        this.#stopTimer();
        this.retryDelay = null;
        this.actor = null;
        this.context = null;
        this.xapi=null;
        this.#onOffline();
    }

    /**
     * Event handler called when the client comes online
     * @returns {Promise<void>}
     */
    async #onOnline() {
        this.online = true;
        if (this.settings.debug) console.info("XAPI Tracker for Serious Games back Online");
    }

    /**
     * Updates the authentication configuration
     * 
     */
    async login() {
        if(this.auth_token) {
            this.connected=true;
        } else {
            this.connected=false;
        }
    }

    getUsername()  {
        return this.settings.actor_name || "";
    }

    /**
     * Sends a batch of statements to the xAPI endpoint
     * @returns {Promise<void>}
     */
    async #sendBatch() {
        if (!this.online) return;
        if (this.offset >= this.statementsToSend.length) return;

        const end = Math.min(this.offset + this.settings.batch_length, this.statementsToSend.length);
        const batch = this.statementsToSend.slice(this.offset, end);
        const statements = batch.map(statement => statement.toXAPI());

        try {
            if(!this.sendingInProgress) {
                this.sendingInProgress = true;
                const result = await this.xapi.sendStatements({statements: statements});
                this.sendingInProgress = false;
                if (this.settings.debug) {
                    console.debug("Batch sent successfully:", result);
                }
                this.offset += batch.length;
                this.retryDelay = null;
            }
        } catch (error) {
            let rethrow = true;
            this.sendingInProgress = false;
            if (!error.response) {
                // Network error or no response (e.g. ECONNREFUSED, DNS failure)
                console.error("[TRACKER: Batch Processor] Network error (no response):", error.message);
                this.#onOffline();
            } else {
                console.error("Error sending batch:", error.response);
                const status = error.response.status;
                const errorMessage = (error.response.data && error.response.data.message) || error.message;

                switch (status) {
                    case 400: // Bad Request
                        console.error(`Bad Request: ${errorMessage}`);
                        // Bad Request likely means there's an issue with the statement format or content
                        // Log the error and skip this batch to avoid blocking future batches
                        this.offset += batch.length; // Skip the problematic batch
                        break;
                    case 401: // Unauthorized
                    case 403: // Forbidden
                        console.error(`${status === 401 ? 'Unauthorized' : 'Forbidden'}: ${errorMessage}`);
                        this.rethrow = false; // Don't rethrow since we're handling the retry logic here
                        this.#onOffline();
                        await this.refreshAuth();
                        await this.#sendBatch();
                        break;
                    default:
                        console.error(`[TRACKER: Batch Processor] Batch upload returned status ${status} with message: ${errorMessage}`);
                        this.#onOffline();
                }
            }

            if(this.retryDelay == null) {
                this.retryDelay = this.settings.batch_timeout;
            }
            this.retryDelay = Math.min(this.retryDelay * 2, this.settings.max_retry_delay);
            this.#stopTimer();
            if (this.offset < this.statementsToSend.length) {
                this.#startTimer();
            }
            if(rethrow) {
                throw error; // Rethrow to allow external handling if needed
            }
        }

        if (this.offset < this.statementsToSend.length) {
            this.#startTimer();
        }
    }

    /**
     * Refreshes the authentication token
     * @returns {Promise<void>}
     */
    async refreshAuth() {
        this.login();
    }

    /**
     * Cancels the pending batch timer, if any
     */
    #stopTimer() {
        if (this.timer) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    }

    /**
     * Starts the timer for batch processing
     */
    #startTimer() {
        if (this.timer) return;
        let timeout = this.retryDelay ? this.retryDelay : this.settings.batch_timeout;

        this.timer = setTimeout(async () => {
            // release the handle first, a failing batch arms the timer again by itself
            this.timer = null;
            await this.#sendBatch();
            if (this.offset < this.statementsToSend.length) {
                this.#startTimer();
            }
        }, timeout);
    }

    /**
     * Creates a new statement builder
     * @param {string} verbId - The verb ID for the statement
     * @param {string} objectType - The type of the object
     * @param {string} objectId - The ID of the object
     * @returns {StatementBuilder} A new StatementBuilder instance
     */
    trace(verbId, objectType, objectId, context = this.context, lrs = false) {
        // each statement gets its own context, otherwise the activities and the extensions that a
        // builder adds would end up in every other statement of the tracker, and in the tracker
        const statement = lrs
            ? new LRSStatement(this.actor, verbId, objectId, objectType, context.clone(), this.settings.default_uri)
            : new Statement(this.actor, verbId, objectId, objectType, context.clone(), this.settings.default_uri);
        if(lrs) {
            return new LRSStatementBuilder(this, statement);
        } else {
            return new StatementBuilder(this, statement);
        }
    }

    /**
     * Creates a StatementBuilder from an existing xAPI statement object
     * @overload
     * @param {Object} statement - The statement to send
     * @param {true} lrs - Whether to create an LRSStatementBuilder
     * @return {LRSStatementBuilder} A new LRSStatementBuilder instance
     */
    /**
     * @overload
     * @param {Object} statement - The statement to send
     * @param {false} [lrs] - Whether to create a regular StatementBuilder
     * @return {StatementBuilder} A new StatementBuilder instance
     */
    /**
     * @param {Object} statement
     * @param {boolean} [lrs]
     * @return {StatementBuilder|LRSStatementBuilder}
     */
    fromXAPI(statement, lrs = false) {
        if(lrs) {   
            const stmt = LRSStatement.fromXAPI(statement, this.settings.default_uri, this.settings.platform);
            return new LRSStatementBuilder(this, stmt);
        } else {
            const stmt = Statement.fromXAPI(statement, this.settings.default_uri, this.settings.platform);
            return new StatementBuilder(this, stmt);
        }
    }

    /**
     * Sends statements to the backup endpoint
     * @returns {Promise<void>}
     */
    async #sendBackup() {
        if (this.online && this.settings.backup_endpoint && this.settings.backup_endpoint.trim()) {
            let contentType;
            let statements;

            switch (this.settings.backup_type) {
                case 'XAPI':
                    statements = this.statementsToSend.map(statement => JSON.stringify(statement.toXAPI()));
                    contentType = 'application/json';
                    break;
                case 'CSV':
                    statements = this.statementsToSend.map(statement => statement.toCSV());
                    contentType = 'text/csv';
                    break;
                default:
                    return;
            }

            const body = {
                tofile: true,
                result: statements.join('\n'),
                contentType: contentType
            };

            const myRequest = {
                url: this.settings.backup_endpoint,
                method: 'POST',
                headers: {
                    'Authorization': this.auth_token || '',
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(body, null, 2)
            };

            if (this.backupRequestParameters) {
                if (this.backupRequestParameters.content_type) {
                    myRequest.headers['Content-Type'] = this.backupRequestParameters.content_type;
                }

                if (this.backupRequestParameters.headers && typeof this.backupRequestParameters.headers === 'object') {
                    Object.entries(this.backupRequestParameters.headers).forEach(([key, value]) => {
                        myRequest.headers[key] = value;
                    });
                }

                if (this.backupRequestParameters.query_parameters && typeof this.backupRequestParameters.query_parameters === 'object') {
                    const queryParams = new URLSearchParams(this.backupRequestParameters.query_parameters).toString();
                    myRequest.url += `?${queryParams}`;
                }
            }

            try {
                const response = await axios(myRequest);
                console.log(response);
            } catch (error) {
                if (error.response) {
                    const status = error.response.status;
                    const errorMessage = error.response.data.message || error.message;

                    switch (status) {
                        case 401: // Unauthorized
                        case 403: // Forbidden
                            this.#onOffline();
                            console.error(`${status === 401 ? 'Unauthorized' : 'Forbidden'}: ${errorMessage}`);
                            await this.refreshAuth();
                            await this.#sendBackup();
                            break;
                        default:
                            console.error(`[TRACKER: Backup Processor] Backup upload returned status ${status} with message: ${errorMessage}`);
                            break;
                    }
                } else {
                    throw new Error(`Request failed: ${error.message}`);
                }
            }
        }
    }

    /**
     * Adds a statement to the queue and starts processing if needed
     * @param {Statement} statement - The statement to enqueue
     * @returns {Promise<void>}
     */
    async enqueue(statement) {
        if(this.settings.debug) {
            console.debug(statement.toXAPI());
            console.debug(statement.toCSV());
        }

        this.statementsToSend.push(statement);

        if (this.online && this.statementsToSend.length >= this.offset + this.settings.batch_length) {
            await this.#sendBatch();
        }

        this.#startTimer();
    }

    /**
     * Flushes the statement queue
     * @param {Object} [opts] - Options object
     * @param {boolean} [opts.withBackup=false] - Whether to also send to backup endpoint
     * @returns {Promise<void>} Promise that resolves when flushing is complete
     */
    async flush({withBackup = false} = {}) {
        if(withBackup) {
            await Promise.all([
                this.#sendBatch(),
                this.#sendBackup()
            ]);
        } else {
            await this.#sendBatch();
        }
    }
    
    /**
     * Gets the XAPI client
     * @returns {XAPI} The XAPI client
     */
    getXAPIClient() {
        if (!this.online) {
            throw new Error("Cannot get XAPI client: Tracker is offline");
        }
        if (!this.connected) {
            throw new Error("Cannot get XAPI client: Tracker is not connected");
        }
        if (!this.xapi) {
            throw new Error("Cannot get XAPI client: XAPI client is not initialized");
        }
        try {
            return this.xapi;
        } catch (error) {
            throw new Error(`Failed to get XAPI client: ${error.message}`);
        }
    }
}