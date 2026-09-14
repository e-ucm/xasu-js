/**
 * Shows the blocking auth UI immediately (loading state).
 * The game stays non-clickable until dismiss() is called after a token.
 * @returns {{ update: (info: object) => void, showError: (message: string) => void, dismiss: () => void }}
 */
export function showBlockingAuthUI(): {
    update: (info: object) => void;
    showError: (message: string) => void;
    dismiss: () => void;
};
/**
 * Legacy alias: renders/updates the blocking device UI in place.
 * Kept for backwards compatibility; hosts must not provide their own UI.
 * @param {object} info - device authorization info
 * @returns {{ update: Function, showError: Function, dismiss: () => void }}
 */
export function showDeviceFallbackUI(info: object): {
    update: Function;
    showError: Function;
    dismiss: () => void;
};
declare namespace _default {
    export { showBlockingAuthUI };
    export { showDeviceFallbackUI };
}
export default _default;
