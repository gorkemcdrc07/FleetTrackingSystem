export const STORAGE_KEYS = Object.freeze({
    alarmSettings: "fts_alarm_settings",
    focusPlate: "fts_focus_plate",
    geofences: "fts_geofences",
    geofenceEvents: "fts_geofence_events",
    notifications: "fts_notifications",
    notificationSettings: "fts_notification_settings",
    operationEvents: "fts_operation_events",
    playbackVehicle: "fts_playback_vehicle",
});

function resolveStorage(storage) {
    return storage || globalThis.localStorage;
}

export function readStorageJson(key, fallback, storage) {
    try {
        const raw = resolveStorage(storage)?.getItem(key);
        return raw == null ? fallback : JSON.parse(raw);
    } catch {
        return fallback;
    }
}

export function writeStorageJson(key, value, storage) {
    try {
        resolveStorage(storage)?.setItem(key, JSON.stringify(value));
        return true;
    } catch {
        return false;
    }
}

export function readStorageText(key, fallback = "", storage) {
    try {
        return resolveStorage(storage)?.getItem(key) ?? fallback;
    } catch {
        return fallback;
    }
}

export function writeStorageText(key, value, storage) {
    try {
        resolveStorage(storage)?.setItem(key, String(value));
        return true;
    } catch {
        return false;
    }
}

export function removeStorageItem(key, storage) {
    try {
        resolveStorage(storage)?.removeItem(key);
        return true;
    } catch {
        return false;
    }
}

export function readStorageArray(key, storage) {
    const value = readStorageJson(key, [], storage);
    return Array.isArray(value) ? value : [];
}

