import xAPITrackerAsset from './xAPITrackerAsset.js';
import xAPITrackerAssetOAuth1 from './Auth/OAuth1.js';
import xAPITrackerAssetOAuth2 from './Auth/OAuth2.js';
import { AccessibleTracker, ACCESSIBLETYPE } from './HighLevel/SeriousGames/Accessible.js';
import { CompletableTracker, COMPLETABLETYPE } from './HighLevel/SeriousGames/Completable.js';
import { AlternativeTracker, ALTERNATIVETYPE } from './HighLevel/SeriousGames/Alternative.js';
import { GameObjectTracker, GAMEOBJECTTYPE } from './HighLevel/SeriousGames/GameObject.js';;

import { ScormTracker } from './HighLevel/Scorm/SCORM.js';
import StatementBuilder from './HighLevel/StatementBuilder/StatementBuilder.js';
import * as ms from "ms";
import LRSStatementBuilder from './HighLevel/StatementBuilder/LRSStatementBuilder.js';
import { ALL } from './HighLevel/Statement/Ids/Profiles/Generated/All.js';
import { SERIOUSGAMESPROFILE } from './HighLevel/Statement/Ids/Profiles/Generated/SeriousGamesProfile.js';
import { SCORMPROFILE } from './HighLevel/Statement/Ids/Profiles/Generated/ScormProfile.js';
import { STATEMENT } from './HighLevel/Statement/Ids/Statements.js';
const msFn = ms.default || ms;

/**
 * Main JavaScript Tracker class for xAPI tracking functionality
 */
export class JSTracker {
    ALL = ALL;
    STATEMENT_BUILDER_IDS = STATEMENT;
    /**
     * The underlying tracker instance
     * @type {xAPITrackerAssetOAuth2|xAPITrackerAssetOAuth1|xAPITrackerAsset}
     */
    tracker;

    /**
     * Indicates if the tracker has been started
     * @type {boolean}
     */
    Started = false;
    
    /**
     * Settings of JSTracker
     * @typedef {Object} trackerSettings
     * @property {boolean} [generateSettingsFromURLParams=false] - Read the settings from the query parameters of the page
     * @property {string} [oauth_type="OAuth0"] - Which authentication to use: `OAuth0`, `OAuth1`, or `OAuth2`
     * @property {boolean} [batch_mode=true] - Accepted for compatibility, the tracker always batches and has no other mode
     * @property {string} [batch_endpoint="http://myurl.com/endpoint"] - The LRS statements are sent to
     * @property {number} [batch_length=100] - How many statements fill a batch, which is also the latency of sending one
     * @property {number} [batch_timeout=30000] - How long a partial batch waits before it is sent, in milliseconds
     * @property {string} [platform="http://myhomepage.com"] - Homepage of the game, recorded in the context of every statement
     * @property {string} [actor_name="my_default_actor"] - Name of the account of the actor
     * @property {string} [actor_homepage=""] - Homepage of the account service of the actor, when it is not the platform
     * @property {boolean} [backup_mode=false] - Accepted for compatibility, a backup is sent whenever flush is called with it
     * @property {string} [backup_endpoint="http://myurl.com/backup-endpoint"] - Where a copy of the statements is sent
     * @property {string} [backup_type="XAPI"] - The form of that copy: `XAPI` or `CSV`
     * @property {string} [default_uri="mydefaulturi"] - Base for every id that is not already an absolute IRI
     * @property {number} [max_retry_delay=120000] - Ceiling of the retry backoff, in milliseconds
     * @property {boolean} [debug=false] - Log every batch, and turn the warnings into thrown errors
     * @property {string} [parent_activity_id=""] - Activity this content belongs to, added as the parent of every statement
     * @property {string} [registration_id=""] - Registration that ties these statements to one attempt at some material
     * @property {string} [parent_activity_type] - Type of the parent activity
     * @property {string} [category] - Category added to the context of every statement; a serious game defaults to the serious games category
     * @property {string} [auth_token] - Token used when `oauth_type` is `OAuth0`
     */
    trackerSettings={
        generateSettingsFromURLParams:false,
        oauth_type:"OAuth0",
        batch_mode:true,
        batch_endpoint:"http://myurl.com/endpoint",
        batch_length:100,
        batch_timeout:msFn("30sec"),
        platform:"http://myhomepage.com",
        actor_name:"my_default_actor",
        backup_mode:false,
        backup_endpoint:"http://myurl.com/backup-endpoint",
        backup_type:"XAPI",
        default_uri:"mydefaulturi",
        max_retry_delay:msFn("2min"),
        debug:false,
        parent_activity_id:'',
        registration_id: '',
        parent_activity_type:ALL.ACTIVITYTYPES.LESSON,
        category: '',
        auth_token: '',
        actor_homepage:''
    };
    /**
     * The credentials used when oauth_type is OAuth1
     * @typedef {Object} oauth1
     * @property {string} username
     * @property {string} password
     */
    oauth1={
        username:"superusername",
        password:"supersecret"
    };

/**
     * The settings used when oauth_type is OAuth2
     * @typedef {Object} oauth2
     * @property {string} token_endpoint - Where the access token is requested
     * @property {string} grant_type - `password`, `refresh_token`, or `urn:ietf:params:oauth:grant-type:device_code`
     * @property {string} client_id
     * @property {string} [client_secret] - Only for a confidential client
     * @property {string} [scope="openid profile"]
     * @property {string} [state] - Only for the authorization code flow
     * @property {string} [code_challenge_method] - Only `S256` is supported
     * @property {string} [username] - For the password grant
     * @property {string} [password] - For the password grant
     * @property {string} [login_hint] - Which account the provider should offer first
     * @property {string} [device_authorization_endpoint] - Where the device code is requested, for the device_code grant
     * @property {number} [poll_interval] - Seconds between polls of the token endpoint, for the device_code grant
     * @property {number} [max_poll_attempts] - How many times to poll before giving up, for the device_code grant
     * @property {string} [language] - Language of the device sign-in screen: `en`, `es`, or `fr`
     */
    oauth2 = {
        token_endpoint:                 "https://.../token",
        client_id:                      "my_client_id",
        client_secret:                  "",
        grant_type:                     "password",
        scope:                          "openid profile",
        state:                          "",
        code_challenge_method:          "",
        username:                       "alice@example.com",
        password:                       "supersecret",
        login_hint:                     "alice@example.com",
        device_authorization_endpoint:  "",
        poll_interval:                  null,
        max_poll_attempts:              null,
        language:                       "",
    };

