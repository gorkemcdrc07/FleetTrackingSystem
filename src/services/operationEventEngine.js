const STORAGE_KEY = "fts_operation_events";
const EVENT_NAME = "fts_operation_events_updated";

const MAX_EVENTS = 300;
const RETENTION_DAYS = 7;

function createId(prefix = "ope") {
    return `${prefix}-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;
}

function normalizePlate(value) {
    return String(value || "")
        .replace(/\s/g, "")
        .toUpperCase();
}

function readJson(key, fallback = []) {
    try {
        const raw = localStorage.getItem(key);
        const parsed = raw ? JSON.parse(raw) : fallback;

        return Array.isArray(parsed) ? parsed : fallback;
    } catch {
        return fallback;
    }
}

function getTimestamp(item) {
    const value =
        item?.createdAt ||
        item?.time ||
        item?.date ||
        0;

    const date = new Date(value);
    const timestamp = date.getTime();

    return Number.isNaN(timestamp) ? 0 : timestamp;
}

function cleanupEvents(events = []) {
    const minimumTime =
        Date.now() -
        RETENTION_DAYS * 24 * 60 * 60 * 1000;

    return events
        .filter(
            (item) =>
                getTimestamp(item) >= minimumTime
        )
        .sort(
            (a, b) =>
                getTimestamp(b) -
                getTimestamp(a)
        )
        .slice(0, MAX_EVENTS);
}

function writeEvents(events) {
    const next = cleanupEvents(events);

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
    );

    window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
            detail: next,
        })
    );

    return next;
}

function buildEvent(data) {
    return {
        id: createId(),
        read: false,
        createdAt: new Date().toISOString(),
        ...data,
    };
}

function isDuplicate(current, event) {
    return current.some((item) => {
        if (item.ref && event.ref) {
            return item.ref === event.ref;
        }

        return (
            item.type === event.type &&
            normalizePlate(item.plate) ===
            normalizePlate(event.plate) &&
            Math.abs(
                getTimestamp(item) -
                getTimestamp(event)
            ) <
            60 * 1000
        );
    });
}

function getPlate(vehicle) {
    return (
        vehicle?.plate ||
        vehicle?.licensePlate ||
        vehicle?.plateNo ||
        "-"
    );
}

function getSpeed(vehicle) {
    const value = Number(
        vehicle?.speed ??
        vehicle?.velocity ??
        0
    );

    return Number.isFinite(value) ? value : 0;
}

function getIgnition(vehicle) {
    return Boolean(
        vehicle?.ignition ??
        vehicle?.engine ??
        vehicle?.contact ??
        false
    );
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

    return Number.isNaN(date.getTime())
        ? null
        : date;
}

function hasGps(vehicle) {
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

    const lat = Number(latitude);
    const lng = Number(longitude);

    return (
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180
    );
}

function getAddress(vehicle) {
    return (
        vehicle?.address ||
        vehicle?.location ||
        vehicle?.city ||
        vehicle?.lastAddress ||
        "Adres bilgisi yok"
    );
}

export const operationEventEngine = {
    eventName: EVENT_NAME,

    getAll() {
        return cleanupEvents(
            readJson(STORAGE_KEY, [])
        );
    },

    getUnreadCount() {
        return this.getAll().filter(
            (item) => !item.read
        ).length;
    },

    getByPlate(plate, limit = 30) {
        const normalized = normalizePlate(plate);

        return this.getAll()
            .filter(
                (item) =>
                    normalizePlate(item.plate) ===
                    normalized
            )
            .slice(0, limit);
    },

    addMany(items = []) {
        if (!Array.isArray(items)) {
            return this.getAll();
        }

        const current = this.getAll();
        const accepted = [];

        items.forEach((item) => {
            const event = item?.id
                ? item
                : buildEvent(item);

            const compareList = [
                ...accepted,
                ...current,
            ];

            if (!isDuplicate(compareList, event)) {
                accepted.push(event);
            }
        });

        if (accepted.length === 0) {
            return current;
        }

        return writeEvents([
            ...accepted,
            ...current,
        ]);
    },

    markRead(id) {
        return writeEvents(
            this.getAll().map((item) =>
                item.id === id
                    ? {
                        ...item,
                        read: true,
                    }
                    : item
            )
        );
    },

    markUnread(id) {
        return writeEvents(
            this.getAll().map((item) =>
                item.id === id
                    ? {
                        ...item,
                        read: false,
                    }
                    : item
            )
        );
    },

    markAllRead() {
        return writeEvents(
            this.getAll().map((item) => ({
                ...item,
                read: true,
            }))
        );
    },

    remove(id) {
        return writeEvents(
            this.getAll().filter(
                (item) => item.id !== id
            )
        );
    },

    clear() {
        return writeEvents([]);
    },

    processVehicles(vehicles = []) {
        const events = [];

        vehicles.forEach((vehicle) => {
            const plate = getPlate(vehicle);
            const speed = getSpeed(vehicle);
            const ignition = getIgnition(vehicle);
            const lastDate = getLastDate(vehicle);

            if (speed > 0) {
                events.push({
                    type: "moving",
                    level: "info",
                    plate,
                    title: "Araç hareket halinde",
                    message: `${speed} km/h hızla ilerliyor.`,
                    createdAt:
                        lastDate?.toISOString() ||
                        new Date().toISOString(),
                    ref: `moving-${normalizePlate(
                        plate
                    )}-${Math.floor(Date.now() / 300000)}`,
                    metadata: {
                        speed,
                        address: getAddress(vehicle),
                    },
                });
            }

            if (ignition && speed === 0) {
                events.push({
                    type: "idle",
                    level: "warning",
                    plate,
                    title: "Araç rölantide",
                    message:
                        "Kontak açık fakat araç hareket etmiyor.",
                    createdAt:
                        lastDate?.toISOString() ||
                        new Date().toISOString(),
                    ref: `idle-${normalizePlate(
                        plate
                    )}-${Math.floor(Date.now() / 300000)}`,
                });
            }

            if (!ignition && speed === 0) {
                events.push({
                    type: "park",
                    level: "neutral",
                    plate,
                    title: "Araç park halinde",
                    message: getAddress(vehicle),
                    createdAt:
                        lastDate?.toISOString() ||
                        new Date().toISOString(),
                    ref: `park-${normalizePlate(
                        plate
                    )}-${Math.floor(Date.now() / 900000)}`,
                });
            }

            if (!hasGps(vehicle)) {
                events.push({
                    type: "gps",
                    level: "danger",
                    plate,
                    title: "GPS verisi yok",
                    message:
                        "Araçtan geçerli koordinat alınamıyor.",
                    createdAt:
                        lastDate?.toISOString() ||
                        new Date().toISOString(),
                    ref: `gps-${normalizePlate(plate)}`,
                });
            }
        });

        return this.addMany(events);
    },

    processNotifications(notifications = []) {
        const events = notifications.map(
            (notification) => ({
                type:
                    notification.type ||
                    "notification",
                level:
                    notification.level ||
                    "info",
                plate:
                    notification.plate || "-",
                title:
                    notification.title ||
                    "Bildirim",
                message:
                    notification.message || "",
                createdAt:
                    notification.createdAt ||
                    new Date().toISOString(),
                ref: `notification-${notification.id ||
                    notification.ref ||
                    createId()
                    }`,
                sourceId: notification.id,
            })
        );

        return this.addMany(events);
    },

    processGeofenceEvents(events = []) {
        const operationEvents = events.map(
            (event) => ({
                type:
                    event.status === "inside"
                        ? "geofence-in"
                        : "geofence-out",
                level:
                    event.status === "inside"
                        ? "success"
                        : "danger",
                plate: event.plate || "-",
                title:
                    event.status === "inside"
                        ? "Geofence içine girdi"
                        : "Geofence dışına çıktı",
                message:
                    event.geofenceName ||
                    "Geofence alanı",
                createdAt:
                    event.createdAt ||
                    event.date ||
                    new Date().toISOString(),
                ref: `geofence-${event.id ||
                    [
                        event.plate,
                        event.geofenceId,
                        event.status,
                        event.createdAt,
                    ].join("-")
                    }`,
            })
        );

        return this.addMany(operationEvents);
    },
};