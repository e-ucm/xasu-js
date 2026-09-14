/**
 * Normalizes a language tag to a supported language code.
 * @param {string} tag - e.g. "es-ES", "FR", "en"
 * @returns {string|null} supported code or null
 */
export function normalizeLanguage(tag: string): string | null;
/**
 * Reads the language from the page URL (?lang=, ?locale= or ?lng=).
 * @returns {string|null} supported code or null
 */
export function getUrlLanguage(): string | null;
/**
 * @returns {string|null} language stored from a previous visit
 */
export function getStoredLanguage(): string | null;
/**
 * @param {string} lang - supported language code
 */
export function setStoredLanguage(lang: string): void;
/**
 * @returns {string|null} browser language if supported
 */
export function getBrowserLanguage(): string | null;
/**
 * Resolves the UI language. Priority: explicit > URL > stored > browser > English.
 * @param {string} [explicit] - forced language (e.g. tracker settings)
 * @returns {string} supported language code
 */
export function resolveLanguage(explicit?: string): string;
/**
 * Translates a key, falling back to English and then the key itself.
 * Supports {placeholders} via vars.
 * @param {string} lang - language code
 * @param {string} key - string key
 * @param {Object} [vars] - placeholder values
 * @returns {string}
 */
export function t(lang: string, key: string, vars?: any): string;
/**
 * @param {string} code - supported language code
 * @returns {string} native display name
 */
export function languageName(code: string): string;
export const DEFAULT_LANGUAGE: "en";
export const SUPPORTED_LANGUAGES: string[];
export const LANGUAGE_STORAGE_KEY: "xapi-device-lang";
declare namespace _default {
    export { DEFAULT_LANGUAGE };
    export { SUPPORTED_LANGUAGES };
    export { resolveLanguage };
    export { t };
}
export default _default;