    /**
     * Creates a new JSTracker instance
     */
    constructor() {
    }

    /**
     * 
     * @returns {Promise<void>} 
     */
    async login() {
        if(this.trackerSettings.generateSettingsFromURLParams) {
            this.generateXAPITrackerFromURLParams();
        }
         if (this.trackerSettings.oauth_type === "OAuth2") {
            /**
             * @type {xAPITrackerAssetOAuth2}
             */
            this.tracker = new xAPITrackerAssetOAuth2();
            if (this.tracker && 'oauth2Settings' in this.tracker) {
                this.tracker.oauth2Settings = this.oauth2;
            } else {
                throw new Error("tracker isn't OAuth2");
            }
        } else if (this.trackerSettings.oauth_type === "OAuth1") {
            /**
             * @type {xAPITrackerAssetOAuth1}
             */
            this.tracker = new xAPITrackerAssetOAuth1();
            if (this.tracker && 'oauth1Settings' in this.tracker) {
                this.tracker.oauth1Settings = this.oauth1;
            } else {
                throw new Error("tracker isn't OAuth1");
            }
        } else {
            this.tracker = new xAPITrackerAsset();
            this.tracker.auth_token = this.trackerSettings.auth_token;
        }
        this.tracker.settings = this.trackerSettings;
        await this.tracker.login();
    }

    isStarted() {
        return this.Started;
    }

    isLoggedIn() {
        return this.tracker && this.tracker.isLoggedIn();
    }
    
    start() {
        if(!this.tracker) {
            this.tracker = new xAPITrackerAsset();
        }
        this.tracker.settings = this.trackerSettings;
        this.tracker.start();
        this.Started=true;
    }

    stop() {
        this.tracker.stop();
        this.Started = false;
    };

    logout() {
        if(this.tracker) {
            this.tracker.logout();
        }
        this.trackerSettings.oauth_type="OAuth0";
    }

