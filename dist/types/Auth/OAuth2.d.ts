/**
 * @typedef {import("jwt-decode").JwtPayload & { preferred_username?: string }} OAuth2DecodedToken
 */
/**
 * A specialized tracker asset that implements OAuth2 authentication.
 * Extends the base xAPITrackerAsset with OAuth2 capabilities.
 */
export default class xAPITrackerAssetOAuth2 extends xAPITrackerAsset {
    /**
     * @typedef {Object} OAuth2Settings
     * @property {string} token_endpoint
     * @property {string} grant_type
     * @property {string} client_id
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
    oauth2Settings: {
        token_endpoint: string;
        client_id: string;
        grant_type: string;
        scope: string;
        state: string;
        code_challenge_method: string;
        username: string;
        password: string;
        login_hint: string;
        device_authorization_endpoint: string;
        poll_interval: any;
        max_poll_attempts: any;
        language: string;
    };
    /**
     * Instance of OAuth2Protocol handling authentication
     * @type {OAuth2Protocol|null}
     */
    oauth2: OAuth2Protocol | null;
    /**
     * Callback for token updates
     * @type {Function|null}
     */
    onAuthorizationInfoUpdate: Function | null;
    logout(): Promise<void>;
    #private;
}
export type OAuth2DecodedToken = import("jwt-decode").JwtPayload & {
    preferred_username?: string;
};
import xAPITrackerAsset from "../xAPITrackerAsset.js";
import OAuth2Protocol from "./OAuth2Protocol.js";
