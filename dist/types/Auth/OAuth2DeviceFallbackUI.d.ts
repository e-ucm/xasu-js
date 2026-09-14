/**
 * Switches the UI language and re-renders the current state.
 * Persists the choice for future logins.
 * @param {string} lang - language code (en, es, fr)
 */
export function setLanguage(lang: string): any;
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
export function showBlockingAuthUI(options?: {
    language?: string;
}): {
    update: (info: object) => void;
    showError: (message: string) => void;
    dismiss: () => void;
    setLanguage: (lang: string) => void;
};
/**
 * Legacy alias: renders/updates the blocking device UI in place.
 * Kept for backwards compatibility; hosts must not provide their own UI.
 * @param {object} info - device authorization info
 * @returns {{ update: Function, showError: Function, dismiss: () => void, setLanguage: Function }}
 */
export function showDeviceFallbackUI(info: object): {
    update: Function;
    showError: Function;
    dismiss: () => void;
    setLanguage: Function;
};
declare namespace _default {
    export { showBlockingAuthUI };
    export { showDeviceFallbackUI };
    export { setLanguage };
}
export default _default;