    /**
     * Flushes the statement queue
     * @param {Object} [opts] - Flush options
     * @param {boolean} [opts.withBackup=false] - Whether to also send to backup endpoint
     * @returns {Promise<void>} Promise that resolves when flushing is complete
     */
    async flush({ withBackup = false } = {}) {
        if(this.tracker) {
            return await this.tracker.flush({ withBackup: withBackup });
        }
    }

    /**
     * Generates an xAPI tracker instance from URL parameters
     */
    generateXAPITrackerFromURLParams() {
        const xAPIConfig = {};
        const urlParams = new URLSearchParams(window.location.search);
        let result_uri, backup_uri, backup_type, actor_name, platform, actor_homepage, strDebug, debug;
        let username, password, auth_token;
        let batchLength, batchTimeout, maxRetryDelay;

        if (urlParams.size > 0) {
            // RESULT URI
            result_uri = urlParams.get('result_uri');

            // BACKUP URI
            backup_uri = urlParams.get('backup_uri');
            backup_type = urlParams.get('backup_type');

            // ACTOR DATA
            platform = urlParams.get('platform');
            actor_name = urlParams.get('actor_user');
            actor_homepage = urlParams.get('actor_homepage');

            // SSO OAUTH 2.0 DATA
            const sso_token_endpoint = urlParams.get('sso_token_endpoint');
            if (sso_token_endpoint) {
                xAPIConfig.token_endpoint = sso_token_endpoint;
            }
            const sso_client_id = urlParams.get('sso_client_id');
            if (sso_client_id) {
                xAPIConfig.client_id = sso_client_id;
            }
            const sso_login_hint = urlParams.get('sso_login_hint');
            if (sso_login_hint) {
                xAPIConfig.login_hint = sso_login_hint;
            }
            const sso_grant_type = urlParams.get('sso_grant_type');
            if (sso_grant_type) {
                xAPIConfig.grant_type = sso_grant_type;
            }
            const sso_scope = urlParams.get('sso_scope');
            if (sso_scope) {
                xAPIConfig.scope = sso_scope;
            }
            const sso_username = urlParams.get('sso_username');
            if (sso_username) {
                xAPIConfig.username = sso_username;
            }
            const sso_password = urlParams.get('sso_password');
            if (sso_password) {
                xAPIConfig.password = sso_password;
            } else {
                if (sso_username) {
                    xAPIConfig.password = sso_username;
                }
            }
            
            // SSO OAUTH 2.0 DEVICE AUTHORIZATION DATA
            const sso_device_authorization_endpoint = urlParams.get('sso_device_authorization_endpoint');
            if (sso_device_authorization_endpoint) {
                xAPIConfig.device_authorization_endpoint = sso_device_authorization_endpoint;
            }
            const sso_poll_interval = urlParams.get('sso_poll_interval');
            if (sso_poll_interval) {
                xAPIConfig.poll_interval = parseInt(sso_poll_interval, 10);
            }
            const sso_max_poll_attempts = urlParams.get('sso_max_poll_attempts');
            if (sso_max_poll_attempts) {
                xAPIConfig.max_poll_attempts = parseInt(sso_max_poll_attempts, 10);
            }
            const sso_language = urlParams.get('sso_language');
            if (sso_language) {
                xAPIConfig.language = sso_language;
            }

            // OAUTH 1.0 DATA
            username = urlParams.get('username');
            password = urlParams.get('password');

            // OAUTH 0: VIA AUTHTOKEN DIRECTLY (not recommended)
            auth_token = urlParams.get('auth_token');

            // DEBUG
            strDebug = urlParams.get('debug');

            // BATCH
            var batch_length_param=urlParams.get('batch_length');
            var batch_timeout_param=urlParams.get('batch_timeout');
            var max_retry_delay_param=urlParams.get('max_retry_delay');
            if(batch_length_param) {
                batchLength = parseInt(batch_length_param);
            }
            if(batch_timeout_param) {
                batchTimeout = msFn(batch_timeout_param);
            }
            if(max_retry_delay_param) {
                maxRetryDelay = msFn(max_retry_delay_param);
            }
            
            if (strDebug !== null && strDebug === "true") {
                debug = Boolean(strDebug);
                console.debug(result_uri);
                console.debug(backup_type);
                console.debug(actor_name);
                console.debug(platform);
                console.debug(debug);
                console.debug(batchLength);
                console.debug(batchTimeout);
                console.debug(maxRetryDelay);
            }
        } else {
            backup_type = "XAPI";
        }

        if (xAPIConfig.token_endpoint) {
            this.trackerSettings.oauth_type="OAuth2";
            //if(!xAPIConfig.client_id || !xAPIConfig.grant_type || !xAPIConfig.token_endpoint) {
            //    throw new Error("Missing required OAuth2 parameters in URL. Required: sso_token_endpoint, sso_client_id, sso_grant_type");
            //}
            //if(xAPIConfig.grant_type === "password" && (!xAPIConfig.username || !xAPIConfig.password)) {
            //    throw new Error("Missing required OAuth2 parameters for password grant type. Required: sso_username, sso_password");
            //}
            //if(xAPIConfig.grant_type === "urn:ietf:params:oauth:grant-type:device_code" && !xAPIConfig.device_authorization_endpoint) {
            //    throw new Error("Missing required OAuth2 parameters for device_code grant type. Required: sso_device_authorization_endpoint");
            //}
            this.oauth2.client_id = xAPIConfig.client_id;
            this.oauth2.grant_type = xAPIConfig.grant_type;
            this.oauth2.login_hint = xAPIConfig.login_hint;
            this.oauth2.username = xAPIConfig.username;
            this.oauth2.password = xAPIConfig.password;
            this.oauth2.scope = xAPIConfig.scope;
            this.oauth2.token_endpoint = xAPIConfig.token_endpoint;
            this.oauth2.device_authorization_endpoint = xAPIConfig.device_authorization_endpoint;
            this.oauth2.poll_interval = xAPIConfig.poll_interval;
            this.oauth2.max_poll_attempts = xAPIConfig.max_poll_attempts;
            this.oauth2.language = xAPIConfig.language;
        } else if (username && password) {
            this.trackerSettings.oauth_type="OAuth1";
            this.oauth1.username = username;
            this.oauth1.password = password;
        } else {
            this.trackerSettings.oauth_type="OAuth0";
            this.trackerSettings.auth_token = auth_token;
        }
        if(result_uri !== undefined) {
            this.trackerSettings.batch_endpoint=result_uri;
        }
        if(platform !== undefined) {
            this.trackerSettings.platform=platform;
        }
        if(actor_name !== undefined) {
            this.trackerSettings.actor_name=actor_name;
        }
        if(actor_homepage !== undefined) {
            this.trackerSettings.actor_homepage=actor_homepage;
        }
        if(backup_uri !== undefined) {
            this.trackerSettings.backup_endpoint=backup_uri;
        }
        if(backup_type !== undefined) {
            this.trackerSettings.backup_type=backup_type;
        }
        if(debug !== undefined) {
            this.trackerSettings.debug=debug;
        }
        if(batchLength !== undefined) {
            this.trackerSettings.batch_length=batchLength;
        }
        if(batchTimeout !== undefined) {
            this.trackerSettings.batch_timeout=batchTimeout;
        }
        if(maxRetryDelay !== undefined) {
            this.trackerSettings.max_retry_delay=maxRetryDelay;
        }
    }

