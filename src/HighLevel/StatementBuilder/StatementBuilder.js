// ------------------------------------------------------------------
// 1) THE BUILDER

import xAPITrackerAsset from "../../xAPITrackerAsset.js";
import InteractionObjectStatement from "../Statement/InteractionObjectStatement.js";
import Statement from "../Statement/Statement.js";
import { STATEMENT } from "../Statement/Ids/Statements.js";
import { ALL } from "../Statement/Ids/Profiles/Generated/All.js";
import AttachmentStatement from "../Statement/AttachementStatement.js";

// ------------------------------------------------------------------
/**
 * Statement Builder Class
 */
export default class StatementBuilder {
  /**
   * XAPI Client 
   * @type {xAPITrackerAsset}
   */
    client;

    /**
     * Statement
     * @type {Statement}
     */
    statement;

    /**
     * Promise of Statement sent
     * @type {Promise<void>}
     */
    _sendPromise;

  /**
   * @param  {xAPITrackerAsset} xapiClient  any client that has a `.sendStatement(statement)` → Promise
   * @param  {Statement} initial     a partial Statement (actor, verb, object…)
   */
  constructor(xapiClient, initial) {
    this.client    = xapiClient;
    this.statement = initial;
    this._sendPromise = null;
  }

  // RESULT
  /**
   * Set success to statemement
   * @param {boolean} success 
   * @returns {StatementBuilder} Returns the current instance for chaining
   */
  withSuccess(success) {
    this.statement.result.setSuccess(success);
    return this;
  }

/**
 * Sets score-related properties to statemement
 * @param {Partial<{raw: number; min: number; max: number; scaled: number}>} score - Score configuration
 * @returns {StatementBuilder} Returns the current instance for chaining
 */
  withScore(score) {
    this.statement.result.setScore(
      score.raw ?? score?.raw, 
      score.min ?? score?.min,
      score.max ?? score?.max,
      score.scaled ?? score?.scaled
    );
    return this;
}
  /**
   * Set raw score to statemement
   * @param {number} raw the raw score value
   * @returns {StatementBuilder} Returns the current instance for chaining
   */
  withScoreRaw(raw) {
    this.statement.result.setScoreRaw(raw);
    return this;
  }
  /**
   * Set min score to statemement
   * @param {number} min the min score value
   * @returns {StatementBuilder} Returns the current instance for chaining
   */
  withScoreMin(min) {
    this.statement.result.setScoreMin(min);
    return this;
  }
  /**
   * Set max score to statemement
   * @param {number} max the max score value
   * @returns {StatementBuilder} Returns the current instance for chaining
   */
  withScoreMax(max) {
    this.statement.result.setScoreMax(max);
    return this;
  }
  /**
   * Set scaled score to statemement
   * @param {number} scaled the scaled score value
   * @returns {StatementBuilder} Returns the current instance for chaining
   */
  withScoreScaled(scaled) {
    this.statement.result.setScoreScaled(scaled);
    return this;
  }

  /**
   * Set completion status to statement
   * @param {boolean} value completion status of statement
   * @returns {StatementBuilder} Returns the current instance for chaining
   */
  withCompletion(value) {
    this.statement.result.setCompletion(value);
    return this;
  }

  /**
   * Set duration to statement
   * @param {Date} init init date of statement
   * @param {Date} end end date of statement
   * @returns {StatementBuilder} Returns the current instance for chaining
   */
  withDuration(init, end) {
    this.statement.result.setDuration(init, end);
    return this;
  }

  /**
   * Set response to statement
   * @param {string} value response of statement
   * @returns {StatementBuilder} Returns the current instance for chaining
   */
  withResponse(value) {
    this.statement.result.setResponse(value);
    return this;
  }

  /**
   * Set progress to statement
   * @param {number} value progress of statement
   * @returns {StatementBuilder} Returns the current instance for chaining
   */
  withProgress(value) {
    this.statement.result.setProgress(value);
    return this;
  }

