import xAPITrackerAsset from "../../xAPITrackerAsset.js";
import { SERIOUSGAMEPROFILE } from "../Statement/Ids/Profiles/SeriousGameProfile.js";
import { ALL } from "../Statement/Ids/Profiles/Generated/All.js";
import { SERIOUSGAMESPROFILE } from "../Statement/Ids/Profiles/Generated/SeriousGamesProfile.js";
import StatementBuilder from "../StatementBuilder/StatementBuilder.js";

/**
 * Game Object Tracker
 */
export class GameObjectTracker {
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
        return this.Tracker.trace(SERIOUSGAMESPROFILE.VERBS.USED,this.Type,this.GameobjectId);
    }
}

/**
 * the list of types possible for the gameobject object
 */
export const GAMEOBJECTTYPE = Object.freeze({
    ENEMY: ALL.ACTIVITYTYPES.ENEMY,
    NPC: ALL.ACTIVITYTYPES.NON_PLAYER_CHARACTER,
    ITEM: ALL.ACTIVITYTYPES.ITEM,
    GAMEOBJECT: "https://w3id.org/xapi/seriousgames/activity-types/game-object", // WARN: Not in profile server
});