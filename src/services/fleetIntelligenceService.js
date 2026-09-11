const DEFAULT_OPTIONS = {
    speedLimit: 90,
    oldDataMinutes: 60,
    criticalDataMinutes: 180,
    longIdleMinutes: 30,
};

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
        vehicle?.date ||
        null;

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
        lng <= 180 &&
        !(lat === 0 && lng === 0);

    return {
        lat: valid ? lat : null,
        lng: valid ? lng : null,
        valid,
    };
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

function getFleetName(vehicle) {
    return (
        vehicle?.fleetName ||
        vehicle?.fleet ||
        vehicle?.groupName ||
        "Tanımsız Filo"
    );
}

function getStatus(vehicle) {
    const speed = getSpeed(vehicle);

    if (speed > 0) return "moving";
    if (getIgnition(vehicle)) return "idle";

    return "park";
}

function getAgeMinutes(vehicle) {
    const lastDate = getLastDate(vehicle);

    if (!lastDate) return Infinity;

    return Math.max(
        0,
        Math.floor(
            (Date.now() - lastDate.getTime()) /
            60000
        )
    );
}

function getNotificationCount(
    notifications = [],
    plate
) {
    const normalized = normalizePlate(plate);

    return notifications.filter(
        (item) =>
            normalizePlate(item?.plate) ===
            normalized
    ).length;
}

function getCriticalNotificationCount(
    notifications = [],
    plate
) {
    const normalized = normalizePlate(plate);

    return notifications.filter(
        (item) =>
            normalizePlate(item?.plate) ===
            normalized &&
            (item?.level === "critical" ||
                item?.level === "danger")
    ).length;
}

function getVehicleGeofenceStatus(
    geofenceEvents = [],
    plate
) {
    const normalized = normalizePlate(plate);

    const latest =
        geofenceEvents
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
            })[0] || null;

    return latest;
}

function calculateRiskScore({
    vehicle,
    notifications,
    geofenceEvents,
    options,
}) {
    let score = 0;
    const reasons = [];

    const plate = getPlate(vehicle);
    const speed = getSpeed(vehicle);
    const ignition = getIgnition(vehicle);
    const coordinates = getCoordinates(vehicle);
    const dataAgeMinutes =
        getAgeMinutes(vehicle);

    const notificationCount =
        getNotificationCount(
            notifications,
            plate
        );

    const criticalNotificationCount =
        getCriticalNotificationCount(
            notifications,
            plate
        );

    const geofenceStatus =
        getVehicleGeofenceStatus(
            geofenceEvents,
            plate
        );

    if (speed >= options.speedLimit) {
        score += 30;

        reasons.push({
            key: "speed",
            label: `Hız limiti aşıldı: ${speed} km/h`,
            level: "critical",
        });
    }

    if (
        ignition &&
        speed === 0
    ) {
        score += 15;

        reasons.push({
            key: "idle",
            label: "Kontak açık, araç hareket etmiyor",
            level: "warning",
        });
    }

    if (!coordinates.valid) {
        score += 25;

        reasons.push({
            key: "gps",
            label: "Geçerli GPS konumu yok",
            level: "critical",
        });
    }

    if (
        dataAgeMinutes >=
        options.criticalDataMinutes
    ) {
        score += 30;

        reasons.push({
            key: "oldData",
            label:
                dataAgeMinutes === Infinity
                    ? "Son veri zamanı bilinmiyor"
                    : `Son veri ${Math.floor(
                        dataAgeMinutes / 60
                    )} saat eski`,
            level: "critical",
        });
    } else if (
        dataAgeMinutes >=
        options.oldDataMinutes
    ) {
        score += 18;

        reasons.push({
            key: "oldData",
            label: `Son veri ${dataAgeMinutes} dakika eski`,
            level: "warning",
        });
    }

    if (criticalNotificationCount > 0) {
        score += Math.min(
            20,
            criticalNotificationCount * 8
        );

        reasons.push({
            key: "alarm",
            label: `${criticalNotificationCount} kritik alarm`,
            level: "critical",
        });
    } else if (notificationCount > 0) {
        score += Math.min(
            12,
            notificationCount * 4
        );

        reasons.push({
            key: "alarm",
            label: `${notificationCount} aktif bildirim`,
            level: "warning",
        });
    }

    if (
        geofenceStatus &&
        geofenceStatus.status !== "inside"
    ) {
        score += 15;

        reasons.push({
            key: "geofence",
            label: `${geofenceStatus.geofenceName ||
                "Tanımlı alan"
                } dışında`,
            level: "warning",
        });
    }

    const finalScore = Math.max(
        0,
        Math.min(100, score)
    );

    let level = "good";
    let label = "Normal";

    if (finalScore >= 70) {
        level = "critical";
        label = "Kritik";
    } else if (finalScore >= 40) {
        level = "warning";
        label = "Dikkat";
    } else if (finalScore >= 15) {
        level = "info";
        label = "İzlenmeli";
    }

    return {
        score: finalScore,
        level,
        label,
        reasons,
    };
}

