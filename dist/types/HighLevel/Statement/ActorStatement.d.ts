/**
 * Actor Class of a Statement (xAPI Agent or Group)
 */
export default class ActorStatement {
    /**
     * Create an ActorStatement from xAPI Agent or Group object
     * @param {Object} xapiObj
     * @returns {ActorStatement}
     */
    static fromXAPI(xapiObj: any): ActorStatement;
    /**
     * Create an Agent or Group
     * @param {Object} options
     *  - objectType: "Agent" | "Group" (default: "Agent")
     *  - name: string (optional)
     *  - mbox: string (optional, mailto:...)
     *  - mbox_sha1sum: string (optional)
     *  - openid: string (optional)
     *  - account: { homePage: string, name: string } (optional)
     *  - member: ActorStatement[] (for Group)
     */
    constructor(options?: any);
    objectType: string;
    /**
     * Set actor properties with validation
     * @param {typeof STATEMENT.ACTOR.AGENTTYPE[keyof typeof STATEMENT.ACTOR.AGENTTYPE]|typeof STATEMENT.ACTOR.GROUPTYPE[keyof typeof STATEMENT.ACTOR.GROUPTYPE]} type - one of name, mbox, mbox_sha1sum, openid, account, member
     * @param {Object|Array|String} actorData - data for the specified type
     */
    setActor(type: (typeof STATEMENT.ACTOR.AGENTTYPE)[keyof typeof STATEMENT.ACTOR.AGENTTYPE] | (typeof STATEMENT.ACTOR.GROUPTYPE)[keyof typeof STATEMENT.ACTOR.GROUPTYPE], actorData: any | any[] | string): void;
    mbox: string;
    mbox_sha1sum: string;
    openid: string;
    account: any;
    name: string;
    member: ActorStatement[];
    /**
     * Check if the ActorStatement is empty (no identifying properties)
     * @returns {boolean}
     */
    isEmpty(): boolean;
    /**
     * Convert to xAPI Agent or Group object
     * @returns {Object}
     */
    toXAPI(): any;
    /**
     * Convert to CSV (uses name or account name)
     * @returns {String}
     */
    toCSV(): string;
}
import { STATEMENT } from "./Ids/Statements.js";
