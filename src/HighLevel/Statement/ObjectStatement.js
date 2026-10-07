import { isUri, setAsUri } from "./helper.js";
import { ALL } from "./Ids/Profiles/Generated/index.js";

/**
 * The Object Class of a Statement
 */
export default class ObjectStatement {
    /**
     * The constructor of the ObjectStatement class
     * 
     * @param {string} id the id of the object
     * @param {typeof ALL.ACTIVITYTYPES[keyof typeof ALL.ACTIVITYTYPES]|string} type the type of the object
     * @param {string} baseURI the base URI for the object construction
     * @param {string} language the language for the name and description (default: "en")
     * @param {string} name the name of the object
     * @param {string} description the description of the object
     */
    constructor(id, type, baseURI, language = "en", name = null, description = null) {
        if(isUri(id)) {
            this.id = id;
        } else {
            this.id = setAsUri(id, baseURI);
        }
        // definition.type is optional in the xAPI specification
        this.definitionType = type ? setAsUri(type, baseURI) : null;
        if(name) {
            this.definitionName.set(language, name);
        }
        if(description) {
            this.definitionDescription.set(language, description);
        }
        this.defaultURI = baseURI;
    }

    /**
     * The ID of the Object
     * 
     * @type {string}
     */
    id;
    /**
     * The type of the Object
     * 
     * @type {string}
     */
    definitionType;
    /**
     * The name of the Object
     * 
     * @type {Map<string, string>}
     */
    definitionName = new Map();
    /**
     * The description of the Object
     * 
     * @type {Map<string, string>}
     */
    definitionDescription = new Map();

    /**
     * The extensions of the Object definition
     *
     * @type {Object}
     */
    definitionExtensions;

    /**
     * default URI for the object construction
     * @type {string}
     * */
    defaultURI;

    /**
     * Set the name of the Object definition
     * @param {string} lang - The language code
     * @param {string} name - The name of the Object definition
     */
    setObjectDefinitionName(lang, name) {
        this.definitionName.set(lang, name);
    }

    /**
     * Set the description of the Object definition
     * @param {string} lang - The language code
     * @param {string} description - The description of the Object definition
     */
    setObjectDefinitionDescription(lang, description) {
        this.definitionDescription.set(lang, description);
    }

    /**
     * Set the extensions of the Object definition
     * @param {Object} ext extensions object
     */
    setExtensions(ext) {
        this.definitionExtensions = ext;
    }

    /**
     * Add or set a single extension key-value pair in the Object definition
     * @param {typeof ALL.ACTIVITYEXTENSION[keyof typeof ALL.ACTIVITYEXTENSION]|string} key extension key
     * @param {any} value extension value
     */
    setExtension(key, value) {
        if(!this.definitionExtensions) {
            this.definitionExtensions = {};
        }
        this.definitionExtensions[key] = value;
    }

    /**
     * Convert to xAPI object, including interaction activities if set
     * @returns {Object}
     */
    toXAPI() {
        var object = {};
        if (this.id) {
            object.id = this.id;
        }
        object.definition = {};
        if (this.definitionName && this.definitionName.size > 0) {
            object.definition.name = Object.fromEntries(this.definitionName);
        }
        if (this.definitionDescription && this.definitionDescription.size > 0) {
            object.definition.description = Object.fromEntries(this.definitionDescription);
        }
        if (this.definitionType) {
            object.definition.type = this.definitionType;
        }
        if (this.definitionExtensions) {
            object.definition.extensions = this.definitionExtensions;
        }
        return object;
    }

    /**
     * convert to CSV
     * 
     * @returns {String}
     */
    toCSV() {
        return this.definitionType + ',' + this.id.replaceAll(',', '\\,');
    }

    /**
     * Create an ObjectStatement from xAPI object
     * @param {Object} xapiObj
     * @param {string} baseURI - Optional base URI to resolve relative IDs
     * @returns {ObjectStatement}
     */
    static fromXAPI(xapiObj, baseURI) {
        if (!xapiObj) return null;
        const id = xapiObj.id;
        const type = xapiObj.definition && xapiObj.definition.type ? xapiObj.definition.type : undefined;
        const obj = new ObjectStatement(id, type, baseURI);
        obj.processObjectDefinitionProperties(xapiObj);
        return obj;
    }

    processObjectDefinitionProperties(xapiObj) {
        if(xapiObj.definition) {
            const xapiDefinition = xapiObj.definition;
            if (xapiDefinition.name) {
                // Handle name object with language keys
                if (typeof xapiDefinition.name === 'object' && xapiDefinition.name !== null) {
                    for (const [lang, name] of Object.entries(xapiDefinition.name)) {
                        this.setObjectDefinitionName(lang, name);
                    }
                }
            }
            if (xapiDefinition.description) {
                // Handle description object with language keys
                if (typeof xapiDefinition.description === 'object' && xapiDefinition.description !== null) {
                    for (const [lang, desc] of Object.entries(xapiDefinition.description)) {
                        this.setObjectDefinitionDescription(lang, desc);
                    }
                }
            }
            if (xapiDefinition.extensions) {
                this.setExtensions(xapiDefinition.extensions);
            }
        }
    }
}