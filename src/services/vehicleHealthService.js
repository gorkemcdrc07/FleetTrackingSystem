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
        lng <= 180;

    return {
        valid,
        latitude: valid ? lat : null,
        longitude: valid ? lng : null,
    };
}

function getLatestGeofenceEvent(plate) {
    try {
        const raw = localStorage.getItem(
            "fts_geofence_events"
        );

        const events = raw
            ? JSON.parse(raw)
            : [];

        if (!Array.isArray(events)) {
            return null;
        }

        const normalized =
            normalizePlate(plate);

        return (
            events
                .filter(
                    (event) =>
                        normalizePlate(
                            event?.plate
                        ) === normalized
                )
                .sort((a, b) => {
                    const aTime = new Date(
                        a?.createdAt ||
                        a?.date ||
                        0
                    ).getTime();

                    const bTime = new Date(
                        b?.createdAt ||
                        b?.date ||
                        0
                    ).getTime();

                    return bTime - aTime;
                })[0] || null
        );
    } catch {
        return null;
    }
}

function getStatus(score) {
    if (score >= 85) {
        return {
            key: "good",
            label: "İyi",
        };
    }

    if (score >= 65) {
        return {
            key: "warning",
            label: "Dikkat",
        };
    }

    return {
        key: "critical",
        label: "Kritik",
    };
}

export function calculateVehicleHealth(
    vehicle,
    notifications = []
) {
    let score = 100;

    const reasons = [];

    const speed = getSpeed(vehicle);
    const ignition = getIgnition(vehicle);
    const coordinates = getCoordinates(vehicle);
    const lastDate = getLastDate(vehicle);

    if (!coordinates.valid) {
        score -= 30;

        reasons.push({
            type: "gps",
            level: "critical",
            label: "GPS konumu alınamıyor",
            penalty: 30,
        });
    } else {
        reasons.push({
            type: "gps",
            level: "success",
            label: "GPS konumu geçerli",
            penalty: 0,
        });
    }

    if (!lastDate) {
        score -= 25;

        reasons.push({
            type: "oldData",
            level: "critical",
            label: "Son veri zamanı bilinmiyor",
            penalty: 25,
        });
    } else {
        const diffMinutes = Math.floor(
            (Date.now() -
                lastDate.getTime()) /
            60000
        );

        if (diffMinutes > 60) {
            score -= 25;

            reasons.push({
                type: "oldData",
                level: "critical",
                label: `Veri ${Math.floor(
                    diffMinutes / 60
                )} saat eski`,
                penalty: 25,
            });
        } else if (diffMinutes > 15) {
            score -= 10;

            reasons.push({
                type: "oldData",
                level: "warning",
                label: `Veri ${diffMinutes} dakika eski`,
                penalty: 10,
            });
        } else {
            reasons.push({
                type: "oldData",
                level: "success",
                label: "Veri güncel",
                penalty: 0,
            });
        }
    }

    const speedAlarm = notifications.some(
        (item) => item.type === "speed"
    );

    if (speedAlarm) {
        score -= 20;

        reasons.push({
            type: "speed",
            level: "critical",
            label: "Aktif hız ihlali var",
            penalty: 20,
        });
    }

    const idleAlarm = notifications.some(
        (item) => item.type === "idle"
    );

    if (idleAlarm) {
        score -= 10;

        reasons.push({
            type: "idle",
            level: "warning",
            label: "Aktif rölanti uyarısı var",
            penalty: 10,
        });
    }

    if (
        ignition &&
        speed === 0 &&
        !idleAlarm
    ) {
        score -= 5;

        reasons.push({
            type: "idle",
            level: "warning",
            label: "Kontak açık, araç hareket etmiyor",
            penalty: 5,
        });
    }

    const plate =
        vehicle?.plate ||
        vehicle?.licensePlate ||
        vehicle?.plateNo ||
        "-";

    const geofenceEvent =
        getLatestGeofenceEvent(plate);

    if (
        geofenceEvent &&
        geofenceEvent.status !== "inside"
    ) {
        score -= 10;

        reasons.push({
            type: "geofence",
            level: "warning",
            label: `${geofenceEvent.geofenceName ||
                "Tanımlı alan"
                } dışında`,
            penalty: 10,
        });
    } else if (geofenceEvent) {
        reasons.push({
            type: "geofence",
            level: "success",
            label: `${geofenceEvent.geofenceName ||
                "Tanımlı alan"
                } içinde`,
            penalty: 0,
        });
    }

    const finalScore = Math.max(
        0,
        Math.min(100, score)
    );

    return {
        score: finalScore,
        status: getStatus(finalScore),
        reasons,
        lastDate,
        coordinates,
    };
}