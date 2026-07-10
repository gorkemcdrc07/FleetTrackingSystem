import { useEffect, useMemo, useState } from "react";
import Harita from "../../components/Harita/Harita";
import VehicleDrawer from "../../components/VehicleDrawer/VehicleDrawer";
import DashboardCharts from "./components/DashboardCharts";

import "../../components/Harita/Harita.css";
import "./Dashboard.css";

import { notificationEngine } from "../../services/notificationEngine";
import { apiUrl } from "../../config/api";

const API_URL = apiUrl("/api/mobiliz/activity-last");

const GEOFENCE_EVENT_KEY = "fts_geofence_events";
const FOCUS_PLATE_KEY = "fts_focus_plate";

const DASHBOARD_FILTERS = [
    {
        key: "all",
        label: "Toplam Araç",
        description: "Filodaki tüm araçlar",
    },
    {
        key: "moving",
        label: "Hareket Halinde",
        description: "Anlık hareket eden araçlar",
    },
    {
        key: "idle",
        label: "Rölantide",
        description: "Kontak açık ve duran araçlar",
    },
    {
        key: "park",
        label: "Park Halinde",
        description: "Kontak kapalı araçlar",
    },
    {
        key: "gpsMissing",
        label: "GPS Yok",
        description: "Konum bilgisi alınamayanlar",
    },
    {
        key: "alarm",
        label: "Alarmı Olan",
        description: "Aktif bildirimi bulunan araçlar",
    },
];

function normalizePlate(value) {
    return String(value || "")
        .replace(/\s/g, "")
        .toUpperCase();
}

