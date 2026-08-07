import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import Harita from "../components/Harita/Harita";
import "../components/Harita/Harita.css";
import "./OperationsCenter.css";

import PageHeader from "../components/UI/PageHeader";
import StatCard from "../components/UI/StatCard";
import Panel from "../components/UI/Panel";
import VehicleStatusBadge from "../components/UI/VehicleStatusBadge";
import FilterBar from "../components/UI/FilterBar";
import EmptyState from "../components/UI/EmptyState";

import VehicleDrawer from "../components/VehicleDrawer/VehicleDrawer";
import OperationFeed from "../components/OperationFeed/OperationFeed";

import {
    operationEventEngine,
} from "../services/operationEventEngine";

import {
    notificationEngine,
} from "../services/notificationEngine";

import { mobilizService } from "../services/mobiliz";
import { getVehicleIgnition as getIgnition, getVehiclePlate as getPlate, getVehicleSpeed as getSpeed, normalizeVehiclePlate as normalizePlate } from "../domain/vehicleTelemetry";

const GEOFENCE_EVENT_KEY =
    "fts_geofence_events";

const FOCUS_PLATE_KEY =
    "fts_focus_plate";

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

export default function OperationsCenter({
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

                const data = await mobilizService.araclar({ signal });

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

                notificationEngine.processVehicles(
                    data
                );

                notificationEngine.processGeofenceEvents();

                /*
                |--------------------------------------------------------------------------
                | Operasyon olay sistemi
                |--------------------------------------------------------------------------
                */

                operationEventEngine.processVehicles(
                    data
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

    const filteredVehicles =
        useMemo(() => {
            return vehicles.filter(
                (vehicle) => {
                    const plateMatch =
                        normalizePlate(
                            getPlate(vehicle)
                        ).includes(
                            normalizePlate(
                                search
                            )
                        );

                    const statusMatch =
                        statusFilter ===
                        "all" ||
                        getStatus(vehicle) ===
                        statusFilter;

                    const quickMatch =
                        quickFilter ===
                        "all" ||
                        (quickFilter ===
                            "moving" &&
                            getStatus(
                                vehicle
                            ) ===
                            "moving") ||
                        (quickFilter ===
                            "idle" &&
                            getStatus(
                                vehicle
                            ) ===
                            "idle") ||
                        (quickFilter ===
                            "park" &&
                            getStatus(
                                vehicle
                            ) ===
                            "park") ||
                        (quickFilter ===
                            "gpsMissing" &&
                            !hasGps(
                                vehicle
                            )) ||
                        (quickFilter ===
                            "alarm" &&
                            notificationEngine.getByPlate(
                                getPlate(
                                    vehicle
                                ),
                                1
                            ).length >
                            0);

                    return (
                        plateMatch &&
                        statusMatch &&
                        quickMatch
                    );
                }
            );
        }, [
            vehicles,
            search,
            statusFilter,
            quickFilter,
        ]);

    const summary = useMemo(() => {
        return {
            total: vehicles.length,

            moving: vehicles.filter(
                (vehicle) =>
                    getStatus(vehicle) ===
                    "moving"
            ).length,

            idle: vehicles.filter(
                (vehicle) =>
                    getStatus(vehicle) ===
                    "idle"
            ).length,

            park: vehicles.filter(
                (vehicle) =>
                    getStatus(vehicle) ===
                    "park"
            ).length,

            gpsMissing:
                vehicles.filter(
                    (vehicle) =>
                        !hasGps(vehicle)
                ).length,

            alarm: vehicles.filter(
                (vehicle) =>
                    notificationEngine.getByPlate(
                        getPlate(vehicle),
                        1
                    ).length > 0
            ).length,

            geofence:
                geofenceEvents.filter(
                    (event) =>
                        event.status ===
                        "inside"
                ).length,
        };
    }, [
        vehicles,
        geofenceEvents,
    ]);

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
                    <button
                        type="button"
                        onClick={() =>
                            loadData()
                        }
                        disabled={loading}
                    >
                        {loading
                            ? "Yenileniyor..."
                            : "Yenile"}
                    </button>
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
                                quickFilter ===
                                    key
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                setQuickFilter(
                                    key
                                )
                            }
                        >
                            <span>
                                {label}
                            </span>

                            <strong>
                                {count}
                            </strong>
                        </button>
                    )
                )}
            </div>

            <div className="operasyon-layout">
                <div className="operasyon-main-column">
                    <Panel
                        className="operasyon-map-card"
                        title="Canlı Harita"
                        subtitle={`${filteredVehicles.length} araç görüntüleniyor`}
                    >
                        <Harita
                            vehicles={
                                filteredVehicles
                            }
                            selectedPlate={
                                selectedVehicle
                                    ? getPlate(
                                        selectedVehicle
                                    )
                                    : undefined
                            }
                            onVehicleClick={
                                handleVehicleSelect
                            }
                            height="720px"
                            zoom={6}
                        />
                    </Panel>

                    <OperationFeed
                        title="Canlı Operasyon Akışı"
                        maxItems={100}
                        onOpenVehicle={
                            handleOperationVehicleOpen
                        }
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
                                onChange={(
                                    event
                                ) =>
                                    setSearch(
                                        event
                                            .target
                                            .value
                                    )
                                }
                                placeholder="Plaka ara..."
                            />

                            <select
                                value={
                                    statusFilter
                                }
                                onChange={(
                                    event
                                ) =>
                                    setStatusFilter(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                <option value="all">
                                    Tüm
                                    Durumlar
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
                            {filteredVehicles.length ===
                                0 ? (
                                <EmptyState
                                    title="Araç bulunamadı."
                                    description="Arama veya filtre kriterlerini değiştir."
                                />
                            ) : (
                                filteredVehicles.map(
                                    (
                                        vehicle
                                    ) => {
                                        const plate =
                                            getPlate(
                                                vehicle
                                            );

                                        const alarmCount =
                                            notificationEngine.getByPlate(
                                                plate,
                                                50
                                            )
                                                .length;

                                        const lastDate =
                                            getLastDate(
                                                vehicle
                                            );

                                        const active =
                                            normalizePlate(
                                                getPlate(
                                                    selectedVehicle
                                                )
                                            ) ===
                                            normalizePlate(
                                                plate
                                            );

                                        return (
                                            <button
                                                key={
                                                    vehicle?.id ||
                                                    plate
                                                }
                                                type="button"
                                                className={[
                                                    "operasyon-vehicle-card",
                                                    active
                                                        ? "active"
                                                        : "",
                                                ]
                                                    .filter(
                                                        Boolean
                                                    )
                                                    .join(
                                                        " "
                                                    )}
                                                onClick={() =>
                                                    handleVehicleSelect(
                                                        vehicle
                                                    )
                                                }
                                            >
                                                <div className="op-vehicle-main">
                                                    <div>
                                                        <strong>
                                                            {
                                                                plate
                                                            }
                                                        </strong>

                                                        <span>
                                                            {getAddress(
                                                                vehicle
                                                            )}
                                                        </span>
                                                    </div>

                                                    <em>
                                                        {getSpeed(
                                                            vehicle
                                                        )}{" "}
                                                        km/h
                                                    </em>
                                                </div>

                                                <div className="op-vehicle-meta">
                                                    <VehicleStatusBadge
                                                        status={getStatus(
                                                            vehicle
                                                        )}
                                                    />

                                                    <small
                                                        className={
                                                            getIgnition(
                                                                vehicle
                                                            )
                                                                ? "on"
                                                                : "off"
                                                        }
                                                    >
                                                        Kontak{" "}
                                                        {getIgnition(
                                                            vehicle
                                                        )
                                                            ? "Açık"
                                                            : "Kapalı"}
                                                    </small>

                                                    {!hasGps(
                                                        vehicle
                                                    ) && (
                                                            <small className="danger">
                                                                GPS
                                                                Yok
                                                            </small>
                                                        )}

                                                    {alarmCount >
                                                        0 && (
                                                            <small className="alarm">
                                                                {
                                                                    alarmCount
                                                                }{" "}
                                                                Alarm
                                                            </small>
                                                        )}
                                                </div>

                                                <div className="op-vehicle-footer">
                                                    <span>
                                                        Son
                                                        veri
                                                    </span>

                                                    <strong>
                                                        {formatLastData(
                                                            lastDate
                                                        )}
                                                    </strong>
                                                </div>
                                            </button>
                                        );
                                    }
                                )
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
                                        {getPlate(
                                            selectedVehicle
                                        )}
                                    </strong>

                                    <VehicleStatusBadge
                                        status={getStatus(
                                            selectedVehicle
                                        )}
                                    />
                                </div>

                                <div className="operasyon-selected-grid">
                                    <div>
                                        <small>
                                            Hız
                                        </small>

                                        <b>
                                            {getSpeed(
                                                selectedVehicle
                                            )}{" "}
                                            km/h
                                        </b>
                                    </div>

                                    <div>
                                        <small>
                                            Kontak
                                        </small>

                                        <b>
                                            {getIgnition(
                                                selectedVehicle
                                            )
                                                ? "Açık"
                                                : "Kapalı"}
                                        </b>
                                    </div>

                                    <div>
                                        <small>
                                            GPS
                                        </small>

                                        <b>
                                            {hasGps(
                                                selectedVehicle
                                            )
                                                ? "Aktif"
                                                : "Yok"}
                                        </b>
                                    </div>

                                    <div>
                                        <small>
                                            Alarm
                                        </small>

                                        <b>
                                            {
                                                notificationEngine.getByPlate(
                                                    getPlate(
                                                        selectedVehicle
                                                    ),
                                                    50
                                                )
                                                    .length
                                            }
                                        </b>
                                    </div>
                                </div>

                                <p>
                                    {getAddress(
                                        selectedVehicle
                                    )}
                                </p>

                                <button
                                    type="button"
                                    className="operasyon-selected-detail-btn"
                                    onClick={() =>
                                        setDrawerOpen(
                                            true
                                        )
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
