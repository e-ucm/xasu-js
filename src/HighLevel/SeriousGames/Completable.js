import xAPITrackerAsset from "../../xAPITrackerAsset.js";
import { ALL } from "../Statement/Ids/Profiles/Generated/All.js";
import StatementBuilder from "../StatementBuilder/StatementBuilder.js";
/**
 * Completable Tracker
 */
export class CompletableTracker {
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
export const COMPLETABLETYPE = Object.freeze({
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