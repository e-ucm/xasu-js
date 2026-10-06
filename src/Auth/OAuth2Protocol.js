/**
 * OAuth 2.0 Authorization Error
 * Matches XASU OAuth2AuthorizationError
 */
export class OAuth2AuthorizationError extends Error {
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
export class OAuth2DeviceAuthorizationError extends Error {
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
export class OAuth2DeviceAuthorization {
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
export class OAuth2Token {
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
export default class OAuth2Protocol {
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
        this.clientSecret = config["client_secret"]
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
