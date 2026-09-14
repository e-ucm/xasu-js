/**
 * Built-in blocking UI for OAuth2 Authorization.
 * Shows a full-screen modal overlay that blocks all game input until the
 * access token is obtained. There is no host-provided callback: the tracker
 * always uses this UI.
 *
 * States: loading (shown immediately on login) -> device info (QR + code) ->
 * error (message shown, overlay stays blocked) -> dismissed (token only).
 */

import QRCode from 'qrcode';

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
  padding: 32px 40px;
  max-width: 420px;
  width: 90%;
  text-align: center;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.25);
  user-select: none;
  -webkit-user-select: none;
}
#${OVERLAY_ID} .xapi-device-card h2 {
  margin: 0 0 8px;
  font-size: 20px;
  color: #222;
}
#${OVERLAY_ID} .xapi-device-card p {
  margin: 4px 0;
  font-size: 14px;
  color: #555;
}
#${OVERLAY_ID} .xapi-device-card .xapi-device-code {
  display: inline-block;
  margin: 16px 0;
  padding: 12px 24px;
  font-size: 28px;
  font-weight: 700;
  letter-spacing: 2px;
  color: #1a1a2e;
  background: #f0f0f5;
  border: 2px dashed #999;
  border-radius: 8px;
  user-select: all;
  -webkit-user-select: all;
  cursor: pointer;
}
#${OVERLAY_ID} .xapi-device-card .xapi-device-code:hover {
  background: #e8e8f0;
}
#${OVERLAY_ID} .xapi-device-qr {
  margin: 0 auto;
  padding: 8px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: #fff;
}
#${OVERLAY_ID} .xapi-device-card .xapi-device-url {
  display: block;
  margin: 8px 0 20px;
  font-size: 13px;
  color: #0066cc;
  word-break: break-all;
}
#${OVERLAY_ID} .xapi-device-card button.xapi-device-btn {
  display: inline-block;
  padding: 12px 32px;
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
#${OVERLAY_ID} .xapi-device-card .xapi-device-expiry {
  margin-top: 12px;
  font-size: 12px;
  color: #999;
}
#${OVERLAY_ID} .xapi-device-card .xapi-device-status {
  margin-top: 12px;
  font-size: 13px;
  color: #555;
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
#${OVERLAY_ID} .xapi-device-spinner {
  margin: 20px auto;
  width: 36px;
  height: 36px;
  border: 4px solid #dfe7f3;
  border-top-color: #0066cc;
  border-radius: 50%;
  animation: xapi-device-spin 0.8s linear infinite;
}
@keyframes xapi-device-spin {
  to { transform: rotate(360deg); }
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

function dismiss() {
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
        activeOverlay.setAttribute('aria-label', 'Sign in required');
        activeOverlay.addEventListener('pointerdown', function (e) {
            if (e.target === activeOverlay) {
                e.preventDefault();
                e.stopPropagation();
            }
        }, true);
        document.body.appendChild(activeOverlay);
    }
    if (!activeHandle) {
        activeHandle = { update: updateOverlay, showError: showError, dismiss: dismiss };
    }
    return activeHandle;
}

function renderLoading() {
    ensureOverlay();
    activeOverlay.innerHTML = `
      <div class="xapi-device-card">
        <h2>Sign In</h2>
        <div class="xapi-device-spinner" aria-hidden="true"></div>
        <p>Signing you in…</p>
        <p class="xapi-device-status">The game is paused until login completes.</p>
      </div>
    `;
}

function formatExpiry(expiresIn) {
    if (!expiresIn || expiresIn <= 0) return '';
    const mins = Math.floor(expiresIn / 60);
    const secs = expiresIn % 60;
    return mins > 0
        ? 'Code expires in ' + mins + 'm ' + secs + 's'
        : 'Code expires in ' + secs + 's';
}

function updateOverlay(info) {
    if (typeof document === 'undefined') return;
    ensureOverlay();
    const verificationUrl = info.verification_uri_complete || info.verification_uri;
    const expiryText = formatExpiry(info.expires_in);

    activeOverlay.innerHTML = `
      <div class="xapi-device-card">
        <h2>Sign In</h2>
        <p>Scan the code below on another device:</p>
        <canvas class="xapi-device-qr"></canvas>
        <p>Or open the link below and enter this code:</p>
        <div class="xapi-device-code" title="Click to select">${escapeHtml(info.user_code)}</div>
        <a class="xapi-device-url" href="${escapeHtml(verificationUrl)}" target="_blank" rel="noopener noreferrer">${escapeHtml(verificationUrl)}</a>
        <button class="xapi-device-btn" type="button">Open Verification Page</button>
        <p class="xapi-device-status">Waiting for approval… The game stays paused until login completes.</p>
        ${expiryText ? '<div class="xapi-device-expiry">' + escapeHtml(expiryText) + '</div>' : ''}
      </div>
    `;

    const qrCanvas = activeOverlay.querySelector('.xapi-device-qr');
    QRCode.toCanvas(qrCanvas, verificationUrl, { width: 200, margin: 1 })
        .catch(function (error) {
            console.error('[OAuth2Device] Failed to render QR code: ' + error.message);
            const card = activeOverlay.querySelector('.xapi-device-card');
            if (card && qrCanvas && qrCanvas.parentNode === card) card.removeChild(qrCanvas);
        });

    activeOverlay.querySelector('.xapi-device-btn').addEventListener('click', function () {
        window.open(verificationUrl, '_blank', 'noopener,noreferrer');
    });
}

function showError(message) {
    if (typeof document === 'undefined') return;
    ensureOverlay();
    let card = activeOverlay.querySelector('.xapi-device-card');
    if (!card) {
        renderLoading();
        card = activeOverlay.querySelector('.xapi-device-card');
    }
    let errorBox = card.querySelector('.xapi-device-error');
    if (!errorBox) {
        errorBox = document.createElement('div');
        errorBox.className = 'xapi-device-error';
        errorBox.setAttribute('role', 'alert');
        card.appendChild(errorBox);
    }
    errorBox.textContent = message || 'Sign in failed. The game stays paused until login completes.';
}

/**
 * Shows the blocking auth UI immediately (loading state).
 * The game stays non-clickable until dismiss() is called after a token.
 * @returns {{ update: (info: object) => void, showError: (message: string) => void, dismiss: () => void }}
 */
export function showBlockingAuthUI() {
    if (typeof document === 'undefined') {
        console.warn('[OAuth2Device] Cannot show blocking UI: not in a browser environment.');
        return { update() {}, showError() {}, dismiss() {} };
    }
    renderLoading();
    return activeHandle;
}

/**
 * Legacy alias: renders/updates the blocking device UI in place.
 * Kept for backwards compatibility; hosts must not provide their own UI.
 * @param {object} info - device authorization info
 * @returns {{ update: Function, showError: Function, dismiss: () => void }}
 */
export function showDeviceFallbackUI(info) {
    if (typeof document === 'undefined') {
        console.warn('[OAuth2Device] Cannot show fallback UI: not in a browser environment.');
        return { update() {}, showError() {}, dismiss() {} };
    }
    updateOverlay(info);
    return activeHandle;
}

function escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}

export default { showBlockingAuthUI, showDeviceFallbackUI };