    /**
     * Creates a new statement builder
     * @param {string} verbId - The verb ID for the statement
     * @param {string} objectType - The type of the object
     * @param {string} objectId - The ID of the object
     * @returns {StatementBuilder} A new StatementBuilder instance
     */
    trace(verbId, objectType, objectId) {
        if (!this.tracker) {
            throw new Error("Tracker not initialized. Call login() and start() before trace().");
        }
        return this.tracker.trace(verbId, objectType, objectId);
    }

    /**
     * Creates a new statement builder from an xAPI statement
     * @param {Object} statement - The xAPI statement to create the builder from
     * @returns {StatementBuilder} A new StatementBuilder instance
     */
    fromXAPI(statement) {
        if (!this.tracker) {
            throw new Error("Tracker not initialized. Call login() and start() before sending statements.");
        }
        return this.tracker.fromXAPI(statement);
    }
}

/**
 * SCORM-specific tracker extending JSTracker
 */
export class JSScormTracker extends JSTracker {
    SCORMPROFILE = SCORMPROFILE;
    STATEMENT_BUILDER_IDS = STATEMENT;
    ALL = ALL;
    /**
     * list of scorm instances
     */
    scormInstances={};

    /**
     * Creates a new JSScormTracker instance
     */
    constructor() {
        super();
    }

