'use strict';

var XAPI = require('@xapi/xapi');
var uuid = require('uuid');
var axios = require('axios');
var ms = require('ms');
var jwtDecode = require('jwt-decode');
var QRCode = require('qrcode');

function _interopNamespaceDefault(e) {
    var n = Object.create(null);
    if (e) {
        Object.keys(e).forEach(function (k) {
            if (k !== 'default') {
                var d = Object.getOwnPropertyDescriptor(e, k);
                Object.defineProperty(n, k, d.get ? d : {
                    enumerable: true,
                    get: function () { return e[k]; }
                });
            }
        });
    }
    n.default = e;
    return Object.freeze(n);
}

var ms__namespace = /*#__PURE__*/_interopNamespaceDefault(ms);

const STATEMENT = Object.freeze({
    ACTOR: {
        TYPES :{
            AGENT: 'Agent',
            GROUP: 'Group'
        },
        AGENTTYPE :{
            MBOX: "mbox",
            MBOX_SHA1SUM: "mbox_sha1sum",
            OPENID: "openid",
            ACCOUNT: "account"
        },    
        GROUPTYPE :{
            NAME: "name",
            MEMBER: "member"
        }
    },

    CONTEXT: {
        ACTIVITIES: {
            PARENT: "parent",
            GROUPING: "grouping",
            CATEGORY: "category",
            OTHER: "other"
        }
    },

    RESULT: {
        SCORE: {
            RAW: "raw",
            MIN: "min",
            MAX: "max",
            SCALED: "scaled"
        },
        SUCCESS: "success",
        COMPLETION: "completion",
        RESPONSE: "response",
        DURATION: "duration",
        PROGRESS: "progress"
    },
    INTERACTIONOBJECT: {
        INTERACTIONTYPES: {
            TRUE_FALSE: "true-false",
            CHOICE: "choice",
            FILL_IN: "fill-in",
            LONG_FILL_IN: "long-fill-in",
            MATCHING: "matching",
            PERFORMANCE: "performance",
            SEQUENCING: "sequencing",
            LIKERT: "likert",
            NUMERIC: "numeric",
            OTHER: "other"
        },
        INTERACTIONCOMPONENTS: {
            CHOICE: ["choices"],
            SEQUENCING: ["choices"],
            LIKERT: ["scale"],
            MATCHING: ["source", "target"],
            PERFORMANCE: ["steps"]
        }
    }
});

/**
 * Actor Class of a Statement (xAPI Agent or Group)
 */
class ActorStatement {
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

/**
 * Set as URI if it is not an URI already
 * @param {string} id the id of the part of the statement
 * @param {string} base the base URI to use if id is not an URI
 * @returns {String}
 */
function setAsUri(id, base) {
    if (isUri(id)) {
        return id;
    }
    // Remove trailing slash if present
    if (base.endsWith('/')) {
        base = base.slice(0, -1);
    }
    // Remove leading slash from id if present
    let cleanId = id.startsWith('/') ? id.slice(1) : id;
    if (base.includes('://')) {
        return `${base}/${cleanId}`;
    } else {
        return `${base}://${cleanId}`;
    }
}

/**
 * Check if the string is an URI
 * @param {string} id 
 * @returns {boolean}
 */
function isUri(id) {
    const pattern = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\/[^\s/$.?#].[^\s]*$/i;
    return pattern.test(id);
}

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const ACADEMICASSESSMENTPROFILE = Object.freeze({
    CATEGORYID: 'https://pttportal.af.mil/xapi/profile/academic-assessment/v/1',
    VERBS: {},
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const ACROSSXPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/acrossx/v/2',
    VERBS: {
        ANNOTATED: 'https://w3id.org/xapi/acrossx/verbs/annotated',
        DESIGNED: 'https://w3id.org/xapi/acrossx/verbs/designed',
        DISLIKED: 'https://w3id.org/xapi/acrossx/verbs/disliked',
        EDITED: 'https://w3id.org/xapi/acrossx/verbs/edited',
        EVALUATED: 'https://w3id.org/xapi/acrossx/verbs/evaluated',
        LIKED: 'https://w3id.org/xapi/acrossx/verbs/liked',
        POSTED: 'https://w3id.org/xapi/acrossx/verbs/posted',
        REPORTED: 'https://w3id.org/xapi/acrossx/verbs/reported',
        REVEALED: 'https://w3id.org/xapi/acrossx/verbs/revealed',
        SEARCHED: 'https://w3id.org/xapi/acrossx/verbs/searched',
        WAS_ASSIGNED: 'https://w3id.org/xapi/acrossx/verbs/was-assigned',
        WATCHED: 'https://w3id.org/xapi/acrossx/verbs/watched',
    },
    ACTIVITYTYPES: {
        COLLABORATION: 'https://w3id.org/xapi/acrossx/activities/collaboration',
        E_BOOK: 'https://w3id.org/xapi/acrossx/activities/e-book',
        FACE_TO_FACE_DISCUSSION: 'https://w3id.org/xapi/acrossx/activities/face-to-face-discussion',
        INSTANT_RESPONSE_SYSTEM: 'https://w3id.org/xapi/acrossx/activities/instant-response-system',
        LEARNING_PLAN: 'https://w3id.org/xapi/acrossx/activities/learning-plan',
        MESSAGE: 'https://w3id.org/xapi/acrossx/activities/message',
        NOTE: 'https://w3id.org/xapi/acrossx/activities/note',
        ONLINE_DISCUSSION: 'https://w3id.org/xapi/acrossx/activities/online-discussion',
        PAGE: 'https://w3id.org/xapi/acrossx/activities/page',
        PRINTED_ASSESSMENT: 'https://w3id.org/xapi/acrossx/activities/printed-assessment',
        PRINTED_BOOK: 'https://w3id.org/xapi/acrossx/activities/printed-book',
        PRINTED_WORKSHEET: 'https://w3id.org/xapi/acrossx/activities/printed-worksheet',
        SEARCH_ENGINE: 'https://w3id.org/xapi/acrossx/activities/search-engine',
        VIDEO: 'https://w3id.org/xapi/acrossx/activities/video',
        WEBPAGE: 'https://w3id.org/xapi/acrossx/activities/webpage',
    },
    ACTIVITYEXTENSION: {
        ALIGNMENT: 'https://w3id.org/xapi/acrossx/extensions/alignment',
        ANCHOR_TEXT: 'https://w3id.org/xapi/acrossx/extensions/anchor-text',
        BLOOMS_LEVEL: 'https://w3id.org/xapi/acrossx/extensions/blooms-level',
        BY_WHOM: 'https://w3id.org/xapi/acrossx/extensions/by-whom',
        CHAPTER: 'https://w3id.org/xapi/acrossx/extensions/chapter',
        COLUMN: 'https://w3id.org/xapi/acrossx/extensions/column',
        FEEDBACK: 'https://w3id.org/xapi/acrossx/extensions/feedback',
        HIGHLIGHTEDSTRING: 'https://w3id.org/xapi/acrossx/extensions/highlightedString',
        PASS_SCORE: 'https://w3id.org/xapi/acrossx/extensions/pass-score',
        ROW: 'https://w3id.org/xapi/acrossx/extensions/row',
        SECTION: 'https://w3id.org/xapi/acrossx/extensions/section',
        SUPPLEMENTAL_INFO: 'https://w3id.org/xapi/acrossx/extensions/supplemental-info',
        TIME_LIMIT: 'https://w3id.org/xapi/acrossx/extensions/time-limit',
        TOTAL_ITEMS: 'https://w3id.org/xapi/acrossx/extensions/total-items',
        TOTAL_PAGES: 'https://w3id.org/xapi/acrossx/extensions/total-pages',
        TOTAL_SCORE: 'https://w3id.org/xapi/acrossx/extensions/total-score',
        TYPE: 'https://w3id.org/xapi/acrossx/extensions/type',
    },
    CONTEXTEXTENSION: {
        MENTIONEDAGENT: 'https://w3id.org/xapi/acrossx/extensions/mentionedagent',
        SCHOOL: 'https://w3id.org/xapi/acrossx/extensions/school',
    },
    RESULTEXTENSION: {
        RUBRICS: 'https://w3id.org/xapi/acrossx/extensions/rubrics',
        STARTING_POINT: 'https://w3id.org/xapi/acrossx/extensions/starting-point',
        TIME: 'https://w3id.org/xapi/acrossx/extensions/time',
    }
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const ACTIONABLEDATABOOKADBPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/adb/v/2',
    VERBS: {
        ANNOTATED: 'https://w3id.org/xapi/adb/verbs/annotated',
        ARRIVED: 'https://w3id.org/xapi/adb/verbs/arrived',
        ATTENDED: 'https://w3id.org/xapi/adb/verbs/attended',
        BOOKMARKED: 'https://w3id.org/xapi/adb/verbs/bookmarked',
        COACHED: 'https://w3id.org/xapi/adb/verbs/coached',
        DEMANDED: 'https://w3id.org/xapi/adb/verbs/demanded',
        DESCRIBED: 'https://w3id.org/xapi/adb/verbs/described',
        HIGHLIGHTED: 'https://w3id.org/xapi/adb/verbs/highlighted',
        INITIATED: 'https://w3id.org/xapi/adb/verbs/initiated',
        NOTED: 'https://w3id.org/xapi/adb/verbs/noted',
        READ: 'https://w3id.org/xapi/adb/verbs/read',
        REFERENCED: 'https://w3id.org/xapi/adb/verbs/referenced',
        REQUESTED: 'https://w3id.org/xapi/adb/verbs/requested',
        SELECTED: 'https://w3id.org/xapi/adb/verbs/selected',
        WATCHED: 'https://w3id.org/xapi/adb/verbs/watched',
    },
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const ACTIVITYSTREAMSVOCABULARYPROFILE = Object.freeze({
    CATEGORYID: 'http://activitystrea.ms/schema',
    VERBS: {
        ACCEPTED: 'http://activitystrea.ms/accept',
        ACCESSED: 'http://activitystrea.ms/access',
        ACKNOWLEDGED: 'http://activitystrea.ms/acknowledge',
        ADDED: 'http://activitystrea.ms/add',
        AGREED: 'http://activitystrea.ms/agree',
        APPENDED: 'http://activitystrea.ms/append',
        APPROVED: 'http://activitystrea.ms/approve',
        ARCHIVED: 'http://activitystrea.ms/archive',
        ASSIGNED: 'http://activitystrea.ms/assign',
        ATTACHED: 'http://activitystrea.ms/attach',
        ATTENDED: 'http://activitystrea.ms/attend',
        AUTHORED: 'http://activitystrea.ms/author',
        AUTHORIZED: 'http://activitystrea.ms/authorize',
        BORROWED: 'http://activitystrea.ms/borrow',
        BUILT: 'http://activitystrea.ms/build',
        CANCELED: 'http://activitystrea.ms/cancel',
        CHECKEDIN: 'http://activitystrea.ms/checkin',
        CLOSED: 'http://activitystrea.ms/close',
        COMPLETED: 'http://activitystrea.ms/complete',
        CONFIRMED: 'http://activitystrea.ms/confirm',
        CONSUMED: 'http://activitystrea.ms/consume',
        CREATED: 'http://activitystrea.ms/create',
        DELETED: 'http://activitystrea.ms/delete',
        DELIVERED: 'http://activitystrea.ms/deliver',
        DENIED: 'http://activitystrea.ms/deny',
        DISAGREED: 'http://activitystrea.ms/disagree',
        DISLIKED: 'http://activitystrea.ms/dislike',
        EXPERIENCED: 'http://activitystrea.ms/experience',
        FAVORITED: 'http://activitystrea.ms/favorite',
        FLAGGED_AS_INAPPROPRIATE: 'http://activitystrea.ms/flag-as-inappropriate',
        FOLLOWED: 'http://activitystrea.ms/follow',
        FOUND: 'http://activitystrea.ms/find',
        GAVE: 'http://activitystrea.ms/give',
        HOSTED: 'http://activitystrea.ms/host',
        IGNORED: 'http://activitystrea.ms/ignore',
        INSERTED: 'http://activitystrea.ms/insert',
        INSTALLED: 'http://activitystrea.ms/install',
        INTERACTED: 'http://activitystrea.ms/interact',
        INVITED: 'http://activitystrea.ms/invite',
        JOINED: 'http://activitystrea.ms/join',
        LEFT: 'http://activitystrea.ms/leave',
        LIKED: 'http://activitystrea.ms/like',
        LISTENED: 'http://activitystrea.ms/listen',
        LOST: 'http://activitystrea.ms/lose',
        MADEFRIEND: 'http://activitystrea.ms/make-friend',
        OPENED: 'http://activitystrea.ms/open',
        PLAYED: 'http://activitystrea.ms/play',
        PRESENTED: 'http://activitystrea.ms/present',
        PURCHASED: 'http://activitystrea.ms/purchase',
        QUALIFIED: 'http://activitystrea.ms/qualify',
        READ: 'http://activitystrea.ms/read',
        RECEIVED: 'http://activitystrea.ms/receive',
        REJECTED: 'http://activitystrea.ms/reject',
        REMOVED: 'http://activitystrea.ms/remove',
        REMOVED_FRIEND: 'http://activitystrea.ms/remove-friend',
        REPLACED: 'http://activitystrea.ms/replace',
        REQUESTED: 'http://activitystrea.ms/request',
        REQUESTED_FRIEND: 'http://activitystrea.ms/request-friend',
        RESOLVED: 'http://activitystrea.ms/resolve',
        RETRACTED: 'http://activitystrea.ms/retract',
        RETURNED: 'http://activitystrea.ms/return',
        RSVP_MAYBE: 'http://activitystrea.ms/rsvp-maybe',
        RSVP_NO: 'http://activitystrea.ms/rsvp-no',
        RSVP_YES: 'http://activitystrea.ms/rsvp-yes',
        SATISFIED: 'http://activitystrea.ms/satisfy',
        SAVED: 'http://activitystrea.ms/save',
        SCHEDULED: 'http://activitystrea.ms/schedule',
        SEARCHED: 'http://activitystrea.ms/search',
        SENT: 'http://activitystrea.ms/send',
        SHARED: 'http://activitystrea.ms/share',
        SOLD: 'http://activitystrea.ms/sell',
        SPONSORED: 'http://activitystrea.ms/sponsor',
        STARTED: 'http://activitystrea.ms/start',
        STOPPED_FOLLOWING: 'http://activitystrea.ms/stop-following',
        SUBMITTED: 'http://activitystrea.ms/submit',
        TAGGED: 'http://activitystrea.ms/tag',
        TERMINATED: 'http://activitystrea.ms/terminate',
        TIED: 'http://activitystrea.ms/tie',
        UNFAVORITED: 'http://activitystrea.ms/unfavorite',
        UNLIKED: 'http://activitystrea.ms/unlike',
        UNSATISFIED: 'http://activitystrea.ms/unsatisfy',
        UNSAVED: 'http://activitystrea.ms/unsave',
        UNSHARED: 'http://activitystrea.ms/unshare',
        UPDATED: 'http://activitystrea.ms/update',
        USED: 'http://activitystrea.ms/use',
        WAS_AT: 'http://activitystrea.ms/at',
        WATCHED: 'http://activitystrea.ms/watch',
        WON: 'http://activitystrea.ms/win',
    },
    ACTIVITYTYPES: {
        ALERT: 'http://activitystrea.ms/alert',
        APPLICATION: 'http://activitystrea.ms/application',
        ARTICLE: 'http://activitystrea.ms/article',
        AUDIO: 'http://activitystrea.ms/audio',
        BADGE: 'http://activitystrea.ms/badge',
        BINARY: 'http://activitystrea.ms/binary',
        BOOKMARK: 'http://activitystrea.ms/bookmark',
        COLLECTION: 'http://activitystrea.ms/collection',
        COMMENT: 'http://activitystrea.ms/comment',
        DEVICE: 'http://activitystrea.ms/device',
        EVENT: 'http://activitystrea.ms/event',
        FILE: 'http://activitystrea.ms/file',
        GAME: 'http://activitystrea.ms/game',
        GROUP: 'http://activitystrea.ms/group',
        IMAGE: 'http://activitystrea.ms/image',
        ISSUE: 'http://activitystrea.ms/issue',
        JOB: 'http://activitystrea.ms/job',
        NOTE: 'http://activitystrea.ms/note',
        OFFER: 'http://activitystrea.ms/offer',
        ORGANIZATION: 'http://activitystrea.ms/organization',
        PAGE: 'http://activitystrea.ms/page',
        PERSON: 'http://activitystrea.ms/person',
        PLACE: 'http://activitystrea.ms/place',
        PROCESS: 'http://activitystrea.ms/process',
        PRODUCT: 'http://activitystrea.ms/product',
        QUESTION: 'http://activitystrea.ms/question',
        REVIEW: 'http://activitystrea.ms/review',
        SERVICE: 'http://activitystrea.ms/service',
        TASK: 'http://activitystrea.ms/task',
        VIDEO: 'http://activitystrea.ms/video',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const ADLVOCABULARYPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/adl/v/2',
    VERBS: {
        ANSWERED: 'http://adlnet.gov/expapi/verbs/answered',
        ASKED: 'http://adlnet.gov/expapi/verbs/asked',
        ATTEMPTED: 'http://adlnet.gov/expapi/verbs/attempted',
        ATTENDED: 'http://adlnet.gov/expapi/verbs/attended',
        COMMENTED: 'http://adlnet.gov/expapi/verbs/commented',
        EXITED: 'http://adlnet.gov/expapi/verbs/exited',
        EXPERIENCED: 'http://adlnet.gov/expapi/verbs/experienced',
        IMPORTED: 'http://adlnet.gov/expapi/verbs/imported',
        INTERACTED: 'http://adlnet.gov/expapi/verbs/interacted',
        LAUNCHED: 'http://adlnet.gov/expapi/verbs/launched',
        LOGGED_IN: 'https://w3id.org/xapi/adl/verbs/logged-in',
        LOGGED_OUT: 'https://w3id.org/xapi/adl/verbs/logged-out',
        MASTERED: 'http://adlnet.gov/expapi/verbs/mastered',
        PREFERRED: 'http://adlnet.gov/expapi/verbs/preferred',
        PROGRESSED: 'http://adlnet.gov/expapi/verbs/progressed',
        REGISTERED: 'http://adlnet.gov/expapi/verbs/registered',
        SHARED: 'http://adlnet.gov/expapi/verbs/shared',
        VOIDED: 'http://adlnet.gov/expapi/verbs/voided',
    },
    ACTIVITYTYPES: {
        FILE: 'http://adlnet.gov/expapi/activities/file',
        LINK: 'http://adlnet.gov/expapi/activities/link',
        MEDIA: 'http://adlnet.gov/expapi/activities/media',
        MEETING: 'http://adlnet.gov/expapi/activities/meeting',
        PERFORMANCE: 'http://adlnet.gov/expapi/activities/performance',
        QUESTION: 'http://adlnet.gov/expapi/activities/question',
        SIMULATION: 'http://adlnet.gov/expapi/activities/simulation',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const AUDIOPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/audio/v1.0',
    VERBS: {},
    ACTIVITYTYPES: {
        AUDIO: 'https://w3id.org/xapi/audio/activity-type/audio',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const BOLLPROFILE = Object.freeze({
    CATEGORYID: 'https://ed3chain.com/xapi/boll/v/1',
    VERBS: {
        APPLIED: 'https://ed3chain.com/xapi/boll/verbs#applied',
        DECLINED: 'https://ed3chain.com/xapi/boll/verbs#declined',
        FAILED: 'https://ed3chain.com/xapi/boll/verbs#failed',
        PASSED: 'https://ed3chain.com/xapi/boll/verbs#passed',
        SCHOOLED: 'https://ed3chain.com/xapi/boll/verb#schooled',
        SCORED: 'https://ed3chain.com/xapi/boll#scored',
    },
    ACTIVITYTYPES: {
        CREDENTIAL: 'https://ed3chain.com/xapi/boll/activity#credential',
        LMS_COURSE: 'http://id.tincanapi.com/activitytype/lms/course',
        PRINTED_ASSESSMENT: 'https://ed3chain.com/xapi/boll/activity#printed-assessment',
        PROGRAM: 'https://ed3chain.com/xapi/boll/activities#program',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {
        LEARNER: 'https://ed3chain.com/xapi/boll/extensions#learner',
        LOCATION: 'https://ed3chain.com/xapi/boll/extensions#location',
        SCHOOL: 'https://ed3chain.com/xapi/boll/extensions#school',
    },
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const CMI5PROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/cmi5/context/categories/cmi5/v/7',
    VERBS: {
        ABANDONED: 'https://w3id.org/xapi/adl/verbs/abandoned',
        SATISFIED: 'https://w3id.org/xapi/adl/verbs/satisfied',
        WAIVED: 'https://w3id.org/xapi/adl/verbs/waived',
    },
    ACTIVITYTYPES: {
        BLOCK: 'https://w3id.org/xapi/cmi5/activitytype/block',
        COURSE: 'https://w3id.org/xapi/cmi5/activitytype/course',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {
        LAUNCH_MODE: 'https://w3id.org/xapi/cmi5/context/extensions/launchmode',
        LAUNCH_PARAMETERS: 'https://w3id.org/xapi/cmi5/context/extensions/launchparameters',
        LAUNCH_URL: 'https://w3id.org/xapi/cmi5/context/extensions/launchurl',
        MASTERY_SCORE: 'https://w3id.org/xapi/cmi5/context/extensions/masteryscore',
        MOVE_ON: 'https://w3id.org/xapi/cmi5/context/extensions/moveon',
        SESSION_ID: 'https://w3id.org/xapi/cmi5/context/extensions/sessionid',
    },
    RESULTEXTENSION: {
        PROGRESS: 'https://w3id.org/xapi/cmi5/result/extensions/progress',
        REASON: 'https://w3id.org/xapi/cmi5/result/extensions/reason',
    }
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const CONTENTREPOSITORYPROFILE = Object.freeze({
    CATEGORYID: 'https://xapi.org.au/contentprofile/v/2',
    VERBS: {
        ADDED: 'https://xapi.org.au/contentprofile/verb/added',
        COMMENCED: 'https://xapi.org.au/contentprofile/verb/commenced',
        WITHDREW: 'https://xapi.org.au/contentprofile/verb/withdrew',
    },
    ACTIVITYTYPES: {
        JOURNAL_ARTICLE: 'http://xapi.org.au/contentprofile/activitytype/journal_article',
        SURVEY: 'https://xapi.org.au/contentprofile/activitytype/survey',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {
        ACADEMIC_TERM: 'http://xapi.org.au/contentprofile/extension/academic_term',
        ACADEMIC_YEAR: 'http://xapi.org.au/contentprofile/extension/academic_year',
        CITATION_INFO: 'http://xapi.org.au/contentprofile/extension/citation_info',
        COUNT: 'https://xapi.org.au/contentprofile/extension/count',
        COURSE_CODE: 'http://xapi.org.au/contentprofile/extension/course_code',
        DOI: 'http://xapi.org.au/contentprofile/extension/doi',
        ISSN: 'http://xapi.org.au/contentprofile/extension/issn',
    },
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const COREPROFILE = Object.freeze({
    CATEGORYID: 'https://pttportal.af.mil/xapi/profile/core/v/1',
    VERBS: {},
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const DATASECURITYMODULEPROFILE = Object.freeze({
    CATEGORYID: 'https://profiles.adlnet.gov/xapi/71d1605b-b078-4494-b7b8-7f3a2b442f36/v/2',
    VERBS: {
        CHAPTER_INTRODUCTION_FINISHED: 'https://profiles.adlnet.gov/xapi/71d1605b-b078-4494-b7b8-7f3a2b442f36/verb/chapter_introduction',
    },
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const DODISDPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/dod-isd/v1.0',
    VERBS: {
        ABLED: 'https://w3id.org/xapi/dod-isd/verbs/abled',
        ACCESSED: 'https://w3id.org/xapi/dod-isd/verbs/accessed',
        ACCLIMATIZED: 'https://w3id.org/xapi/dod-isd/verbs/acclimatized',
        ACCOMMODATED: 'https://w3id.org/xapi/dod-isd/verbs/accommodated',
        ACCOMPLISHED: 'https://w3id.org/xapi/dod-isd/verbs/accomplished',
        ACHIEVED: 'https://w3id.org/xapi/dod-isd/verbs/achieved',
        ACKNOWLEDGED: 'https://w3id.org/xapi/dod-isd/verbs/acknowledged',
        ACTIVATED: 'https://w3id.org/xapi/dod-isd/verbs/activated',
        ACTUATED: 'https://w3id.org/xapi/dod-isd/verbs/actuated',
        ADAPTED: 'https://w3id.org/xapi/dod-isd/verbs/adapted',
        ADJUSTED: 'https://w3id.org/xapi/dod-isd/verbs/adjusted',
        ADMINISTERED: 'https://w3id.org/xapi/dod-isd/verbs/administered',
        ADVANCED: 'https://w3id.org/xapi/dod-isd/verbs/advanced',
        ADVISED: 'https://w3id.org/xapi/dod-isd/verbs/advised',
        ALERTED: 'https://w3id.org/xapi/dod-isd/verbs/alerted',
        ALIGNED: 'https://w3id.org/xapi/dod-isd/verbs/aligned',
        ALLOCATED: 'https://w3id.org/xapi/dod-isd/verbs/allocated',
        ALLOWED: 'https://w3id.org/xapi/dod-isd/verbs/allowed',
        ALTERED: 'https://w3id.org/xapi/dod-isd/verbs/altered',
        AMBUSHED: 'https://w3id.org/xapi/dod-isd/verbs/ambushed',
        ANALYZED: 'https://w3id.org/xapi/dod-isd/verbs/analyzed',
        ANNOTATED: 'https://w3id.org/xapi/dod-isd/verbs/annotated',
        ANNOUNCED: 'https://w3id.org/xapi/dod-isd/verbs/announced',
        ANSWERED: 'https://w3id.org/xapi/dod-isd/verbs/answered',
        APPLIED: 'https://w3id.org/xapi/dod-isd/verbs/applied',
        APPRAISED: 'https://w3id.org/xapi/dod-isd/verbs/appraised',
        APPRECIATED: 'https://w3id.org/xapi/dod-isd/verbs/appreciated',
        APPROVED: 'https://w3id.org/xapi/dod-isd/verbs/approved',
        ARCHIVED: 'https://w3id.org/xapi/dod-isd/verbs/archived',
        ARMED: 'https://w3id.org/xapi/dod-isd/verbs/armed',
        ARRANGED: 'https://w3id.org/xapi/dod-isd/verbs/arranged',
        ASKED: 'https://w3id.org/xapi/dod-isd/verbs/asked',
        ASSAULTED: 'https://w3id.org/xapi/dod-isd/verbs/assaulted',
        ASSEMBLED: 'https://w3id.org/xapi/dod-isd/verbs/assembled',
        ASSESSED: 'https://w3id.org/xapi/dod-isd/verbs/assessed',
        ASSIGNED: 'https://w3id.org/xapi/dod-isd/verbs/assigned',
        ASSISTED: 'https://w3id.org/xapi/dod-isd/verbs/assisted',
        ASSUMED: 'https://w3id.org/xapi/dod-isd/verbs/assumed',
        ATTACHED: 'https://w3id.org/xapi/dod-isd/verbs/attached',
        ATTACKED: 'https://w3id.org/xapi/dod-isd/verbs/attacked',
        ATTENDED_CLOSELY: 'https://w3id.org/xapi/dod-isd/verbs/attended-closely',
        AUTHENTICATED: 'https://w3id.org/xapi/dod-isd/verbs/authenticated',
        BALANCED: 'https://w3id.org/xapi/dod-isd/verbs/balanced',
        BELIEVED: 'https://w3id.org/xapi/dod-isd/verbs/believed',
        BREACHED: 'https://w3id.org/xapi/dod-isd/verbs/breached',
        BRIEFED: 'https://w3id.org/xapi/dod-isd/verbs/briefed',
        BYPASSED: 'https://w3id.org/xapi/dod-isd/verbs/bypassed',
        CALCULATED: 'https://w3id.org/xapi/dod-isd/verbs/calculated',
        CALIBRATED: 'https://w3id.org/xapi/dod-isd/verbs/calibrated',
        CAMOUFLAGED: 'https://w3id.org/xapi/dod-isd/verbs/camouflaged',
        CANCELED: 'https://w3id.org/xapi/dod-isd/verbs/canceled',
        CARRIED: 'https://w3id.org/xapi/dod-isd/verbs/carried',
        CATEGORIZED: 'https://w3id.org/xapi/dod-isd/verbs/categorized',
        CAUSED: 'https://w3id.org/xapi/dod-isd/verbs/caused',
        CENTERED: 'https://w3id.org/xapi/dod-isd/verbs/centered',
        CHALLENGED: 'https://w3id.org/xapi/dod-isd/verbs/challenged',
        CHANGED: 'https://w3id.org/xapi/dod-isd/verbs/changed',
        CHARGED: 'https://w3id.org/xapi/dod-isd/verbs/charged',
        CHECKED: 'https://w3id.org/xapi/dod-isd/verbs/checked',
        CHOSE: 'https://w3id.org/xapi/dod-isd/verbs/chose',
        CLASSIFIED: 'https://w3id.org/xapi/dod-isd/verbs/classified',
        CLEANED: 'https://w3id.org/xapi/dod-isd/verbs/cleaned',
        CLEARED: 'https://w3id.org/xapi/dod-isd/verbs/cleared',
        CLOSED: 'https://w3id.org/xapi/dod-isd/verbs/closed',
        COLLATED: 'https://w3id.org/xapi/dod-isd/verbs/collated',
        COLLECTED: 'https://w3id.org/xapi/dod-isd/verbs/collected',
        COMBINED: 'https://w3id.org/xapi/dod-isd/verbs/combined',
        COMMANDED: 'https://w3id.org/xapi/dod-isd/verbs/commanded',
        COMMUNICATED: 'https://w3id.org/xapi/dod-isd/verbs/communicated',
        COMPARED: 'https://w3id.org/xapi/dod-isd/verbs/compared',
        COMPILED: 'https://w3id.org/xapi/dod-isd/verbs/compiled',
        COMPLETED: 'https://w3id.org/xapi/dod-isd/verbs/completed',
        COMPLETED_ASSIGNMENT: 'https://w3id.org/xapi/dod-isd/verbs/completed-assignment',
        COMPLIED: 'https://w3id.org/xapi/dod-isd/verbs/complied',
        COMPOSED: 'https://w3id.org/xapi/dod-isd/verbs/composed',
        COMPUTED: 'https://w3id.org/xapi/dod-isd/verbs/computed',
        CONCEIVED: 'https://w3id.org/xapi/dod-isd/verbs/conceived',
        CONCLUDED: 'https://w3id.org/xapi/dod-isd/verbs/concluded',
        CONDENSED: 'https://w3id.org/xapi/dod-isd/verbs/condensed',
        CONDUCTED: 'https://w3id.org/xapi/dod-isd/verbs/conducted',
        CONFIRMED: 'https://w3id.org/xapi/dod-isd/verbs/confirmed',
        CONJECTURED: 'https://w3id.org/xapi/dod-isd/verbs/conjectured',
        CONNECTED: 'https://w3id.org/xapi/dod-isd/verbs/connected',
        CONSOLIDATED: 'https://w3id.org/xapi/dod-isd/verbs/consolidated',
        CONSTRUCTED: 'https://w3id.org/xapi/dod-isd/verbs/constructed',
        CONTRASTED: 'https://w3id.org/xapi/dod-isd/verbs/contrasted',
        CONTRIVED: 'https://w3id.org/xapi/dod-isd/verbs/contrived',
        CONTROLLED: 'https://w3id.org/xapi/dod-isd/verbs/controlled',
        CONVERTED: 'https://w3id.org/xapi/dod-isd/verbs/converted',
        COORDINATED: 'https://w3id.org/xapi/dod-isd/verbs/coordinated',
        CORRECTED: 'https://w3id.org/xapi/dod-isd/verbs/corrected',
        CORRELATED: 'https://w3id.org/xapi/dod-isd/verbs/correlated',
        COVERED: 'https://w3id.org/xapi/dod-isd/verbs/covered',
        CREATED: 'https://w3id.org/xapi/dod-isd/verbs/created',
        CREPT: 'https://w3id.org/xapi/dod-isd/verbs/crept',
        CRITICIZED: 'https://w3id.org/xapi/dod-isd/verbs/criticized',
        CROSS_CHECKED: 'https://w3id.org/xapi/dod-isd/verbs/cross-checked',
        CROSSED: 'https://w3id.org/xapi/dod-isd/verbs/crossed',
        DEBRIEFED: 'https://w3id.org/xapi/dod-isd/verbs/debriefed',
        DEBUGGED: 'https://w3id.org/xapi/dod-isd/verbs/debugged',
        DECIDED: 'https://w3id.org/xapi/dod-isd/verbs/decided',
        DECONTAMINATED: 'https://w3id.org/xapi/dod-isd/verbs/decontaminated',
        DEFENDED: 'https://w3id.org/xapi/dod-isd/verbs/defended',
        DEFINED: 'https://w3id.org/xapi/dod-isd/verbs/defined',
        DELAYED: 'https://w3id.org/xapi/dod-isd/verbs/delayed',
        DELETED: 'https://w3id.org/xapi/dod-isd/verbs/deleted',
        DELIVERED: 'https://w3id.org/xapi/dod-isd/verbs/delivered',
        DEMONSTRATED: 'https://w3id.org/xapi/dod-isd/verbs/demonstrated',
        DEPARTED: 'https://w3id.org/xapi/dod-isd/verbs/departed',
        DEPLOYED: 'https://w3id.org/xapi/dod-isd/verbs/deployed',
        DERIVED: 'https://w3id.org/xapi/dod-isd/verbs/derived',
        DESCRIBED: 'https://w3id.org/xapi/dod-isd/verbs/described',
        DESIGNATED: 'https://w3id.org/xapi/dod-isd/verbs/designated',
        DESIGNED: 'https://w3id.org/xapi/dod-isd/verbs/designed',
        DESTROYED: 'https://w3id.org/xapi/dod-isd/verbs/destroyed',
        DETECTED: 'https://w3id.org/xapi/dod-isd/verbs/detected',
        DETERMINED: 'https://w3id.org/xapi/dod-isd/verbs/determined',
        DEVELOPED: 'https://w3id.org/xapi/dod-isd/verbs/developed',
        DEVISED: 'https://w3id.org/xapi/dod-isd/verbs/devised',
        DIAGNOSED: 'https://w3id.org/xapi/dod-isd/verbs/diagnosed',
        DIAGRAMMED: 'https://w3id.org/xapi/dod-isd/verbs/diagrammed',
        DIFFERENTIATED: 'https://w3id.org/xapi/dod-isd/verbs/differentiated',
        DIRECTED: 'https://w3id.org/xapi/dod-isd/verbs/directed',
        DISASSEMBLED: 'https://w3id.org/xapi/dod-isd/verbs/disassembled',
        DISCONNECTED: 'https://w3id.org/xapi/dod-isd/verbs/disconnected',
        DISCOVERED: 'https://w3id.org/xapi/dod-isd/verbs/discovered',
        DISCRIMINATED: 'https://w3id.org/xapi/dod-isd/verbs/discriminated',
        DISENGAGED: 'https://w3id.org/xapi/dod-isd/verbs/disengaged',
        DISMANTLED: 'https://w3id.org/xapi/dod-isd/verbs/dismantled',
        DISPATCHED: 'https://w3id.org/xapi/dod-isd/verbs/dispatched',
        DISPLACED: 'https://w3id.org/xapi/dod-isd/verbs/displaced',
        DISPLAYED: 'https://w3id.org/xapi/dod-isd/verbs/displayed',
        DISPOSED: 'https://w3id.org/xapi/dod-isd/verbs/disposed',
        DISSEMINATED: 'https://w3id.org/xapi/dod-isd/verbs/disseminated',
        DISTINGUISHED: 'https://w3id.org/xapi/dod-isd/verbs/distinguished',
        DISTRIBUTED: 'https://w3id.org/xapi/dod-isd/verbs/distributed',
        DIVIDED: 'https://w3id.org/xapi/dod-isd/verbs/divided',
        DRAFTED: 'https://w3id.org/xapi/dod-isd/verbs/drafted',
        DREW: 'https://w3id.org/xapi/dod-isd/verbs/drew',
        DROVE: 'https://w3id.org/xapi/dod-isd/verbs/drove',
        DUG: 'https://w3id.org/xapi/dod-isd/verbs/dug',
        EDITED: 'https://w3id.org/xapi/dod-isd/verbs/edited',
        EFFECTED: 'https://w3id.org/xapi/dod-isd/verbs/effected',
        EGRESSED: 'https://w3id.org/xapi/dod-isd/verbs/egressed',
        ELABORATED: 'https://w3id.org/xapi/dod-isd/verbs/elaborated',
        ELEVATED: 'https://w3id.org/xapi/dod-isd/verbs/elevated',
        ELIMINATED: 'https://w3id.org/xapi/dod-isd/verbs/eliminated',
        EMPLACED: 'https://w3id.org/xapi/dod-isd/verbs/emplaced',
        EMPLOYED: 'https://w3id.org/xapi/dod-isd/verbs/employed',
        ENCODED: 'https://w3id.org/xapi/dod-isd/verbs/encoded',
        ENCRYPTED: 'https://w3id.org/xapi/dod-isd/verbs/encrypted',
        ENERGIZED: 'https://w3id.org/xapi/dod-isd/verbs/energized',
        ENFORCED: 'https://w3id.org/xapi/dod-isd/verbs/enforced',
        ENGAGED: 'https://w3id.org/xapi/dod-isd/verbs/engaged',
        ENSURED: 'https://w3id.org/xapi/dod-isd/verbs/ensured',
        ENTERED: 'https://w3id.org/xapi/dod-isd/verbs/entered',
        ESTABLISHED: 'https://w3id.org/xapi/dod-isd/verbs/established',
        ESTIMATED: 'https://w3id.org/xapi/dod-isd/verbs/estimated',
        EVACUATED: 'https://w3id.org/xapi/dod-isd/verbs/evacuated',
        EVADED: 'https://w3id.org/xapi/dod-isd/verbs/evaded',
        EVALUATED: 'https://w3id.org/xapi/dod-isd/verbs/evaluated',
        EXCHANGED: 'https://w3id.org/xapi/dod-isd/verbs/exchanged',
        EXECUTED: 'https://w3id.org/xapi/dod-isd/verbs/executed',
        EXPLAINED: 'https://w3id.org/xapi/dod-isd/verbs/explained',
        EXPRESSED: 'https://w3id.org/xapi/dod-isd/verbs/expressed',
        EXTENDED: 'https://w3id.org/xapi/dod-isd/verbs/extended',
        EXTRACTED: 'https://w3id.org/xapi/dod-isd/verbs/extracted',
        FELL: 'https://w3id.org/xapi/dod-isd/verbs/fell',
        FELT: 'https://w3id.org/xapi/dod-isd/verbs/felt',
        FILLED_OUT: 'https://w3id.org/xapi/dod-isd/verbs/filled-out',
        FINALIZED: 'https://w3id.org/xapi/dod-isd/verbs/finalized',
        FIRED: 'https://w3id.org/xapi/dod-isd/verbs/fired',
        FIT: 'https://w3id.org/xapi/dod-isd/verbs/fit',
        FOLLOWED: 'https://w3id.org/xapi/dod-isd/verbs/followed',
        FORMATTED: 'https://w3id.org/xapi/dod-isd/verbs/formatted',
        FORMULATED: 'https://w3id.org/xapi/dod-isd/verbs/formulated',
        FORWARDED: 'https://w3id.org/xapi/dod-isd/verbs/forwarded',
        FOUND: 'https://w3id.org/xapi/dod-isd/verbs/found',
        FUELED: 'https://w3id.org/xapi/dod-isd/verbs/fueled',
        GAVE: 'https://w3id.org/xapi/dod-isd/verbs/gave',
        GENERALIZED: 'https://w3id.org/xapi/dod-isd/verbs/generalized',
        GENERATED: 'https://w3id.org/xapi/dod-isd/verbs/generated',
        GROUNDED: 'https://w3id.org/xapi/dod-isd/verbs/grounded',
        GROUPED: 'https://w3id.org/xapi/dod-isd/verbs/grouped',
        GUARDED: 'https://w3id.org/xapi/dod-isd/verbs/guarded',
        GUIDED: 'https://w3id.org/xapi/dod-isd/verbs/guided',
        HARDENED: 'https://w3id.org/xapi/dod-isd/verbs/hardened',
        HEARD: 'https://w3id.org/xapi/dod-isd/verbs/heard',
        HELD: 'https://w3id.org/xapi/dod-isd/verbs/held',
        HOISTED: 'https://w3id.org/xapi/dod-isd/verbs/hoisted',
        HOVERED: 'https://w3id.org/xapi/dod-isd/verbs/hovered',
        HYPOTHESIZED: 'https://w3id.org/xapi/dod-isd/verbs/hypothesized',
        IDENTIFIED: 'https://w3id.org/xapi/dod-isd/verbs/identified',
        ILLUSTRATED: 'https://w3id.org/xapi/dod-isd/verbs/illustrated',
        IMAGINED: 'https://w3id.org/xapi/dod-isd/verbs/imagined',
        IMPLEMENTED: 'https://w3id.org/xapi/dod-isd/verbs/implemented',
        INDICATED: 'https://w3id.org/xapi/dod-isd/verbs/indicated',
        INFERRED: 'https://w3id.org/xapi/dod-isd/verbs/inferred',
        INFILTRATED: 'https://w3id.org/xapi/dod-isd/verbs/infiltrated',
        INFLUENCED: 'https://w3id.org/xapi/dod-isd/verbs/influenced',
        INFORMED: 'https://w3id.org/xapi/dod-isd/verbs/informed',
        INITIALIZED: 'https://w3id.org/xapi/dod-isd/verbs/initialized',
        INITIATED: 'https://w3id.org/xapi/dod-isd/verbs/initiated',
        INNOVATED: 'https://w3id.org/xapi/dod-isd/verbs/innovated',
        INPUT: 'https://w3id.org/xapi/dod-isd/verbs/input',
        INSERTED: 'https://w3id.org/xapi/dod-isd/verbs/inserted',
        INSPECTED: 'https://w3id.org/xapi/dod-isd/verbs/inspected',
        INSTALLED: 'https://w3id.org/xapi/dod-isd/verbs/installed',
        INSTRUCTED: 'https://w3id.org/xapi/dod-isd/verbs/instructed',
        INTEGRATED: 'https://w3id.org/xapi/dod-isd/verbs/integrated',
        INTERCEPTED: 'https://w3id.org/xapi/dod-isd/verbs/intercepted',
        INTERPRETED: 'https://w3id.org/xapi/dod-isd/verbs/interpreted',
        INVENTED: 'https://w3id.org/xapi/dod-isd/verbs/invented',
        INVESTIGATED: 'https://w3id.org/xapi/dod-isd/verbs/investigated',
        ISOLATED: 'https://w3id.org/xapi/dod-isd/verbs/isolated',
        ISSUED: 'https://w3id.org/xapi/dod-isd/verbs/issued',
        JACKED: 'https://w3id.org/xapi/dod-isd/verbs/jacked',
        JUDGED: 'https://w3id.org/xapi/dod-isd/verbs/judged',
        JUSTIFIED: 'https://w3id.org/xapi/dod-isd/verbs/justified',
        LABELED: 'https://w3id.org/xapi/dod-isd/verbs/labeled',
        LAID: 'https://w3id.org/xapi/dod-isd/verbs/laid',
        LANDED: 'https://w3id.org/xapi/dod-isd/verbs/landed',
        LAUNCHED: 'https://w3id.org/xapi/dod-isd/verbs/launched',
        LED: 'https://w3id.org/xapi/dod-isd/verbs/led',
        LEVELED: 'https://w3id.org/xapi/dod-isd/verbs/leveled',
        LIFTED: 'https://w3id.org/xapi/dod-isd/verbs/jumped',
        LISTED: 'https://w3id.org/xapi/dod-isd/verbs/listed',
        LISTENED: 'https://w3id.org/xapi/dod-isd/verbs/listened',
        LISTENED_ATTENTIVELY: 'https://w3id.org/xapi/dod-isd/verbs/listened-attentively',
        LOADED: 'https://w3id.org/xapi/dod-isd/verbs/loaded',
        LOCATED: 'https://w3id.org/xapi/dod-isd/verbs/located',
        LOGGED: 'https://w3id.org/xapi/dod-isd/verbs/logged',
        LUBRICATED: 'https://w3id.org/xapi/dod-isd/verbs/lubricated',
        MADE: 'https://w3id.org/xapi/dod-isd/verbs/made',
        MAINTAINED: 'https://w3id.org/xapi/dod-isd/verbs/maintained',
        MANAGED: 'https://w3id.org/xapi/dod-isd/verbs/managed',
        MANEUVERED: 'https://w3id.org/xapi/dod-isd/verbs/maneuvered',
        MANIPULATED: 'https://w3id.org/xapi/dod-isd/verbs/manipulated',
        MAPPED: 'https://w3id.org/xapi/dod-isd/verbs/mapped',
        MATCHED: 'https://w3id.org/xapi/dod-isd/verbs/matched',
        MEASURED: 'https://w3id.org/xapi/dod-isd/verbs/measured',
        MODIFIED: 'https://w3id.org/xapi/dod-isd/verbs/modified',
        MONITORED: 'https://w3id.org/xapi/dod-isd/verbs/monitored',
        MOUNTED: 'https://w3id.org/xapi/dod-isd/verbs/mounted',
        MOVED: 'https://w3id.org/xapi/dod-isd/verbs/moved',
        NAMED: 'https://w3id.org/xapi/dod-isd/verbs/named',
        NAVIGATED: 'https://w3id.org/xapi/dod-isd/verbs/navigated',
        NEUTRALIZED: 'https://w3id.org/xapi/dod-isd/verbs/neutralized',
        NOTIFIED: 'https://w3id.org/xapi/dod-isd/verbs/notified',
        OBEYED_RULES: 'https://w3id.org/xapi/dod-isd/verbs/obeyed-rules',
        OBSERVED: 'https://w3id.org/xapi/dod-isd/verbs/observed',
        OBTAINED: 'https://w3id.org/xapi/dod-isd/verbs/obtained',
        OCCUPIED: 'https://w3id.org/xapi/dod-isd/verbs/occupied',
        OPENED: 'https://w3id.org/xapi/dod-isd/verbs/opened',
        OPERATED: 'https://w3id.org/xapi/dod-isd/verbs/operated',
        ORDERED: 'https://w3id.org/xapi/dod-isd/verbs/ordered',
        ORGANIZED: 'https://w3id.org/xapi/dod-isd/verbs/organized',
        ORIENTED: 'https://w3id.org/xapi/dod-isd/verbs/oriented',
        ORIGINATED: 'https://w3id.org/xapi/dod-isd/verbs/originated',
        OUTLINED: 'https://w3id.org/xapi/dod-isd/verbs/outlined',
        PACKED: 'https://w3id.org/xapi/dod-isd/verbs/packed',
        PARKED: 'https://w3id.org/xapi/dod-isd/verbs/parked',
        PATROLLED: 'https://w3id.org/xapi/dod-isd/verbs/patrolled',
        PAUSED: 'https://w3id.org/xapi/dod-isd/verbs/paused',
        PERCEIVED: 'https://w3id.org/xapi/dod-isd/verbs/perceived',
        PERFORMED: 'https://w3id.org/xapi/dod-isd/verbs/performed',
        PLACED: 'https://w3id.org/xapi/dod-isd/verbs/placed',
        PLANNED: 'https://w3id.org/xapi/dod-isd/verbs/planned',
        PLOTTED: 'https://w3id.org/xapi/dod-isd/verbs/plotted',
        POLICED: 'https://w3id.org/xapi/dod-isd/verbs/policed',
        POSITIONED: 'https://w3id.org/xapi/dod-isd/verbs/positioned',
        POSTED: 'https://w3id.org/xapi/dod-isd/verbs/posted',
        PREDICTED: 'https://w3id.org/xapi/dod-isd/verbs/predicted',
        PREPARED: 'https://w3id.org/xapi/dod-isd/verbs/prepared',
        PRESCRIBED: 'https://w3id.org/xapi/dod-isd/verbs/prescribed',
        PRESSED: 'https://w3id.org/xapi/dod-isd/verbs/pressed',
        PRESSURIZED: 'https://w3id.org/xapi/dod-isd/verbs/pressurized',
        PREVENTED: 'https://w3id.org/xapi/dod-isd/verbs/prevented',
        PRIMED: 'https://w3id.org/xapi/dod-isd/verbs/primed',
        PRIORITIZED: 'https://w3id.org/xapi/dod-isd/verbs/prioritized',
        PROCESSED: 'https://w3id.org/xapi/dod-isd/verbs/processed',
        PROCURED: 'https://w3id.org/xapi/dod-isd/verbs/procured',
        PRODUCED: 'https://w3id.org/xapi/dod-isd/verbs/produced',
        PROGRAMMED: 'https://w3id.org/xapi/dod-isd/verbs/programmed',
        PROJECTED: 'https://w3id.org/xapi/dod-isd/verbs/projected',
        PROPOSED: 'https://w3id.org/xapi/dod-isd/verbs/proposed',
        PROTECTED: 'https://w3id.org/xapi/dod-isd/verbs/protected',
        PROVIDED: 'https://w3id.org/xapi/dod-isd/verbs/provided',
        PUBLISHED: 'https://w3id.org/xapi/dod-isd/verbs/published',
        PULLED: 'https://w3id.org/xapi/dod-isd/verbs/pulled',
        QUALIFIED: 'https://w3id.org/xapi/dod-isd/verbs/qualified',
        QUEUED: 'https://w3id.org/xapi/dod-isd/verbs/queued',
        RAISED: 'https://w3id.org/xapi/dod-isd/verbs/raised',
        RAN: 'https://w3id.org/xapi/dod-isd/verbs/ran',
        RANGED: 'https://w3id.org/xapi/dod-isd/verbs/ranged',
        RANKED: 'https://w3id.org/xapi/dod-isd/verbs/ranked',
        REACHED: 'https://w3id.org/xapi/dod-isd/verbs/reached',
        REACTED: 'https://w3id.org/xapi/dod-isd/verbs/reacted',
        READ: 'https://w3id.org/xapi/dod-isd/verbs/read',
        READIED: 'https://w3id.org/xapi/dod-isd/verbs/readied',
        REALIGNED: 'https://w3id.org/xapi/dod-isd/verbs/realigned',
        REASSESSED: 'https://w3id.org/xapi/dod-isd/verbs/reassessed',
        RECALLED: 'https://w3id.org/xapi/dod-isd/verbs/recalled',
        RECEIVED: 'https://w3id.org/xapi/dod-isd/verbs/received',
        RECOGNIZED: 'https://w3id.org/xapi/dod-isd/verbs/recognized',
        RECOMMENDED: 'https://w3id.org/xapi/dod-isd/verbs/recommended',
        RECONCILED: 'https://w3id.org/xapi/dod-isd/verbs/reconciled',
        RECONNOITERED: 'https://w3id.org/xapi/dod-isd/verbs/reconnoitered',
        RECORDED: 'https://w3id.org/xapi/dod-isd/verbs/recorded',
        RECOUNTED: 'https://w3id.org/xapi/dod-isd/verbs/recounted',
        RECOVERED: 'https://w3id.org/xapi/dod-isd/verbs/recovered',
        REDISTRIBUTED: 'https://w3id.org/xapi/dod-isd/verbs/redistributed',
        REDUCED: 'https://w3id.org/xapi/dod-isd/verbs/reduced',
        REESTABLISHED: 'https://w3id.org/xapi/dod-isd/verbs/reestablished',
        REEXAMINED: 'https://w3id.org/xapi/dod-isd/verbs/reexamined',
        REFUELED: 'https://w3id.org/xapi/dod-isd/verbs/refueled',
        REGULATED: 'https://w3id.org/xapi/dod-isd/verbs/regulated',
        RELEASED: 'https://w3id.org/xapi/dod-isd/verbs/released',
        RELIEVED: 'https://w3id.org/xapi/dod-isd/verbs/relieved',
        RELOCATED: 'https://w3id.org/xapi/dod-isd/verbs/relocated',
        REMOVED: 'https://w3id.org/xapi/dod-isd/verbs/removed',
        REORGANIZED: 'https://w3id.org/xapi/dod-isd/verbs/reorganized',
        REPAIRED: 'https://w3id.org/xapi/dod-isd/verbs/repaired',
        REPLACED: 'https://w3id.org/xapi/dod-isd/verbs/replaced',
        REPLENISHED: 'https://w3id.org/xapi/dod-isd/verbs/replenished',
        REPORTED: 'https://w3id.org/xapi/dod-isd/verbs/reported',
        REQUESTED: 'https://w3id.org/xapi/dod-isd/verbs/requested',
        RESET: 'https://w3id.org/xapi/dod-isd/verbs/reset',
        RESOLVED: 'https://w3id.org/xapi/dod-isd/verbs/resolved',
        RESPONDED: 'https://w3id.org/xapi/dod-isd/verbs/responded',
        RESTATED: 'https://w3id.org/xapi/dod-isd/verbs/restated',
        RESUMED: 'https://w3id.org/xapi/dod-isd/verbs/resumed',
        RETRIEVED: 'https://w3id.org/xapi/dod-isd/verbs/retrieved',
        RETURNED: 'https://w3id.org/xapi/dod-isd/verbs/returned',
        REVIEWED: 'https://w3id.org/xapi/dod-isd/verbs/reviewed',
        REVISED: 'https://w3id.org/xapi/dod-isd/verbs/revised',
        ROTATED: 'https://w3id.org/xapi/dod-isd/verbs/rotated',
        ROUTED: 'https://w3id.org/xapi/dod-isd/verbs/routed',
        SAVED: 'https://w3id.org/xapi/dod-isd/verbs/saved',
        SAW: 'https://w3id.org/xapi/dod-isd/verbs/saw',
        SCANNED: 'https://w3id.org/xapi/dod-isd/verbs/scanned',
        SCHEDULED: 'https://w3id.org/xapi/dod-isd/verbs/scheduled',
        SEARCHED: 'https://w3id.org/xapi/dod-isd/verbs/searched',
        SECURED: 'https://w3id.org/xapi/dod-isd/verbs/secured',
        SELECTED: 'https://w3id.org/xapi/dod-isd/verbs/selected',
        SENT: 'https://w3id.org/xapi/dod-isd/verbs/sent',
        SEPARATED: 'https://w3id.org/xapi/dod-isd/verbs/separated',
        SERVED: 'https://w3id.org/xapi/dod-isd/verbs/served',
        SERVICED: 'https://w3id.org/xapi/dod-isd/verbs/serviced',
        SET: 'https://w3id.org/xapi/dod-isd/verbs/set',
        SET_UP: 'https://w3id.org/xapi/dod-isd/verbs/set-up',
        SHARED: 'https://w3id.org/xapi/dod-isd/verbs/shared',
        SHOWED: 'https://w3id.org/xapi/dod-isd/verbs/showed',
        SHOWED_AWARENESS: 'https://w3id.org/xapi/dod-isd/verbs/showed-awareness',
        SHOWED_SENSITIVITY: 'https://w3id.org/xapi/dod-isd/verbs/showed-sensitivity',
        SHUT_DOWN: 'https://w3id.org/xapi/dod-isd/verbs/shut-down',
        SIGHTED: 'https://w3id.org/xapi/dod-isd/verbs/sighted',
        SIGNALED: 'https://w3id.org/xapi/dod-isd/verbs/signaled',
        SMELLED: 'https://w3id.org/xapi/dod-isd/verbs/smelled',
        SOLVED: 'https://w3id.org/xapi/dod-isd/verbs/solved',
        SORTED: 'https://w3id.org/xapi/dod-isd/verbs/sorted',
        SPECIFIED: 'https://w3id.org/xapi/dod-isd/verbs/specified',
        SPLINTED: 'https://w3id.org/xapi/dod-isd/verbs/splinted',
        SQUEEZED: 'https://w3id.org/xapi/dod-isd/verbs/squeezed',
        STARTED: 'https://w3id.org/xapi/dod-isd/verbs/started',
        STATED: 'https://w3id.org/xapi/dod-isd/verbs/stated',
        STAYED: 'https://w3id.org/xapi/dod-isd/verbs/stayed',
        STEERED: 'https://w3id.org/xapi/dod-isd/verbs/steered',
        STOCKPILED: 'https://w3id.org/xapi/dod-isd/verbs/stockpiled',
        STOOD_TO: 'https://w3id.org/xapi/dod-isd/verbs/stood-to',
        STOPPED: 'https://w3id.org/xapi/dod-isd/verbs/stopped',
        STORED: 'https://w3id.org/xapi/dod-isd/verbs/stored',
        STOWED: 'https://w3id.org/xapi/dod-isd/verbs/stowed',
        STRUCK: 'https://w3id.org/xapi/dod-isd/verbs/struck',
        STUDIED: 'https://w3id.org/xapi/dod-isd/verbs/studied',
        SUBMITTED: 'https://w3id.org/xapi/dod-isd/verbs/submitted',
        SUMMARIZED: 'https://w3id.org/xapi/dod-isd/verbs/summarized',
        SUPERVISED: 'https://w3id.org/xapi/dod-isd/verbs/supervised',
        SUPPORTED: 'https://w3id.org/xapi/dod-isd/verbs/supported',
        SUPPRESSED: 'https://w3id.org/xapi/dod-isd/verbs/suppressed',
        SWAM: 'https://w3id.org/xapi/dod-isd/verbs/swam',
        SWEPT: 'https://w3id.org/xapi/dod-isd/verbs/swept',
        SYNTHESIZED: 'https://w3id.org/xapi/dod-isd/verbs/synthesized',
        TAILORED: 'https://w3id.org/xapi/dod-isd/verbs/tailored',
        TAPPED: 'https://w3id.org/xapi/dod-isd/verbs/tapped',
        TASKED: 'https://w3id.org/xapi/dod-isd/verbs/tasked',
        TASTED: 'https://w3id.org/xapi/dod-isd/verbs/tasted',
        TEMPERED: 'https://w3id.org/xapi/dod-isd/verbs/tempered',
        TEMPLATED: 'https://w3id.org/xapi/dod-isd/verbs/templated',
        TESTED: 'https://w3id.org/xapi/dod-isd/verbs/tested',
        THREW: 'https://w3id.org/xapi/dod-isd/verbs/threw',
        TIGHTENED: 'https://w3id.org/xapi/dod-isd/verbs/tightened',
        TOLD: 'https://w3id.org/xapi/dod-isd/verbs/told',
        TOOK: 'https://w3id.org/xapi/dod-isd/verbs/took',
        TOOK_CHARGE: 'https://w3id.org/xapi/dod-isd/verbs/took-charge',
        TOOK_OFF: 'https://w3id.org/xapi/dod-isd/verbs/took-off',
        TRACED: 'https://w3id.org/xapi/dod-isd/verbs/traced',
        TRACKED: 'https://w3id.org/xapi/dod-isd/verbs/tracked',
        TRAINED: 'https://w3id.org/xapi/dod-isd/verbs/trained',
        TRANSFERRED: 'https://w3id.org/xapi/dod-isd/verbs/transferred',
        TRANSLATED: 'https://w3id.org/xapi/dod-isd/verbs/translated',
        TRANSMITTED: 'https://w3id.org/xapi/dod-isd/verbs/transmitted',
        TRANSPORTED: 'https://w3id.org/xapi/dod-isd/verbs/transported',
        TRAVERSED: 'https://w3id.org/xapi/dod-isd/verbs/traversed',
        TREATED: 'https://w3id.org/xapi/dod-isd/verbs/treated',
        TRIAGED: 'https://w3id.org/xapi/dod-isd/verbs/triaged',
        TROUBLESHOT: 'https://w3id.org/xapi/dod-isd/verbs/troubleshot',
        TUNED: 'https://w3id.org/xapi/dod-isd/verbs/tuned',
        TURNED: 'https://w3id.org/xapi/dod-isd/verbs/turned',
        TWISTED: 'https://w3id.org/xapi/dod-isd/verbs/twisted',
        TYPED: 'https://w3id.org/xapi/dod-isd/verbs/typed',
        UNLOADED: 'https://w3id.org/xapi/dod-isd/verbs/unloaded',
        UPDATED: 'https://w3id.org/xapi/dod-isd/verbs/updated',
        USED: 'https://w3id.org/xapi/dod-isd/verbs/used',
        UTILIZED: 'https://w3id.org/xapi/dod-isd/verbs/utilized',
        VALIDATED: 'https://w3id.org/xapi/dod-isd/verbs/validated',
        VERIFIED: 'https://w3id.org/xapi/dod-isd/verbs/verified',
        VISUALIZED: 'https://w3id.org/xapi/dod-isd/verbs/visualized',
        WAITED: 'https://w3id.org/xapi/dod-isd/verbs/waited',
        WAR_GAMED: 'https://w3id.org/xapi/dod-isd/verbs/war-gamed',
        WORE: 'https://w3id.org/xapi/dod-isd/verbs/wore',
        WROTE: 'https://w3id.org/xapi/dod-isd/verbs/wrote',
        ZEROED: 'https://w3id.org/xapi/dod-isd/verbs/zeroed',
    },
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {
        CATEGORY: 'https://w3id.org/xapi/dod-isd/extensions/category',
        INTERACTIVITY_LEVEL: 'https://w3id.org/xapi/dod-isd/extensions/interactivity-level',
        KSA: 'https://w3id.org/xapi/dod-isd/extensions/ksa',
    },
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const EDACOURSEPROFILE = Object.freeze({
    CATEGORYID: 'https://profiles.adlnet.gov/xapi/90feff49-3709-460a-855a-0025d0b12ab7/v/1',
    VERBS: {},
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const EMOTIONAPIPROFILE = Object.freeze({
    CATEGORYID: 'https://profiles.adlnet.gov/xapi/4a1d0786-1de4-4941-9edc-2513b5c83a17/v/1',
    VERBS: {},
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {
        AROUSAL: 'https://profiles.adlnet.gov/xapi/4a1d0786-1de4-4941-9edc-2513b5c83a17/extension/arousal',
        VALENCE: 'https://profiles.adlnet.gov/xapi/4a1d0786-1de4-4941-9edc-2513b5c83a17/extension/valence',
    },
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const FEEDBACKINTERACTIONPROFILE = Object.freeze({
    CATEGORYID: 'https://xapi.com.au/profiles/feedback-interaction/v1.0/v/2',
    VERBS: {
        COMMENTED: 'https://w3id.org/xapi/adb/verbs/commented',
        RATED: 'https://w3id.org/xapi/acrossx/verbs/rated',
    },
    ACTIVITYTYPES: {
        FEEDBACK_INTERACTION: 'https://xapi.com.au/activities/feedback',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {
        COMMENT_TEXT: 'https://xapi.com.au/extensions/comment-text',
        STAR_RATING: 'https://xapi.com.au/extensions/star-rating',
    }
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const FLASHCARDSPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/flashcards/v0.1',
    VERBS: {},
    ACTIVITYTYPES: {
        FLASHCARD: 'https://w3id.org/xapi/flashcards/activity-types/flashcard',
        FLASHCARD_DECK: 'https://w3id.org/xapi/flashcards/activity-types/flashcard-deck',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const FLYINGPROFILE = Object.freeze({
    CATEGORYID: 'https://pttportal.af.mil/xapi/profile/flying/v/1',
    VERBS: {},
    ACTIVITYTYPES: {
        FLIGHT_OPERATION: 'https://pttportal.af.mil/xapi/activity-type/flight-operation',
        MANEUVER: 'https://pttportal.af.mil/xapi/activity-type/maneuver',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const GBLXAPIK12EDUCATIONAPPSPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/gblxapi/v1.0',
    VERBS: {},
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {
        DIFFICULTY: 'https://w3id.org/xapi.gblxapi/extensions/difficulty',
    },
    CONTEXTEXTENSION: {
        ACTION: 'https://w3id.org/xapi/gblxapi/extensions/action',
        DOMAIN: 'https://w3id.org/xapi/gblxapi/extensions/domain',
        FOCUS: 'https://w3id.org/xapi/gblxapi/extensions/focus',
        GRADE: 'https://w3id.org/xapi/gblxapi/extensions/grade',
        SKILL: 'https://w3id.org/xapi/gblxapi/extensions/skill',
        SUBDOMAIN: 'https://w3id.org/xapi/gblxapi/extensions/subdomain',
        TOPIC: 'https://w3id.org/xapi/gblxapi/extensions/topic',
    },
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const GENERALVOCABULARYPROFILE = Object.freeze({
    CATEGORYID: 'https://pttportal.af.mil/xapi/profile/vocab/v/1',
    VERBS: {},
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const GEOLOCATIONPROFILE = Object.freeze({
    CATEGORYID: 'https://xapi.org.au/geolocationprofile/v/1',
    VERBS: {
        CHECKED_IN: 'https://xapi.org.au/geolocationprofileprofile/verb/checkedin/',
        CHECKED_OUT: 'https://xapi.org.au/geolocationprofileprofile/verb/checkedout/',
        FINISHED: 'https://xapi.org.au/geolocationprofileprofile/verb/finished',
    },
    ACTIVITYTYPES: {
        PLACE: 'https://xapi.org.au/geolocationprofileprofile/activity/place',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const GROUNDTRAININGPROFILE = Object.freeze({
    CATEGORYID: 'https://pttportal.af.mil/xapi/profile/ground-training/v/1',
    VERBS: {},
    ACTIVITYTYPES: {
        GROUND_TRAINING_ASSESSMENT: 'https://pttportal.af.mil/xapi/activity-type/ground-training-assessment',
        GROUND_TRAINING_LESSON: 'https://pttportal.af.mil/xapi/activity-type/ground-training-lesson',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const HROPENASSESSMENTSPROFILE = Object.freeze({
    CATEGORYID: 'http://profiles.usalearning.net/xapi/043b24b4-4389-435f-b052-805fd5563166/v/2',
    VERBS: {
        CHOOSE: 'https://w3id.org/xapi/hros-asessment/verbs/chooses',
        DESIGNED: 'https://w3id.org/xapi/hros-asessment/verbs/designed',
        EMULATED: 'https://w3id.org/xapi/hros-asessment/verbs/emulated',
        PERFORMED: 'https://w3id.org/xapi/hros-asessment/verbs/performed',
        RECORDED: 'https://w3id.org/xapi/hros-asessment/verbs/recorded',
        SELECTED: 'https://w3id.org/xapi/hros-asessment/verbs/selected',
        SIMULATED: 'https://w3id.org/xapi/hros-asessment/verbs/simulated',
        SOLVED: 'https://w3id.org/xapi/HROSAsessment/v1.0/verbs/solved',
        SOLVED_2: 'https://w3id.org/xapi/hros-asessment/verbs/solved',
        WROTE: 'https://w3id.org/xapi/hros-asessment/verbs/writes',
    },
    ACTIVITYTYPES: {
        AUDIO: 'https://w3id.org/xapi/hros-asessment/activitytypes/audio',
        CODE_ASSESSMENT: 'https://w3id.org/xapi/hros-asessment/activitytypes/codeassessment',
        FIELD_ASSESSMENT: 'https://w3id.org/xapi/hros-asessment/activitytypes/fieldassessment',
        LEADERSHIP_ASSESSMENT: 'https://w3id.org/xapi/hros-asessment/activitytypes/leadershipassessment',
        PERSONALITY_ASSESSMENT: 'https://w3id.org/xapi/hros-asessment/activitytypes/personalityassessment',
        POLICE_ASSESSMENT: 'https://w3id.org/xapi/hros-asessment/activitytypes/policeassessment',
        PSYCHOMETRIC_ASSESSMENT: 'https://w3id.org/xapi/hros-asessment/activitytypes/psychometricassessment',
        VIRTUAL_REALITY_ASSESSMENT: 'https://w3id.org/xapi/hros-asessment/activitytypes/vrassessment',
        WORK_SAMPLE_ASSESSMENT: 'https://w3id.org/xapi/hros-asessment/activitytypes/worksampleassessment',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const HYFLEXCLASSROOMPROFILE = Object.freeze({
    CATEGORYID: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/v/2',
    VERBS: {
        DRWAING: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/verb/drawing',
        KICK: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/verb/kick',
        PROOFREAD: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/verb/proofread',
        RECORD_VIDEO: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/verb/record',
        REVISE: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/verb/revise',
    },
    ACTIVITYTYPES: {
        CLASS_SECTION: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/class-section',
        CONCENTRATION: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/concentration',
        FEEDBACK_ON_CLASS: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/feedback',
        HIGHLIGHT_VIDEO: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/highlight-video',
        PHOTO: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/photo',
        SECOND_DEVICE: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/second-device',
        SPEAK: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/speak',
        WHISPER: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/whisper',
    },
    ACTIVITYEXTENSION: {
        TYPE_OF_QUIZ: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/type-of-quiz',
    },
    CONTEXTEXTENSION: {
        CLASSROOM_SUBJECT: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/classroom-subject',
        LEARNING_TOOL: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/learning-tool',
        PARTICIPATION_MODE: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/participation-mode',
    },
    RESULTEXTENSION: {
        ACCURACY_RATE: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/accuracy-rate',
        PROGRESS_RATE: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/progress-rate',
        SATISFACTION_SCORE: 'https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/satisfaction-score',
    }
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const IMSGLOBALLEARNINGTOOLINTEROPERABILITYPROFILE = Object.freeze({
    CATEGORYID: 'http://profiles.usalearning.net/xapi/5eda3789-9801-4dcc-ae22-9971b2a31871/v/9',
    VERBS: {
        RETURNED_LTI: 'http://profiles.usalearning.net/xapi/5eda3789-9801-4dcc-ae22-9971b2a31871/verb/returned-lti',
        USED_LTI: 'http://profiles.usalearning.net/xapi/5eda3789-9801-4dcc-ae22-9971b2a31871/verb/lti-used',
    },
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {
        FEDERATED_SESSION_ID: 'http://profiles.usalearning.net/xapi/5eda3789-9801-4dcc-ae22-9971b2a31871/extension/federated-session-id',
    },
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const INITIALIZEDHHINITPROFILE = Object.freeze({
    CATEGORYID: 'https://profiles.adlnet.gov/xapi/b0085953-4e4e-4429-ba4e-afd6746095c4/v/1',
    VERBS: {},
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const LANGUAGEEXPERIMENTPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/langexperiment/v/1',
    VERBS: {},
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const LEARNINGMANAGEMENTSYSTEMPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/lms/v/1',
    VERBS: {},
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {
        ENDING_DATE: 'https://w3id.org/xapi/lms/extensions/ending-date',
        ROLE: 'https://w3id.org/xapi/lms/extensions/role',
        STARTING_DATE: 'https://w3id.org/xapi/lms/extensions/starting-date',
    },
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const TLAPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/tla/v/4',
    VERBS: {
        APPRAISED: 'https://w3id.org/xapi/tla/verbs/appraised',
        APPROVED: 'https://w3id.org/xapi/tla/verbs/approved',
        ASSERTED: 'https://w3id.org/xapi/tla/verbs/asserted',
        ASSESSED: 'https://w3id.org/xapi/tla/verbs/assessed',
        ATTENDED: 'https://w3id.org/xapi/tla/verbs/attended',
        CAPTURED: 'https://w3id.org/xapi/tla/verbs/captured',
        CERTIFIED: 'https://w3id.org/xapi/tla/verbs/certified',
        CLARIFIED: 'https://w3id.org/xapi/tla/verbs/clarified',
        CONFERRED: 'https://w3id.org/xapi/tla/verbs/conferred',
        CONTEXTUALIZED: 'https://w3id.org/xapi/tla/verbs/contextualized',
        DESELECTED: 'https://w3id.org/xapi/tla/verbs/deselected',
        DETAILED: 'https://w3id.org/xapi/tla/verbs/detailed',
        DIRECTED: 'https://w3id.org/xapi/tla/verbs/directed',
        EMPLOYED: 'https://w3id.org/xapi/tla/verbs/employed',
        EVALUATED: 'https://w3id.org/xapi/tla/verbs/evaluated',
        EXPERIENCED: 'https://w3id.org/xapi/tla/verbs/experienced',
        EXPLORED: 'https://w3id.org/xapi/tla/verbs/explored',
        INFERRED: 'https://w3id.org/xapi/tla/verbs/inferred',
        LOCATED: 'https://w3id.org/xapi/tla/verbs/located',
        MASTERED: 'https://w3id.org/xapi/tla/verbs/mastered',
        MOBILIZED: 'https://w3id.org/xapi/tla/verbs/mobilized',
        ORGANIZED: 'https://w3id.org/xapi/tla/verbs/organized',
        PLANNED: 'https://w3id.org/xapi/tla/verbs/planned',
        PRIORITIZED: 'https://w3id.org/xapi/tla/verbs/prioritized',
        PROJECTED: 'https://w3id.org/xapi/tla/verbs/projected',
        PROMOTED: 'https://w3id.org/xapi/tla/verbs/promoted',
        QUALIFIED: 'https://w3id.org/xapi/tla/verbs/qualified',
        RECOMMENDED: 'https://w3id.org/xapi/tla/verbs/recommended',
        RECRUITED: 'https://w3id.org/xapi/tla/verbs/recruited',
        REGISTERED: 'https://w3id.org/xapi/tla/verbs/registered',
        RELEASED: 'https://w3id.org/xapi/tla/verbs/released',
        RESTRICTED: 'https://w3id.org/xapi/tla/verbs/restricted',
        RESUMED: 'https://w3id.org/xapi/tla/verbs/resumed',
        SCHEDULED: 'https://w3id.org/xapi/tla/verbs/scheduled',
        SCHOOLED: 'https://w3id.org/xapi/tla/verbs/schooled',
        SCORED: 'https://w3id.org/xapi/tla/verbs/scored',
        SCREENED: 'https://w3id.org/xapi/tla/verbs/screened',
        SELECTED: 'https://w3id.org/xapi/tla/verbs/selected',
        SOCIALIZED: 'https://w3id.org/xapi/tla/verbs/socialized',
        SURVEYED: 'https://w3id.org/xapi/tla/verbs/surveyed',
        SUSPENDED: 'https://w3id.org/xapi/tla/verbs/suspended',
        TRACKED: 'https://w3id.org/xapi/tla/verbs/tracked',
        TRANSITIONED: 'https://w3id.org/xapi/tla/verbs/transitioned',
        VALIDATED: 'https://w3id.org/xapi/tla/verbs/validated',
        VERIFIED: 'https://w3id.org/xapi/tla/verbs/verified',
    },
    ACTIVITYTYPES: {
        ACTIVITY: 'https://w3id.org/xapi/tla/activity-types/activity',
        ASSESSMENT: 'https://w3id.org/xapi/tla/activity-types/assessment',
        BADGE: 'https://w3id.org/xapi/tla/activity-types/badge',
        CAREER: 'https://w3id.org/xapi/tla/activity-types/career',
        CAREER_STATE: 'https://w3id.org/xapi/tla/activity-types/career_state',
        COMPETENCY: 'https://w3id.org/xapi/tla/activity-types/competency',
        CONTENT_SET: 'https://w3id.org/xapi/tla/activity-types/content_set',
        CREDENTIAL: 'https://w3id.org/xapi/tla/activity-types/credential',
        JOB_DUTY_GIG: 'https://w3id.org/xapi/tla/activity-types/job_duty_gig',
    },
    ACTIVITYEXTENSION: {
        INSTANCE: 'https://w3id.org/xapi/tla/extensions/instance',
    },
    CONTEXTEXTENSION: {
        CONFIDENCE: 'https://w3id.org/xapi/tla/extensions/confidence',
        DEP: 'https://w3id.org/xapi/tla/extensions/DEP',
        DUE_DATE: 'https://w3id.org/xapi/tla/extensions/due_date',
        EVIDENCE: 'https://w3id.org/xapi/tla/extensions/evidence',
        EXPIRATION: 'https://w3id.org/xapi/tla/extensions/expiration',
        LOCATION: 'https://w3id.org/xapi/tla/extensions/location',
        PERMANENT_CHANGE_OF_STATION: 'https://w3id.org/xapi/tla/extensions/permanent_change_of_station',
        REASON: 'https://w3id.org/xapi/tla/extensions/reason',
        RESTRICTION_REASON: 'https://w3id.org/xapi/tla/extensions/restriction',
        UNIT_IDENTIFICATION_CODE: 'https://w3id.org/xapi/tla/extensions/unit_identification_code',
    },
    RESULTEXTENSION: {
        RECOMMENDATION_ORDER: 'https://w3id.org/xapi/tla/extensions/recommendation_order',
    }
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const NAVYASSESSMENTPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/netc-assessment/v/3',
    VERBS: {},
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {
        EXTENDED_INTERACTION_TYPE: 'https://w3id.org/xapi/netc-assessment/extensions/activity/extended-interaction-type',
        INTERACTION_ID_NUMBER: 'https://w3id.org/xapi/netc-assessment/extensions/activity/id-number',
    },
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {
        RESPONSE_EXPLANATION: 'https://w3id.org/xapi/netc-assessment/extensions/result/response-explanation',
        RESPONSE_TYPE: 'https://w3id.org/xapi/netc-assessment/extensions/result/response-type',
    }
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const NAVYCOMMONREFERENCEPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/netc/v/3',
    VERBS: {
        ACCESSED: 'https://w3id.org/xapi/netc/verbs/accessed',
        CLOSED: 'https://w3id.org/xapi/netc/verbs/closed',
        OPENED: 'https://w3id.org/xapi/netc/verbs/opened',
        PRINTED: 'https://w3id.org/xapi/netc/verbs/printed',
        UPLOADED: 'https://w3id.org/xapi/netc/verbs/uploaded',
    },
    ACTIVITYTYPES: {
        MENU: 'https://w3id.org/xapi/netc/activity-types/menu',
        MENU_ITEM: 'https://w3id.org/xapi/netc/activity-types/menu-item',
        ORGANIZATION: 'https://w3id.org/xapi/netc/activity-types/organization',
    },
    ACTIVITYEXTENSION: {
        COA_ID: 'https://w3id.org/xapi/netc/extensions/coa-id',
        RESOURCE_URL: 'https://w3id.org/xapi/netc/extensions/resource-url',
        TARGET_AUDIENCE: 'https://w3id.org/xapi/netc/extensions/target-audience',
        TARGET_RATING: 'https://w3id.org/xapi/netc/extensions/target-rating',
    },
    CONTEXTEXTENSION: {
        COURSE_ID_NUMBER: 'https://w3id.org/xapi/netc/extensions/course-id-number',
        FEEDBACK_TARGET: 'https://w3id.org/xapi/netc/extensions/feedback-target',
        HULL_APPLICABILITY: 'https://w3id.org/xapi/netc/extensions/hull-applicability',
        HULL_CONFIGURATION: 'https://w3id.org/xapi/netc/extensions/hull-configuration',
        LAUNCH_LOCATION: 'https://w3id.org/xapi/netc/extensions/launch-location',
        LEARNING_OBJECTIVE: 'https://w3id.org/xapi/netc/extensions/learning-objective',
        NAVY_ENLISTED_CLASSIFICATION: 'https://w3id.org/xapi/netc/extensions/navy-enlisted-classification',
        REFERRER_LOCATION: 'https://w3id.org/xapi/netc/extensions/referrer-location',
        SCHOOL_CENTER: 'https://w3id.org/xapi/netc/extensions/school-center',
        TECH_DOC_ID: 'https://w3id.org/xapi/netc/extensions/tech-doc-id',
        TECH_DOC_PROCEDURE_ID: 'https://w3id.org/xapi/netc/extensions/tech-doc-procedure-id',
        TECH_DOC_PROCEDURE_TITLE: 'https://w3id.org/xapi/netc/extensions/tech-doc-procedure-title',
        USER_AGENT: 'https://w3id.org/xapi/netc/extensions/user-agent',
    },
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const NAVYELEARNINGPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/netc-e-learning/v/1',
    VERBS: {},
    ACTIVITYTYPES: {
        SECTION: 'https://w3id.org/xapi/netc-e-learning/activity-types/section',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const NELCPROFILE = Object.freeze({
    CATEGORYID: 'http://profiles.usalearning.net/xapi/NELC/v/1',
    VERBS: {},
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {
        INSTRUCTOR: 'http://profiles.usalearning.net/xapi/NELC/extension/instructor',
    },
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const OPENEDXPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/openedx/v/5',
    VERBS: {
        UNREPORTED: 'https://w3id.org/xapi/openedx/verb/unreported',
        VOTED: 'https://w3id.org/xapi/openedx/verb/voted',
    },
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {
        SESSION_ID: 'https://w3id.org/xapi/openedx/extension/session-id',
        TRANSFORMER_VERSION: 'https://w3id.org/xapi/openedx/extension/transformer-version',
    },
    RESULTEXTENSION: {
        SPEED_FROM: 'https://w3id.org/xapi/openedx/extension/speed-from',
        SPEED_TO: 'https://w3id.org/xapi/openedx/extension/speed-to',
    }
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const ORPHANCONTAINERPROFILE = Object.freeze({
    CATEGORYID: 'https://profiles.usalearning.net/profiles/OrphanProfile/v/1',
    VERBS: {
        CHECK_OUT: 'https://xapi.org.au/geolocationprofile/verb/checkout',
        CHECKED_IN: 'https://xapi.org.au/geolocationprofile/verb/checkin',
        LOWERED_HAND: 'http://schema.dases.eu/xapi/profile/virtual-classroom/verb/lowered-hand',
        MUTED: 'http://schema.dases.eu/xapi/profile/virtual-classroom/verb/muted',
        RAISED_HAND: 'http://schema.dases.eu/xapi/profile/virtual-classroom/verb/raised-hand',
        SHARED_SCREEN: 'http://schema.dases.eu/xapi/profile/virtual-classroom/verb/shared-screen',
        STARTED_CAMERA: 'http://schema.dases.eu/xapi/profile/virtual-classroom/verb/started-camera',
        STOPPED_CAMERA: 'http://schema.dases.eu/xapi/profile/virtual-classroom/verb/stopped-camera',
        UNMUTED: 'http://schema.dases.eu/xapi/profile/virtual-classroom/verb/unmuted',
        UNSHARED_SCREEN: 'http://schema.dases.eu/xapi/profile/virtual-classroom/verb/unshared-screen',
    },
    ACTIVITYTYPES: {
        SIMULATION_SESSION: 'https://profiles.adlnet.gov/xapi/917114b6-71b4-4fcd-b6d3-892890594446/activitytype/Preflight',
        VIRTUAL_CLASSROOM: 'https://w3id.org/xapi/virtual-classroom/activityt-types/virtual-classroom',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const PDFANNOTATORPROFILE = Object.freeze({
    CATEGORYID: 'http://www.risc-inc.com/annotator/v1.0.',
    VERBS: {
        ANNOTATED: 'http://risc-inc.com/annotator/verbs/annotated',
        MODIFIED_ANNOTATION: 'http://risc-inc.com/annotator/verbs/modified',
    },
    ACTIVITYTYPES: {
        FREETEXT_ANNOTATION: 'http://www.risc-inc.com/annotator/activities/freetext',
        HIGHLIGHTED_TEXT_ANNOTATION: 'http://risc-inc.com/annotator/activities/highlight',
        NOTE_ANNOTATION: 'http://risc-inc.com/annotator/activities/note',
        UNDERLINE_ANNOTATION: 'http://risc-inc.com/annotator/activities/underline',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {
        HIGHLIGHTED_STRING: 'http://www.risc-inc.com/annotator/extensions/highlightedString',
        PAGE_INDEX: 'http://www.risc-inc.com/annotator/extensions/page',
        PDF_ANNOTATION_HIGHLIGHT_COLOUR: 'http://www.risc-inc.com/annotator/extensions/color',
        PDF_RECTANGLE_MAP: 'http://www.risc-inc.com/annotator/extensions/rects',
    },
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const PERFORMANCESUPPORTPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/performance-support/v/6',
    VERBS: {
        DESELECTED: 'https://w3id.org/xapi/performance-support/verbs/deselected',
        SEARCHED: 'https://w3id.org/xapi/performance-support/verb/searched',
        SEARCHED_2: 'https://w3id.org/xapi/performance-support/performance-support/verbs/searched',
        SEARCHED_3: 'https://w3id.org/xapi/performance-support/verbs/searched',
    },
    ACTIVITYTYPES: {
        APPLICATION: 'https://w3id.org/xapi/performance-support/performance-support/activity-types/application',
        APPLICATION_2: 'https://w3id.org/xapi/performance-support/activity-types/application',
        IMAGE: 'https://w3id.org/xapi/performance-support/activity-types/image',
        PERFORMANCE_SUPPORT: 'https://w3id.org/xapi/performance-support/performance-support/activity-types/image',
        PROCEDURE: 'https://w3id.org/xapi/performance-support/performance-support/activity-types/procedure',
        PROCEDURE_2: 'https://w3id.org/xapi/performance-support/activity-types/procedure',
        TASK: 'https://w3id.org/xapi/performance-support/activity-types/task',
    },
    ACTIVITYEXTENSION: {
        PROCEDURE_METADATA: 'https://w3id.org/xapi/performance-support/extensions/procedure-metadata',
        STEP_METADATA: 'https://w3id.org/xapi/performance-support/extensions/step-metadata',
    },
    CONTEXTEXTENSION: {
        LAUNCH_MODE: 'https://w3id.org/xapi/performance-support/extensions/launch-mode',
    },
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const SCORMPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/scorm/v/2',
    VERBS: {
        COMPLETED: 'http://adlnet.gov/expapi/verbs/completed',
        FAILED: 'http://adlnet.gov/expapi/verbs/failed',
        INITIALIZED: 'http://adlnet.gov/expapi/verbs/initialized',
        PASSED: 'http://adlnet.gov/expapi/verbs/passed',
        RESPONDED: 'http://adlnet.gov/expapi/verbs/responded',
        RESUMED: 'http://adlnet.gov/expapi/verbs/resumed',
        SCORED: 'http://adlnet.gov/expapi/verbs/scored',
        SUSPENDED: 'http://adlnet.gov/expapi/verbs/suspended',
        TERMINATED: 'http://adlnet.gov/expapi/verbs/terminated',
    },
    ACTIVITYTYPES: {
        ASSESSMENT: 'http://adlnet.gov/expapi/activities/assessment',
        ATTEMPT: 'http://adlnet.gov/expapi/activities/attempt',
        CMI_INTERACTION: 'http://adlnet.gov/expapi/activities/cmi.interaction',
        COURSE: 'http://adlnet.gov/expapi/activities/course',
        LESSON: 'http://adlnet.gov/expapi/activities/lesson',
        MODULE: 'http://adlnet.gov/expapi/activities/module',
        OBJECTIVE: 'http://adlnet.gov/expapi/activities/objective',
        PROFILE: 'http://adlnet.gov/expapi/activities/profile',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const SERIOUSGAMESPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/seriousgames/v1.0',
    VERBS: {
        ACCESSED: 'https://w3id.org/xapi/seriousgames/verbs/accessed',
        PRESSED: 'https://w3id.org/xapi/seriousgames/verbs/pressed',
        RELEASED: 'https://w3id.org/xapi/seriousgames/verbs/released',
        UNLOCKED: 'https://w3id.org/xapi/seriousgames/verbs/unlocked',
        USED: 'https://w3id.org/xapi/seriousgames/verbs/used',
    },
    ACTIVITYTYPES: {
        AREA: 'https://w3id.org/xapi/seriousgames/activity-types/area',
        CONTROLLER: 'https://w3id.org/xapi/seriousgames/activity-types/controller',
        CUTSCENE: 'https://w3id.org/xapi/seriousgames/activity-types/cutscene',
        DIALOG_TREE: 'https://w3id.org/xapi/seriousgames/activity-types/dialog-tree',
        ENEMY: 'https://w3id.org/xapi/seriousgames/activity-types/enemy',
        ITEM: 'https://w3id.org/xapi/seriousgames/activity-types/item',
        KEYBOARD: 'https://w3id.org/xapi/seriousgames/activity-types/keyboard',
        LEVEL: 'https://w3id.org/xapi/seriousgames/activity-types/level',
        MENU: 'https://w3id.org/xapi/seriousgames/activity-types/menu',
        MOUSE: 'https://w3id.org/xapi/seriousgames/activity-types/mouse',
        NON_PLAYER_CHARACTER: 'https://w3id.org/xapi/seriousgames/activity-types/non-player-character',
        QUEST: 'https://w3id.org/xapi/seriousgames/activity-types/quest',
        SCREEN: 'https://w3id.org/xapi/seriousgames/activity-types/screen',
        SERIOUS_GAME: 'https://w3id.org/xapi/seriousgames/activity-types/serious-game',
        TOUCHSCREEN: 'https://w3id.org/xapi/seriousgames/activity-types/touchscreen',
        ZONE: 'https://w3id.org/xapi/seriousgames/activity-types/zone',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {
        HEALTH: 'https://w3id.org/xapi/seriousgames/extensions/health',
        POSITION: 'https://w3id.org/xapi/seriousgames/extensions/position',
        PROGRESS: 'https://w3id.org/xapi/seriousgames/extensions/progress',
    }
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const SIMULATIONBASEPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/simulation/v/3',
    VERBS: {},
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {
        ELEMENT_NOMENCLATURE: 'https://w3id.org/xapi/simulation/extensions/element-nomenclature',
        ELEMENT_REF_DES: 'https://w3id.org/xapi/simulation/extensions/element-ref-des',
        S1000D_DMC: 'https://w3id.org/xapi/simulation/extensions/s1000d-dmc',
        S1000D_SNS: 'https://w3id.org/xapi/simulation/extensions/s1000d-sns',
        SIMULATION_MODE: 'https://w3id.org/xapi/simulation/extensions/simulation-mode',
    },
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const SOCIALMEDIAPROFILE = Object.freeze({
    CATEGORYID: 'https://xapi.org.au/sociallearningprofile/v/2',
    VERBS: {
        JOINED: 'https://xapi.org.au/sociallearningprofile/joined',
        LEFT: 'https://xapi.org.au/sociallearningprofile/left',
        LOVED: 'https://xapi.org.au/sociallearningprofile/loved',
    },
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {
        EMOTION: 'https://xapi.org.au/sociallearningprofile/emotion',
    },
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const SURVEYPOCPROFILE = Object.freeze({
    CATEGORYID: 'https://profiles.adlnet.gov/xapi/9109408b-fb88-46c8-b1cd-4bc1e2f37dab/v/1',
    VERBS: {},
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const SYLLABUSEVENTSPROFILE = Object.freeze({
    CATEGORYID: 'https://pttportal.af.mil/xapi/profile/syllabus-events/v/1',
    VERBS: {},
    ACTIVITYTYPES: {
        SYLLABUS_EVENT: 'https://pttportal.af.mil/xapi/activity-type/syllabus-event',
        SYLLABUS_PHASE: 'https://pttportal.af.mil/xapi/activity-type/syllabus-phase',
        SYLLABUS_UNIT: 'https://pttportal.af.mil/xapi/activity-type/syllabus-unit',
        TRAINING_PROGRAM: 'https://pttportal.af.mil/xapi/activity-type/training-program',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {
        MEDIA_CATEGORY: 'https://pttportal.af.mil/xapi/extension/media-category',
    },
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const TASKTRAINERSIMULATIONPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/task-trainer-simulation/v/2',
    VERBS: {
        RECEIVED: 'https://w3id.org/xapi/task-trainer-simulation/verbs/received',
        RESTARTED: 'https://w3id.org/xapi/task-trainer-simulation/verbs/restarted',
        USED: 'https://w3id.org/xapi/task-trainer-simulation/verbs/used',
    },
    ACTIVITYTYPES: {
        FEEDBACK_CORRECTIVE: 'https://w3id.org/xapi/task-trainer-simulation/activity-types/feedback-corrective',
        FEEDBACK_ERROR: 'https://w3id.org/xapi/task-trainer-simulation/activity-types/feedback-error',
        FEEDBACK_PERFORMANCE: 'https://w3id.org/xapi/task-trainer-simulation/activity-types/feedback-performance',
        FEEDBACK_SAFETY: 'https://w3id.org/xapi/task-trainer-simulation/activity-types/feedback-safety',
        TASK_TRAINER_DOCUMENT: 'https://w3id.org/xapi/task-trainer-simulation/activity-types/task-trainer-document',
        TASK_TRAINER_SCENARIO: 'https://w3id.org/xapi/task-trainer-simulation/activity-types/task-trainer-scenario',
        TASK_TRAINER_STEP: 'https://w3id.org/xapi/task-trainer-simulation/activity-types/task-trainer-step',
        TASK_TRAINER_TASK: 'https://w3id.org/xapi/task-trainer-simulation/activity-types/task-trainer-task',
        TASK_TRAINER_TOOL: 'https://w3id.org/xapi/task-trainer-simulation/activity-types/task-trainer-tool',
        TEST_TEST: 'https://w3id.org/xapi/simulation/activities/test-test',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const TINCANVOCABULARYPROFILE = Object.freeze({
    CATEGORYID: 'https://registry.tincanapi.com',
    VERBS: {
        ADJOURNED: 'http://id.tincanapi.com/verb/adjourned',
        APPLAUDED: 'http://id.tincanapi.com/verb/applauded',
        ARRANGED: 'http://id.tincanapi.com/verb/arranged',
        BOOKMARKED: 'http://id.tincanapi.com/verb/bookmarked',
        CALLED: 'http://id.tincanapi.com/verb/called',
        CLOSED_SALE: 'http://id.tincanapi.com/verb/closed-sale',
        CREATED_OPPORTUNITY: 'http://id.tincanapi.com/verb/created-opportunity',
        DEFINED: 'http://id.tincanapi.com/verb/defined',
        DISABLED: 'http://id.tincanapi.com/verb/disabled',
        DISCARDED: 'http://id.tincanapi.com/verb/discarded',
        DOWNLOADED: 'http://id.tincanapi.com/verb/downloaded',
        EARNED: 'http://id.tincanapi.com/verb/earned',
        ENABLED: 'http://id.tincanapi.com/verb/enabled',
        ENTERED_FRAME: 'http://id.tincanapi.com/verb/frame/entered',
        ESTIMATED_DURATION: 'http://id.tincanapi.com/verb/estimated-duration',
        EXITED_FRAME: 'http://id.tincanapi.com/verb/frame/exited',
        EXPECTED: 'http://id.tincanapi.com/verb/expected',
        EXPIRED: 'http://id.tincanapi.com/verb/expired',
        FOCUSED: 'http://id.tincanapi.com/verb/focused',
        HIRED: 'http://id.tincanapi.com/verb/hired',
        INTERVIEWED: 'http://id.tincanapi.com/verb/interviewed',
        LAUGHED: 'http://id.tincanapi.com/verb/laughed',
        MARKED_AS_UNREAD: 'http://id.tincanapi.com/verb/marked-unread',
        MENTIONED: 'http://id.tincanapi.com/verb/mentioned',
        MENTORED: 'http://id.tincanapi.com/verb/mentored',
        PAUSED: 'http://id.tincanapi.com/verb/paused',
        PERFORMED_OFFLINE: 'http://id.tincanapi.com/verb/performed-offline',
        PERSONALIZED: 'http://id.tincanapi.com/verb/personalized',
        PREVIEWED: 'http://id.tincanapi.com/verb/previewed',
        PROMOTED: 'http://id.tincanapi.com/verb/promoted',
        RATED: 'http://id.tincanapi.com/verb/rated',
        REPLIED: 'http://id.tincanapi.com/verb/replied',
        REPLIED_TO_TWEET: 'http://id.tincanapi.com/verb/replied-to-tweet',
        REQUESTED_ATTENTION: 'http://id.tincanapi.com/verb/requested-attention',
        RETWEETED: 'http://id.tincanapi.com/verb/retweeted',
        REVIEWED: 'http://id.tincanapi.com/verb/reviewed',
        SECURED: 'http://id.tincanapi.com/verb/secured',
        SELECTED: 'http://id.tincanapi.com/verb/selected',
        SKIPPED: 'http://id.tincanapi.com/verb/skipped',
        TALKEDWITH: 'http://id.tincanapi.com/verb/talked-with',
        TWEETED: 'http://id.tincanapi.com/verb/tweeted',
        UNFOCUSED: 'http://id.tincanapi.com/verb/unfocused',
        UNREGISTERED: 'http://id.tincanapi.com/verb/unregistered',
        VIEWED: 'http://id.tincanapi.com/verb/viewed',
        VOTED_DOWN: 'http://id.tincanapi.com/verb/voted-down',
        VOTED_UP: 'http://id.tincanapi.com/verb/voted-up',
    },
    ACTIVITYTYPES: {
        BLOG: 'http://id.tincanapi.com/activitytype/blog',
        BOOK: 'http://id.tincanapi.com/activitytype/book',
        CATEGORY: 'http://id.tincanapi.com/activitytype/category',
        CERTIFICATE: 'https://www.opigno.org/en/tincan_registry/activity_type/certificate',
        CHAPTER: 'http://id.tincanapi.com/activitytype/chapter',
        CHAT_CHANNEL: 'http://id.tincanapi.com/activitytype/chat-channel',
        CHAT_MESSAGE: 'http://id.tincanapi.com/activitytype/chat-message',
        CHECKLIST: 'http://id.tincanapi.com/activitytype/checklist',
        CHECKLIST_ITEM: 'http://id.tincanapi.com/activitytype/checklist-item',
        CODE_COMMIT: 'http://id.tincanapi.com/activitytype/code-commit',
        COMMUNITY_SITE: 'http://id.tincanapi.com/activitytype/community-site',
        CONFERENCE: 'http://id.tincanapi.com/activitytype/conference',
        CONFERENCE_SESSION: 'http://id.tincanapi.com/activitytype/conference-session',
        CONFERENCE_TRACK: 'http://id.tincanapi.com/activitytype/conference-track',
        DISCUSSION: 'http://id.tincanapi.com/activitytype/discussion',
        DOCUMENT: 'http://id.tincanapi.com/activitytype/document',
        DOUBT: 'http://id.tincanapi.com/activitytype/doubt',
        EMAIL: 'http://id.tincanapi.com/activitytype/email',
        EMBEDDED_STRATEGY: 'http://id.tincanapi.com/activitytype/strategy-embedded',
        ESSAY: 'http://id.tincanapi.com/activitytype/essay',
        FORUM_REPLY: 'http://id.tincanapi.com/activitytype/forum-reply',
        FORUM_TOPIC: 'http://id.tincanapi.com/activitytype/forum-topic',
        GOAL: 'http://id.tincanapi.com/activitytype/goal',
        GRADE_CLASSIFICATION: 'http://www.tincanapi.co.uk/activitytypes/grade_classification',
        LEGACY_LEARNING_STANDARD: 'http://id.tincanapi.com/activitytype/legacy-learning-standard',
        LMS: 'http://id.tincanapi.com/activitytype/lms',
        PARAGRAPH: 'http://id.tincanapi.com/activitytype/paragraph',
        PLAYLIST: 'http://id.tincanapi.com/activitytype/playlist',
        PROJECT: 'http://id.tincanapi.com/activitytype/project',
        PROJECT_SITE: 'http://id.tincanapi.com/activitytype/project-site',
        RESEARCH_REPORT: 'http://id.tincanapi.com/activitytype/research-report',
        RESOURCE: 'http://id.tincanapi.com/activitytype/resource',
        REWARD: 'http://id.tincanapi.com/activitytype/reward',
        SALES_OPPORTUNITY: 'http://id.tincanapi.com/activitytype/sales-opportunity',
        SCENARIO: 'http://id.tincanapi.com/activitytype/scenario',
        SCHOOL_ASSIGNMENT: 'http://id.tincanapi.com/activitytype/school-assignment',
        SECTION: 'http://id.tincanapi.com/activitytype/section',
        SECURITY_ROLE: 'http://id.tincanapi.com/activitytype/security-role',
        SIMPLE_COLLECTION: 'http://id.tincanapi.com/activitytype/collection-simple',
        SLIDE: 'http://id.tincanapi.com/activitytype/slide',
        SLIDE_DECK: 'http://id.tincanapi.com/activitytype/slide-deck',
        SOLUTION: 'http://id.tincanapi.com/activitytype/solution',
        SOURCE: 'http://id.tincanapi.com/activitytype/source',
        STATUS_UPDATE: 'http://id.tincanapi.com/activitytype/status-update',
        STEP: 'http://id.tincanapi.com/activitytype/step',
        STRATEGY: 'http://id.tincanapi.com/activitytype/strategy',
        SUBCATEGORY: 'http://id.tincanapi.com/activitytype/subcategory',
        SUGGESTION: 'http://id.tincanapi.com/activitytype/suggestion',
        TAG: 'http://id.tincanapi.com/activitytype/tag',
        TEST_DATA_BATCH: 'http://id.tincanapi.com/activitytype/test-data-batch',
        TUTOR_SESSION: 'http://id.tincanapi.com/activitytype/tutor-session',
        TWEET: 'http://id.tincanapi.com/activitytype/tweet',
        UNIT_TEST: 'http://id.tincanapi.com/activitytype/unit-test',
        UNIT_TEST_SUITE: 'http://id.tincanapi.com/activitytype/unit-test-suite',
        USER_PROFILE: 'http://id.tincanapi.com/activitytype/user-profile',
        VOCABULARY_WORD: 'http://id.tincanapi.com/activitytype/vocabulary-word',
        VOICEMAIL: 'http://id.tincanapi.com/activitytype/voicemail',
        WEBINAR: 'http://id.tincanapi.com/activitytype/webinar',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {
        ASSESSMENT_TYPE: 'http://id.tincanapi.com/extension/assessment-type',
        ATTEMPT_ID: 'http://id.tincanapi.com/extension/attempt-id',
        BROWSER_INFORMATION: 'http://id.tincanapi.com/extension/browser-info',
        CMI_INTERACTION_WEIGHTING: 'http://id.tincanapi.com/extension/cmi-interaction-weighting',
        COLLECTION_TYPE: 'http://id.tincanapi.com/extension/collection-type',
        COLOR: 'http://id.tincanapi.com/extension/color',
        CONDITION_TYPE: 'http://id.tincanapi.com/extension/condition-type',
        CONDITION_VALUE: 'http://id.tincanapi.com/extension/condition-value',
        DATA_URI: 'http://id.tincanapi.com/extension/data-uri',
        DATE: 'http://id.tincanapi.com/extension/date',
        DATETIME: 'http://id.tincanapi.com/extension/datetime',
        DROP_DOWN: 'http://id.tincanapi.com/extension/drop-down',
        ENDING_POSITION: 'http://id.tincanapi.com/extension/ending-position',
        FEEDBACK: 'http://id.tincanapi.com/extension/feedback',
        GEO_JSON: 'http://id.tincanapi.com/extension/geojson',
        INVITEE: 'http://id.tincanapi.com/extension/invitee',
        IP_ADDRESS: 'http://id.tincanapi.com/extension/ip-address',
        IRL: 'http://id.tincanapi.com/extension/irl',
        ISBN: 'http://id.tincanapi.com/extension/isbn',
        JWS_CERTIFICATE_LOCATION: 'http://id.tincanapi.com/extension/jws-certificate-location',
        LATITUDE: 'http://id.tincanapi.com/extension/latitude',
        LOCATION: 'http://id.tincanapi.com/extension/location',
        LONGITUDE: 'http://id.tincanapi.com/extension/longitude',
        MEASUREMENT: 'http://id.tincanapi.com/extension/measurement',
        MONETARY_VALUE: 'http://id.tincanapi.com/extension/monetary-value',
        OBSERVER: 'http://id.tincanapi.com/extension/observer',
        PLANNED_DURATION: 'http://id.tincanapi.com/extension/planned-duration',
        PLANNED_START_TIME: 'http://id.tincanapi.com/extension/planned-start-time',
        POSITION: 'http://id.tincanapi.com/extension/position',
        POWERED_BY: 'http://id.tincanapi.com/extension/powered-by',
        PRIVATE_AREA: 'http://id.tincanapi.com/extension/private-area',
        PUBLISHED: 'http://id.tincanapi.com/extension/published',
        PURPOSE: 'http://id.tincanapi.com/extension/purpose',
        REFERRER: 'http://id.tincanapi.com/extension/referrer',
        REFLECTION: 'http://id.tincanapi.com/extension/reflection',
        SEVERITY: 'http://id.tincanapi.com/extension/severity',
        SHARE_MEDIUM: 'http://id.tincanapi.com/extension/share-medium',
        STARTING_POINT: 'http://id.tincanapi.com/extension/starting-point',
        STARTING_POSITION: 'http://id.tincanapi.com/extension/starting-position',
        TAGS: 'http://id.tincanapi.com/extension/tags',
        TARGET: 'http://id.tincanapi.com/extension/target',
        TOPIC: 'http://id.tincanapi.com/extension/topic',
        TRAINING_PROVIDER: 'http://id.tincanapi.com/extension/training-provider',
        TWEET: 'http://id.tincanapi.com/extension/tweet',
        UPDATED: 'http://id.tincanapi.com/extension/updated',
    },
    RESULTEXTENSION: {
        ACTIONSPER_MINUTE: 'http://id.tincanapi.com/extension/apm',
        CLASSIFICATION: 'http://www.tincanapi.co.uk/extensions/result/classification',
        DURATION: 'http://id.tincanapi.com/extension/duration',
        ENDING_POINT: 'http://id.tincanapi.com/extension/ending-point',
        QUALITY_RATING: 'http://id.tincanapi.com/extension/quality-rating',
        TETRIS_LINES: 'http://id.tincanapi.com/extension/tetris-lines',
        TIME: 'http://id.tincanapi.com/extension/time',
        VALID_UNTIL: 'http://id.tincanapi.com/extension/valid-until',
    }
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const VIDEOPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/video/v/2',
    VERBS: {
        PAUSED: 'https://w3id.org/xapi/video/verbs/paused',
        PLAYED: 'https://w3id.org/xapi/video/verbs/played',
        SEEKED: 'https://w3id.org/xapi/video/verbs/seeked',
    },
    ACTIVITYTYPES: {
        VIDEO: 'https://w3id.org/xapi/video/activity-type/video',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {
        CC_SUBTITLE_ENABLED: 'https://w3id.org/xapi/video/extensions/cc-subtitle-enabled',
        CC_SUBTITLE_LANG: 'https://w3id.org/xapi/video/extensions/cc-subtitle-lang',
        COMPLETION_THRESHOLD: 'https://w3id.org/xapi/video/extensions/completion-threshold',
        FRAME_RATE: 'https://w3id.org/xapi/video/extensions/frame-rate',
        FULL_SCREEN: 'https://w3id.org/xapi/video/extensions/full-screen',
        LENGTH: 'https://w3id.org/xapi/video/extensions/length',
        QUALITY: 'https://w3id.org/xapi/video/extensions/quality',
        SCREEN_SIZE: 'https://w3id.org/xapi/video/extensions/screen-size',
        SESSION_ID: 'https://w3id.org/xapi/video/extensions/session-id',
        SPEED: 'https://w3id.org/xapi/video/extensions/speed',
        TRACK: 'https://w3id.org/xapi/video/extensions/track',
        USER_AGENT: 'https://w3id.org/xapi/video/extensions/user-agent',
        VIDEO_PLAYBACK_SIZE: 'https://w3id.org/xapi/video/extensions/video-playback-size',
        VOLUME: 'https://w3id.org/xapi/video/extensions/volume',
    },
    RESULTEXTENSION: {
        PLAYED_SEGMENTS: 'https://w3id.org/xapi/video/extensions/played-segments',
        PROGRESS: 'https://w3id.org/xapi/video/extensions/progress',
        TIME: 'https://w3id.org/xapi/video/extensions/time',
        TIME_FROM: 'https://w3id.org/xapi/video/extensions/time-from',
        TIME_TO: 'https://w3id.org/xapi/video/extensions/time-to',
    }
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const VIRTUALCLASSROOMPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/virtual-classroom/v/1',
    VERBS: {},
    ACTIVITYTYPES: {
        VIRTUAL_CLASSROOM: 'https://w3id.org/xapi/virtual-classroom/activity-types/virtual-classroom',
    },
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {
        CAMERA_ACTIVATED: 'https://w3id.org/xapi/virtual-classroom/extensions/camera-activated',
        HAND_RAISED: 'https://w3id.org/xapi/virtual-classroom/extensions/hand-raised',
        MICRO_ACTIVATED: 'https://w3id.org/xapi/virtual-classroom/extensions/micro-activated',
        SCREEN_SHARED: 'https://w3id.org/xapi/virtual-classroom/extensions/screen-shared',
    },
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const VIRTUALPATIENTPROFILE = Object.freeze({
    CATEGORYID: 'https://w3id.org/xapi/virtual-patient/v1.0',
    VERBS: {
        IGNORED: 'https://w3id.org/xapi/medbiq/verbs/ignored',
        UPDATED: 'https://w3id.org/xapi/medbiq/verbs/updated',
    },
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {},
    RESULTEXTENSION: {}
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles
const XAPIOPENBADGESPROFILE = Object.freeze({
    CATEGORYID: 'http://specification.openbadges.org/xapi',
    VERBS: {},
    ACTIVITYTYPES: {},
    ACTIVITYEXTENSION: {},
    CONTEXTEXTENSION: {
        OPEN_BADGE_CLASS: 'http://specification.openbadges.org/xapi/extensions/badgeclass',
    },
    RESULTEXTENSION: {
        OPEN_BADGE_ASSERTION: 'http://specification.openbadges.org/xapi/extensions/badgeassertion',
    }
});

// Auto-generated from xapi-authored-profiles/Profile_Server_Profiles
// Do not edit manually. Re-run: npm run generate:profiles

const ALL = Object.freeze({
    CATEGORYID: Object.freeze({
        ACADEMICASSESSMENTPROFILE: ACADEMICASSESSMENTPROFILE.CATEGORYID,
        ACROSSXPROFILE: ACROSSXPROFILE.CATEGORYID,
        ACTIONABLEDATABOOKADBPROFILE: ACTIONABLEDATABOOKADBPROFILE.CATEGORYID,
        ACTIVITYSTREAMSVOCABULARYPROFILE: ACTIVITYSTREAMSVOCABULARYPROFILE.CATEGORYID,
        ADLVOCABULARYPROFILE: ADLVOCABULARYPROFILE.CATEGORYID,
        AUDIOPROFILE: AUDIOPROFILE.CATEGORYID,
        BOLLPROFILE: BOLLPROFILE.CATEGORYID,
        CMI5PROFILE: CMI5PROFILE.CATEGORYID,
        CONTENTREPOSITORYPROFILE: CONTENTREPOSITORYPROFILE.CATEGORYID,
        COREPROFILE: COREPROFILE.CATEGORYID,
        DATASECURITYMODULEPROFILE: DATASECURITYMODULEPROFILE.CATEGORYID,
        DODISDPROFILE: DODISDPROFILE.CATEGORYID,
        EDACOURSEPROFILE: EDACOURSEPROFILE.CATEGORYID,
        EMOTIONAPIPROFILE: EMOTIONAPIPROFILE.CATEGORYID,
        FEEDBACKINTERACTIONPROFILE: FEEDBACKINTERACTIONPROFILE.CATEGORYID,
        FLASHCARDSPROFILE: FLASHCARDSPROFILE.CATEGORYID,
        FLYINGPROFILE: FLYINGPROFILE.CATEGORYID,
        GBLXAPIK12EDUCATIONAPPSPROFILE: GBLXAPIK12EDUCATIONAPPSPROFILE.CATEGORYID,
        GENERALVOCABULARYPROFILE: GENERALVOCABULARYPROFILE.CATEGORYID,
        GEOLOCATIONPROFILE: GEOLOCATIONPROFILE.CATEGORYID,
        GROUNDTRAININGPROFILE: GROUNDTRAININGPROFILE.CATEGORYID,
        HROPENASSESSMENTSPROFILE: HROPENASSESSMENTSPROFILE.CATEGORYID,
        HYFLEXCLASSROOMPROFILE: HYFLEXCLASSROOMPROFILE.CATEGORYID,
        IMSGLOBALLEARNINGTOOLINTEROPERABILITYPROFILE: IMSGLOBALLEARNINGTOOLINTEROPERABILITYPROFILE.CATEGORYID,
        INITIALIZEDHHINITPROFILE: INITIALIZEDHHINITPROFILE.CATEGORYID,
        LANGUAGEEXPERIMENTPROFILE: LANGUAGEEXPERIMENTPROFILE.CATEGORYID,
        LEARNINGMANAGEMENTSYSTEMPROFILE: LEARNINGMANAGEMENTSYSTEMPROFILE.CATEGORYID,
        TLAPROFILE: TLAPROFILE.CATEGORYID,
        NAVYASSESSMENTPROFILE: NAVYASSESSMENTPROFILE.CATEGORYID,
        NAVYCOMMONREFERENCEPROFILE: NAVYCOMMONREFERENCEPROFILE.CATEGORYID,
        NAVYELEARNINGPROFILE: NAVYELEARNINGPROFILE.CATEGORYID,
        NELCPROFILE: NELCPROFILE.CATEGORYID,
        OPENEDXPROFILE: OPENEDXPROFILE.CATEGORYID,
        ORPHANCONTAINERPROFILE: ORPHANCONTAINERPROFILE.CATEGORYID,
        PDFANNOTATORPROFILE: PDFANNOTATORPROFILE.CATEGORYID,
        PERFORMANCESUPPORTPROFILE: PERFORMANCESUPPORTPROFILE.CATEGORYID,
        SCORMPROFILE: SCORMPROFILE.CATEGORYID,
        SERIOUSGAMESPROFILE: SERIOUSGAMESPROFILE.CATEGORYID,
        SIMULATIONBASEPROFILE: SIMULATIONBASEPROFILE.CATEGORYID,
        SOCIALMEDIAPROFILE: SOCIALMEDIAPROFILE.CATEGORYID,
        SURVEYPOCPROFILE: SURVEYPOCPROFILE.CATEGORYID,
        SYLLABUSEVENTSPROFILE: SYLLABUSEVENTSPROFILE.CATEGORYID,
        TASKTRAINERSIMULATIONPROFILE: TASKTRAINERSIMULATIONPROFILE.CATEGORYID,
        TINCANVOCABULARYPROFILE: TINCANVOCABULARYPROFILE.CATEGORYID,
        VIDEOPROFILE: VIDEOPROFILE.CATEGORYID,
        VIRTUALCLASSROOMPROFILE: VIRTUALCLASSROOMPROFILE.CATEGORYID,
        VIRTUALPATIENTPROFILE: VIRTUALPATIENTPROFILE.CATEGORYID,
        XAPIOPENBADGESPROFILE: XAPIOPENBADGESPROFILE.CATEGORYID,
    }),
    VERBS: Object.freeze({
        ANNOTATED: "http://risc-inc.com/annotator/verbs/annotated",
        ACROSSXPROFILE_ANNOTATED: "https://w3id.org/xapi/acrossx/verbs/annotated",
        ACTIONABLEDATABOOKADBPROFILE_ANNOTATED: "https://w3id.org/xapi/adb/verbs/annotated",
        DODISDPROFILE_ANNOTATED: "https://w3id.org/xapi/dod-isd/verbs/annotated",
        PDFANNOTATORPROFILE_ANNOTATED: "http://risc-inc.com/annotator/verbs/annotated",
        DESIGNED: "https://w3id.org/xapi/hros-asessment/verbs/designed",
        ACROSSXPROFILE_DESIGNED: "https://w3id.org/xapi/acrossx/verbs/designed",
        DODISDPROFILE_DESIGNED: "https://w3id.org/xapi/dod-isd/verbs/designed",
        HROPENASSESSMENTSPROFILE_DESIGNED: "https://w3id.org/xapi/hros-asessment/verbs/designed",
        DISLIKED: "http://activitystrea.ms/dislike",
        ACROSSXPROFILE_DISLIKED: "https://w3id.org/xapi/acrossx/verbs/disliked",
        ACTIVITYSTREAMSVOCABULARYPROFILE_DISLIKED: "http://activitystrea.ms/dislike",
        EDITED: "https://w3id.org/xapi/dod-isd/verbs/edited",
        ACROSSXPROFILE_EDITED: "https://w3id.org/xapi/acrossx/verbs/edited",
        DODISDPROFILE_EDITED: "https://w3id.org/xapi/dod-isd/verbs/edited",
        EVALUATED: "https://w3id.org/xapi/tla/verbs/evaluated",
        ACROSSXPROFILE_EVALUATED: "https://w3id.org/xapi/acrossx/verbs/evaluated",
        DODISDPROFILE_EVALUATED: "https://w3id.org/xapi/dod-isd/verbs/evaluated",
        TLAPROFILE_EVALUATED: "https://w3id.org/xapi/tla/verbs/evaluated",
        LIKED: "http://activitystrea.ms/like",
        ACROSSXPROFILE_LIKED: "https://w3id.org/xapi/acrossx/verbs/liked",
        ACTIVITYSTREAMSVOCABULARYPROFILE_LIKED: "http://activitystrea.ms/like",
        POSTED: "https://w3id.org/xapi/dod-isd/verbs/posted",
        ACROSSXPROFILE_POSTED: "https://w3id.org/xapi/acrossx/verbs/posted",
        DODISDPROFILE_POSTED: "https://w3id.org/xapi/dod-isd/verbs/posted",
        REPORTED: "https://w3id.org/xapi/dod-isd/verbs/reported",
        ACROSSXPROFILE_REPORTED: "https://w3id.org/xapi/acrossx/verbs/reported",
        DODISDPROFILE_REPORTED: "https://w3id.org/xapi/dod-isd/verbs/reported",
        REVEALED: "https://w3id.org/xapi/acrossx/verbs/revealed",
        ACROSSXPROFILE_REVEALED: "https://w3id.org/xapi/acrossx/verbs/revealed",
        SEARCHED: "https://w3id.org/xapi/performance-support/verb/searched",
        ACROSSXPROFILE_SEARCHED: "https://w3id.org/xapi/acrossx/verbs/searched",
        ACTIVITYSTREAMSVOCABULARYPROFILE_SEARCHED: "http://activitystrea.ms/search",
        DODISDPROFILE_SEARCHED: "https://w3id.org/xapi/dod-isd/verbs/searched",
        PERFORMANCESUPPORTPROFILE_SEARCHED: "https://w3id.org/xapi/performance-support/verb/searched",
        WAS_ASSIGNED: "https://w3id.org/xapi/acrossx/verbs/was-assigned",
        ACROSSXPROFILE_WAS_ASSIGNED: "https://w3id.org/xapi/acrossx/verbs/was-assigned",
        WATCHED: "http://activitystrea.ms/watch",
        ACROSSXPROFILE_WATCHED: "https://w3id.org/xapi/acrossx/verbs/watched",
        ACTIONABLEDATABOOKADBPROFILE_WATCHED: "https://w3id.org/xapi/adb/verbs/watched",
        ACTIVITYSTREAMSVOCABULARYPROFILE_WATCHED: "http://activitystrea.ms/watch",
        ARRIVED: "https://w3id.org/xapi/adb/verbs/arrived",
        ACTIONABLEDATABOOKADBPROFILE_ARRIVED: "https://w3id.org/xapi/adb/verbs/arrived",
        ATTENDED: "https://w3id.org/xapi/tla/verbs/attended",
        ACTIONABLEDATABOOKADBPROFILE_ATTENDED: "https://w3id.org/xapi/adb/verbs/attended",
        ACTIVITYSTREAMSVOCABULARYPROFILE_ATTENDED: "http://activitystrea.ms/attend",
        ADLVOCABULARYPROFILE_ATTENDED: "http://adlnet.gov/expapi/verbs/attended",
        TLAPROFILE_ATTENDED: "https://w3id.org/xapi/tla/verbs/attended",
        BOOKMARKED: "http://id.tincanapi.com/verb/bookmarked",
        ACTIONABLEDATABOOKADBPROFILE_BOOKMARKED: "https://w3id.org/xapi/adb/verbs/bookmarked",
        TINCANVOCABULARYPROFILE_BOOKMARKED: "http://id.tincanapi.com/verb/bookmarked",
        COACHED: "https://w3id.org/xapi/adb/verbs/coached",
        ACTIONABLEDATABOOKADBPROFILE_COACHED: "https://w3id.org/xapi/adb/verbs/coached",
        DEMANDED: "https://w3id.org/xapi/adb/verbs/demanded",
        ACTIONABLEDATABOOKADBPROFILE_DEMANDED: "https://w3id.org/xapi/adb/verbs/demanded",
        DESCRIBED: "https://w3id.org/xapi/dod-isd/verbs/described",
        ACTIONABLEDATABOOKADBPROFILE_DESCRIBED: "https://w3id.org/xapi/adb/verbs/described",
        DODISDPROFILE_DESCRIBED: "https://w3id.org/xapi/dod-isd/verbs/described",
        HIGHLIGHTED: "https://w3id.org/xapi/adb/verbs/highlighted",
        ACTIONABLEDATABOOKADBPROFILE_HIGHLIGHTED: "https://w3id.org/xapi/adb/verbs/highlighted",
        INITIATED: "https://w3id.org/xapi/dod-isd/verbs/initiated",
        ACTIONABLEDATABOOKADBPROFILE_INITIATED: "https://w3id.org/xapi/adb/verbs/initiated",
        DODISDPROFILE_INITIATED: "https://w3id.org/xapi/dod-isd/verbs/initiated",
        NOTED: "https://w3id.org/xapi/adb/verbs/noted",
        ACTIONABLEDATABOOKADBPROFILE_NOTED: "https://w3id.org/xapi/adb/verbs/noted",
        READ: "https://w3id.org/xapi/dod-isd/verbs/read",
        ACTIONABLEDATABOOKADBPROFILE_READ: "https://w3id.org/xapi/adb/verbs/read",
        ACTIVITYSTREAMSVOCABULARYPROFILE_READ: "http://activitystrea.ms/read",
        DODISDPROFILE_READ: "https://w3id.org/xapi/dod-isd/verbs/read",
        REFERENCED: "https://w3id.org/xapi/adb/verbs/referenced",
        ACTIONABLEDATABOOKADBPROFILE_REFERENCED: "https://w3id.org/xapi/adb/verbs/referenced",
        REQUESTED: "https://w3id.org/xapi/dod-isd/verbs/requested",
        ACTIONABLEDATABOOKADBPROFILE_REQUESTED: "https://w3id.org/xapi/adb/verbs/requested",
        ACTIVITYSTREAMSVOCABULARYPROFILE_REQUESTED: "http://activitystrea.ms/request",
        DODISDPROFILE_REQUESTED: "https://w3id.org/xapi/dod-isd/verbs/requested",
        SELECTED: "http://id.tincanapi.com/verb/selected",
        ACTIONABLEDATABOOKADBPROFILE_SELECTED: "https://w3id.org/xapi/adb/verbs/selected",
        DODISDPROFILE_SELECTED: "https://w3id.org/xapi/dod-isd/verbs/selected",
        HROPENASSESSMENTSPROFILE_SELECTED: "https://w3id.org/xapi/hros-asessment/verbs/selected",
        TLAPROFILE_SELECTED: "https://w3id.org/xapi/tla/verbs/selected",
        TINCANVOCABULARYPROFILE_SELECTED: "http://id.tincanapi.com/verb/selected",
        ACCEPTED: "http://activitystrea.ms/accept",
        ACTIVITYSTREAMSVOCABULARYPROFILE_ACCEPTED: "http://activitystrea.ms/accept",
        ACCESSED: "https://w3id.org/xapi/seriousgames/verbs/accessed",
        ACTIVITYSTREAMSVOCABULARYPROFILE_ACCESSED: "http://activitystrea.ms/access",
        DODISDPROFILE_ACCESSED: "https://w3id.org/xapi/dod-isd/verbs/accessed",
        NAVYCOMMONREFERENCEPROFILE_ACCESSED: "https://w3id.org/xapi/netc/verbs/accessed",
        SERIOUSGAMESPROFILE_ACCESSED: "https://w3id.org/xapi/seriousgames/verbs/accessed",
        ACKNOWLEDGED: "https://w3id.org/xapi/dod-isd/verbs/acknowledged",
        ACTIVITYSTREAMSVOCABULARYPROFILE_ACKNOWLEDGED: "http://activitystrea.ms/acknowledge",
        DODISDPROFILE_ACKNOWLEDGED: "https://w3id.org/xapi/dod-isd/verbs/acknowledged",
        ADDED: "https://xapi.org.au/contentprofile/verb/added",
        ACTIVITYSTREAMSVOCABULARYPROFILE_ADDED: "http://activitystrea.ms/add",
        CONTENTREPOSITORYPROFILE_ADDED: "https://xapi.org.au/contentprofile/verb/added",
        AGREED: "http://activitystrea.ms/agree",
        ACTIVITYSTREAMSVOCABULARYPROFILE_AGREED: "http://activitystrea.ms/agree",
        APPENDED: "http://activitystrea.ms/append",
        ACTIVITYSTREAMSVOCABULARYPROFILE_APPENDED: "http://activitystrea.ms/append",
        APPROVED: "https://w3id.org/xapi/tla/verbs/approved",
        ACTIVITYSTREAMSVOCABULARYPROFILE_APPROVED: "http://activitystrea.ms/approve",
        DODISDPROFILE_APPROVED: "https://w3id.org/xapi/dod-isd/verbs/approved",
        TLAPROFILE_APPROVED: "https://w3id.org/xapi/tla/verbs/approved",
        ARCHIVED: "https://w3id.org/xapi/dod-isd/verbs/archived",
        ACTIVITYSTREAMSVOCABULARYPROFILE_ARCHIVED: "http://activitystrea.ms/archive",
        DODISDPROFILE_ARCHIVED: "https://w3id.org/xapi/dod-isd/verbs/archived",
        ASSIGNED: "https://w3id.org/xapi/dod-isd/verbs/assigned",
        ACTIVITYSTREAMSVOCABULARYPROFILE_ASSIGNED: "http://activitystrea.ms/assign",
        DODISDPROFILE_ASSIGNED: "https://w3id.org/xapi/dod-isd/verbs/assigned",
        ATTACHED: "https://w3id.org/xapi/dod-isd/verbs/attached",
        ACTIVITYSTREAMSVOCABULARYPROFILE_ATTACHED: "http://activitystrea.ms/attach",
        DODISDPROFILE_ATTACHED: "https://w3id.org/xapi/dod-isd/verbs/attached",
        AUTHORED: "http://activitystrea.ms/author",
        ACTIVITYSTREAMSVOCABULARYPROFILE_AUTHORED: "http://activitystrea.ms/author",
        AUTHORIZED: "http://activitystrea.ms/authorize",
        ACTIVITYSTREAMSVOCABULARYPROFILE_AUTHORIZED: "http://activitystrea.ms/authorize",
        BORROWED: "http://activitystrea.ms/borrow",
        ACTIVITYSTREAMSVOCABULARYPROFILE_BORROWED: "http://activitystrea.ms/borrow",
        BUILT: "http://activitystrea.ms/build",
        ACTIVITYSTREAMSVOCABULARYPROFILE_BUILT: "http://activitystrea.ms/build",
        CANCELED: "https://w3id.org/xapi/dod-isd/verbs/canceled",
        ACTIVITYSTREAMSVOCABULARYPROFILE_CANCELED: "http://activitystrea.ms/cancel",
        DODISDPROFILE_CANCELED: "https://w3id.org/xapi/dod-isd/verbs/canceled",
        CHECKEDIN: "http://activitystrea.ms/checkin",
        ACTIVITYSTREAMSVOCABULARYPROFILE_CHECKEDIN: "http://activitystrea.ms/checkin",
        CLOSED: "https://w3id.org/xapi/netc/verbs/closed",
        ACTIVITYSTREAMSVOCABULARYPROFILE_CLOSED: "http://activitystrea.ms/close",
        DODISDPROFILE_CLOSED: "https://w3id.org/xapi/dod-isd/verbs/closed",
        NAVYCOMMONREFERENCEPROFILE_CLOSED: "https://w3id.org/xapi/netc/verbs/closed",
        COMPLETED: "http://adlnet.gov/expapi/verbs/completed",
        ACTIVITYSTREAMSVOCABULARYPROFILE_COMPLETED: "http://activitystrea.ms/complete",
        DODISDPROFILE_COMPLETED: "https://w3id.org/xapi/dod-isd/verbs/completed",
        SCORMPROFILE_COMPLETED: "http://adlnet.gov/expapi/verbs/completed",
        CONFIRMED: "https://w3id.org/xapi/dod-isd/verbs/confirmed",
        ACTIVITYSTREAMSVOCABULARYPROFILE_CONFIRMED: "http://activitystrea.ms/confirm",
        DODISDPROFILE_CONFIRMED: "https://w3id.org/xapi/dod-isd/verbs/confirmed",
        CONSUMED: "http://activitystrea.ms/consume",
        ACTIVITYSTREAMSVOCABULARYPROFILE_CONSUMED: "http://activitystrea.ms/consume",
        CREATED: "https://w3id.org/xapi/dod-isd/verbs/created",
        ACTIVITYSTREAMSVOCABULARYPROFILE_CREATED: "http://activitystrea.ms/create",
        DODISDPROFILE_CREATED: "https://w3id.org/xapi/dod-isd/verbs/created",
        DELETED: "https://w3id.org/xapi/dod-isd/verbs/deleted",
        ACTIVITYSTREAMSVOCABULARYPROFILE_DELETED: "http://activitystrea.ms/delete",
        DODISDPROFILE_DELETED: "https://w3id.org/xapi/dod-isd/verbs/deleted",
        DELIVERED: "https://w3id.org/xapi/dod-isd/verbs/delivered",
        ACTIVITYSTREAMSVOCABULARYPROFILE_DELIVERED: "http://activitystrea.ms/deliver",
        DODISDPROFILE_DELIVERED: "https://w3id.org/xapi/dod-isd/verbs/delivered",
        DENIED: "http://activitystrea.ms/deny",
        ACTIVITYSTREAMSVOCABULARYPROFILE_DENIED: "http://activitystrea.ms/deny",
        DISAGREED: "http://activitystrea.ms/disagree",
        ACTIVITYSTREAMSVOCABULARYPROFILE_DISAGREED: "http://activitystrea.ms/disagree",
        EXPERIENCED: "https://w3id.org/xapi/tla/verbs/experienced",
        ACTIVITYSTREAMSVOCABULARYPROFILE_EXPERIENCED: "http://activitystrea.ms/experience",
        ADLVOCABULARYPROFILE_EXPERIENCED: "http://adlnet.gov/expapi/verbs/experienced",
        TLAPROFILE_EXPERIENCED: "https://w3id.org/xapi/tla/verbs/experienced",
        FAVORITED: "http://activitystrea.ms/favorite",
        ACTIVITYSTREAMSVOCABULARYPROFILE_FAVORITED: "http://activitystrea.ms/favorite",
        FLAGGED_AS_INAPPROPRIATE: "http://activitystrea.ms/flag-as-inappropriate",
        ACTIVITYSTREAMSVOCABULARYPROFILE_FLAGGED_AS_INAPPROPRIATE: "http://activitystrea.ms/flag-as-inappropriate",
        FOLLOWED: "https://w3id.org/xapi/dod-isd/verbs/followed",
        ACTIVITYSTREAMSVOCABULARYPROFILE_FOLLOWED: "http://activitystrea.ms/follow",
        DODISDPROFILE_FOLLOWED: "https://w3id.org/xapi/dod-isd/verbs/followed",
        FOUND: "https://w3id.org/xapi/dod-isd/verbs/found",
        ACTIVITYSTREAMSVOCABULARYPROFILE_FOUND: "http://activitystrea.ms/find",
        DODISDPROFILE_FOUND: "https://w3id.org/xapi/dod-isd/verbs/found",
        GAVE: "https://w3id.org/xapi/dod-isd/verbs/gave",
        ACTIVITYSTREAMSVOCABULARYPROFILE_GAVE: "http://activitystrea.ms/give",
        DODISDPROFILE_GAVE: "https://w3id.org/xapi/dod-isd/verbs/gave",
        HOSTED: "http://activitystrea.ms/host",
        ACTIVITYSTREAMSVOCABULARYPROFILE_HOSTED: "http://activitystrea.ms/host",
        IGNORED: "https://w3id.org/xapi/medbiq/verbs/ignored",
        ACTIVITYSTREAMSVOCABULARYPROFILE_IGNORED: "http://activitystrea.ms/ignore",
        VIRTUALPATIENTPROFILE_IGNORED: "https://w3id.org/xapi/medbiq/verbs/ignored",
        INSERTED: "https://w3id.org/xapi/dod-isd/verbs/inserted",
        ACTIVITYSTREAMSVOCABULARYPROFILE_INSERTED: "http://activitystrea.ms/insert",
        DODISDPROFILE_INSERTED: "https://w3id.org/xapi/dod-isd/verbs/inserted",
        INSTALLED: "https://w3id.org/xapi/dod-isd/verbs/installed",
        ACTIVITYSTREAMSVOCABULARYPROFILE_INSTALLED: "http://activitystrea.ms/install",
        DODISDPROFILE_INSTALLED: "https://w3id.org/xapi/dod-isd/verbs/installed",
        INTERACTED: "http://adlnet.gov/expapi/verbs/interacted",
        ACTIVITYSTREAMSVOCABULARYPROFILE_INTERACTED: "http://activitystrea.ms/interact",
        ADLVOCABULARYPROFILE_INTERACTED: "http://adlnet.gov/expapi/verbs/interacted",
        INVITED: "http://activitystrea.ms/invite",
        ACTIVITYSTREAMSVOCABULARYPROFILE_INVITED: "http://activitystrea.ms/invite",
        JOINED: "https://xapi.org.au/sociallearningprofile/joined",
        ACTIVITYSTREAMSVOCABULARYPROFILE_JOINED: "http://activitystrea.ms/join",
        SOCIALMEDIAPROFILE_JOINED: "https://xapi.org.au/sociallearningprofile/joined",
        LEFT: "https://xapi.org.au/sociallearningprofile/left",
        ACTIVITYSTREAMSVOCABULARYPROFILE_LEFT: "http://activitystrea.ms/leave",
        SOCIALMEDIAPROFILE_LEFT: "https://xapi.org.au/sociallearningprofile/left",
        LISTENED: "https://w3id.org/xapi/dod-isd/verbs/listened",
        ACTIVITYSTREAMSVOCABULARYPROFILE_LISTENED: "http://activitystrea.ms/listen",
        DODISDPROFILE_LISTENED: "https://w3id.org/xapi/dod-isd/verbs/listened",
        LOST: "http://activitystrea.ms/lose",
        ACTIVITYSTREAMSVOCABULARYPROFILE_LOST: "http://activitystrea.ms/lose",
        MADEFRIEND: "http://activitystrea.ms/make-friend",
        ACTIVITYSTREAMSVOCABULARYPROFILE_MADEFRIEND: "http://activitystrea.ms/make-friend",
        OPENED: "https://w3id.org/xapi/netc/verbs/opened",
        ACTIVITYSTREAMSVOCABULARYPROFILE_OPENED: "http://activitystrea.ms/open",
        DODISDPROFILE_OPENED: "https://w3id.org/xapi/dod-isd/verbs/opened",
        NAVYCOMMONREFERENCEPROFILE_OPENED: "https://w3id.org/xapi/netc/verbs/opened",
        PLAYED: "https://w3id.org/xapi/video/verbs/played",
        ACTIVITYSTREAMSVOCABULARYPROFILE_PLAYED: "http://activitystrea.ms/play",
        VIDEOPROFILE_PLAYED: "https://w3id.org/xapi/video/verbs/played",
        PRESENTED: "http://activitystrea.ms/present",
        ACTIVITYSTREAMSVOCABULARYPROFILE_PRESENTED: "http://activitystrea.ms/present",
        PURCHASED: "http://activitystrea.ms/purchase",
        ACTIVITYSTREAMSVOCABULARYPROFILE_PURCHASED: "http://activitystrea.ms/purchase",
        QUALIFIED: "https://w3id.org/xapi/tla/verbs/qualified",
        ACTIVITYSTREAMSVOCABULARYPROFILE_QUALIFIED: "http://activitystrea.ms/qualify",
        DODISDPROFILE_QUALIFIED: "https://w3id.org/xapi/dod-isd/verbs/qualified",
        TLAPROFILE_QUALIFIED: "https://w3id.org/xapi/tla/verbs/qualified",
        RECEIVED: "https://w3id.org/xapi/task-trainer-simulation/verbs/received",
        ACTIVITYSTREAMSVOCABULARYPROFILE_RECEIVED: "http://activitystrea.ms/receive",
        DODISDPROFILE_RECEIVED: "https://w3id.org/xapi/dod-isd/verbs/received",
        TASKTRAINERSIMULATIONPROFILE_RECEIVED: "https://w3id.org/xapi/task-trainer-simulation/verbs/received",
        REJECTED: "http://activitystrea.ms/reject",
        ACTIVITYSTREAMSVOCABULARYPROFILE_REJECTED: "http://activitystrea.ms/reject",
        REMOVED: "https://w3id.org/xapi/dod-isd/verbs/removed",
        ACTIVITYSTREAMSVOCABULARYPROFILE_REMOVED: "http://activitystrea.ms/remove",
        DODISDPROFILE_REMOVED: "https://w3id.org/xapi/dod-isd/verbs/removed",
        REMOVED_FRIEND: "http://activitystrea.ms/remove-friend",
        ACTIVITYSTREAMSVOCABULARYPROFILE_REMOVED_FRIEND: "http://activitystrea.ms/remove-friend",
        REPLACED: "https://w3id.org/xapi/dod-isd/verbs/replaced",
        ACTIVITYSTREAMSVOCABULARYPROFILE_REPLACED: "http://activitystrea.ms/replace",
        DODISDPROFILE_REPLACED: "https://w3id.org/xapi/dod-isd/verbs/replaced",
        REQUESTED_FRIEND: "http://activitystrea.ms/request-friend",
        ACTIVITYSTREAMSVOCABULARYPROFILE_REQUESTED_FRIEND: "http://activitystrea.ms/request-friend",
        RESOLVED: "https://w3id.org/xapi/dod-isd/verbs/resolved",
        ACTIVITYSTREAMSVOCABULARYPROFILE_RESOLVED: "http://activitystrea.ms/resolve",
        DODISDPROFILE_RESOLVED: "https://w3id.org/xapi/dod-isd/verbs/resolved",
        RETRACTED: "http://activitystrea.ms/retract",
        ACTIVITYSTREAMSVOCABULARYPROFILE_RETRACTED: "http://activitystrea.ms/retract",
        RETURNED: "https://w3id.org/xapi/dod-isd/verbs/returned",
        ACTIVITYSTREAMSVOCABULARYPROFILE_RETURNED: "http://activitystrea.ms/return",
        DODISDPROFILE_RETURNED: "https://w3id.org/xapi/dod-isd/verbs/returned",
        RSVP_MAYBE: "http://activitystrea.ms/rsvp-maybe",
        ACTIVITYSTREAMSVOCABULARYPROFILE_RSVP_MAYBE: "http://activitystrea.ms/rsvp-maybe",
        RSVP_NO: "http://activitystrea.ms/rsvp-no",
        ACTIVITYSTREAMSVOCABULARYPROFILE_RSVP_NO: "http://activitystrea.ms/rsvp-no",
        RSVP_YES: "http://activitystrea.ms/rsvp-yes",
        ACTIVITYSTREAMSVOCABULARYPROFILE_RSVP_YES: "http://activitystrea.ms/rsvp-yes",
        SATISFIED: "https://w3id.org/xapi/adl/verbs/satisfied",
        ACTIVITYSTREAMSVOCABULARYPROFILE_SATISFIED: "http://activitystrea.ms/satisfy",
        CMI5PROFILE_SATISFIED: "https://w3id.org/xapi/adl/verbs/satisfied",
        SAVED: "https://w3id.org/xapi/dod-isd/verbs/saved",
        ACTIVITYSTREAMSVOCABULARYPROFILE_SAVED: "http://activitystrea.ms/save",
        DODISDPROFILE_SAVED: "https://w3id.org/xapi/dod-isd/verbs/saved",
        SCHEDULED: "https://w3id.org/xapi/tla/verbs/scheduled",
        ACTIVITYSTREAMSVOCABULARYPROFILE_SCHEDULED: "http://activitystrea.ms/schedule",
        DODISDPROFILE_SCHEDULED: "https://w3id.org/xapi/dod-isd/verbs/scheduled",
        TLAPROFILE_SCHEDULED: "https://w3id.org/xapi/tla/verbs/scheduled",
        SENT: "https://w3id.org/xapi/dod-isd/verbs/sent",
        ACTIVITYSTREAMSVOCABULARYPROFILE_SENT: "http://activitystrea.ms/send",
        DODISDPROFILE_SENT: "https://w3id.org/xapi/dod-isd/verbs/sent",
        SHARED: "https://w3id.org/xapi/dod-isd/verbs/shared",
        ACTIVITYSTREAMSVOCABULARYPROFILE_SHARED: "http://activitystrea.ms/share",
        ADLVOCABULARYPROFILE_SHARED: "http://adlnet.gov/expapi/verbs/shared",
        DODISDPROFILE_SHARED: "https://w3id.org/xapi/dod-isd/verbs/shared",
        SOLD: "http://activitystrea.ms/sell",
        ACTIVITYSTREAMSVOCABULARYPROFILE_SOLD: "http://activitystrea.ms/sell",
        SPONSORED: "http://activitystrea.ms/sponsor",
        ACTIVITYSTREAMSVOCABULARYPROFILE_SPONSORED: "http://activitystrea.ms/sponsor",
        STARTED: "https://w3id.org/xapi/dod-isd/verbs/started",
        ACTIVITYSTREAMSVOCABULARYPROFILE_STARTED: "http://activitystrea.ms/start",
        DODISDPROFILE_STARTED: "https://w3id.org/xapi/dod-isd/verbs/started",
        STOPPED_FOLLOWING: "http://activitystrea.ms/stop-following",
        ACTIVITYSTREAMSVOCABULARYPROFILE_STOPPED_FOLLOWING: "http://activitystrea.ms/stop-following",
        SUBMITTED: "https://w3id.org/xapi/dod-isd/verbs/submitted",
        ACTIVITYSTREAMSVOCABULARYPROFILE_SUBMITTED: "http://activitystrea.ms/submit",
        DODISDPROFILE_SUBMITTED: "https://w3id.org/xapi/dod-isd/verbs/submitted",
        TAGGED: "http://activitystrea.ms/tag",
        ACTIVITYSTREAMSVOCABULARYPROFILE_TAGGED: "http://activitystrea.ms/tag",
        TERMINATED: "http://adlnet.gov/expapi/verbs/terminated",
        ACTIVITYSTREAMSVOCABULARYPROFILE_TERMINATED: "http://activitystrea.ms/terminate",
        SCORMPROFILE_TERMINATED: "http://adlnet.gov/expapi/verbs/terminated",
        TIED: "http://activitystrea.ms/tie",
        ACTIVITYSTREAMSVOCABULARYPROFILE_TIED: "http://activitystrea.ms/tie",
        UNFAVORITED: "http://activitystrea.ms/unfavorite",
        ACTIVITYSTREAMSVOCABULARYPROFILE_UNFAVORITED: "http://activitystrea.ms/unfavorite",
        UNLIKED: "http://activitystrea.ms/unlike",
        ACTIVITYSTREAMSVOCABULARYPROFILE_UNLIKED: "http://activitystrea.ms/unlike",
        UNSATISFIED: "http://activitystrea.ms/unsatisfy",
        ACTIVITYSTREAMSVOCABULARYPROFILE_UNSATISFIED: "http://activitystrea.ms/unsatisfy",
        UNSAVED: "http://activitystrea.ms/unsave",
        ACTIVITYSTREAMSVOCABULARYPROFILE_UNSAVED: "http://activitystrea.ms/unsave",
        UNSHARED: "http://activitystrea.ms/unshare",
        ACTIVITYSTREAMSVOCABULARYPROFILE_UNSHARED: "http://activitystrea.ms/unshare",
        UPDATED: "https://w3id.org/xapi/medbiq/verbs/updated",
        ACTIVITYSTREAMSVOCABULARYPROFILE_UPDATED: "http://activitystrea.ms/update",
        DODISDPROFILE_UPDATED: "https://w3id.org/xapi/dod-isd/verbs/updated",
        VIRTUALPATIENTPROFILE_UPDATED: "https://w3id.org/xapi/medbiq/verbs/updated",
        USED: "https://w3id.org/xapi/task-trainer-simulation/verbs/used",
        ACTIVITYSTREAMSVOCABULARYPROFILE_USED: "http://activitystrea.ms/use",
        DODISDPROFILE_USED: "https://w3id.org/xapi/dod-isd/verbs/used",
        SERIOUSGAMESPROFILE_USED: "https://w3id.org/xapi/seriousgames/verbs/used",
        TASKTRAINERSIMULATIONPROFILE_USED: "https://w3id.org/xapi/task-trainer-simulation/verbs/used",
        WAS_AT: "http://activitystrea.ms/at",
        ACTIVITYSTREAMSVOCABULARYPROFILE_WAS_AT: "http://activitystrea.ms/at",
        WON: "http://activitystrea.ms/win",
        ACTIVITYSTREAMSVOCABULARYPROFILE_WON: "http://activitystrea.ms/win",
        ANSWERED: "https://w3id.org/xapi/dod-isd/verbs/answered",
        ADLVOCABULARYPROFILE_ANSWERED: "http://adlnet.gov/expapi/verbs/answered",
        DODISDPROFILE_ANSWERED: "https://w3id.org/xapi/dod-isd/verbs/answered",
        ASKED: "https://w3id.org/xapi/dod-isd/verbs/asked",
        ADLVOCABULARYPROFILE_ASKED: "http://adlnet.gov/expapi/verbs/asked",
        DODISDPROFILE_ASKED: "https://w3id.org/xapi/dod-isd/verbs/asked",
        ATTEMPTED: "http://adlnet.gov/expapi/verbs/attempted",
        ADLVOCABULARYPROFILE_ATTEMPTED: "http://adlnet.gov/expapi/verbs/attempted",
        COMMENTED: "https://w3id.org/xapi/adb/verbs/commented",
        ADLVOCABULARYPROFILE_COMMENTED: "http://adlnet.gov/expapi/verbs/commented",
        FEEDBACKINTERACTIONPROFILE_COMMENTED: "https://w3id.org/xapi/adb/verbs/commented",
        EXITED: "http://adlnet.gov/expapi/verbs/exited",
        ADLVOCABULARYPROFILE_EXITED: "http://adlnet.gov/expapi/verbs/exited",
        IMPORTED: "http://adlnet.gov/expapi/verbs/imported",
        ADLVOCABULARYPROFILE_IMPORTED: "http://adlnet.gov/expapi/verbs/imported",
        LAUNCHED: "https://w3id.org/xapi/dod-isd/verbs/launched",
        ADLVOCABULARYPROFILE_LAUNCHED: "http://adlnet.gov/expapi/verbs/launched",
        DODISDPROFILE_LAUNCHED: "https://w3id.org/xapi/dod-isd/verbs/launched",
        MASTERED: "https://w3id.org/xapi/tla/verbs/mastered",
        ADLVOCABULARYPROFILE_MASTERED: "http://adlnet.gov/expapi/verbs/mastered",
        TLAPROFILE_MASTERED: "https://w3id.org/xapi/tla/verbs/mastered",
        PREFERRED: "http://adlnet.gov/expapi/verbs/preferred",
        ADLVOCABULARYPROFILE_PREFERRED: "http://adlnet.gov/expapi/verbs/preferred",
        PROGRESSED: "http://adlnet.gov/expapi/verbs/progressed",
        ADLVOCABULARYPROFILE_PROGRESSED: "http://adlnet.gov/expapi/verbs/progressed",
        REGISTERED: "https://w3id.org/xapi/tla/verbs/registered",
        ADLVOCABULARYPROFILE_REGISTERED: "http://adlnet.gov/expapi/verbs/registered",
        TLAPROFILE_REGISTERED: "https://w3id.org/xapi/tla/verbs/registered",
        VOIDED: "http://adlnet.gov/expapi/verbs/voided",
        ADLVOCABULARYPROFILE_VOIDED: "http://adlnet.gov/expapi/verbs/voided",
        LOGGED_IN: "https://w3id.org/xapi/adl/verbs/logged-in",
        ADLVOCABULARYPROFILE_LOGGED_IN: "https://w3id.org/xapi/adl/verbs/logged-in",
        LOGGED_OUT: "https://w3id.org/xapi/adl/verbs/logged-out",
        ADLVOCABULARYPROFILE_LOGGED_OUT: "https://w3id.org/xapi/adl/verbs/logged-out",
        SCORED: "http://adlnet.gov/expapi/verbs/scored",
        BOLLPROFILE_SCORED: "https://ed3chain.com/xapi/boll#scored",
        TLAPROFILE_SCORED: "https://w3id.org/xapi/tla/verbs/scored",
        SCORMPROFILE_SCORED: "http://adlnet.gov/expapi/verbs/scored",
        SCHOOLED: "https://w3id.org/xapi/tla/verbs/schooled",
        BOLLPROFILE_SCHOOLED: "https://ed3chain.com/xapi/boll/verb#schooled",
        TLAPROFILE_SCHOOLED: "https://w3id.org/xapi/tla/verbs/schooled",
        PASSED: "http://adlnet.gov/expapi/verbs/passed",
        BOLLPROFILE_PASSED: "https://ed3chain.com/xapi/boll/verbs#passed",
        SCORMPROFILE_PASSED: "http://adlnet.gov/expapi/verbs/passed",
        APPLIED: "https://w3id.org/xapi/dod-isd/verbs/applied",
        BOLLPROFILE_APPLIED: "https://ed3chain.com/xapi/boll/verbs#applied",
        DODISDPROFILE_APPLIED: "https://w3id.org/xapi/dod-isd/verbs/applied",
        FAILED: "http://adlnet.gov/expapi/verbs/failed",
        BOLLPROFILE_FAILED: "https://ed3chain.com/xapi/boll/verbs#failed",
        SCORMPROFILE_FAILED: "http://adlnet.gov/expapi/verbs/failed",
        DECLINED: "https://ed3chain.com/xapi/boll/verbs#declined",
        BOLLPROFILE_DECLINED: "https://ed3chain.com/xapi/boll/verbs#declined",
        ABANDONED: "https://w3id.org/xapi/adl/verbs/abandoned",
        CMI5PROFILE_ABANDONED: "https://w3id.org/xapi/adl/verbs/abandoned",
        WAIVED: "https://w3id.org/xapi/adl/verbs/waived",
        CMI5PROFILE_WAIVED: "https://w3id.org/xapi/adl/verbs/waived",
        WITHDREW: "https://xapi.org.au/contentprofile/verb/withdrew",
        CONTENTREPOSITORYPROFILE_WITHDREW: "https://xapi.org.au/contentprofile/verb/withdrew",
        COMMENCED: "https://xapi.org.au/contentprofile/verb/commenced",
        CONTENTREPOSITORYPROFILE_COMMENCED: "https://xapi.org.au/contentprofile/verb/commenced",
        CHAPTER_INTRODUCTION_FINISHED: "https://profiles.adlnet.gov/xapi/71d1605b-b078-4494-b7b8-7f3a2b442f36/verb/chapter_introduction",
        DATASECURITYMODULEPROFILE_CHAPTER_INTRODUCTION_FINISHED: "https://profiles.adlnet.gov/xapi/71d1605b-b078-4494-b7b8-7f3a2b442f36/verb/chapter_introduction",
        ADVISED: "https://w3id.org/xapi/dod-isd/verbs/advised",
        DODISDPROFILE_ADVISED: "https://w3id.org/xapi/dod-isd/verbs/advised",
        BRIEFED: "https://w3id.org/xapi/dod-isd/verbs/briefed",
        DODISDPROFILE_BRIEFED: "https://w3id.org/xapi/dod-isd/verbs/briefed",
        CALCULATED: "https://w3id.org/xapi/dod-isd/verbs/calculated",
        DODISDPROFILE_CALCULATED: "https://w3id.org/xapi/dod-isd/verbs/calculated",
        DEFINED: "http://id.tincanapi.com/verb/defined",
        DODISDPROFILE_DEFINED: "https://w3id.org/xapi/dod-isd/verbs/defined",
        TINCANVOCABULARYPROFILE_DEFINED: "http://id.tincanapi.com/verb/defined",
        ELABORATED: "https://w3id.org/xapi/dod-isd/verbs/elaborated",
        DODISDPROFILE_ELABORATED: "https://w3id.org/xapi/dod-isd/verbs/elaborated",
        EXPRESSED: "https://w3id.org/xapi/dod-isd/verbs/expressed",
        DODISDPROFILE_EXPRESSED: "https://w3id.org/xapi/dod-isd/verbs/expressed",
        IDENTIFIED: "https://w3id.org/xapi/dod-isd/verbs/identified",
        DODISDPROFILE_IDENTIFIED: "https://w3id.org/xapi/dod-isd/verbs/identified",
        INFORMED: "https://w3id.org/xapi/dod-isd/verbs/informed",
        DODISDPROFILE_INFORMED: "https://w3id.org/xapi/dod-isd/verbs/informed",
        INSTRUCTED: "https://w3id.org/xapi/dod-isd/verbs/instructed",
        DODISDPROFILE_INSTRUCTED: "https://w3id.org/xapi/dod-isd/verbs/instructed",
        LISTED: "https://w3id.org/xapi/dod-isd/verbs/listed",
        DODISDPROFILE_LISTED: "https://w3id.org/xapi/dod-isd/verbs/listed",
        NAMED: "https://w3id.org/xapi/dod-isd/verbs/named",
        DODISDPROFILE_NAMED: "https://w3id.org/xapi/dod-isd/verbs/named",
        RECALLED: "https://w3id.org/xapi/dod-isd/verbs/recalled",
        DODISDPROFILE_RECALLED: "https://w3id.org/xapi/dod-isd/verbs/recalled",
        RECOMMENDED: "https://w3id.org/xapi/tla/verbs/recommended",
        DODISDPROFILE_RECOMMENDED: "https://w3id.org/xapi/dod-isd/verbs/recommended",
        TLAPROFILE_RECOMMENDED: "https://w3id.org/xapi/tla/verbs/recommended",
        RECOUNTED: "https://w3id.org/xapi/dod-isd/verbs/recounted",
        DODISDPROFILE_RECOUNTED: "https://w3id.org/xapi/dod-isd/verbs/recounted",
        SPECIFIED: "https://w3id.org/xapi/dod-isd/verbs/specified",
        DODISDPROFILE_SPECIFIED: "https://w3id.org/xapi/dod-isd/verbs/specified",
        STATED: "https://w3id.org/xapi/dod-isd/verbs/stated",
        DODISDPROFILE_STATED: "https://w3id.org/xapi/dod-isd/verbs/stated",
        TOLD: "https://w3id.org/xapi/dod-isd/verbs/told",
        DODISDPROFILE_TOLD: "https://w3id.org/xapi/dod-isd/verbs/told",
        APPRAISED: "https://w3id.org/xapi/tla/verbs/appraised",
        DODISDPROFILE_APPRAISED: "https://w3id.org/xapi/dod-isd/verbs/appraised",
        TLAPROFILE_APPRAISED: "https://w3id.org/xapi/tla/verbs/appraised",
        COMPILED: "https://w3id.org/xapi/dod-isd/verbs/compiled",
        DODISDPROFILE_COMPILED: "https://w3id.org/xapi/dod-isd/verbs/compiled",
        COMPOSED: "https://w3id.org/xapi/dod-isd/verbs/composed",
        DODISDPROFILE_COMPOSED: "https://w3id.org/xapi/dod-isd/verbs/composed",
        COMPUTED: "https://w3id.org/xapi/dod-isd/verbs/computed",
        DODISDPROFILE_COMPUTED: "https://w3id.org/xapi/dod-isd/verbs/computed",
        ENCRYPTED: "https://w3id.org/xapi/dod-isd/verbs/encrypted",
        DODISDPROFILE_ENCRYPTED: "https://w3id.org/xapi/dod-isd/verbs/encrypted",
        ESTIMATED: "https://w3id.org/xapi/dod-isd/verbs/estimated",
        DODISDPROFILE_ESTIMATED: "https://w3id.org/xapi/dod-isd/verbs/estimated",
        FORMATTED: "https://w3id.org/xapi/dod-isd/verbs/formatted",
        DODISDPROFILE_FORMATTED: "https://w3id.org/xapi/dod-isd/verbs/formatted",
        FORWARDED: "https://w3id.org/xapi/dod-isd/verbs/forwarded",
        DODISDPROFILE_FORWARDED: "https://w3id.org/xapi/dod-isd/verbs/forwarded",
        MEASURED: "https://w3id.org/xapi/dod-isd/verbs/measured",
        DODISDPROFILE_MEASURED: "https://w3id.org/xapi/dod-isd/verbs/measured",
        OUTLINED: "https://w3id.org/xapi/dod-isd/verbs/outlined",
        DODISDPROFILE_OUTLINED: "https://w3id.org/xapi/dod-isd/verbs/outlined",
        ROUTED: "https://w3id.org/xapi/dod-isd/verbs/routed",
        DODISDPROFILE_ROUTED: "https://w3id.org/xapi/dod-isd/verbs/routed",
        CHECKED: "https://w3id.org/xapi/dod-isd/verbs/checked",
        DODISDPROFILE_CHECKED: "https://w3id.org/xapi/dod-isd/verbs/checked",
        CONDENSED: "https://w3id.org/xapi/dod-isd/verbs/condensed",
        DODISDPROFILE_CONDENSED: "https://w3id.org/xapi/dod-isd/verbs/condensed",
        IMPLEMENTED: "https://w3id.org/xapi/dod-isd/verbs/implemented",
        DODISDPROFILE_IMPLEMENTED: "https://w3id.org/xapi/dod-isd/verbs/implemented",
        PAUSED: "https://w3id.org/xapi/video/verbs/paused",
        DODISDPROFILE_PAUSED: "https://w3id.org/xapi/dod-isd/verbs/paused",
        TINCANVOCABULARYPROFILE_PAUSED: "http://id.tincanapi.com/verb/paused",
        VIDEOPROFILE_PAUSED: "https://w3id.org/xapi/video/verbs/paused",
        RESUMED: "http://adlnet.gov/expapi/verbs/resumed",
        DODISDPROFILE_RESUMED: "https://w3id.org/xapi/dod-isd/verbs/resumed",
        TLAPROFILE_RESUMED: "https://w3id.org/xapi/tla/verbs/resumed",
        SCORMPROFILE_RESUMED: "http://adlnet.gov/expapi/verbs/resumed",
        SET_UP: "https://w3id.org/xapi/dod-isd/verbs/set-up",
        DODISDPROFILE_SET_UP: "https://w3id.org/xapi/dod-isd/verbs/set-up",
        STOPPED: "https://w3id.org/xapi/dod-isd/verbs/stopped",
        DODISDPROFILE_STOPPED: "https://w3id.org/xapi/dod-isd/verbs/stopped",
        ALLOCATED: "https://w3id.org/xapi/dod-isd/verbs/allocated",
        DODISDPROFILE_ALLOCATED: "https://w3id.org/xapi/dod-isd/verbs/allocated",
        ARRANGED: "http://id.tincanapi.com/verb/arranged",
        DODISDPROFILE_ARRANGED: "https://w3id.org/xapi/dod-isd/verbs/arranged",
        TINCANVOCABULARYPROFILE_ARRANGED: "http://id.tincanapi.com/verb/arranged",
        CATEGORIZED: "https://w3id.org/xapi/dod-isd/verbs/categorized",
        DODISDPROFILE_CATEGORIZED: "https://w3id.org/xapi/dod-isd/verbs/categorized",
        CLASSIFIED: "https://w3id.org/xapi/dod-isd/verbs/classified",
        DODISDPROFILE_CLASSIFIED: "https://w3id.org/xapi/dod-isd/verbs/classified",
        COLLATED: "https://w3id.org/xapi/dod-isd/verbs/collated",
        DODISDPROFILE_COLLATED: "https://w3id.org/xapi/dod-isd/verbs/collated",
        COMPARED: "https://w3id.org/xapi/dod-isd/verbs/compared",
        DODISDPROFILE_COMPARED: "https://w3id.org/xapi/dod-isd/verbs/compared",
        CONSOLIDATED: "https://w3id.org/xapi/dod-isd/verbs/consolidated",
        DODISDPROFILE_CONSOLIDATED: "https://w3id.org/xapi/dod-isd/verbs/consolidated",
        CONTRASTED: "https://w3id.org/xapi/dod-isd/verbs/contrasted",
        DODISDPROFILE_CONTRASTED: "https://w3id.org/xapi/dod-isd/verbs/contrasted",
        CORRELATED: "https://w3id.org/xapi/dod-isd/verbs/correlated",
        DODISDPROFILE_CORRELATED: "https://w3id.org/xapi/dod-isd/verbs/correlated",
        CROSS_CHECKED: "https://w3id.org/xapi/dod-isd/verbs/cross-checked",
        DODISDPROFILE_CROSS_CHECKED: "https://w3id.org/xapi/dod-isd/verbs/cross-checked",
        DESIGNATED: "https://w3id.org/xapi/dod-isd/verbs/designated",
        DODISDPROFILE_DESIGNATED: "https://w3id.org/xapi/dod-isd/verbs/designated",
        DIFFERENTIATED: "https://w3id.org/xapi/dod-isd/verbs/differentiated",
        DODISDPROFILE_DIFFERENTIATED: "https://w3id.org/xapi/dod-isd/verbs/differentiated",
        DISCRIMINATED: "https://w3id.org/xapi/dod-isd/verbs/discriminated",
        DODISDPROFILE_DISCRIMINATED: "https://w3id.org/xapi/dod-isd/verbs/discriminated",
        DISTINGUISHED: "https://w3id.org/xapi/dod-isd/verbs/distinguished",
        DODISDPROFILE_DISTINGUISHED: "https://w3id.org/xapi/dod-isd/verbs/distinguished",
        DISTRIBUTED: "https://w3id.org/xapi/dod-isd/verbs/distributed",
        DODISDPROFILE_DISTRIBUTED: "https://w3id.org/xapi/dod-isd/verbs/distributed",
        DIVIDED: "https://w3id.org/xapi/dod-isd/verbs/divided",
        DODISDPROFILE_DIVIDED: "https://w3id.org/xapi/dod-isd/verbs/divided",
        ELIMINATED: "https://w3id.org/xapi/dod-isd/verbs/eliminated",
        DODISDPROFILE_ELIMINATED: "https://w3id.org/xapi/dod-isd/verbs/eliminated",
        EXTRACTED: "https://w3id.org/xapi/dod-isd/verbs/extracted",
        DODISDPROFILE_EXTRACTED: "https://w3id.org/xapi/dod-isd/verbs/extracted",
        FINALIZED: "https://w3id.org/xapi/dod-isd/verbs/finalized",
        DODISDPROFILE_FINALIZED: "https://w3id.org/xapi/dod-isd/verbs/finalized",
        GROUPED: "https://w3id.org/xapi/dod-isd/verbs/grouped",
        DODISDPROFILE_GROUPED: "https://w3id.org/xapi/dod-isd/verbs/grouped",
        LABELED: "https://w3id.org/xapi/dod-isd/verbs/labeled",
        DODISDPROFILE_LABELED: "https://w3id.org/xapi/dod-isd/verbs/labeled",
        LEVELED: "https://w3id.org/xapi/dod-isd/verbs/leveled",
        DODISDPROFILE_LEVELED: "https://w3id.org/xapi/dod-isd/verbs/leveled",
        MATCHED: "https://w3id.org/xapi/dod-isd/verbs/matched",
        DODISDPROFILE_MATCHED: "https://w3id.org/xapi/dod-isd/verbs/matched",
        ORGANIZED: "https://w3id.org/xapi/tla/verbs/organized",
        DODISDPROFILE_ORGANIZED: "https://w3id.org/xapi/dod-isd/verbs/organized",
        TLAPROFILE_ORGANIZED: "https://w3id.org/xapi/tla/verbs/organized",
        RANKED: "https://w3id.org/xapi/dod-isd/verbs/ranked",
        DODISDPROFILE_RANKED: "https://w3id.org/xapi/dod-isd/verbs/ranked",
        REALIGNED: "https://w3id.org/xapi/dod-isd/verbs/realigned",
        DODISDPROFILE_REALIGNED: "https://w3id.org/xapi/dod-isd/verbs/realigned",
        REDISTRIBUTED: "https://w3id.org/xapi/dod-isd/verbs/redistributed",
        DODISDPROFILE_REDISTRIBUTED: "https://w3id.org/xapi/dod-isd/verbs/redistributed",
        REEXAMINED: "https://w3id.org/xapi/dod-isd/verbs/reexamined",
        DODISDPROFILE_REEXAMINED: "https://w3id.org/xapi/dod-isd/verbs/reexamined",
        REORGANIZED: "https://w3id.org/xapi/dod-isd/verbs/reorganized",
        DODISDPROFILE_REORGANIZED: "https://w3id.org/xapi/dod-isd/verbs/reorganized",
        RESTATED: "https://w3id.org/xapi/dod-isd/verbs/restated",
        DODISDPROFILE_RESTATED: "https://w3id.org/xapi/dod-isd/verbs/restated",
        SEPARATED: "https://w3id.org/xapi/dod-isd/verbs/separated",
        DODISDPROFILE_SEPARATED: "https://w3id.org/xapi/dod-isd/verbs/separated",
        SORTED: "https://w3id.org/xapi/dod-isd/verbs/sorted",
        DODISDPROFILE_SORTED: "https://w3id.org/xapi/dod-isd/verbs/sorted",
        TASKED: "https://w3id.org/xapi/dod-isd/verbs/tasked",
        DODISDPROFILE_TASKED: "https://w3id.org/xapi/dod-isd/verbs/tasked",
        TEMPLATED: "https://w3id.org/xapi/dod-isd/verbs/templated",
        DODISDPROFILE_TEMPLATED: "https://w3id.org/xapi/dod-isd/verbs/templated",
        TRANSLATED: "https://w3id.org/xapi/dod-isd/verbs/translated",
        DODISDPROFILE_TRANSLATED: "https://w3id.org/xapi/dod-isd/verbs/translated",
        TUNED: "https://w3id.org/xapi/dod-isd/verbs/tuned",
        DODISDPROFILE_TUNED: "https://w3id.org/xapi/dod-isd/verbs/tuned",
        ANALYZED: "https://w3id.org/xapi/dod-isd/verbs/analyzed",
        DODISDPROFILE_ANALYZED: "https://w3id.org/xapi/dod-isd/verbs/analyzed",
        CHANGED: "https://w3id.org/xapi/dod-isd/verbs/changed",
        DODISDPROFILE_CHANGED: "https://w3id.org/xapi/dod-isd/verbs/changed",
        COMBINED: "https://w3id.org/xapi/dod-isd/verbs/combined",
        DODISDPROFILE_COMBINED: "https://w3id.org/xapi/dod-isd/verbs/combined",
        CONCLUDED: "https://w3id.org/xapi/dod-isd/verbs/concluded",
        DODISDPROFILE_CONCLUDED: "https://w3id.org/xapi/dod-isd/verbs/concluded",
        CONVERTED: "https://w3id.org/xapi/dod-isd/verbs/converted",
        DODISDPROFILE_CONVERTED: "https://w3id.org/xapi/dod-isd/verbs/converted",
        CRITICIZED: "https://w3id.org/xapi/dod-isd/verbs/criticized",
        DODISDPROFILE_CRITICIZED: "https://w3id.org/xapi/dod-isd/verbs/criticized",
        DECIDED: "https://w3id.org/xapi/dod-isd/verbs/decided",
        DODISDPROFILE_DECIDED: "https://w3id.org/xapi/dod-isd/verbs/decided",
        DEFENDED: "https://w3id.org/xapi/dod-isd/verbs/defended",
        DODISDPROFILE_DEFENDED: "https://w3id.org/xapi/dod-isd/verbs/defended",
        DERIVED: "https://w3id.org/xapi/dod-isd/verbs/derived",
        DODISDPROFILE_DERIVED: "https://w3id.org/xapi/dod-isd/verbs/derived",
        DETERMINED: "https://w3id.org/xapi/dod-isd/verbs/determined",
        DODISDPROFILE_DETERMINED: "https://w3id.org/xapi/dod-isd/verbs/determined",
        DIAGRAMMED: "https://w3id.org/xapi/dod-isd/verbs/diagrammed",
        DODISDPROFILE_DIAGRAMMED: "https://w3id.org/xapi/dod-isd/verbs/diagrammed",
        DISCOVERED: "https://w3id.org/xapi/dod-isd/verbs/discovered",
        DODISDPROFILE_DISCOVERED: "https://w3id.org/xapi/dod-isd/verbs/discovered",
        DRAFTED: "https://w3id.org/xapi/dod-isd/verbs/drafted",
        DODISDPROFILE_DRAFTED: "https://w3id.org/xapi/dod-isd/verbs/drafted",
        EFFECTED: "https://w3id.org/xapi/dod-isd/verbs/effected",
        DODISDPROFILE_EFFECTED: "https://w3id.org/xapi/dod-isd/verbs/effected",
        EXPLAINED: "https://w3id.org/xapi/dod-isd/verbs/explained",
        DODISDPROFILE_EXPLAINED: "https://w3id.org/xapi/dod-isd/verbs/explained",
        EXTENDED: "https://w3id.org/xapi/dod-isd/verbs/extended",
        DODISDPROFILE_EXTENDED: "https://w3id.org/xapi/dod-isd/verbs/extended",
        GENERALIZED: "https://w3id.org/xapi/dod-isd/verbs/generalized",
        DODISDPROFILE_GENERALIZED: "https://w3id.org/xapi/dod-isd/verbs/generalized",
        GENERATED: "https://w3id.org/xapi/dod-isd/verbs/generated",
        DODISDPROFILE_GENERATED: "https://w3id.org/xapi/dod-isd/verbs/generated",
        HYPOTHESIZED: "https://w3id.org/xapi/dod-isd/verbs/hypothesized",
        DODISDPROFILE_HYPOTHESIZED: "https://w3id.org/xapi/dod-isd/verbs/hypothesized",
        ILLUSTRATED: "https://w3id.org/xapi/dod-isd/verbs/illustrated",
        DODISDPROFILE_ILLUSTRATED: "https://w3id.org/xapi/dod-isd/verbs/illustrated",
        INFERRED: "https://w3id.org/xapi/tla/verbs/inferred",
        DODISDPROFILE_INFERRED: "https://w3id.org/xapi/dod-isd/verbs/inferred",
        TLAPROFILE_INFERRED: "https://w3id.org/xapi/tla/verbs/inferred",
        INVESTIGATED: "https://w3id.org/xapi/dod-isd/verbs/investigated",
        DODISDPROFILE_INVESTIGATED: "https://w3id.org/xapi/dod-isd/verbs/investigated",
        LOCATED: "https://w3id.org/xapi/tla/verbs/located",
        DODISDPROFILE_LOCATED: "https://w3id.org/xapi/dod-isd/verbs/located",
        TLAPROFILE_LOCATED: "https://w3id.org/xapi/tla/verbs/located",
        MANIPULATED: "https://w3id.org/xapi/dod-isd/verbs/manipulated",
        DODISDPROFILE_MANIPULATED: "https://w3id.org/xapi/dod-isd/verbs/manipulated",
        MODIFIED: "https://w3id.org/xapi/dod-isd/verbs/modified",
        DODISDPROFILE_MODIFIED: "https://w3id.org/xapi/dod-isd/verbs/modified",
        PLANNED: "https://w3id.org/xapi/tla/verbs/planned",
        DODISDPROFILE_PLANNED: "https://w3id.org/xapi/dod-isd/verbs/planned",
        TLAPROFILE_PLANNED: "https://w3id.org/xapi/tla/verbs/planned",
        PREDICTED: "https://w3id.org/xapi/dod-isd/verbs/predicted",
        DODISDPROFILE_PREDICTED: "https://w3id.org/xapi/dod-isd/verbs/predicted",
        PRODUCED: "https://w3id.org/xapi/dod-isd/verbs/produced",
        DODISDPROFILE_PRODUCED: "https://w3id.org/xapi/dod-isd/verbs/produced",
        PROJECTED: "https://w3id.org/xapi/tla/verbs/projected",
        DODISDPROFILE_PROJECTED: "https://w3id.org/xapi/dod-isd/verbs/projected",
        TLAPROFILE_PROJECTED: "https://w3id.org/xapi/tla/verbs/projected",
        REVISED: "https://w3id.org/xapi/dod-isd/verbs/revised",
        DODISDPROFILE_REVISED: "https://w3id.org/xapi/dod-isd/verbs/revised",
        SOLVED: "https://w3id.org/xapi/HROSAsessment/v1.0/verbs/solved",
        DODISDPROFILE_SOLVED: "https://w3id.org/xapi/dod-isd/verbs/solved",
        HROPENASSESSMENTSPROFILE_SOLVED: "https://w3id.org/xapi/HROSAsessment/v1.0/verbs/solved",
        SUMMARIZED: "https://w3id.org/xapi/dod-isd/verbs/summarized",
        DODISDPROFILE_SUMMARIZED: "https://w3id.org/xapi/dod-isd/verbs/summarized",
        SYNTHESIZED: "https://w3id.org/xapi/dod-isd/verbs/synthesized",
        DODISDPROFILE_SYNTHESIZED: "https://w3id.org/xapi/dod-isd/verbs/synthesized",
        TRIAGED: "https://w3id.org/xapi/dod-isd/verbs/triaged",
        DODISDPROFILE_TRIAGED: "https://w3id.org/xapi/dod-isd/verbs/triaged",
        WAR_GAMED: "https://w3id.org/xapi/dod-isd/verbs/war-gamed",
        DODISDPROFILE_WAR_GAMED: "https://w3id.org/xapi/dod-isd/verbs/war-gamed",
        DETECTED: "https://w3id.org/xapi/dod-isd/verbs/detected",
        DODISDPROFILE_DETECTED: "https://w3id.org/xapi/dod-isd/verbs/detected",
        FELT: "https://w3id.org/xapi/dod-isd/verbs/felt",
        DODISDPROFILE_FELT: "https://w3id.org/xapi/dod-isd/verbs/felt",
        HEARD: "https://w3id.org/xapi/dod-isd/verbs/heard",
        DODISDPROFILE_HEARD: "https://w3id.org/xapi/dod-isd/verbs/heard",
        SCANNED: "https://w3id.org/xapi/dod-isd/verbs/scanned",
        DODISDPROFILE_SCANNED: "https://w3id.org/xapi/dod-isd/verbs/scanned",
        SAW: "https://w3id.org/xapi/dod-isd/verbs/saw",
        DODISDPROFILE_SAW: "https://w3id.org/xapi/dod-isd/verbs/saw",
        SMELLED: "https://w3id.org/xapi/dod-isd/verbs/smelled",
        DODISDPROFILE_SMELLED: "https://w3id.org/xapi/dod-isd/verbs/smelled",
        TASTED: "https://w3id.org/xapi/dod-isd/verbs/tasted",
        DODISDPROFILE_TASTED: "https://w3id.org/xapi/dod-isd/verbs/tasted",
        VISUALIZED: "https://w3id.org/xapi/dod-isd/verbs/visualized",
        DODISDPROFILE_VISUALIZED: "https://w3id.org/xapi/dod-isd/verbs/visualized",
        ASSAULTED: "https://w3id.org/xapi/dod-isd/verbs/assaulted",
        DODISDPROFILE_ASSAULTED: "https://w3id.org/xapi/dod-isd/verbs/assaulted",
        CARRIED: "https://w3id.org/xapi/dod-isd/verbs/carried",
        DODISDPROFILE_CARRIED: "https://w3id.org/xapi/dod-isd/verbs/carried",
        CREPT: "https://w3id.org/xapi/dod-isd/verbs/crept",
        DODISDPROFILE_CREPT: "https://w3id.org/xapi/dod-isd/verbs/crept",
        DEPARTED: "https://w3id.org/xapi/dod-isd/verbs/departed",
        DODISDPROFILE_DEPARTED: "https://w3id.org/xapi/dod-isd/verbs/departed",
        FELL: "https://w3id.org/xapi/dod-isd/verbs/fell",
        DODISDPROFILE_FELL: "https://w3id.org/xapi/dod-isd/verbs/fell",
        HELD: "https://w3id.org/xapi/dod-isd/verbs/held",
        DODISDPROFILE_HELD: "https://w3id.org/xapi/dod-isd/verbs/held",
        LIFTED: "https://w3id.org/xapi/dod-isd/verbs/jumped",
        DODISDPROFILE_LIFTED: "https://w3id.org/xapi/dod-isd/verbs/jumped",
        PULLED: "https://w3id.org/xapi/dod-isd/verbs/pulled",
        DODISDPROFILE_PULLED: "https://w3id.org/xapi/dod-isd/verbs/pulled",
        RAN: "https://w3id.org/xapi/dod-isd/verbs/ran",
        DODISDPROFILE_RAN: "https://w3id.org/xapi/dod-isd/verbs/ran",
        STAYED: "https://w3id.org/xapi/dod-isd/verbs/stayed",
        DODISDPROFILE_STAYED: "https://w3id.org/xapi/dod-isd/verbs/stayed",
        SWAM: "https://w3id.org/xapi/dod-isd/verbs/swam",
        DODISDPROFILE_SWAM: "https://w3id.org/xapi/dod-isd/verbs/swam",
        THREW: "https://w3id.org/xapi/dod-isd/verbs/threw",
        DODISDPROFILE_THREW: "https://w3id.org/xapi/dod-isd/verbs/threw",
        TURNED: "https://w3id.org/xapi/dod-isd/verbs/turned",
        DODISDPROFILE_TURNED: "https://w3id.org/xapi/dod-isd/verbs/turned",
        TWISTED: "https://w3id.org/xapi/dod-isd/verbs/twisted",
        DODISDPROFILE_TWISTED: "https://w3id.org/xapi/dod-isd/verbs/twisted",
        WORE: "https://w3id.org/xapi/dod-isd/verbs/wore",
        DODISDPROFILE_WORE: "https://w3id.org/xapi/dod-isd/verbs/wore",
        ADVANCED: "https://w3id.org/xapi/dod-isd/verbs/advanced",
        DODISDPROFILE_ADVANCED: "https://w3id.org/xapi/dod-isd/verbs/advanced",
        CONTROLLED: "https://w3id.org/xapi/dod-isd/verbs/controlled",
        DODISDPROFILE_CONTROLLED: "https://w3id.org/xapi/dod-isd/verbs/controlled",
        GUIDED: "https://w3id.org/xapi/dod-isd/verbs/guided",
        DODISDPROFILE_GUIDED: "https://w3id.org/xapi/dod-isd/verbs/guided",
        HOVERED: "https://w3id.org/xapi/dod-isd/verbs/hovered",
        DODISDPROFILE_HOVERED: "https://w3id.org/xapi/dod-isd/verbs/hovered",
        LANDED: "https://w3id.org/xapi/dod-isd/verbs/landed",
        DODISDPROFILE_LANDED: "https://w3id.org/xapi/dod-isd/verbs/landed",
        MANEUVERED: "https://w3id.org/xapi/dod-isd/verbs/maneuvered",
        DODISDPROFILE_MANEUVERED: "https://w3id.org/xapi/dod-isd/verbs/maneuvered",
        REGULATED: "https://w3id.org/xapi/dod-isd/verbs/regulated",
        DODISDPROFILE_REGULATED: "https://w3id.org/xapi/dod-isd/verbs/regulated",
        STEERED: "https://w3id.org/xapi/dod-isd/verbs/steered",
        DODISDPROFILE_STEERED: "https://w3id.org/xapi/dod-isd/verbs/steered",
        TOOK_OFF: "https://w3id.org/xapi/dod-isd/verbs/took-off",
        DODISDPROFILE_TOOK_OFF: "https://w3id.org/xapi/dod-isd/verbs/took-off",
        TRACKED: "https://w3id.org/xapi/tla/verbs/tracked",
        DODISDPROFILE_TRACKED: "https://w3id.org/xapi/dod-isd/verbs/tracked",
        TLAPROFILE_TRACKED: "https://w3id.org/xapi/tla/verbs/tracked",
        TRAVERSED: "https://w3id.org/xapi/dod-isd/verbs/traversed",
        DODISDPROFILE_TRAVERSED: "https://w3id.org/xapi/dod-isd/verbs/traversed",
        ABLED: "https://w3id.org/xapi/dod-isd/verbs/abled",
        DODISDPROFILE_ABLED: "https://w3id.org/xapi/dod-isd/verbs/abled",
        ASSISTED: "https://w3id.org/xapi/dod-isd/verbs/assisted",
        DODISDPROFILE_ASSISTED: "https://w3id.org/xapi/dod-isd/verbs/assisted",
        CHALLENGED: "https://w3id.org/xapi/dod-isd/verbs/challenged",
        DODISDPROFILE_CHALLENGED: "https://w3id.org/xapi/dod-isd/verbs/challenged",
        CROSSED: "https://w3id.org/xapi/dod-isd/verbs/crossed",
        DODISDPROFILE_CROSSED: "https://w3id.org/xapi/dod-isd/verbs/crossed",
        DELAYED: "https://w3id.org/xapi/dod-isd/verbs/delayed",
        DODISDPROFILE_DELAYED: "https://w3id.org/xapi/dod-isd/verbs/delayed",
        GUARDED: "https://w3id.org/xapi/dod-isd/verbs/guarded",
        DODISDPROFILE_GUARDED: "https://w3id.org/xapi/dod-isd/verbs/guarded",
        PREPARED: "https://w3id.org/xapi/dod-isd/verbs/prepared",
        DODISDPROFILE_PREPARED: "https://w3id.org/xapi/dod-isd/verbs/prepared",
        PRIMED: "https://w3id.org/xapi/dod-isd/verbs/primed",
        DODISDPROFILE_PRIMED: "https://w3id.org/xapi/dod-isd/verbs/primed",
        READIED: "https://w3id.org/xapi/dod-isd/verbs/readied",
        DODISDPROFILE_READIED: "https://w3id.org/xapi/dod-isd/verbs/readied",
        SET: "https://w3id.org/xapi/dod-isd/verbs/set",
        DODISDPROFILE_SET: "https://w3id.org/xapi/dod-isd/verbs/set",
        STOOD_TO: "https://w3id.org/xapi/dod-isd/verbs/stood-to",
        DODISDPROFILE_STOOD_TO: "https://w3id.org/xapi/dod-isd/verbs/stood-to",
        ACTIVATED: "https://w3id.org/xapi/dod-isd/verbs/activated",
        DODISDPROFILE_ACTIVATED: "https://w3id.org/xapi/dod-isd/verbs/activated",
        ACTUATED: "https://w3id.org/xapi/dod-isd/verbs/actuated",
        DODISDPROFILE_ACTUATED: "https://w3id.org/xapi/dod-isd/verbs/actuated",
        ADJUSTED: "https://w3id.org/xapi/dod-isd/verbs/adjusted",
        DODISDPROFILE_ADJUSTED: "https://w3id.org/xapi/dod-isd/verbs/adjusted",
        ADMINISTERED: "https://w3id.org/xapi/dod-isd/verbs/administered",
        DODISDPROFILE_ADMINISTERED: "https://w3id.org/xapi/dod-isd/verbs/administered",
        ALIGNED: "https://w3id.org/xapi/dod-isd/verbs/aligned",
        DODISDPROFILE_ALIGNED: "https://w3id.org/xapi/dod-isd/verbs/aligned",
        ARMED: "https://w3id.org/xapi/dod-isd/verbs/armed",
        DODISDPROFILE_ARMED: "https://w3id.org/xapi/dod-isd/verbs/armed",
        ASSEMBLED: "https://w3id.org/xapi/dod-isd/verbs/assembled",
        DODISDPROFILE_ASSEMBLED: "https://w3id.org/xapi/dod-isd/verbs/assembled",
        BALANCED: "https://w3id.org/xapi/dod-isd/verbs/balanced",
        DODISDPROFILE_BALANCED: "https://w3id.org/xapi/dod-isd/verbs/balanced",
        BREACHED: "https://w3id.org/xapi/dod-isd/verbs/breached",
        DODISDPROFILE_BREACHED: "https://w3id.org/xapi/dod-isd/verbs/breached",
        CALIBRATED: "https://w3id.org/xapi/dod-isd/verbs/calibrated",
        DODISDPROFILE_CALIBRATED: "https://w3id.org/xapi/dod-isd/verbs/calibrated",
        CAMOUFLAGED: "https://w3id.org/xapi/dod-isd/verbs/camouflaged",
        DODISDPROFILE_CAMOUFLAGED: "https://w3id.org/xapi/dod-isd/verbs/camouflaged",
        CENTERED: "https://w3id.org/xapi/dod-isd/verbs/centered",
        DODISDPROFILE_CENTERED: "https://w3id.org/xapi/dod-isd/verbs/centered",
        CHARGED: "https://w3id.org/xapi/dod-isd/verbs/charged",
        DODISDPROFILE_CHARGED: "https://w3id.org/xapi/dod-isd/verbs/charged",
        CLEANED: "https://w3id.org/xapi/dod-isd/verbs/cleaned",
        DODISDPROFILE_CLEANED: "https://w3id.org/xapi/dod-isd/verbs/cleaned",
        CLEARED: "https://w3id.org/xapi/dod-isd/verbs/cleared",
        DODISDPROFILE_CLEARED: "https://w3id.org/xapi/dod-isd/verbs/cleared",
        COLLECTED: "https://w3id.org/xapi/dod-isd/verbs/collected",
        DODISDPROFILE_COLLECTED: "https://w3id.org/xapi/dod-isd/verbs/collected",
        CONNECTED: "https://w3id.org/xapi/dod-isd/verbs/connected",
        DODISDPROFILE_CONNECTED: "https://w3id.org/xapi/dod-isd/verbs/connected",
        COVERED: "https://w3id.org/xapi/dod-isd/verbs/covered",
        DODISDPROFILE_COVERED: "https://w3id.org/xapi/dod-isd/verbs/covered",
        DEBRIEFED: "https://w3id.org/xapi/dod-isd/verbs/debriefed",
        DODISDPROFILE_DEBRIEFED: "https://w3id.org/xapi/dod-isd/verbs/debriefed",
        DEBUGGED: "https://w3id.org/xapi/dod-isd/verbs/debugged",
        DODISDPROFILE_DEBUGGED: "https://w3id.org/xapi/dod-isd/verbs/debugged",
        DECONTAMINATED: "https://w3id.org/xapi/dod-isd/verbs/decontaminated",
        DODISDPROFILE_DECONTAMINATED: "https://w3id.org/xapi/dod-isd/verbs/decontaminated",
        DESTROYED: "https://w3id.org/xapi/dod-isd/verbs/destroyed",
        DODISDPROFILE_DESTROYED: "https://w3id.org/xapi/dod-isd/verbs/destroyed",
        DIAGNOSED: "https://w3id.org/xapi/dod-isd/verbs/diagnosed",
        DODISDPROFILE_DIAGNOSED: "https://w3id.org/xapi/dod-isd/verbs/diagnosed",
        DUG: "https://w3id.org/xapi/dod-isd/verbs/dug",
        DODISDPROFILE_DUG: "https://w3id.org/xapi/dod-isd/verbs/dug",
        DISASSEMBLED: "https://w3id.org/xapi/dod-isd/verbs/disassembled",
        DODISDPROFILE_DISASSEMBLED: "https://w3id.org/xapi/dod-isd/verbs/disassembled",
        DISCONNECTED: "https://w3id.org/xapi/dod-isd/verbs/disconnected",
        DODISDPROFILE_DISCONNECTED: "https://w3id.org/xapi/dod-isd/verbs/disconnected",
        DISENGAGED: "https://w3id.org/xapi/dod-isd/verbs/disengaged",
        DODISDPROFILE_DISENGAGED: "https://w3id.org/xapi/dod-isd/verbs/disengaged",
        DISMANTLED: "https://w3id.org/xapi/dod-isd/verbs/dismantled",
        DODISDPROFILE_DISMANTLED: "https://w3id.org/xapi/dod-isd/verbs/dismantled",
        DISPATCHED: "https://w3id.org/xapi/dod-isd/verbs/dispatched",
        DODISDPROFILE_DISPATCHED: "https://w3id.org/xapi/dod-isd/verbs/dispatched",
        DISPLACED: "https://w3id.org/xapi/dod-isd/verbs/displaced",
        DODISDPROFILE_DISPLACED: "https://w3id.org/xapi/dod-isd/verbs/displaced",
        DISPLAYED: "https://w3id.org/xapi/dod-isd/verbs/displayed",
        DODISDPROFILE_DISPLAYED: "https://w3id.org/xapi/dod-isd/verbs/displayed",
        DISPOSED: "https://w3id.org/xapi/dod-isd/verbs/disposed",
        DODISDPROFILE_DISPOSED: "https://w3id.org/xapi/dod-isd/verbs/disposed",
        DISSEMINATED: "https://w3id.org/xapi/dod-isd/verbs/disseminated",
        DODISDPROFILE_DISSEMINATED: "https://w3id.org/xapi/dod-isd/verbs/disseminated",
        DROVE: "https://w3id.org/xapi/dod-isd/verbs/drove",
        DODISDPROFILE_DROVE: "https://w3id.org/xapi/dod-isd/verbs/drove",
        EGRESSED: "https://w3id.org/xapi/dod-isd/verbs/egressed",
        DODISDPROFILE_EGRESSED: "https://w3id.org/xapi/dod-isd/verbs/egressed",
        ELEVATED: "https://w3id.org/xapi/dod-isd/verbs/elevated",
        DODISDPROFILE_ELEVATED: "https://w3id.org/xapi/dod-isd/verbs/elevated",
        EMPLACED: "https://w3id.org/xapi/dod-isd/verbs/emplaced",
        DODISDPROFILE_EMPLACED: "https://w3id.org/xapi/dod-isd/verbs/emplaced",
        EMPLOYED: "https://w3id.org/xapi/tla/verbs/employed",
        DODISDPROFILE_EMPLOYED: "https://w3id.org/xapi/dod-isd/verbs/employed",
        TLAPROFILE_EMPLOYED: "https://w3id.org/xapi/tla/verbs/employed",
        ENGAGED: "https://w3id.org/xapi/dod-isd/verbs/engaged",
        DODISDPROFILE_ENGAGED: "https://w3id.org/xapi/dod-isd/verbs/engaged",
        ENERGIZED: "https://w3id.org/xapi/dod-isd/verbs/energized",
        DODISDPROFILE_ENERGIZED: "https://w3id.org/xapi/dod-isd/verbs/energized",
        ENTERED: "https://w3id.org/xapi/dod-isd/verbs/entered",
        DODISDPROFILE_ENTERED: "https://w3id.org/xapi/dod-isd/verbs/entered",
        ESTABLISHED: "https://w3id.org/xapi/dod-isd/verbs/established",
        DODISDPROFILE_ESTABLISHED: "https://w3id.org/xapi/dod-isd/verbs/established",
        EVACUATED: "https://w3id.org/xapi/dod-isd/verbs/evacuated",
        DODISDPROFILE_EVACUATED: "https://w3id.org/xapi/dod-isd/verbs/evacuated",
        EXCHANGED: "https://w3id.org/xapi/dod-isd/verbs/exchanged",
        DODISDPROFILE_EXCHANGED: "https://w3id.org/xapi/dod-isd/verbs/exchanged",
        FILLED_OUT: "https://w3id.org/xapi/dod-isd/verbs/filled-out",
        DODISDPROFILE_FILLED_OUT: "https://w3id.org/xapi/dod-isd/verbs/filled-out",
        FIRED: "https://w3id.org/xapi/dod-isd/verbs/fired",
        DODISDPROFILE_FIRED: "https://w3id.org/xapi/dod-isd/verbs/fired",
        FIT: "https://w3id.org/xapi/dod-isd/verbs/fit",
        DODISDPROFILE_FIT: "https://w3id.org/xapi/dod-isd/verbs/fit",
        FUELED: "https://w3id.org/xapi/dod-isd/verbs/fueled",
        DODISDPROFILE_FUELED: "https://w3id.org/xapi/dod-isd/verbs/fueled",
        GROUNDED: "https://w3id.org/xapi/dod-isd/verbs/grounded",
        DODISDPROFILE_GROUNDED: "https://w3id.org/xapi/dod-isd/verbs/grounded",
        HARDENED: "https://w3id.org/xapi/dod-isd/verbs/hardened",
        DODISDPROFILE_HARDENED: "https://w3id.org/xapi/dod-isd/verbs/hardened",
        HOISTED: "https://w3id.org/xapi/dod-isd/verbs/hoisted",
        DODISDPROFILE_HOISTED: "https://w3id.org/xapi/dod-isd/verbs/hoisted",
        INITIALIZED: "http://adlnet.gov/expapi/verbs/initialized",
        DODISDPROFILE_INITIALIZED: "https://w3id.org/xapi/dod-isd/verbs/initialized",
        SCORMPROFILE_INITIALIZED: "http://adlnet.gov/expapi/verbs/initialized",
        INPUT: "https://w3id.org/xapi/dod-isd/verbs/input",
        DODISDPROFILE_INPUT: "https://w3id.org/xapi/dod-isd/verbs/input",
        INSPECTED: "https://w3id.org/xapi/dod-isd/verbs/inspected",
        DODISDPROFILE_INSPECTED: "https://w3id.org/xapi/dod-isd/verbs/inspected",
        INTEGRATED: "https://w3id.org/xapi/dod-isd/verbs/integrated",
        DODISDPROFILE_INTEGRATED: "https://w3id.org/xapi/dod-isd/verbs/integrated",
        INTERCEPTED: "https://w3id.org/xapi/dod-isd/verbs/intercepted",
        DODISDPROFILE_INTERCEPTED: "https://w3id.org/xapi/dod-isd/verbs/intercepted",
        ISOLATED: "https://w3id.org/xapi/dod-isd/verbs/isolated",
        DODISDPROFILE_ISOLATED: "https://w3id.org/xapi/dod-isd/verbs/isolated",
        ISSUED: "https://w3id.org/xapi/dod-isd/verbs/issued",
        DODISDPROFILE_ISSUED: "https://w3id.org/xapi/dod-isd/verbs/issued",
        JACKED: "https://w3id.org/xapi/dod-isd/verbs/jacked",
        DODISDPROFILE_JACKED: "https://w3id.org/xapi/dod-isd/verbs/jacked",
        LOADED: "https://w3id.org/xapi/dod-isd/verbs/loaded",
        DODISDPROFILE_LOADED: "https://w3id.org/xapi/dod-isd/verbs/loaded",
        LOGGED: "https://w3id.org/xapi/dod-isd/verbs/logged",
        DODISDPROFILE_LOGGED: "https://w3id.org/xapi/dod-isd/verbs/logged",
        LUBRICATED: "https://w3id.org/xapi/dod-isd/verbs/lubricated",
        DODISDPROFILE_LUBRICATED: "https://w3id.org/xapi/dod-isd/verbs/lubricated",
        MAINTAINED: "https://w3id.org/xapi/dod-isd/verbs/maintained",
        DODISDPROFILE_MAINTAINED: "https://w3id.org/xapi/dod-isd/verbs/maintained",
        MANAGED: "https://w3id.org/xapi/dod-isd/verbs/managed",
        DODISDPROFILE_MANAGED: "https://w3id.org/xapi/dod-isd/verbs/managed",
        MOUNTED: "https://w3id.org/xapi/dod-isd/verbs/mounted",
        DODISDPROFILE_MOUNTED: "https://w3id.org/xapi/dod-isd/verbs/mounted",
        MOVED: "https://w3id.org/xapi/dod-isd/verbs/moved",
        DODISDPROFILE_MOVED: "https://w3id.org/xapi/dod-isd/verbs/moved",
        NAVIGATED: "https://w3id.org/xapi/dod-isd/verbs/navigated",
        DODISDPROFILE_NAVIGATED: "https://w3id.org/xapi/dod-isd/verbs/navigated",
        OBTAINED: "https://w3id.org/xapi/dod-isd/verbs/obtained",
        DODISDPROFILE_OBTAINED: "https://w3id.org/xapi/dod-isd/verbs/obtained",
        OPERATED: "https://w3id.org/xapi/dod-isd/verbs/operated",
        DODISDPROFILE_OPERATED: "https://w3id.org/xapi/dod-isd/verbs/operated",
        ORDERED: "https://w3id.org/xapi/dod-isd/verbs/ordered",
        DODISDPROFILE_ORDERED: "https://w3id.org/xapi/dod-isd/verbs/ordered",
        PARKED: "https://w3id.org/xapi/dod-isd/verbs/parked",
        DODISDPROFILE_PARKED: "https://w3id.org/xapi/dod-isd/verbs/parked",
        PERFORMED: "https://w3id.org/xapi/hros-asessment/verbs/performed",
        DODISDPROFILE_PERFORMED: "https://w3id.org/xapi/dod-isd/verbs/performed",
        HROPENASSESSMENTSPROFILE_PERFORMED: "https://w3id.org/xapi/hros-asessment/verbs/performed",
        PLACED: "https://w3id.org/xapi/dod-isd/verbs/placed",
        DODISDPROFILE_PLACED: "https://w3id.org/xapi/dod-isd/verbs/placed",
        PLOTTED: "https://w3id.org/xapi/dod-isd/verbs/plotted",
        DODISDPROFILE_PLOTTED: "https://w3id.org/xapi/dod-isd/verbs/plotted",
        POLICED: "https://w3id.org/xapi/dod-isd/verbs/policed",
        DODISDPROFILE_POLICED: "https://w3id.org/xapi/dod-isd/verbs/policed",
        POSITIONED: "https://w3id.org/xapi/dod-isd/verbs/positioned",
        DODISDPROFILE_POSITIONED: "https://w3id.org/xapi/dod-isd/verbs/positioned",
        PRESSED: "https://w3id.org/xapi/seriousgames/verbs/pressed",
        DODISDPROFILE_PRESSED: "https://w3id.org/xapi/dod-isd/verbs/pressed",
        SERIOUSGAMESPROFILE_PRESSED: "https://w3id.org/xapi/seriousgames/verbs/pressed",
        PRESSURIZED: "https://w3id.org/xapi/dod-isd/verbs/pressurized",
        DODISDPROFILE_PRESSURIZED: "https://w3id.org/xapi/dod-isd/verbs/pressurized",
        PROCESSED: "https://w3id.org/xapi/dod-isd/verbs/processed",
        DODISDPROFILE_PROCESSED: "https://w3id.org/xapi/dod-isd/verbs/processed",
        PROCURED: "https://w3id.org/xapi/dod-isd/verbs/procured",
        DODISDPROFILE_PROCURED: "https://w3id.org/xapi/dod-isd/verbs/procured",
        PROVIDED: "https://w3id.org/xapi/dod-isd/verbs/provided",
        DODISDPROFILE_PROVIDED: "https://w3id.org/xapi/dod-isd/verbs/provided",
        PUBLISHED: "https://w3id.org/xapi/dod-isd/verbs/published",
        DODISDPROFILE_PUBLISHED: "https://w3id.org/xapi/dod-isd/verbs/published",
        RAISED: "https://w3id.org/xapi/dod-isd/verbs/raised",
        DODISDPROFILE_RAISED: "https://w3id.org/xapi/dod-isd/verbs/raised",
        RANGED: "https://w3id.org/xapi/dod-isd/verbs/ranged",
        DODISDPROFILE_RANGED: "https://w3id.org/xapi/dod-isd/verbs/ranged",
        REACHED: "https://w3id.org/xapi/dod-isd/verbs/reached",
        DODISDPROFILE_REACHED: "https://w3id.org/xapi/dod-isd/verbs/reached",
        RECORDED: "https://w3id.org/xapi/hros-asessment/verbs/recorded",
        DODISDPROFILE_RECORDED: "https://w3id.org/xapi/dod-isd/verbs/recorded",
        HROPENASSESSMENTSPROFILE_RECORDED: "https://w3id.org/xapi/hros-asessment/verbs/recorded",
        REESTABLISHED: "https://w3id.org/xapi/dod-isd/verbs/reestablished",
        DODISDPROFILE_REESTABLISHED: "https://w3id.org/xapi/dod-isd/verbs/reestablished",
        REFUELED: "https://w3id.org/xapi/dod-isd/verbs/refueled",
        DODISDPROFILE_REFUELED: "https://w3id.org/xapi/dod-isd/verbs/refueled",
        RELEASED: "https://w3id.org/xapi/seriousgames/verbs/released",
        DODISDPROFILE_RELEASED: "https://w3id.org/xapi/dod-isd/verbs/released",
        TLAPROFILE_RELEASED: "https://w3id.org/xapi/tla/verbs/released",
        SERIOUSGAMESPROFILE_RELEASED: "https://w3id.org/xapi/seriousgames/verbs/released",
        RELOCATED: "https://w3id.org/xapi/dod-isd/verbs/relocated",
        DODISDPROFILE_RELOCATED: "https://w3id.org/xapi/dod-isd/verbs/relocated",
        REPAIRED: "https://w3id.org/xapi/dod-isd/verbs/repaired",
        DODISDPROFILE_REPAIRED: "https://w3id.org/xapi/dod-isd/verbs/repaired",
        REPLENISHED: "https://w3id.org/xapi/dod-isd/verbs/replenished",
        DODISDPROFILE_REPLENISHED: "https://w3id.org/xapi/dod-isd/verbs/replenished",
        RESET: "https://w3id.org/xapi/dod-isd/verbs/reset",
        DODISDPROFILE_RESET: "https://w3id.org/xapi/dod-isd/verbs/reset",
        RETRIEVED: "https://w3id.org/xapi/dod-isd/verbs/retrieved",
        DODISDPROFILE_RETRIEVED: "https://w3id.org/xapi/dod-isd/verbs/retrieved",
        ROTATED: "https://w3id.org/xapi/dod-isd/verbs/rotated",
        DODISDPROFILE_ROTATED: "https://w3id.org/xapi/dod-isd/verbs/rotated",
        SECURED: "http://id.tincanapi.com/verb/secured",
        DODISDPROFILE_SECURED: "https://w3id.org/xapi/dod-isd/verbs/secured",
        TINCANVOCABULARYPROFILE_SECURED: "http://id.tincanapi.com/verb/secured",
        SERVICED: "https://w3id.org/xapi/dod-isd/verbs/serviced",
        DODISDPROFILE_SERVICED: "https://w3id.org/xapi/dod-isd/verbs/serviced",
        SHUT_DOWN: "https://w3id.org/xapi/dod-isd/verbs/shut-down",
        DODISDPROFILE_SHUT_DOWN: "https://w3id.org/xapi/dod-isd/verbs/shut-down",
        SIGHTED: "https://w3id.org/xapi/dod-isd/verbs/sighted",
        DODISDPROFILE_SIGHTED: "https://w3id.org/xapi/dod-isd/verbs/sighted",
        SIGNALED: "https://w3id.org/xapi/dod-isd/verbs/signaled",
        DODISDPROFILE_SIGNALED: "https://w3id.org/xapi/dod-isd/verbs/signaled",
        SPLINTED: "https://w3id.org/xapi/dod-isd/verbs/splinted",
        DODISDPROFILE_SPLINTED: "https://w3id.org/xapi/dod-isd/verbs/splinted",
        SQUEEZED: "https://w3id.org/xapi/dod-isd/verbs/squeezed",
        DODISDPROFILE_SQUEEZED: "https://w3id.org/xapi/dod-isd/verbs/squeezed",
        STOCKPILED: "https://w3id.org/xapi/dod-isd/verbs/stockpiled",
        DODISDPROFILE_STOCKPILED: "https://w3id.org/xapi/dod-isd/verbs/stockpiled",
        STORED: "https://w3id.org/xapi/dod-isd/verbs/stored",
        DODISDPROFILE_STORED: "https://w3id.org/xapi/dod-isd/verbs/stored",
        STOWED: "https://w3id.org/xapi/dod-isd/verbs/stowed",
        DODISDPROFILE_STOWED: "https://w3id.org/xapi/dod-isd/verbs/stowed",
        STRUCK: "https://w3id.org/xapi/dod-isd/verbs/struck",
        DODISDPROFILE_STRUCK: "https://w3id.org/xapi/dod-isd/verbs/struck",
        SUPERVISED: "https://w3id.org/xapi/dod-isd/verbs/supervised",
        DODISDPROFILE_SUPERVISED: "https://w3id.org/xapi/dod-isd/verbs/supervised",
        SUPPORTED: "https://w3id.org/xapi/dod-isd/verbs/supported",
        DODISDPROFILE_SUPPORTED: "https://w3id.org/xapi/dod-isd/verbs/supported",
        SWEPT: "https://w3id.org/xapi/dod-isd/verbs/swept",
        DODISDPROFILE_SWEPT: "https://w3id.org/xapi/dod-isd/verbs/swept",
        TOOK: "https://w3id.org/xapi/dod-isd/verbs/took",
        DODISDPROFILE_TOOK: "https://w3id.org/xapi/dod-isd/verbs/took",
        TOOK_CHARGE: "https://w3id.org/xapi/dod-isd/verbs/took-charge",
        DODISDPROFILE_TOOK_CHARGE: "https://w3id.org/xapi/dod-isd/verbs/took-charge",
        TAPPED: "https://w3id.org/xapi/dod-isd/verbs/tapped",
        DODISDPROFILE_TAPPED: "https://w3id.org/xapi/dod-isd/verbs/tapped",
        TESTED: "https://w3id.org/xapi/dod-isd/verbs/tested",
        DODISDPROFILE_TESTED: "https://w3id.org/xapi/dod-isd/verbs/tested",
        TIGHTENED: "https://w3id.org/xapi/dod-isd/verbs/tightened",
        DODISDPROFILE_TIGHTENED: "https://w3id.org/xapi/dod-isd/verbs/tightened",
        TRACED: "https://w3id.org/xapi/dod-isd/verbs/traced",
        DODISDPROFILE_TRACED: "https://w3id.org/xapi/dod-isd/verbs/traced",
        TRANSFERRED: "https://w3id.org/xapi/dod-isd/verbs/transferred",
        DODISDPROFILE_TRANSFERRED: "https://w3id.org/xapi/dod-isd/verbs/transferred",
        TRANSMITTED: "https://w3id.org/xapi/dod-isd/verbs/transmitted",
        DODISDPROFILE_TRANSMITTED: "https://w3id.org/xapi/dod-isd/verbs/transmitted",
        TRANSPORTED: "https://w3id.org/xapi/dod-isd/verbs/transported",
        DODISDPROFILE_TRANSPORTED: "https://w3id.org/xapi/dod-isd/verbs/transported",
        TREATED: "https://w3id.org/xapi/dod-isd/verbs/treated",
        DODISDPROFILE_TREATED: "https://w3id.org/xapi/dod-isd/verbs/treated",
        TROUBLESHOT: "https://w3id.org/xapi/dod-isd/verbs/troubleshot",
        DODISDPROFILE_TROUBLESHOT: "https://w3id.org/xapi/dod-isd/verbs/troubleshot",
        TYPED: "https://w3id.org/xapi/dod-isd/verbs/typed",
        DODISDPROFILE_TYPED: "https://w3id.org/xapi/dod-isd/verbs/typed",
        UNLOADED: "https://w3id.org/xapi/dod-isd/verbs/unloaded",
        DODISDPROFILE_UNLOADED: "https://w3id.org/xapi/dod-isd/verbs/unloaded",
        UTILIZED: "https://w3id.org/xapi/dod-isd/verbs/utilized",
        DODISDPROFILE_UTILIZED: "https://w3id.org/xapi/dod-isd/verbs/utilized",
        WROTE: "https://w3id.org/xapi/hros-asessment/verbs/writes",
        DODISDPROFILE_WROTE: "https://w3id.org/xapi/dod-isd/verbs/wrote",
        HROPENASSESSMENTSPROFILE_WROTE: "https://w3id.org/xapi/hros-asessment/verbs/writes",
        ZEROED: "https://w3id.org/xapi/dod-isd/verbs/zeroed",
        DODISDPROFILE_ZEROED: "https://w3id.org/xapi/dod-isd/verbs/zeroed",
        ACCLIMATIZED: "https://w3id.org/xapi/dod-isd/verbs/acclimatized",
        DODISDPROFILE_ACCLIMATIZED: "https://w3id.org/xapi/dod-isd/verbs/acclimatized",
        ACCOMMODATED: "https://w3id.org/xapi/dod-isd/verbs/accommodated",
        DODISDPROFILE_ACCOMMODATED: "https://w3id.org/xapi/dod-isd/verbs/accommodated",
        ADAPTED: "https://w3id.org/xapi/dod-isd/verbs/adapted",
        DODISDPROFILE_ADAPTED: "https://w3id.org/xapi/dod-isd/verbs/adapted",
        AMBUSHED: "https://w3id.org/xapi/dod-isd/verbs/ambushed",
        DODISDPROFILE_AMBUSHED: "https://w3id.org/xapi/dod-isd/verbs/ambushed",
        ATTACKED: "https://w3id.org/xapi/dod-isd/verbs/attacked",
        DODISDPROFILE_ATTACKED: "https://w3id.org/xapi/dod-isd/verbs/attacked",
        BYPASSED: "https://w3id.org/xapi/dod-isd/verbs/bypassed",
        DODISDPROFILE_BYPASSED: "https://w3id.org/xapi/dod-isd/verbs/bypassed",
        CONDUCTED: "https://w3id.org/xapi/dod-isd/verbs/conducted",
        DODISDPROFILE_CONDUCTED: "https://w3id.org/xapi/dod-isd/verbs/conducted",
        DEPLOYED: "https://w3id.org/xapi/dod-isd/verbs/deployed",
        DODISDPROFILE_DEPLOYED: "https://w3id.org/xapi/dod-isd/verbs/deployed",
        DIRECTED: "https://w3id.org/xapi/tla/verbs/directed",
        DODISDPROFILE_DIRECTED: "https://w3id.org/xapi/dod-isd/verbs/directed",
        TLAPROFILE_DIRECTED: "https://w3id.org/xapi/tla/verbs/directed",
        DREW: "https://w3id.org/xapi/dod-isd/verbs/drew",
        DODISDPROFILE_DREW: "https://w3id.org/xapi/dod-isd/verbs/drew",
        EVADED: "https://w3id.org/xapi/dod-isd/verbs/evaded",
        DODISDPROFILE_EVADED: "https://w3id.org/xapi/dod-isd/verbs/evaded",
        INFILTRATED: "https://w3id.org/xapi/dod-isd/verbs/infiltrated",
        DODISDPROFILE_INFILTRATED: "https://w3id.org/xapi/dod-isd/verbs/infiltrated",
        LAID: "https://w3id.org/xapi/dod-isd/verbs/laid",
        DODISDPROFILE_LAID: "https://w3id.org/xapi/dod-isd/verbs/laid",
        LED: "https://w3id.org/xapi/dod-isd/verbs/led",
        DODISDPROFILE_LED: "https://w3id.org/xapi/dod-isd/verbs/led",
        MAPPED: "https://w3id.org/xapi/dod-isd/verbs/mapped",
        DODISDPROFILE_MAPPED: "https://w3id.org/xapi/dod-isd/verbs/mapped",
        NEUTRALIZED: "https://w3id.org/xapi/dod-isd/verbs/neutralized",
        DODISDPROFILE_NEUTRALIZED: "https://w3id.org/xapi/dod-isd/verbs/neutralized",
        OCCUPIED: "https://w3id.org/xapi/dod-isd/verbs/occupied",
        DODISDPROFILE_OCCUPIED: "https://w3id.org/xapi/dod-isd/verbs/occupied",
        ORIENTED: "https://w3id.org/xapi/dod-isd/verbs/oriented",
        DODISDPROFILE_ORIENTED: "https://w3id.org/xapi/dod-isd/verbs/oriented",
        PACKED: "https://w3id.org/xapi/dod-isd/verbs/packed",
        DODISDPROFILE_PACKED: "https://w3id.org/xapi/dod-isd/verbs/packed",
        PATROLLED: "https://w3id.org/xapi/dod-isd/verbs/patrolled",
        DODISDPROFILE_PATROLLED: "https://w3id.org/xapi/dod-isd/verbs/patrolled",
        PREVENTED: "https://w3id.org/xapi/dod-isd/verbs/prevented",
        DODISDPROFILE_PREVENTED: "https://w3id.org/xapi/dod-isd/verbs/prevented",
        PROGRAMMED: "https://w3id.org/xapi/dod-isd/verbs/programmed",
        DODISDPROFILE_PROGRAMMED: "https://w3id.org/xapi/dod-isd/verbs/programmed",
        PROTECTED: "https://w3id.org/xapi/dod-isd/verbs/protected",
        DODISDPROFILE_PROTECTED: "https://w3id.org/xapi/dod-isd/verbs/protected",
        QUEUED: "https://w3id.org/xapi/dod-isd/verbs/queued",
        DODISDPROFILE_QUEUED: "https://w3id.org/xapi/dod-isd/verbs/queued",
        RECONCILED: "https://w3id.org/xapi/dod-isd/verbs/reconciled",
        DODISDPROFILE_RECONCILED: "https://w3id.org/xapi/dod-isd/verbs/reconciled",
        RECOVERED: "https://w3id.org/xapi/dod-isd/verbs/recovered",
        DODISDPROFILE_RECOVERED: "https://w3id.org/xapi/dod-isd/verbs/recovered",
        REDUCED: "https://w3id.org/xapi/dod-isd/verbs/reduced",
        DODISDPROFILE_REDUCED: "https://w3id.org/xapi/dod-isd/verbs/reduced",
        RELIEVED: "https://w3id.org/xapi/dod-isd/verbs/relieved",
        DODISDPROFILE_RELIEVED: "https://w3id.org/xapi/dod-isd/verbs/relieved",
        SUPPRESSED: "https://w3id.org/xapi/dod-isd/verbs/suppressed",
        DODISDPROFILE_SUPPRESSED: "https://w3id.org/xapi/dod-isd/verbs/suppressed",
        TAILORED: "https://w3id.org/xapi/dod-isd/verbs/tailored",
        DODISDPROFILE_TAILORED: "https://w3id.org/xapi/dod-isd/verbs/tailored",
        TEMPERED: "https://w3id.org/xapi/dod-isd/verbs/tempered",
        DODISDPROFILE_TEMPERED: "https://w3id.org/xapi/dod-isd/verbs/tempered",
        TRAINED: "https://w3id.org/xapi/dod-isd/verbs/trained",
        DODISDPROFILE_TRAINED: "https://w3id.org/xapi/dod-isd/verbs/trained",
        CAUSED: "https://w3id.org/xapi/dod-isd/verbs/caused",
        DODISDPROFILE_CAUSED: "https://w3id.org/xapi/dod-isd/verbs/caused",
        CONSTRUCTED: "https://w3id.org/xapi/dod-isd/verbs/constructed",
        DODISDPROFILE_CONSTRUCTED: "https://w3id.org/xapi/dod-isd/verbs/constructed",
        CONTRIVED: "https://w3id.org/xapi/dod-isd/verbs/contrived",
        DODISDPROFILE_CONTRIVED: "https://w3id.org/xapi/dod-isd/verbs/contrived",
        CORRECTED: "https://w3id.org/xapi/dod-isd/verbs/corrected",
        DODISDPROFILE_CORRECTED: "https://w3id.org/xapi/dod-isd/verbs/corrected",
        INVENTED: "https://w3id.org/xapi/dod-isd/verbs/invented",
        DODISDPROFILE_INVENTED: "https://w3id.org/xapi/dod-isd/verbs/invented",
        MADE: "https://w3id.org/xapi/dod-isd/verbs/made",
        DODISDPROFILE_MADE: "https://w3id.org/xapi/dod-isd/verbs/made",
        ORIGINATED: "https://w3id.org/xapi/dod-isd/verbs/originated",
        DODISDPROFILE_ORIGINATED: "https://w3id.org/xapi/dod-isd/verbs/originated",
        ATTENDED_CLOSELY: "https://w3id.org/xapi/dod-isd/verbs/attended-closely",
        DODISDPROFILE_ATTENDED_CLOSELY: "https://w3id.org/xapi/dod-isd/verbs/attended-closely",
        LISTENED_ATTENTIVELY: "https://w3id.org/xapi/dod-isd/verbs/listened-attentively",
        DODISDPROFILE_LISTENED_ATTENTIVELY: "https://w3id.org/xapi/dod-isd/verbs/listened-attentively",
        MONITORED: "https://w3id.org/xapi/dod-isd/verbs/monitored",
        DODISDPROFILE_MONITORED: "https://w3id.org/xapi/dod-isd/verbs/monitored",
        OBSERVED: "https://w3id.org/xapi/dod-isd/verbs/observed",
        DODISDPROFILE_OBSERVED: "https://w3id.org/xapi/dod-isd/verbs/observed",
        PERCEIVED: "https://w3id.org/xapi/dod-isd/verbs/perceived",
        DODISDPROFILE_PERCEIVED: "https://w3id.org/xapi/dod-isd/verbs/perceived",
        RECOGNIZED: "https://w3id.org/xapi/dod-isd/verbs/recognized",
        DODISDPROFILE_RECOGNIZED: "https://w3id.org/xapi/dod-isd/verbs/recognized",
        RECONNOITERED: "https://w3id.org/xapi/dod-isd/verbs/reconnoitered",
        DODISDPROFILE_RECONNOITERED: "https://w3id.org/xapi/dod-isd/verbs/reconnoitered",
        SHOWED_AWARENESS: "https://w3id.org/xapi/dod-isd/verbs/showed-awareness",
        DODISDPROFILE_SHOWED_AWARENESS: "https://w3id.org/xapi/dod-isd/verbs/showed-awareness",
        SHOWED_SENSITIVITY: "https://w3id.org/xapi/dod-isd/verbs/showed-sensitivity",
        DODISDPROFILE_SHOWED_SENSITIVITY: "https://w3id.org/xapi/dod-isd/verbs/showed-sensitivity",
        WAITED: "https://w3id.org/xapi/dod-isd/verbs/waited",
        DODISDPROFILE_WAITED: "https://w3id.org/xapi/dod-isd/verbs/waited",
        ACCOMPLISHED: "https://w3id.org/xapi/dod-isd/verbs/accomplished",
        DODISDPROFILE_ACCOMPLISHED: "https://w3id.org/xapi/dod-isd/verbs/accomplished",
        ACHIEVED: "https://w3id.org/xapi/dod-isd/verbs/achieved",
        DODISDPROFILE_ACHIEVED: "https://w3id.org/xapi/dod-isd/verbs/achieved",
        ANNOUNCED: "https://w3id.org/xapi/dod-isd/verbs/announced",
        DODISDPROFILE_ANNOUNCED: "https://w3id.org/xapi/dod-isd/verbs/announced",
        COMMUNICATED: "https://w3id.org/xapi/dod-isd/verbs/communicated",
        DODISDPROFILE_COMMUNICATED: "https://w3id.org/xapi/dod-isd/verbs/communicated",
        COMPLETED_ASSIGNMENT: "https://w3id.org/xapi/dod-isd/verbs/completed-assignment",
        DODISDPROFILE_COMPLETED_ASSIGNMENT: "https://w3id.org/xapi/dod-isd/verbs/completed-assignment",
        COMPLIED: "https://w3id.org/xapi/dod-isd/verbs/complied",
        DODISDPROFILE_COMPLIED: "https://w3id.org/xapi/dod-isd/verbs/complied",
        DEMONSTRATED: "https://w3id.org/xapi/dod-isd/verbs/demonstrated",
        DODISDPROFILE_DEMONSTRATED: "https://w3id.org/xapi/dod-isd/verbs/demonstrated",
        ENCODED: "https://w3id.org/xapi/dod-isd/verbs/encoded",
        DODISDPROFILE_ENCODED: "https://w3id.org/xapi/dod-isd/verbs/encoded",
        EXECUTED: "https://w3id.org/xapi/dod-isd/verbs/executed",
        DODISDPROFILE_EXECUTED: "https://w3id.org/xapi/dod-isd/verbs/executed",
        INDICATED: "https://w3id.org/xapi/dod-isd/verbs/indicated",
        DODISDPROFILE_INDICATED: "https://w3id.org/xapi/dod-isd/verbs/indicated",
        INTERPRETED: "https://w3id.org/xapi/dod-isd/verbs/interpreted",
        DODISDPROFILE_INTERPRETED: "https://w3id.org/xapi/dod-isd/verbs/interpreted",
        NOTIFIED: "https://w3id.org/xapi/dod-isd/verbs/notified",
        DODISDPROFILE_NOTIFIED: "https://w3id.org/xapi/dod-isd/verbs/notified",
        OBEYED_RULES: "https://w3id.org/xapi/dod-isd/verbs/obeyed-rules",
        DODISDPROFILE_OBEYED_RULES: "https://w3id.org/xapi/dod-isd/verbs/obeyed-rules",
        REACTED: "https://w3id.org/xapi/dod-isd/verbs/reacted",
        DODISDPROFILE_REACTED: "https://w3id.org/xapi/dod-isd/verbs/reacted",
        RESPONDED: "http://adlnet.gov/expapi/verbs/responded",
        DODISDPROFILE_RESPONDED: "https://w3id.org/xapi/dod-isd/verbs/responded",
        SCORMPROFILE_RESPONDED: "http://adlnet.gov/expapi/verbs/responded",
        SHOWED: "https://w3id.org/xapi/dod-isd/verbs/showed",
        DODISDPROFILE_SHOWED: "https://w3id.org/xapi/dod-isd/verbs/showed",
        ALERTED: "https://w3id.org/xapi/dod-isd/verbs/alerted",
        DODISDPROFILE_ALERTED: "https://w3id.org/xapi/dod-isd/verbs/alerted",
        APPRECIATED: "https://w3id.org/xapi/dod-isd/verbs/appreciated",
        DODISDPROFILE_APPRECIATED: "https://w3id.org/xapi/dod-isd/verbs/appreciated",
        ASSESSED: "https://w3id.org/xapi/tla/verbs/assessed",
        DODISDPROFILE_ASSESSED: "https://w3id.org/xapi/dod-isd/verbs/assessed",
        TLAPROFILE_ASSESSED: "https://w3id.org/xapi/tla/verbs/assessed",
        AUTHENTICATED: "https://w3id.org/xapi/dod-isd/verbs/authenticated",
        DODISDPROFILE_AUTHENTICATED: "https://w3id.org/xapi/dod-isd/verbs/authenticated",
        BELIEVED: "https://w3id.org/xapi/dod-isd/verbs/believed",
        DODISDPROFILE_BELIEVED: "https://w3id.org/xapi/dod-isd/verbs/believed",
        CHOSE: "https://w3id.org/xapi/dod-isd/verbs/chose",
        DODISDPROFILE_CHOSE: "https://w3id.org/xapi/dod-isd/verbs/chose",
        JUDGED: "https://w3id.org/xapi/dod-isd/verbs/judged",
        DODISDPROFILE_JUDGED: "https://w3id.org/xapi/dod-isd/verbs/judged",
        JUSTIFIED: "https://w3id.org/xapi/dod-isd/verbs/justified",
        DODISDPROFILE_JUSTIFIED: "https://w3id.org/xapi/dod-isd/verbs/justified",
        PRIORITIZED: "https://w3id.org/xapi/tla/verbs/prioritized",
        DODISDPROFILE_PRIORITIZED: "https://w3id.org/xapi/dod-isd/verbs/prioritized",
        TLAPROFILE_PRIORITIZED: "https://w3id.org/xapi/tla/verbs/prioritized",
        PROPOSED: "https://w3id.org/xapi/dod-isd/verbs/proposed",
        DODISDPROFILE_PROPOSED: "https://w3id.org/xapi/dod-isd/verbs/proposed",
        REASSESSED: "https://w3id.org/xapi/dod-isd/verbs/reassessed",
        DODISDPROFILE_REASSESSED: "https://w3id.org/xapi/dod-isd/verbs/reassessed",
        REVIEWED: "http://id.tincanapi.com/verb/reviewed",
        DODISDPROFILE_REVIEWED: "https://w3id.org/xapi/dod-isd/verbs/reviewed",
        TINCANVOCABULARYPROFILE_REVIEWED: "http://id.tincanapi.com/verb/reviewed",
        STUDIED: "https://w3id.org/xapi/dod-isd/verbs/studied",
        DODISDPROFILE_STUDIED: "https://w3id.org/xapi/dod-isd/verbs/studied",
        VALIDATED: "https://w3id.org/xapi/tla/verbs/validated",
        DODISDPROFILE_VALIDATED: "https://w3id.org/xapi/dod-isd/verbs/validated",
        TLAPROFILE_VALIDATED: "https://w3id.org/xapi/tla/verbs/validated",
        VERIFIED: "https://w3id.org/xapi/tla/verbs/verified",
        DODISDPROFILE_VERIFIED: "https://w3id.org/xapi/dod-isd/verbs/verified",
        TLAPROFILE_VERIFIED: "https://w3id.org/xapi/tla/verbs/verified",
        ALLOWED: "https://w3id.org/xapi/dod-isd/verbs/allowed",
        DODISDPROFILE_ALLOWED: "https://w3id.org/xapi/dod-isd/verbs/allowed",
        ALTERED: "https://w3id.org/xapi/dod-isd/verbs/altered",
        DODISDPROFILE_ALTERED: "https://w3id.org/xapi/dod-isd/verbs/altered",
        ASSUMED: "https://w3id.org/xapi/dod-isd/verbs/assumed",
        DODISDPROFILE_ASSUMED: "https://w3id.org/xapi/dod-isd/verbs/assumed",
        COMMANDED: "https://w3id.org/xapi/dod-isd/verbs/commanded",
        DODISDPROFILE_COMMANDED: "https://w3id.org/xapi/dod-isd/verbs/commanded",
        COORDINATED: "https://w3id.org/xapi/dod-isd/verbs/coordinated",
        DODISDPROFILE_COORDINATED: "https://w3id.org/xapi/dod-isd/verbs/coordinated",
        ENFORCED: "https://w3id.org/xapi/dod-isd/verbs/enforced",
        DODISDPROFILE_ENFORCED: "https://w3id.org/xapi/dod-isd/verbs/enforced",
        ENSURED: "https://w3id.org/xapi/dod-isd/verbs/ensured",
        DODISDPROFILE_ENSURED: "https://w3id.org/xapi/dod-isd/verbs/ensured",
        INFLUENCED: "https://w3id.org/xapi/dod-isd/verbs/influenced",
        DODISDPROFILE_INFLUENCED: "https://w3id.org/xapi/dod-isd/verbs/influenced",
        PRESCRIBED: "https://w3id.org/xapi/dod-isd/verbs/prescribed",
        DODISDPROFILE_PRESCRIBED: "https://w3id.org/xapi/dod-isd/verbs/prescribed",
        SERVED: "https://w3id.org/xapi/dod-isd/verbs/served",
        DODISDPROFILE_SERVED: "https://w3id.org/xapi/dod-isd/verbs/served",
        CONCEIVED: "https://w3id.org/xapi/dod-isd/verbs/conceived",
        DODISDPROFILE_CONCEIVED: "https://w3id.org/xapi/dod-isd/verbs/conceived",
        CONJECTURED: "https://w3id.org/xapi/dod-isd/verbs/conjectured",
        DODISDPROFILE_CONJECTURED: "https://w3id.org/xapi/dod-isd/verbs/conjectured",
        DEVELOPED: "https://w3id.org/xapi/dod-isd/verbs/developed",
        DODISDPROFILE_DEVELOPED: "https://w3id.org/xapi/dod-isd/verbs/developed",
        DEVISED: "https://w3id.org/xapi/dod-isd/verbs/devised",
        DODISDPROFILE_DEVISED: "https://w3id.org/xapi/dod-isd/verbs/devised",
        FORMULATED: "https://w3id.org/xapi/dod-isd/verbs/formulated",
        DODISDPROFILE_FORMULATED: "https://w3id.org/xapi/dod-isd/verbs/formulated",
        IMAGINED: "https://w3id.org/xapi/dod-isd/verbs/imagined",
        DODISDPROFILE_IMAGINED: "https://w3id.org/xapi/dod-isd/verbs/imagined",
        INNOVATED: "https://w3id.org/xapi/dod-isd/verbs/innovated",
        DODISDPROFILE_INNOVATED: "https://w3id.org/xapi/dod-isd/verbs/innovated",
        RATED: "http://id.tincanapi.com/verb/rated",
        FEEDBACKINTERACTIONPROFILE_RATED: "https://w3id.org/xapi/acrossx/verbs/rated",
        TINCANVOCABULARYPROFILE_RATED: "http://id.tincanapi.com/verb/rated",
        FINISHED: "https://xapi.org.au/geolocationprofileprofile/verb/finished",
        GEOLOCATIONPROFILE_FINISHED: "https://xapi.org.au/geolocationprofileprofile/verb/finished",
        CHECKED_IN: "https://xapi.org.au/geolocationprofile/verb/checkin",
        GEOLOCATIONPROFILE_CHECKED_IN: "https://xapi.org.au/geolocationprofileprofile/verb/checkedin/",
        ORPHANCONTAINERPROFILE_CHECKED_IN: "https://xapi.org.au/geolocationprofile/verb/checkin",
        CHECKED_OUT: "https://xapi.org.au/geolocationprofileprofile/verb/checkedout/",
        GEOLOCATIONPROFILE_CHECKED_OUT: "https://xapi.org.au/geolocationprofileprofile/verb/checkedout/",
        SOLVED_2: "https://w3id.org/xapi/hros-asessment/verbs/solved",
        HROPENASSESSMENTSPROFILE_SOLVED_2: "https://w3id.org/xapi/hros-asessment/verbs/solved",
        SIMULATED: "https://w3id.org/xapi/hros-asessment/verbs/simulated",
        HROPENASSESSMENTSPROFILE_SIMULATED: "https://w3id.org/xapi/hros-asessment/verbs/simulated",
        CHOOSE: "https://w3id.org/xapi/hros-asessment/verbs/chooses",
        HROPENASSESSMENTSPROFILE_CHOOSE: "https://w3id.org/xapi/hros-asessment/verbs/chooses",
        EMULATED: "https://w3id.org/xapi/hros-asessment/verbs/emulated",
        HROPENASSESSMENTSPROFILE_EMULATED: "https://w3id.org/xapi/hros-asessment/verbs/emulated",
        DRWAING: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/verb/drawing",
        HYFLEXCLASSROOMPROFILE_DRWAING: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/verb/drawing",
        KICK: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/verb/kick",
        HYFLEXCLASSROOMPROFILE_KICK: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/verb/kick",
        PROOFREAD: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/verb/proofread",
        HYFLEXCLASSROOMPROFILE_PROOFREAD: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/verb/proofread",
        REVISE: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/verb/revise",
        HYFLEXCLASSROOMPROFILE_REVISE: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/verb/revise",
        RECORD_VIDEO: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/verb/record",
        HYFLEXCLASSROOMPROFILE_RECORD_VIDEO: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/verb/record",
        USED_LTI: "http://profiles.usalearning.net/xapi/5eda3789-9801-4dcc-ae22-9971b2a31871/verb/lti-used",
        IMSGLOBALLEARNINGTOOLINTEROPERABILITYPROFILE_USED_LTI: "http://profiles.usalearning.net/xapi/5eda3789-9801-4dcc-ae22-9971b2a31871/verb/lti-used",
        RETURNED_LTI: "http://profiles.usalearning.net/xapi/5eda3789-9801-4dcc-ae22-9971b2a31871/verb/returned-lti",
        IMSGLOBALLEARNINGTOOLINTEROPERABILITYPROFILE_RETURNED_LTI: "http://profiles.usalearning.net/xapi/5eda3789-9801-4dcc-ae22-9971b2a31871/verb/returned-lti",
        DESELECTED: "https://w3id.org/xapi/performance-support/verbs/deselected",
        TLAPROFILE_DESELECTED: "https://w3id.org/xapi/tla/verbs/deselected",
        PERFORMANCESUPPORTPROFILE_DESELECTED: "https://w3id.org/xapi/performance-support/verbs/deselected",
        EXPLORED: "https://w3id.org/xapi/tla/verbs/explored",
        TLAPROFILE_EXPLORED: "https://w3id.org/xapi/tla/verbs/explored",
        CLARIFIED: "https://w3id.org/xapi/tla/verbs/clarified",
        TLAPROFILE_CLARIFIED: "https://w3id.org/xapi/tla/verbs/clarified",
        SURVEYED: "https://w3id.org/xapi/tla/verbs/surveyed",
        TLAPROFILE_SURVEYED: "https://w3id.org/xapi/tla/verbs/surveyed",
        CONTEXTUALIZED: "https://w3id.org/xapi/tla/verbs/contextualized",
        TLAPROFILE_CONTEXTUALIZED: "https://w3id.org/xapi/tla/verbs/contextualized",
        SOCIALIZED: "https://w3id.org/xapi/tla/verbs/socialized",
        TLAPROFILE_SOCIALIZED: "https://w3id.org/xapi/tla/verbs/socialized",
        CAPTURED: "https://w3id.org/xapi/tla/verbs/captured",
        TLAPROFILE_CAPTURED: "https://w3id.org/xapi/tla/verbs/captured",
        ASSERTED: "https://w3id.org/xapi/tla/verbs/asserted",
        TLAPROFILE_ASSERTED: "https://w3id.org/xapi/tla/verbs/asserted",
        CONFERRED: "https://w3id.org/xapi/tla/verbs/conferred",
        TLAPROFILE_CONFERRED: "https://w3id.org/xapi/tla/verbs/conferred",
        CERTIFIED: "https://w3id.org/xapi/tla/verbs/certified",
        TLAPROFILE_CERTIFIED: "https://w3id.org/xapi/tla/verbs/certified",
        RECRUITED: "https://w3id.org/xapi/tla/verbs/recruited",
        TLAPROFILE_RECRUITED: "https://w3id.org/xapi/tla/verbs/recruited",
        DETAILED: "https://w3id.org/xapi/tla/verbs/detailed",
        TLAPROFILE_DETAILED: "https://w3id.org/xapi/tla/verbs/detailed",
        MOBILIZED: "https://w3id.org/xapi/tla/verbs/mobilized",
        TLAPROFILE_MOBILIZED: "https://w3id.org/xapi/tla/verbs/mobilized",
        PROMOTED: "http://id.tincanapi.com/verb/promoted",
        TLAPROFILE_PROMOTED: "https://w3id.org/xapi/tla/verbs/promoted",
        TINCANVOCABULARYPROFILE_PROMOTED: "http://id.tincanapi.com/verb/promoted",
        SCREENED: "https://w3id.org/xapi/tla/verbs/screened",
        TLAPROFILE_SCREENED: "https://w3id.org/xapi/tla/verbs/screened",
        TRANSITIONED: "https://w3id.org/xapi/tla/verbs/transitioned",
        TLAPROFILE_TRANSITIONED: "https://w3id.org/xapi/tla/verbs/transitioned",
        RESTRICTED: "https://w3id.org/xapi/tla/verbs/restricted",
        TLAPROFILE_RESTRICTED: "https://w3id.org/xapi/tla/verbs/restricted",
        SUSPENDED: "http://adlnet.gov/expapi/verbs/suspended",
        TLAPROFILE_SUSPENDED: "https://w3id.org/xapi/tla/verbs/suspended",
        SCORMPROFILE_SUSPENDED: "http://adlnet.gov/expapi/verbs/suspended",
        PRINTED: "https://w3id.org/xapi/netc/verbs/printed",
        NAVYCOMMONREFERENCEPROFILE_PRINTED: "https://w3id.org/xapi/netc/verbs/printed",
        UPLOADED: "https://w3id.org/xapi/netc/verbs/uploaded",
        NAVYCOMMONREFERENCEPROFILE_UPLOADED: "https://w3id.org/xapi/netc/verbs/uploaded",
        VOTED: "https://w3id.org/xapi/openedx/verb/voted",
        OPENEDXPROFILE_VOTED: "https://w3id.org/xapi/openedx/verb/voted",
        UNREPORTED: "https://w3id.org/xapi/openedx/verb/unreported",
        OPENEDXPROFILE_UNREPORTED: "https://w3id.org/xapi/openedx/verb/unreported",
        CHECK_OUT: "https://xapi.org.au/geolocationprofile/verb/checkout",
        ORPHANCONTAINERPROFILE_CHECK_OUT: "https://xapi.org.au/geolocationprofile/verb/checkout",
        MUTED: "http://schema.dases.eu/xapi/profile/virtual-classroom/verb/muted",
        ORPHANCONTAINERPROFILE_MUTED: "http://schema.dases.eu/xapi/profile/virtual-classroom/verb/muted",
        UNMUTED: "http://schema.dases.eu/xapi/profile/virtual-classroom/verb/unmuted",
        ORPHANCONTAINERPROFILE_UNMUTED: "http://schema.dases.eu/xapi/profile/virtual-classroom/verb/unmuted",
        STARTED_CAMERA: "http://schema.dases.eu/xapi/profile/virtual-classroom/verb/started-camera",
        ORPHANCONTAINERPROFILE_STARTED_CAMERA: "http://schema.dases.eu/xapi/profile/virtual-classroom/verb/started-camera",
        STOPPED_CAMERA: "http://schema.dases.eu/xapi/profile/virtual-classroom/verb/stopped-camera",
        ORPHANCONTAINERPROFILE_STOPPED_CAMERA: "http://schema.dases.eu/xapi/profile/virtual-classroom/verb/stopped-camera",
        SHARED_SCREEN: "http://schema.dases.eu/xapi/profile/virtual-classroom/verb/shared-screen",
        ORPHANCONTAINERPROFILE_SHARED_SCREEN: "http://schema.dases.eu/xapi/profile/virtual-classroom/verb/shared-screen",
        UNSHARED_SCREEN: "http://schema.dases.eu/xapi/profile/virtual-classroom/verb/unshared-screen",
        ORPHANCONTAINERPROFILE_UNSHARED_SCREEN: "http://schema.dases.eu/xapi/profile/virtual-classroom/verb/unshared-screen",
        RAISED_HAND: "http://schema.dases.eu/xapi/profile/virtual-classroom/verb/raised-hand",
        ORPHANCONTAINERPROFILE_RAISED_HAND: "http://schema.dases.eu/xapi/profile/virtual-classroom/verb/raised-hand",
        LOWERED_HAND: "http://schema.dases.eu/xapi/profile/virtual-classroom/verb/lowered-hand",
        ORPHANCONTAINERPROFILE_LOWERED_HAND: "http://schema.dases.eu/xapi/profile/virtual-classroom/verb/lowered-hand",
        MODIFIED_ANNOTATION: "http://risc-inc.com/annotator/verbs/modified",
        PDFANNOTATORPROFILE_MODIFIED_ANNOTATION: "http://risc-inc.com/annotator/verbs/modified",
        SEARCHED_2: "https://w3id.org/xapi/performance-support/performance-support/verbs/searched",
        PERFORMANCESUPPORTPROFILE_SEARCHED_2: "https://w3id.org/xapi/performance-support/performance-support/verbs/searched",
        SEARCHED_3: "https://w3id.org/xapi/performance-support/verbs/searched",
        PERFORMANCESUPPORTPROFILE_SEARCHED_3: "https://w3id.org/xapi/performance-support/verbs/searched",
        UNLOCKED: "https://w3id.org/xapi/seriousgames/verbs/unlocked",
        SERIOUSGAMESPROFILE_UNLOCKED: "https://w3id.org/xapi/seriousgames/verbs/unlocked",
        LOVED: "https://xapi.org.au/sociallearningprofile/loved",
        SOCIALMEDIAPROFILE_LOVED: "https://xapi.org.au/sociallearningprofile/loved",
        RESTARTED: "https://w3id.org/xapi/task-trainer-simulation/verbs/restarted",
        TASKTRAINERSIMULATIONPROFILE_RESTARTED: "https://w3id.org/xapi/task-trainer-simulation/verbs/restarted",
        ADJOURNED: "http://id.tincanapi.com/verb/adjourned",
        TINCANVOCABULARYPROFILE_ADJOURNED: "http://id.tincanapi.com/verb/adjourned",
        APPLAUDED: "http://id.tincanapi.com/verb/applauded",
        TINCANVOCABULARYPROFILE_APPLAUDED: "http://id.tincanapi.com/verb/applauded",
        CALLED: "http://id.tincanapi.com/verb/called",
        TINCANVOCABULARYPROFILE_CALLED: "http://id.tincanapi.com/verb/called",
        CLOSED_SALE: "http://id.tincanapi.com/verb/closed-sale",
        TINCANVOCABULARYPROFILE_CLOSED_SALE: "http://id.tincanapi.com/verb/closed-sale",
        CREATED_OPPORTUNITY: "http://id.tincanapi.com/verb/created-opportunity",
        TINCANVOCABULARYPROFILE_CREATED_OPPORTUNITY: "http://id.tincanapi.com/verb/created-opportunity",
        DISABLED: "http://id.tincanapi.com/verb/disabled",
        TINCANVOCABULARYPROFILE_DISABLED: "http://id.tincanapi.com/verb/disabled",
        DISCARDED: "http://id.tincanapi.com/verb/discarded",
        TINCANVOCABULARYPROFILE_DISCARDED: "http://id.tincanapi.com/verb/discarded",
        DOWNLOADED: "http://id.tincanapi.com/verb/downloaded",
        TINCANVOCABULARYPROFILE_DOWNLOADED: "http://id.tincanapi.com/verb/downloaded",
        EARNED: "http://id.tincanapi.com/verb/earned",
        TINCANVOCABULARYPROFILE_EARNED: "http://id.tincanapi.com/verb/earned",
        ENABLED: "http://id.tincanapi.com/verb/enabled",
        TINCANVOCABULARYPROFILE_ENABLED: "http://id.tincanapi.com/verb/enabled",
        ENTERED_FRAME: "http://id.tincanapi.com/verb/frame/entered",
        TINCANVOCABULARYPROFILE_ENTERED_FRAME: "http://id.tincanapi.com/verb/frame/entered",
        ESTIMATED_DURATION: "http://id.tincanapi.com/verb/estimated-duration",
        TINCANVOCABULARYPROFILE_ESTIMATED_DURATION: "http://id.tincanapi.com/verb/estimated-duration",
        EXITED_FRAME: "http://id.tincanapi.com/verb/frame/exited",
        TINCANVOCABULARYPROFILE_EXITED_FRAME: "http://id.tincanapi.com/verb/frame/exited",
        EXPECTED: "http://id.tincanapi.com/verb/expected",
        TINCANVOCABULARYPROFILE_EXPECTED: "http://id.tincanapi.com/verb/expected",
        EXPIRED: "http://id.tincanapi.com/verb/expired",
        TINCANVOCABULARYPROFILE_EXPIRED: "http://id.tincanapi.com/verb/expired",
        FOCUSED: "http://id.tincanapi.com/verb/focused",
        TINCANVOCABULARYPROFILE_FOCUSED: "http://id.tincanapi.com/verb/focused",
        HIRED: "http://id.tincanapi.com/verb/hired",
        TINCANVOCABULARYPROFILE_HIRED: "http://id.tincanapi.com/verb/hired",
        INTERVIEWED: "http://id.tincanapi.com/verb/interviewed",
        TINCANVOCABULARYPROFILE_INTERVIEWED: "http://id.tincanapi.com/verb/interviewed",
        LAUGHED: "http://id.tincanapi.com/verb/laughed",
        TINCANVOCABULARYPROFILE_LAUGHED: "http://id.tincanapi.com/verb/laughed",
        MARKED_AS_UNREAD: "http://id.tincanapi.com/verb/marked-unread",
        TINCANVOCABULARYPROFILE_MARKED_AS_UNREAD: "http://id.tincanapi.com/verb/marked-unread",
        MENTIONED: "http://id.tincanapi.com/verb/mentioned",
        TINCANVOCABULARYPROFILE_MENTIONED: "http://id.tincanapi.com/verb/mentioned",
        MENTORED: "http://id.tincanapi.com/verb/mentored",
        TINCANVOCABULARYPROFILE_MENTORED: "http://id.tincanapi.com/verb/mentored",
        PERFORMED_OFFLINE: "http://id.tincanapi.com/verb/performed-offline",
        TINCANVOCABULARYPROFILE_PERFORMED_OFFLINE: "http://id.tincanapi.com/verb/performed-offline",
        PERSONALIZED: "http://id.tincanapi.com/verb/personalized",
        TINCANVOCABULARYPROFILE_PERSONALIZED: "http://id.tincanapi.com/verb/personalized",
        PREVIEWED: "http://id.tincanapi.com/verb/previewed",
        TINCANVOCABULARYPROFILE_PREVIEWED: "http://id.tincanapi.com/verb/previewed",
        REPLIED: "http://id.tincanapi.com/verb/replied",
        TINCANVOCABULARYPROFILE_REPLIED: "http://id.tincanapi.com/verb/replied",
        REPLIED_TO_TWEET: "http://id.tincanapi.com/verb/replied-to-tweet",
        TINCANVOCABULARYPROFILE_REPLIED_TO_TWEET: "http://id.tincanapi.com/verb/replied-to-tweet",
        REQUESTED_ATTENTION: "http://id.tincanapi.com/verb/requested-attention",
        TINCANVOCABULARYPROFILE_REQUESTED_ATTENTION: "http://id.tincanapi.com/verb/requested-attention",
        RETWEETED: "http://id.tincanapi.com/verb/retweeted",
        TINCANVOCABULARYPROFILE_RETWEETED: "http://id.tincanapi.com/verb/retweeted",
        SKIPPED: "http://id.tincanapi.com/verb/skipped",
        TINCANVOCABULARYPROFILE_SKIPPED: "http://id.tincanapi.com/verb/skipped",
        TALKEDWITH: "http://id.tincanapi.com/verb/talked-with",
        TINCANVOCABULARYPROFILE_TALKEDWITH: "http://id.tincanapi.com/verb/talked-with",
        TWEETED: "http://id.tincanapi.com/verb/tweeted",
        TINCANVOCABULARYPROFILE_TWEETED: "http://id.tincanapi.com/verb/tweeted",
        UNFOCUSED: "http://id.tincanapi.com/verb/unfocused",
        TINCANVOCABULARYPROFILE_UNFOCUSED: "http://id.tincanapi.com/verb/unfocused",
        UNREGISTERED: "http://id.tincanapi.com/verb/unregistered",
        TINCANVOCABULARYPROFILE_UNREGISTERED: "http://id.tincanapi.com/verb/unregistered",
        VIEWED: "http://id.tincanapi.com/verb/viewed",
        TINCANVOCABULARYPROFILE_VIEWED: "http://id.tincanapi.com/verb/viewed",
        VOTED_DOWN: "http://id.tincanapi.com/verb/voted-down",
        TINCANVOCABULARYPROFILE_VOTED_DOWN: "http://id.tincanapi.com/verb/voted-down",
        VOTED_UP: "http://id.tincanapi.com/verb/voted-up",
        TINCANVOCABULARYPROFILE_VOTED_UP: "http://id.tincanapi.com/verb/voted-up",
        SEEKED: "https://w3id.org/xapi/video/verbs/seeked",
        VIDEOPROFILE_SEEKED: "https://w3id.org/xapi/video/verbs/seeked",
    }),
    ACTIVITYTYPES: Object.freeze({
        MESSAGE: "https://w3id.org/xapi/acrossx/activities/message",
        ACROSSXPROFILE_MESSAGE: "https://w3id.org/xapi/acrossx/activities/message",
        COLLABORATION: "https://w3id.org/xapi/acrossx/activities/collaboration",
        ACROSSXPROFILE_COLLABORATION: "https://w3id.org/xapi/acrossx/activities/collaboration",
        E_BOOK: "https://w3id.org/xapi/acrossx/activities/e-book",
        ACROSSXPROFILE_E_BOOK: "https://w3id.org/xapi/acrossx/activities/e-book",
        FACE_TO_FACE_DISCUSSION: "https://w3id.org/xapi/acrossx/activities/face-to-face-discussion",
        ACROSSXPROFILE_FACE_TO_FACE_DISCUSSION: "https://w3id.org/xapi/acrossx/activities/face-to-face-discussion",
        INSTANT_RESPONSE_SYSTEM: "https://w3id.org/xapi/acrossx/activities/instant-response-system",
        ACROSSXPROFILE_INSTANT_RESPONSE_SYSTEM: "https://w3id.org/xapi/acrossx/activities/instant-response-system",
        LEARNING_PLAN: "https://w3id.org/xapi/acrossx/activities/learning-plan",
        ACROSSXPROFILE_LEARNING_PLAN: "https://w3id.org/xapi/acrossx/activities/learning-plan",
        NOTE: "http://activitystrea.ms/note",
        ACROSSXPROFILE_NOTE: "https://w3id.org/xapi/acrossx/activities/note",
        ACTIVITYSTREAMSVOCABULARYPROFILE_NOTE: "http://activitystrea.ms/note",
        ONLINE_DISCUSSION: "https://w3id.org/xapi/acrossx/activities/online-discussion",
        ACROSSXPROFILE_ONLINE_DISCUSSION: "https://w3id.org/xapi/acrossx/activities/online-discussion",
        PAGE: "http://activitystrea.ms/page",
        ACROSSXPROFILE_PAGE: "https://w3id.org/xapi/acrossx/activities/page",
        ACTIVITYSTREAMSVOCABULARYPROFILE_PAGE: "http://activitystrea.ms/page",
        PRINTED_ASSESSMENT: "https://ed3chain.com/xapi/boll/activity#printed-assessment",
        ACROSSXPROFILE_PRINTED_ASSESSMENT: "https://w3id.org/xapi/acrossx/activities/printed-assessment",
        BOLLPROFILE_PRINTED_ASSESSMENT: "https://ed3chain.com/xapi/boll/activity#printed-assessment",
        PRINTED_BOOK: "https://w3id.org/xapi/acrossx/activities/printed-book",
        ACROSSXPROFILE_PRINTED_BOOK: "https://w3id.org/xapi/acrossx/activities/printed-book",
        PRINTED_WORKSHEET: "https://w3id.org/xapi/acrossx/activities/printed-worksheet",
        ACROSSXPROFILE_PRINTED_WORKSHEET: "https://w3id.org/xapi/acrossx/activities/printed-worksheet",
        SEARCH_ENGINE: "https://w3id.org/xapi/acrossx/activities/search-engine",
        ACROSSXPROFILE_SEARCH_ENGINE: "https://w3id.org/xapi/acrossx/activities/search-engine",
        VIDEO: "https://w3id.org/xapi/video/activity-type/video",
        ACROSSXPROFILE_VIDEO: "https://w3id.org/xapi/acrossx/activities/video",
        ACTIVITYSTREAMSVOCABULARYPROFILE_VIDEO: "http://activitystrea.ms/video",
        VIDEOPROFILE_VIDEO: "https://w3id.org/xapi/video/activity-type/video",
        WEBPAGE: "https://w3id.org/xapi/acrossx/activities/webpage",
        ACROSSXPROFILE_WEBPAGE: "https://w3id.org/xapi/acrossx/activities/webpage",
        ALERT: "http://activitystrea.ms/alert",
        ACTIVITYSTREAMSVOCABULARYPROFILE_ALERT: "http://activitystrea.ms/alert",
        APPLICATION: "https://w3id.org/xapi/performance-support/performance-support/activity-types/application",
        ACTIVITYSTREAMSVOCABULARYPROFILE_APPLICATION: "http://activitystrea.ms/application",
        PERFORMANCESUPPORTPROFILE_APPLICATION: "https://w3id.org/xapi/performance-support/performance-support/activity-types/application",
        ARTICLE: "http://activitystrea.ms/article",
        ACTIVITYSTREAMSVOCABULARYPROFILE_ARTICLE: "http://activitystrea.ms/article",
        AUDIO: "https://w3id.org/xapi/hros-asessment/activitytypes/audio",
        ACTIVITYSTREAMSVOCABULARYPROFILE_AUDIO: "http://activitystrea.ms/audio",
        AUDIOPROFILE_AUDIO: "https://w3id.org/xapi/audio/activity-type/audio",
        HROPENASSESSMENTSPROFILE_AUDIO: "https://w3id.org/xapi/hros-asessment/activitytypes/audio",
        BADGE: "https://w3id.org/xapi/tla/activity-types/badge",
        ACTIVITYSTREAMSVOCABULARYPROFILE_BADGE: "http://activitystrea.ms/badge",
        TLAPROFILE_BADGE: "https://w3id.org/xapi/tla/activity-types/badge",
        BINARY: "http://activitystrea.ms/binary",
        ACTIVITYSTREAMSVOCABULARYPROFILE_BINARY: "http://activitystrea.ms/binary",
        BOOKMARK: "http://activitystrea.ms/bookmark",
        ACTIVITYSTREAMSVOCABULARYPROFILE_BOOKMARK: "http://activitystrea.ms/bookmark",
        COLLECTION: "http://activitystrea.ms/collection",
        ACTIVITYSTREAMSVOCABULARYPROFILE_COLLECTION: "http://activitystrea.ms/collection",
        COMMENT: "http://activitystrea.ms/comment",
        ACTIVITYSTREAMSVOCABULARYPROFILE_COMMENT: "http://activitystrea.ms/comment",
        DEVICE: "http://activitystrea.ms/device",
        ACTIVITYSTREAMSVOCABULARYPROFILE_DEVICE: "http://activitystrea.ms/device",
        EVENT: "http://activitystrea.ms/event",
        ACTIVITYSTREAMSVOCABULARYPROFILE_EVENT: "http://activitystrea.ms/event",
        FILE: "http://adlnet.gov/expapi/activities/file",
        ACTIVITYSTREAMSVOCABULARYPROFILE_FILE: "http://activitystrea.ms/file",
        ADLVOCABULARYPROFILE_FILE: "http://adlnet.gov/expapi/activities/file",
        GAME: "http://activitystrea.ms/game",
        ACTIVITYSTREAMSVOCABULARYPROFILE_GAME: "http://activitystrea.ms/game",
        GROUP: "http://activitystrea.ms/group",
        ACTIVITYSTREAMSVOCABULARYPROFILE_GROUP: "http://activitystrea.ms/group",
        IMAGE: "https://w3id.org/xapi/performance-support/activity-types/image",
        ACTIVITYSTREAMSVOCABULARYPROFILE_IMAGE: "http://activitystrea.ms/image",
        PERFORMANCESUPPORTPROFILE_IMAGE: "https://w3id.org/xapi/performance-support/activity-types/image",
        ISSUE: "http://activitystrea.ms/issue",
        ACTIVITYSTREAMSVOCABULARYPROFILE_ISSUE: "http://activitystrea.ms/issue",
        JOB: "http://activitystrea.ms/job",
        ACTIVITYSTREAMSVOCABULARYPROFILE_JOB: "http://activitystrea.ms/job",
        OFFER: "http://activitystrea.ms/offer",
        ACTIVITYSTREAMSVOCABULARYPROFILE_OFFER: "http://activitystrea.ms/offer",
        ORGANIZATION: "https://w3id.org/xapi/netc/activity-types/organization",
        ACTIVITYSTREAMSVOCABULARYPROFILE_ORGANIZATION: "http://activitystrea.ms/organization",
        NAVYCOMMONREFERENCEPROFILE_ORGANIZATION: "https://w3id.org/xapi/netc/activity-types/organization",
        PERSON: "http://activitystrea.ms/person",
        ACTIVITYSTREAMSVOCABULARYPROFILE_PERSON: "http://activitystrea.ms/person",
        PLACE: "https://xapi.org.au/geolocationprofileprofile/activity/place",
        ACTIVITYSTREAMSVOCABULARYPROFILE_PLACE: "http://activitystrea.ms/place",
        GEOLOCATIONPROFILE_PLACE: "https://xapi.org.au/geolocationprofileprofile/activity/place",
        PROCESS: "http://activitystrea.ms/process",
        ACTIVITYSTREAMSVOCABULARYPROFILE_PROCESS: "http://activitystrea.ms/process",
        PRODUCT: "http://activitystrea.ms/product",
        ACTIVITYSTREAMSVOCABULARYPROFILE_PRODUCT: "http://activitystrea.ms/product",
        QUESTION: "http://adlnet.gov/expapi/activities/question",
        ACTIVITYSTREAMSVOCABULARYPROFILE_QUESTION: "http://activitystrea.ms/question",
        ADLVOCABULARYPROFILE_QUESTION: "http://adlnet.gov/expapi/activities/question",
        REVIEW: "http://activitystrea.ms/review",
        ACTIVITYSTREAMSVOCABULARYPROFILE_REVIEW: "http://activitystrea.ms/review",
        SERVICE: "http://activitystrea.ms/service",
        ACTIVITYSTREAMSVOCABULARYPROFILE_SERVICE: "http://activitystrea.ms/service",
        TASK: "https://w3id.org/xapi/performance-support/activity-types/task",
        ACTIVITYSTREAMSVOCABULARYPROFILE_TASK: "http://activitystrea.ms/task",
        PERFORMANCESUPPORTPROFILE_TASK: "https://w3id.org/xapi/performance-support/activity-types/task",
        LINK: "http://adlnet.gov/expapi/activities/link",
        ADLVOCABULARYPROFILE_LINK: "http://adlnet.gov/expapi/activities/link",
        MEDIA: "http://adlnet.gov/expapi/activities/media",
        ADLVOCABULARYPROFILE_MEDIA: "http://adlnet.gov/expapi/activities/media",
        MEETING: "http://adlnet.gov/expapi/activities/meeting",
        ADLVOCABULARYPROFILE_MEETING: "http://adlnet.gov/expapi/activities/meeting",
        PERFORMANCE: "http://adlnet.gov/expapi/activities/performance",
        ADLVOCABULARYPROFILE_PERFORMANCE: "http://adlnet.gov/expapi/activities/performance",
        SIMULATION: "http://adlnet.gov/expapi/activities/simulation",
        ADLVOCABULARYPROFILE_SIMULATION: "http://adlnet.gov/expapi/activities/simulation",
        CREDENTIAL: "https://w3id.org/xapi/tla/activity-types/credential",
        BOLLPROFILE_CREDENTIAL: "https://ed3chain.com/xapi/boll/activity#credential",
        TLAPROFILE_CREDENTIAL: "https://w3id.org/xapi/tla/activity-types/credential",
        PROGRAM: "https://ed3chain.com/xapi/boll/activities#program",
        BOLLPROFILE_PROGRAM: "https://ed3chain.com/xapi/boll/activities#program",
        LMS_COURSE: "http://id.tincanapi.com/activitytype/lms/course",
        BOLLPROFILE_LMS_COURSE: "http://id.tincanapi.com/activitytype/lms/course",
        BLOCK: "https://w3id.org/xapi/cmi5/activitytype/block",
        CMI5PROFILE_BLOCK: "https://w3id.org/xapi/cmi5/activitytype/block",
        COURSE: "http://adlnet.gov/expapi/activities/course",
        CMI5PROFILE_COURSE: "https://w3id.org/xapi/cmi5/activitytype/course",
        SCORMPROFILE_COURSE: "http://adlnet.gov/expapi/activities/course",
        SURVEY: "https://xapi.org.au/contentprofile/activitytype/survey",
        CONTENTREPOSITORYPROFILE_SURVEY: "https://xapi.org.au/contentprofile/activitytype/survey",
        JOURNAL_ARTICLE: "http://xapi.org.au/contentprofile/activitytype/journal_article",
        CONTENTREPOSITORYPROFILE_JOURNAL_ARTICLE: "http://xapi.org.au/contentprofile/activitytype/journal_article",
        FEEDBACK_INTERACTION: "https://xapi.com.au/activities/feedback",
        FEEDBACKINTERACTIONPROFILE_FEEDBACK_INTERACTION: "https://xapi.com.au/activities/feedback",
        FLASHCARD_DECK: "https://w3id.org/xapi/flashcards/activity-types/flashcard-deck",
        FLASHCARDSPROFILE_FLASHCARD_DECK: "https://w3id.org/xapi/flashcards/activity-types/flashcard-deck",
        FLASHCARD: "https://w3id.org/xapi/flashcards/activity-types/flashcard",
        FLASHCARDSPROFILE_FLASHCARD: "https://w3id.org/xapi/flashcards/activity-types/flashcard",
        MANEUVER: "https://pttportal.af.mil/xapi/activity-type/maneuver",
        FLYINGPROFILE_MANEUVER: "https://pttportal.af.mil/xapi/activity-type/maneuver",
        FLIGHT_OPERATION: "https://pttportal.af.mil/xapi/activity-type/flight-operation",
        FLYINGPROFILE_FLIGHT_OPERATION: "https://pttportal.af.mil/xapi/activity-type/flight-operation",
        GROUND_TRAINING_LESSON: "https://pttportal.af.mil/xapi/activity-type/ground-training-lesson",
        GROUNDTRAININGPROFILE_GROUND_TRAINING_LESSON: "https://pttportal.af.mil/xapi/activity-type/ground-training-lesson",
        GROUND_TRAINING_ASSESSMENT: "https://pttportal.af.mil/xapi/activity-type/ground-training-assessment",
        GROUNDTRAININGPROFILE_GROUND_TRAINING_ASSESSMENT: "https://pttportal.af.mil/xapi/activity-type/ground-training-assessment",
        CODE_ASSESSMENT: "https://w3id.org/xapi/hros-asessment/activitytypes/codeassessment",
        HROPENASSESSMENTSPROFILE_CODE_ASSESSMENT: "https://w3id.org/xapi/hros-asessment/activitytypes/codeassessment",
        POLICE_ASSESSMENT: "https://w3id.org/xapi/hros-asessment/activitytypes/policeassessment",
        HROPENASSESSMENTSPROFILE_POLICE_ASSESSMENT: "https://w3id.org/xapi/hros-asessment/activitytypes/policeassessment",
        PERSONALITY_ASSESSMENT: "https://w3id.org/xapi/hros-asessment/activitytypes/personalityassessment",
        HROPENASSESSMENTSPROFILE_PERSONALITY_ASSESSMENT: "https://w3id.org/xapi/hros-asessment/activitytypes/personalityassessment",
        PSYCHOMETRIC_ASSESSMENT: "https://w3id.org/xapi/hros-asessment/activitytypes/psychometricassessment",
        HROPENASSESSMENTSPROFILE_PSYCHOMETRIC_ASSESSMENT: "https://w3id.org/xapi/hros-asessment/activitytypes/psychometricassessment",
        LEADERSHIP_ASSESSMENT: "https://w3id.org/xapi/hros-asessment/activitytypes/leadershipassessment",
        HROPENASSESSMENTSPROFILE_LEADERSHIP_ASSESSMENT: "https://w3id.org/xapi/hros-asessment/activitytypes/leadershipassessment",
        WORK_SAMPLE_ASSESSMENT: "https://w3id.org/xapi/hros-asessment/activitytypes/worksampleassessment",
        HROPENASSESSMENTSPROFILE_WORK_SAMPLE_ASSESSMENT: "https://w3id.org/xapi/hros-asessment/activitytypes/worksampleassessment",
        VIRTUAL_REALITY_ASSESSMENT: "https://w3id.org/xapi/hros-asessment/activitytypes/vrassessment",
        HROPENASSESSMENTSPROFILE_VIRTUAL_REALITY_ASSESSMENT: "https://w3id.org/xapi/hros-asessment/activitytypes/vrassessment",
        FIELD_ASSESSMENT: "https://w3id.org/xapi/hros-asessment/activitytypes/fieldassessment",
        HROPENASSESSMENTSPROFILE_FIELD_ASSESSMENT: "https://w3id.org/xapi/hros-asessment/activitytypes/fieldassessment",
        CLASS_SECTION: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/class-section",
        HYFLEXCLASSROOMPROFILE_CLASS_SECTION: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/class-section",
        HIGHLIGHT_VIDEO: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/highlight-video",
        HYFLEXCLASSROOMPROFILE_HIGHLIGHT_VIDEO: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/highlight-video",
        PHOTO: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/photo",
        HYFLEXCLASSROOMPROFILE_PHOTO: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/photo",
        SECOND_DEVICE: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/second-device",
        HYFLEXCLASSROOMPROFILE_SECOND_DEVICE: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/second-device",
        WHISPER: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/whisper",
        HYFLEXCLASSROOMPROFILE_WHISPER: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/whisper",
        SPEAK: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/speak",
        HYFLEXCLASSROOMPROFILE_SPEAK: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/speak",
        CONCENTRATION: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/concentration",
        HYFLEXCLASSROOMPROFILE_CONCENTRATION: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/concentration",
        FEEDBACK_ON_CLASS: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/feedback",
        HYFLEXCLASSROOMPROFILE_FEEDBACK_ON_CLASS: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/activitytype/feedback",
        COMPETENCY: "https://w3id.org/xapi/tla/activity-types/competency",
        TLAPROFILE_COMPETENCY: "https://w3id.org/xapi/tla/activity-types/competency",
        ACTIVITY: "https://w3id.org/xapi/tla/activity-types/activity",
        TLAPROFILE_ACTIVITY: "https://w3id.org/xapi/tla/activity-types/activity",
        ASSESSMENT: "http://adlnet.gov/expapi/activities/assessment",
        TLAPROFILE_ASSESSMENT: "https://w3id.org/xapi/tla/activity-types/assessment",
        SCORMPROFILE_ASSESSMENT: "http://adlnet.gov/expapi/activities/assessment",
        CONTENT_SET: "https://w3id.org/xapi/tla/activity-types/content_set",
        TLAPROFILE_CONTENT_SET: "https://w3id.org/xapi/tla/activity-types/content_set",
        CAREER: "https://w3id.org/xapi/tla/activity-types/career",
        TLAPROFILE_CAREER: "https://w3id.org/xapi/tla/activity-types/career",
        CAREER_STATE: "https://w3id.org/xapi/tla/activity-types/career_state",
        TLAPROFILE_CAREER_STATE: "https://w3id.org/xapi/tla/activity-types/career_state",
        JOB_DUTY_GIG: "https://w3id.org/xapi/tla/activity-types/job_duty_gig",
        TLAPROFILE_JOB_DUTY_GIG: "https://w3id.org/xapi/tla/activity-types/job_duty_gig",
        MENU: "https://w3id.org/xapi/seriousgames/activity-types/menu",
        NAVYCOMMONREFERENCEPROFILE_MENU: "https://w3id.org/xapi/netc/activity-types/menu",
        SERIOUSGAMESPROFILE_MENU: "https://w3id.org/xapi/seriousgames/activity-types/menu",
        MENU_ITEM: "https://w3id.org/xapi/netc/activity-types/menu-item",
        NAVYCOMMONREFERENCEPROFILE_MENU_ITEM: "https://w3id.org/xapi/netc/activity-types/menu-item",
        SECTION: "http://id.tincanapi.com/activitytype/section",
        NAVYELEARNINGPROFILE_SECTION: "https://w3id.org/xapi/netc-e-learning/activity-types/section",
        TINCANVOCABULARYPROFILE_SECTION: "http://id.tincanapi.com/activitytype/section",
        SIMULATION_SESSION: "https://profiles.adlnet.gov/xapi/917114b6-71b4-4fcd-b6d3-892890594446/activitytype/Preflight",
        ORPHANCONTAINERPROFILE_SIMULATION_SESSION: "https://profiles.adlnet.gov/xapi/917114b6-71b4-4fcd-b6d3-892890594446/activitytype/Preflight",
        VIRTUAL_CLASSROOM: "https://w3id.org/xapi/virtual-classroom/activity-types/virtual-classroom",
        ORPHANCONTAINERPROFILE_VIRTUAL_CLASSROOM: "https://w3id.org/xapi/virtual-classroom/activityt-types/virtual-classroom",
        VIRTUALCLASSROOMPROFILE_VIRTUAL_CLASSROOM: "https://w3id.org/xapi/virtual-classroom/activity-types/virtual-classroom",
        HIGHLIGHTED_TEXT_ANNOTATION: "http://risc-inc.com/annotator/activities/highlight",
        PDFANNOTATORPROFILE_HIGHLIGHTED_TEXT_ANNOTATION: "http://risc-inc.com/annotator/activities/highlight",
        NOTE_ANNOTATION: "http://risc-inc.com/annotator/activities/note",
        PDFANNOTATORPROFILE_NOTE_ANNOTATION: "http://risc-inc.com/annotator/activities/note",
        UNDERLINE_ANNOTATION: "http://risc-inc.com/annotator/activities/underline",
        PDFANNOTATORPROFILE_UNDERLINE_ANNOTATION: "http://risc-inc.com/annotator/activities/underline",
        FREETEXT_ANNOTATION: "http://www.risc-inc.com/annotator/activities/freetext",
        PDFANNOTATORPROFILE_FREETEXT_ANNOTATION: "http://www.risc-inc.com/annotator/activities/freetext",
        PERFORMANCE_SUPPORT: "https://w3id.org/xapi/performance-support/performance-support/activity-types/image",
        PERFORMANCESUPPORTPROFILE_PERFORMANCE_SUPPORT: "https://w3id.org/xapi/performance-support/performance-support/activity-types/image",
        PROCEDURE: "https://w3id.org/xapi/performance-support/performance-support/activity-types/procedure",
        PERFORMANCESUPPORTPROFILE_PROCEDURE: "https://w3id.org/xapi/performance-support/performance-support/activity-types/procedure",
        APPLICATION_2: "https://w3id.org/xapi/performance-support/activity-types/application",
        PERFORMANCESUPPORTPROFILE_APPLICATION_2: "https://w3id.org/xapi/performance-support/activity-types/application",
        PROCEDURE_2: "https://w3id.org/xapi/performance-support/activity-types/procedure",
        PERFORMANCESUPPORTPROFILE_PROCEDURE_2: "https://w3id.org/xapi/performance-support/activity-types/procedure",
        ATTEMPT: "http://adlnet.gov/expapi/activities/attempt",
        SCORMPROFILE_ATTEMPT: "http://adlnet.gov/expapi/activities/attempt",
        LESSON: "http://adlnet.gov/expapi/activities/lesson",
        SCORMPROFILE_LESSON: "http://adlnet.gov/expapi/activities/lesson",
        MODULE: "http://adlnet.gov/expapi/activities/module",
        SCORMPROFILE_MODULE: "http://adlnet.gov/expapi/activities/module",
        OBJECTIVE: "http://adlnet.gov/expapi/activities/objective",
        SCORMPROFILE_OBJECTIVE: "http://adlnet.gov/expapi/activities/objective",
        PROFILE: "http://adlnet.gov/expapi/activities/profile",
        SCORMPROFILE_PROFILE: "http://adlnet.gov/expapi/activities/profile",
        CMI_INTERACTION: "http://adlnet.gov/expapi/activities/cmi.interaction",
        SCORMPROFILE_CMI_INTERACTION: "http://adlnet.gov/expapi/activities/cmi.interaction",
        AREA: "https://w3id.org/xapi/seriousgames/activity-types/area",
        SERIOUSGAMESPROFILE_AREA: "https://w3id.org/xapi/seriousgames/activity-types/area",
        CONTROLLER: "https://w3id.org/xapi/seriousgames/activity-types/controller",
        SERIOUSGAMESPROFILE_CONTROLLER: "https://w3id.org/xapi/seriousgames/activity-types/controller",
        CUTSCENE: "https://w3id.org/xapi/seriousgames/activity-types/cutscene",
        SERIOUSGAMESPROFILE_CUTSCENE: "https://w3id.org/xapi/seriousgames/activity-types/cutscene",
        DIALOG_TREE: "https://w3id.org/xapi/seriousgames/activity-types/dialog-tree",
        SERIOUSGAMESPROFILE_DIALOG_TREE: "https://w3id.org/xapi/seriousgames/activity-types/dialog-tree",
        ENEMY: "https://w3id.org/xapi/seriousgames/activity-types/enemy",
        SERIOUSGAMESPROFILE_ENEMY: "https://w3id.org/xapi/seriousgames/activity-types/enemy",
        ITEM: "https://w3id.org/xapi/seriousgames/activity-types/item",
        SERIOUSGAMESPROFILE_ITEM: "https://w3id.org/xapi/seriousgames/activity-types/item",
        KEYBOARD: "https://w3id.org/xapi/seriousgames/activity-types/keyboard",
        SERIOUSGAMESPROFILE_KEYBOARD: "https://w3id.org/xapi/seriousgames/activity-types/keyboard",
        LEVEL: "https://w3id.org/xapi/seriousgames/activity-types/level",
        SERIOUSGAMESPROFILE_LEVEL: "https://w3id.org/xapi/seriousgames/activity-types/level",
        MOUSE: "https://w3id.org/xapi/seriousgames/activity-types/mouse",
        SERIOUSGAMESPROFILE_MOUSE: "https://w3id.org/xapi/seriousgames/activity-types/mouse",
        NON_PLAYER_CHARACTER: "https://w3id.org/xapi/seriousgames/activity-types/non-player-character",
        SERIOUSGAMESPROFILE_NON_PLAYER_CHARACTER: "https://w3id.org/xapi/seriousgames/activity-types/non-player-character",
        QUEST: "https://w3id.org/xapi/seriousgames/activity-types/quest",
        SERIOUSGAMESPROFILE_QUEST: "https://w3id.org/xapi/seriousgames/activity-types/quest",
        SCREEN: "https://w3id.org/xapi/seriousgames/activity-types/screen",
        SERIOUSGAMESPROFILE_SCREEN: "https://w3id.org/xapi/seriousgames/activity-types/screen",
        SERIOUS_GAME: "https://w3id.org/xapi/seriousgames/activity-types/serious-game",
        SERIOUSGAMESPROFILE_SERIOUS_GAME: "https://w3id.org/xapi/seriousgames/activity-types/serious-game",
        TOUCHSCREEN: "https://w3id.org/xapi/seriousgames/activity-types/touchscreen",
        SERIOUSGAMESPROFILE_TOUCHSCREEN: "https://w3id.org/xapi/seriousgames/activity-types/touchscreen",
        ZONE: "https://w3id.org/xapi/seriousgames/activity-types/zone",
        SERIOUSGAMESPROFILE_ZONE: "https://w3id.org/xapi/seriousgames/activity-types/zone",
        TRAINING_PROGRAM: "https://pttportal.af.mil/xapi/activity-type/training-program",
        SYLLABUSEVENTSPROFILE_TRAINING_PROGRAM: "https://pttportal.af.mil/xapi/activity-type/training-program",
        SYLLABUS_UNIT: "https://pttportal.af.mil/xapi/activity-type/syllabus-unit",
        SYLLABUSEVENTSPROFILE_SYLLABUS_UNIT: "https://pttportal.af.mil/xapi/activity-type/syllabus-unit",
        SYLLABUS_PHASE: "https://pttportal.af.mil/xapi/activity-type/syllabus-phase",
        SYLLABUSEVENTSPROFILE_SYLLABUS_PHASE: "https://pttportal.af.mil/xapi/activity-type/syllabus-phase",
        SYLLABUS_EVENT: "https://pttportal.af.mil/xapi/activity-type/syllabus-event",
        SYLLABUSEVENTSPROFILE_SYLLABUS_EVENT: "https://pttportal.af.mil/xapi/activity-type/syllabus-event",
        FEEDBACK_CORRECTIVE: "https://w3id.org/xapi/task-trainer-simulation/activity-types/feedback-corrective",
        TASKTRAINERSIMULATIONPROFILE_FEEDBACK_CORRECTIVE: "https://w3id.org/xapi/task-trainer-simulation/activity-types/feedback-corrective",
        FEEDBACK_ERROR: "https://w3id.org/xapi/task-trainer-simulation/activity-types/feedback-error",
        TASKTRAINERSIMULATIONPROFILE_FEEDBACK_ERROR: "https://w3id.org/xapi/task-trainer-simulation/activity-types/feedback-error",
        FEEDBACK_PERFORMANCE: "https://w3id.org/xapi/task-trainer-simulation/activity-types/feedback-performance",
        TASKTRAINERSIMULATIONPROFILE_FEEDBACK_PERFORMANCE: "https://w3id.org/xapi/task-trainer-simulation/activity-types/feedback-performance",
        FEEDBACK_SAFETY: "https://w3id.org/xapi/task-trainer-simulation/activity-types/feedback-safety",
        TASKTRAINERSIMULATIONPROFILE_FEEDBACK_SAFETY: "https://w3id.org/xapi/task-trainer-simulation/activity-types/feedback-safety",
        TASK_TRAINER_DOCUMENT: "https://w3id.org/xapi/task-trainer-simulation/activity-types/task-trainer-document",
        TASKTRAINERSIMULATIONPROFILE_TASK_TRAINER_DOCUMENT: "https://w3id.org/xapi/task-trainer-simulation/activity-types/task-trainer-document",
        TASK_TRAINER_SCENARIO: "https://w3id.org/xapi/task-trainer-simulation/activity-types/task-trainer-scenario",
        TASKTRAINERSIMULATIONPROFILE_TASK_TRAINER_SCENARIO: "https://w3id.org/xapi/task-trainer-simulation/activity-types/task-trainer-scenario",
        TASK_TRAINER_STEP: "https://w3id.org/xapi/task-trainer-simulation/activity-types/task-trainer-step",
        TASKTRAINERSIMULATIONPROFILE_TASK_TRAINER_STEP: "https://w3id.org/xapi/task-trainer-simulation/activity-types/task-trainer-step",
        TASK_TRAINER_TASK: "https://w3id.org/xapi/task-trainer-simulation/activity-types/task-trainer-task",
        TASKTRAINERSIMULATIONPROFILE_TASK_TRAINER_TASK: "https://w3id.org/xapi/task-trainer-simulation/activity-types/task-trainer-task",
        TASK_TRAINER_TOOL: "https://w3id.org/xapi/task-trainer-simulation/activity-types/task-trainer-tool",
        TASKTRAINERSIMULATIONPROFILE_TASK_TRAINER_TOOL: "https://w3id.org/xapi/task-trainer-simulation/activity-types/task-trainer-tool",
        TEST_TEST: "https://w3id.org/xapi/simulation/activities/test-test",
        TASKTRAINERSIMULATIONPROFILE_TEST_TEST: "https://w3id.org/xapi/simulation/activities/test-test",
        BLOG: "http://id.tincanapi.com/activitytype/blog",
        TINCANVOCABULARYPROFILE_BLOG: "http://id.tincanapi.com/activitytype/blog",
        BOOK: "http://id.tincanapi.com/activitytype/book",
        TINCANVOCABULARYPROFILE_BOOK: "http://id.tincanapi.com/activitytype/book",
        CATEGORY: "http://id.tincanapi.com/activitytype/category",
        TINCANVOCABULARYPROFILE_CATEGORY: "http://id.tincanapi.com/activitytype/category",
        CHAPTER: "http://id.tincanapi.com/activitytype/chapter",
        TINCANVOCABULARYPROFILE_CHAPTER: "http://id.tincanapi.com/activitytype/chapter",
        CHAT_CHANNEL: "http://id.tincanapi.com/activitytype/chat-channel",
        TINCANVOCABULARYPROFILE_CHAT_CHANNEL: "http://id.tincanapi.com/activitytype/chat-channel",
        CHAT_MESSAGE: "http://id.tincanapi.com/activitytype/chat-message",
        TINCANVOCABULARYPROFILE_CHAT_MESSAGE: "http://id.tincanapi.com/activitytype/chat-message",
        CHECKLIST: "http://id.tincanapi.com/activitytype/checklist",
        TINCANVOCABULARYPROFILE_CHECKLIST: "http://id.tincanapi.com/activitytype/checklist",
        CHECKLIST_ITEM: "http://id.tincanapi.com/activitytype/checklist-item",
        TINCANVOCABULARYPROFILE_CHECKLIST_ITEM: "http://id.tincanapi.com/activitytype/checklist-item",
        CODE_COMMIT: "http://id.tincanapi.com/activitytype/code-commit",
        TINCANVOCABULARYPROFILE_CODE_COMMIT: "http://id.tincanapi.com/activitytype/code-commit",
        SIMPLE_COLLECTION: "http://id.tincanapi.com/activitytype/collection-simple",
        TINCANVOCABULARYPROFILE_SIMPLE_COLLECTION: "http://id.tincanapi.com/activitytype/collection-simple",
        COMMUNITY_SITE: "http://id.tincanapi.com/activitytype/community-site",
        TINCANVOCABULARYPROFILE_COMMUNITY_SITE: "http://id.tincanapi.com/activitytype/community-site",
        CONFERENCE: "http://id.tincanapi.com/activitytype/conference",
        TINCANVOCABULARYPROFILE_CONFERENCE: "http://id.tincanapi.com/activitytype/conference",
        CONFERENCE_SESSION: "http://id.tincanapi.com/activitytype/conference-session",
        TINCANVOCABULARYPROFILE_CONFERENCE_SESSION: "http://id.tincanapi.com/activitytype/conference-session",
        CONFERENCE_TRACK: "http://id.tincanapi.com/activitytype/conference-track",
        TINCANVOCABULARYPROFILE_CONFERENCE_TRACK: "http://id.tincanapi.com/activitytype/conference-track",
        DISCUSSION: "http://id.tincanapi.com/activitytype/discussion",
        TINCANVOCABULARYPROFILE_DISCUSSION: "http://id.tincanapi.com/activitytype/discussion",
        DOCUMENT: "http://id.tincanapi.com/activitytype/document",
        TINCANVOCABULARYPROFILE_DOCUMENT: "http://id.tincanapi.com/activitytype/document",
        DOUBT: "http://id.tincanapi.com/activitytype/doubt",
        TINCANVOCABULARYPROFILE_DOUBT: "http://id.tincanapi.com/activitytype/doubt",
        EMAIL: "http://id.tincanapi.com/activitytype/email",
        TINCANVOCABULARYPROFILE_EMAIL: "http://id.tincanapi.com/activitytype/email",
        ESSAY: "http://id.tincanapi.com/activitytype/essay",
        TINCANVOCABULARYPROFILE_ESSAY: "http://id.tincanapi.com/activitytype/essay",
        FORUM_REPLY: "http://id.tincanapi.com/activitytype/forum-reply",
        TINCANVOCABULARYPROFILE_FORUM_REPLY: "http://id.tincanapi.com/activitytype/forum-reply",
        FORUM_TOPIC: "http://id.tincanapi.com/activitytype/forum-topic",
        TINCANVOCABULARYPROFILE_FORUM_TOPIC: "http://id.tincanapi.com/activitytype/forum-topic",
        GOAL: "http://id.tincanapi.com/activitytype/goal",
        TINCANVOCABULARYPROFILE_GOAL: "http://id.tincanapi.com/activitytype/goal",
        LEGACY_LEARNING_STANDARD: "http://id.tincanapi.com/activitytype/legacy-learning-standard",
        TINCANVOCABULARYPROFILE_LEGACY_LEARNING_STANDARD: "http://id.tincanapi.com/activitytype/legacy-learning-standard",
        LMS: "http://id.tincanapi.com/activitytype/lms",
        TINCANVOCABULARYPROFILE_LMS: "http://id.tincanapi.com/activitytype/lms",
        PARAGRAPH: "http://id.tincanapi.com/activitytype/paragraph",
        TINCANVOCABULARYPROFILE_PARAGRAPH: "http://id.tincanapi.com/activitytype/paragraph",
        PLAYLIST: "http://id.tincanapi.com/activitytype/playlist",
        TINCANVOCABULARYPROFILE_PLAYLIST: "http://id.tincanapi.com/activitytype/playlist",
        PROJECT: "http://id.tincanapi.com/activitytype/project",
        TINCANVOCABULARYPROFILE_PROJECT: "http://id.tincanapi.com/activitytype/project",
        PROJECT_SITE: "http://id.tincanapi.com/activitytype/project-site",
        TINCANVOCABULARYPROFILE_PROJECT_SITE: "http://id.tincanapi.com/activitytype/project-site",
        RESEARCH_REPORT: "http://id.tincanapi.com/activitytype/research-report",
        TINCANVOCABULARYPROFILE_RESEARCH_REPORT: "http://id.tincanapi.com/activitytype/research-report",
        RESOURCE: "http://id.tincanapi.com/activitytype/resource",
        TINCANVOCABULARYPROFILE_RESOURCE: "http://id.tincanapi.com/activitytype/resource",
        REWARD: "http://id.tincanapi.com/activitytype/reward",
        TINCANVOCABULARYPROFILE_REWARD: "http://id.tincanapi.com/activitytype/reward",
        SALES_OPPORTUNITY: "http://id.tincanapi.com/activitytype/sales-opportunity",
        TINCANVOCABULARYPROFILE_SALES_OPPORTUNITY: "http://id.tincanapi.com/activitytype/sales-opportunity",
        SCENARIO: "http://id.tincanapi.com/activitytype/scenario",
        TINCANVOCABULARYPROFILE_SCENARIO: "http://id.tincanapi.com/activitytype/scenario",
        SCHOOL_ASSIGNMENT: "http://id.tincanapi.com/activitytype/school-assignment",
        TINCANVOCABULARYPROFILE_SCHOOL_ASSIGNMENT: "http://id.tincanapi.com/activitytype/school-assignment",
        SECURITY_ROLE: "http://id.tincanapi.com/activitytype/security-role",
        TINCANVOCABULARYPROFILE_SECURITY_ROLE: "http://id.tincanapi.com/activitytype/security-role",
        SLIDE: "http://id.tincanapi.com/activitytype/slide",
        TINCANVOCABULARYPROFILE_SLIDE: "http://id.tincanapi.com/activitytype/slide",
        SLIDE_DECK: "http://id.tincanapi.com/activitytype/slide-deck",
        TINCANVOCABULARYPROFILE_SLIDE_DECK: "http://id.tincanapi.com/activitytype/slide-deck",
        SOLUTION: "http://id.tincanapi.com/activitytype/solution",
        TINCANVOCABULARYPROFILE_SOLUTION: "http://id.tincanapi.com/activitytype/solution",
        SOURCE: "http://id.tincanapi.com/activitytype/source",
        TINCANVOCABULARYPROFILE_SOURCE: "http://id.tincanapi.com/activitytype/source",
        STATUS_UPDATE: "http://id.tincanapi.com/activitytype/status-update",
        TINCANVOCABULARYPROFILE_STATUS_UPDATE: "http://id.tincanapi.com/activitytype/status-update",
        STEP: "http://id.tincanapi.com/activitytype/step",
        TINCANVOCABULARYPROFILE_STEP: "http://id.tincanapi.com/activitytype/step",
        STRATEGY: "http://id.tincanapi.com/activitytype/strategy",
        TINCANVOCABULARYPROFILE_STRATEGY: "http://id.tincanapi.com/activitytype/strategy",
        EMBEDDED_STRATEGY: "http://id.tincanapi.com/activitytype/strategy-embedded",
        TINCANVOCABULARYPROFILE_EMBEDDED_STRATEGY: "http://id.tincanapi.com/activitytype/strategy-embedded",
        SUBCATEGORY: "http://id.tincanapi.com/activitytype/subcategory",
        TINCANVOCABULARYPROFILE_SUBCATEGORY: "http://id.tincanapi.com/activitytype/subcategory",
        SUGGESTION: "http://id.tincanapi.com/activitytype/suggestion",
        TINCANVOCABULARYPROFILE_SUGGESTION: "http://id.tincanapi.com/activitytype/suggestion",
        TEST_DATA_BATCH: "http://id.tincanapi.com/activitytype/test-data-batch",
        TINCANVOCABULARYPROFILE_TEST_DATA_BATCH: "http://id.tincanapi.com/activitytype/test-data-batch",
        TAG: "http://id.tincanapi.com/activitytype/tag",
        TINCANVOCABULARYPROFILE_TAG: "http://id.tincanapi.com/activitytype/tag",
        TUTOR_SESSION: "http://id.tincanapi.com/activitytype/tutor-session",
        TINCANVOCABULARYPROFILE_TUTOR_SESSION: "http://id.tincanapi.com/activitytype/tutor-session",
        TWEET: "http://id.tincanapi.com/activitytype/tweet",
        TINCANVOCABULARYPROFILE_TWEET: "http://id.tincanapi.com/activitytype/tweet",
        UNIT_TEST: "http://id.tincanapi.com/activitytype/unit-test",
        TINCANVOCABULARYPROFILE_UNIT_TEST: "http://id.tincanapi.com/activitytype/unit-test",
        UNIT_TEST_SUITE: "http://id.tincanapi.com/activitytype/unit-test-suite",
        TINCANVOCABULARYPROFILE_UNIT_TEST_SUITE: "http://id.tincanapi.com/activitytype/unit-test-suite",
        USER_PROFILE: "http://id.tincanapi.com/activitytype/user-profile",
        TINCANVOCABULARYPROFILE_USER_PROFILE: "http://id.tincanapi.com/activitytype/user-profile",
        VOCABULARY_WORD: "http://id.tincanapi.com/activitytype/vocabulary-word",
        TINCANVOCABULARYPROFILE_VOCABULARY_WORD: "http://id.tincanapi.com/activitytype/vocabulary-word",
        VOICEMAIL: "http://id.tincanapi.com/activitytype/voicemail",
        TINCANVOCABULARYPROFILE_VOICEMAIL: "http://id.tincanapi.com/activitytype/voicemail",
        WEBINAR: "http://id.tincanapi.com/activitytype/webinar",
        TINCANVOCABULARYPROFILE_WEBINAR: "http://id.tincanapi.com/activitytype/webinar",
        GRADE_CLASSIFICATION: "http://www.tincanapi.co.uk/activitytypes/grade_classification",
        TINCANVOCABULARYPROFILE_GRADE_CLASSIFICATION: "http://www.tincanapi.co.uk/activitytypes/grade_classification",
        CERTIFICATE: "https://www.opigno.org/en/tincan_registry/activity_type/certificate",
        TINCANVOCABULARYPROFILE_CERTIFICATE: "https://www.opigno.org/en/tincan_registry/activity_type/certificate",
    }),
    ACTIVITYEXTENSION: Object.freeze({
        ALIGNMENT: "https://w3id.org/xapi/acrossx/extensions/alignment",
        ACROSSXPROFILE_ALIGNMENT: "https://w3id.org/xapi/acrossx/extensions/alignment",
        ANCHOR_TEXT: "https://w3id.org/xapi/acrossx/extensions/anchor-text",
        ACROSSXPROFILE_ANCHOR_TEXT: "https://w3id.org/xapi/acrossx/extensions/anchor-text",
        BLOOMS_LEVEL: "https://w3id.org/xapi/acrossx/extensions/blooms-level",
        ACROSSXPROFILE_BLOOMS_LEVEL: "https://w3id.org/xapi/acrossx/extensions/blooms-level",
        BY_WHOM: "https://w3id.org/xapi/acrossx/extensions/by-whom",
        ACROSSXPROFILE_BY_WHOM: "https://w3id.org/xapi/acrossx/extensions/by-whom",
        CHAPTER: "https://w3id.org/xapi/acrossx/extensions/chapter",
        ACROSSXPROFILE_CHAPTER: "https://w3id.org/xapi/acrossx/extensions/chapter",
        COLUMN: "https://w3id.org/xapi/acrossx/extensions/column",
        ACROSSXPROFILE_COLUMN: "https://w3id.org/xapi/acrossx/extensions/column",
        FEEDBACK: "https://w3id.org/xapi/acrossx/extensions/feedback",
        ACROSSXPROFILE_FEEDBACK: "https://w3id.org/xapi/acrossx/extensions/feedback",
        HIGHLIGHTEDSTRING: "https://w3id.org/xapi/acrossx/extensions/highlightedString",
        ACROSSXPROFILE_HIGHLIGHTEDSTRING: "https://w3id.org/xapi/acrossx/extensions/highlightedString",
        PASS_SCORE: "https://w3id.org/xapi/acrossx/extensions/pass-score",
        ACROSSXPROFILE_PASS_SCORE: "https://w3id.org/xapi/acrossx/extensions/pass-score",
        ROW: "https://w3id.org/xapi/acrossx/extensions/row",
        ACROSSXPROFILE_ROW: "https://w3id.org/xapi/acrossx/extensions/row",
        SECTION: "https://w3id.org/xapi/acrossx/extensions/section",
        ACROSSXPROFILE_SECTION: "https://w3id.org/xapi/acrossx/extensions/section",
        SUPPLEMENTAL_INFO: "https://w3id.org/xapi/acrossx/extensions/supplemental-info",
        ACROSSXPROFILE_SUPPLEMENTAL_INFO: "https://w3id.org/xapi/acrossx/extensions/supplemental-info",
        TIME_LIMIT: "https://w3id.org/xapi/acrossx/extensions/time-limit",
        ACROSSXPROFILE_TIME_LIMIT: "https://w3id.org/xapi/acrossx/extensions/time-limit",
        TOTAL_ITEMS: "https://w3id.org/xapi/acrossx/extensions/total-items",
        ACROSSXPROFILE_TOTAL_ITEMS: "https://w3id.org/xapi/acrossx/extensions/total-items",
        TOTAL_PAGES: "https://w3id.org/xapi/acrossx/extensions/total-pages",
        ACROSSXPROFILE_TOTAL_PAGES: "https://w3id.org/xapi/acrossx/extensions/total-pages",
        TOTAL_SCORE: "https://w3id.org/xapi/acrossx/extensions/total-score",
        ACROSSXPROFILE_TOTAL_SCORE: "https://w3id.org/xapi/acrossx/extensions/total-score",
        TYPE: "https://w3id.org/xapi/acrossx/extensions/type",
        ACROSSXPROFILE_TYPE: "https://w3id.org/xapi/acrossx/extensions/type",
        VALENCE: "https://profiles.adlnet.gov/xapi/4a1d0786-1de4-4941-9edc-2513b5c83a17/extension/valence",
        EMOTIONAPIPROFILE_VALENCE: "https://profiles.adlnet.gov/xapi/4a1d0786-1de4-4941-9edc-2513b5c83a17/extension/valence",
        AROUSAL: "https://profiles.adlnet.gov/xapi/4a1d0786-1de4-4941-9edc-2513b5c83a17/extension/arousal",
        EMOTIONAPIPROFILE_AROUSAL: "https://profiles.adlnet.gov/xapi/4a1d0786-1de4-4941-9edc-2513b5c83a17/extension/arousal",
        DIFFICULTY: "https://w3id.org/xapi.gblxapi/extensions/difficulty",
        GBLXAPIK12EDUCATIONAPPSPROFILE_DIFFICULTY: "https://w3id.org/xapi.gblxapi/extensions/difficulty",
        TYPE_OF_QUIZ: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/type-of-quiz",
        HYFLEXCLASSROOMPROFILE_TYPE_OF_QUIZ: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/type-of-quiz",
        INSTANCE: "https://w3id.org/xapi/tla/extensions/instance",
        TLAPROFILE_INSTANCE: "https://w3id.org/xapi/tla/extensions/instance",
        INTERACTION_ID_NUMBER: "https://w3id.org/xapi/netc-assessment/extensions/activity/id-number",
        NAVYASSESSMENTPROFILE_INTERACTION_ID_NUMBER: "https://w3id.org/xapi/netc-assessment/extensions/activity/id-number",
        EXTENDED_INTERACTION_TYPE: "https://w3id.org/xapi/netc-assessment/extensions/activity/extended-interaction-type",
        NAVYASSESSMENTPROFILE_EXTENDED_INTERACTION_TYPE: "https://w3id.org/xapi/netc-assessment/extensions/activity/extended-interaction-type",
        COA_ID: "https://w3id.org/xapi/netc/extensions/coa-id",
        NAVYCOMMONREFERENCEPROFILE_COA_ID: "https://w3id.org/xapi/netc/extensions/coa-id",
        RESOURCE_URL: "https://w3id.org/xapi/netc/extensions/resource-url",
        NAVYCOMMONREFERENCEPROFILE_RESOURCE_URL: "https://w3id.org/xapi/netc/extensions/resource-url",
        TARGET_AUDIENCE: "https://w3id.org/xapi/netc/extensions/target-audience",
        NAVYCOMMONREFERENCEPROFILE_TARGET_AUDIENCE: "https://w3id.org/xapi/netc/extensions/target-audience",
        TARGET_RATING: "https://w3id.org/xapi/netc/extensions/target-rating",
        NAVYCOMMONREFERENCEPROFILE_TARGET_RATING: "https://w3id.org/xapi/netc/extensions/target-rating",
        PROCEDURE_METADATA: "https://w3id.org/xapi/performance-support/extensions/procedure-metadata",
        PERFORMANCESUPPORTPROFILE_PROCEDURE_METADATA: "https://w3id.org/xapi/performance-support/extensions/procedure-metadata",
        STEP_METADATA: "https://w3id.org/xapi/performance-support/extensions/step-metadata",
        PERFORMANCESUPPORTPROFILE_STEP_METADATA: "https://w3id.org/xapi/performance-support/extensions/step-metadata",
        EMOTION: "https://xapi.org.au/sociallearningprofile/emotion",
        SOCIALMEDIAPROFILE_EMOTION: "https://xapi.org.au/sociallearningprofile/emotion",
    }),
    CONTEXTEXTENSION: Object.freeze({
        MENTIONEDAGENT: "https://w3id.org/xapi/acrossx/extensions/mentionedagent",
        ACROSSXPROFILE_MENTIONEDAGENT: "https://w3id.org/xapi/acrossx/extensions/mentionedagent",
        SCHOOL: "https://ed3chain.com/xapi/boll/extensions#school",
        ACROSSXPROFILE_SCHOOL: "https://w3id.org/xapi/acrossx/extensions/school",
        BOLLPROFILE_SCHOOL: "https://ed3chain.com/xapi/boll/extensions#school",
        LEARNER: "https://ed3chain.com/xapi/boll/extensions#learner",
        BOLLPROFILE_LEARNER: "https://ed3chain.com/xapi/boll/extensions#learner",
        LOCATION: "http://id.tincanapi.com/extension/location",
        BOLLPROFILE_LOCATION: "https://ed3chain.com/xapi/boll/extensions#location",
        TLAPROFILE_LOCATION: "https://w3id.org/xapi/tla/extensions/location",
        TINCANVOCABULARYPROFILE_LOCATION: "http://id.tincanapi.com/extension/location",
        SESSION_ID: "https://w3id.org/xapi/video/extensions/session-id",
        CMI5PROFILE_SESSION_ID: "https://w3id.org/xapi/cmi5/context/extensions/sessionid",
        OPENEDXPROFILE_SESSION_ID: "https://w3id.org/xapi/openedx/extension/session-id",
        VIDEOPROFILE_SESSION_ID: "https://w3id.org/xapi/video/extensions/session-id",
        MASTERY_SCORE: "https://w3id.org/xapi/cmi5/context/extensions/masteryscore",
        CMI5PROFILE_MASTERY_SCORE: "https://w3id.org/xapi/cmi5/context/extensions/masteryscore",
        LAUNCH_MODE: "https://w3id.org/xapi/performance-support/extensions/launch-mode",
        CMI5PROFILE_LAUNCH_MODE: "https://w3id.org/xapi/cmi5/context/extensions/launchmode",
        PERFORMANCESUPPORTPROFILE_LAUNCH_MODE: "https://w3id.org/xapi/performance-support/extensions/launch-mode",
        LAUNCH_URL: "https://w3id.org/xapi/cmi5/context/extensions/launchurl",
        CMI5PROFILE_LAUNCH_URL: "https://w3id.org/xapi/cmi5/context/extensions/launchurl",
        LAUNCH_PARAMETERS: "https://w3id.org/xapi/cmi5/context/extensions/launchparameters",
        CMI5PROFILE_LAUNCH_PARAMETERS: "https://w3id.org/xapi/cmi5/context/extensions/launchparameters",
        MOVE_ON: "https://w3id.org/xapi/cmi5/context/extensions/moveon",
        CMI5PROFILE_MOVE_ON: "https://w3id.org/xapi/cmi5/context/extensions/moveon",
        COUNT: "https://xapi.org.au/contentprofile/extension/count",
        CONTENTREPOSITORYPROFILE_COUNT: "https://xapi.org.au/contentprofile/extension/count",
        COURSE_CODE: "http://xapi.org.au/contentprofile/extension/course_code",
        CONTENTREPOSITORYPROFILE_COURSE_CODE: "http://xapi.org.au/contentprofile/extension/course_code",
        ACADEMIC_TERM: "http://xapi.org.au/contentprofile/extension/academic_term",
        CONTENTREPOSITORYPROFILE_ACADEMIC_TERM: "http://xapi.org.au/contentprofile/extension/academic_term",
        ACADEMIC_YEAR: "http://xapi.org.au/contentprofile/extension/academic_year",
        CONTENTREPOSITORYPROFILE_ACADEMIC_YEAR: "http://xapi.org.au/contentprofile/extension/academic_year",
        DOI: "http://xapi.org.au/contentprofile/extension/doi",
        CONTENTREPOSITORYPROFILE_DOI: "http://xapi.org.au/contentprofile/extension/doi",
        ISSN: "http://xapi.org.au/contentprofile/extension/issn",
        CONTENTREPOSITORYPROFILE_ISSN: "http://xapi.org.au/contentprofile/extension/issn",
        CITATION_INFO: "http://xapi.org.au/contentprofile/extension/citation_info",
        CONTENTREPOSITORYPROFILE_CITATION_INFO: "http://xapi.org.au/contentprofile/extension/citation_info",
        INTERACTIVITY_LEVEL: "https://w3id.org/xapi/dod-isd/extensions/interactivity-level",
        DODISDPROFILE_INTERACTIVITY_LEVEL: "https://w3id.org/xapi/dod-isd/extensions/interactivity-level",
        CATEGORY: "https://w3id.org/xapi/dod-isd/extensions/category",
        DODISDPROFILE_CATEGORY: "https://w3id.org/xapi/dod-isd/extensions/category",
        KSA: "https://w3id.org/xapi/dod-isd/extensions/ksa",
        DODISDPROFILE_KSA: "https://w3id.org/xapi/dod-isd/extensions/ksa",
        GRADE: "https://w3id.org/xapi/gblxapi/extensions/grade",
        GBLXAPIK12EDUCATIONAPPSPROFILE_GRADE: "https://w3id.org/xapi/gblxapi/extensions/grade",
        DOMAIN: "https://w3id.org/xapi/gblxapi/extensions/domain",
        GBLXAPIK12EDUCATIONAPPSPROFILE_DOMAIN: "https://w3id.org/xapi/gblxapi/extensions/domain",
        SUBDOMAIN: "https://w3id.org/xapi/gblxapi/extensions/subdomain",
        GBLXAPIK12EDUCATIONAPPSPROFILE_SUBDOMAIN: "https://w3id.org/xapi/gblxapi/extensions/subdomain",
        SKILL: "https://w3id.org/xapi/gblxapi/extensions/skill",
        GBLXAPIK12EDUCATIONAPPSPROFILE_SKILL: "https://w3id.org/xapi/gblxapi/extensions/skill",
        FOCUS: "https://w3id.org/xapi/gblxapi/extensions/focus",
        GBLXAPIK12EDUCATIONAPPSPROFILE_FOCUS: "https://w3id.org/xapi/gblxapi/extensions/focus",
        TOPIC: "http://id.tincanapi.com/extension/topic",
        GBLXAPIK12EDUCATIONAPPSPROFILE_TOPIC: "https://w3id.org/xapi/gblxapi/extensions/topic",
        TINCANVOCABULARYPROFILE_TOPIC: "http://id.tincanapi.com/extension/topic",
        ACTION: "https://w3id.org/xapi/gblxapi/extensions/action",
        GBLXAPIK12EDUCATIONAPPSPROFILE_ACTION: "https://w3id.org/xapi/gblxapi/extensions/action",
        CLASSROOM_SUBJECT: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/classroom-subject",
        HYFLEXCLASSROOMPROFILE_CLASSROOM_SUBJECT: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/classroom-subject",
        LEARNING_TOOL: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/learning-tool",
        HYFLEXCLASSROOMPROFILE_LEARNING_TOOL: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/learning-tool",
        PARTICIPATION_MODE: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/participation-mode",
        HYFLEXCLASSROOMPROFILE_PARTICIPATION_MODE: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/participation-mode",
        FEDERATED_SESSION_ID: "http://profiles.usalearning.net/xapi/5eda3789-9801-4dcc-ae22-9971b2a31871/extension/federated-session-id",
        IMSGLOBALLEARNINGTOOLINTEROPERABILITYPROFILE_FEDERATED_SESSION_ID: "http://profiles.usalearning.net/xapi/5eda3789-9801-4dcc-ae22-9971b2a31871/extension/federated-session-id",
        STARTING_DATE: "https://w3id.org/xapi/lms/extensions/starting-date",
        LEARNINGMANAGEMENTSYSTEMPROFILE_STARTING_DATE: "https://w3id.org/xapi/lms/extensions/starting-date",
        ENDING_DATE: "https://w3id.org/xapi/lms/extensions/ending-date",
        LEARNINGMANAGEMENTSYSTEMPROFILE_ENDING_DATE: "https://w3id.org/xapi/lms/extensions/ending-date",
        ROLE: "https://w3id.org/xapi/lms/extensions/role",
        LEARNINGMANAGEMENTSYSTEMPROFILE_ROLE: "https://w3id.org/xapi/lms/extensions/role",
        CONFIDENCE: "https://w3id.org/xapi/tla/extensions/confidence",
        TLAPROFILE_CONFIDENCE: "https://w3id.org/xapi/tla/extensions/confidence",
        EVIDENCE: "https://w3id.org/xapi/tla/extensions/evidence",
        TLAPROFILE_EVIDENCE: "https://w3id.org/xapi/tla/extensions/evidence",
        DUE_DATE: "https://w3id.org/xapi/tla/extensions/due_date",
        TLAPROFILE_DUE_DATE: "https://w3id.org/xapi/tla/extensions/due_date",
        PERMANENT_CHANGE_OF_STATION: "https://w3id.org/xapi/tla/extensions/permanent_change_of_station",
        TLAPROFILE_PERMANENT_CHANGE_OF_STATION: "https://w3id.org/xapi/tla/extensions/permanent_change_of_station",
        UNIT_IDENTIFICATION_CODE: "https://w3id.org/xapi/tla/extensions/unit_identification_code",
        TLAPROFILE_UNIT_IDENTIFICATION_CODE: "https://w3id.org/xapi/tla/extensions/unit_identification_code",
        EXPIRATION: "https://w3id.org/xapi/tla/extensions/expiration",
        TLAPROFILE_EXPIRATION: "https://w3id.org/xapi/tla/extensions/expiration",
        REASON: "https://w3id.org/xapi/tla/extensions/reason",
        TLAPROFILE_REASON: "https://w3id.org/xapi/tla/extensions/reason",
        RESTRICTION_REASON: "https://w3id.org/xapi/tla/extensions/restriction",
        TLAPROFILE_RESTRICTION_REASON: "https://w3id.org/xapi/tla/extensions/restriction",
        DEP: "https://w3id.org/xapi/tla/extensions/DEP",
        TLAPROFILE_DEP: "https://w3id.org/xapi/tla/extensions/DEP",
        COURSE_ID_NUMBER: "https://w3id.org/xapi/netc/extensions/course-id-number",
        NAVYCOMMONREFERENCEPROFILE_COURSE_ID_NUMBER: "https://w3id.org/xapi/netc/extensions/course-id-number",
        LAUNCH_LOCATION: "https://w3id.org/xapi/netc/extensions/launch-location",
        NAVYCOMMONREFERENCEPROFILE_LAUNCH_LOCATION: "https://w3id.org/xapi/netc/extensions/launch-location",
        LEARNING_OBJECTIVE: "https://w3id.org/xapi/netc/extensions/learning-objective",
        NAVYCOMMONREFERENCEPROFILE_LEARNING_OBJECTIVE: "https://w3id.org/xapi/netc/extensions/learning-objective",
        NAVY_ENLISTED_CLASSIFICATION: "https://w3id.org/xapi/netc/extensions/navy-enlisted-classification",
        NAVYCOMMONREFERENCEPROFILE_NAVY_ENLISTED_CLASSIFICATION: "https://w3id.org/xapi/netc/extensions/navy-enlisted-classification",
        SCHOOL_CENTER: "https://w3id.org/xapi/netc/extensions/school-center",
        NAVYCOMMONREFERENCEPROFILE_SCHOOL_CENTER: "https://w3id.org/xapi/netc/extensions/school-center",
        HULL_APPLICABILITY: "https://w3id.org/xapi/netc/extensions/hull-applicability",
        NAVYCOMMONREFERENCEPROFILE_HULL_APPLICABILITY: "https://w3id.org/xapi/netc/extensions/hull-applicability",
        HULL_CONFIGURATION: "https://w3id.org/xapi/netc/extensions/hull-configuration",
        NAVYCOMMONREFERENCEPROFILE_HULL_CONFIGURATION: "https://w3id.org/xapi/netc/extensions/hull-configuration",
        TECH_DOC_ID: "https://w3id.org/xapi/netc/extensions/tech-doc-id",
        NAVYCOMMONREFERENCEPROFILE_TECH_DOC_ID: "https://w3id.org/xapi/netc/extensions/tech-doc-id",
        TECH_DOC_PROCEDURE_ID: "https://w3id.org/xapi/netc/extensions/tech-doc-procedure-id",
        NAVYCOMMONREFERENCEPROFILE_TECH_DOC_PROCEDURE_ID: "https://w3id.org/xapi/netc/extensions/tech-doc-procedure-id",
        TECH_DOC_PROCEDURE_TITLE: "https://w3id.org/xapi/netc/extensions/tech-doc-procedure-title",
        NAVYCOMMONREFERENCEPROFILE_TECH_DOC_PROCEDURE_TITLE: "https://w3id.org/xapi/netc/extensions/tech-doc-procedure-title",
        USER_AGENT: "https://w3id.org/xapi/video/extensions/user-agent",
        NAVYCOMMONREFERENCEPROFILE_USER_AGENT: "https://w3id.org/xapi/netc/extensions/user-agent",
        VIDEOPROFILE_USER_AGENT: "https://w3id.org/xapi/video/extensions/user-agent",
        FEEDBACK_TARGET: "https://w3id.org/xapi/netc/extensions/feedback-target",
        NAVYCOMMONREFERENCEPROFILE_FEEDBACK_TARGET: "https://w3id.org/xapi/netc/extensions/feedback-target",
        REFERRER_LOCATION: "https://w3id.org/xapi/netc/extensions/referrer-location",
        NAVYCOMMONREFERENCEPROFILE_REFERRER_LOCATION: "https://w3id.org/xapi/netc/extensions/referrer-location",
        INSTRUCTOR: "http://profiles.usalearning.net/xapi/NELC/extension/instructor",
        NELCPROFILE_INSTRUCTOR: "http://profiles.usalearning.net/xapi/NELC/extension/instructor",
        TRANSFORMER_VERSION: "https://w3id.org/xapi/openedx/extension/transformer-version",
        OPENEDXPROFILE_TRANSFORMER_VERSION: "https://w3id.org/xapi/openedx/extension/transformer-version",
        PDF_ANNOTATION_HIGHLIGHT_COLOUR: "http://www.risc-inc.com/annotator/extensions/color",
        PDFANNOTATORPROFILE_PDF_ANNOTATION_HIGHLIGHT_COLOUR: "http://www.risc-inc.com/annotator/extensions/color",
        HIGHLIGHTED_STRING: "http://www.risc-inc.com/annotator/extensions/highlightedString",
        PDFANNOTATORPROFILE_HIGHLIGHTED_STRING: "http://www.risc-inc.com/annotator/extensions/highlightedString",
        PAGE_INDEX: "http://www.risc-inc.com/annotator/extensions/page",
        PDFANNOTATORPROFILE_PAGE_INDEX: "http://www.risc-inc.com/annotator/extensions/page",
        PDF_RECTANGLE_MAP: "http://www.risc-inc.com/annotator/extensions/rects",
        PDFANNOTATORPROFILE_PDF_RECTANGLE_MAP: "http://www.risc-inc.com/annotator/extensions/rects",
        ELEMENT_NOMENCLATURE: "https://w3id.org/xapi/simulation/extensions/element-nomenclature",
        SIMULATIONBASEPROFILE_ELEMENT_NOMENCLATURE: "https://w3id.org/xapi/simulation/extensions/element-nomenclature",
        ELEMENT_REF_DES: "https://w3id.org/xapi/simulation/extensions/element-ref-des",
        SIMULATIONBASEPROFILE_ELEMENT_REF_DES: "https://w3id.org/xapi/simulation/extensions/element-ref-des",
        S1000D_DMC: "https://w3id.org/xapi/simulation/extensions/s1000d-dmc",
        SIMULATIONBASEPROFILE_S1000D_DMC: "https://w3id.org/xapi/simulation/extensions/s1000d-dmc",
        S1000D_SNS: "https://w3id.org/xapi/simulation/extensions/s1000d-sns",
        SIMULATIONBASEPROFILE_S1000D_SNS: "https://w3id.org/xapi/simulation/extensions/s1000d-sns",
        SIMULATION_MODE: "https://w3id.org/xapi/simulation/extensions/simulation-mode",
        SIMULATIONBASEPROFILE_SIMULATION_MODE: "https://w3id.org/xapi/simulation/extensions/simulation-mode",
        MEDIA_CATEGORY: "https://pttportal.af.mil/xapi/extension/media-category",
        SYLLABUSEVENTSPROFILE_MEDIA_CATEGORY: "https://pttportal.af.mil/xapi/extension/media-category",
        ASSESSMENT_TYPE: "http://id.tincanapi.com/extension/assessment-type",
        TINCANVOCABULARYPROFILE_ASSESSMENT_TYPE: "http://id.tincanapi.com/extension/assessment-type",
        ATTEMPT_ID: "http://id.tincanapi.com/extension/attempt-id",
        TINCANVOCABULARYPROFILE_ATTEMPT_ID: "http://id.tincanapi.com/extension/attempt-id",
        BROWSER_INFORMATION: "http://id.tincanapi.com/extension/browser-info",
        TINCANVOCABULARYPROFILE_BROWSER_INFORMATION: "http://id.tincanapi.com/extension/browser-info",
        CMI_INTERACTION_WEIGHTING: "http://id.tincanapi.com/extension/cmi-interaction-weighting",
        TINCANVOCABULARYPROFILE_CMI_INTERACTION_WEIGHTING: "http://id.tincanapi.com/extension/cmi-interaction-weighting",
        COLLECTION_TYPE: "http://id.tincanapi.com/extension/collection-type",
        TINCANVOCABULARYPROFILE_COLLECTION_TYPE: "http://id.tincanapi.com/extension/collection-type",
        COLOR: "http://id.tincanapi.com/extension/color",
        TINCANVOCABULARYPROFILE_COLOR: "http://id.tincanapi.com/extension/color",
        CONDITION_TYPE: "http://id.tincanapi.com/extension/condition-type",
        TINCANVOCABULARYPROFILE_CONDITION_TYPE: "http://id.tincanapi.com/extension/condition-type",
        CONDITION_VALUE: "http://id.tincanapi.com/extension/condition-value",
        TINCANVOCABULARYPROFILE_CONDITION_VALUE: "http://id.tincanapi.com/extension/condition-value",
        DATA_URI: "http://id.tincanapi.com/extension/data-uri",
        TINCANVOCABULARYPROFILE_DATA_URI: "http://id.tincanapi.com/extension/data-uri",
        DATE: "http://id.tincanapi.com/extension/date",
        TINCANVOCABULARYPROFILE_DATE: "http://id.tincanapi.com/extension/date",
        DATETIME: "http://id.tincanapi.com/extension/datetime",
        TINCANVOCABULARYPROFILE_DATETIME: "http://id.tincanapi.com/extension/datetime",
        DROP_DOWN: "http://id.tincanapi.com/extension/drop-down",
        TINCANVOCABULARYPROFILE_DROP_DOWN: "http://id.tincanapi.com/extension/drop-down",
        ENDING_POSITION: "http://id.tincanapi.com/extension/ending-position",
        TINCANVOCABULARYPROFILE_ENDING_POSITION: "http://id.tincanapi.com/extension/ending-position",
        FEEDBACK: "http://id.tincanapi.com/extension/feedback",
        TINCANVOCABULARYPROFILE_FEEDBACK: "http://id.tincanapi.com/extension/feedback",
        IRL: "http://id.tincanapi.com/extension/irl",
        TINCANVOCABULARYPROFILE_IRL: "http://id.tincanapi.com/extension/irl",
        GEO_JSON: "http://id.tincanapi.com/extension/geojson",
        TINCANVOCABULARYPROFILE_GEO_JSON: "http://id.tincanapi.com/extension/geojson",
        INVITEE: "http://id.tincanapi.com/extension/invitee",
        TINCANVOCABULARYPROFILE_INVITEE: "http://id.tincanapi.com/extension/invitee",
        IP_ADDRESS: "http://id.tincanapi.com/extension/ip-address",
        TINCANVOCABULARYPROFILE_IP_ADDRESS: "http://id.tincanapi.com/extension/ip-address",
        ISBN: "http://id.tincanapi.com/extension/isbn",
        TINCANVOCABULARYPROFILE_ISBN: "http://id.tincanapi.com/extension/isbn",
        JWS_CERTIFICATE_LOCATION: "http://id.tincanapi.com/extension/jws-certificate-location",
        TINCANVOCABULARYPROFILE_JWS_CERTIFICATE_LOCATION: "http://id.tincanapi.com/extension/jws-certificate-location",
        LATITUDE: "http://id.tincanapi.com/extension/latitude",
        TINCANVOCABULARYPROFILE_LATITUDE: "http://id.tincanapi.com/extension/latitude",
        LONGITUDE: "http://id.tincanapi.com/extension/longitude",
        TINCANVOCABULARYPROFILE_LONGITUDE: "http://id.tincanapi.com/extension/longitude",
        MEASUREMENT: "http://id.tincanapi.com/extension/measurement",
        TINCANVOCABULARYPROFILE_MEASUREMENT: "http://id.tincanapi.com/extension/measurement",
        MONETARY_VALUE: "http://id.tincanapi.com/extension/monetary-value",
        TINCANVOCABULARYPROFILE_MONETARY_VALUE: "http://id.tincanapi.com/extension/monetary-value",
        OBSERVER: "http://id.tincanapi.com/extension/observer",
        TINCANVOCABULARYPROFILE_OBSERVER: "http://id.tincanapi.com/extension/observer",
        PLANNED_DURATION: "http://id.tincanapi.com/extension/planned-duration",
        TINCANVOCABULARYPROFILE_PLANNED_DURATION: "http://id.tincanapi.com/extension/planned-duration",
        PLANNED_START_TIME: "http://id.tincanapi.com/extension/planned-start-time",
        TINCANVOCABULARYPROFILE_PLANNED_START_TIME: "http://id.tincanapi.com/extension/planned-start-time",
        POSITION: "http://id.tincanapi.com/extension/position",
        TINCANVOCABULARYPROFILE_POSITION: "http://id.tincanapi.com/extension/position",
        POWERED_BY: "http://id.tincanapi.com/extension/powered-by",
        TINCANVOCABULARYPROFILE_POWERED_BY: "http://id.tincanapi.com/extension/powered-by",
        PRIVATE_AREA: "http://id.tincanapi.com/extension/private-area",
        TINCANVOCABULARYPROFILE_PRIVATE_AREA: "http://id.tincanapi.com/extension/private-area",
        PUBLISHED: "http://id.tincanapi.com/extension/published",
        TINCANVOCABULARYPROFILE_PUBLISHED: "http://id.tincanapi.com/extension/published",
        PURPOSE: "http://id.tincanapi.com/extension/purpose",
        TINCANVOCABULARYPROFILE_PURPOSE: "http://id.tincanapi.com/extension/purpose",
        REFERRER: "http://id.tincanapi.com/extension/referrer",
        TINCANVOCABULARYPROFILE_REFERRER: "http://id.tincanapi.com/extension/referrer",
        REFLECTION: "http://id.tincanapi.com/extension/reflection",
        TINCANVOCABULARYPROFILE_REFLECTION: "http://id.tincanapi.com/extension/reflection",
        SEVERITY: "http://id.tincanapi.com/extension/severity",
        TINCANVOCABULARYPROFILE_SEVERITY: "http://id.tincanapi.com/extension/severity",
        SHARE_MEDIUM: "http://id.tincanapi.com/extension/share-medium",
        TINCANVOCABULARYPROFILE_SHARE_MEDIUM: "http://id.tincanapi.com/extension/share-medium",
        STARTING_POINT: "http://id.tincanapi.com/extension/starting-point",
        TINCANVOCABULARYPROFILE_STARTING_POINT: "http://id.tincanapi.com/extension/starting-point",
        STARTING_POSITION: "http://id.tincanapi.com/extension/starting-position",
        TINCANVOCABULARYPROFILE_STARTING_POSITION: "http://id.tincanapi.com/extension/starting-position",
        TAGS: "http://id.tincanapi.com/extension/tags",
        TINCANVOCABULARYPROFILE_TAGS: "http://id.tincanapi.com/extension/tags",
        TARGET: "http://id.tincanapi.com/extension/target",
        TINCANVOCABULARYPROFILE_TARGET: "http://id.tincanapi.com/extension/target",
        TRAINING_PROVIDER: "http://id.tincanapi.com/extension/training-provider",
        TINCANVOCABULARYPROFILE_TRAINING_PROVIDER: "http://id.tincanapi.com/extension/training-provider",
        TWEET: "http://id.tincanapi.com/extension/tweet",
        TINCANVOCABULARYPROFILE_TWEET: "http://id.tincanapi.com/extension/tweet",
        UPDATED: "http://id.tincanapi.com/extension/updated",
        TINCANVOCABULARYPROFILE_UPDATED: "http://id.tincanapi.com/extension/updated",
        COMPLETION_THRESHOLD: "https://w3id.org/xapi/video/extensions/completion-threshold",
        VIDEOPROFILE_COMPLETION_THRESHOLD: "https://w3id.org/xapi/video/extensions/completion-threshold",
        CC_SUBTITLE_ENABLED: "https://w3id.org/xapi/video/extensions/cc-subtitle-enabled",
        VIDEOPROFILE_CC_SUBTITLE_ENABLED: "https://w3id.org/xapi/video/extensions/cc-subtitle-enabled",
        CC_SUBTITLE_LANG: "https://w3id.org/xapi/video/extensions/cc-subtitle-lang",
        VIDEOPROFILE_CC_SUBTITLE_LANG: "https://w3id.org/xapi/video/extensions/cc-subtitle-lang",
        FRAME_RATE: "https://w3id.org/xapi/video/extensions/frame-rate",
        VIDEOPROFILE_FRAME_RATE: "https://w3id.org/xapi/video/extensions/frame-rate",
        FULL_SCREEN: "https://w3id.org/xapi/video/extensions/full-screen",
        VIDEOPROFILE_FULL_SCREEN: "https://w3id.org/xapi/video/extensions/full-screen",
        LENGTH: "https://w3id.org/xapi/video/extensions/length",
        VIDEOPROFILE_LENGTH: "https://w3id.org/xapi/video/extensions/length",
        QUALITY: "https://w3id.org/xapi/video/extensions/quality",
        VIDEOPROFILE_QUALITY: "https://w3id.org/xapi/video/extensions/quality",
        SCREEN_SIZE: "https://w3id.org/xapi/video/extensions/screen-size",
        VIDEOPROFILE_SCREEN_SIZE: "https://w3id.org/xapi/video/extensions/screen-size",
        SPEED: "https://w3id.org/xapi/video/extensions/speed",
        VIDEOPROFILE_SPEED: "https://w3id.org/xapi/video/extensions/speed",
        TRACK: "https://w3id.org/xapi/video/extensions/track",
        VIDEOPROFILE_TRACK: "https://w3id.org/xapi/video/extensions/track",
        VOLUME: "https://w3id.org/xapi/video/extensions/volume",
        VIDEOPROFILE_VOLUME: "https://w3id.org/xapi/video/extensions/volume",
        VIDEO_PLAYBACK_SIZE: "https://w3id.org/xapi/video/extensions/video-playback-size",
        VIDEOPROFILE_VIDEO_PLAYBACK_SIZE: "https://w3id.org/xapi/video/extensions/video-playback-size",
        CAMERA_ACTIVATED: "https://w3id.org/xapi/virtual-classroom/extensions/camera-activated",
        VIRTUALCLASSROOMPROFILE_CAMERA_ACTIVATED: "https://w3id.org/xapi/virtual-classroom/extensions/camera-activated",
        MICRO_ACTIVATED: "https://w3id.org/xapi/virtual-classroom/extensions/micro-activated",
        VIRTUALCLASSROOMPROFILE_MICRO_ACTIVATED: "https://w3id.org/xapi/virtual-classroom/extensions/micro-activated",
        HAND_RAISED: "https://w3id.org/xapi/virtual-classroom/extensions/hand-raised",
        VIRTUALCLASSROOMPROFILE_HAND_RAISED: "https://w3id.org/xapi/virtual-classroom/extensions/hand-raised",
        SCREEN_SHARED: "https://w3id.org/xapi/virtual-classroom/extensions/screen-shared",
        VIRTUALCLASSROOMPROFILE_SCREEN_SHARED: "https://w3id.org/xapi/virtual-classroom/extensions/screen-shared",
        OPEN_BADGE_CLASS: "http://specification.openbadges.org/xapi/extensions/badgeclass",
        XAPIOPENBADGESPROFILE_OPEN_BADGE_CLASS: "http://specification.openbadges.org/xapi/extensions/badgeclass",
    }),
    RESULTEXTENSION: Object.freeze({
        RUBRICS: "https://w3id.org/xapi/acrossx/extensions/rubrics",
        ACROSSXPROFILE_RUBRICS: "https://w3id.org/xapi/acrossx/extensions/rubrics",
        STARTING_POINT: "https://w3id.org/xapi/acrossx/extensions/starting-point",
        ACROSSXPROFILE_STARTING_POINT: "https://w3id.org/xapi/acrossx/extensions/starting-point",
        TIME: "https://w3id.org/xapi/video/extensions/time",
        ACROSSXPROFILE_TIME: "https://w3id.org/xapi/acrossx/extensions/time",
        TINCANVOCABULARYPROFILE_TIME: "http://id.tincanapi.com/extension/time",
        VIDEOPROFILE_TIME: "https://w3id.org/xapi/video/extensions/time",
        PROGRESS: "https://w3id.org/xapi/video/extensions/progress",
        CMI5PROFILE_PROGRESS: "https://w3id.org/xapi/cmi5/result/extensions/progress",
        SERIOUSGAMESPROFILE_PROGRESS: "https://w3id.org/xapi/seriousgames/extensions/progress",
        VIDEOPROFILE_PROGRESS: "https://w3id.org/xapi/video/extensions/progress",
        REASON: "https://w3id.org/xapi/cmi5/result/extensions/reason",
        CMI5PROFILE_REASON: "https://w3id.org/xapi/cmi5/result/extensions/reason",
        COMMENT_TEXT: "https://xapi.com.au/extensions/comment-text",
        FEEDBACKINTERACTIONPROFILE_COMMENT_TEXT: "https://xapi.com.au/extensions/comment-text",
        STAR_RATING: "https://xapi.com.au/extensions/star-rating",
        FEEDBACKINTERACTIONPROFILE_STAR_RATING: "https://xapi.com.au/extensions/star-rating",
        ACCURACY_RATE: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/accuracy-rate",
        HYFLEXCLASSROOMPROFILE_ACCURACY_RATE: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/accuracy-rate",
        PROGRESS_RATE: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/progress-rate",
        HYFLEXCLASSROOMPROFILE_PROGRESS_RATE: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/progress-rate",
        SATISFACTION_SCORE: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/satisfaction-score",
        HYFLEXCLASSROOMPROFILE_SATISFACTION_SCORE: "https://profiles.adlnet.gov/xapi/45ffd9b1-dcd2-4cee-87e1-5de83d5159c0/extension/satisfaction-score",
        RECOMMENDATION_ORDER: "https://w3id.org/xapi/tla/extensions/recommendation_order",
        TLAPROFILE_RECOMMENDATION_ORDER: "https://w3id.org/xapi/tla/extensions/recommendation_order",
        RESPONSE_EXPLANATION: "https://w3id.org/xapi/netc-assessment/extensions/result/response-explanation",
        NAVYASSESSMENTPROFILE_RESPONSE_EXPLANATION: "https://w3id.org/xapi/netc-assessment/extensions/result/response-explanation",
        RESPONSE_TYPE: "https://w3id.org/xapi/netc-assessment/extensions/result/response-type",
        NAVYASSESSMENTPROFILE_RESPONSE_TYPE: "https://w3id.org/xapi/netc-assessment/extensions/result/response-type",
        SPEED_FROM: "https://w3id.org/xapi/openedx/extension/speed-from",
        OPENEDXPROFILE_SPEED_FROM: "https://w3id.org/xapi/openedx/extension/speed-from",
        SPEED_TO: "https://w3id.org/xapi/openedx/extension/speed-to",
        OPENEDXPROFILE_SPEED_TO: "https://w3id.org/xapi/openedx/extension/speed-to",
        HEALTH: "https://w3id.org/xapi/seriousgames/extensions/health",
        SERIOUSGAMESPROFILE_HEALTH: "https://w3id.org/xapi/seriousgames/extensions/health",
        POSITION: "https://w3id.org/xapi/seriousgames/extensions/position",
        SERIOUSGAMESPROFILE_POSITION: "https://w3id.org/xapi/seriousgames/extensions/position",
        ACTIONSPER_MINUTE: "http://id.tincanapi.com/extension/apm",
        TINCANVOCABULARYPROFILE_ACTIONSPER_MINUTE: "http://id.tincanapi.com/extension/apm",
        DURATION: "http://id.tincanapi.com/extension/duration",
        TINCANVOCABULARYPROFILE_DURATION: "http://id.tincanapi.com/extension/duration",
        ENDING_POINT: "http://id.tincanapi.com/extension/ending-point",
        TINCANVOCABULARYPROFILE_ENDING_POINT: "http://id.tincanapi.com/extension/ending-point",
        QUALITY_RATING: "http://id.tincanapi.com/extension/quality-rating",
        TINCANVOCABULARYPROFILE_QUALITY_RATING: "http://id.tincanapi.com/extension/quality-rating",
        TETRIS_LINES: "http://id.tincanapi.com/extension/tetris-lines",
        TINCANVOCABULARYPROFILE_TETRIS_LINES: "http://id.tincanapi.com/extension/tetris-lines",
        VALID_UNTIL: "http://id.tincanapi.com/extension/valid-until",
        TINCANVOCABULARYPROFILE_VALID_UNTIL: "http://id.tincanapi.com/extension/valid-until",
        CLASSIFICATION: "http://www.tincanapi.co.uk/extensions/result/classification",
        TINCANVOCABULARYPROFILE_CLASSIFICATION: "http://www.tincanapi.co.uk/extensions/result/classification",
        PLAYED_SEGMENTS: "https://w3id.org/xapi/video/extensions/played-segments",
        VIDEOPROFILE_PLAYED_SEGMENTS: "https://w3id.org/xapi/video/extensions/played-segments",
        TIME_FROM: "https://w3id.org/xapi/video/extensions/time-from",
        VIDEOPROFILE_TIME_FROM: "https://w3id.org/xapi/video/extensions/time-from",
        TIME_TO: "https://w3id.org/xapi/video/extensions/time-to",
        VIDEOPROFILE_TIME_TO: "https://w3id.org/xapi/video/extensions/time-to",
        OPEN_BADGE_ASSERTION: "http://specification.openbadges.org/xapi/extensions/badgeassertion",
        XAPIOPENBADGESPROFILE_OPEN_BADGE_ASSERTION: "http://specification.openbadges.org/xapi/extensions/badgeassertion",
    })
});

/**
 * The Object Class of a Statement
 */
class ObjectStatement {
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
        this.definitionType = setAsUri(type, baseURI);
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

/**
 * The Context Class of a Statement
 */
class ContextStatement {
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
            this.registration=uuid.v4();
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
            // Accept single object or array
            if (!this.contextActivities[type]) {
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
            cloned.contextActivities = JSON.parse(JSON.stringify(this.contextActivities));
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
        if (xapiObj.contextActivities) ctx.contextActivities = xapiObj.contextActivities;
        if (xapiObj.extensions) ctx.extensions = xapiObj.extensions;
        if (language) ctx.language = language;
        return ctx;
    }
}

/**
 * The Verb Class  of a Statement
 */
class VerbStatement {
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
        
        if(this.display) {
            verb.display = this.display;
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

/**
 * The Result Class of a Statement
 */
class ResultStatement {
    /**
     * Constructor of the ResultStatement class
     * 
     * @param {string} defaultURI The default URI for the extensions
     */
    constructor(defaultURI) {
        this.defaultURI = defaultURI;
        this.Score = null;
        this.Success = null;
        this.Completion = null;
        this.Response = null;
        this.Duration = null;
        this.Extensions = {};
    }

    /**
     * The ID of the Result
     * 
     * @type {string}
     */
    defaultURI;

    /**
     * The Score of the Result
     * 
     * @type {Object}
     */
    Score;
    /**
     * The success status of the Result
     * 
     * @type {boolean}
     */
    Success;
    /**
     * The Completion status of the Result
     * 
     * @type {boolean}
     */
    Completion;
    /**
     * The response of the Result
     * 
     * @type {string}
     */
    Response;
    /**
     * The duration of the Result
     * 
     * @type {string}
     */
    Duration;
    /**
     * The Extensions of the Result
     * 
     * @type {Object}
     */
    Extensions;

    /**
     * Check if the result is empty or not
     * @returns {boolean}
     */
    isEmpty() {
        return (this.Score == null) && (this.Duration == null) && (this.Success == null) && (this.Completion == null) && (this.Response == null) && (Object.keys(this.Extensions).length == 0);
    }

    /**
     * Set extensions from list
     * @param {Object} extensions extension list
     */
    setExtensions(extensions) {
        for (var key in extensions) {
            this.setExtension(key,extensions[key]);
        }
    }

    /**
     * Set result extension for key value
     * @param {typeof ALL.RESULTEXTENSION[keyof typeof ALL.RESULTEXTENSION]|string} key the key of the extension
     * @param {*} value the value of the extension
     */
    setExtension(key, value) {
        switch (key.toLowerCase()) {
            case 'success': { this.Success = value; break; }
            case 'completion': { this.Completion = value; break; }
            case 'response': { this.Response = value; break; }
            case 'score': { this.Score = this.setScoreValue("raw", value); break; }
            case 'duration': { this.Duration = value; break; }
            default: { this.Extensions[key] = value; break; }
        }
    }

    /**
     * Set the score of the statement
     * @param {string} key the key for the score 
     * @param {number} value the score 
     */
    setScoreValue(key, value) {
        if(! this.Score) {
            this.Score = {};
        }
        if(STATEMENT.RESULT.SCORE.hasOwnProperty(key.toUpperCase())) {
            this.Score[key] = Number(value);
        }    
    }

        /**
     * Set the score of the statement
     * @param {number} raw the raw score
     * @param {number} min the min score
     * @param {number} max the max score
     * @param {number} scaled the scaled score
     */
    setScore(raw, min, max, scaled) {
        if (raw) {
            this.setScoreRaw(raw);
        }

        if (min) {
            this.setScoreMin(min);
        }

        if (max) {
            this.setScoreMax(max);
        }

        if (scaled) {
            this.setScoreScaled(scaled);
        }
    }

        /**
     * Set the raw score of the statement
     * @param {number} raw the raw score 
     */
    setScoreRaw(raw) {
        this.setScoreValue(STATEMENT.RESULT.SCORE.RAW, raw);
    }
    
    /**
     * Set the min score of the statement
     * @param {number} min the min score 
     */
    setScoreMin(min) {
        this.setScoreValue(STATEMENT.RESULT.SCORE.MIN, min);
    }

    /**
     * Set the max score of the statement
     * @param {number} max the max score 
     */
    setScoreMax(max) {
        this.setScoreValue(STATEMENT.RESULT.SCORE.MAX, max);
    }

    /**
     * Set the scaled score of the statement
     * @param {number} scaled the scaled score 
     */
    setScoreScaled(scaled) {
        this.setScoreValue(STATEMENT.RESULT.SCORE.SCALED, scaled);
    }

    /**
     * Set completion status of the statement
     * @param {boolean} value the completion status
     */
    setCompletion(value) {
        this.setExtension(STATEMENT.RESULT.COMPLETION, value);
    }

    /**
     * Set success status of the statement
     * @param {boolean} value the success status
     */
    setSuccess(value) {
        this.setExtension(STATEMENT.RESULT.SUCCESS, value);
    }

    /**
     * Set duration of the statement
     * @param {Date} init init date of statement
     * @param {Date} end end date of statement
     */
    setDuration(init, end) {
        const durationInMs = end.getTime()-init.getTime();
        const durationInSec = durationInMs / 1000;
        const seconds = durationInSec % 60;
        const minutes = Math.floor(durationInSec / 60) % 60;
        const hours = Math.floor(durationInSec / 3600) % 24;
        const days = Math.floor(durationInSec / 86400);

        // Construct the ISO 8601 duration string
        const isoDuration = `P${days}DT${hours}H${minutes}M${seconds}S`;
        this.setExtension(STATEMENT.RESULT.DURATION, isoDuration);
    }

    /**
     * Set response of the statement
     * @param {string} value the response
     */
    setResponse(value) {
        this.setExtension(STATEMENT.RESULT.RESPONSE, value);
    }

    /**
     * Set progress status of the statement
     * @param {number} value the progress status
     */
    setProgress(value) {
        this.setExtension(STATEMENT.RESULT.PROGRESS, value);
    }

    /**
     * Set result extension for key of the statement
     * @param {typeof ALL.RESULTEXTENSION[keyof typeof ALL.RESULTEXTENSION]|string} key the key of the extension
     * @param {string} value the value of the extension
     */
    setVar(key,value) {
        this.setExtension(key, value);
    }

    /**
     * convert to XAPI
     * 
     * @returns {Object}
     */
    toXAPI() {
        var ret = {};

        if (this.Success !== null) {
            ret.success = (this.Success) ? true : false;
        }

        if (this.Completion !== null) {
            ret.completion = (this.Completion) ? true : false;
        }

        if (this.Response) {
            ret.response = this.Response.toString();
        }

        if (this.Score !== null) {
            ret.score = this.Score;
        }

        if (this.Duration !== null) {
            ret.duration = this.Duration;
        }


        if (this.Extensions !== null && obsize(this.Extensions) > 0) {
            ret.extensions = this.Extensions;

            for (var key in this.Extensions) {
                if (key in ALL.RESULTEXTENSION) {
                    this.Extensions[ALL.RESULTEXTENSION[key]] = this.Extensions[key];
                    delete this.Extensions[key];
                } else {
                    var newuri= setAsUri(key, this.defaultURI);
                    this.Extensions[newuri] = this.Extensions[key];
                    if(newuri !== key) {
                        delete this.Extensions[key];
                    }
                }
            }
        }

        return ret;
    }

    /**
     * Create a ResultStatement from xAPI result object
     * @param {Object} xapiObj
     * @param {string} baseURI
     * @returns {ResultStatement}
     */
    static fromXAPI(xapiObj, baseURI) {
        if (!xapiObj) return new ResultStatement(baseURI);
        const result = new ResultStatement(baseURI);
        if ('score' in xapiObj) result.Score = xapiObj.score;
        if ('success' in xapiObj) result.Success = xapiObj.success;
        if ('completion' in xapiObj) result.Completion = xapiObj.completion;
        if ('response' in xapiObj) result.Response = xapiObj.response;
        if ('duration' in xapiObj) result.Duration = xapiObj.duration;
        if ('extensions' in xapiObj) result.setExtensions(xapiObj.extensions);
        return result;
    }
    /**
     * convert to CSV
     * 
     * @returns {String}
     */
    toCSV() {
        var success = (this.Success !== null) ? ',success,' + this.Success.toString() : '';
        var completion = (this.Completion !== null) ? ',completion,' + this.Completion.toString() : '';
        var response = '';
        if (this.Response) {
            let respStr = (typeof this.Response === 'string') ? this.Response : String(this.Response);
            response = ',response,' + respStr.replaceAll(',', '\,');
        }
        var score = '';

        if (exists(this.Score)) {
            if (exists(this.Score.raw)) {
                score += ',score,' + this.Score.raw;
            }

            if (exists(this.Score.min)) {
                score += ',score_min,' + this.Score.min;
            }

            if (exists(this.Score.max)) {
                score += ',score_max,' + this.Score.max;
            }

            if (exists(this.Score.scaled)) {
                score += ',score_scaled,' + this.Score.scaled;
            }
        }

        var result = success + completion + response + score;

        if (this.Extensions !== null && obsize(this.Extensions) > 0) {
            for (var key in this.Extensions) {
                result += ',' + key.replaceAll(',', '\\,') + ',';
                if (this.Extensions[key] !== null) {
                    if (typeof this.Extensions[key] === 'number') {
                        result += this.Extensions[key];
                    } else if (typeof this.Extensions[key] === 'string') {
                        result += this.Extensions[key].replaceAll(',', '\\,');
                    } else if (typeof this.Extensions[key] === 'object') {
                        if (ismap(this.Extensions[key])) {
                            var smap = '';

                            for (var k in this.Extensions[key]) {
                                if (typeof this.Extensions[key][k] === 'number') {
                                    smap += k + '=' + this.Extensions[key][k] + '-';
                                } else {
                                    smap += k + '=' + this.Extensions[key][k].replaceAll(',', '\\,') + '-';
                                }
                            }

                            result += smap.slice(0,-1);
                        }
                    } else {
                        result += this.Extensions[key];
                    }
                }
            }
        }

        return result;
    }
}

/**
 * Get the size of the object
 * @param {Object} obj the object to get the size
 * @returns {number}
 */
var obsize = function(obj) {
    var size = 0, key;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            size++;
        }
    }
    return size;
};

/**
 * Check if is map
 * @param {Object} obj the object to check
 * @returns {boolean}
 */
var ismap = function(obj) {
    for (var key in obj) {
        if (typeof obj[key] === 'object') {
            return false;
        }
    }
    return true;
};

/**
 * Check if exist
 * @param {Object} value the object to check
 * @returns {boolean}
 */
var exists = function(value) {
    return !(typeof value === 'undefined' || value === null);
};

/**
 * The Object Class of a Statement
 */
class InteractionObjectStatement extends ObjectStatement {
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
                obj.correctResponsesPattern = [];
                obj.addCorrectResponsesPattern([xapiObj.definition.correctResponsesPattern]);
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

/**
 * xAPI Attachment object (5.2.2.6)
 */
class AttachmentStatement {
    /**
     * @param {string} usageType - IRI that identifies attachment usage
     * @param {Object<string,string>} display - Language map title
     * @param {string} contentType - Internet media type
     * @param {number} length - Content length in octets
     * @param {string} sha2 - SHA-2 hash of content
     * @param {string} [defaultURI] - Base URI used if usageType is not absolute
     */
    constructor(usageType, display, contentType, length, sha2, defaultURI = "") {
        this.defaultURI = defaultURI;
        this.usageType = usageType ? setAsUri(usageType, defaultURI) : null;
        this.display = display || {};
        this.contentType = contentType;
        this.length = length;
        this.sha2 = sha2;
    }

    /** @type {string|null} */
    usageType;

    /** @type {Object<string,string>} */
    display;

    /** @type {Object<string,string>|undefined} */
    description;

    /** @type {string|undefined} */
    contentType;

    /** @type {number|undefined} */
    length;

    /** @type {string|undefined} */
    sha2;

    /** @type {string|undefined} */
    fileUrl;

    /** @type {string} */
    defaultURI;

    /**
     * Sets the attachment description language map
     * @param {Object<string,string>} description
     * @returns {AttachmentStatement}
     */
    setDescription(description) {
        this.description = description;
        return this;
    }

    /**
     * Sets file URL where the attachment can be fetched
     * @param {string} fileUrl - IRL/URL of the attachment
     * @returns {AttachmentStatement}
     */
    setFileUrl(fileUrl) {
        if (fileUrl) {
            this.fileUrl = isUri(fileUrl) ? fileUrl : setAsUri(fileUrl, this.defaultURI);
        }
        return this;
    }

    /**
     * Validate required xAPI attachment fields
     * @returns {boolean}
     */
    isValid() {
        return Boolean(
            this.usageType &&
            this.display &&
            Object.keys(this.display).length > 0 &&
            this.contentType &&
            Number.isInteger(this.length) &&
            this.length >= 0 &&
            this.sha2
        );
    }

    /**
     * Serialize attachment to xAPI object
     * @returns {Object}
     */
    toXAPI() {
        const xapi = {
            usageType: this.usageType,
            display: this.display,
            contentType: this.contentType,
            length: this.length,
            sha2: this.sha2
        };
        if (this.description && Object.keys(this.description).length > 0) {
            xapi.description = this.description;
        }
        if (this.fileUrl) {
            xapi.fileUrl = this.fileUrl;
        }
        return xapi;
    }

    /**
     * Creates an AttachmentStatement from xAPI object
     * @param {Object} xapiObj
     * @param {string} [baseURI]
     * @returns {AttachmentStatement}
     */
    static fromXAPI(xapiObj, baseURI = "") {
        const attachment = new AttachmentStatement(
            xapiObj.usageType,
            xapiObj.display,
            xapiObj.contentType,
            xapiObj.length,
            xapiObj.sha2,
            baseURI
        );
        if (xapiObj.description) {
            attachment.setDescription(xapiObj.description);
        }
        if (xapiObj.fileUrl) {
            attachment.setFileUrl(xapiObj.fileUrl);
        }
        return attachment;
    }
}

/**
* Statement class
*/
class Statement {
    /**
     * Constructor of the Statement class
     * @param {ActorStatement} actor actor of the statement
     * @param {typeof ALL.VERBS[keyof typeof ALL.VERBS]|string} verbId verb id of the statement
     * @param {string} objectId object id of the statement
     * @param {typeof ALL.ACTIVITYTYPES[keyof typeof ALL.ACTIVITYTYPES]|string} objectType object Type of the statement
     * @param {ContextStatement} context context of the statement
     * @param {string} defaultURI default URI for the statement construction
     */
    constructor(actor, verbId, objectId, objectType, context, defaultURI) {
        this.id = uuid.v4();
        this.actor = actor;
        this.verb = new VerbStatement(verbId, defaultURI);
        this.defaultURI = defaultURI;
        if(objectType === ALL.ACTIVITYTYPES.CMI_INTERACTION) {
            this.object = new InteractionObjectStatement(objectId, objectType, this.defaultURI);
        } else {
            this.object = new ObjectStatement(objectId, objectType, this.defaultURI);
        }
        this.context = context;
        this.version = "1.0.3";
        this.result = new ResultStatement(this.defaultURI);
        this.attachments = [];
    }

    /**
     * Create a Statement from a plain object (copy-constructor)
     * @param {Object} statementObj
     * @returns {Statement}
     */
    static fromObject(statementObj) {
        const stmt = Object.create(Statement.prototype);
        Object.assign(stmt, statementObj);
        return stmt;
    }
    /**
     * Id of the statement
     * @type {string}
     */
    id;
    /**
     * Version of the statement
     * @type {string}
     */
    version;
    /**
     * default URI of the statement
     * @type {string}
     */
    defaultURI;
    /**
     * Actor of the statement
     * @type {ActorStatement}
     */
    actor;
    /**
     * Verb of the statement
     * @type {VerbStatement}
     */
    verb;
    /**
     * Object of the statement
     * @type {ObjectStatement}
     */
    object;
    /**
     * Timestamp of the statement
     * @type {string}
     */
    timestamp;
    /**
     * Context of the statement
     * @type {ContextStatement}
     */
    context;
    /**
     * Result of the statement
     * @type {ResultStatement}
     */
    result;

    /**
     * Attachments associated with the statement
     * @type {AttachmentStatement[]}
     */
    attachments;

    
    /**
     * Convert to xAPI format
     * @returns {Object}
     */
    toXAPI() {
        var xapiTrace={};
        if(this.id) {
            xapiTrace.id = this.id;
        }
        if(this.actor) {
            xapiTrace.actor = this.actor.toXAPI();
        }
        if(this.verb) {
            xapiTrace.verb = this.verb.toXAPI();
        }
        if(this.object) {
            xapiTrace.object = this.object.toXAPI();
        }
        if(!this.result.isEmpty()) {
            xapiTrace.result = this.result.toXAPI();
        }
        if(this.context) {
            xapiTrace.context = this.context.toXAPI();
        }
        if(this.timestamp) {
            xapiTrace.timestamp = this.timestamp;
        }
        if(this.version) {
            xapiTrace.version = this.version;
        }
        if (Array.isArray(this.attachments) && this.attachments.length > 0) {
            xapiTrace.attachments = this.attachments.map((attachment) =>
                attachment && typeof attachment.toXAPI === 'function' ? attachment.toXAPI() : attachment
            );
        }
        return xapiTrace;
    }

    /**
     * Create a Statement from an xAPI object
     * @param {Object} xapiObj
     * @param {string} baseURI default URI for the statement construction (optional)
     * @returns {Statement}
     */
    static fromXAPI(xapiObj, baseURI, platform = null) {
        // Actor
        const actor = ActorStatement.fromXAPI(xapiObj.actor);
        // Verb
        const verb = VerbStatement.fromXAPI(xapiObj.verb, baseURI);
        // Object
        let object;
        if (xapiObj.object && xapiObj.object.definition && xapiObj.object.definition.interactionType) {
            object = InteractionObjectStatement.fromXAPI(xapiObj.object, baseURI);
        } else {
            object = ObjectStatement.fromXAPI(xapiObj.object, baseURI);
        }
        // Context
        const context = xapiObj.context ? ContextStatement.fromXAPI(xapiObj.context, baseURI, platform) : new ContextStatement(baseURI, platform);
        // Result
        const result = xapiObj.result ? ResultStatement.fromXAPI(xapiObj.result, baseURI) : new ResultStatement(baseURI);

        // Create Statement instance (bypass constructor)
        const stmt = Object.create(Statement.prototype);
        stmt.id = xapiObj.id || uuid.v4();
        stmt.actor = actor;
        stmt.verb = verb;
        stmt.object = object;
        stmt.context = context;
        stmt.result = result;
        stmt.timestamp = xapiObj.timestamp;
        stmt.version = xapiObj.version || "1.0.3";
        stmt.defaultURI = baseURI;
        stmt.attachments = Array.isArray(xapiObj.attachments)
            ? xapiObj.attachments.map((attachment) => AttachmentStatement.fromXAPI(attachment, baseURI))
            : [];
        return stmt;
    }
    /**
     * Convert to CSV format
     * 
     * @returns {String}
     */
    toCSV() {
        var csv=[];
        csv.push(this.timestamp);
        csv.push(this.verb.toCSV());
        csv.push(this.object.toCSV());
        var result='';
        if(!this.result.isEmpty()) {
            result=this.result.toCSV();
        }
        return `${csv.join(",")}${result}`;
    }
}

/**
* Statement class
*/
class LRSStatement extends Statement {
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
            authority: !this.authority.isEmpty() ? this.authority.toXAPI() : null,
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

// ------------------------------------------------------------------
// 1) THE BUILDER


// ------------------------------------------------------------------
/**
 * Statement Builder Class
 */
class StatementBuilder {
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
      // @ts-ignore
      this._sendPromise = await this.client.enqueue(this.statement);
    }
    return this._sendPromise;
  }
}

class LRSStatementBuilder extends StatementBuilder {
    /**
     * Constructor of LRSStatementBuilder
     * @param {xAPITrackerAsset} xapiClient the Tracker
     * @param {object} initial the initial statement
     */
    constructor(xapiClient, initial) {
        super(xapiClient, initial);
        this.statement = initial;
    }

    /**
     * Statement
     * @type {LRSStatement}
     */
    statement;

    /**
     * Adds a context activity to the statement
     * @param {typeof STATEMENT.CONTEXT.ACTIVITIES[keyof typeof STATEMENT.CONTEXT.ACTIVITIES]} type - The context activity type from STATEMENT_BUILDER_IDS.CONTEXT.ACTIVITIES
     * @param {string} id - The IRI identifier of the context activity
     * @param {typeof ALL.ACTIVITYTYPES[keyof typeof ALL.ACTIVITYTYPES]|string} activityType - The activity type IRI
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withContextActivity(type, id, activityType) {
        this.statement.context.addContextActivity(type, id, activityType);
        return this;
    }

    /**
     * Add or set a platform to statement context
     * @param {string} platform platform to set
     * @return {StatementBuilder} Returns the current instance for chaining
     */
    withPlatform(platform) {
        this.statement.context.setPlatform(platform);
        return this;
    }

    /**
     * Sets the actor using an account identifier
     * @param {string} accountName - The account name
     * @param {string} accountHomePage - The home page IRI of the account service provider
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withActorAccount(accountName, accountHomePage) {
        this.statement.actor.setActor('account', { name: accountName, homePage: accountHomePage });
        return this;
    }

    /**
     * Sets the actor using an mbox (mailto URI)
     * @param {string} mbox - The mailto URI of the actor (e.g. 'mailto:user@example.com')
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withActorMbox(mbox) {
        this.statement.actor.setActor('mbox', mbox);
        return this;
    }

    /**
     * Sets the actor using an mbox SHA1 hash
     * @param {string} mboxSha1 - The SHA1 hash of the actor's mbox URI
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withActorMboxSha1(mboxSha1) {
        this.statement.actor.setActor('mbox_sha1sum', mboxSha1);
        return this;
    }

    /**
     * Sets the actor using an OpenID URI
     * @param {string} openid - The OpenID URI of the actor
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withActorOpenID(openid) {
        this.statement.actor.setActor('openid', openid);
        return this;
    }

    /**
     * Sets the authority using an account identifier
     * @param {string} accountName - The account name
     * @param {string} accountHomePage - The home page IRI of the account service provider
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withAutorityAccount(accountName, accountHomePage) {
        this.statement.authority.setActor('account', { name: accountName, homePage: accountHomePage });
        return this;
    }

    /**
     * Sets the authority using an mbox (mailto URI)
     * @param {string} mbox - The mailto URI of the authority (e.g. 'mailto:lrs@example.com')
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withAutorityMbox(mbox) {
        this.statement.authority.setActor('mbox', mbox);
        return this;
    }

    /**
     * Sets the authority using an mbox SHA1 hash
     * @param {string} mboxSha1 - The SHA1 hash of the authority's mbox URI
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withAutorityMboxSha1(mboxSha1) {
        this.statement.authority.setActor('mbox_sha1sum', mboxSha1);
        return this;
    }

    /**
     * Sets the authority using an OpenID URI
     * @param {string} openid - The OpenID URI of the authority
     * @returns {LRSStatementBuilder} This builder instance for chaining
     */
    withAutorityOpenID(openid) {
        this.statement.authority.setActor('openid', openid);
        return this;
    }

    /**
     * Add or set the stored timestamp of the statement
     * @param {Date|null} stored - The stored timestamp to set as an Date object or null (set to now)
     * @return {LRSStatementBuilder} This builder instance for chaining
     * */
    withStored(stored = new Date()) {
        this.statement.stored = stored instanceof Date ? stored.toISOString() : undefined;
        return this;
    }

    /**
     * Add or set an actor to the statement
     * @param {string} type - The type of the actor
     * @param {object} actor - The actor object
     * @return {StatementBuilder} Returns the current instance for chaining
    */
    withActor(type, actor) {
        this.statement.actor.setActor(type, actor);
        return this;
    }

    /**
     * Sets the ID of the statement
     * @param {string} id - The UUID to set as the statement ID
     * @returns {StatementBuilder} This builder instance for chaining
     */
    withId(id) {
        this.statement.id = id;
        return this;
    }

     /**
     * Sets the version of the statement
     * @param {string} version - The version to set
     * @returns {StatementBuilder} This builder instance for chaining
     */
    withVersion(version) {
        this.statement.version = version;
        return this;
    }

    /**
     * Sets the timestamp of the statement
     * @param {Date|null} timestamp - The timestamp to set as an Date object or null (set to now)
     * @returns {StatementBuilder} This builder instance for chaining
     */
    withTimestamp(timestamp = new Date()) {
        this.statement.timestamp = timestamp ? timestamp.toISOString() : undefined;
        return this;
    }

    /**
     * Sends the built statement to the LRS
     * @returns {Promise<void>} Promise that resolves when the statement has been sent
     */
    async send() {
        return await super.send();
    }


}

const msFn$1 = ms__namespace.default || ms__namespace;

/**
 * XAPI Tracker Asset Class
 * Handles xAPI tracking with batch processing, retry logic, and backup capabilities
 */
class xAPITrackerAsset {
    // XAPI PARAMETERS

    /**
     * XAPI Tracker instance
     * @type {XAPI|null}
     */
    xapi=null;

    /**
     * Settings of XAPI Tracker Asset
     * @typedef {Object} settings
     * @property {boolean} batch_mode
     * @property {string} batch_endpoint
     * @property {number} batch_length
     * @property {number} batch_timeout
     * @property {string} platform
     * @property {string} actor_name
     * @property {string} actor_homepage
     * @property {boolean} backup_mode
     * @property {string} backup_endpoint
     * @property {string} backup_type
     * @property {string} default_uri
     * @property {number} max_retry_delay
     * @property {boolean} debug
     * @property {string} parent_activity_id
     * @property {string} registration_id
    * @property {string} parent_activity_type
     */
    settings={
        batch_mode:true,
        batch_endpoint:"http://myurl.com/endpoint",
        batch_length:100,
        batch_timeout:msFn$1("30sec"),
        platform:"http://myhomepage.com",
        actor_name:"my_default_actor",
        actor_homepage:"",
        backup_mode:false,
        backup_endpoint:"http://myurl.com/backup-endpoint",
        backup_type:"XAPI",
        default_uri:"mydefaulturi",
        max_retry_delay:msFn$1("2min"),
        debug:false,
        parent_activity_id:'',
        registration_id: '',
        parent_activity_type:ALL.ACTIVITYTYPES.LESSON
    };

    /**
     * Authentication token for xAPI requests
     * @type {string|null}
     */
    auth_token = null;

    /**
     * Current online status
     * @type {boolean}
     */
    online = false;

    /**
     * Current connected status
     * @type {boolean}
     */
    connected = false;

    /**
     * Current started status
     * @type {boolean}
     */
    started = false;

    // STATEMENTS PARAMETERS

    /**
     * Queue of statements to be sent
     * @type {Array<Statement>}
     */
    statementsToSend = [];

    /**
     * Flag indicating if sending is currently in progress
     * @type {boolean}
     */
    sendingInProgress = false;

    /**
     * Current offset in the statements queue
     * @type {number}
     */
    offset = 0;

    // BACKUP PARAMETERS
    /**
     * Additional parameters for backup requests
     * @type {Object|null}
     */
    backupRequestParameters = null;

    // ACTOR PARAMETERS
    /**
     * Actor statement object
     * @type {ActorStatement}
     */
    actor;

    /**
     * Context statement object
     * @type {ContextStatement}
     */
    context;
    
    /**
     * Context statement without parent object
     * @type {ContextStatement}
     */
    context_without_parent;

    // BATCH AND RETRY PARAMETERS
    /**
     * Current retry delay in milliseconds
     * @type {number|null}
     */
    retryDelay;

    /**
     * Timer reference for batch processing
     * @type {NodeJS.Timeout|null}
     */
    timer = null;

    /**
     * Creates an instance of xAPITrackerAsset
     */
    constructor() {
        this.#onOffline();
    }

    /**
     * Logs out the current session by clearing the authentication token
     */
    logout() {
         if(this.connected) {
            this.auth_token = null;
         }
    }
    
    isLoggedIn() {
        return this.connected && this.auth_token != null;
    }
    
    /**
     * Event handler called when the client goes offline
     */
    #onOffline() {
        this.online = false;        
        if (this.settings.debug) console.warn("XAPI Tracker for Serious Games went offline");
    }

    start() {
        this.started = true;
        const actorName = this.settings.actor_name || this.getUsername() || '';
        const homePage = this.settings.actor_homepage || this.settings.platform || '';
        this.actor = new ActorStatement({account :{name: actorName, homePage: homePage}});
        if(this.settings.registration_id) {
            this.context = new ContextStatement(this.settings.default_uri, this.settings.platform, this.settings.registration_id);
        } else {
            this.context = new ContextStatement(this.settings.default_uri, this.settings.platform);
        }
        this.context_without_parent = this.context.clone();
        if(this.settings.parent_activity_id) {
            this.context.addContextActivity("parent", this.settings.parent_activity_id, this.settings.parent_activity_type);
        }
        if(this.connected) {
            this.xapi = new XAPI({
                endpoint: this.settings.batch_endpoint,
                auth: this.auth_token
            });
        }
        if(this.xapi != null) {
            this.#onOnline();
        } else {
            this.#onOffline();
        }
    }

    stop() {
        this.started = false;
        this.connected=false;
        this.online=false;
        this.offset = 0;
        this.statementsToSend = [];
        this.timer = null;
        this.actor = null;
        this.context = null;
        this.xapi=null;
        this.#onOffline();
    }

    /**
     * Event handler called when the client comes online
     * @returns {Promise<void>}
     */
    async #onOnline() {
        this.online = true;
        if (this.settings.debug) console.info("XAPI Tracker for Serious Games back Online");
    }

    /**
     * Updates the authentication configuration
     * 
     */
    async login() {
        if(this.auth_token) {
            this.connected=true;
        } else {
            this.connected=false;
        }
    }

    getUsername()  {
        return this.settings.actor_name || "";
    }

    /**
     * Sends a batch of statements to the xAPI endpoint
     * @returns {Promise<void>}
     */
    async #sendBatch() {
        if (!this.online) return;
        if (this.offset >= this.statementsToSend.length) return;

        const end = Math.min(this.offset + this.settings.batch_length, this.statementsToSend.length);
        const batch = this.statementsToSend.slice(this.offset, end);
        const statements = batch.map(statement => statement.toXAPI());

        try {
            if(!this.sendingInProgress) {
                this.sendingInProgress = true;
                const result = await this.xapi.sendStatements({statements: statements});
                this.sendingInProgress = false;
                if (this.settings.debug) {
                    console.debug("Batch sent successfully:", result);
                }
                this.offset += batch.length;
                this.retryDelay = null;
            }
        } catch (error) {
            this.sendingInProgress = false;
            if (!error.response) {
                // Network error or no response (e.g. ECONNREFUSED, DNS failure)
                console.error("[TRACKER: Batch Processor] Network error (no response):", error.message);
                this.#onOffline();
            } else {
                console.error("Error sending batch:", error.response);
                const status = error.response.status;
                const errorMessage = (error.response.data && error.response.data.message) || error.message;

                switch (status) {
                    case 400: // Bad Request
                        console.error(`Bad Request: ${errorMessage}`);
                        // Bad Request likely means there's an issue with the statement format or content
                        // Log the error and skip this batch to avoid blocking future batches
                        this.offset += batch.length; // Skip the problematic batch
                        break;
                    case 401: // Unauthorized
                    case 403: // Forbidden
                        console.error(`${status === 401 ? 'Unauthorized' : 'Forbidden'}: ${errorMessage}`);
                        this.rethrow = false; // Don't rethrow since we're handling the retry logic here
                        this.#onOffline();
                        await this.refreshAuth();
                        await this.#sendBatch();
                        break;
                    default:
                        console.error(`[TRACKER: Batch Processor] Batch upload returned status ${status} with message: ${errorMessage}`);
                        this.#onOffline();
                }
            }

            if(this.retryDelay == null) {
                this.retryDelay = this.settings.batch_timeout;
            }
            this.retryDelay = Math.min(this.retryDelay * 2, this.settings.max_retry_delay);
            this.timer = null;
            if (this.offset < this.statementsToSend.length) {
                this.#startTimer();
            }
            {
                throw error; // Rethrow to allow external handling if needed
            }
        }

        if (this.offset < this.statementsToSend.length) {
            this.#startTimer();
        }
    }

    /**
     * Refreshes the authentication token
     * @returns {Promise<void>}
     */
    async refreshAuth() {
        this.login();
    }

    /**
     * Starts the timer for batch processing
     */
    #startTimer() {
        if (this.timer) return;
        let timeout = this.retryDelay ? this.retryDelay : this.settings.batch_timeout;

        this.timer = setTimeout(async () => {
            await this.#sendBatch();
            this.timer = null;
            if (this.offset < this.statementsToSend.length) {
                this.#startTimer();
            }
        }, timeout);
    }

    /**
     * Creates a new statement builder
     * @param {string} verbId - The verb ID for the statement
     * @param {string} objectType - The type of the object
     * @param {string} objectId - The ID of the object
     * @returns {StatementBuilder} A new StatementBuilder instance
     */
    trace(verbId, objectType, objectId, context = this.context, lrs = false) {
        const statement = new Statement(this.actor, verbId, objectId, objectType, context, this.settings.default_uri);
        if(lrs) {
            return new LRSStatementBuilder(this, statement);
        } else {
            return new StatementBuilder(this, statement);
        }
    }

    /**
     * Creates a StatementBuilder from an existing xAPI statement object
     * @overload
     * @param {Object} statement - The statement to send
     * @param {true} lrs - Whether to create an LRSStatementBuilder
     * @return {LRSStatementBuilder} A new LRSStatementBuilder instance
     */
    /**
     * @overload
     * @param {Object} statement - The statement to send
     * @param {false} [lrs] - Whether to create a regular StatementBuilder
     * @return {StatementBuilder} A new StatementBuilder instance
     */
    /**
     * @param {Object} statement
     * @param {boolean} [lrs]
     * @return {StatementBuilder|LRSStatementBuilder}
     */
    fromXAPI(statement, lrs = false) {
        if(lrs) {   
            const stmt = LRSStatement.fromXAPI(statement, this.settings.default_uri, this.settings.platform);
            return new LRSStatementBuilder(this, stmt);
        } else {
            const stmt = Statement.fromXAPI(statement, this.settings.default_uri, this.settings.platform);
            return new StatementBuilder(this, stmt);
        }
    }

    /**
     * Sends statements to the backup endpoint
     * @returns {Promise<void>}
     */
    async #sendBackup() {
        if (this.online && this.settings.backup_endpoint && this.settings.backup_endpoint.trim()) {
            let contentType;
            let statements;

            switch (this.settings.backup_type) {
                case 'XAPI':
                    statements = this.statementsToSend.map(statement => JSON.stringify(statement.toXAPI()));
                    contentType = 'application/json';
                    break;
                case 'CSV':
                    statements = this.statementsToSend.map(statement => statement.toCSV());
                    contentType = 'text/csv';
                    break;
                default:
                    return;
            }

            const body = {
                tofile: true,
                result: statements.join('\n'),
                contentType: contentType
            };

            const myRequest = {
                url: this.settings.backup_endpoint,
                method: 'POST',
                headers: {
                    'Authorization': this.auth_token || '',
                    'Content-Type': 'application/json'
                },
                data: JSON.stringify(body, null, 2)
            };

            if (this.backupRequestParameters) {
                if (this.backupRequestParameters.content_type) {
                    myRequest.headers['Content-Type'] = this.backupRequestParameters.content_type;
                }

                if (this.backupRequestParameters.headers && typeof this.backupRequestParameters.headers === 'object') {
                    Object.entries(this.backupRequestParameters.headers).forEach(([key, value]) => {
                        myRequest.headers[key] = value;
                    });
                }

                if (this.backupRequestParameters.query_parameters && typeof this.backupRequestParameters.query_parameters === 'object') {
                    const queryParams = new URLSearchParams(this.backupRequestParameters.query_parameters).toString();
                    myRequest.url += `?${queryParams}`;
                }
            }

            try {
                const response = await axios(myRequest);
                console.log(response);
            } catch (error) {
                if (error.response) {
                    const status = error.response.status;
                    const errorMessage = error.response.data.message || error.message;

                    switch (status) {
                        case 401: // Unauthorized
                        case 403: // Forbidden
                            this.#onOffline();
                            console.error(`${status === 401 ? 'Unauthorized' : 'Forbidden'}: ${errorMessage}`);
                            await this.refreshAuth();
                            await this.#sendBackup();
                            break;
                        default:
                            console.error(`[TRACKER: Backup Processor] Backup upload returned status ${status} with message: ${errorMessage}`);
                            break;
                    }
                } else {
                    throw new Error(`Request failed: ${error.message}`);
                }
            }
        }
    }

    /**
     * Adds a statement to the queue and starts processing if needed
     * @param {Statement} statement - The statement to enqueue
     * @returns {Promise<void>}
     */
    async enqueue(statement) {
        if(this.settings.debug) {
            console.debug(statement.toXAPI());
            console.debug(statement.toCSV());
        }

        this.statementsToSend.push(statement);

        if (this.online && this.statementsToSend.length >= this.offset + this.settings.batch_length) {
            await this.#sendBatch();
        }

        this.#startTimer();
    }

    /**
     * Flushes the statement queue
     * @param {Object} [opts] - Options object
     * @param {boolean} [opts.withBackup=false] - Whether to also send to backup endpoint
     * @returns {Promise<void>} Promise that resolves when flushing is complete
     */
    async flush({withBackup = false} = {}) {
        if(withBackup) {
            await Promise.all([
                this.#sendBatch(),
                this.#sendBackup()
            ]);
        } else {
            await this.#sendBatch();
        }
    }
    
    /**
     * Gets the XAPI client
     * @returns {XAPI} The XAPI client
     */
    getXAPIClient() {
        if (!this.online) {
            throw new Error("Cannot get XAPI client: Tracker is offline");
        }
        if (!this.connected) {
            throw new Error("Cannot get XAPI client: Tracker is not connected");
        }
        if (!this.xapi) {
            throw new Error("Cannot get XAPI client: XAPI client is not initialized");
        }
        try {
            return this.xapi;
        } catch (error) {
            throw new Error(`Failed to get XAPI client: ${error.message}`);
        }
    }
}

/**
 * A specialized tracker asset that implements OAuth1 authentication.
 * Extends the base xAPITrackerAsset with basic authentication capabilities.
 */
class xAPITrackerAssetOAuth1 extends xAPITrackerAsset {
     /**
     * @typedef {Object} oauth1Settings
     * @property {string} username
     * @property {string} password
     */
    oauth1Settings={
        username:"",
        password:""
    };
    /**
     * Creates an instance of xAPITrackerAssetOAuth1.
     */
    constructor() {
        super();
        this.oauth1Settings.username="";
        this.oauth1Settings.password="";
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', () => {
                if (this.auth_token) {
                    this.logout();
                }
            });
        }
    }

    async login() {
        this.auth_token=XAPI.toBasicAuth(this.oauth1Settings.username, this.oauth1Settings.password);
        return super.login();
    }

    /**
     * Refreshes the authentication token.
     * Delegates to the parent class implementation.
     *
     * @returns {Promise<void>} A promise that resolves when the refresh is complete
     */
    async refreshAuth() {
        super.refreshAuth();
    }

    getUsername() {
        return this.oauth1Settings.username;
    }

    /**
     * Logs out the current session.
     * Delegates to the parent class implementation.
     */
    logout() {
        super.logout();
    }
}

/**
 * OAuth 2.0 Authorization Error
 * Matches XASU OAuth2AuthorizationError
 */
class OAuth2AuthorizationError extends Error {
    constructor(error, errorDescription) {
        super(errorDescription || error);
        this.name = 'OAuth2AuthorizationError';
        this.error = error;
        this.errorDescription = errorDescription || '';
    }
}

/**
 * OAuth 2.0 Device Authorization Error
 * Matches XASU OAuth2DeviceAuthorizationError
 */
class OAuth2DeviceAuthorizationError extends Error {
    constructor(error, errorDescription) {
        super(errorDescription || error);
        this.name = 'OAuth2DeviceAuthorizationError';
        this.error = error;
        this.errorDescription = errorDescription || '';
    }
}

/**
 * OAuth 2.0 Device Authorization Response
 * Matches XASU OAuth2DeviceAuthorization
 */
class OAuth2DeviceAuthorization {
    device_code = null;
    user_code = null;
    verification_uri = null;
    verification_uri_complete = null;
    interval = 0;
    expires_in = 0;

    static fromJson(json) {
        const obj = new OAuth2DeviceAuthorization();
        obj.device_code = json.device_code || null;
        obj.user_code = json.user_code || null;
        obj.verification_uri = json.verification_uri || null;
        obj.verification_uri_complete = json.verification_uri_complete || null;
        obj.interval = json.interval || 0;
        obj.expires_in = json.expires_in || 0;
        return obj;
    }
}

/**
 * OAuth 2.0 Token
 * Matches XASU OAuth2Token with normalized fields
 */
class OAuth2Token {
    access_token = null;
    token_type = null;
    expires_in = 0;
    refresh_token = null;
    username = null;
    client_id = null;
    requestTime = null;

    get expired() {
        if (!this.requestTime || !this.expires_in) return true;
        const expiredTime = new Date(this.requestTime.getTime() + this.expires_in * 1000);
        return new Date() > expiredTime;
    }

    static fromJson(json) {
        const obj = new OAuth2Token();
        obj.access_token = json.access_token || null;
        obj.token_type = json.token_type || json.tokenType || 'Bearer';
        obj.expires_in = json.expires_in || json.expiresIn || 0;
        obj.refresh_token = json.refresh_token || json.refreshToken || null;
        obj.username = json.username || json.user_name || null;
        obj.requestTime = new Date();
        return obj;
    }
}

/**
 * A class that implements OAuth 2.0 protocol for authentication and token management.
 * Supports various grant types including password, refresh_token, and device_code flows.
 * closely modeled after XASU OAuth2DeviceProtocol (C#)
 */
class OAuth2Protocol {
    static FIELD_MISSING_MESSAGE = 'Field "{0}" required for "OAuth 2.0" authentication is missing!';
    static UNSUPPORTED_GRANT_TYPE_MESSAGE = 'Grant type "{0}" not supported. Please use "password", "refresh_token", or "urn:ietf:params:oauth:grant-type:device_code" type.';
    static UNSUPPORTED_PKCE_METHOD_MESSAGE = 'Code challenge (PKCE) method "{0}" not supported. Please use "S256" method or disable it.';

    static DEVICE_AUTHORIZATION_ENDPOINT_FIELD = 'device_authorization_endpoint';
    static TOKEN_ENDPOINT_FIELD = 'token_endpoint';
    static CLIENT_ID_FIELD = 'client_id';
    static SCOPE_FIELD = 'scope';
    static GRANT_TYPE_FIELD = 'grant_type';
    static POLL_INTERVAL_FIELD = 'poll_interval';
    static MAX_POLL_ATTEMPTS_FIELD = 'max_poll_attempts';

    deviceAuthorizationEndpoint = null;
    tokenEndpoint = null;
    grantType = null;
    username = null;
    password = null;
    clientId = null;
    scope = null;
    state = null;
    login_hint = null;
    codeChallengeMethod = null;

    deviceCode = null;
    userCode = null;
    verificationUri = null;
    verificationUriComplete = null;
    interval = null;
    maxPollAttempts = null;
    pollInterval = null;

    token = null;
    tokenRefreshInProgress = false;
    onAuthorizationInfoUpdate = null;
    /** Internal hook wired to the built-in blocking UI. Not for host use. */
    onDeviceAuthorizationInfo = null;

    #config = null;

    constructor(config) {
        this.#config = config;
        this.tokenEndpoint = this.#getRequiredValue(config, OAuth2Protocol.TOKEN_ENDPOINT_FIELD);
        this.grantType = this.#getRequiredValue(config, OAuth2Protocol.GRANT_TYPE_FIELD).toLowerCase();
        this.clientId = this.#getRequiredValue(config, OAuth2Protocol.CLIENT_ID_FIELD);
        this.clientSecret = config["client_secret"];
        this.scope = config[OAuth2Protocol.SCOPE_FIELD] || null;
        this.state = config.state || null;
        this.pollInterval = parseInt(config[OAuth2Protocol.POLL_INTERVAL_FIELD], 10) || null;
        this.maxPollAttempts = parseInt(config[OAuth2Protocol.MAX_POLL_ATTEMPTS_FIELD], 10) || null;

        if (config.code_challenge_method) {
            const method = config.code_challenge_method.toUpperCase();
            if (method === 'S256') {
                this.codeChallengeMethod = 'S256';
            } else {
                throw new OAuth2AuthorizationError(
                    'unsupported_code_challenge_method',
                    OAuth2Protocol.UNSUPPORTED_PKCE_METHOD_MESSAGE.replace('{0}', method)
                );
            }
        }

        switch (this.grantType) {
            case 'password':
                this.username = this.#getRequiredValue(config, 'username');
                this.password = this.#getRequiredValue(config, 'password');
                this.login_hint = config['login_hint'];
                break;
            case 'urn:ietf:params:oauth:grant-type:device_code':
                this.deviceAuthorizationEndpoint = this.#getRequiredValue(config, OAuth2Protocol.DEVICE_AUTHORIZATION_ENDPOINT_FIELD);
                break;
            case 'refresh_token':
                break;
            default:
                throw new OAuth2AuthorizationError(
                    'unsupported_grant_type',
                    OAuth2Protocol.UNSUPPORTED_GRANT_TYPE_MESSAGE.replace('{0}', this.grantType)
                );
        }
    }

    async getToken() {
        console.log('[OAuth2] Starting');
        switch (this.grantType) {
            case 'refresh_token':
                this.token = await this.#doRefreshToken(this.tokenEndpoint, this.clientId, this.clientSecret, this.token.refresh_token);
                break;
            case 'password':
                this.token = await this.#doResourceOwnedPasswordCredentialsFlow(
                    this.tokenEndpoint,
                    this.clientId,
                    this.clientSecret,
                    this.username,
                    this.password,
                    this.login_hint,
                    this.scope,
                    this.state,
                );
                break;
            case 'urn:ietf:params:oauth:grant-type:device_code':
                await this.#doDeviceAuthorizationFlow();
                break;
            default:
                throw new OAuth2AuthorizationError(
                    'unsupported_grant_type',
                    OAuth2Protocol.UNSUPPORTED_GRANT_TYPE_MESSAGE.replace('{0}', this.grantType)
                );
        }

        if (this.token) {
            console.log('[OAuth2] Token obtained: ' + this.token.access_token);
        }
    }

    // ─── Device Authorization Flow (RFC 8628) ─────────────────────────────────
    // Closely mirrors XASU OAuth2DeviceProtocol.Init()

    async #doDeviceAuthorizationFlow() {
        console.log('[OAuth2Device] Starting');

        if (!OAuth2Protocol.#isValidHttpUrl(this.deviceAuthorizationEndpoint)) {
            const msg = 'The device authorization endpoint is not a valid URL. Received: ' + this.deviceAuthorizationEndpoint;
            console.error('[OAuth2Device] ' + msg);
            throw new OAuth2AuthorizationError('invalid_device_authorization_endpoint', msg);
        }

        if (!OAuth2Protocol.#isValidHttpUrl(this.tokenEndpoint)) {
            const msg = 'The token endpoint is not a valid URL. Received: ' + this.tokenEndpoint;
            console.error('[OAuth2Device] ' + msg);
            throw new OAuth2AuthorizationError('invalid_token_endpoint', msg);
        }

        const maxRetries = this.maxPollAttempts > 0 ? this.maxPollAttempts : 0;
        const retryInterval = this.pollInterval > 0 ? this.pollInterval : 5;

        let lastError = null;

        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            if (attempt > 0) {
                console.warn('[OAuth2Device] Device code expired or timed out. Waiting ' + retryInterval + 's before requesting a new device code (retry ' + attempt + '/' + maxRetries + ').');
                await new Promise(resolve => setTimeout(resolve, retryInterval * 1000));
            }

            try {
                return await this.#doDeviceAuthorizationFlowOnce();
            } catch (error) {
                const retryable = error instanceof OAuth2AuthorizationError
                    && (error.error === 'expired_token' || error.error === 'timeout');

                if (retryable && attempt < maxRetries) {
                    lastError = error;
                    console.warn('[OAuth2Device] ' + error.error + ': requesting a new device code.');
                    continue;
                }

                throw error;
            }
        }

        throw lastError || new OAuth2AuthorizationError(
            'timeout',
            'Device authorization failed after ' + (maxRetries + 1) + ' attempts.'
        );
    }

    /**
     * Runs a single device authorization attempt: requests a device code,
     * notifies the host application, and polls the token endpoint.
     *
     * @returns {Promise<void>}
     */
    async #doDeviceAuthorizationFlowOnce() {
        // Step 1: Request device and user codes
        const deviceAuth = await this.#doDeviceAuthorizationRequest(this.deviceAuthorizationEndpoint, this.clientId, this.clientSecret, this.scope);

        console.log('[OAuth2Device] User code: ' + deviceAuth.user_code);

        // Step 2: Open verification URL in browser for user to approve
        const verificationUrl = deviceAuth.verification_uri_complete
            || deviceAuth.verification_uri;

        if (!OAuth2Protocol.#isValidHttpUrl(verificationUrl)) {
            const msg = 'The device authorization server did not provide a valid verification URL.';
            console.error('[OAuth2Device] ' + msg);
            throw new OAuth2AuthorizationError('invalid_verification_uri', msg);
        }

        let popupBlocked = false;
        try {
            if (typeof window !== 'undefined' && window.open) {
                const popup = window.open(verificationUrl, '_blank');
                if (popup == null) {
                    popupBlocked = true;
                }
            } else {
                popupBlocked = true;
            }
        } catch (e) {
            popupBlocked = true;
        }

        if (popupBlocked) {
            console.warn('[OAuth2Device] Popup blocked by the browser. User must manually open ' + verificationUrl + ' and enter code ' + deviceAuth.user_code + '.');
        } else {
            console.log('[OAuth2Device] Opened verification URL: ' + verificationUrl);
        }

        if (this.onDeviceAuthorizationInfo) {
            this.onDeviceAuthorizationInfo({
                user_code: deviceAuth.user_code,
                verification_uri: deviceAuth.verification_uri,
                verification_uri_complete: deviceAuth.verification_uri_complete,
                expires_in: deviceAuth.expires_in,
                interval: deviceAuth.interval,
                popupBlocked: popupBlocked
            });
        }

        // Step 3: Poll the token endpoint until approved
        const interval = deviceAuth.interval > 0 ? deviceAuth.interval : 5;
        const maxAttempts = deviceAuth.expires_in > 0
            ? Math.floor(deviceAuth.expires_in / interval) + 1
            : 60;

        console.log('[OAuth2Device] Polling token endpoint every ' + interval + 's for up to ' + maxAttempts + ' attempts.');

        this.token = await this.#pollForToken(this.tokenEndpoint, this.clientId, this.clientSecret, deviceAuth.device_code, interval, maxAttempts);

        if (this.token) {
            console.log('[OAuth2Device] Token obtained: ' + this.token.access_token);
            if (this.token.username) {
                console.log('[OAuth2Device] Username found: ' + this.token.username);
            }
            if (this.onAuthorizationInfoUpdate) {
                this.onAuthorizationInfoUpdate(this.token);
            }
        }
    }

    /**
     * Requests a device code from the device authorization endpoint.
     * Closely mirrors XASU OAuth2DeviceProtocol.DoDeviceAuthorizationRequest()
     *
     * @param {string} endpoint - The device authorization endpoint URL
     * @param {string} clientId - The client ID
     * @param {string} [clientSecret] - The client Secret
     * @param {string} [scope] - Optional scope
     * @returns {Promise<OAuth2DeviceAuthorization>} The device authorization response
     * @throws {OAuth2AuthorizationError} If the request fails
     */
    async #doDeviceAuthorizationRequest(endpoint, clientId, clientSecret, scope) {
        const form = { client_id: clientId, client_secret: (clientSecret != "" ? clientSecret : null) };
        if (scope) {
            form.scope = scope;
        }

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(form),
            });

            const responseBody = await response.text();

            if (response.status < 200 || response.status >= 300) {
                throw OAuth2Protocol.#buildDeviceAuthorizationError(response.status, responseBody, endpoint);
            }

            let json;
            try {
                json = JSON.parse(responseBody);
            } catch (e) {
                throw new OAuth2AuthorizationError('invalid_response', 'Failed to parse device authorization response.');
            }

            const deviceAuth = OAuth2DeviceAuthorization.fromJson(json);

            if (!deviceAuth.device_code || !deviceAuth.user_code ||
                (!deviceAuth.verification_uri && !deviceAuth.verification_uri_complete)) {
                throw new OAuth2AuthorizationError(
                    'invalid_response',
                    'The device authorization server response is missing required fields (device_code, user_code or verification_uri).'
                );
            }

            return deviceAuth;
        } catch (error) {
            if (error instanceof OAuth2AuthorizationError) {
                throw error;
            }
            // Network or other fetch error
            if (error instanceof TypeError || error.name === 'TypeError') {
                throw new OAuth2AuthorizationError(
                    'network_error',
                    'Device authorization request to "' + endpoint + '" failed: ' + error.message
                );
            }
            throw new OAuth2AuthorizationError(
                'request_failed',
                'Device authorization request to "' + endpoint + '" failed: ' + error.message
            );
        }
    }

    /**
     * Polls the token endpoint for an access token using the device code.
     * Closely mirrors XASU OAuth2DeviceProtocol.PollForToken()
     *
     * @param {string} tokenUrl - The token endpoint URL
     * @param {string} clientId - The client ID
     * @param {string} clientSecret - The client Secret
     * @param {string} deviceCode - The device code
     * @param {number} interval - Polling interval in seconds
     * @param {number} maxAttempts - Maximum number of poll attempts
     * @returns {Promise<OAuth2Token>} The obtained token
     * @throws {OAuth2AuthorizationError} If polling fails or times out
     */
    async #pollForToken(tokenUrl, clientId, clientSecret, deviceCode, interval, maxAttempts) {
        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            await new Promise(resolve => setTimeout(resolve, interval * 1000));

            const form = {
                grant_type: 'urn:ietf:params:oauth:grant-type:device_code',
                client_id: clientId,
                client_secret: clientSecret != "" ? clientSecret : null,
                device_code: deviceCode,
            };

            console.log(
                '[OAuth2Device] Poll attempt ' + (attempt + 1) + '/' + maxAttempts +
                ': POST ' + tokenUrl +
                ' (client_id=' + clientId + ', device_code=' + deviceCode + ')'
            );

            let responseBody;
            let responseStatus;

            try {
                const response = await fetch(tokenUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: new URLSearchParams(form),
                });

                responseStatus = response.status;
                responseBody = await response.text();
            } catch (error) {
                // Network error during token poll (will retry), mirrors XASU NetworkException handling
                console.log('[OAuth2Device] Network error during token poll (will retry): ' + error.message);
                continue;
            }

            console.log('[OAuth2Device] Poll response (' + responseStatus + '): ' + responseBody);

            if (responseStatus < 200 || responseStatus >= 300) {
                let error = null;
                try {
                    const json = JSON.parse(responseBody);
                    error = json.error
                        ? new OAuth2DeviceAuthorizationError(json.error, json.error_description)
                        : null;
                } catch (e) {
                    // parse failed, error stays null
                }

                if (error && error.error) {
                    switch (error.error) {
                        case 'authorization_pending':
                            console.log('[OAuth2Device] Waiting for user authorization...');
                            continue;

                        case 'slow_down':
                            console.log('[OAuth2Device] Slow down: adding 5s to interval');
                            interval += 5;
                            continue;

                        case 'expired_token':
                            throw new OAuth2AuthorizationError(
                                'expired_token',
                                'The device code has expired. Please restart the authorization flow.'
                            );

                        case 'access_denied':
                            throw new OAuth2AuthorizationError(
                                'access_denied',
                                'The user denied the authorization request.'
                            );

                        default:
                            throw error;
                    }
                }

                throw new OAuth2AuthorizationError(
                    'http_' + responseStatus,
                    'Token request to "' + tokenUrl + '" failed with HTTP status ' + responseStatus + ': ' + responseBody
                );
            }

            let tokenResponse;
            try {
                const json = JSON.parse(responseBody);
                tokenResponse = OAuth2Token.fromJson(json);
            } catch (e) {
                throw new OAuth2AuthorizationError('invalid_response', 'Failed to parse token response.');
            }

            if (!tokenResponse || !tokenResponse.access_token) {
                throw new OAuth2AuthorizationError(
                    'invalid_response',
                    'The token endpoint response is missing the access_token.'
                );
            }

            tokenResponse.client_id = clientId;
            console.log('[OAuth2Device] Token retrieved after ' + (attempt + 1) + ' attempt(s).');
            return tokenResponse;
        }

        throw new OAuth2AuthorizationError(
            'timeout',
            'Device authorization timed out after ' + maxAttempts + ' attempts.'
        );
    }

    // ─── Password Grant Flow ──────────────────────────────────────────────────

    async #doResourceOwnedPasswordCredentialsFlow(tokenUrl, clientId, clientSecret, username, password, login_hint, scope, state) {
        const form = {
            username,
            password,
            login_hint,
        };
        if (scope) {
            form.scope = scope;
        }
        if (state) {
            form.state = state;
        }
        return await this.#doTokenRequest(tokenUrl, clientId, clientSecret, 'password', form);
    }

    // ─── Token Requests ───────────────────────────────────────────────────────

    async #doTokenRequest(tokenUrl, clientId, clientSecret, grantType, otherParams) {
        const form = {
            grant_type: grantType,
            client_id: clientId,
            client_secret: clientSecret != "" ? clientSecret : null,
            ...otherParams,
        };

        let responseStatus;
        let responseBody;

        try {
            const response = await fetch(tokenUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(form),
            });
            responseStatus = response.status;
            responseBody = await response.text();
        } catch (error) {
            if (error instanceof OAuth2AuthorizationError) {
                throw error;
            }
            throw new OAuth2AuthorizationError(
                'token_request_failed',
                'Token request to "' + tokenUrl + '" failed: ' + error.message
            );
        }

        let json = null;
        try {
            json = JSON.parse(responseBody);
        } catch (e) {
            json = null;
        }

        if (json && json.error) {
            throw new OAuth2AuthorizationError(
                json.error,
                json.error_description || json.error + ' (' + tokenUrl + ')'
            );
        }

        if (responseStatus < 200 || responseStatus >= 300 || !json || !json.access_token) {
            throw new OAuth2AuthorizationError(
                'http_' + responseStatus,
                'Token request to "' + tokenUrl + '" failed with HTTP status ' + responseStatus + ': ' + responseBody
            );
        }

        return OAuth2Token.fromJson(json);
    }

    async #doRefreshToken(tokenUrl, clientId, clientSecret, refreshToken) {
        return await this.#doTokenRequest(tokenUrl, clientId, clientSecret, 'refresh_token', { refresh_token: refreshToken });
    }

    async refreshToken() {
        if (!this.tokenRefreshInProgress) {
            try {
                this.tokenRefreshInProgress = true;
                this.token = await this.#doRefreshToken(this.tokenEndpoint, this.clientId, this.clientSecret, this.token.refresh_token);
                this.tokenRefreshInProgress = false;
                return this.token.access_token;
            } catch (error) {
                this.tokenRefreshInProgress = false;
                console.error(error);
            }
        } else {
            while (this.tokenRefreshInProgress) {
                await new Promise(r => setTimeout(r, 2000));
            }
        }
    }

    // ─── Auth Update ──────────────────────────────────────────────────────────

    hasTokenExpired() {
        if (!this.token) return true;
        return this.token.expired;
    }

    async #updateParamsForAuth(request) {
        if (this.hasTokenExpired()) {
            this.token = await this.#doRefreshToken(this.tokenEndpoint, this.clientId, this.clientSecret, this.token.refresh_token);
            if (this.onAuthorizationInfoUpdate) {
                this.onAuthorizationInfoUpdate(this.token);
            }
        }

        const tokenType = this.token.token_type
            ? this.token.token_type.charAt(0).toUpperCase() + this.token.token_type.slice(1).toLowerCase()
            : 'Bearer';

        request.headers = {
            ...request.headers,
            'Authorization': tokenType + ' ' + this.token.access_token,
        };
    }

    #registerAuthInfoUpdate(callback) {
        if (callback) {
            this.onAuthorizationInfoUpdate = callback;
            if (this.token) {
                callback(this.token);
            }
        }
    }

    // ─── Logout ───────────────────────────────────────────────────────────────

    async logout() {
        const form = {
            grant_type: 'refresh_token',
            client_id: this.clientId,
            client_secret: this.clientSecret != "" ? this.clientSecret : null,
            refresh_token: this.token.refresh_token,
        };

        try {
            const response = await fetch(this.tokenEndpoint.replace('/token', '/logout'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                body: new URLSearchParams(form),
            });
            const data = await response.json();
            console.log(data);
            console.log('[OAuth2] Logged out successfully');
        } catch (error) {
            if (error instanceof OAuth2AuthorizationError) {
                throw error;
            }
            throw new OAuth2AuthorizationError(
                'logout_failed',
                '[OAuth2] Error during logout: ' + error.message
            );
        }
    }

    // ─── Error Handling ───────────────────────────────────────────────────────

    unauthorized(errorMessage) {
        this.token = null;
        console.error('[OAuth2Device] Unauthorized: ' + errorMessage);
    }

    forbidden(errorMessage) {
        this.token = null;
        console.error('[OAuth2Device] Forbidden: ' + errorMessage);
    }

    // ─── Utility Methods ──────────────────────────────────────────────────────

    #getRequiredValue(config, key) {
        if (!config[key]) {
            throw new OAuth2AuthorizationError(
                'missing_field',
                OAuth2Protocol.FIELD_MISSING_MESSAGE.replace('{0}', key)
            );
        }
        return config[key];
    }

    /**
     * Validates that a URL is a valid HTTP or HTTPS URL.
     * Mirrors XASU OAuth2DeviceProtocol.IsValidHttpUrl()
     *
     * @param {string} url - The URL to validate
     * @returns {boolean} True if the URL is valid
     */
    static #isValidHttpUrl(url) {
        if (!url || typeof url !== 'string') {
            return false;
        }
        try {
            const parsed = new URL(url);
            return parsed.protocol === 'http:' || parsed.protocol === 'https:';
        } catch (e) {
            return false;
        }
    }

    /**
     * Builds a device authorization error from an HTTP response.
     * Mirrors XASU OAuth2DeviceProtocol.BuildDeviceAuthorizationError()
     *
     * @param {number} status - HTTP status code
     * @param {string} body - Response body
     * @param {string} url - Request URL
     * @returns {OAuth2AuthorizationError} The constructed error
     */
    static #buildDeviceAuthorizationError(status, body, url) {
        let error = null;
        try {
            const json = JSON.parse(body);
            if (json.error) {
                error = new OAuth2AuthorizationError(json.error, json.error_description || body);
            }
        } catch (e) {
            // parse failed
        }

        if (error && error.error) {
            return error;
        }

        return new OAuth2AuthorizationError(
            'http_' + status,
            'Device authorization request to "' + url + '" failed with HTTP status ' + status + ': ' + body
        );
    }
}

var title$2 = "Sign in to play";
var subtitlePick$2 = "Pick <strong>A</strong>, <strong>B</strong> or <strong>C</strong> — the game waits for you.";
var loadingSubtitle$2 = "Hold on, getting your sign-in ready…";
var loadingStatus$2 = "The game is paused. You don't need to click anything yet.";
var optionA$2 = "Option A · Phone or tablet";
var stepA1$2 = "<strong>1.</strong> Point your camera at the square above.";
var stepA2$2 = "<strong>2.</strong> Say yes on that screen, then come back here.";
var optionB$2 = "Option B · One click, no typing";
var stepB1$2 = "<strong>1.</strong> Press the blue button:";
var openButton$2 = "Open sign-in page";
var noTypingNote$2 = "Your code is filled in already — no typing needed.";
var copyLinkHint$2 = "If the link does not open when you click the button, copy this link to another tab:";
var optionC$2 = "Option C · Type the code";
var stepC1$2 = "<strong>1.</strong> Press this button:";
var stepC2$2 = "<strong>2.</strong> Copy this code and type it there:";
var copyButton$2 = "Copy";
var copyLinkButton$2 = "Copy link";
var copiedFeedback$2 = "Copied!";
var codeTitleAttr$2 = "Your sign-in code";
var waiting$2 = "Waiting… finish on the other screen and the game starts by itself.";
var codeValidFor$2 = "This code works for {time}. Hurry!";
var codeExpired$2 = "This code ran out of time — getting a fresh one, keep this window open.";
var qrFailedNote$2 = "The square did not load — no problem, use Option B or C below.";
var errorFriendly$2 = "Hmm, that did not work — keep this window open and try again.";
var errorFallback$2 = "Something went wrong.";
var ariaDialogLabel$2 = "Sign in required";
var languageLabel$2 = "Language";
var en = {
	title: title$2,
	subtitlePick: subtitlePick$2,
	loadingSubtitle: loadingSubtitle$2,
	loadingStatus: loadingStatus$2,
	optionA: optionA$2,
	stepA1: stepA1$2,
	stepA2: stepA2$2,
	optionB: optionB$2,
	stepB1: stepB1$2,
	openButton: openButton$2,
	noTypingNote: noTypingNote$2,
	copyLinkHint: copyLinkHint$2,
	optionC: optionC$2,
	stepC1: stepC1$2,
	stepC2: stepC2$2,
	copyButton: copyButton$2,
	copyLinkButton: copyLinkButton$2,
	copiedFeedback: copiedFeedback$2,
	codeTitleAttr: codeTitleAttr$2,
	waiting: waiting$2,
	codeValidFor: codeValidFor$2,
	codeExpired: codeExpired$2,
	qrFailedNote: qrFailedNote$2,
	errorFriendly: errorFriendly$2,
	errorFallback: errorFallback$2,
	ariaDialogLabel: ariaDialogLabel$2,
	languageLabel: languageLabel$2
};

var title$1 = "Inicia sesión para jugar";
var subtitlePick$1 = "Elige <strong>A</strong>, <strong>B</strong> o <strong>C</strong> — el juego te espera.";
var loadingSubtitle$1 = "Espera, estamos preparando tu inicio de sesión…";
var loadingStatus$1 = "El juego está en pausa. No necesitas pulsar nada todavía.";
var optionA$1 = "Opción A · Móvil o tableta";
var stepA1$1 = "<strong>1.</strong> Apunta tu cámara al código QR de arriba.";
var stepA2$1 = "<strong>2.</strong> Acepta en esa pantalla y vuelve aquí.";
var optionB$1 = "Opción B · Un clic, sin escribir";
var stepB1$1 = "<strong>1.</strong> Pulsa el botón azul:";
var openButton$1 = "Abrir la página de acceso";
var noTypingNote$1 = "Tu código ya está rellenado — no necesitas escribir nada.";
var copyLinkHint$1 = "Si el enlace no se abre cuando haces clic en el botón, copia este enlace en otra pestaña:";
var optionC$1 = "Opción C · Escribe el código";
var stepC1$1 = "<strong>1.</strong> Pulsa este botón:";
var stepC2$1 = "<strong>2.</strong> Copia este código y escríbelo allí:";
var copyButton$1 = "Copiar";
var copyLinkButton$1 = "Copiar enlace";
var copiedFeedback$1 = "¡Copiado!";
var codeTitleAttr$1 = "Tu código de acceso";
var waiting$1 = "Esperando… termina en la otra pantalla y el juego empezará solo.";
var codeValidFor$1 = "Este código vale durante {time}. ¡Date prisa!";
var codeExpired$1 = "Este código se ha agotado — estamos pidiendo uno nuevo, mantén esta ventana abierta.";
var qrFailedNote$1 = "El código QR no se ha cargado — no pasa nada, usa la opción B o C.";
var errorFriendly$1 = "Vaya, no ha funcionado — mantén esta ventana abierta e inténtalo de nuevo.";
var errorFallback$1 = "Algo ha salido mal.";
var ariaDialogLabel$1 = "Inicio de sesión necesario";
var languageLabel$1 = "Idioma";
var es = {
	title: title$1,
	subtitlePick: subtitlePick$1,
	loadingSubtitle: loadingSubtitle$1,
	loadingStatus: loadingStatus$1,
	optionA: optionA$1,
	stepA1: stepA1$1,
	stepA2: stepA2$1,
	optionB: optionB$1,
	stepB1: stepB1$1,
	openButton: openButton$1,
	noTypingNote: noTypingNote$1,
	copyLinkHint: copyLinkHint$1,
	optionC: optionC$1,
	stepC1: stepC1$1,
	stepC2: stepC2$1,
	copyButton: copyButton$1,
	copyLinkButton: copyLinkButton$1,
	copiedFeedback: copiedFeedback$1,
	codeTitleAttr: codeTitleAttr$1,
	waiting: waiting$1,
	codeValidFor: codeValidFor$1,
	codeExpired: codeExpired$1,
	qrFailedNote: qrFailedNote$1,
	errorFriendly: errorFriendly$1,
	errorFallback: errorFallback$1,
	ariaDialogLabel: ariaDialogLabel$1,
	languageLabel: languageLabel$1
};

var title = "Connecte-toi pour jouer";
var subtitlePick = "Choisis <strong>A</strong>, <strong>B</strong> ou <strong>C</strong> — le jeu t'attend.";
var loadingSubtitle = "Patiente, on prépare ta connexion…";
var loadingStatus = "Le jeu est en pause. Tu n'as rien à cliquer pour l'instant.";
var optionA = "Option A · Téléphone ou tablette";
var stepA1 = "<strong>1.</strong> Pointe ton appareil photo vers le code QR.";
var stepA2 = "<strong>2.</strong> Accepte sur cet écran, puis reviens ici.";
var optionB = "Option B · En un clic, prérempli";
var stepB1 = "<strong>1.</strong> Appuie sur le bouton bleu :";
var openButton = "Ouvrir la page de connexion";
var noTypingNote = "Ton code est déjà rempli.";
var copyLinkHint = "Si le lien ne s'ouvre pas quand tu cliques sur le bouton, copie ce lien sur un autre onglet :";
var optionC = "Option C · Tape le code";
var stepC1 = "<strong>1.</strong> Appuie sur ce bouton :";
var stepC2 = "<strong>2.</strong> Copie ce code et tape-le là-bas :";
var copyButton = "Copier";
var copyLinkButton = "Copier le lien";
var copiedFeedback = "Copié !";
var codeTitleAttr = "Ton code de connexion";
var waiting = "On attend… finis sur l'autre écran et le jeu démarrera tout seul.";
var codeValidFor = "Ce code est valable pendant {time}. Dépêche-toi !";
var codeExpired = "Ce code a expiré — on en demande un nouveau, garde cette fenêtre ouverte.";
var qrFailedNote = "Le code QR ne s'est pas affiché — pas de souci, utilise l'option B ou C.";
var errorFriendly = "Oups, ça n'a pas marché — garde cette fenêtre ouverte et réessaie.";
var errorFallback = "Quelque chose s'est mal passé.";
var ariaDialogLabel = "Connexion requise";
var languageLabel = "Langue";
var fr = {
	title: title,
	subtitlePick: subtitlePick,
	loadingSubtitle: loadingSubtitle,
	loadingStatus: loadingStatus,
	optionA: optionA,
	stepA1: stepA1,
	stepA2: stepA2,
	optionB: optionB,
	stepB1: stepB1,
	openButton: openButton,
	noTypingNote: noTypingNote,
	copyLinkHint: copyLinkHint,
	optionC: optionC,
	stepC1: stepC1,
	stepC2: stepC2,
	copyButton: copyButton,
	copyLinkButton: copyLinkButton,
	copiedFeedback: copiedFeedback,
	codeTitleAttr: codeTitleAttr,
	waiting: waiting,
	codeValidFor: codeValidFor,
	codeExpired: codeExpired,
	qrFailedNote: qrFailedNote,
	errorFriendly: errorFriendly,
	errorFallback: errorFallback,
	ariaDialogLabel: ariaDialogLabel,
	languageLabel: languageLabel
};

/**
 * Minimal localization helper for the OAuth2 device blocking UI.
 * Dictionaries live in ./locales/*.json and are bundled with the tracker.
 */


const DEFAULT_LANGUAGE = 'en';
const SUPPORTED_LANGUAGES = ['en', 'es', 'fr'];
const LANGUAGE_STORAGE_KEY = 'xapi-device-lang';

const STRINGS = { en, es, fr };

const NATIVE_NAMES = { en: 'English', es: 'Español', fr: 'Français' };

/**
 * Normalizes a language tag to a supported language code.
 * @param {string} tag - e.g. "es-ES", "FR", "en"
 * @returns {string|null} supported code or null
 */
function normalizeLanguage(tag) {
    if (!tag || typeof tag !== 'string') return null;
    const base = tag.trim().toLowerCase().split(/[-_]/)[0];
    return SUPPORTED_LANGUAGES.includes(base) ? base : null;
}

/**
 * Reads the language from the page URL (?lang=, ?locale= or ?lng=).
 * @returns {string|null} supported code or null
 */
function getUrlLanguage() {
    try {
        if (typeof window === 'undefined' || !window.location || !window.location.search) return null;
        const params = new URLSearchParams(window.location.search);
        const raw = params.get('lang') || params.get('locale') || params.get('lng');
        return normalizeLanguage(raw);
    } catch (e) {
        return null;
    }
}

/**
 * @returns {string|null} language stored from a previous visit
 */
function getStoredLanguage() {
    try {
        if (typeof localStorage === 'undefined') return null;
        return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
    } catch (e) {
        return null;
    }
}

/**
 * @param {string} lang - supported language code
 */
function setStoredLanguage(lang) {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (e) {
        // storage unavailable (private mode) — ignore
    }
}

/**
 * @returns {string|null} browser language if supported
 */
function getBrowserLanguage() {
    try {
        if (typeof navigator === 'undefined' || !navigator.language) return null;
        return normalizeLanguage(navigator.language);
    } catch (e) {
        return null;
    }
}

/**
 * Resolves the UI language. Priority: explicit > URL > stored > browser > English.
 * @param {string} [explicit] - forced language (e.g. tracker settings)
 * @returns {string} supported language code
 */
function resolveLanguage(explicit) {
    return normalizeLanguage(explicit)
        || getUrlLanguage()
        || getStoredLanguage()
        || getBrowserLanguage()
        || DEFAULT_LANGUAGE;
}

/**
 * Translates a key, falling back to English and then the key itself.
 * Supports {placeholders} via vars.
 * @param {string} lang - language code
 * @param {string} key - string key
 * @param {Object} [vars] - placeholder values
 * @returns {string}
 */
function t(lang, key, vars) {
    const dict = STRINGS[lang] || {};
    let value = dict[key] !== undefined ? dict[key] : STRINGS[DEFAULT_LANGUAGE][key];
    if (value === undefined) return key;
    if (vars) {
        for (const name of Object.keys(vars)) {
            value = value.split('{' + name + '}').join(String(vars[name]));
        }
    }
    return value;
}

/**
 * @param {string} code - supported language code
 * @returns {string} native display name
 */
function languageName(code) {
    return NATIVE_NAMES[code] || code;
}

/**
 * Built-in blocking UI for OAuth2 Authorization.
 * Shows a full-screen modal overlay that blocks all game input until the
 * access token is obtained. There is no host-provided callback: the tracker
 * always uses this UI.
 *
 * States: loading (shown immediately on login) -> device info (QR + code) ->
 * error (message shown, overlay stays blocked) -> dismissed (token only).
 *
 * Written for students of all ages: plain words, numbered steps side by
 * side, big copyable code, live countdown.
 */


const STYLE_ID = 'xapi-oauth2-device-fallback-style';
const OVERLAY_ID = 'xapi-device-fallback-overlay';

const CSS = `
#${STYLE_ID} {}
#${OVERLAY_ID} {
  position: fixed;
  inset: 0;
  z-index: 99999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  overflow-y: auto;
  background: rgba(0, 0, 0, 0.7);
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  pointer-events: auto;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
}
#${OVERLAY_ID} .xapi-device-card {
  background: #fff;
  border-radius: 12px;
  padding: 28px 32px;
  max-width: 720px;
  width: 100%;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  user-select: none;
  -webkit-user-select: none;
}
#${OVERLAY_ID} .xapi-device-card h2 {
  margin: 0 0 4px;
  font-size: 22px;
  color: #222;
}
#${OVERLAY_ID} .xapi-device-lang-row {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  margin-bottom: 8px;
}
#${OVERLAY_ID} .xapi-device-lang-label {
  font-size: 12px;
  color: #777;
}
#${OVERLAY_ID} .xapi-device-lang-select {
  padding: 6px 8px;
  min-height: 36px;
  font-size: 13px;
  color: #333;
  background: #fff;
  border: 1px solid #ccc;
  border-radius: 6px;
  cursor: pointer;
}
#${OVERLAY_ID} .xapi-device-subtitle {
  margin: 0 0 16px;
  font-size: 14px;
  color: #555;
}
#${OVERLAY_ID} .xapi-device-card p {
  margin: 4px 0;
  font-size: 14px;
  color: #555;
}
#${OVERLAY_ID} .xapi-device-options {
  display: flex;
  gap: 16px;
  margin: 16px 0 4px;
  text-align: center;
}
#${OVERLAY_ID} .xapi-device-option {
  flex: 1 1 0;
  border: 1px solid #e0e0e0;
  border-radius: 10px;
  padding: 16px 12px;
  background: #fafbfe;
}
#${OVERLAY_ID} .xapi-device-option-title {
  display: inline-block;
  margin-bottom: 8px;
  padding: 2px 12px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.5px;
  text-transform: uppercase;
  color: #004999;
  background: #e3efff;
  border-radius: 999px;
}
#${OVERLAY_ID} .xapi-device-step {
  margin: 8px 0;
  font-size: 14px;
  color: #333;
}
#${OVERLAY_ID} .xapi-device-qr {
  margin: 8px auto;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
  max-width: 100%;
}
#${OVERLAY_ID} .xapi-device-qr-note {
  font-size: 13px;
  color: #555;
}
#${OVERLAY_ID} .xapi-device-code-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin: 12px 0 4px;
  flex-wrap: wrap;
}
#${OVERLAY_ID} .xapi-device-card .xapi-device-code {
  display: inline-block;
  padding: 10px 18px;
  font-family: ui-monospace, "Cascadia Mono", Consolas, monospace;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: 3px;
  color: #1a1a2e;
  background: #f0f0f5;
  border: 2px dashed #999;
  border-radius: 8px;
  user-select: all;
  -webkit-user-select: all;
}
#${OVERLAY_ID} .xapi-device-copy-btn {
  padding: 10px 14px;
  min-height: 44px;
  font-size: 14px;
  font-weight: 600;
  color: #004999;
  background: #e3efff;
  border: 1px solid #bcd6ff;
  border-radius: 6px;
  cursor: pointer;
}
#${OVERLAY_ID} .xapi-device-copy-btn:hover {
  background: #d2e5ff;
}
#${OVERLAY_ID} .xapi-device-card .xapi-device-url {
  display: block;
  margin: 8px 0 12px;
  font-size: 12px;
  color: #0066cc;
  word-break: break-all;
}
#${OVERLAY_ID} .xapi-device-url-row {
  display: flex;
  align-items: flex-start;
  justify-content: center;
  gap: 6px;
  margin: 8px 0 12px;
}
#${OVERLAY_ID} .xapi-device-url-row .xapi-device-url {
  flex: 1 1 auto;
  margin: 0;
  text-align: left;
}
#${OVERLAY_ID} .xapi-device-copy-btn-small {
  flex: 0 0 auto;
  padding: 6px 10px;
  min-height: 32px;
  font-size: 12px;
}
#${OVERLAY_ID} .xapi-device-card button.xapi-device-btn {
  display: inline-block;
  padding: 12px 24px;
  min-height: 44px;
  font-size: 16px;
  font-weight: 600;
  color: #fff;
  background: #0066cc;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  transition: background 0.15s;
}
#${OVERLAY_ID} .xapi-device-card button.xapi-device-btn:hover {
  background: #0052a3;
}
#${OVERLAY_ID} .xapi-device-card button.xapi-device-btn:active {
  background: #003d7a;
}
#${OVERLAY_ID} .xapi-device-card button.xapi-device-btn-secondary {
  color: #004999;
  background: #fff;
  border: 2px solid #0066cc;
}
#${OVERLAY_ID} .xapi-device-card button.xapi-device-btn-secondary:hover {
  background: #e3efff;
}
#${OVERLAY_ID} .xapi-device-card button.xapi-device-btn-secondary:active {
  background: #d2e5ff;
}
#${OVERLAY_ID} .xapi-device-no-code-note {
  margin: 8px 0 0;
  font-size: 13px;
  font-weight: 600;
  color: #1c7a2e;
}
#${OVERLAY_ID} .xapi-device-status-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin-top: 16px;
}
#${OVERLAY_ID} .xapi-device-spinner {
  flex: 0 0 auto;
  width: 22px;
  height: 22px;
  border: 3px solid #dfe7f3;
  border-top-color: #0066cc;
  border-radius: 50%;
  animation: xapi-device-spin 0.8s linear infinite;
}
#${OVERLAY_ID} .xapi-device-spinner-large {
  margin: 20px auto;
  width: 36px;
  height: 36px;
  border-width: 4px;
}
@keyframes xapi-device-spin {
  to { transform: rotate(360deg); }
}
#${OVERLAY_ID} .xapi-device-card .xapi-device-status {
  font-size: 13px;
  color: #555;
}
#${OVERLAY_ID} .xapi-device-card .xapi-device-expiry {
  margin-top: 8px;
  font-size: 13px;
  font-weight: 600;
  color: #004999;
}
#${OVERLAY_ID} .xapi-device-card .xapi-device-expiry.expired {
  color: #7a1f1f;
}
#${OVERLAY_ID} .xapi-device-card .xapi-device-error {
  margin-top: 12px;
  padding: 10px 12px;
  font-size: 13px;
  color: #7a1f1f;
  background: #fdecec;
  border: 1px solid #f5a3a3;
  border-radius: 6px;
  word-break: break-word;
}
#${OVERLAY_ID} .xapi-device-card .xapi-device-error small {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #964242;
}
@media (max-width: 640px) {
  #${OVERLAY_ID} .xapi-device-card {
    padding: 20px 16px;
  }
  #${OVERLAY_ID} .xapi-device-options {
    flex-direction: column;
  }
}
`;

function injectStyles() {
    if (typeof document === 'undefined') return;
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = CSS;
    document.head.appendChild(style);
}

function removeStyles() {
    if (typeof document === 'undefined') return;
    const style = document.getElementById(STYLE_ID);
    if (style) style.remove();
}

let activeOverlay = null;
let activeHandle = null;
let previousBodyOverflow = null;
let blockersInstalled = false;
let countdownTimer = null;
let countdownDeadline = 0;
let currentLang = 'en';
let currentView = 'loading';
let lastInfo = null;
let lastError = null;

function swallowOutsideEvent(e) {
    if (!activeOverlay || !activeOverlay.parentNode) return;
    if (activeOverlay.contains(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
}

function installBlockers() {
    if (blockersInstalled || typeof document === 'undefined' || typeof window === 'undefined') return;
    for (const type of ['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown', 'keyup', 'keypress']) {
        document.addEventListener(type, swallowOutsideEvent, true);
    }
    blockersInstalled = true;
}

function uninstallBlockers() {
    if (!blockersInstalled || typeof document === 'undefined') return;
    for (const type of ['pointerdown', 'mousedown', 'touchstart', 'click', 'keydown', 'keyup', 'keypress']) {
        document.removeEventListener(type, swallowOutsideEvent, true);
    }
    blockersInstalled = false;
}

function lockScroll() {
    if (typeof document === 'undefined') return;
    if (previousBodyOverflow === null) {
        previousBodyOverflow = document.body.style.overflow || '';
        document.body.style.overflow = 'hidden';
    }
}

function unlockScroll() {
    if (typeof document === 'undefined') return;
    if (previousBodyOverflow !== null) {
        document.body.style.overflow = previousBodyOverflow;
        previousBodyOverflow = null;
    }
}

function stopCountdown() {
    if (countdownTimer !== null) {
        clearInterval(countdownTimer);
        countdownTimer = null;
    }
}

function dismiss() {
    stopCountdown();
    countdownDeadline = 0;
    currentView = 'loading';
    lastInfo = null;
    lastError = null;
    if (activeOverlay && activeOverlay.parentNode) {
        activeOverlay.parentNode.removeChild(activeOverlay);
    }
    activeOverlay = null;
    activeHandle = null;
    uninstallBlockers();
    unlockScroll();
    if (typeof document !== 'undefined' && !document.getElementById(OVERLAY_ID)) {
        removeStyles();
    }
}

function ensureOverlay() {
    injectStyles();
    lockScroll();
    installBlockers();
    if (!activeOverlay || !activeOverlay.parentNode) {
        activeOverlay = document.createElement('div');
        activeOverlay.id = OVERLAY_ID;
        activeOverlay.setAttribute('role', 'dialog');
        activeOverlay.setAttribute('aria-modal', 'true');
        activeOverlay.setAttribute('aria-label', t(currentLang, 'ariaDialogLabel'));
        activeOverlay.addEventListener('pointerdown', function (e) {
            if (e.target === activeOverlay) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
        document.body.appendChild(activeOverlay);
    }
    if (!activeHandle) {
        activeHandle = { update: updateOverlay, showError: showError, dismiss: dismiss, setLanguage: setLanguage };
    }
    return activeHandle;
}

function languageSelectorHtml() {
    let options = '';
    for (const code of SUPPORTED_LANGUAGES) {
        options += '<option value="' + code + '"' + (code === currentLang ? ' selected' : '') + '>' + languageName(code) + '</option>';
    }
    return '<div class="xapi-device-lang-row">'
        + '<label class="xapi-device-lang-label" for="xapi-device-lang-select">' + escapeHtml(t(currentLang, 'languageLabel')) + '</label>'
        + '<select id="xapi-device-lang-select" class="xapi-device-lang-select">' + options + '</select>'
        + '</div>';
}

function wireLanguageSelector() {
    const select = activeOverlay.querySelector('.xapi-device-lang-select');
    if (select) {
        select.addEventListener('change', function () {
            setLanguage(select.value);
        });
    }
}

/**
 * Switches the UI language and re-renders the current state.
 * Persists the choice for future logins.
 * @param {string} lang - language code (en, es, fr)
 */
function setLanguage(lang) {
    if (!SUPPORTED_LANGUAGES.includes(lang) || lang === currentLang) return activeHandle;
    currentLang = lang;
    setStoredLanguage(lang);
    try {
        if (typeof window !== 'undefined' && window.history && window.history.replaceState) {
            const url = new URL(window.location.href);
            url.searchParams.set('lang', lang);
            window.history.replaceState(null, '', url.toString());
        }
    } catch (e) {
        // URL not writable — ignore
    }
    if (!activeOverlay || !activeOverlay.parentNode) return activeHandle;
    if (currentView === 'device' && lastInfo) {
        renderDevice(lastInfo, false);
        if (lastError) appendError(lastError);
    } else {
        renderLoading();
        if (lastError) appendError(lastError);
    }
    return activeHandle;
}

function renderLoading() {
    stopCountdown();
    countdownDeadline = 0;
    currentView = 'loading';
    ensureOverlay();
    activeOverlay.setAttribute('aria-label', t(currentLang, 'ariaDialogLabel'));
    activeOverlay.innerHTML = `
      <div class="xapi-device-card">
        ${languageSelectorHtml()}
        <h2>${escapeHtml(t(currentLang, 'title'))}</h2>
        <p class="xapi-device-subtitle">${escapeHtml(t(currentLang, 'loadingSubtitle'))}</p>
        <div class="xapi-device-spinner xapi-device-spinner-large" aria-hidden="true"></div>
        <p class="xapi-device-status">${escapeHtml(t(currentLang, 'loadingStatus'))}</p>
      </div>
    `;
    wireLanguageSelector();
}

function formatCountdown(totalSeconds) {
    const s = Math.max(0, totalSeconds);
    const mins = Math.floor(s / 60);
    const secs = s % 60;
    return (mins < 10 ? '0' + mins : '' + mins) + ':' + (secs < 10 ? '0' + secs : '' + secs);
}

function startCountdown(expiresIn) {
    stopCountdown();
    if (expiresIn && expiresIn > 0) {
        countdownDeadline = Date.now() + expiresIn * 1000;
    }
    const expiryEl = activeOverlay.querySelector('.xapi-device-expiry');
    if (!expiryEl || !countdownDeadline) return;
    const tick = function () {
        if (!activeOverlay || !activeOverlay.parentNode || !document.body.contains(expiryEl)) {
            stopCountdown();
            return;
        }
        const remaining = Math.max(0, Math.ceil((countdownDeadline - Date.now()) / 1000));
        if (remaining <= 0) {
            expiryEl.textContent = t(currentLang, 'codeExpired');
            expiryEl.classList.add('expired');
            stopCountdown();
            return;
        }
        expiryEl.textContent = t(currentLang, 'codeValidFor', { time: formatCountdown(remaining) });
    };
    tick();
    countdownTimer = setInterval(tick, 1000);
}

function copyText(text, button) {
    const done = function () {
        if (!button || !button.parentNode) return;
        const original = button.getAttribute('data-label') || t(currentLang, 'copyButton');
        button.textContent = t(currentLang, 'copiedFeedback');
        setTimeout(function () {
            if (button.parentNode) button.textContent = original;
        }, 2000);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done, function () { fallbackCopy(text); done(); });
    } else {
        fallbackCopy(text);
        done();
    }
}

function fallbackCopy(text) {
    try {
        const area = document.createElement('textarea');
        area.value = text;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        document.body.removeChild(area);
    } catch (e) {
        console.warn('[OAuth2Device] Copy failed: ' + e.message);
    }
}

function updateOverlay(info) {
    if (typeof document === 'undefined') return;
    lastInfo = info;
    lastError = null;
    renderDevice(info, true);
}

function renderDevice(info, focusButton) {
    stopCountdown();
    currentView = 'device';
    ensureOverlay();
    activeOverlay.setAttribute('aria-label', t(currentLang, 'ariaDialogLabel'));
    const completeUrl = info.verification_uri_complete || info.verification_uri;
    const manualUrl = info.verification_uri || info.verification_uri_complete;
    const code = info.user_code || '';

    activeOverlay.innerHTML = `
      <div class="xapi-device-card">
        ${languageSelectorHtml()}
        <h2>${escapeHtml(t(currentLang, 'title'))}</h2>
        <p class="xapi-device-subtitle">${t(currentLang, 'subtitlePick')}</p>
        <div class="xapi-device-options">
          <div class="xapi-device-option">
            <span class="xapi-device-option-title">${escapeHtml(t(currentLang, 'optionA'))}</span>
            <canvas class="xapi-device-qr"></canvas>
            <p class="xapi-device-step">${t(currentLang, 'stepA1')}</p>
            <p class="xapi-device-step">${t(currentLang, 'stepA2')}</p>
          </div>
          <div class="xapi-device-option">
            <span class="xapi-device-option-title">${escapeHtml(t(currentLang, 'optionB'))}</span>
            <p class="xapi-device-step">${t(currentLang, 'stepB1')}</p>
            <button class="xapi-device-btn" type="button" data-open-url="${escapeHtml(completeUrl)}">${escapeHtml(t(currentLang, 'openButton'))}</button>
            <p class="xapi-device-no-code-note">${escapeHtml(t(currentLang, 'noTypingNote'))}</p>
            <p class="xapi-device-step">${escapeHtml(t(currentLang, 'copyLinkHint'))}</p>
            <div class="xapi-device-url-row">
              <a class="xapi-device-url" href="${escapeHtml(completeUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(completeUrl)}</a>
              <button class="xapi-device-copy-btn xapi-device-copy-btn-small" type="button" data-label="${escapeHtml(t(currentLang, 'copyLinkButton'))}" data-copy-text="${escapeHtml(completeUrl)}">${escapeHtml(t(currentLang, 'copyLinkButton'))}</button>
            </div>
          </div>
          <div class="xapi-device-option">
            <span class="xapi-device-option-title">${escapeHtml(t(currentLang, 'optionC'))}</span>
            <p class="xapi-device-step">${t(currentLang, 'stepC1')}</p>
            <button class="xapi-device-btn xapi-device-btn-secondary" type="button" data-open-url="${escapeHtml(manualUrl)}">${escapeHtml(t(currentLang, 'openButton'))}</button>
            <p class="xapi-device-step">${t(currentLang, 'stepC2')}</p>
            <div class="xapi-device-code-row">
              <span class="xapi-device-code" title="${escapeHtml(t(currentLang, 'codeTitleAttr'))}">${escapeHtml(code)}</span>
              <button class="xapi-device-copy-btn" type="button" data-label="${escapeHtml(t(currentLang, 'copyButton'))}" data-copy-text="${escapeHtml(code)}">${escapeHtml(t(currentLang, 'copyButton'))}</button>
            </div>
            <p class="xapi-device-step">${escapeHtml(t(currentLang, 'copyLinkHint'))}</p>
            <div class="xapi-device-url-row">
              <a class="xapi-device-url" href="${escapeHtml(manualUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(manualUrl)}</a>
              <button class="xapi-device-copy-btn xapi-device-copy-btn-small" type="button" data-label="${escapeHtml(t(currentLang, 'copyLinkButton'))}" data-copy-text="${escapeHtml(manualUrl)}">${escapeHtml(t(currentLang, 'copyLinkButton'))}</button>
            </div>
          </div>
        </div>
        <div class="xapi-device-status-row">
          <div class="xapi-device-spinner" aria-hidden="true"></div>
          <p class="xapi-device-status" aria-live="polite">${escapeHtml(t(currentLang, 'waiting'))}</p>
        </div>
        <div class="xapi-device-expiry" aria-live="polite"></div>
      </div>
    `;

    wireLanguageSelector();

    const qrCanvas = activeOverlay.querySelector('.xapi-device-qr');
    QRCode.toCanvas(qrCanvas, completeUrl, { width: 180, margin: 1 })
        .catch(function (error) {
            console.error('[OAuth2Device] Failed to render QR code: ' + error.message);
            const option = qrCanvas ? qrCanvas.parentNode : null;
            if (option) {
                const note = document.createElement('p');
                note.className = 'xapi-device-qr-note';
                note.textContent = t(currentLang, 'qrFailedNote');
                option.replaceChild(note, qrCanvas);
            }
        });

    const openButtons = activeOverlay.querySelectorAll('[data-open-url]');
    for (const btn of openButtons) {
        btn.addEventListener('click', function () {
            window.open(btn.getAttribute('data-open-url'), '_blank', 'noopener,noreferrer');
        });
    }

    const copyBtns = activeOverlay.querySelectorAll('.xapi-device-copy-btn');
    for (const btn of copyBtns) {
        btn.addEventListener('click', function (e) {
            e.stopPropagation();
            copyText(btn.getAttribute('data-copy-text') || code, btn);
        });
    }

    startCountdown(info.expires_in);

    if (focusButton) {
        const mainBtn = activeOverlay.querySelector('.xapi-device-btn');
        if (mainBtn) mainBtn.focus();
    }
}

function showError(message) {
    if (typeof document === 'undefined') return;
    lastError = message || t(currentLang, 'errorFallback');
    ensureOverlay();
    const card = activeOverlay.querySelector('.xapi-device-card');
    if (!card) {
        renderLoading();
    }
    appendError(lastError);
}

function appendError(message) {
    const card = activeOverlay.querySelector('.xapi-device-card');
    if (!card) return;
    let errorBox = card.querySelector('.xapi-device-error');
    if (!errorBox) {
        errorBox = document.createElement('div');
        errorBox.className = 'xapi-device-error';
        errorBox.setAttribute('role', 'alert');
        card.appendChild(errorBox);
    }
    const safe = escapeHtml(message || t(currentLang, 'errorFallback'));
    errorBox.innerHTML = escapeHtml(t(currentLang, 'errorFriendly')) + '<small>' + safe + '</small>';
}

/**
 * Shows the blocking auth UI immediately (loading state).
 * The game stays non-clickable until dismiss() is called after a token.
 * Language is resolved as: explicit option > ?lang URL parameter >
 * stored choice > browser language > English. The screen also has a
 * language selector (English / Español / Français).
 * @param {object} [options]
 * @param {string} [options.language] - forced language code (en, es, fr)
 * @returns {{ update: (info: object) => void, showError: (message: string) => void, dismiss: () => void, setLanguage: (lang: string) => void }}
 */
function showBlockingAuthUI(options) {
    if (typeof document === 'undefined') {
        console.warn('[OAuth2Device] Cannot show blocking UI: not in a browser environment.');
        return { update() {}, showError() {}, dismiss() {}, setLanguage() {} };
    }
    currentLang = resolveLanguage(options && options.language);
    renderLoading();
    return activeHandle;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

/**
 * @typedef {import("jwt-decode").JwtPayload & { preferred_username?: string }} OAuth2DecodedToken
 */

/**
 * A specialized tracker asset that implements OAuth2 authentication.
 * Extends the base xAPITrackerAsset with OAuth2 capabilities.
 */
class xAPITrackerAssetOAuth2 extends xAPITrackerAsset {

    /**
     * @typedef {Object} OAuth2Settings
     * @property {string} token_endpoint
     * @property {string} grant_type
     * @property {string} client_id
     * @property {string} [client_secret]
     * @property {string} [scope]
     * @property {string} [state]
     * @property {string} [code_challenge_method]
     * @property {string} [username]
     * @property {string} [password]
     * @property {string} [login_hint]
     * @property {string} [device_authorization_endpoint]
     * @property {number} [poll_interval]
     * @property {number} [max_poll_attempts]
     * @property {string} [language] - UI language for the device sign-in screen (en, es, fr). Falls back to ?lang URL parameter, stored choice, browser language, English.
     */
    oauth2Settings = {
        token_endpoint:                 "https://.../token",
        client_id:                      "my_client_id",
        client_secret:                  "",
        grant_type:                     "password",
        scope:                          "openid profile",
        state:                          "",
        code_challenge_method:          "",
        username:                       "alice@example.com",
        password:                       "supersecret",
        login_hint:                     "alice@example.com",
        device_authorization_endpoint:  "",
        poll_interval:                  null,
        max_poll_attempts:              null,
        language:                       "",
    };

    /**
     * Instance of OAuth2Protocol handling authentication
     * @type {OAuth2Protocol|null}
     */
    oauth2 = null;

    /**
     * Callback for token updates
     * @type {Function|null}
     */
    onAuthorizationInfoUpdate = null;

    constructor() {
        super();
        this.oauth2 = null;
        if (typeof window !== 'undefined') {
            window.addEventListener('beforeunload', async () => {
                if (this.auth_token) {
                    await this.logout();
                }
            });
        }
    }

    async login() {
        if (!this.online) {
            await this.#initAuth();
        }
    }

    async #initAuth() {
        this.oauth2 = new OAuth2Protocol(this.oauth2Settings);

        const blockingUI = showBlockingAuthUI({ language: this.oauth2Settings.language });

        this.oauth2.onDeviceAuthorizationInfo = (info) => {
            if (info.popupBlocked) {
                console.warn('[OAuth2Device] Browser blocked the auto-open popup. Showing blocking UI with code ' + info.user_code + '.');
            }
            blockingUI.update(info);
        };

        if (this.onAuthorizationInfoUpdate) {
            this.oauth2.onAuthorizationInfoUpdate = this.onAuthorizationInfoUpdate;
        }

        try {
            await this.oauth2.getToken();
        } catch (error) {
            blockingUI.showError(error && error.message ? error.message : 'Sign in failed.');
            throw error;
        }

        const oAuth2Token = this.oauth2.token;

        if (oAuth2Token !== null && oAuth2Token.access_token) {
            blockingUI.dismiss();
            this.auth_token = "Bearer " + oAuth2Token.access_token;
            console.debug(this.auth_token);
            return super.login();
        }

        const noTokenError = new Error('Sign in failed: no access token received.');
        blockingUI.showError(noTokenError.message);
        throw noTokenError;
    }

    getUsername() {
        const oAuth2Token = this.oauth2.token;

        if (oAuth2Token !== null && oAuth2Token.access_token) {
            /** @type {OAuth2DecodedToken} */
            const decoded = jwtDecode.jwtDecode(oAuth2Token.access_token);
            const username = decoded.preferred_username;
            return username;
        }
    }

    async refreshAuth() {
        const oAuth2Token = await this.oauth2.refreshToken();
        if (oAuth2Token) {
            this.auth_token = "Bearer " + oAuth2Token;
            console.debug(this.auth_token);
            super.login();
        }
    }

    async logout() {
        await this.oauth2.logout();
        super.logout();
    }
}

/**
 * Accessible Tracker
 */
class AccessibleTracker {
    /**
     * Constructor of accessible tracker
     * @param {xAPITrackerAsset} tracker the tracker
     * @param {string} id the id of the accessible object
     * @param {string} type the type of the accessible object
     */
    constructor(tracker, id, type=ALL.ACTIVITYTYPES.AREA) {
        this.AccessibleId=id;
        this.Type=type;
        this.Tracker = tracker;
    }
    /**
     * the id of the accessible object
     * @type {string}
     */
    AccessibleId;
    /**
     * the type of the accessible object
     * @type {string}
     */
    Type;
    /**
     * the tracker of the accessible object
     * @type {xAPITrackerAsset}
     */
    Tracker;

    /**
     * Send Accessed statement
     * @returns {StatementBuilder}
     */
    accessed() {
        return this.Tracker.trace(SERIOUSGAMESPROFILE.VERBS.ACCESSED,this.Type,this.AccessibleId);
    }

    /**
     * Send Skipped statement
     * @returns {StatementBuilder}
     */
    skipped() {
        return this.Tracker.trace(ALL.VERBS.SKIPPED,this.Type,this.AccessibleId);
    }
}

/**
 * the list of types possible for the alternative object
 */
const ACCESSIBLETYPE = Object.freeze({
    SCREEN: ALL.ACTIVITYTYPES.SCREEN,
    AREA: ALL.ACTIVITYTYPES.AREA,
    ZONE: ALL.ACTIVITYTYPES.ZONE,
    CUTSCENE: ALL.ACTIVITYTYPES.CUTSCENE,
    INVENTORY: "https://w3id.org/xapi/seriousgames/custom-types/inventory", // WARN: Not in profile server
    ACCESSIBLE: "https://w3id.org/xapi/seriousgames/activity-types/accessible"  // WARN: Not in profile server
});

/**
 * Completable Tracker
 */
class CompletableTracker {
    /**
     * Constructor of completable Tracker
     * @param {xAPITrackerAsset} tracker the Tracker
     * @param {string} id the id of the completable object
     * @param {string} type the Type of the completable object
     */
    constructor(tracker, id, type) {
        this.CompletableId=id;
        this.Type=type;
        this.Tracker = tracker;
        this.IsInitialized=false;
    }

    /**
     * the id of the completable object
     * @Type {string}
     */
    CompletableId;

    /**
     * the Type of the completable object
     * @Type {string}
     */
    Type;

    /**
     * the Tracker of the completable object
     * @Type {xAPITrackerAsset}
     */
    Tracker;

    /**
     * is initialized
     * @Type {boolean}
     */
    IsInitialized;

    /**
     * Initialized Time
     * @Type {Date}
     */
    InitializedTime;


    /**
     * Send Initialized statement
     * @returns {StatementBuilder}
     */
    initialized() {
        var addInitializedTime = true;
        if(this.IsInitialized) {
            if (this.Tracker.settings.debug) {
                throw new Error(`The initialized statement for the specified id ${this.CompletableId} has already been sent!`);
            } else {
                console.warn(`The initialized statement for the specified id ${this.CompletableId} has already been sent!`);
                addInitializedTime = false;
            }
        }
        if (addInitializedTime) {
            this.InitializedTime = new Date();
            this.IsInitialized=true;
        }
        return this.Tracker.trace(ALL.VERBS.INITIALIZED,this.Type,this.CompletableId);
    }

    /**
     * Send Progressed statement
     * @param {number} progress the progress of the completable object
     * @returns {StatementBuilder}
     */
    progressed(progress) {
        return this.Tracker.trace(ALL.VERBS.PROGRESSED,this.Type,this.CompletableId)
            .withResultExtension(ALL.RESULTEXTENSION.SERIOUSGAMESPROFILE_PROGRESS, progress);
    }

    /**
     * Send Completed statement
     * @param {boolean} success the success status of the completable object
     * @param {boolean} completion the completion status of the completable object
     * @param {number} score the score of the completable object
     * @returns {StatementBuilder}
     */
    completed(success, completion, score) {
        if (typeof success === 'undefined') {success = true;}
        if (typeof completion === 'undefined') {completion = false;}
        if (typeof score === 'undefined') {score = 1;}

        if(!this.IsInitialized) {
            if (this.Tracker.settings.debug) {
                throw new Error(`You need to send a initialized statement before sending an Completed statement for the specified id ${this.CompletableId}!`);
            } else {
                console.warn(`You need to send a initialized statement before sending an Completed statement for the specified id ${this.CompletableId}!`);
                return;
            }
        }
        let actualDate=new Date();
        this.IsInitialized=false;

        return this.Tracker.trace(ALL.VERBS.COMPLETED,this.Type,this.CompletableId)
            .withSuccess(success)
            .withCompletion(completion)
            .withScore({raw:score})
            .withDuration(this.InitializedTime, actualDate);
    }
}

/**
 * the list of types possible for the completable object
 */
const COMPLETABLETYPE = Object.freeze({
    GAME: ALL.ACTIVITYTYPES.SERIOUS_GAME,
    LEVEL: ALL.ACTIVITYTYPES.LEVEL,
    QUEST: ALL.ACTIVITYTYPES.QUEST,
    SESSION: "https://w3id.org/xapi/seriousgames/activity-types/session",   // WARN: Not in profile server
    STAGE: "https://w3id.org/xapi/seriousgames/activity-types/stage",       // WARN: Not in profile server
    COMBAT: "https://w3id.org/xapi/seriousgames/activity-types/combat",     // WARN: Not in profile server
    STORYNODE: "https://w3id.org/xapi/seriousgames/activity-types/story-node", // WARN: Not in profile server
    RACE: "https://w3id.org/xapi/seriousgames/activity-types/race",         // WARN: Not in profile server
    COMPLETABLE: "https://w3id.org/xapi/seriousgames/activity-types/completable",   // WARN: Not in profile server
    DIALOGNODE: "https://w3id.org/xapi/seriousgames/activity-types/dialog-node",    // WARN: Not in profile server
    DIALOGFRAGMENT: "https://w3id.org/xapi/seriousgames/activity-types/dialog-fragment" // WARN: Not in profile server
});

const SERIOUSGAMEPROFILE = Object.freeze({
    CATEGORYID:  'https://w3id.org/xapi/seriousgame',
    VERBS: {
        //Completable Verbs
        INITIALIZED: 'http://adlnet.gov/expapi/verbs/initialized',
        PROGRESSED: 'http://adlnet.gov/expapi/verbs/progressed',
        COMPLETED: 'http://adlnet.gov/expapi/verbs/completed',
        //Accessible Verbs
        ACCESSED: 'https://w3id.org/xapi/seriousgames/verbs/accessed',
        SKIPPED: 'http://id.tincanapi.com/verb/skipped',
        //Alternative Verbs
        SELECTED: 'https://w3id.org/xapi/adb/verbs/selected',
        UNLOCKED: 'https://w3id.org/xapi/seriousgames/verbs/unlocked',
        //GameObject Verbs
        INTERACTED: 'http://adlnet.gov/expapi/verbs/interacted',
        USED: 'https://w3id.org/xapi/seriousgames/verbs/used'
    },
    ACTIVITYTYPES: {
        // Completable
        GAME: 'https://w3id.org/xapi/seriousgames/activity-types/serious-game' ,
        SESSION: 'https://w3id.org/xapi/seriousgames/activity-types/session',
        LEVEL: 'https://w3id.org/xapi/seriousgames/activity-types/level',
        QUEST: 'https://w3id.org/xapi/seriousgames/activity-types/quest',
        STAGE: 'https://w3id.org/xapi/seriousgames/activity-types/stage',
        COMBAT: 'https://w3id.org/xapi/seriousgames/activity-types/combat',
        STORYNODE: 'https://w3id.org/xapi/seriousgames/activity-types/story-node',
        RACE: 'https://w3id.org/xapi/seriousgames/activity-types/race',
        COMPLETABLE: 'https://w3id.org/xapi/seriousgames/activity-types/completable',
        // Accessible
        SCREEN: 'https://w3id.org/xapi/seriousgames/activity-types/screen' ,
        AREA: 'https://w3id.org/xapi/seriousgames/activity-types/area',
        ZONE: 'https://w3id.org/xapi/seriousgames/activity-types/zone',
        CUTSCENE: 'https://w3id.org/xapi/seriousgames/activity-types/cutscene',
        ACCESSIBLE: 'https://w3id.org/xapi/seriousgames/activity-types/accessible',
        // Alternative
        QUESTION: 'http://adlnet.gov/expapi/activities/question' ,
        MENU: 'https://w3id.org/xapi/seriousgames/activity-types/menu',
        DIALOG: 'https://w3id.org/xapi/seriousgames/activity-types/dialog-tree',
        PATH: 'https://w3id.org/xapi/seriousgames/activity-types/path',
        ARENA: 'https://w3id.org/xapi/seriousgames/activity-types/arena',
        ALTERNATIVE: 'https://w3id.org/xapi/seriousgames/activity-types/alternative',
        // GameObject
        ENEMY: 'https://w3id.org/xapi/seriousgames/activity-types/enemy' ,
        NPC: 'https://w3id.org/xapi/seriousgames/activity-types/non-player-character',
        ITEM: 'https://w3id.org/xapi/seriousgames/activity-types/item',
        GAMEOBJECT: 'https://w3id.org/xapi/seriousgames/activity-types/game-object'
    }
});

/**
 * Accessible Tracker
 */
class AlternativeTracker {
    /**
     * Constructor of accessible tracker
     * @param {xAPITrackerAsset} tracker the tracker
     * @param {string} id the id of the accessible object
     * @param {string} type the type of the accessible object
     */
    constructor(tracker, id, type=SERIOUSGAMEPROFILE.ACTIVITYTYPES.ALTERNATIVE) {
        this.AlternativeId=id;
        this.Type=type;
        this.Tracker = tracker;
    }
    /**
     * the id of the alternative object
     * @type {string}
     */
    AlternativeId;
    /**
     * the type of the alternative object
     * @type {string}
     */
    Type;
    /**
     * the tracker of the alternative object
     * @type {xAPITrackerAsset}
     */
    Tracker;

    /**
     * Send selected statement
     * @param {string} optionId the optionId of the selected statement
     * @returns {StatementBuilder}
     */
    selected(optionId) {        
        return this.Tracker.trace(ALL.VERBS.SELECTED,this.Type,this.AlternativeId)
            .withResponse(optionId);
    }

    /**
     * Send unlocked statement
     * @param {string} optionId the optionId of the Unlocked statement
     * @returns {StatementBuilder}
     */
    unlocked(optionId) {
        return this.Tracker.trace(SERIOUSGAMESPROFILE.VERBS.UNLOCKED,this.Type,this.AlternativeId)
                .withResponse(optionId);
    }
}

/**
 * the list of types possible for the alternative object
 */
const ALTERNATIVETYPE = Object.freeze({
    QUESTION: ALL.ACTIVITYTYPES.QUESTION,
    MENU: ALL.ACTIVITYTYPES.MENU,
    DIALOG: ALL.ACTIVITYTYPES.DIALOG_TREE,
    PATH: "https://w3id.org/xapi/seriousgames/activity-types/path",     // WARN: Not in profile server
    ARENA: "https://w3id.org/xapi/seriousgames/activity-types/arena",   // WARN: Not in profile server
    ALTERNATIVE: "https://w3id.org/xapi/seriousgames/activity-types/alternative" // WARN: Not in profile server
});

/**
 * Game Object Tracker
 */
class GameObjectTracker {
    /**
     * Constructor of Game Object tracker
     * @param {xAPITrackerAsset} tracker the tracker
     * @param {string} id the id of the Game Object object
     * @param {string} type the Type of the Game Object object
     */
    constructor(tracker,id, type=SERIOUSGAMEPROFILE.ACTIVITYTYPES.GAMEOBJECT) {
        this.GameobjectId=id;
        this.Type=type;
        this.Tracker= tracker;
    }
    /**
     * the id of the Game Object object
     * @Type {string}
     */
    GameobjectId;
    /**
     * the Type of the Game Object object
     * @Type {string}
     */
    Type;
    /**
     * the Trackerof the Game Object object
     * @Type {xAPITrackerAsset}
     */
    tracker;

    /**
     * Send Interacted statement
     * @returns {StatementBuilder}
     */
    interacted() {
        return this.Tracker.trace(ALL.VERBS.INTERACTED,this.Type,this.GameobjectId);
    }
    
    /**
     * Send Used statement
     * @returns {StatementBuilder}
     */
    used() {
        return this.Tracker.trace(ALL.VERBS.USED,this.Type,this.GameobjectId);
    }
}

/**
 * the list of types possible for the gameobject object
 */
const GAMEOBJECTTYPE = Object.freeze({
    ENEMY: ALL.ACTIVITYTYPES.ENEMY,
    NPC: ALL.ACTIVITYTYPES.NON_PLAYER_CHARACTER,
    ITEM: ALL.ACTIVITYTYPES.ITEM,
    GAMEOBJECT: "https://w3id.org/xapi/seriousgames/activity-types/game-object", // WARN: Not in profile server
});

/**
 * Scorm Tracker
 */
class ScormTracker {
    /**
     * Constructor of Scorm Tracker
     * @param {xAPITrackerAsset} tracker the Tracker
     * @param {string} id the id of the Scorm object
     * @param {string} type the type of the Scorm object
     * @param {ContextStatement} context the context statement of the Scorm object
     */
    constructor(tracker, id, type=SCORMPROFILE.ACTIVITYTYPES.LESSON, context = tracker.context) {
        this.ScormId=id;
        this.Type=type;
        this.Tracker = tracker;
        this.Context = context;
        this.IsInitialized=false;
    }
    /**
     * the id of the Scorm object
     * @type {string}
     */
    ScormId;
    /**
     * the type of the Scorm object
     * @type {string}
     */
    Type;
    /**
     * the Tracker of the Scorm object
     * @type {xAPITrackerAsset}
     */
    Tracker;

    /**
     * is initialized
     * @type {boolean}
     */
    IsInitialized;

    /**
     * Initialized Time
     * @type {Date}
     */
    InitializedTime;

    /**
     * Send Initialized statement
     * @returns {StatementBuilder}
     */
    initialized() {
        var addInitializedTime = true;
        if(this.IsInitialized) {
            if (this.Tracker.settings.debug) {
                throw new Error("The initialized statement for the specified id has already been sent!");
            } else {
                console.warn("The initialized statement for the specified id has already been sent!");
                addInitializedTime = false;
                return;
            }
        }
        if (addInitializedTime) {
            this.InitializedTime = new Date();
            this.IsInitialized=true;
        }
        if(this.Type != SCORMPROFILE.ACTIVITYTYPES.LESSON) {
            throw new Error("You cannot initialize an object for a type different that SCO.");
        }
        return this.Tracker.trace(SCORMPROFILE.VERBS.INITIALIZED, this.Type, this.ScormId, this.Context);
    }

    /**
     * Send Suspended statement
     * @returns {StatementBuilder}
     */
    suspended() {
        if(!this.IsInitialized) {
            if (this.Tracker.settings.debug) {
                throw new Error("You need to send a initialized statement before sending an suspended statement!");
            } else {
                console.warn("You need to send a initialized statement before sending an suspended statement!");
                return;
            }
        }
        let actualDate=new Date();
        this.IsInitialized=false;
        if(this.Type != SCORMPROFILE.ACTIVITYTYPES.LESSON) {
            throw new Error("You cannot suspend an object for a type different that SCO.");
        }
        return this.Tracker.trace(SCORMPROFILE.VERBS.SUSPENDED, this.Type, this.ScormId, this.Context)
                .withDuration(this.InitializedTime, actualDate);
    }

    /**
     * Send Resumed statement
     * @returns {StatementBuilder}
     */
    resumed() {
        var addInitializedTime = true;
        if(this.IsInitialized) {
            if (this.Tracker.settings.debug) {
                throw new Error("The Resumed statement for the specified id has already been sent!");
            } else {
                console.warn("The Resumed statement for the specified id has already been sent!");
                addInitializedTime = false;
                return;
            }
        }
        if (addInitializedTime) {
            this.InitializedTime = new Date();
            this.IsInitialized=true;
        }
        if(this.Type != SCORMPROFILE.ACTIVITYTYPES.LESSON) {
            throw new Error("You cannot resume an object for a type different that SCO.");
        }
        return this.Tracker.trace(SCORMPROFILE.VERBS.RESUMED, this.Type, this.ScormId, this.Context);
    }

    /**
     * Send Terminated statement
     * @returns {StatementBuilder}
     */
    terminated() {
        if(!this.IsInitialized) {
            if (this.Tracker.settings.debug) {
                throw new Error("You need to send a initialized statement before sending an Terminated statement!");
            } else {
                console.warn("You need to send a initialized statement before sending an Terminated statement!");
                return;
            }
        }
        let actualDate=new Date();
        this.IsInitialized=false;
        if(this.Type != SCORMPROFILE.ACTIVITYTYPES.LESSON) {
            throw new Error("You cannot terminate an object for a type different that SCO.");
        }
        return this.Tracker.trace(SCORMPROFILE.VERBS.TERMINATED, this.Type, this.ScormId, this.Context)
                    .withDuration(this.InitializedTime, actualDate);
    }

    /**
     * Send Passed statement
     * @returns {StatementBuilder}
     */
    passed() {
        return this.Tracker.trace(SCORMPROFILE.VERBS.PASSED, this.Type, this.ScormId, this.Context);
    }

    /**
     * Send Failed statement
     * @returns {StatementBuilder}
     */
    failed() {
        return this.Tracker.trace(SCORMPROFILE.VERBS.FAILED, this.Type, this.ScormId, this.Context);
    }

    /**
     * Send Scored statement
     * @param {number} score the score of the Scorm object
     * @returns {StatementBuilder}
     */
    scored(score) {
        if (typeof score === 'undefined') {score = 1;}

        return this.Tracker.trace(SCORMPROFILE.VERBS.SCORED, this.Type, this.ScormId, this.Context)
            .withScore({raw:score});
    }

    /**
     * Send Completed statement
     * @param {boolean} success the success status of the Scorm object
     * @param {boolean} completion the completion status of the Scorm object
     * @param {number} score the score of the Scorm object
     * @returns {StatementBuilder}
     */
    completed(success, completion, score) {
        if (typeof success === 'undefined') {success = true;}
        if (typeof completion === 'undefined') {completion = false;}
        if (typeof score === 'undefined') {score = 1;}

        if(!this.IsInitialized) {
            if (this.Tracker.settings.debug) {
                throw new Error("You need to send a initialized statement before sending an suspended statement!");
            } else {
                console.warn("You need to send a initialized statement before sending an suspended statement!");
                return;
            }
        }
        let actualDate=new Date();
        return this.Tracker.trace(SCORMPROFILE.VERBS.COMPLETED, this.Type, this.ScormId, this.Context)
            .withSuccess(success)
            .withCompletion(completion)
            .withScore({raw:score})
            .withDuration(this.InitializedTime, actualDate);
    }
}

const msFn = ms__namespace.default || ms__namespace;

/**
 * Main JavaScript Tracker class for xAPI tracking functionality
 */
class JSTracker {
    ALL = ALL;
    STATEMENT_BUILDER_IDS = STATEMENT;
    /**
     * The underlying tracker instance
     * @type {xAPITrackerAssetOAuth2|xAPITrackerAssetOAuth1|xAPITrackerAsset}
     */
    tracker;

    /**
     * Indicates if the tracker has been started
     * @type {boolean}
     */
    Started = false;
    
    /**
     * Settings of JSTracker
     * @typedef {Object} trackerSettings
     * @property {boolean} generateSettingsFromURLParams
     * @property {string} oauth_type
     * @property {boolean} batch_mode
     * @property {string} batch_endpoint
     * @property {string} oauth_type
     * @property {number} batch_length
     * @property {number} batch_timeout
     * @property {string} platform
     * @property {string} actor_name
     * @property {boolean} backup_mode
     * @property {string} backup_endpoint
     * @property {string} backup_type
     * @property {string} default_uri
     * @property {number} max_retry_delay
     * @property {boolean} debug
     * @property {string} parent_activity_id
     * @property {string} registration_id
    * @property {string} parent_activity_type
    * @property {string} [auth_token] - Optional auth token for OAuth0
     */
    trackerSettings={
        generateSettingsFromURLParams:false,
        oauth_type:"OAuth0",
        batch_mode:true,
        batch_endpoint:"http://myurl.com/endpoint",
        batch_length:100,
        batch_timeout:msFn("30sec"),
        platform:"http://myhomepage.com",
        actor_name:"my_default_actor",
        backup_mode:false,
        backup_endpoint:"http://myurl.com/backup-endpoint",
        backup_type:"XAPI",
        default_uri:"mydefaulturi",
        max_retry_delay:msFn("2min"),
        debug:false,
        parent_activity_id:'',
        registration_id: '',
        parent_activity_type:ALL.ACTIVITYTYPES.LESSON,
        auth_token: '',
        actor_homepage:''
    };
    /**
     * @typedef {Object} oauth1
     * @property {string} username
     * @property {string} password
     */
    oauth1={
        username:"superusername",
        password:"supersecret"
    };

/**
     * @typedef {Object} oauth2
     * @property {string} token_endpoint
     * @property {string} grant_type
     * @property {string} client_id
     * @property {string} [client_secret]
     * @property {string} [scope]
     * @property {string} [state]
     * @property {string} [code_challenge_method]
     * @property {string} [username]
     * @property {string} [password]
     * @property {string} [login_hint]
     * @property {string} [device_authorization_endpoint] - Device authorization endpoint for device_code grant
     * @property {number} [poll_interval] - Polling interval in seconds for device flow
     * @property {number} [max_poll_attempts] - Maximum poll attempts for device flow
     * @property {string} [language] - UI language for the device sign-in screen (en, es, fr)
     */
    oauth2 = {
        token_endpoint:                 "https://.../token",
        client_id:                      "my_client_id",
        client_secret:                  "",
        grant_type:                     "password",
        scope:                          "openid profile",
        state:                          "",
        code_challenge_method:          "",
        username:                       "alice@example.com",
        password:                       "supersecret",
        login_hint:                     "alice@example.com",
        device_authorization_endpoint:  "",
        poll_interval:                  null,
        max_poll_attempts:              null,
        language:                       "",
    };

    /**
     * Creates a new JSTracker instance
     */
    constructor() {
    }

    /**
     * 
     * @returns {Promise<void>} 
     */
    async login() {
        if(this.trackerSettings.generateSettingsFromURLParams) {
            this.generateXAPITrackerFromURLParams();
        }
         if (this.trackerSettings.oauth_type === "OAuth2") {
            /**
             * @type {xAPITrackerAssetOAuth2}
             */
            this.tracker = new xAPITrackerAssetOAuth2();
            if (this.tracker && 'oauth2Settings' in this.tracker) {
                this.tracker.oauth2Settings = this.oauth2;
            } else {
                throw new Error("tracker isn't OAuth2");
            }
        } else if (this.trackerSettings.oauth_type === "OAuth1") {
            /**
             * @type {xAPITrackerAssetOAuth1}
             */
            this.tracker = new xAPITrackerAssetOAuth1();
            if (this.tracker && 'oauth1Settings' in this.tracker) {
                this.tracker.oauth1Settings = this.oauth1;
            } else {
                throw new Error("tracker isn't OAuth1");
            }
        } else {
            this.tracker = new xAPITrackerAsset();
            this.tracker.auth_token = this.trackerSettings.auth_token;
        }
        this.tracker.settings = this.trackerSettings;
        await this.tracker.login();
    }

    isStarted() {
        return this.Started;
    }

    isLoggedIn() {
        return this.tracker && this.tracker.isLoggedIn();
    }
    
    start() {
        if(!this.tracker) {
            this.tracker = new xAPITrackerAsset();
        }
        this.tracker.settings = this.trackerSettings;
        this.tracker.start();
        this.Started=true;
    }

    stop() {
        this.tracker.stop();
        this.Started = false;
    };

    logout() {
        if(this.tracker) {
            this.tracker.logout();
        }
        this.trackerSettings.oauth_type="OAuth0";
    }

    /**
     * Flushes the statement queue
     * @param {Object} [opts] - Flush options
     * @param {boolean} [opts.withBackup=false] - Whether to also send to backup endpoint
     * @returns {Promise<void>} Promise that resolves when flushing is complete
     */
    async flush({ withBackup = false } = {}) {
        if(this.tracker) {
            return await this.tracker.flush({ withBackup: withBackup });
        }
    }

    /**
     * Generates an xAPI tracker instance from URL parameters
     */
    generateXAPITrackerFromURLParams() {
        const xAPIConfig = {};
        const urlParams = new URLSearchParams(window.location.search);
        let result_uri, backup_uri, backup_type, actor_name, platform, actor_homepage, strDebug, debug;
        let username, password, auth_token;
        let batchLength, batchTimeout, maxRetryDelay;

        if (urlParams.size > 0) {
            // RESULT URI
            result_uri = urlParams.get('result_uri');

            // BACKUP URI
            backup_uri = urlParams.get('backup_uri');
            backup_type = urlParams.get('backup_type');

            // ACTOR DATA
            platform = urlParams.get('platform');
            actor_name = urlParams.get('actor_user');
            actor_homepage = urlParams.get('actor_homepage');

            // SSO OAUTH 2.0 DATA
            const sso_token_endpoint = urlParams.get('sso_token_endpoint');
            if (sso_token_endpoint) {
                xAPIConfig.token_endpoint = sso_token_endpoint;
            }
            const sso_client_id = urlParams.get('sso_client_id');
            if (sso_client_id) {
                xAPIConfig.client_id = sso_client_id;
            }
            const sso_login_hint = urlParams.get('sso_login_hint');
            if (sso_login_hint) {
                xAPIConfig.login_hint = sso_login_hint;
            }
            const sso_grant_type = urlParams.get('sso_grant_type');
            if (sso_grant_type) {
                xAPIConfig.grant_type = sso_grant_type;
            }
            const sso_scope = urlParams.get('sso_scope');
            if (sso_scope) {
                xAPIConfig.scope = sso_scope;
            }
            const sso_username = urlParams.get('sso_username');
            if (sso_username) {
                xAPIConfig.username = sso_username;
            }
            const sso_password = urlParams.get('sso_password');
            if (sso_password) {
                xAPIConfig.password = sso_password;
            } else {
                if (sso_username) {
                    xAPIConfig.password = sso_username;
                }
            }
            
            // SSO OAUTH 2.0 DEVICE AUTHORIZATION DATA
            const sso_device_authorization_endpoint = urlParams.get('sso_device_authorization_endpoint');
            if (sso_device_authorization_endpoint) {
                xAPIConfig.device_authorization_endpoint = sso_device_authorization_endpoint;
            }
            const sso_poll_interval = urlParams.get('sso_poll_interval');
            if (sso_poll_interval) {
                xAPIConfig.poll_interval = parseInt(sso_poll_interval, 10);
            }
            const sso_max_poll_attempts = urlParams.get('sso_max_poll_attempts');
            if (sso_max_poll_attempts) {
                xAPIConfig.max_poll_attempts = parseInt(sso_max_poll_attempts, 10);
            }
            const sso_language = urlParams.get('sso_language');
            if (sso_language) {
                xAPIConfig.language = sso_language;
            }

            // OAUTH 1.0 DATA
            username = urlParams.get('username');
            password = urlParams.get('password');

            // OAUTH 0: VIA AUTHTOKEN DIRECTLY (not recommended)
            auth_token = urlParams.get('auth_token');

            // DEBUG
            strDebug = urlParams.get('debug');

            // BATCH
            var batch_length_param=urlParams.get('batch_length');
            var batch_timeout_param=urlParams.get('batch_timeout');
            var max_retry_delay_param=urlParams.get('max_retry_delay');
            if(batch_length_param) {
                batchLength = parseInt(batch_length_param);
            }
            if(batch_timeout_param) {
                batchTimeout = msFn(batch_timeout_param);
            }
            if(max_retry_delay_param) {
                maxRetryDelay = msFn(max_retry_delay_param);
            }
            
            if (strDebug !== null && strDebug === "true") {
                debug = Boolean(strDebug);
                console.debug(result_uri);
                console.debug(backup_type);
                console.debug(actor_name);
                console.debug(platform);
                console.debug(debug);
                console.debug(batchLength);
                console.debug(batchTimeout);
                console.debug(maxRetryDelay);
            }
        } else {
            backup_type = "XAPI";
        }

        if (xAPIConfig.token_endpoint) {
            this.trackerSettings.oauth_type="OAuth2";
            //if(!xAPIConfig.client_id || !xAPIConfig.grant_type || !xAPIConfig.token_endpoint) {
            //    throw new Error("Missing required OAuth2 parameters in URL. Required: sso_token_endpoint, sso_client_id, sso_grant_type");
            //}
            //if(xAPIConfig.grant_type === "password" && (!xAPIConfig.username || !xAPIConfig.password)) {
            //    throw new Error("Missing required OAuth2 parameters for password grant type. Required: sso_username, sso_password");
            //}
            //if(xAPIConfig.grant_type === "urn:ietf:params:oauth:grant-type:device_code" && !xAPIConfig.device_authorization_endpoint) {
            //    throw new Error("Missing required OAuth2 parameters for device_code grant type. Required: sso_device_authorization_endpoint");
            //}
            this.oauth2.client_id = xAPIConfig.client_id;
            this.oauth2.grant_type = xAPIConfig.grant_type;
            this.oauth2.login_hint = xAPIConfig.login_hint;
            this.oauth2.username = xAPIConfig.username;
            this.oauth2.password = xAPIConfig.password;
            this.oauth2.scope = xAPIConfig.scope;
            this.oauth2.token_endpoint = xAPIConfig.token_endpoint;
            this.oauth2.device_authorization_endpoint = xAPIConfig.device_authorization_endpoint;
            this.oauth2.poll_interval = xAPIConfig.poll_interval;
            this.oauth2.max_poll_attempts = xAPIConfig.max_poll_attempts;
            this.oauth2.language = xAPIConfig.language;
        } else if (username && password) {
            this.trackerSettings.oauth_type="OAuth1";
            this.oauth1.username = username;
            this.oauth1.password = password;
        } else {
            this.trackerSettings.oauth_type="OAuth0";
            this.trackerSettings.auth_token = auth_token;
        }
        if(result_uri !== undefined) {
            this.trackerSettings.batch_endpoint=result_uri;
        }
        if(platform !== undefined) {
            this.trackerSettings.platform=platform;
        }
        if(actor_name !== undefined) {
            this.trackerSettings.actor_name=actor_name;
        }
        if(actor_homepage !== undefined) {
            this.trackerSettings.actor_homepage=actor_homepage;
        }
        if(backup_uri !== undefined) {
            this.trackerSettings.backup_endpoint=backup_uri;
        }
        if(backup_type !== undefined) {
            this.trackerSettings.backup_type=backup_type;
        }
        if(debug !== undefined) {
            this.trackerSettings.debug=debug;
        }
        if(batchLength !== undefined) {
            this.trackerSettings.batch_length=batchLength;
        }
        if(batchTimeout !== undefined) {
            this.trackerSettings.batch_timeout=batchTimeout;
        }
        if(maxRetryDelay !== undefined) {
            this.trackerSettings.max_retry_delay=maxRetryDelay;
        }
    }

    /**
     * Creates a new statement builder
     * @param {string} verbId - The verb ID for the statement
     * @param {string} objectType - The type of the object
     * @param {string} objectId - The ID of the object
     * @returns {StatementBuilder} A new StatementBuilder instance
     */
    trace(verbId, objectType, objectId) {
        if (!this.tracker) {
            throw new Error("Tracker not initialized. Call login() and start() before trace().");
        }
        return this.tracker.trace(verbId, objectType, objectId);
    }

    /**
     * Creates a new statement builder from an xAPI statement
     * @param {Object} statement - The xAPI statement to create the builder from
     * @returns {StatementBuilder} A new StatementBuilder instance
     */
    fromXAPI(statement) {
        if (!this.tracker) {
            throw new Error("Tracker not initialized. Call login() and start() before sending statements.");
        }
        return this.tracker.fromXAPI(statement);
    }
}

/**
 * SCORM-specific tracker extending JSTracker
 */
class JSScormTracker extends JSTracker {
    SCORMPROFILE = SCORMPROFILE;
    STATEMENT_BUILDER_IDS = STATEMENT;
    ALL = ALL;
    /**
     * list of scorm instances
     */
    scormInstances={};

    /**
     * Creates a new JSScormTracker instance
     */
    constructor() {
        super();
    }

    async login() {
        await super.login();
        if(!this.scormInstances[this.trackerSettings.parent_activity_type]) {
            this.scormInstances[this.trackerSettings.parent_activity_type]= {};
        }
        if(this.trackerSettings.parent_activity_id && !(this.trackerSettings.parent_activity_id in this.scormInstances[this.trackerSettings.parent_activity_type])) {
            this.scormInstances[this.trackerSettings.parent_activity_type][this.trackerSettings.parent_activity_id]= new ScormTracker(this.tracker, this.trackerSettings.parent_activity_id, this.trackerSettings.parent_activity_type, this.tracker.context_without_parent);
        }
    }

    logout() {
        super.logout();
        this.scormInstances={};
    }

    /**
     * Creates a new SCORM tracker instance
     * @param {string} id - Activity ID
     * @param {string} type - SCORM type
     * @returns {ScormTracker} New SCORM tracker instance
     */
    scorm(id, type=SCORMPROFILE.ACTIVITYTYPES.LESSON) {
        var scorm;
        if(!this.scormInstances[type]) {
            this.scormInstances[type]={};
        }
        if(!this.scormInstances[type][id]) {
            scorm =new ScormTracker(this.tracker, id, type);
            this.scormInstances[type][id]=scorm;
        } else {
            scorm=this.scormInstances[type][id];
        }
        return scorm;
    }

    /**
     * Creates a new statement builder
     * @param {string} verbId - The verb ID for the statement
     * @param {string} objectType - The type of the object
     * @param {string} objectId - The ID of the object
     * @return {StatementBuilder} A new StatementBuilder instance
     *  */
    trace(verbId, objectType, objectId) {
        return super.trace(verbId, objectType, objectId);
    }

    /**
     * Creates a new statement builder from an xAPI statement
     * @param {Object} statement - The xAPI statement to create the builder from
     * @returns {StatementBuilder} A new StatementBuilder instance
     */
    fromXAPI(statement) {
        return super.fromXAPI(statement);
    }
}

/**
 * SCORM-specific tracker extending JSTracker
 */
class LRSTracker extends JSTracker {
    ALL = ALL;    
    STATEMENT_BUILDER_IDS = STATEMENT;
    /**
     * Creates a new MyTracker instance
     */
    constructor() {
        super();
    }

    async login() {
        await super.login();
    }

    logout() {
        super.logout();
    }
    
    /**
     * Creates a new statement builder
     * @param {string} verbId - The verb ID for the statement
     * @param {string} objectType - The type of the object
     * @param {string} objectId - The ID of the object
     * @return {StatementBuilder} A new StatementBuilder instance
     *  */
    trace(verbId, objectType, objectId) {
        if (!this.tracker) {
            throw new Error("Tracker not initialized. Call login() and start() before trace().");
        }
        return this.tracker.trace(verbId, objectType, objectId, this.tracker.context, true);
    }

    /**
     * Creates a new statement builder from an xAPI statement
     * @param {Object} statement - The xAPI statement to create the builder from
     * @returns {LRSStatementBuilder} A new StatementBuilder instance
     */
    fromXAPI(statement) {
        return this.tracker.fromXAPI(statement, true);
    }

    async getLRSClientResponseData(response) {
        return response && response.data !== undefined ? response.data : response;
    }

    /**
     * Gets a statement by its ID
     * @param {string} statementId - The ID of the statement to fetch
     * @returns {Promise} A promise that resolves with the fetched statement
     */
    async getStatementById(statementId) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getStatement({ statementId });
        return this.getLRSClientResponseData(response);
    }

    /**
     * Gets statements based on a query
     * @param {Object} query - The query to filter statements
     * @returns {Promise} A promise that resolves with the fetched statements
     */
    async getStatementByQuery(query) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getStatements(query);
        return this.getLRSClientResponseData(response);
    }

    /**
     * Gets more statements using a "more" URL from a previous query result
     * @param {string} moreUrl - The URL to fetch more statements
     * @returns {Promise} A promise that resolves with the fetched statements
     */
    async getMoreStatements(moreUrl) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getMoreStatements({ more: moreUrl });
        return this.getLRSClientResponseData(response);
    }

    async getAgent(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getAgent(params);
        return this.getLRSClientResponseData(response);
    }

    async createAgentProfile(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.createAgentProfile(params);
        return this.getLRSClientResponseData(response);
    }

    async setAgentProfile(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.setAgentProfile(params);
        return this.getLRSClientResponseData(response);
    }

    async getAgentProfiles(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getAgentProfiles(params);
        return this.getLRSClientResponseData(response);
    }

    async getAgentProfile(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getAgentProfile(params);
        return this.getLRSClientResponseData(response);
    }

    async deleteAgentProfile(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.deleteAgentProfile(params);
        return this.getLRSClientResponseData(response);
    }

    async getActivity(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getActivity(params);
        return this.getLRSClientResponseData(response);
    }

    async createActivityProfile(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.createActivityProfile(params);
        return this.getLRSClientResponseData(response);
    }

    async setActivityProfile(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.setActivityProfile(params);
        return this.getLRSClientResponseData(response);
    }

    async getActivityProfiles(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getActivityProfiles(params);
        return this.getLRSClientResponseData(response);
    }

    async getActivityProfile(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getActivityProfile(params);
        return this.getLRSClientResponseData(response);
    }

    async deleteActivityProfile(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.deleteActivityProfile(params);
        return this.getLRSClientResponseData(response);
    }

    async createState(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.createState(params);
        return this.getLRSClientResponseData(response);
    }

    async setState(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.setState(params);
        return this.getLRSClientResponseData(response);
    }

    async getStates(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getStates(params);
        return this.getLRSClientResponseData(response);
    }

    async getState(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getState(params);
        return this.getLRSClientResponseData(response);
    }

    async deleteState(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.deleteState(params);
        return this.getLRSClientResponseData(response);
    }

    async deleteStates(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.deleteStates(params);
        return this.getLRSClientResponseData(response);
    }

    async getAbout(params) {
        const client = this.tracker.getXAPIClient();
        const response = await client.getAbout(params);
        return this.getLRSClientResponseData(response);
    }

    async getExtension(activityId, extensionId, params = {}) {
        const activity = await this.getActivity({ activityId, ...params });
        const extensions = activity && activity.definition ? activity.definition.extensions : undefined;
        return extensions ? extensions[extensionId] : undefined;
    }
}


/**
 * Serious Game Tracker extending JSTracker with game-specific functionality
 */
class SeriousGameTracker extends JSTracker {
    /**
     * Accessible type constants
     */
    SERIOUSGAMEPROFILE = SERIOUSGAMESPROFILE;
    STATEMENT_BUILDER_IDS = STATEMENT;
    ALL = ALL;
    ACCESSIBLETYPE=ACCESSIBLETYPE;
    ALTERNATIVETYPE=ALTERNATIVETYPE;
    COMPLETABLETYPE=COMPLETABLETYPE;
    GAMEOBJECTTYPE=GAMEOBJECTTYPE;

    /**
     * SCORM tracker instance
     * @type {ScormTracker}
     */
    scormTracker;

    /**
     * list of instances
     */
    instances= {
        "completable": {},
        "gameObject": {},
        "alternative": {},
        "accessible": {}
    };

    /**
     * Creates a new SeriousGameTracker instance
     */
    constructor() {
        super();
        this.parent_activity_id=this.trackerSettings.parent_activity_id || '';
    }

    async login() {
        await super.login();
    }

    logout() {
        super.logout();
        this.scormTracker=null;
        this.instances={
            "completable": {},
            "gameObject": {},
            "alternative": {},
            "accessible": {}
        };
    }

    start() {
        super.start();
        if(this.trackerSettings.activityId) {
            this.scormTracker = new ScormTracker(this.tracker, this.trackerSettings.activityId, this.trackerSettings.parent_activity_type);
        }
    }

    stop() {
        super.stop();
    }

    /**
     * Marks the game as started
     * @returns {StatementBuilder} Promise that resolves when the start is recorded
     */
    initialized() {
        if(!this.scormTracker) {
            throw new Error("SCORM Tracker not initialized. Ensure start() has been called and trackerSettings include an activityId.");
        }
        return this.scormTracker.initialized();
    }

    /**
     * Marks the game as paused
     * @returns {StatementBuilder} Promise that resolves when the pause is recorded
     */
    pause() {
        if(!this.scormTracker) {
            throw new Error("SCORM Tracker not initialized. Ensure start() has been called and trackerSettings include an activityId.");
        }
        return this.scormTracker.suspended();
    }

    /**
     * Marks the game as resumed
     * @returns {StatementBuilder} Promise that resolves when the resume is recorded
     */
    resumed() {
        if(!this.scormTracker) {
            throw new Error("SCORM Tracker not initialized. Ensure start() has been called and trackerSettings include an activityId.");
        }
        return this.scormTracker.resumed();
    }

    /**
     * Marks the game as finished
     * @returns {StatementBuilder} Promise that resolves when the finish is recorded
     */
    terminated() {
        if(!this.scormTracker) {
            throw new Error("SCORM Tracker not initialized. Ensure start() has been called and trackerSettings include an activityId.");
        }
        return this.scormTracker.terminated();
    }

    /**
     * Creates a new statement builder
     * @param {string} verbId - The verb ID for the statement
     * @param {string} objectType - The type of the object
     * @param {string} objectId - The ID of the object
     * @return {StatementBuilder} A new StatementBuilder instance
     *  */
    trace(verbId, objectType, objectId) {
        return super.trace(verbId, objectType, objectId);
    }

    /**
     * Creates a new statement builder from an xAPI statement
     * @param {Object} statement - The xAPI statement to create the builder from
     * @returns {StatementBuilder} A new StatementBuilder instance
     */
    fromXAPI(statement) {
        return super.fromXAPI(statement);
    }
    
    /**
     * Creates a game object tracker instance
     * @param {string} id - Game object ID
     * @param {string} type - Game object type
     * @returns {GameObjectTracker} New GameObjectTracker instance
     */
    gameObject(id, type=SERIOUSGAMESPROFILE.ACTIVITYTYPES.ITEM) {
        var gameObject;
        if(!this.instances["gameObject"][type]) {
            this.instances["gameObject"][type]={};
        }
        if(!this.instances["gameObject"][type][id]) {
            gameObject =new GameObjectTracker(this.tracker, id, type);
            this.instances["gameObject"][type][id]=gameObject;
        } else {
            gameObject=this.instances["gameObject"][type][id];
        }
        return gameObject;
    }

    /**
     * Creates a completable tracker instance
     * @param {string} id - Activity ID
     * @param {string} type - Completable type
     * @returns {CompletableTracker} New CompletableTracker instance
     */
    completable(id, type=SERIOUSGAMESPROFILE.ACTIVITYTYPES.SERIOUS_GAME) {
        var completable;
        if(!this.instances["completable"][type]) {
            this.instances["completable"][type]={};
        }
        if(!this.instances["completable"][type][id]) {
            completable =new CompletableTracker(this.tracker, id, type);
            this.instances["completable"][type][id]=completable;
        } else {
            completable=this.instances["completable"][type][id];
        }
        return completable;
    }

    /**
     * Creates an alternative tracker instance
     * @param {string} id - Activity ID
     * @param {string} type - Alternative type
     * @returns {AlternativeTracker} New AlternativeTracker instance
     */
    alternative(id, type=ALL.ACTIVITYTYPES.ASSESSMENT) {
        var alternative;
        if(!this.instances["alternative"][type]) {
            this.instances["alternative"][type]={};
        }
        if(!this.instances["alternative"][type][id]) {
            alternative =new AlternativeTracker(this.tracker, id, type);
            this.instances["alternative"][type][id]=alternative;
        } else {
            alternative=this.instances["alternative"][type][id];
        }
        return alternative;
    }

    /**
     * Creates an accessible tracker instance
     * @param {string} id - Activity ID
     * @param {string} type - Accessible type
     * @returns {AccessibleTracker} New AccessibleTracker instance
     */
    accessible(id, type=SERIOUSGAMESPROFILE.ACTIVITYTYPES.AREA) {
        var accessible;
        if(!this.instances["accessible"][type]) {
            this.instances["accessible"][type]={};
        }
        if(!this.instances["accessible"][type][id]) {
            accessible =new AccessibleTracker(this.tracker, id, type);
            this.instances["accessible"][type][id]=accessible;
        } else {
            accessible=this.instances["accessible"][type][id];
        }
        return accessible;
    }
}

exports.JSScormTracker = JSScormTracker;
exports.JSTracker = JSTracker;
exports.LRSTracker = LRSTracker;
exports.SeriousGameTracker = SeriousGameTracker;
