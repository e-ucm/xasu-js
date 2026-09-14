import xAPITrackerAsset from "../xAPITrackerAsset.js";
import OAuth2Protocol from "./OAuth2Protocol.js";
import { jwtDecode } from "jwt-decode";
import { showBlockingAuthUI } from "./OAuth2DeviceFallbackUI.js";

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
    oauth2Settings = {
        token_endpoint:                 "https://.../token",
        client_id:                      "my_client_id",
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
            const decoded = jwtDecode(oAuth2Token.access_token);
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
