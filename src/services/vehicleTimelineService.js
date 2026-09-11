// JavaScript source code
const GEOFENCE_EVENT_KEY = "fts_geofence_events";

function normalizePlate(value) {
    return String(value || "")
        .replace(/\s/g, "")
        .toUpperCase();
}

function getPlate(vehicle) {
    return (
        vehicle?.plate ||
        vehicle?.licensePlate ||
        vehicle?.plateNo ||
        "-"
    );
}

function toValidDate(value) {
    if (!value) return null;

    const date = value instanceof Date
        ? value
        : new Date(value);

    return Number.isNaN(date.getTime())
        ? null
        : date;
}

function getVehicleDate(vehicle) {
    return toValidDate(
        vehicle?.gpsDate ||
        vehicle?.activityDate ||
        vehicle?.dataTime ||
        vehicle?.lastDataTime ||
        vehicle?.date
    );
}

function getSpeed(vehicle) {
    const value = Number(
        vehicle?.speed ??
        vehicle?.velocity ??
        0
    );

    return Number.isFinite(value)
        ? value
        : 0;
}

function getIgnition(vehicle) {
    return Boolean(
        vehicle?.ignition ??
        vehicle?.engine ??
        vehicle?.contact ??
        false
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

    const lat = Number(latitude);
    const lng = Number(longitude);

    const valid =
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        !(lat === 0 && lng === 0);

    return {
        lat: valid ? lat : null,
        lng: valid ? lng : null,
        valid,
    };
}

function readGeofenceEvents() {
    try {
        const raw = localStorage.getItem(
            GEOFENCE_EVENT_KEY
        );

        const parsed = raw
            ? JSON.parse(raw)
            : [];

        return Array.isArray(parsed)
            ? parsed
            : [];
    } catch {
        return [];
    }
}

function createEvent({
    id,
    type,
    category,
    level,
    title,
    message,
    plate,
    createdAt,
    source,
    metadata = {},
}) {
    const date = toValidDate(createdAt);

    return {
        id:
            id ||
            `timeline-${type}-${plate}-${date?.getTime() || Date.now()}-${Math.random()
                .toString(16)
                .slice(2)}`,

        type: type || "system",
        category: category || "system",
        level: level || "info",

        title: title || "Sistem olayı",
        message: message || "",

        plate: plate || "-",

        createdAt:
            date?.toISOString() ||
            new Date().toISOString(),

        source: source || "system",
        metadata,
    };
}

function getTimelineTimestamp(item) {
    const date = toValidDate(
        item?.createdAt ||
        item?.time ||
        item?.date
    );

    return date
        ? date.getTime()
        : 0;
}

function removeDuplicates(events = []) {
    const seen = new Set();

    return events.filter((event) => {
        const key = [
            event.source,
            event.type,
            normalizePlate(event.plate),
            event.metadata?.sourceId ||
            event.metadata?.ref ||
            getTimelineTimestamp(event),
        ].join("-");

        if (seen.has(key)) {
            return false;
        }

        seen.add(key);
        return true;
    });
}

function getVehicleStatusEvent(vehicle) {
    if (!vehicle) return [];

    const plate = getPlate(vehicle);
    const speed = getSpeed(vehicle);
    const ignition = getIgnition(vehicle);
    const date =
        getVehicleDate(vehicle) ||
        new Date();

    const events = [];

    if (speed > 0) {
        events.push(
            createEvent({
                type: "moving",
                category: "movement",
                level: "info",
                title: "Araç hareket halinde",
                message: `${speed} km/h hızla ilerliyor.`,
                plate,
                createdAt: date,
                source: "vehicle",
                metadata: {
                    speed,
                    address: getAddress(vehicle),
                },
            })
        );
    } else if (ignition) {
        events.push(
            createEvent({
                type: "idle",
                category: "movement",
                level: "warning",
                title: "Araç rölantide",
                message:
                    "Kontak açık fakat araç hareket etmiyor.",
                plate,
                createdAt: date,
                source: "vehicle",
                metadata: {
                    speed,
                    address: getAddress(vehicle),
                },
            })
        );
    } else {
        events.push(
            createEvent({
                type: "park",
                category: "movement",
                level: "neutral",
                title: "Araç park halinde",
                message: getAddress(vehicle),
                plate,
                createdAt: date,
                source: "vehicle",
                metadata: {
                    speed,
                    address: getAddress(vehicle),
                },
            })
        );
    }

    const coordinates = getCoordinates(vehicle);

    if (!coordinates.valid) {
        events.push(
            createEvent({
                type: "gps",
                category: "gps",
                level: "danger",
                title: "GPS verisi alınamıyor",
                message:
                    "Araçtan geçerli koordinat bilgisi alınamadı.",
                plate,
                createdAt: date,
                source: "vehicle",
            })
        );
    }

    return events;
}

function mapNotifications(
    notifications = [],
    plate
) {
    const normalizedPlate =
        normalizePlate(plate);

    return notifications
        .filter(
            (item) =>
                normalizePlate(item?.plate) ===
                normalizedPlate
        )
        .map((item) =>
            createEvent({
                id: `notification-${item.id}`,
                type:
                    item.type ||
                    "notification",

                category:
                    item.type === "gps"
                        ? "gps"
                        : item.type === "geofence"
                            ? "geofence"
                            : "alarm",

                level:
                    item.level ||
                    "warning",

                title:
                    item.title ||
                    "Araç bildirimi",

                message:
                    item.message ||
                    "",

                plate:
                    item.plate ||
                    plate,

                createdAt:
                    item.createdAt ||
                    new Date(),

                source: "notification",

                metadata: {
                    sourceId: item.id,
                    ref: item.ref,
                    ...item.metadata,
                },
            })
        );
}

function mapOperationEvents(
    operationEvents = [],
    plate
) {
    const normalizedPlate =
        normalizePlate(plate);

    return operationEvents
        .filter(
            (item) =>
                normalizePlate(item?.plate) ===
                normalizedPlate
        )
        .map((item) =>
            createEvent({
                id: `operation-${item.id}`,

                type:
                    item.type ||
                    "operation",

                category:
                    item.type === "gps"
                        ? "gps"
                        : String(
                            item.type || ""
                        ).startsWith(
                            "geofence"
                        )
                            ? "geofence"
                            : item.type === "moving" ||
                                item.type === "idle" ||
                                item.type === "park"
                                ? "movement"
                                : "system",

                level:
                    item.level ||
                    "info",

                title:
                    item.title ||
                    "Operasyon olayı",

                message:
                    item.message ||
                    item.text ||
                    "",

                plate:
                    item.plate ||
                    plate,

                createdAt:
                    item.createdAt ||
                    item.time ||
                    new Date(),

                source: "operation",

                metadata: {
                    sourceId: item.id,
                    ref: item.ref,
                    ...item.metadata,
                },
            })
        );
}

function mapGeofenceEvents(
    geofenceEvents = [],
    plate
) {
    const normalizedPlate =
        normalizePlate(plate);

    return geofenceEvents
        .filter(
            (event) =>
                normalizePlate(event?.plate) ===
                normalizedPlate
        )
        .map((event) => {
            const inside =
                event.status === "inside";

            return createEvent({
                id:
                    event.id
                        ? `geofence-${event.id}`
                        : undefined,

                type: inside
                    ? "geofence-in"
                    : "geofence-out",

                category: "geofence",

                level: inside
                    ? "success"
                    : "danger",

                title: inside
                    ? "Geofence alanına giriş"
                    : "Geofence alanından çıkış",

                message:
                    event.geofenceName ||
                    "Tanımlı geofence alanı",

                plate:
                    event.plate ||
                    plate,

                createdAt:
                    event.createdAt ||
                    event.date ||
                    new Date(),

                source: "geofence",

                metadata: {
                    sourceId: event.id,
                    geofenceId:
                        event.geofenceId,
                    geofenceName:
                        event.geofenceName,
                    status:
                        event.status,
                },
            });
        });
}

export function buildVehicleTimeline({
    vehicle,
    notifications = [],
    operationEvents = [],
    geofenceEvents,
    maxItems = 150,
}) {
    if (!vehicle) {
        return [];
    }

    const plate = getPlate(vehicle);

    const finalGeofenceEvents =
        Array.isArray(geofenceEvents)
            ? geofenceEvents
            : readGeofenceEvents();

    const events = [
        ...getVehicleStatusEvent(vehicle),

        ...mapNotifications(
            notifications,
            plate
        ),

        ...mapOperationEvents(
            operationEvents,
            plate
        ),

        ...mapGeofenceEvents(
            finalGeofenceEvents,
            plate
        ),
    ];

    return removeDuplicates(events)
        .sort(
            (a, b) =>
                getTimelineTimestamp(b) -
                getTimelineTimestamp(a)
        )
        .slice(0, maxItems);
}

export function getVehicleTimelineSummary(
    events = []
) {
    return {
        total: events.length,

        alarm: events.filter(
            (item) =>
                item.category === "alarm"
        ).length,

        movement: events.filter(
            (item) =>
                item.category === "movement"
        ).length,

        gps: events.filter(
            (item) =>
                item.category === "gps"
        ).length,

        geofence: events.filter(
            (item) =>
                item.category === "geofence"
        ).length,

        critical: events.filter(
            (item) =>
                item.level === "critical" ||
                item.level === "danger"
        ).length,
    };
}