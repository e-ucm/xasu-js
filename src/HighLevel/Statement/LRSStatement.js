import VerbStatement from "./VerbStatement.js";
import ObjectStatement from "./ObjectStatement.js";
import ResultStatement from "./ResultStatement.js";
import ActorStatement from "./ActorStatement.js";
import ContextStatement from "./ContextStatement.js";
import InteractionObjectStatement from "./InteractionObjectStatement.js";
import Statement from "./Statement.js";
import { ALL } from "./Ids/Profiles/Generated/index.js";

/**
* Statement class
*/
export default class LRSStatement extends Statement {
    /**
     * Constructor of the Statement class
     * @param {ActorStatement} actor actor of the statement
     * @param {typeof ALL.VERBS[keyof typeof ALL.VERBS]} verbId verb id of the statement
     * @param {string} objectId object id of the statement
     * @param {typeof ALL.ACTIVITYTYPES[keyof typeof ALL.ACTIVITYTYPES]|string} objectType object Type of the statement
     * @param {ContextStatement} context context of the statement
     * @param {string} defaultURI default URI for the statement construction
     */
    constructor(actor, verbId, objectId, objectType, context, defaultURI) {
        super(actor, verbId, objectId, objectType, context, defaultURI);
        this.authority=new ActorStatement({});
        this.stored = new Date().toISOString();
    }

    /**
     * @param {string} stored
     */
    stored;

    /**
     * @param {ActorStatement} authority
     **/
    authority;
    
        
    /**
     * Convert to xAPI format
     * @returns {Object} xAPI statement object
     */
    toXAPI() {
        return {
            ...super.toXAPI(),
            authority: !this.authority.isEmpty() ? this.authority.toXAPI() : undefined,
            stored: this.stored
        };
    }

    /**
     * Create a Statement from an xAPI object
     * @param {Object} xapiObj
     * @param {string} baseURI default URI for the statement construction (optional)
     * @param {string} platform platform for the statement construction (optional)
     * @returns {LRSStatement} A new LRSStatement instance created from the xAPI object
     */
    static fromXAPI(xapiObj, baseURI, platform = null) {
        // Get the base statement from parent
        const baseStmt = super.fromXAPI(xapiObj, baseURI, platform);
        
        // Create an LRSStatement instance and copy all properties at once
        const stmt = Object.create(LRSStatement.prototype);
        Object.assign(stmt, baseStmt);
        
        // Initialize LRS-specific properties
        // Load authority from incoming xAPI object if present, otherwise create empty
        stmt.authority = xapiObj.authority ? ActorStatement.fromXAPI(xapiObj.authority) : new ActorStatement({});
        stmt.stored = xapiObj.stored ? xapiObj.stored : new Date().toISOString();
        
        return stmt;
    }

    /**
     * Convert to CSV format
     * 
     * @returns {String}
     */
    toCSV() {
        return `${super.toCSV()},${this.authority.toCSV()},${this.stored}`;
    }
}