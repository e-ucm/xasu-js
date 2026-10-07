/**
 * The Context Class of a Statement
 */
export default class ContextStatement {
    /**
     * Normalize the context activities of a statement.
     *
     * The xAPI specification defines contextActivities as an object whose keys are the relations
     * (parent, grouping, category, other) and whose values are arrays of activities. An array is
     * therefore malformed: adding a relation to it attaches a string key to the array, which every
     * serialization drops, so the activities silently disappear. A single object is accepted by
     * xAPI 2.0 where 1.0.3 requires an array, so it is wrapped instead of rejected. Values that are
     * not activities are discarded, as they cannot be serialized as part of a relation.
     *
     * @param {Object} input the context activities to normalize
     * @returns {Object} an object whose keys are relations and whose values are arrays of activities
     */
    static normalizeContextActivities(input: any): any;
    /**
     * Create a ContextStatement from xAPI context object
     * @param {Object} xapiObj
     * @param {string} baseURI - Optional base URI to resolve relative IDs
     * @returns {ContextStatement}
     */
    static fromXAPI(xapiObj: any, baseURI: string, platform?: any, language?: any): ContextStatement;
    /**
     * Constructor of the ContextStatement class
     *
     * @param {string} base default URI for the context construction
     * @param {string} platform platform of context
     * @param {string} registrationId registration id of context
     */
    constructor(base: string, platform: string, registrationId?: string);
    /**
     * default URI for the context construction
     * @type {string}
      */
    defaultURI: string;
    /**
     * Platform of the Context
     *
     * @type {string}
     */
    platform: string;
    /**
     * Context Activities (parent, grouping, category, other)
     * @type {Object}
     */
    contextActivities: any;
    /**
     * Registration Id of the Context
     *
     * @type {string}
     */
    registration: string;
    /**
     * Add a category to the context
     * @param {typeof ALL.CATEGORYID[keyof typeof ALL.CATEGORYID]} categoryId
     */
    addCategory(categoryId: (typeof ALL.CATEGORYID)[keyof typeof ALL.CATEGORYID]): void;
    /**
     * Language of the Context
     *
     * @type {string}
     */
    language: string;
    /**
     * Extensions of the Context
     *
     * @type {Object}
     */
    extensions: any;
    /**
     * Add or set a context activity
     * @param {typeof STATEMENT.CONTEXT.ACTIVITIES[keyof typeof STATEMENT.CONTEXT.ACTIVITIES]} type
     * @param {ObjectStatement|ObjectStatement[]|string} activity activity object(s) or activity id
     * @param {string} [activityType] activity type when activity is an id
     */
    addContextActivity(type: (typeof STATEMENT.CONTEXT.ACTIVITIES)[keyof typeof STATEMENT.CONTEXT.ACTIVITIES], activity: ObjectStatement | ObjectStatement[] | string, activityType?: string): void;
    /**
     * convert to XAPI
     *
     * @returns {Object}
     */
    toXAPI(): any;
    setLanguage(language: any): void;
    /**
     * Set the extensions of the Context
     * @param {Object} ext extensions object
     */
    setExtensions(ext: any): void;
    /**
     * Set the platform of the Context
     * @param {string} platform platform string
     */
    setPlatform(platform: string): void;
    /**
     * Add or set a single extension key-value pair
     * @param {typeof ALL.CONTEXTEXTENSION[keyof typeof ALL.CONTEXTEXTENSION]|string} key extension key
     * @param {any} value extension value
     */
    setExtension(key: (typeof ALL.CONTEXTEXTENSION)[keyof typeof ALL.CONTEXTEXTENSION] | string, value: any): void;
    /**
     * Clone the ContextStatement instance
     * @returns {ContextStatement} shallow copy of the ContextStatement instance
     */
    clone(): ContextStatement;
    /**
     * convert to CSV
     *
     * @returns {String}
     */
    toCSV(): string;
}
import { ALL } from './Ids/Profiles/Generated/index.js';
import { STATEMENT } from './Ids/Statements.js';
import ObjectStatement from './ObjectStatement.js';