    async login() {
        await super.login();
        if(!this.scormInstances[this.trackerSettings.parent_activity_type]) {
            this.scormInstances[this.trackerSettings.parent_activity_type]= {};
        }
        if(this.trackerSettings.parent_activity_id && !(this.trackerSettings.parent_activity_id in this.scormInstances[this.trackerSettings.parent_activity_type])) {
            this.scormInstances[this.trackerSettings.parent_activity_type][this.trackerSettings.parent_activity_id]= new ScormTracker(this.tracker, this.trackerSettings.parent_activity_id, this.trackerSettings.parent_activity_type, this.tracker.context_without_parent);
        }
    }

    logout() {
        super.logout();
        this.scormInstances={};
    }

    /**
     * Creates a new SCORM tracker instance
     * @param {string} id - Activity ID
     * @param {string} type - SCORM type
     * @returns {ScormTracker} New SCORM tracker instance
     */
    scorm(id, type=SCORMPROFILE.ACTIVITYTYPES.LESSON) {
        var scorm;
        if(!this.scormInstances[type]) {
            this.scormInstances[type]={};
        }
        if(!this.scormInstances[type][id]) {
            scorm =new ScormTracker(this.tracker, id, type);
            this.scormInstances[type][id]=scorm;
        } else {
            scorm=this.scormInstances[type][id];
        }
        return scorm;
    }

    /**
     * Creates a new statement builder
     * @param {string} verbId - The verb ID for the statement
     * @param {string} objectType - The type of the object
     * @param {string} objectId - The ID of the object
     * @return {StatementBuilder} A new StatementBuilder instance
     *  */
    trace(verbId, objectType, objectId) {
        return super.trace(verbId, objectType, objectId);
    }

    /**
     * Creates a new statement builder from an xAPI statement
     * @param {Object} statement - The xAPI statement to create the builder from
     * @returns {StatementBuilder} A new StatementBuilder instance
     */
    fromXAPI(statement) {
        return super.fromXAPI(statement);
    }
}

/**
 * SCORM-specific tracker extending JSTracker
 */
export class LRSTracker extends JSTracker {
    ALL = ALL;    
    STATEMENT_BUILDER_IDS = STATEMENT;
    /**
     * Creates a new MyTracker instance
     */
    constructor() {
        super();
    }

    async login() {
        await super.login();
    }

    logout() {
        super.logout();
    }
    
    /**
     * Creates a new statement builder
     * @param {string} verbId - The verb ID for the statement
     * @param {string} objectType - The type of the object
     * @param {string} objectId - The ID of the object
     * @return {StatementBuilder} A new StatementBuilder instance
     *  */
    trace(verbId, objectType, objectId) {
        if (!this.tracker) {
            throw new Error("Tracker not initialized. Call login() and start() before trace().");
        }
        return this.tracker.trace(verbId, objectType, objectId, this.tracker.context, true);
    }

    /**
     * Creates a new statement builder from an xAPI statement
     * @param {Object} statement - The xAPI statement to create the builder from
     * @returns {LRSStatementBuilder} A new StatementBuilder instance
     */
    fromXAPI(statement) {
        return this.tracker.fromXAPI(statement, true);
    }

    async getLRSClientResponseData(response) {
        return response && response.data !== undefined ? response.data : response;
    }

