const NOTIFICATION_KEY = "fts_notifications";
const GEOFENCE_EVENT_KEY = "fts_geofence_events";
const SETTINGS_KEY = "fts_notification_settings";
const NOTIFICATION_EVENT = "fts_notifications_updated";
const TOAST_EVENT = "fts_notification_toast";

const MAX_NOTIFICATIONS = 200;
const DEFAULT_RETENTION_DAYS = 30;

const DEFAULT_SETTINGS = {
    speedLimit: 90,
    oldDataMinutes: 60,

    idleEnabled: true,
    gpsEnabled: true,
    geofenceEnabled: true,

    toastEnabled: true,
    soundEnabled: false,
    desktopEnabled: false,

    retentionDays: DEFAULT_RETENTION_DAYS,
    duplicateCooldownMinutes: 30,
};

function createId(prefix = "ntf") {
    return `${prefix}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;
}

function readJson(key, fallback = []) {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : fallback;

        if (Array.isArray(fallback)) {
            return Array.isArray(parsed) ? parsed : fallback;
        }

        return parsed && typeof parsed === "object"
            ? parsed
            : fallback;
    } catch {
        return fallback;
    }
}

function dispatchNotifications(list) {
    window.dispatchEvent(
        new CustomEvent(NOTIFICATION_EVENT, {
            detail: list,
        })
    );
}

function dispatchToast(items) {
    if (!Array.isArray(items) || items.length === 0) return;

    window.dispatchEvent(
        new CustomEvent(TOAST_EVENT, {
            detail: items,
        })
    );
}

function writeNotifications(value) {
    localStorage.setItem(
        NOTIFICATION_KEY,
        JSON.stringify(value)
    );

    dispatchNotifications(value);
}

function getSettings(overrides = {}) {
    const savedSettings = readJson(SETTINGS_KEY, {});

    return {
        ...DEFAULT_SETTINGS,
        ...savedSettings,
        ...overrides,
    };
}

function normalizePlate(value) {
    return String(value || "")
        .replace(/\s/g, "")
        .toUpperCase();
}

function getSpeed(vehicle) {
    const value = Number(
        vehicle?.speed ??
        vehicle?.velocity ??
        0
    );

    return Number.isFinite(value) ? value : 0;
}

function getPlate(vehicle) {
    return (
        vehicle?.plate ||
        vehicle?.licensePlate ||
        vehicle?.plateNo ||
        "-"
    );
}

function getIgnition(vehicle) {
    return Boolean(
        vehicle?.ignition ??
        vehicle?.engine ??
        vehicle?.contact ??
        false
    );
}

function getCoordinates(vehicle) {
    const latitude =
        vehicle?.latitude ??
        vehicle?.lat ??
        vehicle?.y ??
        null;

    const longitude =
        vehicle?.longitude ??
        vehicle?.lng ??
        vehicle?.lon ??
        vehicle?.x ??
        null;

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    const valid =
        Number.isFinite(parsedLatitude) &&
        Number.isFinite(parsedLongitude) &&
        parsedLatitude >= -90 &&
        parsedLatitude <= 90 &&
        parsedLongitude >= -180 &&
        parsedLongitude <= 180;

    return {
        latitude: valid ? parsedLatitude : null,
        longitude: valid ? parsedLongitude : null,
        valid,
    };
}

function getLastDate(vehicle) {
    const value =
        vehicle?.gpsDate ||
        vehicle?.activityDate ||
        vehicle?.dataTime ||
        vehicle?.lastDataTime ||
        vehicle?.date;

    if (!value) return null;

    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date;
}

function buildNotification(data) {
    return {
        id: createId(),
        read: false,
        createdAt: new Date().toISOString(),
        ...data,
    };
}

function getNotificationTimestamp(item) {
    const date = new Date(item?.createdAt || 0);
    const timestamp = date.getTime();

    return Number.isNaN(timestamp) ? 0 : timestamp;
}

function isDuplicate(current, notification, settings) {
    const cooldownMinutes = Number(
        settings.duplicateCooldownMinutes || 30
    );

    const cooldownMilliseconds =
        cooldownMinutes * 60 * 1000;

    const now = Date.now();

    return current.some((item) => {
        const sameNotification =
            item.type === notification.type &&
            normalizePlate(item.plate) ===
            normalizePlate(notification.plate) &&
            item.ref === notification.ref;

        if (!sameNotification) return false;

        return (
            now - getNotificationTimestamp(item) <
            cooldownMilliseconds
        );
    });
}

function removeExpiredNotifications(list, settings) {
    const retentionDays = Number(
        settings.retentionDays ||
        DEFAULT_RETENTION_DAYS
    );

    if (!Number.isFinite(retentionDays)) {
        return list;
    }

    if (retentionDays <= 0) {
        return list;
    }

    const minimumDate =
        Date.now() - retentionDays * 24 * 60 * 60 * 1000;

    return list.filter(
        (item) =>
            getNotificationTimestamp(item) >= minimumDate
    );
}

function getGeofenceEventKey(event) {
    return (
        event?.id ||
        event?.eventId ||
        [
            normalizePlate(event?.plate),
            event?.geofenceId || event?.geofenceName || "-",
            event?.status || "-",
            event?.createdAt || event?.date || "-",
        ].join("-")
    );
}

function sendDesktopNotification(item, settings) {
    if (!settings.desktopEnabled) return;
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;

    try {
        const notification = new Notification(
            item.title || "FTS Bildirimi",
            {
                body: `${item.plate || "-"} · ${item.message || ""
                    }`,
                tag: item.ref || item.id,
                renotify: false,
            }
        );

        notification.onclick = () => {
            window.focus();

            window.dispatchEvent(
                new CustomEvent(
                    "fts_notification_vehicle_open",
                    {
                        detail: {
                            plate: item.plate,
                            notificationId: item.id,
                        },
                    }
                )
            );

            notification.close();
        };
    } catch (error) {
        console.error(
            "Masaüstü bildirimi gösterilemedi:",
            error
        );
    }
}

function playNotificationSound(settings) {
    if (!settings.soundEnabled) return;

    try {
        const AudioContextClass =
            window.AudioContext ||
            window.webkitAudioContext;

        if (!AudioContextClass) return;

        const context = new AudioContextClass();
        const oscillator = context.createOscillator();
        const gain = context.createGain();

        oscillator.type = "sine";
        oscillator.frequency.value = 880;

        gain.gain.setValueAtTime(
            0.0001,
            context.currentTime
        );

        gain.gain.exponentialRampToValueAtTime(
            0.12,
            context.currentTime + 0.02
        );

        gain.gain.exponentialRampToValueAtTime(
            0.0001,
            context.currentTime + 0.35
        );

        oscillator.connect(gain);
        gain.connect(context.destination);

        oscillator.start();
        oscillator.stop(context.currentTime + 0.38);

        oscillator.addEventListener("ended", () => {
            context.close();
        });
    } catch (error) {
        console.error(
            "Bildirim sesi çalınamadı:",
            error
        );
    }
}

export const notificationEngine = {
    eventName: NOTIFICATION_EVENT,
    toastEventName: TOAST_EVENT,

    getAll() {
        const settings = getSettings();

        const list = removeExpiredNotifications(
            readJson(NOTIFICATION_KEY, []),
            settings
        )
            .sort(
                (a, b) =>
                    getNotificationTimestamp(b) -
                    getNotificationTimestamp(a)
            )
            .slice(0, MAX_NOTIFICATIONS);

        return list;
    },

    getUnreadCount() {
        return this.getAll().filter(
            (item) => !item.read
        ).length;
    },

    getByPlate(plate, limit = 5) {
        const normalizedPlate = normalizePlate(plate);

        return this.getAll()
            .filter(
                (item) =>
                    normalizePlate(item.plate) ===
                    normalizedPlate
            )
            .slice(0, limit);
    },

    getByType(type, limit = 50) {
        return this.getAll()
            .filter((item) => item.type === type)
            .slice(0, limit);
    },

    getSettings() {
        return getSettings();
    },

    saveSettings(settings = {}) {
        const next = getSettings(settings);

        localStorage.setItem(
            SETTINGS_KEY,
            JSON.stringify(next)
        );

        dispatchNotifications(this.getAll());

        return next;
    },

    async requestDesktopPermission() {
        if (!("Notification" in window)) {
            return "unsupported";
        }

        try {
            return await Notification.requestPermission();
        } catch {
            return Notification.permission;
        }
    },

    markAllRead() {
        const list = this.getAll().map((item) => ({
            ...item,
            read: true,
        }));

        writeNotifications(list);

        return list;
    },

    markRead(id) {
        const list = this.getAll().map((item) =>
            item.id === id
                ? {
                    ...item,
                    read: true,
                }
                : item
        );

        writeNotifications(list);

        return list;
    },

    markUnread(id) {
        const list = this.getAll().map((item) =>
            item.id === id
                ? {
                    ...item,
                    read: false,
                }
                : item
        );

        writeNotifications(list);

        return list;
    },

    remove(id) {
        const list = this.getAll().filter(
            (item) => item.id !== id
        );

        writeNotifications(list);

        return list;
    },

    removeRead() {
        const list = this.getAll().filter(
            (item) => !item.read
        );

        writeNotifications(list);

        return list;
    },

    clear() {
        writeNotifications([]);
        return [];
    },

    cleanup() {
        const settings = getSettings();

        const list = removeExpiredNotifications(
            this.getAll(),
            settings
        );

        writeNotifications(list);

        return list;
    },

    addMany(items = []) {
        if (!Array.isArray(items) || items.length === 0) {
            return this.getAll();
        }

        const settings = getSettings();
        const current = this.getAll();

        const accepted = [];

        items.forEach((item) => {
            const notification = item?.id
                ? item
                : buildNotification(item);

            const compareList = [
                ...accepted,
                ...current,
            ];

            if (
                !isDuplicate(
                    compareList,
                    notification,
                    settings
                )
            ) {
                accepted.push(notification);
            }
        });

        if (accepted.length === 0) {
            return current;
        }

        const next = removeExpiredNotifications(
            [...accepted, ...current],
            settings
        )
            .sort(
                (a, b) =>
                    getNotificationTimestamp(b) -
                    getNotificationTimestamp(a)
            )
            .slice(0, MAX_NOTIFICATIONS);

        writeNotifications(next);

        if (settings.toastEnabled !== false) {
            dispatchToast(accepted);
        }

        playNotificationSound(settings);

        accepted.forEach((item) => {
            sendDesktopNotification(item, settings);
        });

        return next;
    },

    addTest() {
        return this.addMany([
            {
                type: "test",
                level: "critical",
                plate: "34 TEST 34",
                title: "Test Bildirimi",
                message:
                    "Bildirim sistemi başarıyla çalışıyor.",
                ref: `test-${Date.now()}`,
            },
        ]);
    },

    processVehicles(vehicles = [], settings = {}) {
        const finalSettings = getSettings(settings);

        const speedLimit = Number(
            finalSettings.speedLimit || 90
        );

        const oldDataMinutes = Number(
            finalSettings.oldDataMinutes || 60
        );

        const idleEnabled =
            finalSettings.idleEnabled !== false;

        const gpsEnabled =
            finalSettings.gpsEnabled !== false;

        const notifications = [];

        vehicles.forEach((vehicle) => {
            const plate = getPlate(vehicle);
            const speed = getSpeed(vehicle);
            const lastDate = getLastDate(vehicle);
            const ignition = getIgnition(vehicle);
            const coordinates = getCoordinates(vehicle);

            if (speed >= speedLimit) {
                notifications.push({
                    type: "speed",
                    level: "critical",
                    plate,
                    title: "Hız Limiti Aşıldı",
                    message: `${speed} km/h hızla hareket ediyor.`,
                    ref: `speed-${normalizePlate(plate)}`,
                    metadata: {
                        speed,
                        speedLimit,
                    },
                });
            }

            if (
                idleEnabled &&
                ignition &&
                speed === 0
            ) {
                notifications.push({
                    type: "idle",
                    level: "warning",
                    plate,
                    title: "Rölanti Uyarısı",
                    message:
                        "Kontak açık fakat araç hareket etmiyor.",
                    ref: `idle-${normalizePlate(plate)}`,
                });
            }

            if (lastDate) {
                const diffMinutes = Math.floor(
                    (Date.now() - lastDate.getTime()) /
                    60000
                );

                if (diffMinutes > oldDataMinutes) {
                    notifications.push({
                        type: "oldData",
                        level: "danger",
                        plate,
                        title: "Veri Eski",
                        message: `Son veri ${Math.floor(
                            diffMinutes / 60
                        )} saat önce geldi.`,
                        ref: `oldData-${normalizePlate(
                            plate
                        )}`,
                        metadata: {
                            diffMinutes,
                            lastDataTime:
                                lastDate.toISOString(),
                        },
                    });
                }
            }

            if (
                gpsEnabled &&
                !coordinates.valid
            ) {
                notifications.push({
                    type: "gps",
                    level: "danger",
                    plate,
                    title: "GPS Konumu Yok",
                    message:
                        "Araçtan geçerli koordinat bilgisi alınamıyor.",
                    ref: `gps-${normalizePlate(plate)}`,
                });
            }
        });

        return this.addMany(notifications);
    },

    processGeofenceEvents() {
        const settings = getSettings();

        if (settings.geofenceEnabled === false) {
            return this.getAll();
        }

        const events = readJson(
            GEOFENCE_EVENT_KEY,
            []
        );

        const notifications = events.map((event) => {
            const inside =
                event.status === "inside";

            return {
                type: "geofence",
                level: inside
                    ? "warning"
                    : "danger",
                plate: event.plate || "-",
                title: inside
                    ? "Geofence İçinde"
                    : "Geofence Dışında",
                message: `${event.plate || "-"} ${event.geofenceName ||
                    "seçili alan"
                    } ${inside ? "içinde." : "dışında."}`,
                ref: `geofence-${getGeofenceEventKey(
                    event
                )}`,
                metadata: {
                    geofenceId: event.geofenceId,
                    geofenceName:
                        event.geofenceName,
                    status: event.status,
                },
            };
        });

        return this.addMany(notifications);
    },
};