/**
 * OAuth 2.0 Authorization Error
 * Matches XASU OAuth2AuthorizationError
 */
export class OAuth2AuthorizationError extends Error {
    constructor(error: any, errorDescription: any);
    error: any;
    errorDescription: any;
}
/**
 * OAuth 2.0 Device Authorization Error
 * Matches XASU OAuth2DeviceAuthorizationError
 */
export class OAuth2DeviceAuthorizationError extends Error {
    constructor(error: any, errorDescription: any);
    error: any;
    errorDescription: any;
}
/**
 * OAuth 2.0 Device Authorization Response
 * Matches XASU OAuth2DeviceAuthorization
 */
export class OAuth2DeviceAuthorization {
    static fromJson(json: any): OAuth2DeviceAuthorization;
    device_code: any;
    user_code: any;
    verification_uri: any;
    verification_uri_complete: any;
    interval: number;
    expires_in: number;
}
/**
 * OAuth 2.0 Token
 * Matches XASU OAuth2Token with normalized fields
 */
export class OAuth2Token {
    static fromJson(json: any): OAuth2Token;
    access_token: any;
    token_type: any;
    expires_in: number;
    refresh_token: any;
    username: any;
    client_id: any;
    requestTime: any;
    get expired(): boolean;
}
/**
 * A class that implements OAuth 2.0 protocol for authentication and token management.
 * Supports various grant types including password, refresh_token, and device_code flows.
 * closely modeled after XASU OAuth2DeviceProtocol (C#)
 */
export default class OAuth2Protocol {
    static FIELD_MISSING_MESSAGE: string;
    static UNSUPPORTED_GRANT_TYPE_MESSAGE: string;
    static UNSUPPORTED_PKCE_METHOD_MESSAGE: string;
    static DEVICE_AUTHORIZATION_ENDPOINT_FIELD: string;
    static TOKEN_ENDPOINT_FIELD: string;
    static CLIENT_ID_FIELD: string;
    static SCOPE_FIELD: string;
    static GRANT_TYPE_FIELD: string;
    static POLL_INTERVAL_FIELD: string;
    static MAX_POLL_ATTEMPTS_FIELD: string;
    /**
     * Validates that a URL is a valid HTTP or HTTPS URL.
     * Mirrors XASU OAuth2DeviceProtocol.IsValidHttpUrl()
     *
     * @param {string} url - The URL to validate
     * @returns {boolean} True if the URL is valid
     */
    static "__#private@#isValidHttpUrl"(url: string): boolean;
    /**
     * Builds a device authorization error from an HTTP response.
     * Mirrors XASU OAuth2DeviceProtocol.BuildDeviceAuthorizationError()
     *
     * @param {number} status - HTTP status code
     * @param {string} body - Response body
     * @param {string} url - Request URL
     * @returns {OAuth2AuthorizationError} The constructed error
     */
    static "__#private@#buildDeviceAuthorizationError"(status: number, body: string, url: string): OAuth2AuthorizationError;
    constructor(config: any);
    deviceAuthorizationEndpoint: any;
    tokenEndpoint: any;
    grantType: any;
    username: any;
    password: any;
    clientId: any;
    scope: any;
    state: any;
    login_hint: any;
    codeChallengeMethod: any;
    deviceCode: any;
    userCode: any;
    verificationUri: any;
    verificationUriComplete: any;
    interval: any;
    maxPollAttempts: any;
    pollInterval: any;
    token: any;
    tokenRefreshInProgress: boolean;
    onAuthorizationInfoUpdate: any;
    /** Internal hook wired to the built-in blocking UI. Not for host use. */
    onDeviceAuthorizationInfo: any;
    clientSecret: any;
    getToken(): Promise<void>;
    refreshToken(): Promise<any>;
    hasTokenExpired(): any;
    logout(): Promise<void>;
    unauthorized(errorMessage: any): void;
    forbidden(errorMessage: any): void;
    #private;
}
