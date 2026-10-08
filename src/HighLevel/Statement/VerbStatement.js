import { isUri, setAsUri } from "./helper.js";
import { ALL } from "./Ids/Profiles/Generated/index.js";

/**
 * The Verb Class  of a Statement
 */
export default class VerbStatement {
    /**
     * Constructor of VerbStatement class
     * 
     * @param {typeof ALL.VERBS[keyof typeof ALL.VERBS]|string} id The verb id of the statement
     * @param {string} baseURI The base URI for the statement
     */
    constructor(id, baseURI) {
        if(isUri(id)) {
            this.id = id;
            this.display.set('en', id.split('/').pop()); // Default display is the last part of the URI
        } else {
            this.id = setAsUri(id, baseURI);
            this.display.set('en', id);
        }
    }
    
    /**
     * The Verb Id 
     * @type {string}
     */
    id;

    /**
     * The Verb display 
     * @type {Map<string, string>}
     */
    display = new Map();

    /**
     * Add or set a verb display
     * @param {string} lang
     * @param {string} display
     */
    addDisplay(lang, display) {
        this.display.set(lang, display);
    }

    /**
     * convert to XAPI
     * 
     * @returns {Object}
     */
    toXAPI() {
        var verb = {};
        if(this.id) {
            verb.id = this.id;
        }
        
        if(this.display && this.display.size > 0) {
            verb.display = Object.fromEntries(this.display);
        }
        return verb;
    }

    /**
     * convert to CSV
     * 
     * @returns {String}
     */
    toCSV() {
        return this.id;
    }

    /**
     * Create a VerbStatement from xAPI verb object
     * @param {Object} xapiObj
     * @param {string} baseURI - Optional base URI to resolve relative IDs
     * @returns {VerbStatement}
     */
    static fromXAPI(xapiObj, baseURI) {
        if (!xapiObj) return null;
        const id = xapiObj.id;
        const display = xapiObj.display;
        const verb = new VerbStatement(id, baseURI);
        if (display) {
            for (const [lang, text] of Object.entries(display)) {
                verb.addDisplay(lang, text);
            }
        }
        return verb;
    }
}