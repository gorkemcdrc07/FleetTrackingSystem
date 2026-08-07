const SESSION_USER_KEY = "fts_user";
const REMEMBERED_USERNAME_KEY = "fts_kullanici";
const AUTHENTICATED_KEY = "fts_logged_in";
const LEGACY_USER_KEYS = ["kullanici", "aktifKullanici", "user"];

function getStorage(storage) {
    return storage || globalThis.localStorage;
}

function parseStoredUser(value) {
    if (!value) return null;
    try {
        const parsed = JSON.parse(value);
        return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
        return null;
    }
}

export function getCurrentUser(storage) {
    const target = getStorage(storage);
    for (const key of [SESSION_USER_KEY, ...LEGACY_USER_KEYS]) {
        const user = parseStoredUser(target.getItem(key));
        if (user) return user;
    }
    return null;
}

export function getRememberedUsername(storage) {
    return getStorage(storage).getItem(REMEMBERED_USERNAME_KEY) || "";
}

export function isAuthenticated(storage) {
    return getStorage(storage).getItem(AUTHENTICATED_KEY) === "true";
}

export function saveSession({ username, user, remember }, storage) {
    const target = getStorage(storage);
    if (remember) target.setItem(REMEMBERED_USERNAME_KEY, username);
    else target.removeItem(REMEMBERED_USERNAME_KEY);
    target.setItem(SESSION_USER_KEY, JSON.stringify(user));
    target.setItem(AUTHENTICATED_KEY, "true");
}

export function clearSession(storage) {
    const target = getStorage(storage);
    target.removeItem(AUTHENTICATED_KEY);
    target.removeItem(SESSION_USER_KEY);
    for (const key of LEGACY_USER_KEYS) target.removeItem(key);
}