    /**
     * Gets a statement by its ID
     * @param {string} statementId - The ID of the statement to fetch
     * @returns {Promise} A promise that resolves with the fetched statement
     */
    async getStatementById(statementId) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getStatement({ statementId });
        return this.getLRSClientResponseData(response);
    }

    /**
     * Gets statements based on a query
     * @param {Object} query - The query to filter statements
     * @returns {Promise} A promise that resolves with the fetched statements
     */
    async getStatementByQuery(query) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getStatements(query);
        return this.getLRSClientResponseData(response);
    }

    /**
     * Gets more statements using a "more" URL from a previous query result
     * @param {string} moreUrl - The URL to fetch more statements
     * @returns {Promise} A promise that resolves with the fetched statements
     */
    async getMoreStatements(moreUrl) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getMoreStatements({ more: moreUrl });
        return this.getLRSClientResponseData(response);
    }

    async getAgent(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getAgent(params);
        return this.getLRSClientResponseData(response);
    }

    async createAgentProfile(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.createAgentProfile(params);
        return this.getLRSClientResponseData(response);
    }

    async setAgentProfile(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.setAgentProfile(params);
        return this.getLRSClientResponseData(response);
    }

    async getAgentProfiles(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getAgentProfiles(params);
        return this.getLRSClientResponseData(response);
    }

    async getAgentProfile(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getAgentProfile(params);
        return this.getLRSClientResponseData(response);
    }

    async deleteAgentProfile(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.deleteAgentProfile(params);
        return this.getLRSClientResponseData(response);
    }

    async getActivity(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getActivity(params);
        return this.getLRSClientResponseData(response);
    }

    async createActivityProfile(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.createActivityProfile(params);
        return this.getLRSClientResponseData(response);
    }

    async setActivityProfile(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.setActivityProfile(params);
        return this.getLRSClientResponseData(response);
    }

    async getActivityProfiles(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getActivityProfiles(params);
        return this.getLRSClientResponseData(response);
    }

    async getActivityProfile(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getActivityProfile(params);
        return this.getLRSClientResponseData(response);
    }

    async deleteActivityProfile(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.deleteActivityProfile(params);
        return this.getLRSClientResponseData(response);
    }

    async createState(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.createState(params);
        return this.getLRSClientResponseData(response);
    }

    async setState(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.setState(params);
        return this.getLRSClientResponseData(response);
    }

    async getStates(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getStates(params);
        return this.getLRSClientResponseData(response);
    }

    async getState(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getState(params);
        return this.getLRSClientResponseData(response);
    }

    async deleteState(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.deleteState(params);
        return this.getLRSClientResponseData(response);
    }

    async deleteStates(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.deleteStates(params);
        return this.getLRSClientResponseData(response);
    }

    async getAbout(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getAbout(params);
        return this.getLRSClientResponseData(response);
    }

    async getExtension(activityId, extensionId, params = {}) {
        const activity = await this.getActivity({ activityId, ...params });
        const extensions = activity && activity.definition ? activity.definition.extensions : undefined;
        return extensions ? extensions[extensionId] : undefined;
    }
}


/**
 * Serious Game Tracker extending JSTracker with game-specific functionality
 */
export class SeriousGameTracker extends JSTracker {
    /**
     * Accessible type constants
     */
    SERIOUSGAMEPROFILE = SERIOUSGAMESPROFILE;
    STATEMENT_BUILDER_IDS = STATEMENT;
    ALL = ALL;
    ACCESSIBLETYPE=ACCESSIBLETYPE;
    ALTERNATIVETYPE=ALTERNATIVETYPE;
    COMPLETABLETYPE=COMPLETABLETYPE;
    GAMEOBJECTTYPE=GAMEOBJECTTYPE;

    /**
     * SCORM tracker instance
     * @type {ScormTracker}
     */
    scormTracker;

    /**
     * list of instances
     */
    instances= {
        "completable": {},
        "gameObject": {},
        "alternative": {},
        "accessible": {}
    };

    /**
     * Creates a new SeriousGameTracker instance
     */
    constructor() {
        super();
        this.parent_activity_id=this.trackerSettings.parent_activity_id || '';
        // statements of a serious game are categorized as such, unless the game sets its own category
        if(!this.trackerSettings.category) {
            this.trackerSettings.category = SERIOUSGAMESPROFILE.CATEGORYID;
        }
    }

    async login() {
        await super.login();
    }

    logout() {
        super.logout();
        this.scormTracker=null;
        this.instances={
            "completable": {},
            "gameObject": {},
            "alternative": {},
            "accessible": {}
        };
    }

    start() {
        super.start();
        if(this.trackerSettings.activityId) {
            this.scormTracker = new ScormTracker(this.tracker, this.trackerSettings.activityId, this.trackerSettings.parent_activity_type);
        }
    }

    stop() {
        super.stop();
    }

    /**
     * Marks the game as started
     * @returns {StatementBuilder} Promise that resolves when the start is recorded
     */
    initialized() {
        if(!this.scormTracker) {
            throw new Error("SCORM Tracker not initialized. Ensure start() has been called and trackerSettings include an activityId.");
        }
        return this.scormTracker.initialized();
    }

