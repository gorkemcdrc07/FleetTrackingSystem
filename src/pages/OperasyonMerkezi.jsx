import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import Harita from "../components/Harita/Harita";
import "../components/Harita/Harita.css";
import "./OperasyonMerkezi.css";

import PageHeader from "../components/UI/PageHeader";
import StatCard from "../components/UI/StatCard";
import Panel from "../components/UI/Panel";
import VehicleStatusBadge from "../components/UI/VehicleStatusBadge";
import FilterBar from "../components/UI/FilterBar";
import EmptyState from "../components/UI/EmptyState";

import VehicleDrawer from "../components/VehicleDrawer/VehicleDrawer";
import OperationFeed from "../components/OperationFeed/OperationFeed";
import FleetIntelligence from "../components/FleetIntelligence/FleetIntelligence";

import {
    operationEventEngine,
} from "../services/operationEventEngine";

import {
    notificationEngine,
} from "../services/notificationEngine";

import { apiUrl } from "../config/api";
import DispatchBoard from "../components/DispatchBoard/DispatchBoard";
import TrackedVehicleDrawer from "../components/TrackedVehicleSelector/TrackedVehicleDrawer";
import { useTrackedVehicles } from "../context/TrackedVehiclesContext";
const API_URL = apiUrl(
    "/api/mobiliz/activity-last"
);

const GEOFENCE_EVENT_KEY =
    "fts_geofence_events";

const FOCUS_PLATE_KEY =
    "fts_focus_plate";

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

function getStatus(vehicle) {
    if (!vehicle) return "offline";

    const speed = getSpeed(vehicle);

    if (speed > 0) {
        return "moving";
    }

    if (getIgnition(vehicle)) {
        return "idle";
    }

    return "park";
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

    const parsedLatitude =
        Number(latitude);

    const parsedLongitude =
        Number(longitude);

    const valid =
        Number.isFinite(parsedLatitude) &&
        Number.isFinite(parsedLongitude) &&
        parsedLatitude >= -90 &&
        parsedLatitude <= 90 &&
        parsedLongitude >= -180 &&
        parsedLongitude <= 180;

    return {
        latitude: valid
            ? parsedLatitude
            : null,

        longitude: valid
            ? parsedLongitude
            : null,

        valid,
    };
}

function hasGps(vehicle) {
    return getCoordinates(vehicle).valid;
}

function getResponseList(json) {
    if (Array.isArray(json)) {
        return json;
    }

    if (Array.isArray(json?.data)) {
        return json.data;
    }

    if (Array.isArray(json?.Data)) {
        return json.Data;
    }

    if (Array.isArray(json?.result)) {
        return json.result;
    }

    if (Array.isArray(json?.items)) {
        return json.items;
    }

    return [];
}

