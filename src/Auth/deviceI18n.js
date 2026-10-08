/**
 * Minimal localization helper for the OAuth2 device blocking UI.
 * Dictionaries live in ./locales/*.json and are bundled with the tracker.
 */

import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';

export const DEFAULT_LANGUAGE = 'en';
export const SUPPORTED_LANGUAGES = ['en', 'es', 'fr'];
export const LANGUAGE_STORAGE_KEY = 'xapi-device-lang';

const STRINGS = { en, es, fr };

const NATIVE_NAMES = { en: 'English', es: 'Español', fr: 'Français' };

/**
 * Normalizes a language tag to a supported language code.
 * @param {string} tag - e.g. "es-ES", "FR", "en"
 * @returns {string|null} supported code or null
 */
export function normalizeLanguage(tag) {
    if (!tag || typeof tag !== 'string') return null;
    const base = tag.trim().toLowerCase().split(/[-_]/)[0];
    return SUPPORTED_LANGUAGES.includes(base) ? base : null;
}

/**
 * Reads the language from the page URL (?lang=, ?locale= or ?lng=).
 * @returns {string|null} supported code or null
 */
export function getUrlLanguage() {
    try {
        if (typeof window === 'undefined' || !window.location || !window.location.search) return null;
        const params = new URLSearchParams(window.location.search);
        const raw = params.get('lang') || params.get('locale') || params.get('lng');
        return normalizeLanguage(raw);
    } catch (e) {
        console.log('[OAuth2Device] Failed to read language from URL: ' + e.message);
        return null;
    }
}

/**
 * @returns {string|null} language stored from a previous visit
 */
export function getStoredLanguage() {
    try {
        if (typeof localStorage === 'undefined') return null;
        return normalizeLanguage(localStorage.getItem(LANGUAGE_STORAGE_KEY));
    } catch (e) {
        console.log('[OAuth2Device] Failed to read language from storage: ' + e.message);
        return null;
    }
}

/**
 * @param {string} lang - supported language code
 */
export function setStoredLanguage(lang) {
    try {
        if (typeof localStorage === 'undefined') return;
        localStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
    } catch (e) {
        console.log('[OAuth2Device] Failed to store language: ' + e.message);
        // storage unavailable (private mode) — ignore
    }
}

/**
 * @returns {string|null} browser language if supported
 */
export function getBrowserLanguage() {
    try {
        if (typeof navigator === 'undefined' || !navigator.language) return null;
        return normalizeLanguage(navigator.language);
    } catch (e) {
        console.log('[OAuth2Device] Failed to read browser language: ' + e.message);
        return null;
    }
}

/**
 * Resolves the UI language. Priority: explicit > URL > stored > browser > English.
 * @param {string} [explicit] - forced language (e.g. tracker settings)
 * @returns {string} supported language code
 */
export function resolveLanguage(explicit) {
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
export function t(lang, key, vars) {
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
export function languageName(code) {
    return NATIVE_NAMES[code] || code;
}

export default { DEFAULT_LANGUAGE, SUPPORTED_LANGUAGES, resolveLanguage, t };
