import ObjectStatement from "./ObjectStatement.js";
import { STATEMENT } from "./Ids/Statements.js";

/**
 * The Object Class of a Statement
 */
export default class InteractionObjectStatement extends ObjectStatement {
    /**
        * The correctResponsesPattern property for interaction activities.
        * Internally it is always handled as an array of strings.
        * @type {string[]}
     */
    correctResponsesPattern;

    /**
     * The interactionType property for interaction activities (e.g., 'choice', 'fill-in', 'long-fill-in', 'matching', 'performance', 'sequencing', 'likert', 'numeric', 'other')
     * @type {string}
     */ 
    interactionType;

    /**
     * The choices, scale, source, target, and steps properties for interaction activities, which are arrays of objects with id and description
     * Each item in choices/scale should be an object with an 'id' and a 'description' that can be a string or an object with language keys
     * @type {Array<{id: string, description: string|object}>}
     */
    choices;

    /**
     * The scale property for interaction activities, which is an array of objects with id and description
     * @type {Array<{id: string, description: string|object}>}
     */

    scale;

    /**
     * The source property for interaction activities, which is an array of objects with id and description
     * @type {Array<{id: string, description: string|object}>}
     */
    source;

    /**
     * The target property for interaction activities, which is an array of objects with id and description
     * @type {Array<{id: string, description: string|object}>}
     */
    target;

    /**
     * The steps property for interaction activities, which is an array of objects with id and description
     * @type {Array<{id: string, description: string|object}>}
     */
    steps;


    /**
     * Constructor for InteractionObjectStatement
     * @param {string} objectId - The identifier of the object (IRI or UUID)
     * @param {string} objectType - The type of the object (IRI)
     * @param {string} defaultURI - The default base URI to resolve relative IDs
     */
    constructor(objectId, objectType, defaultURI) {
        super(objectId, objectType, defaultURI);
    }

    /**
     * Set the interactionType for interaction activities
     * @param {typeof STATEMENT.INTERACTIONOBJECT.INTERACTIONTYPES[keyof typeof STATEMENT.INTERACTIONOBJECT.INTERACTIONTYPES]} interactionType
     */
    setInteractionType(interactionType, debug = false) {
        if(!this.interactionType) {
            this.interactionType = interactionType; // Set interactionType based on the first component type added if not already set
        } else if (this.interactionType !== interactionType) {
            // Handle case where component type differs from existing interactionType
            if (debug) {
                throw new Error(`Component type ${interactionType} does not match existing interactionType ${this.interactionType}`);
            } else {
                console.warn(`Adding component of type ${interactionType} to interaction with interactionType ${this.interactionType}`);
                return;
            }
        }
    }

    /**
     * Set the correctResponsesPattern array
     * @param {string|string[]} pattern
     */
    addCorrectResponsesPattern(pattern) {
        if (!this.correctResponsesPattern) {
            this.correctResponsesPattern = [];
        }
        const values = Array.isArray(pattern) ? pattern : [pattern];
        for (const value of values) {
            if (typeof value !== 'string') {
                continue;
            }
            const normalized = value.trim();
            if (!normalized) {
                continue;
            }
            if (!this.correctResponsesPattern.includes(normalized)) {
                this.correctResponsesPattern.push(normalized);
            }
        }
    }

    /**
     * Add a single choice with language support (for interaction activities)
     * @param {typeof STATEMENT.INTERACTIONOBJECT.INTERACTIONTYPES[keyof typeof STATEMENT.INTERACTIONOBJECT.INTERACTIONTYPES]} componentType - One of 'choices', 'scale', 'source', 'target', 'steps'
     * @param {string} id - The identifier for the choice
     * @param {string} lang - The language code (e.g., 'en')
     * @param {string} description - The description in the given language
     */
    addInteractionWithLang(componentType, id, lang, description) {
        // Find which property/properties this componentType maps to
        const componentsMap = STATEMENT.INTERACTIONOBJECT.INTERACTIONCOMPONENTS;
        let matched = false;
        for (const [interactionType, componentProps] of Object.entries(componentsMap)) {
            let typeKey = interactionType.toUpperCase();
            let interactionTypeValue = STATEMENT.INTERACTIONOBJECT.INTERACTIONTYPES[typeKey];
            if (componentType === interactionTypeValue) {
                matched = true;
                for (const prop of componentProps) {
                    if (!this[prop]) {
                        this[prop] = [];
                    }
                    let existing = this[prop].find(c => c.id === id);
                    if (existing) {
                        if (typeof existing.description !== 'object' || existing.description === null) {
                            existing.description = {};
                        }
                        existing.description[lang] = description;
                    } else {
                        let desc = {};
                        desc[lang] = description;
                        this[prop].push({ id, description: desc });
                    }
                }
            }
        }
        if (!matched) {
            console.warn(`Component type ${componentType} does not map to any INTERACTIONCOMPONENTS property.`);
        }
    }

