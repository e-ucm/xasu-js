import { STATEMENT } from "./Ids/Statements.js";

/**
 * Actor Class of a Statement (xAPI Agent or Group)
 */
export default class ActorStatement {
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
    constructor(options = {}) {
        for (const key of [STATEMENT.ACTOR.AGENTTYPE.MBOX, STATEMENT.ACTOR.AGENTTYPE.MBOX_SHA1SUM, STATEMENT.ACTOR.AGENTTYPE.OPENID, STATEMENT.ACTOR.AGENTTYPE.ACCOUNT]) {
            if (options[key]) {
                this.objectType = STATEMENT.ACTOR.TYPES.AGENT;
                this.setActor(key, options[key]);
                break; // Only one of these should be set for an Agent
            }
        }
        for (const key of [STATEMENT.ACTOR.GROUPTYPE.NAME, STATEMENT.ACTOR.GROUPTYPE.MEMBER]) {
            if (options[key]) {
                this.objectType = STATEMENT.ACTOR.TYPES.GROUP;
                this.setActor(key, options[key]);
            }
        }
    }

    /**
     * Set actor properties with validation
     * @param {typeof STATEMENT.ACTOR.AGENTTYPE[keyof typeof STATEMENT.ACTOR.AGENTTYPE]|typeof STATEMENT.ACTOR.GROUPTYPE[keyof typeof STATEMENT.ACTOR.GROUPTYPE]} type - one of name, mbox, mbox_sha1sum, openid, account, member
     * @param {Object|Array|String} actorData - data for the specified type
     */
    setActor(type, actorData) {
        // For Agent types, clear other identifier types to ensure only one is present
        if (type === STATEMENT.ACTOR.AGENTTYPE.MBOX || 
            type === STATEMENT.ACTOR.AGENTTYPE.MBOX_SHA1SUM || 
            type === STATEMENT.ACTOR.AGENTTYPE.OPENID || 
            type === STATEMENT.ACTOR.AGENTTYPE.ACCOUNT) {
            // Clear all identifier types
            this.mbox = undefined;
            this.mbox_sha1sum = undefined;
            this.openid = undefined;
            this.account = undefined;
        }
        // an actor built empty has no type yet, setting an identifier on it makes it an Agent
        if (this.objectType === undefined && type !== STATEMENT.ACTOR.GROUPTYPE.NAME
                && type !== STATEMENT.ACTOR.GROUPTYPE.MEMBER) {
            this.objectType = STATEMENT.ACTOR.TYPES.AGENT;
        }
        switch (type) {
            case STATEMENT.ACTOR.GROUPTYPE.NAME:
                if (this.objectType === STATEMENT.ACTOR.TYPES.AGENT) {
                    throw new Error("Agent cannot have a name, only mbox, mbox_sha1sum, openid, or account");
                }
                if (typeof actorData !== "string") {
                    throw new Error("Group name must be a string");
                }
                this.name = actorData;
                break;
            case STATEMENT.ACTOR.AGENTTYPE.MBOX:
                if (this.objectType === STATEMENT.ACTOR.TYPES.GROUP) {
                    throw new Error("Group cannot have mbox, mbox_sha1sum, openid, or account, only a name");
                }
                if (typeof actorData !== "string") {
                    throw new Error("Agent mbox must be a string");
                }

                this.mbox = actorData;
                break;
            case STATEMENT.ACTOR.AGENTTYPE.MBOX_SHA1SUM:
                if (this.objectType === STATEMENT.ACTOR.TYPES.GROUP) {
                    throw new Error("Group cannot have mbox_sha1sum");
                }
                if (typeof actorData !== "string") {
                    throw new Error("Agent mbox_sha1sum must be a string");
                }
                this.mbox_sha1sum = actorData;
                break;
            case STATEMENT.ACTOR.AGENTTYPE.OPENID:
                if (this.objectType === STATEMENT.ACTOR.TYPES.GROUP) {
                    throw new Error("Group cannot have openid");
                }
                if (typeof actorData !== "string") {
                    throw new Error("Agent openid must be a string");
                }
                this.openid = actorData;
                break;
            case STATEMENT.ACTOR.AGENTTYPE.ACCOUNT:
                if  (this.objectType === STATEMENT.ACTOR.TYPES.GROUP) {
                    throw new Error("Group cannot have account");
                }
                if (typeof actorData !== "object" || typeof actorData.homePage !== "string" || typeof actorData.name !== "string") {
                    throw new Error("Agent account must be an object with homePage and name strings");
                }
                this.account = actorData;
                break;
            case STATEMENT.ACTOR.GROUPTYPE.MEMBER:
                if (this.objectType !== STATEMENT.ACTOR.TYPES.GROUP) {
                    throw new Error("Only Group can have members");
                }
                if (!Array.isArray(actorData)) {
                    throw new Error("Group members must be an array");
                }
                this.member = actorData.map(m => m instanceof ActorStatement ? m : new ActorStatement(m));
                break;
            default:
                throw new Error(`Unsupported actor type: ${type}`);
        }
    }

    /**
     * Check if the ActorStatement is empty (no identifying properties)
     * @returns {boolean}
     */
    isEmpty() {
        if (this.objectType === STATEMENT.ACTOR.TYPES.GROUP) {
            return !this.name && (!this.member || this.member.length === 0);
        } else {
            return !this.mbox && !this.mbox_sha1sum && !this.openid && !this.account;
        }
    }

    /**
     * Create an ActorStatement from xAPI Agent or Group object
     * @param {Object} xapiObj
     * @returns {ActorStatement}
     */
    static fromXAPI(xapiObj) {
        if (!xapiObj) return null;
        const options = {
            name: xapiObj.name,
            mbox: xapiObj.mbox,
            mbox_sha1sum: xapiObj.mbox_sha1sum,
            openid: xapiObj.openid,
            account: xapiObj.account,
            member: Array.isArray(xapiObj.member) ? xapiObj.member.map(m => ActorStatement.fromXAPI(m)) : undefined
        };
        return new ActorStatement(options);
    }

    /**
     * Convert to xAPI Agent or Group object
     * @returns {Object}
     */
    toXAPI() {
        const obj = { objectType: this.objectType };
        if (this.name) obj.name = this.name;
        // Agent or Identified Group: one of mbox, mbox_sha1sum, openid, account
        if (this.mbox) obj.mbox = this.mbox;
        else if (this.mbox_sha1sum) obj.mbox_sha1sum = this.mbox_sha1sum;
        else if (this.openid) obj.openid = this.openid;
        else if (this.account) obj.account = this.account;
        // Group: add member if present
        if (this.objectType === STATEMENT.ACTOR.TYPES.GROUP && Array.isArray(this.member)) {
            obj.member = this.member.map(m => (typeof m.toXAPI === 'function' ? m.toXAPI() : m));
        }
        return obj;
    }

    /**
     * Convert to CSV (uses name or account name)
     * @returns {String}
     */
    toCSV() {
        if (this.name) return this.name.replaceAll(',', '\\,');
        if (this.account && this.account.name) return this.account.name.replaceAll(',', '\\,');
        if (this.mbox) return this.mbox.replaceAll(',', '\\,');
        return '';
    }
}