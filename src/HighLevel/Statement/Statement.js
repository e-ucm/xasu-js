import VerbStatement from "./VerbStatement.js";
import ObjectStatement from "./ObjectStatement.js";
import ResultStatement from "./ResultStatement.js";
import ActorStatement from "./ActorStatement.js";
import ContextStatement from "./ContextStatement.js";
import { v4 as uuidv4 } from 'uuid';
import InteractionObjectStatement from "./InteractionObjectStatement.js";
import AttachmentStatement from "./AttachementStatement.js";
import { ALL } from "./Ids/Profiles/Generated/index.js";

/**
* Statement class
*/
export default class Statement {
    /**
     * Constructor of the Statement class
     * @param {ActorStatement} actor actor of the statement
     * @param {typeof ALL.VERBS[keyof typeof ALL.VERBS]|string} verbId verb id of the statement
     * @param {string} objectId object id of the statement
     * @param {typeof ALL.ACTIVITYTYPES[keyof typeof ALL.ACTIVITYTYPES]|string} objectType object Type of the statement
     * @param {ContextStatement} context context of the statement
     * @param {string} defaultURI default URI for the statement construction
     */
    constructor(actor, verbId, objectId, objectType, context, defaultURI) {
        this.id = uuidv4();
        this.actor = actor;
        this.verb = new VerbStatement(verbId, defaultURI);
        this.defaultURI = defaultURI;
        if(objectType === ALL.ACTIVITYTYPES.CMI_INTERACTION) {
            this.object = new InteractionObjectStatement(objectId, objectType, this.defaultURI);
        } else {
            this.object = new ObjectStatement(objectId, objectType, this.defaultURI);
        }
        this.context = context;
        this.version = "1.0.3";
        this.result = new ResultStatement(this.defaultURI);
        this.attachments = [];
    }

    /**
     * Create a Statement from a plain object (copy-constructor)
     * @param {Object} statementObj
     * @returns {Statement}
     */
    static fromObject(statementObj) {
        const stmt = Object.create(Statement.prototype);
        Object.assign(stmt, statementObj);
        return stmt;
    }
    /**
     * Id of the statement
     * @type {string}
     */
    id;
    /**
     * Version of the statement
     * @type {string}
     */
    version;
    /**
     * default URI of the statement
     * @type {string}
     */
    defaultURI;
    /**
     * Actor of the statement
     * @type {ActorStatement}
     */
    actor;
    /**
     * Verb of the statement
     * @type {VerbStatement}
     */
    verb;
    /**
     * Object of the statement
     * @type {ObjectStatement}
     */
    object;
    /**
     * Timestamp of the statement
     * @type {string}
     */
    timestamp;
    /**
     * Context of the statement
     * @type {ContextStatement}
     */
    context;
    /**
     * Result of the statement
     * @type {ResultStatement}
     */
    result;

    /**
     * Attachments associated with the statement
     * @type {AttachmentStatement[]}
     */
    attachments;

    
    /**
     * Convert to xAPI format
     * @returns {Object}
     */
    toXAPI() {
        var xapiTrace={};
        if(this.id) {
            xapiTrace.id = this.id;
        }
        if(this.actor) {
            xapiTrace.actor = this.actor.toXAPI();
        }
        if(this.verb) {
            xapiTrace.verb = this.verb.toXAPI();
        }
        if(this.object) {
            xapiTrace.object = this.object.toXAPI();
        }
        if(!this.result.isEmpty()) {
            xapiTrace.result = this.result.toXAPI();
        }
        if(this.context) {
            xapiTrace.context = this.context.toXAPI();
        }
        if(this.timestamp) {
            xapiTrace.timestamp = this.timestamp;
        }
        if(this.version) {
            xapiTrace.version = this.version;
        }
        if (Array.isArray(this.attachments) && this.attachments.length > 0) {
            xapiTrace.attachments = this.attachments.map((attachment) =>
                attachment && typeof attachment.toXAPI === 'function' ? attachment.toXAPI() : attachment
            );
        }
        return xapiTrace;
    }

    /**
     * Create a Statement from an xAPI object
     * @param {Object} xapiObj
     * @param {string} baseURI default URI for the statement construction (optional)
     * @returns {Statement}
     */
    static fromXAPI(xapiObj, baseURI, platform = null) {
        // Actor
        const actor = ActorStatement.fromXAPI(xapiObj.actor);
        // Verb
        const verb = VerbStatement.fromXAPI(xapiObj.verb, baseURI);
        // Object
        let object;
        if (xapiObj.object && xapiObj.object.definition && xapiObj.object.definition.interactionType) {
            object = InteractionObjectStatement.fromXAPI(xapiObj.object, baseURI);
        } else {
            object = ObjectStatement.fromXAPI(xapiObj.object, baseURI);
        }
        // Context
        const context = xapiObj.context ? ContextStatement.fromXAPI(xapiObj.context, baseURI, platform) : new ContextStatement(baseURI, platform);
        // Result
        const result = xapiObj.result ? ResultStatement.fromXAPI(xapiObj.result, baseURI) : new ResultStatement(baseURI);

        // Create Statement instance (bypass constructor)
        const stmt = Object.create(Statement.prototype);
        stmt.id = xapiObj.id || uuidv4();
        stmt.actor = actor;
        stmt.verb = verb;
        stmt.object = object;
        stmt.context = context;
        stmt.result = result;
        stmt.timestamp = xapiObj.timestamp;
        stmt.version = xapiObj.version || "1.0.3";
        stmt.defaultURI = baseURI;
        stmt.attachments = Array.isArray(xapiObj.attachments)
            ? xapiObj.attachments.map((attachment) => AttachmentStatement.fromXAPI(attachment, baseURI))
            : [];
        return stmt;
    }
    /**
     * Convert to CSV format
     * 
     * @returns {String}
     */
    toCSV() {
        var csv=[];
        csv.push(this.timestamp);
        csv.push(this.verb.toCSV());
        csv.push(this.object.toCSV());
        var result='';
        if(!this.result.isEmpty()) {
            result=this.result.toCSV();
        }
        return `${csv.join(",")}${result}`;
    }
}