    toXAPI() {
        var object = super.toXAPI();
        // Add interaction activity properties if present
        if (this.interactionType) {
            object.definition.interactionType = this.interactionType;
        }
        if (this.correctResponsesPattern) {
            object.definition.correctResponsesPattern = this.correctResponsesPattern;
        }
        // Use INTERACTIONCOMPONENTS mapping for dynamic property assignment
        const componentsMap = STATEMENT.INTERACTIONOBJECT.INTERACTIONCOMPONENTS;
        for (const componentProps of Object.values(componentsMap)) {
            for (const prop of componentProps) {
                if (this[prop]) {
                    // For choices/scale, ensure each item is {id, description: {lang: text}}
                    if ((prop === "choices" || prop === "scale") && Array.isArray(this[prop])) {
                        object.definition[prop] = this[prop].map(item => {
                            if (item.id && item.description && typeof item.description === 'object') {
                                return { id: item.id, description: item.description };
                            } else if (item.id && typeof item.description === 'string') {
                                // fallback: wrap string in default lang
                                return { id: item.id, description: { en: item.description } };
                            } else {
                                return item;
                            }
                        });
                    } else {
                        object.definition[prop] = this[prop];
                    }
                }
            }
        }
        return object;
    }

    toCSV() {
        let csv = super.toCSV();
        if (this.interactionType) {
            csv += `,${this.interactionType}`;
        }
        if (this.correctResponsesPattern) {
            csv += `,${this.correctResponsesPattern.join('|')}`;
        }
        [STATEMENT.INTERACTIONOBJECT.INTERACTIONTYPES.CHOICES, STATEMENT.INTERACTIONOBJECT.INTERACTIONTYPES.SCALE, STATEMENT.INTERACTIONOBJECT.INTERACTIONTYPES.MATCHING, STATEMENT.INTERACTIONOBJECT.INTERACTIONTYPES.STEPS].forEach((key) => {
            if (this[key]) {
                csv += `,${key}:${this[key].map(item => item.id).join('|')}`;
            }
        });
        return csv;
    }

    /**
     * Create an InteractionObjectStatement from xAPI object
     * @param {Object} xapiObj
     * @param {string} baseURI - Optional base URI to resolve relative IDs
     * @returns {InteractionObjectStatement}
     */
    static fromXAPI(xapiObj, baseURI) {
        if (!xapiObj) return null;
        const id = xapiObj.id;
        const type = xapiObj.definition && xapiObj.definition.type ? xapiObj.definition.type : undefined;
        const obj = new InteractionObjectStatement(id, type, baseURI);
        obj.processObjectDefinitionProperties(xapiObj);
        if (xapiObj.definition) {
            if (xapiObj.definition.interactionType) obj.interactionType = xapiObj.definition.interactionType;
            if (xapiObj.definition.correctResponsesPattern) {
                // addCorrectResponsesPattern takes a string or an array of them, so wrapping the
                // value in an array would nest the array and every entry would be discarded
                obj.addCorrectResponsesPattern(xapiObj.definition.correctResponsesPattern);
            }
            // Use INTERACTIONCOMPONENTS mapping for dynamic property assignment
            const componentsMap = STATEMENT.INTERACTIONOBJECT.INTERACTIONCOMPONENTS;
            const seen = new Set();
            for (const componentProps of Object.values(componentsMap)) {
                for (const prop of componentProps) {
                    if (!seen.has(prop) && xapiObj.definition[prop]) {
                        obj[prop] = xapiObj.definition[prop];
                        seen.add(prop);
                    }
                }
            }
        }
        return obj;
    }
}