  /**
   * Add result extension to statement
   * @param {typeof ALL.RESULTEXTENSION[keyof typeof ALL.RESULTEXTENSION]|string} key key of the result extension
   * @param {*} value value of the result extension
   * @returns {StatementBuilder} Returns the current instance for chaining
   */
  withResultExtension(key, value) {
    this.statement.result.setExtension(key, value);
    return this;
  }

  /**
     * Add result extensions as Object key/values list of the statement
     * @param {Object} extensions extensions list
     */
  withResultExtensions(extensions = {}) {
    this.statement.result.setExtensions(extensions);
    return this;
  }
  /**
   * Set context language to statement
   * @param {string} language language of statement
   * @returns {StatementBuilder} Returns the current instance for chaining
   */
  withContextLanguage(language) {
    this.statement.context.setLanguage(language);
    return this;
  }
  
  /**
   * Set context platform to statement
   * @param {string} platform platform of statement
   * @returns {StatementBuilder} Returns the current instance for chaining
   */
  withContextPlatform(platform) {
    this.statement.context.setPlatform(platform);
    return this;
  }

  /**
   * Add context extension to statement
   * @param {typeof ALL.CONTEXTEXTENSION[keyof typeof ALL.CONTEXTEXTENSION]|string} key key of the context extension
   * @param {*} value value of the context extension
   * @returns {StatementBuilder} Returns the current instance for chaining
   */
  withContextExtension(key, value) {
    this.statement.context.setExtension(key, value);
    return this;
  }
  
  /**
     * Add context activity to statement
     * @param {typeof STATEMENT.CONTEXT.ACTIVITIES[keyof typeof STATEMENT.CONTEXT.ACTIVITIES]} type
     * @param {string} activityId
     * @param {typeof ALL.ACTIVITYTYPES[keyof typeof ALL.ACTIVITYTYPES]|string} activityType
     * @return {StatementBuilder} Returns the current instance for chaining
     */
  withContextActivity(type, activityId, activityType) {
    this.statement.context.addContextActivity(type, activityId, activityType);
    return this;
  }

  /**
     * Add context category to statement
     * @param {typeof ALL.CATEGORYID[keyof typeof ALL.CATEGORYID]} categoryId
     * @return {StatementBuilder} Returns the current instance for chaining
     */
  withContextCategory(categoryId) {
    this.statement.context.addCategory(categoryId);
    return this;
  }

  /**
   * Add or set a verb display
   * @param {string} lang
   * @param {string} display
   * @return {StatementBuilder} Returns the current instance for chaining
   */
  withVerbDisplay(lang, display) {
    this.statement.verb.addDisplay(lang, display);
    return this;
  }

  /**
   * Add or set a name of the Object definition
   * @param {string} lang
   * @param {Set<string>} list list of the Object definition names
   * @return {StatementBuilder} Returns the current instance for chaining
   */
  withObjectDefinitionsName(lang, list) {
    for(const name of list) {
      this.statement.object.setObjectDefinitionName(lang, name);
    }
    return this;
  }

  /**
   * Add or set a description of the Object definition
   * @param {string} lang
   * @param {Set<string>} list list of the Object definition descriptions
   * @return {StatementBuilder} Returns the current instance for chaining
   */
  withObjectDefinitionsDescription(lang, list) {
    for(const description of list) {
      this.statement.object.setObjectDefinitionDescription(lang, description);
    }
    return this;
  }
  /**
   * Add or set a name of the Object definition
   * @param {string} lang
   * @param {string} name name of the Object definition
   * @return {StatementBuilder} Returns the current instance for chaining
   */
  withObjectDefinitionName(lang, name) {
    this.statement.object.setObjectDefinitionName(lang, name);
    return this;
  }
  /**
   * Add or set a description of the Object definition
   * @param {string} lang
   * @param {string} description description of the Object definition
   * @return {StatementBuilder} Returns the current instance for chaining
   * */ 
  withObjectDefinitionDescription(lang, description) {
    this.statement.object.setObjectDefinitionDescription(lang, description);
    return this;
  }

