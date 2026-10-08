import xAPITrackerAsset from "../../xAPITrackerAsset.js";
import LRSStatement from "../Statement/LRSStatement.js";
import StatementBuilder from "./StatementBuilder.js";
import { STATEMENT } from "../Statement/Ids/Statements.js";
import { ALL } from "../Statement/Ids/Profiles/Generated/All.js";

export default class LRSStatementBuilder extends StatementBuilder {
    /**
     * Constructor of LRSStatementBuilder
     * @param {xAPITrackerAsset} xapiClient the Tracker
     * @param {object} initial the initial statement
     */
    constructor(xapiClient, initial) {
        super(xapiClient, initial);
        this.statement = initial;
    }

    /**
     * Statement
     * @type {LRSStatement}
     */
    statement;

    /**
     * Adds a context activity to the statement
     * @param {typeof STATEMENT.CONTEXT.ACTIVITIES[keyof typeof STATEMENT.CONTEXT.ACTIVITIES]} type - The context activity type from STATEMENT_BUILDER_IDS.CONTEXT.ACTIVITIES
     * @param {string} id - The IRI identifier of the context activity
     * @param {typeof ALL.ACTIVITYTYPES[keyof typeof ALL.ACTIVITYTYPES]|string} activityType - The activity type IRI
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withContextActivity(type, id, activityType) {
        this.statement.context.addContextActivity(type, id, activityType);
        return this;
    }

    /**
     * Add or set a platform to statement context
     * @param {string} platform platform to set
     * @return {StatementBuilder} Returns the current instance for chaining
     */
    withPlatform(platform) {
        this.statement.context.setPlatform(platform);
        return this;
    }

    /**
     * Sets the actor using an account identifier
     * @param {string} accountName - The account name
     * @param {string} accountHomePage - The home page IRI of the account service provider
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withActorAccount(accountName, accountHomePage) {
        this.statement.actor.setActor('account', { name: accountName, homePage: accountHomePage });
        return this;
    }

    /**
     * Sets the actor using an mbox (mailto URI)
     * @param {string} mbox - The mailto URI of the actor (e.g. 'mailto:user@example.com')
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withActorMbox(mbox) {
        this.statement.actor.setActor('mbox', mbox);
        return this;
    }

    /**
     * Sets the actor using an mbox SHA1 hash
     * @param {string} mboxSha1 - The SHA1 hash of the actor's mbox URI
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withActorMboxSha1(mboxSha1) {
        this.statement.actor.setActor('mbox_sha1sum', mboxSha1);
        return this;
    }

    /**
     * Sets the actor using an OpenID URI
     * @param {string} openid - The OpenID URI of the actor
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withActorOpenID(openid) {
        this.statement.actor.setActor('openid', openid);
        return this;
    }

    /**
     * Sets the authority using an account identifier
     * @param {string} accountName - The account name
     * @param {string} accountHomePage - The home page IRI of the account service provider
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withAutorityAccount(accountName, accountHomePage) {
        this.statement.authority.setActor('account', { name: accountName, homePage: accountHomePage });
        return this;
    }

    /**
     * Sets the authority using an mbox (mailto URI)
     * @param {string} mbox - The mailto URI of the authority (e.g. 'mailto:lrs@example.com')
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withAutorityMbox(mbox) {
        this.statement.authority.setActor('mbox', mbox);
        return this;
    }

    /**
     * Sets the authority using an mbox SHA1 hash
     * @param {string} mboxSha1 - The SHA1 hash of the authority's mbox URI
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withAutorityMboxSha1(mboxSha1) {
        this.statement.authority.setActor('mbox_sha1sum', mboxSha1);
        return this;
    }

    /**
     * Sets the authority using an OpenID URI
     * @param {string} openid - The OpenID URI of the authority
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withAutorityOpenID(openid) {
        this.statement.authority.setActor('openid', openid);
        return this;
    }

    /**
     * Add or set the stored timestamp of the statement
     * @param {Date|null} stored - The stored timestamp to set as an Date object or null (set to now)
     * @return {LRSStatementBuilder} This builder instance for chaining
     * */
    withStored(stored = new Date()) {
        this.statement.stored = stored instanceof Date ? stored.toISOString() : undefined;
        return this;
    }

    /**
     * Add or set an actor to the statement
     * @param {string} type - The type of the actor
     * @param {object} actor - The actor object
     * @return {StatementBuilder} Returns the current instance for chaining
    */
    withActor(type, actor) {
        this.statement.actor.setActor(type, actor);
        return this;
    }

    /**
     * Sets the ID of the statement
     * @param {string} id - The UUID to set as the statement ID
     * @returns {StatementBuilder} This builder instance for chaining
     */
    withId(id) {
        this.statement.id = id;
        return this;
    }

     /**
     * Sets the version of the statement
     * @param {string} version - The version to set
     * @returns {StatementBuilder} This builder instance for chaining
     */
    withVersion(version) {
        this.statement.version = version;
        return this;
    }

    /**
     * Sets the timestamp of the statement
     * @param {Date|null} timestamp - The timestamp to set as an Date object or null (set to now)
     * @returns {StatementBuilder} This builder instance for chaining
     */
    withTimestamp(timestamp = new Date()) {
        this.statement.timestamp = timestamp ? timestamp.toISOString() : undefined;
        return this;
    }

    /**
     * Sends the built statement to the LRS
     * @returns {Promise<void>} Promise that resolves when the statement has been sent
     */
    async send() {
        return await super.send();
    }


}