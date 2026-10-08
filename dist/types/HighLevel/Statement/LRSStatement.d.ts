/**
* Statement class
*/
export default class LRSStatement extends Statement {
    /**
     * Create a Statement from an xAPI object
     * @param {Object} xapiObj
     * @param {string} baseURI default URI for the statement construction (optional)
     * @param {string} platform platform for the statement construction (optional)
     * @returns {LRSStatement} A new LRSStatement instance created from the xAPI object
     */
    static fromXAPI(xapiObj: any, baseURI: string, platform?: string): LRSStatement;
    /**
     * @param {ActorStatement} authority
     **/
    authority: ActorStatement;
    /**
     * @param {string} stored
     */
    stored: string;
}
import Statement from "./Statement.js";
import ActorStatement from "./ActorStatement.js";