  /**
   * Add object/activity extension to statement object definition
   * @param {typeof ALL.ACTIVITYEXTENSION[keyof typeof ALL.ACTIVITYEXTENSION]|string} key key of the object extension
   * @param {*} value value of the object extension
   * @return {StatementBuilder} Returns the current instance for chaining
   */
  withObjectExtension(key, value) {
    this.statement.object.setExtension(key, value);
    return this;
  }

  /**
   * Add object/activity extensions as Object key/values list
   * @param {Object} extensions extensions list
   * @return {StatementBuilder} Returns the current instance for chaining
   */
  withObjectExtensions(extensions = {}) {
    this.statement.object.setExtensions(extensions);
    return this;
  }

  /**
   * Add or set an interaction component with language support (for interaction activities)
   * @param {string} type - One of 'choices', 'scale', 'source', 'target', 'steps'
   * @param {string} id - The identifier for the component
   * @param {string} lang - The language code (e.g., 'en')
   * @param {string} description - The description in the given language
   * @return {StatementBuilder} Returns the current instance for chaining
   */
  withInteractionWithLang(type, id, lang, description) {
    if(this.statement.object instanceof InteractionObjectStatement) {
      this.statement.object.addInteractionWithLang(type, id, lang, description);
    } else {
      if (this.client.settings.debug) {
        throw new Error("Trying to set interaction choice on a non-interaction object");
      } else {
        console.warn("Trying to set interaction choice on a non-interaction object");
        return this;
      }
    }
    return this;
  }

  /**
   * Add or set an interaction type for interaction activities
   * @param {string} type interaction type to set
   * @return {StatementBuilder} Returns the current instance for chaining
   */
  withInteractionType(type) {
    if(this.statement.object instanceof InteractionObjectStatement) {
      this.statement.object.setInteractionType(type);
    } else {
      if (this.client.settings.debug) {
        throw new Error("Trying to set interaction scale on a non-interaction object");
      } else {
        console.warn("Trying to set interaction choice on a non-interaction object");
        return this;
      }
    }
    return this;
  }
  
  /**
   * Add or set a correct responses pattern for interaction activities
   * @param {string|string[]} pattern correct responses pattern(s) to add
   * @return {StatementBuilder} Returns the current instance for chaining
   */
  withCorrectResponsesPattern(pattern) {
    if(this.statement.object instanceof InteractionObjectStatement) {
      this.statement.object.addCorrectResponsesPattern(pattern);
    } else {
      if (this.client.settings.debug) {
        throw new Error("Trying to set correct responses pattern on a non-interaction object");
      } else {
        console.warn("Trying to set correct responses pattern on a non-interaction object");
        return this;
      }
    }
    return this;
  }

  /**
   * Add one xAPI attachment to the statement
   * @param {AttachmentStatement|Object} attachment - Attachment instance or plain attachment object
   * @returns {StatementBuilder} Returns the current instance for chaining
   */
  withAttachment(attachment) {
    if (!Array.isArray(this.statement.attachments)) {
      this.statement.attachments = [];
    }
    if (attachment instanceof AttachmentStatement) {
      this.statement.attachments.push(attachment);
    } else {
      this.statement.attachments.push(AttachmentStatement.fromXAPI(attachment, this.statement.defaultURI));
    }
    return this;
  }

  /**
   * Add multiple xAPI attachments to the statement
   * @param {Array<AttachmentStatement|Object>} attachments - List of attachments
   * @returns {StatementBuilder} Returns the current instance for chaining
   */
  withAttachments(attachments = []) {
    for (const attachment of attachments) {
      this.withAttachment(attachment);
    }
    return this;
  }

  /**
   * Convert the built statement to xAPI format
   * @returns {Object} The xAPI statement object
   */
  toXAPI() {
    return this.statement.toXAPI();
  }

  /**
   * Sends a statement to the queue and returns a promise that resolves when the statement is processed.
   *
   * @returns {Promise} The promise sent
   */
  async send() {
    if (!this._sendPromise) {
      // the promise itself is kept, awaiting it before storing it would store the resolved
      // value instead, which is undefined for enqueue and would let a second send through
      // @ts-ignore
      this._sendPromise = this.client.enqueue(this.statement);
    }
    return await this._sendPromise;
  }
}