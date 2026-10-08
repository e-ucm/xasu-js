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

import QRCode from 'qrcode';
import {
    SUPPORTED_LANGUAGES,
    resolveLanguage,
    setStoredLanguage,
    languageName,
    t,
} from './deviceI18n.js';

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
export function setLanguage(lang) {
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
        console.log('[OAuth2Device] Failed to update URL with language: ' + e.message);
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
export function showBlockingAuthUI(options) {
    if (typeof document === 'undefined') {
        console.warn('[OAuth2Device] Cannot show blocking UI: not in a browser environment.');
        return { update() {}, showError() {}, dismiss() {}, setLanguage() {} };
    }
    currentLang = resolveLanguage(options && options.language);
    renderLoading();
    return activeHandle;
}

/**
 * Legacy alias: renders/updates the blocking device UI in place.
 * Kept for backwards compatibility; hosts must not provide their own UI.
 * @param {object} info - device authorization info
 * @returns {{ update: Function, showError: Function, dismiss: () => void, setLanguage: Function }}
 */
export function showDeviceFallbackUI(info) {
    if (typeof document === 'undefined') {
        console.warn('[OAuth2Device] Cannot show fallback UI: not in a browser environment.');
        return { update() {}, showError() {}, dismiss() {}, setLanguage() {} };
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

export default { showBlockingAuthUI, showDeviceFallbackUI, setLanguage };
