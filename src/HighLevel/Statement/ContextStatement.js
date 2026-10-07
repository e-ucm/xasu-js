import { v4 as uuidv4 } from 'uuid';
import { isUri, setAsUri } from './helper.js';
import ObjectStatement from './ObjectStatement.js';
import { STATEMENT } from './Ids/Statements.js';
import { ALL } from './Ids/Profiles/Generated/index.js';

/**
 * The Context Class of a Statement
 */
export default class ContextStatement {
    /**
     * Constructor of the ContextStatement class
     * 
     * @param {string} base default URI for the context construction
     * @param {string} platform platform of context
     * @param {string} registrationId registration id of context
     */
    constructor(base, platform, registrationId=null) {
        this.defaultURI = base;
        this.platform = platform;
        this.contextActivities = {};
        if(registrationId != null) {
            this.registration=registrationId;
        } else {
            this.registration=uuidv4();
        }
    }

    /**
     * Add a category to the context
     * @param {typeof ALL.CATEGORYID[keyof typeof ALL.CATEGORYID]} categoryId
     */
    addCategory(categoryId) {
        if(categoryId) {
            if(!this.contextActivities.category) {
                 this.contextActivities.category = [];
            }
            this.contextActivities.category.push(
                {
                    id: setAsUri(categoryId, this.defaultURI),
                    definition: {
                        type : ALL.ACTIVITYTYPES.PROFILE
                    }
                }
            );
        }
    }

    /** 
     * default URI for the context construction
     * @type {string}
      */
    defaultURI;

    /** 
     * Registration Id of the Context
     * 
     * @type {string}
     */
    registration;

    
    /** 
     * Platform of the Context
     * 
     * @type {string}
     */
    platform;
    
    /** 
     * Language of the Context
     * 
     * @type {string}
     */
    language;

    /** 
     * Extensions of the Context
     * 
     * @type {Object}
     */
    extensions;

    /**
     * Context Activities (parent, grouping, category, other)
     * @type {Object}
     */
    contextActivities;

    /**
     * Add or set a context activity
     * @param {typeof STATEMENT.CONTEXT.ACTIVITIES[keyof typeof STATEMENT.CONTEXT.ACTIVITIES]} type
     * @param {ObjectStatement|ObjectStatement[]|string} activity activity object(s) or activity id
     * @param {string} [activityType] activity type when activity is an id
     */
    addContextActivity(type, activity, activityType) {
        if (typeof activity === 'string') {
              activity = new ObjectStatement(activity, activityType, this.defaultURI);
        }
        if ([STATEMENT.CONTEXT.ACTIVITIES.PARENT, STATEMENT.CONTEXT.ACTIVITIES.GROUPING, STATEMENT.CONTEXT.ACTIVITIES.CATEGORY, STATEMENT.CONTEXT.ACTIVITIES.OTHER].includes(type)) {
            // A relation key cannot be set on an array without being lost by any serialization,
            // so the context activities are reset when they are not a plain object
            if (!this.contextActivities || typeof this.contextActivities !== 'object' || Array.isArray(this.contextActivities)) {
                this.contextActivities = {};
            }
            // Accept single object or array
            if (!Array.isArray(this.contextActivities[type])) {
                this.contextActivities[type] = [];
            }
            if (Array.isArray(activity)) {
                this.contextActivities[type].push(...activity);
            } else {
                this.contextActivities[type].push(activity);
            }
        }
    }

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
    static normalizeContextActivities(input) {
        if (!input || typeof input !== 'object' || Array.isArray(input)) {
            return {};
        }
        const normalized = {};
        for (const [relation, activities] of Object.entries(input)) {
            const list = Array.isArray(activities) ? activities : [activities];
            const kept = list.filter((activity) => !!activity && typeof activity === 'object');
            if (kept.length > 0) {
                normalized[relation] = kept;
            }
        }
        return normalized;
    }
    
    /**
     * convert to XAPI
     * 
     * @returns {Object}
     */
    toXAPI() {
        // Deep copy and serialize contextActivities
        const serializedContextActivities = {};
        for (const [type, activities] of Object.entries(this.contextActivities)) {
            serializedContextActivities[type] = activities.map(act => {
                // If it has a toXAPI method, use it
                if (act && typeof act.toXAPI === 'function') {
                    const obj = act.toXAPI();
                    // Flatten definition fields to top-level for contextActivities (xAPI spec)
                    return {
                        id: obj.id,
                        ...(obj.definition && obj.definition.type ? { definition: { type: obj.definition.type } } : {})
                    };
                }
                // Otherwise, assume it's already a plain object
                return act;
            });
        }
        return {
            registration: this.registration,
            contextActivities: serializedContextActivities,
            ...(this.extensions ? { extensions: this.extensions } : {}),
            ...(this.platform ? { platform: this.platform } : {}),
            ...(this.language ? { language: this.language } : {})
        };
    }

    setLanguage(language) {
        this.language = language;
    }

    /**
     * Set the extensions of the Context
     * @param {Object} ext extensions object
     */
    setExtensions(ext) {
        this.extensions = ext;
    }

    /**
     * Set the platform of the Context
     * @param {string} platform platform string
     */
    setPlatform(platform) {
        this.platform = platform;
    }

    /**
     * Add or set a single extension key-value pair
     * @param {typeof ALL.CONTEXTEXTENSION[keyof typeof ALL.CONTEXTEXTENSION]|string} key extension key
     * @param {any} value extension value
     */
    setExtension(key, value) {
        if(!this.extensions) {
            this.extensions = {};
        }
        this.extensions[key] = value;
    }
    
    /**
     * Clone the ContextStatement instance
     * @returns {ContextStatement} shallow copy of the ContextStatement instance
     */
    clone() {
        const cloned = new ContextStatement(this.defaultURI, this.platform, this.registration);
        if(this.contextActivities) {
            cloned.contextActivities = ContextStatement.normalizeContextActivities(
                JSON.parse(JSON.stringify(this.contextActivities))
            );
        }
        if(this.language) {
            cloned.language = this.language;
        }
        if(this.platform) {
            cloned.platform = this.platform;
        }
        if(this.registration) {
            cloned.registration = this.registration;
        }
        if(this.extensions) {  
            cloned.extensions = JSON.parse(JSON.stringify(this.extensions));
        }
        return cloned;
    }

    /**
     * convert to CSV
     * 
     * @returns {String}
     */
    toCSV() {
        return this.registration.replaceAll(',', '\\,') ;
    }

    /**
     * Create a ContextStatement from xAPI context object
     * @param {Object} xapiObj
     * @param {string} baseURI - Optional base URI to resolve relative IDs
     * @returns {ContextStatement}
     */
    static fromXAPI(xapiObj, baseURI, platform = null, language = null) {
        if (!xapiObj) return null;
        const base = baseURI;
        if(xapiObj.platform) {
            platform = xapiObj.platform;
        }
        if(xapiObj.language) {
            language = xapiObj.language;
        }
        const registrationId = xapiObj.registration;
        const ctx = new ContextStatement(base,platform, registrationId);
        if (xapiObj.contextActivities) ctx.contextActivities = ContextStatement.normalizeContextActivities(xapiObj.contextActivities);
        if (xapiObj.extensions) ctx.extensions = xapiObj.extensions;
        if (language) ctx.language = language;
        return ctx;
    }
}