    /**
     * Marks the game as paused
     * @returns {StatementBuilder} Promise that resolves when the pause is recorded
     */
    pause() {
        if(!this.scormTracker) {
            throw new Error("SCORM Tracker not initialized. Ensure start() has been called and trackerSettings include an activityId.");
        }
        return this.scormTracker.suspended();
    }

    /**
     * Marks the game as resumed
     * @returns {StatementBuilder} Promise that resolves when the resume is recorded
     */
    resumed() {
        if(!this.scormTracker) {
            throw new Error("SCORM Tracker not initialized. Ensure start() has been called and trackerSettings include an activityId.");
        }
        return this.scormTracker.resumed();
    }

    /**
     * Marks the game as finished
     * @returns {StatementBuilder} Promise that resolves when the finish is recorded
     */
    terminated() {
        if(!this.scormTracker) {
            throw new Error("SCORM Tracker not initialized. Ensure start() has been called and trackerSettings include an activityId.");
        }
        return this.scormTracker.terminated();
    }

    /**
     * Creates a new statement builder
     * @param {string} verbId - The verb ID for the statement
     * @param {string} objectType - The type of the object
     * @param {string} objectId - The ID of the object
     * @return {StatementBuilder} A new StatementBuilder instance
     *  */
    trace(verbId, objectType, objectId) {
        return super.trace(verbId, objectType, objectId);
    }

    /**
     * Creates a new statement builder from an xAPI statement
     * @param {Object} statement - The xAPI statement to create the builder from
     * @returns {StatementBuilder} A new StatementBuilder instance
     */
    fromXAPI(statement) {
        return super.fromXAPI(statement);
    }
    
    /**
     * Creates a game object tracker instance
     * @param {string} id - Game object ID
     * @param {string} type - Game object type
     * @returns {GameObjectTracker} New GameObjectTracker instance
     */
    gameObject(id, type=SERIOUSGAMESPROFILE.ACTIVITYTYPES.ITEM) {
        var gameObject;
        if(!this.instances["gameObject"][type]) {
            this.instances["gameObject"][type]={};
        }
        if(!this.instances["gameObject"][type][id]) {
            gameObject =new GameObjectTracker(this.tracker, id, type);
            this.instances["gameObject"][type][id]=gameObject;
        } else {
            gameObject=this.instances["gameObject"][type][id];
        }
        return gameObject;
    }

    /**
     * Creates a completable tracker instance
     * @param {string} id - Activity ID
     * @param {string} type - Completable type
     * @returns {CompletableTracker} New CompletableTracker instance
     */
    completable(id, type=SERIOUSGAMESPROFILE.ACTIVITYTYPES.SERIOUS_GAME) {
        var completable;
        if(!this.instances["completable"][type]) {
            this.instances["completable"][type]={};
        }
        if(!this.instances["completable"][type][id]) {
            completable =new CompletableTracker(this.tracker, id, type);
            this.instances["completable"][type][id]=completable;
        } else {
            completable=this.instances["completable"][type][id];
        }
        return completable;
    }

    /**
     * Creates an alternative tracker instance
     * @param {string} id - Activity ID
     * @param {string} type - Alternative type
     * @returns {AlternativeTracker} New AlternativeTracker instance
     */
    alternative(id, type=ALL.ACTIVITYTYPES.ASSESSMENT) {
        var alternative;
        if(!this.instances["alternative"][type]) {
            this.instances["alternative"][type]={};
        }
        if(!this.instances["alternative"][type][id]) {
            alternative =new AlternativeTracker(this.tracker, id, type);
            this.instances["alternative"][type][id]=alternative;
        } else {
            alternative=this.instances["alternative"][type][id];
        }
        return alternative;
    }

    /**
     * Creates an accessible tracker instance
     * @param {string} id - Activity ID
     * @param {string} type - Accessible type
     * @returns {AccessibleTracker} New AccessibleTracker instance
     */
    accessible(id, type=SERIOUSGAMESPROFILE.ACTIVITYTYPES.AREA) {
        var accessible;
        if(!this.instances["accessible"][type]) {
            this.instances["accessible"][type]={};
        }
        if(!this.instances["accessible"][type][id]) {
            accessible =new AccessibleTracker(this.tracker, id, type);
            this.instances["accessible"][type][id]=accessible;
        } else {
            accessible=this.instances["accessible"][type][id];
        }
        return accessible;
    }
}