function loadGeofenceEvents() {
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

function formatLastData(value) {
    if (!value) return "-";

    return value.toLocaleTimeString(
        "tr-TR",
        {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
        }
    );
}

export default function OperasyonMerkezi({
    onNavigate,
}) {
    const [vehicles, setVehicles] =
        useState([]);

    const [
        geofenceEvents,
        setGeofenceEvents,
    ] = useState([]);

    const [
        selectedVehicle,
        setSelectedVehicle,
    ] = useState(null);

    const [
        drawerOpen,
        setDrawerOpen,
    ] = useState(false);

    const [search, setSearch] =
        useState("");

    const [
        statusFilter,
        setStatusFilter,
    ] = useState("all");

    const [
        quickFilter,
        setQuickFilter,
    ] = useState("all");

    const [
        intelligenceFilter,
        setIntelligenceFilter,
    ] = useState(null);

    const {
        trackedPlates,
        setTrackedPlates,
        filterVehicles,
    } = useTrackedVehicles();

    const [
        trackedDrawerOpen,
        setTrackedDrawerOpen,
    ] = useState(false);

    const [loading, setLoading] =
        useState(false);

    const [error, setError] =
        useState("");

    const [
        lastRefresh,
        setLastRefresh,
    ] = useState(null);

    const findVehicleByPlate =
        useCallback(
            (plate, vehicleList = vehicles) => {
                const normalized =
                    normalizePlate(plate);

                return (
                    vehicleList.find(
                        (vehicle) =>
                            normalizePlate(
                                getPlate(vehicle)
                            ) === normalized
                    ) || null
                );
            },
            [vehicles]
        );

    const focusVehicleByPlate =
        useCallback(
            (vehicleList = []) => {
                const focusPlate =
                    localStorage.getItem(
                        FOCUS_PLATE_KEY
                    );

                if (!focusPlate) {
                    return false;
                }

                const found =
                    findVehicleByPlate(
                        focusPlate,
                        vehicleList
                    );

                if (!found) {
                    return false;
                }

                setSelectedVehicle(found);
                setDrawerOpen(true);
                setSearch(getPlate(found));

                localStorage.removeItem(
                    FOCUS_PLATE_KEY
                );

                return true;
            },
            [findVehicleByPlate]
        );

    const loadData = useCallback(
        async (signal) => {
            try {
                setLoading(true);
                setError("");

                const response =
                    await fetch(API_URL, {
                        method: "GET",

                        headers: {
                            Accept:
                                "application/json",
                        },

                        signal,
                    });

                const contentType =
                    response.headers.get(
                        "content-type"
                    ) || "";

                let json;

                if (
                    contentType.includes(
                        "application/json"
                    )
                ) {
                    json =
                        await response.json();
                } else {
                    const text =
                        await response.text();

                    throw new Error(
                        text ||
                        `Sunucu geçersiz cevap döndürdü. HTTP ${response.status}`
                    );
                }

                if (!response.ok) {
                    throw new Error(
                        json?.message ||
                        json?.error ||
                        `Operasyon verisi alınamadı. HTTP ${response.status}`
                    );
                }

                const data =
                    getResponseList(json);

                const nextGeofenceEvents =
                    loadGeofenceEvents();

                setVehicles(data);

                setGeofenceEvents(
                    nextGeofenceEvents
                );

                /*
                |--------------------------------------------------------------------------
                | Bildirim sistemi
                |--------------------------------------------------------------------------
                */

const trackedData =
    filterVehicles(data);

const trackedPlateSet = new Set(
    trackedData.map((vehicle) =>
        normalizePlate(
            getPlate(vehicle)
        )
    )
);

const trackedGeofenceEvents =
    nextGeofenceEvents.filter(
        (event) =>
            trackedPlateSet.has(
                normalizePlate(
                    event?.plate
                )
            )
    );


                operationEventEngine.processGeofenceEvents(
                    nextGeofenceEvents
                );

                operationEventEngine.processNotifications(
                    notificationEngine.getAll()
                );

                /*
                |--------------------------------------------------------------------------
                | Bildirimden veya başka ekrandan gelen plaka odağı
                |--------------------------------------------------------------------------
                */

                const focused =
                    focusVehicleByPlate(data);

                if (!focused) {
                    setSelectedVehicle(
                        (previous) => {
                            if (!previous) {
                                return (
                                    data[0] ||
                                    null
                                );
                            }

                            const current =
                                findVehicleByPlate(
                                    getPlate(
                                        previous
                                    ),
                                    data
                                );

                            return (
                                current ||
                                data[0] ||
                                null
                            );
                        }
                    );
                }

                setLastRefresh(
                    new Date()
                );
            } catch (err) {
                if (
                    err?.name ===
                    "AbortError"
                ) {
                    return;
                }

                console.error(
                    "Operasyon verisi alınamadı:",
                    err
                );

                setError(
                    err instanceof Error
                        ? err.message
                        : "Operasyon verisi alınamadı."
                );
            } finally {
                if (!signal?.aborted) {
                    setLoading(false);
                }
            }
        },
[
    findVehicleByPlate,
    focusVehicleByPlate,
    filterVehicles,
]
);

    useEffect(() => {
        const controller =
            new AbortController();

        loadData(controller.signal);

        const timer =
            window.setInterval(() => {
                loadData();
            }, 30000);

        return () => {
            controller.abort();
            window.clearInterval(timer);
        };
    }, [loadData]);


    /*
    |--------------------------------------------------------------------------
    | Operasyon Merkezi açıkken dışarıdan plaka seçimi gelirse
    |--------------------------------------------------------------------------
    */

    useEffect(() => {
        function handleVehicleOpen(event) {
            const plate =
                event?.detail?.plate ||
                localStorage.getItem(
                    FOCUS_PLATE_KEY
                );

            if (!plate) return;

            const found =
                findVehicleByPlate(plate);

            if (!found) return;

            setSelectedVehicle(found);
            setSearch(getPlate(found));
            setDrawerOpen(true);

            localStorage.removeItem(
                FOCUS_PLATE_KEY
            );
        }

        window.addEventListener(
            "fts_notification_vehicle_open",
            handleVehicleOpen
        );

        return () => {
            window.removeEventListener(
                "fts_notification_vehicle_open",
                handleVehicleOpen
            );
        };
    }, [findVehicleByPlate]);

    const trackedVehicles = useMemo(
        () => filterVehicles(vehicles),
        [vehicles, filterVehicles]
    );
    useEffect(() => {
    if (trackedPlates.length === 0) {
        return;
    }

    const allowedPlates = new Set(
        trackedPlates.map(normalizePlate)
    );

    const filteredNotifications =
        notificationEngine
            .getAll()
            .filter((item) =>
                allowedPlates.has(
                    normalizePlate(item?.plate)
                )
            );

    localStorage.setItem(
        "fts_notifications",
        JSON.stringify(filteredNotifications)
    );

    window.dispatchEvent(
        new CustomEvent(
            notificationEngine.eventName,
            {
                detail: filteredNotifications,
            }
        )
    );
}, [trackedPlates]);

    const filteredVehicles = useMemo(() => {
        return trackedVehicles.filter((vehicle) => {
            const plateMatch = normalizePlate(
                getPlate(vehicle)
            ).includes(normalizePlate(search));

            const statusMatch =
                statusFilter === "all" ||
                getStatus(vehicle) === statusFilter;

            const quickMatch =
                quickFilter === "all" ||
                (quickFilter === "moving" &&
                    getStatus(vehicle) === "moving") ||
                (quickFilter === "idle" &&
                    getStatus(vehicle) === "idle") ||
                (quickFilter === "park" &&
                    getStatus(vehicle) === "park") ||
                (quickFilter === "gpsMissing" &&
                    !hasGps(vehicle)) ||
                (quickFilter === "alarm" &&
                    notificationEngine.getByPlate(
                        getPlate(vehicle),
                        1
                    ).length > 0);

            const intelligenceMatch =
                !intelligenceFilter ||
                intelligenceFilter.plates.includes(
                    normalizePlate(getPlate(vehicle))
                );

            return (
                plateMatch &&
                statusMatch &&
                quickMatch &&
                intelligenceMatch
            );
        });
    }, [
        trackedVehicles,
        search,
        statusFilter,
        quickFilter,
        intelligenceFilter,
    ]);

    useEffect(() => {
        if (!selectedVehicle) return;

        const selectedPlate = normalizePlate(
            getPlate(selectedVehicle)
        );

        const stillVisible = filteredVehicles.some(
            (vehicle) =>
                normalizePlate(getPlate(vehicle)) ===
                selectedPlate
        );

        if (!stillVisible) {
            setSelectedVehicle(
                filteredVehicles[0] || null
            );
            setDrawerOpen(false);
        }
    }, [filteredVehicles, selectedVehicle]);

    const summary = useMemo(() => {
        return {
            total: trackedVehicles.length,

            moving: trackedVehicles.filter(
                (vehicle) =>
                    getStatus(vehicle) === "moving"
            ).length,

            idle: trackedVehicles.filter(
                (vehicle) =>
                    getStatus(vehicle) === "idle"
            ).length,

            park: trackedVehicles.filter(
                (vehicle) =>
                    getStatus(vehicle) === "park"
            ).length,

            gpsMissing: trackedVehicles.filter(
                (vehicle) => !hasGps(vehicle)
            ).length,

            alarm: trackedVehicles.filter(
                (vehicle) =>
                    notificationEngine.getByPlate(
                        getPlate(vehicle),
                        1
                    ).length > 0
            ).length,

            geofence: geofenceEvents.filter((event) => {
                const eventPlate = normalizePlate(
                    event?.plate
                );

                const trackedPlate =
                    trackedVehicles.some(
                        (vehicle) =>
                            normalizePlate(
                                getPlate(vehicle)
                            ) === eventPlate
                    );

                return (
                    trackedPlate &&
                    event.status === "inside"
                );
            }).length,
        };
    }, [
        trackedVehicles,
        geofenceEvents,
    ]);

    const intelligenceNotifications = useMemo(() => {
        return notificationEngine.getAll();
    }, [vehicles, geofenceEvents]);

    function handleVehicleSelect(vehicle) {
        if (!vehicle) return;

        setSelectedVehicle(vehicle);
        setDrawerOpen(true);
    }

    function handleOperationVehicleOpen(
        plate
    ) {
        const found =
            findVehicleByPlate(plate);

        if (!found) return;

        setSelectedVehicle(found);
        setSearch(getPlate(found));
        setDrawerOpen(true);
    }

    function handleGoPlayback(vehicle) {
        if (!vehicle) return;

        localStorage.setItem(
            "fts_playback_vehicle",
            JSON.stringify(vehicle)
        );

        setDrawerOpen(false);

        onNavigate?.("Playback");
    }

    return (
        <div className="operasyon-page">
            <PageHeader
                eyebrow="Canlı Kontrol Merkezi"
                title="Operasyon Merkezi"
                description={`Harita, araçlar, geofence olayları ve canlı operasyon akışı tek ekranda.${lastRefresh
                        ? ` Son yenileme: ${lastRefresh.toLocaleTimeString(
                            "tr-TR",
                            {
                                hour:
                                    "2-digit",
                                minute:
                                    "2-digit",
                                second:
                                    "2-digit",
                            }
                        )}`
                        : ""
                    }`}
                actions={
                    <div className="operasyon-header-actions">
                        <button
                            type="button"
                            className="operasyon-tracked-open-btn"
                            onClick={() =>
                                setTrackedDrawerOpen(true)
                            }
                        >
                            <span>
                                Takip Edilen Araçlar
                            </span>

                            <strong>
                                {trackedPlates.length > 0
                                    ? trackedPlates.length
                                    : "Tümü"}
                            </strong>
                        </button>

                        <button
                            type="button"
                            onClick={() => loadData()}
                            disabled={loading}
                        >
                            {loading
                                ? "Yenileniyor..."
                                : "Yenile"}
                        </button>
                    </div>
                }
            />

            {error && (
                <div className="operasyon-error">
                    <div>
                        <strong>
                            Operasyon verisi
                            alınamadı.
                        </strong>

                        <span>
                            {error}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            loadData()
                        }
                        disabled={loading}
                    >
                        Tekrar Dene
                    </button>
                </div>
            )}

            <div className="operasyon-kpi-grid operasyon-kpi-extended">
                <StatCard
                    label="Toplam Araç"
                    value={summary.total}
                />

                <StatCard
                    label="Hareket"
                    value={summary.moving}
                    tone="success"
                />

                <StatCard
                    label="Rölanti"
                    value={summary.idle}
                    tone="warning"
                />

                <StatCard
                    label="Park"
                    value={summary.park}
                />

                <StatCard
                    label="GPS Yok"
                    value={
                        summary.gpsMissing
                    }
                    tone="danger"
                />

                <StatCard
                    label="Alarmı Olan"
                    value={summary.alarm}
                    tone="danger"
                />

                <StatCard
                    label="Geofence İçinde"
                    value={
                        summary.geofence
                    }
                    tone="danger"
                />
            </div>

            <div className="operasyon-quick-filters">
                {[
                    [
                        "all",
                        "Tümü",
                        summary.total,
                    ],

                    [
                        "moving",
                        "Hareket",
                        summary.moving,
                    ],

                    [
                        "idle",
                        "Rölanti",
                        summary.idle,
                    ],

                    [
                        "park",
                        "Park",
                        summary.park,
                    ],

                    [
                        "gpsMissing",
                        "GPS Yok",
                        summary.gpsMissing,
                    ],

                    [
                        "alarm",
                        "Alarmı Olan",
                        summary.alarm,
                    ],
                ].map(
                    ([
                        key,
                        label,
                        count,
                    ]) => (
                        <button
                            key={key}
                            type="button"
                            className={
                                quickFilter === key
                                    ? "active"
                                    : ""
                            }
                            onClick={() => {
                                setQuickFilter(key);
                                setIntelligenceFilter(null);
                            }}
                        >
                            <span>{label}</span>
                            <strong>{count}</strong>
                        </button>
                    )
                )}
            </div>

            {intelligenceFilter && (
                <div className="operasyon-intelligence-filter">
                    <div>
                        <span>Akıllı filtre aktif</span>

                        <strong>
                            {intelligenceFilter.title}
                        </strong>

                        <small>
                            {
                                intelligenceFilter.plates
                                    .length
                            }{" "}
                            araç gösteriliyor
                        </small>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            setIntelligenceFilter(null)
                        }
                    >
                        Filtreyi Temizle
                    </button>
                </div>
            )}

            <div className="operasyon-layout">
                <div className="operasyon-main-column">
                    <Panel
                        className="operasyon-map-card"
                        title="Canlı Harita"
                        subtitle={`${filteredVehicles.length} araç görüntüleniyor`}
                    >
                        <Harita
                            vehicles={filteredVehicles}
                            selectedPlate={
                                selectedVehicle
                                    ? getPlate(selectedVehicle)
                                    : undefined
                            }
                            onVehicleClick={handleVehicleSelect}
                            height="720px"
                            zoom={6}
                        />
                    </Panel>

                    <FleetIntelligence
                        vehicles={trackedVehicles}
                        notifications={intelligenceNotifications}
                        geofenceEvents={geofenceEvents}
                        compact
                        onOpenVehicle={(vehicle) => {
                            if (!vehicle) return;

                            setSelectedVehicle(vehicle);
                            setSearch(getPlate(vehicle));
                            setDrawerOpen(true);
                        }}
                        onShowVehicles={(insightVehicles, insight) => {
                            const normalizedPlates = (
                                insightVehicles || []
                            ).map((vehicle) =>
                                normalizePlate(getPlate(vehicle))
                            );

                            setIntelligenceFilter({
                                key: insight?.key || "custom",
                                title:
                                    insight?.title ||
                                    "Akıllı filo filtresi",
                                plates: normalizedPlates,
                            });

                            setSearch("");
                            setStatusFilter("all");
                            setQuickFilter("all");

                            const firstVehicle =
                                insightVehicles?.[0];

                            if (firstVehicle) {
                                setSelectedVehicle(firstVehicle);
                            }
                        }}
                    />
                    <OperationFeed
                        title="Canlı Operasyon Akışı"
                        maxItems={100}
                        onOpenVehicle={handleOperationVehicleOpen}
                    />

                    <DispatchBoard
                        onOpenVehicle={handleOperationVehicleOpen}
                    />
                </div>

                <aside className="operasyon-side">
                    <Panel
                        title="Araçlar"
                        className="operasyon-panel"
                    >
                        <FilterBar>
                            <input
                                value={search}
                                onChange={(event) => {
                                    setSearch(event.target.value);
                                    setIntelligenceFilter(null);
                                }}
                                placeholder="Plaka ara..."
                            />

                            <select
                                value={statusFilter}
                                onChange={(event) => {
                                    setStatusFilter(event.target.value);
                                    setIntelligenceFilter(null);
                                }}
                            >
                                <option value="all">
                                    Tüm Durumlar
                                </option>

                                <option value="moving">
                                    Hareket
                                </option>

                                <option value="idle">
                                    Rölanti
                                </option>

                                <option value="park">
                                    Park
                                </option>
                            </select>
                        </FilterBar>

                        <div className="operasyon-vehicle-list">
                            {filteredVehicles.length === 0 ? (
                                <EmptyState
                                    title="Araç bulunamadı."
                                    description="Arama veya filtre kriterlerini değiştir."
                                />
                            ) : (
                                filteredVehicles.map((vehicle) => {
                                    const plate = getPlate(vehicle);

                                    const alarmCount =
                                        notificationEngine.getByPlate(
                                            plate,
                                            50
                                        ).length;

                                    const lastDate =
                                        getLastDate(vehicle);

                                    const active =
                                        normalizePlate(
                                            getPlate(selectedVehicle)
                                        ) === normalizePlate(plate);

                                    return (
                                        <button
                                            key={vehicle?.id || plate}
                                            type="button"
                                            className={[
                                                "operasyon-vehicle-card",
                                                active ? "active" : "",
                                            ]
                                                .filter(Boolean)
                                                .join(" ")}
                                            onClick={() =>
                                                handleVehicleSelect(vehicle)
                                            }
                                        >
                                            <div className="op-vehicle-main">
                                                <div>
                                                    <strong>
                                                        {plate}
                                                    </strong>

                                                    <span>
                                                        {getAddress(vehicle)}
                                                    </span>
                                                </div>

                                                <em>
                                                    {getSpeed(vehicle)} km/h
                                                </em>
                                            </div>

                                            <div className="op-vehicle-meta">
                                                <VehicleStatusBadge
                                                    status={getStatus(vehicle)}
                                                />

                                                <small
                                                    className={
                                                        getIgnition(vehicle)
                                                            ? "on"
                                                            : "off"
                                                    }
                                                >
                                                    Kontak{" "}
                                                    {getIgnition(vehicle)
                                                        ? "Açık"
                                                        : "Kapalı"}
                                                </small>

                                                {!hasGps(vehicle) && (
                                                    <small className="danger">
                                                        GPS Yok
                                                    </small>
                                                )}

                                                {alarmCount > 0 && (
                                                    <small className="alarm">
                                                        {alarmCount} Alarm
                                                    </small>
                                                )}
                                            </div>

                                            <div className="op-vehicle-footer">
                                                <span>Son veri</span>

                                                <strong>
                                                    {formatLastData(lastDate)}
                                                </strong>
                                            </div>
                                        </button>
                                    );
                                })
                            )}
                        </div>
                    </Panel>

                    <Panel
                        title="Seçili Araç"
                        className="operasyon-panel"
                    >
                        {selectedVehicle ? (
                            <div className="operasyon-selected">
                                <div className="operasyon-selected-head">
                                    <strong>
                                        {getPlate(selectedVehicle)}
                                    </strong>

                                    <VehicleStatusBadge
                                        status={getStatus(selectedVehicle)}
                                    />
                                </div>

                                <div className="operasyon-selected-grid">
                                    <div>
                                        <small>Hız</small>

                                        <b>
                                            {getSpeed(selectedVehicle)} km/h
                                        </b>
                                    </div>

                                    <div>
                                        <small>Kontak</small>

                                        <b>
                                            {getIgnition(selectedVehicle)
                                                ? "Açık"
                                                : "Kapalı"}
                                        </b>
                                    </div>

                                    <div>
                                        <small>GPS</small>

                                        <b>
                                            {hasGps(selectedVehicle)
                                                ? "Aktif"
                                                : "Yok"}
                                        </b>
                                    </div>

                                    <div>
                                        <small>Alarm</small>

                                        <b>
                                            {
                                                notificationEngine.getByPlate(
                                                    getPlate(selectedVehicle),
                                                    50
                                                ).length
                                            }
                                        </b>
                                    </div>
                                </div>

                                <p>
                                    {getAddress(selectedVehicle)}
                                </p>

                                <button
                                    type="button"
                                    className="operasyon-selected-detail-btn"
                                    onClick={() =>
                                        setDrawerOpen(true)
                                    }
                                >
                                    Detayları Aç
                                </button>
                            </div>
                        ) : (
                            <EmptyState
                                title="Araç seçilmedi."
                                description="Haritadan veya listeden bir araç seç."
                            />
                        )}
                    </Panel>
                </aside>
            </div>
            <TrackedVehicleDrawer
                open={trackedDrawerOpen}
                vehicles={vehicles}
                selectedPlates={trackedPlates}
                onClose={() =>
                    setTrackedDrawerOpen(false)
                }
                onSave={(plates) => {
                    setTrackedPlates(plates);
                    setTrackedDrawerOpen(false);
                    setSearch("");
                    setStatusFilter("all");
                    setQuickFilter("all");
                    setIntelligenceFilter(null);
                }}
            />

            <VehicleDrawer
                open={drawerOpen}
                vehicle={selectedVehicle}
                onClose={() =>
                    setDrawerOpen(false)
                }
                onGoPlayback={
                    handleGoPlayback
                }
            />
        </div>
    );
}