function getVehiclePlate(vehicle) {
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

function getStatus(vehicle) {
    if (!vehicle) return "offline";

    const speed = getSpeed(vehicle);

    if (speed > 0) return "moving";
    if (getIgnition(vehicle)) return "idle";

    return "park";
}

function getStatusText(vehicle) {
    const status = getStatus(vehicle);

    if (status === "moving") return "Hareket";
    if (status === "idle") return "Rölanti";
    if (status === "park") return "Park";

    return "Çevrimdışı";
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

function formatDate(value) {
    if (!value) return "-";

    const date =
        value instanceof Date
            ? value
            : new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getRelativeTime(value) {
    const date =
        value instanceof Date
            ? value
            : value
                ? new Date(value)
                : null;

    if (!date || Number.isNaN(date.getTime())) {
        return "Veri zamanı bilinmiyor";
    }

    const diffMinutes = Math.max(
        0,
        Math.floor((Date.now() - date.getTime()) / 60000)
    );

    if (diffMinutes < 1) return "Az önce";
    if (diffMinutes < 60) {
        return `${diffMinutes} dakika önce`;
    }

    const hours = Math.floor(diffMinutes / 60);

    if (hours < 24) return `${hours} saat önce`;

    return `${Math.floor(hours / 24)} gün önce`;
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

function hasGps(vehicle) {
    return getCoordinates(vehicle).valid;
}

function getResponseList(json) {
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.data)) return json.data;
    if (Array.isArray(json?.result)) return json.result;
    if (Array.isArray(json?.items)) return json.items;

    return [];
}

function loadGeofenceEvents() {
    try {
        const raw = localStorage.getItem(GEOFENCE_EVENT_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function getNotificationSettings() {
    if (typeof notificationEngine.getSettings === "function") {
        return notificationEngine.getSettings() || {};
    }

    return {};
}

function getVehicleNotifications(vehicle, limit = 20) {
    if (
        typeof notificationEngine.getByPlate !== "function"
    ) {
        return [];
    }

    return notificationEngine.getByPlate(
        getVehiclePlate(vehicle),
        limit
    );
}

function hasVehicleNotification(vehicle) {
    return getVehicleNotifications(vehicle, 1).length > 0;
}

function getVehicleAlarmCount(vehicle) {
    return getVehicleNotifications(vehicle, 50).length;
}

function createVehicleAlarms(vehicles = []) {
    const settings = getNotificationSettings();

    const speedLimit = Number(settings.speedLimit || 90);
    const oldDataMinutes = Number(
        settings.oldDataMinutes || 60
    );

    const idleEnabled = settings.idleEnabled !== false;
    const gpsEnabled = settings.gpsEnabled !== false;

    const alarms = [];

    vehicles.forEach((vehicle) => {
        const speed = getSpeed(vehicle);
        const plate = getVehiclePlate(vehicle);
        const lastDate = getLastDate(vehicle);

        if (speed >= speedLimit) {
            alarms.push({
                type: "speed",
                level: "critical",
                title: "Hız Limiti",
                plate,
                message: `${speed} km/h hızla hareket ediyor.`,
                createdAt: lastDate,
            });
        }

        if (
            idleEnabled &&
            getIgnition(vehicle) &&
            speed === 0
        ) {
            alarms.push({
                type: "idle",
                level: "warning",
                title: "Rölanti",
                plate,
                message:
                    "Kontak açık, araç hareket etmiyor.",
                createdAt: lastDate,
            });
        }

        if (lastDate) {
            const diffMinutes = Math.floor(
                (Date.now() - lastDate.getTime()) / 60000
            );

            if (diffMinutes > oldDataMinutes) {
                alarms.push({
                    type: "oldData",
                    level: "danger",
                    title: "Veri Eski",
                    plate,
                    message: `Son veri ${Math.floor(
                        diffMinutes / 60
                    )} saat önce geldi.`,
                    createdAt: lastDate,
                });
            }
        }

        if (gpsEnabled && !hasGps(vehicle)) {
            alarms.push({
                type: "gps",
                level: "danger",
                title: "GPS Konumu Yok",
                plate,
                message:
                    "Araçtan koordinat bilgisi alınamıyor.",
                createdAt: lastDate,
            });
        }
    });

    return alarms;
}

function createGeofenceAlarms(events = []) {
    return events.map((event) => ({
        type: "geofence",
        level:
            event.status === "inside"
                ? "warning"
                : "danger",
        title:
            event.status === "inside"
                ? "Geofence İçinde"
                : "Geofence Dışında",
        plate: event.plate || "-",
        message: `${event.plate || "-"} ${event.geofenceName || "seçili alan"
            } ${event.status === "inside"
                ? "içinde."
                : "dışında."
            }`,
        createdAt:
            event.createdAt ||
            event.date ||
            null,
    }));
}

function createOperationFeed(vehicles = []) {
    return vehicles.map((vehicle) => {
        const status = getStatus(vehicle);
        const speed = getSpeed(vehicle);
        const lastDate = getLastDate(vehicle);
        const plate = getVehiclePlate(vehicle);

        if (status === "moving") {
            return {
                type: "moving",
                title: "Araç hareket halinde",
                plate,
                text: `${speed} km/h hızla ilerliyor.`,
                time: lastDate,
            };
        }

        if (status === "idle") {
            return {
                type: "idle",
                title: "Araç rölantide",
                plate,
                text: "Kontak açık, araç bekliyor.",
                time: lastDate,
            };
        }

        return {
            type: "park",
            title: "Araç park halinde",
            plate,
            text: getAddress(vehicle),
            time: lastDate,
        };
    });
}

function createGeofenceFeed(events = []) {
    return events.map((event) => ({
        type:
            event.status === "inside"
                ? "geofence-in"
                : "geofence-out",
        title:
            event.status === "inside"
                ? "Geofence içinde"
                : "Geofence dışında",
        plate: event.plate || "-",
        text: event.geofenceName || "Geofence alanı",
        time:
            event.createdAt ||
            event.date ||
            null,
    }));
}

function getFilterTitle(filterKey) {
    return (
        DASHBOARD_FILTERS.find(
            (item) => item.key === filterKey
        )?.label || "Tüm Araçlar"
    );
}

export default function Dashboard({ onNavigate }) {
    const [vehicles, setVehicles] = useState([]);
    const [geofenceEvents, setGeofenceEvents] = useState([]);
    const [selectedVehicle, setSelectedVehicle] =
        useState(null);

    const [drawerOpen, setDrawerOpen] = useState(false);
    const [activeFilter, setActiveFilter] = useState("all");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [lastRefresh, setLastRefresh] = useState(null);

    async function loadData() {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(API_URL, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                },
            });

            const contentType =
                response.headers.get("content-type") || "";

            let json;

            if (contentType.includes("application/json")) {
                json = await response.json();
            } else {
                const text = await response.text();

                throw new Error(
                    text ||
                    `Sunucu geçersiz cevap döndürdü. HTTP ${response.status}`
                );
            }

            if (!response.ok) {
                throw new Error(
                    json?.message ||
                    json?.error ||
                    `Dashboard isteği başarısız oldu. HTTP ${response.status}`
                );
            }

            const data = getResponseList(json);
            const nextGeofenceEvents =
                loadGeofenceEvents();

            setVehicles(data);
            setGeofenceEvents(nextGeofenceEvents);

            notificationEngine.processVehicles(data);
            notificationEngine.processGeofenceEvents();

            setSelectedVehicle((previous) => {
                if (!previous) {
                    return data[0] || null;
                }

                const previousPlate = normalizePlate(
                    getVehiclePlate(previous)
                );

                return (
                    data.find(
                        (vehicle) =>
                            normalizePlate(
                                getVehiclePlate(vehicle)
                            ) === previousPlate
                    ) ||
                    data[0] ||
                    null
                );
            });

            setLastRefresh(new Date());
        } catch (err) {
            console.error(
                "Dashboard verisi alınamadı:",
                err
            );

            setError(
                err instanceof Error
                    ? err.message
                    : "Dashboard verisi alınamadı."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();

        const timer = window.setInterval(loadData, 30000);

        return () => {
            window.clearInterval(timer);
        };
    }, []);

    const vehicleAlarms = useMemo(
        () => createVehicleAlarms(vehicles),
        [vehicles]
    );

    const geofenceAlarms = useMemo(
        () => createGeofenceAlarms(geofenceEvents),
        [geofenceEvents]
    );

    const summary = useMemo(() => {
        return {
            all: vehicles.length,

            moving: vehicles.filter(
                (vehicle) =>
                    getStatus(vehicle) === "moving"
            ).length,

            idle: vehicles.filter(
                (vehicle) => getStatus(vehicle) === "idle"
            ).length,

            park: vehicles.filter(
                (vehicle) => getStatus(vehicle) === "park"
            ).length,

            gpsMissing: vehicles.filter(
                (vehicle) => !hasGps(vehicle)
            ).length,

            alarm: vehicles.filter(
                hasVehicleNotification
            ).length,
        };
    }, [vehicles]);

    const statusChartData = useMemo(() => {
        return [
            {
                key: "moving",
                name: "Hareket",
                value: summary.moving || 0,
            },
            {
                key: "idle",
                name: "Rölanti",
                value: summary.idle || 0,
            },
            {
                key: "park",
                name: "Park",
                value: summary.park || 0,
            },
        ];
    }, [summary.moving, summary.idle, summary.park]);

    const alarmChartData = useMemo(() => {
        const allAlarms = [
            ...vehicleAlarms,
            ...geofenceAlarms,
        ];

        const counts = allAlarms.reduce(
            (result, alarm) => {
                const type = alarm?.type || "other";

                result[type] = (result[type] || 0) + 1;

                return result;
            },
            {}
        );

        return [
            {
                key: "speed",
                name: "Hız",
                shortName: "Hız",
                value: counts.speed || 0,
            },
            {
                key: "idle",
                name: "Rölanti",
                shortName: "Rölanti",
                value: counts.idle || 0,
            },
            {
                key: "oldData",
                name: "Eski Veri",
                shortName: "Eski",
                value: counts.oldData || 0,
            },
            {
                key: "gps",
                name: "GPS Yok",
                shortName: "GPS",
                value: counts.gps || 0,
            },
            {
                key: "geofence",
                name: "Geofence",
                shortName: "Alan",
                value: counts.geofence || 0,
            },
        ];
    }, [vehicleAlarms, geofenceAlarms]);

    const filteredVehicles = useMemo(() => {
        if (activeFilter === "all") {
            return vehicles;
        }

        return vehicles.filter((vehicle) => {
            if (activeFilter === "moving") {
                return getStatus(vehicle) === "moving";
            }

            if (activeFilter === "idle") {
                return getStatus(vehicle) === "idle";
            }

            if (activeFilter === "park") {
                return getStatus(vehicle) === "park";
            }

            if (activeFilter === "gpsMissing") {
                return !hasGps(vehicle);
            }

            if (activeFilter === "alarm") {
                return hasVehicleNotification(vehicle);
            }

            return true;
        });
    }, [vehicles, activeFilter]);

    const alarms = useMemo(() => {
        return [
            ...geofenceAlarms,
            ...vehicleAlarms,
        ]
            .sort((a, b) => {
                const aTime = a.createdAt
                    ? new Date(a.createdAt).getTime()
                    : 0;

                const bTime = b.createdAt
                    ? new Date(b.createdAt).getTime()
                    : 0;

                return bTime - aTime;
            })
            .slice(0, 8);
    }, [geofenceAlarms, vehicleAlarms]);

    const operationFeed = useMemo(() => {
        return [
            ...createGeofenceFeed(geofenceEvents),
            ...createOperationFeed(filteredVehicles),
        ]
            .sort((a, b) => {
                const aTime = a.time
                    ? new Date(a.time).getTime()
                    : 0;

                const bTime = b.time
                    ? new Date(b.time).getTime()
                    : 0;

                return bTime - aTime;
            })
            .slice(0, 12);
    }, [filteredVehicles, geofenceEvents]);

    const fastestVehicles = useMemo(() => {
        return [...filteredVehicles]
            .filter((vehicle) => getSpeed(vehicle) > 0)
            .sort(
                (a, b) =>
                    getSpeed(b) - getSpeed(a)
            )
            .slice(0, 6);
    }, [filteredVehicles]);

    const criticalVehicles = useMemo(() => {
        return [...filteredVehicles]
            .map((vehicle) => ({
                vehicle,
                alarmCount:
                    getVehicleAlarmCount(vehicle),
                lastDate: getLastDate(vehicle),
                gpsAvailable: hasGps(vehicle),
            }))
            .filter(
                (item) =>
                    item.alarmCount > 0 ||
                    !item.gpsAvailable
            )
            .sort((a, b) => {
                if (b.alarmCount !== a.alarmCount) {
                    return b.alarmCount - a.alarmCount;
                }

                return Number(a.gpsAvailable) -
                    Number(b.gpsAvailable);
            })
            .slice(0, 8);
    }, [filteredVehicles]);

    function findVehicleByPlate(plate) {
        const normalized = normalizePlate(plate);

        return (
            vehicles.find(
                (vehicle) =>
                    normalizePlate(
                        getVehiclePlate(vehicle)
                    ) === normalized
            ) || null
        );
    }

    function openVehicle(vehicle) {
        if (!vehicle) return;

        setSelectedVehicle(vehicle);
        setDrawerOpen(true);
    }

    function openVehicleByPlate(plate) {
        openVehicle(findVehicleByPlate(plate));
    }

    function handleFilterChange(filterKey) {
        setActiveFilter(filterKey);

        const firstFilteredVehicle =
            vehicles.find((vehicle) => {
                if (filterKey === "all") return true;

                if (filterKey === "moving") {
                    return getStatus(vehicle) === "moving";
                }

                if (filterKey === "idle") {
                    return getStatus(vehicle) === "idle";
                }

                if (filterKey === "park") {
                    return getStatus(vehicle) === "park";
                }

                if (filterKey === "gpsMissing") {
                    return !hasGps(vehicle);
                }

                if (filterKey === "alarm") {
                    return hasVehicleNotification(vehicle);
                }

                return true;
            });

        if (firstFilteredVehicle) {
            setSelectedVehicle(firstFilteredVehicle);
        }
    }

    function handleStatusChartClick(statusKey) {
        if (!statusKey) return;

        handleFilterChange(statusKey);
    }

    function handleAlarmChartClick() {
        handleFilterChange("alarm");
    }

    function handleGoPlayback(vehicle) {
        localStorage.setItem(
            "fts_playback_vehicle",
            JSON.stringify(vehicle)
        );

        setDrawerOpen(false);
        onNavigate?.("Playback");
    }

    function handleOpenOperations(vehicle) {
        localStorage.setItem(
            FOCUS_PLATE_KEY,
            getVehiclePlate(vehicle)
        );

        setDrawerOpen(false);
        onNavigate?.("Operasyon Merkezi");
    }

    return (
        <div className="dashboard-page">
            <div className="dashboard-head">
                <div>
                    <span>Fleet Tracking System</span>

                    <h1>Canlı Filo Dashboard</h1>

                    <p>
                        Tüm araçlar, canlı harita, alarmlar ve
                        operasyon akışı tek ekranda.
                    </p>

                    {lastRefresh && (
                        <small>
                            Son yenileme:{" "}
                            {lastRefresh.toLocaleTimeString(
                                "tr-TR",
                                {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    second: "2-digit",
                                }
                            )}
                        </small>
                    )}
                </div>

                <div className="dashboard-head-actions">
                    {activeFilter !== "all" && (
                        <button
                            type="button"
                            className="dashboard-clear-filter"
                            onClick={() =>
                                handleFilterChange("all")
                            }
                        >
                            Filtreyi Temizle
                        </button>
                    )}

                    <button
                        type="button"
                        onClick={loadData}
                        disabled={loading}
                    >
                        {loading
                            ? "Yükleniyor..."
                            : "Yenile"}
                    </button>
                </div>
            </div>

            {error && (
                <div className="dashboard-error">
                    <strong>
                        Dashboard verisi alınamadı.
                    </strong>

                    <span>{error}</span>

                    <button
                        type="button"
                        onClick={loadData}
                        disabled={loading}
                    >
                        Tekrar Dene
                    </button>
                </div>
            )}

            <div className="dash-filter-summary">
                <div>
                    <span>Aktif görünüm</span>
                    <strong>
                        {getFilterTitle(activeFilter)}
                    </strong>
                </div>

                <p>
                    Haritada {filteredVehicles.length} araç
                    görüntüleniyor.
                </p>
            </div>

            <div className="dash-kpi-grid dashboard-filter-kpis">
                {DASHBOARD_FILTERS.map((filter) => (
                    <button
                        key={filter.key}
                        type="button"
                        className={[
                            "dashboard-kpi-card",
                            activeFilter === filter.key
                                ? "active"
                                : "",
                            filter.key,
                        ]
                            .filter(Boolean)
                            .join(" ")}
                        onClick={() =>
                            handleFilterChange(filter.key)
                        }
                    >
                        <span>{filter.label}</span>

                        <strong>
                            {summary[filter.key] ?? 0}
                        </strong>

                        <small>
                            {filter.description}
                        </small>
                    </button>
                ))}
            </div>

            <DashboardCharts
                statusData={statusChartData}
                alarmData={alarmChartData}
                onStatusClick={handleStatusChartClick}
                onAlarmClick={handleAlarmChartClick}
            />

            <div className="dashboard-main-grid">
                <section className="dashboard-map-card">
                    <div className="dash-section-title">
                        <div>
                            <h2>
                                {getFilterTitle(activeFilter)}
                            </h2>

                            <p>
                                {filteredVehicles.length} araç
                                görüntüleniyor
                            </p>
                        </div>

                        {activeFilter !== "all" && (
                            <button
                                type="button"
                                onClick={() =>
                                    handleFilterChange("all")
                                }
                            >
                                Tüm Araçlar
                            </button>
                        )}
                    </div>

                    <Harita
                        vehicles={filteredVehicles}
                        selectedPlate={
                            selectedVehicle
                                ? getVehiclePlate(
                                    selectedVehicle
                                )
                                : undefined
                        }
                        onVehicleClick={openVehicle}
                        height="660px"
                        zoom={6}
                    />
                </section>

                <aside className="dashboard-side">
                    <section className="dash-panel">
                        <h2>Seçili Araç</h2>

                        {selectedVehicle ? (
                            <button
                                type="button"
                                className="dash-selected dash-clickable-card"
                                onClick={() =>
                                    openVehicle(
                                        selectedVehicle
                                    )
                                }
                            >
                                <div className="dash-selected-top">
                                    <strong>
                                        {getVehiclePlate(
                                            selectedVehicle
                                        )}
                                    </strong>

                                    <span
                                        className={`dash-selected-status ${getStatus(
                                            selectedVehicle
                                        )}`}
                                    >
                                        {getStatusText(
                                            selectedVehicle
                                        )}
                                    </span>
                                </div>

                                <div className="dash-selected-speed">
                                    {getSpeed(selectedVehicle)}
                                    <small>km/h</small>
                                </div>

                                <p>
                                    {getAddress(selectedVehicle)}
                                </p>

                                <small>
                                    {getRelativeTime(
                                        getLastDate(
                                            selectedVehicle
                                        )
                                    )}
                                </small>
                            </button>
                        ) : (
                            <div className="dash-empty">
                                Araç seçilmedi.
                            </div>
                        )}
                    </section>

                    <section className="dash-panel">
                        <div className="dash-panel-title-row">
                            <h2>Kritik Araçlar</h2>

                            <span>
                                {criticalVehicles.length}
                            </span>
                        </div>

                        <div className="dashboard-critical-list">
                            {criticalVehicles.length === 0 ? (
                                <div className="dash-empty">
                                    Kritik araç bulunmuyor.
                                </div>
                            ) : (
                                criticalVehicles.map(
                                    ({
                                        vehicle,
                                        alarmCount,
                                        gpsAvailable,
                                        lastDate,
                                    }) => (
                                        <button
                                            type="button"
                                            key={
                                                vehicle?.id ||
                                                getVehiclePlate(
                                                    vehicle
                                                )
                                            }
                                            onClick={() =>
                                                openVehicle(
                                                    vehicle
                                                )
                                            }
                                        >
                                            <div>
                                                <strong>
                                                    {getVehiclePlate(
                                                        vehicle
                                                    )}
                                                </strong>

                                                <span>
                                                    {getStatusText(
                                                        vehicle
                                                    )}{" "}
                                                    ·{" "}
                                                    {getSpeed(
                                                        vehicle
                                                    )}{" "}
                                                    km/h
                                                </span>
                                            </div>

                                            <div className="dashboard-critical-meta">
                                                {!gpsAvailable && (
                                                    <em>
                                                        GPS Yok
                                                    </em>
                                                )}

                                                {alarmCount > 0 && (
                                                    <b>
                                                        {alarmCount} Alarm
                                                    </b>
                                                )}

                                                <small>
                                                    {getRelativeTime(
                                                        lastDate
                                                    )}
                                                </small>
                                            </div>
                                        </button>
                                    )
                                )
                            )}
                        </div>
                    </section>

                    <section className="dash-panel">
                        <h2>Son Alarmlar</h2>

                        <div className="dash-alarm-list">
                            {alarms.length === 0 ? (
                                <div className="dash-empty">
                                    Aktif alarm yok.
                                </div>
                            ) : (
                                alarms.map(
                                    (alarm, index) => {
                                        const vehicle =
                                            findVehicleByPlate(
                                                alarm.plate
                                            );

                                        return (
                                            <button
                                                type="button"
                                                className={`dash-alarm ${alarm.level
                                                    } ${vehicle
                                                        ? "clickable"
                                                        : ""
                                                    }`}
                                                key={`${alarm.plate}-${alarm.title}-${index}`}
                                                onClick={() =>
                                                    openVehicleByPlate(
                                                        alarm.plate
                                                    )
                                                }
                                                disabled={!vehicle}
                                            >
                                                <span>
                                                    {alarm.title}
                                                </span>

                                                <strong>
                                                    {alarm.plate}
                                                </strong>

                                                <p>
                                                    {alarm.message}
                                                </p>

                                                <small>
                                                    {formatDate(
                                                        alarm.createdAt
                                                    )}
                                                </small>
                                            </button>
                                        );
                                    }
                                )
                            )}
                        </div>
                    </section>

                    <section className="dash-panel">
                        <h2>Operasyon Akışı</h2>

                        <div className="operation-feed">
                            {operationFeed.length === 0 ? (
                                <div className="dash-empty">
                                    Operasyon kaydı yok.
                                </div>
                            ) : (
                                operationFeed.map(
                                    (item, index) => {
                                        const vehicle =
                                            findVehicleByPlate(
                                                item.plate
                                            );

                                        return (
                                            <button
                                                type="button"
                                                className={`operation-item ${item.type
                                                    } ${vehicle
                                                        ? "clickable"
                                                        : ""
                                                    }`}
                                                key={`${item.plate}-${item.type}-${index}`}
                                                onClick={() =>
                                                    openVehicleByPlate(
                                                        item.plate
                                                    )
                                                }
                                                disabled={!vehicle}
                                            >
                                                <time>
                                                    {formatDate(
                                                        item.time
                                                    )}
                                                </time>

                                                <span>
                                                    {item.title}
                                                </span>

                                                <strong>
                                                    {item.plate}
                                                </strong>

                                                <p>
                                                    {item.text}
                                                </p>
                                            </button>
                                        );
                                    }
                                )
                            )}
                        </div>
                    </section>

                    <section className="dash-panel">
                        <h2>En Hızlı Araçlar</h2>

                        <div className="fast-vehicles">
                            {fastestVehicles.length === 0 ? (
                                <div className="dash-empty">
                                    Hareketli araç bulunmuyor.
                                </div>
                            ) : (
                                fastestVehicles.map(
                                    (vehicle) => (
                                        <button
                                            type="button"
                                            className="fast-vehicle clickable"
                                            key={
                                                vehicle?.id ||
                                                getVehiclePlate(
                                                    vehicle
                                                )
                                            }
                                            onClick={() =>
                                                openVehicle(
                                                    vehicle
                                                )
                                            }
                                        >
                                            <div>
                                                <strong>
                                                    {getVehiclePlate(
                                                        vehicle
                                                    )}
                                                </strong>

                                                <small>
                                                    {getAddress(
                                                        vehicle
                                                    )}
                                                </small>
                                            </div>

                                            <span>
                                                {getSpeed(
                                                    vehicle
                                                )}{" "}
                                                km/h
                                            </span>
                                        </button>
                                    )
                                )
                            )}
                        </div>
                    </section>
                </aside>
            </div>

            <VehicleDrawer
                open={drawerOpen}
                vehicle={selectedVehicle}
                onClose={() => setDrawerOpen(false)}
                onGoPlayback={handleGoPlayback}
                onOpenOperations={handleOpenOperations}
            />
        </div>
    );
}