function createInsight({
    key,
    type,
    level,
    title,
    message,
    count,
    vehicles = [],
    actionLabel = "Araçları Gör",
}) {
    return {
        id: `${key}-${Date.now()}`,
        key,
        type,
        level,
        title,
        message,
        count,
        vehicles,
        actionLabel,
    };
}

function createFleetGroups(vehicles = []) {
    const groups = {};

    vehicles.forEach((vehicle) => {
        const fleetName = getFleetName(vehicle);

        if (!groups[fleetName]) {
            groups[fleetName] = [];
        }

        groups[fleetName].push(vehicle);
    });

    return Object.entries(groups)
        .map(([name, items]) => ({
            name,
            count: items.length,
            moving: items.filter(
                (vehicle) =>
                    getStatus(vehicle) ===
                    "moving"
            ).length,
            idle: items.filter(
                (vehicle) =>
                    getStatus(vehicle) ===
                    "idle"
            ).length,
            park: items.filter(
                (vehicle) =>
                    getStatus(vehicle) ===
                    "park"
            ).length,
        }))
        .sort(
            (a, b) =>
                b.count - a.count
        );
}

export function analyzeFleet({
    vehicles = [],
    notifications = [],
    geofenceEvents = [],
    options = {},
}) {
    const finalOptions = {
        ...DEFAULT_OPTIONS,
        ...options,
    };

    const analyzedVehicles = vehicles
        .map((vehicle) => {
            const risk =
                calculateRiskScore({
                    vehicle,
                    notifications,
                    geofenceEvents,
                    options: finalOptions,
                });

            return {
                vehicle,
                plate: getPlate(vehicle),
                speed: getSpeed(vehicle),
                status: getStatus(vehicle),
                address: getAddress(vehicle),
                dataAgeMinutes:
                    getAgeMinutes(vehicle),
                hasGps:
                    getCoordinates(vehicle)
                        .valid,
                risk,
            };
        })
        .sort(
            (a, b) =>
                b.risk.score -
                a.risk.score
        );

    const movingVehicles =
        analyzedVehicles.filter(
            (item) =>
                item.status === "moving"
        );

    const idleVehicles =
        analyzedVehicles.filter(
            (item) =>
                item.status === "idle"
        );

    const parkVehicles =
        analyzedVehicles.filter(
            (item) =>
                item.status === "park"
        );

    const speedingVehicles =
        analyzedVehicles.filter(
            (item) =>
                item.speed >=
                finalOptions.speedLimit
        );

    const gpsMissingVehicles =
        analyzedVehicles.filter(
            (item) => !item.hasGps
        );

    const oldDataVehicles =
        analyzedVehicles.filter(
            (item) =>
                item.dataAgeMinutes >=
                finalOptions.oldDataMinutes
        );

    const criticalVehicles =
        analyzedVehicles.filter(
            (item) =>
                item.risk.level ===
                "critical"
        );

    const warningVehicles =
        analyzedVehicles.filter(
            (item) =>
                item.risk.level ===
                "warning" ||
                item.risk.level === "info"
        );

    const healthyVehicles =
        analyzedVehicles.filter(
            (item) =>
                item.risk.level === "good"
        );

    const outsideGeofencePlates =
        new Set(
            geofenceEvents
                .filter(
                    (event) =>
                        event?.status &&
                        event.status !==
                        "inside"
                )
                .map((event) =>
                    normalizePlate(
                        event?.plate
                    )
                )
        );

    const outsideGeofenceVehicles =
        analyzedVehicles.filter(
            (item) =>
                outsideGeofencePlates.has(
                    normalizePlate(
                        item.plate
                    )
                )
        );

    const insights = [];

    if (speedingVehicles.length > 0) {
        insights.push(
            createInsight({
                key: "speed",
                type: "speed",
                level: "critical",
                title: "Hız limiti ihlali",
                message: `${speedingVehicles.length} araç ${finalOptions.speedLimit} km/h limitinin üzerinde.`,
                count:
                    speedingVehicles.length,
                vehicles:
                    speedingVehicles.map(
                        (item) =>
                            item.vehicle
                    ),
            })
        );
    }

    if (gpsMissingVehicles.length > 0) {
        insights.push(
            createInsight({
                key: "gps",
                type: "gps",
                level: "critical",
                title: "GPS bağlantısı yok",
                message: `${gpsMissingVehicles.length} araçtan geçerli konum alınamıyor.`,
                count:
                    gpsMissingVehicles.length,
                vehicles:
                    gpsMissingVehicles.map(
                        (item) =>
                            item.vehicle
                    ),
            })
        );
    }

    if (oldDataVehicles.length > 0) {
        insights.push(
            createInsight({
                key: "oldData",
                type: "oldData",
                level: "danger",
                title: "Eski araç verileri",
                message: `${oldDataVehicles.length} aracın verisi ${finalOptions.oldDataMinutes} dakikadan eski.`,
                count:
                    oldDataVehicles.length,
                vehicles:
                    oldDataVehicles.map(
                        (item) =>
                            item.vehicle
                    ),
            })
        );
    }

    if (idleVehicles.length > 0) {
        insights.push(
            createInsight({
                key: "idle",
                type: "idle",
                level: "warning",
                title: "Rölantide bekleyen araçlar",
                message: `${idleVehicles.length} araç kontak açık şekilde bekliyor.`,
                count:
                    idleVehicles.length,
                vehicles:
                    idleVehicles.map(
                        (item) =>
                            item.vehicle
                    ),
            })
        );
    }

    if (
        outsideGeofenceVehicles.length >
        0
    ) {
        insights.push(
            createInsight({
                key: "geofence",
                type: "geofence",
                level: "warning",
                title: "Geofence dışında",
                message: `${outsideGeofenceVehicles.length} araç tanımlı operasyon alanının dışında.`,
                count:
                    outsideGeofenceVehicles.length,
                vehicles:
                    outsideGeofenceVehicles.map(
                        (item) =>
                            item.vehicle
                    ),
            })
        );
    }

    if (criticalVehicles.length > 0) {
        insights.push(
            createInsight({
                key: "risk",
                type: "risk",
                level: "critical",
                title: "Yüksek riskli araçlar",
                message: `${criticalVehicles.length} aracın risk puanı kritik seviyede.`,
                count:
                    criticalVehicles.length,
                vehicles:
                    criticalVehicles.map(
                        (item) =>
                            item.vehicle
                    ),
            })
        );
    }

    if (healthyVehicles.length > 0) {
        insights.push(
            createInsight({
                key: "healthy",
                type: "healthy",
                level: "success",
                title: "Sağlıklı ilerleyen filo",
                message: `${healthyVehicles.length} araçta kritik operasyon riski görülmüyor.`,
                count:
                    healthyVehicles.length,
                vehicles:
                    healthyVehicles.map(
                        (item) =>
                            item.vehicle
                    ),
                actionLabel:
                    "Sağlıklı Araçlar",
            })
        );
    }

    const totalRiskScore =
        analyzedVehicles.reduce(
            (total, item) =>
                total + item.risk.score,
            0
        );

    const averageRisk =
        analyzedVehicles.length > 0
            ? Math.round(
                totalRiskScore /
                analyzedVehicles.length
            )
            : 0;

    const fleetHealth = Math.max(
        0,
        100 - averageRisk
    );

    return {
        generatedAt:
            new Date().toISOString(),

        summary: {
            total: vehicles.length,
            moving:
                movingVehicles.length,
            idle: idleVehicles.length,
            park: parkVehicles.length,
            speeding:
                speedingVehicles.length,
            gpsMissing:
                gpsMissingVehicles.length,
            oldData:
                oldDataVehicles.length,
            critical:
                criticalVehicles.length,
            warning:
                warningVehicles.length,
            healthy:
                healthyVehicles.length,
            outsideGeofence:
                outsideGeofenceVehicles.length,
            fleetHealth,
            averageRisk,
        },

        insights,
        analyzedVehicles,
        criticalVehicles:
            criticalVehicles.slice(0, 10),
        fleetGroups:
            createFleetGroups(vehicles),
    };
}