import { useEffect, useMemo, useState } from "react";
import { Search, CalendarDays, Plus, Truck, PauseCircle, ParkingCircle, WifiOff, BellRing, MapPinned, ExternalLink, ShieldCheck, Activity, Clock3, Wrench, BarChart3, RefreshCw, Command, Navigation, Gauge, ChevronRight, Sparkles } from "lucide-react";
import Harita from "../../components/Harita/Harita";
import VehicleDrawer from "../../components/VehicleDrawer/VehicleDrawer";

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
        latitude !== null && longitude !== null && latitude !== "" && longitude !== "" &&
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
    const [search, setSearch] = useState("");

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
                    return null;
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

    const filteredVehicles = useMemo(() => vehicles.filter((vehicle) => {
        const matchesStatus = activeFilter === "all" ||
            (["moving", "idle", "park"].includes(activeFilter) && getStatus(vehicle) === activeFilter) ||
            (activeFilter === "gpsMissing" && !hasGps(vehicle)) ||
            (activeFilter === "alarm" && hasVehicleNotification(vehicle));
        return matchesStatus && normalizePlate(getVehiclePlate(vehicle)).includes(normalizePlate(search));
    }), [vehicles, activeFilter, search]);

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
        if (filterKey === "all") { setSelectedVehicle(null); return; }

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

    const healthScore = Math.max(0, Math.round(100 - ((summary.alarm || 0) / Math.max(summary.all, 1)) * 100));
    const todayLabel = new Date().toLocaleDateString("tr-TR", { day: "2-digit", month: "long", year: "numeric" });

    const kpiCards = [
        { key: "moving", label: "Hareket Halinde", value: summary.moving, desc: "Anlık hareket eden araçlar", icon: Truck, tone: "blue" },
        { key: "idle", label: "Rölantide", value: summary.idle, desc: "Kontak açık ve duran araçlar", icon: PauseCircle, tone: "amber" },
        { key: "park", label: "Park Halinde", value: summary.park, desc: "Kontak kapalı araçlar", icon: ParkingCircle, tone: "slate" },
        { key: "gpsMissing", label: "GPS Yok", value: summary.gpsMissing, desc: "Konum bilgisi alınamayanlar", icon: WifiOff, tone: "red" },
        { key: "alarm", label: "Alarmı Olan", value: summary.alarm, desc: "Aktif bildirimi bulunan araçlar", icon: BellRing, tone: "green" },
    ];

    return (
        <div className="dashboard-page dashboard-command">
            <section className="command-shell">
                <div className="command-topbar">
                    <div className="command-heading">
                        <span className="command-live"><i /> CANLI OPERASYON</span>
                        <h1>Günaydın. Filo kontrol altında.</h1>
                        <p>{todayLabel} · Tüm operasyon tek çalışma alanında.</p>
                    </div>
                    <div className="command-actions">
                        <button className="command-ghost" onClick={() => onNavigate?.("Operasyon Merkezi")}><Command size={17}/> Operasyon Merkezi</button>
                        <button className="command-primary" onClick={() => onNavigate?.("Aktif Seferler")}><Navigation size={17}/> Aktif Seferler <ChevronRight size={16}/></button>
                    </div>
                </div>

                {error && <div className="command-alert" role="alert"><WifiOff size={18}/><div><strong>Canlı veri bağlantısı kesildi</strong><span>{lastRefresh ? "Son başarılı veriler ekranda tutuluyor." : error}</span></div><button onClick={loadData}>Tekrar bağlan</button></div>}

                <div className="command-stat-strip">
                    <button className={activeFilter === "all" ? "active" : ""} onClick={() => handleFilterChange("all")}><span>Filo</span><strong>{lastRefresh ? summary.all : "—"}</strong><small>Toplam araç</small></button>
                    {kpiCards.map(({key,label,value,icon:Icon,tone}) => <button key={key} className={`${tone} ${activeFilter === key ? "active" : ""}`} onClick={() => handleFilterChange(key)}><span><Icon size={16}/>{label}</span><strong>{lastRefresh ? value : "—"}</strong><small>{summary.all ? `%${Math.round(value / summary.all * 100)}` : "—"} filo oranı</small></button>)}
                </div>

                <div className="command-workspace">
                    <main className="command-map-panel">
                        <div className="command-map-toolbar">
                            <label className="command-search"><Search size={18}/><input aria-label="Plaka ara" placeholder="Plaka ara..." value={search} onChange={e => setSearch(e.target.value)}/>{search && <button onClick={() => setSearch("")} aria-label="Aramayı temizle">×</button>}</label>
                            <div className="command-filter-pills">{DASHBOARD_FILTERS.slice(0,5).map(f => <button key={f.key} className={activeFilter === f.key ? "active" : ""} onClick={() => handleFilterChange(f.key)}>{f.key === "all" ? "Tümü" : f.label}<b>{summary[f.key]}</b></button>)}</div>
                            <button className="command-refresh" onClick={loadData} disabled={loading} title="Canlı verileri yenile"><RefreshCw size={17} className={loading ? "spin" : ""}/></button>
                        </div>
                        <div className="command-map-stage">
                            <Harita key={activeFilter} vehicles={filteredVehicles} selectedPlate={selectedVehicle ? getVehiclePlate(selectedVehicle) : undefined} onVehicleClick={openVehicle} height="100%" showToolbar={false} zoom={6}/>
                            <div className="map-floating-status"><span><i className={error ? "bad" : ""}/>{loading ? "Senkronize ediliyor" : error ? "Çevrimdışı" : "Canlı bağlantı"}</span><b>{filteredVehicles.filter(hasGps).length} konum</b></div>
                            <div className="map-floating-help"><MapPinned size={16}/><span>Haritadaki araca tıklayarak detay panelini açın</span></div>
                        </div>
                    </main>

                    <aside className="command-side">
                        <section className="command-health-panel">
                            <div className="command-section-title"><div><span>FİLO SKORU</span><h2>Operasyon sağlığı</h2></div><Gauge size={20}/></div>
                            <div className="command-score-row"><div className="command-score"><strong>{summary.all ? healthScore : "—"}</strong><span>/100</span></div><div className="command-score-copy"><b>{!summary.all ? "Veri bekleniyor" : healthScore > 80 ? "Her şey yolunda" : healthScore > 60 ? "Takip gerekli" : "Müdahale gerekli"}</b><small>{summary.alarm ? `${summary.alarm} araç aksiyon bekliyor` : "Kritik alarm görünmüyor"}</small></div></div>
                            <div className="command-progress"><i style={{width: `${summary.all ? healthScore : 0}%`}}/></div>
                            <div className="command-health-mini"><div><span>GPS kapsama</span><b>{summary.all ? `%${Math.round((summary.all-summary.gpsMissing)/summary.all*100)}` : "—"}</b></div><div><span>Hareket oranı</span><b>{summary.all ? `%${Math.round(summary.moving/summary.all*100)}` : "—"}</b></div></div>
                        </section>

                        <section className="command-attention-panel">
                            <div className="command-section-title"><div><span>AKSİYON MERKEZİ</span><h2>Dikkat isteyenler</h2></div><BellRing size={20}/></div>
                            <div className="command-attention-list">
                                {criticalVehicles.length === 0 ? <div className="command-clear"><ShieldCheck size={25}/><strong>Kritik durum yok</strong><span>Filo normal çalışıyor.</span></div> : criticalVehicles.slice(0,4).map(({vehicle,alarmCount,gpsAvailable}) => <button key={getVehiclePlate(vehicle)} onClick={() => openVehicle(vehicle)}><span className={gpsAvailable ? "attention-icon alarm" : "attention-icon gps"}>{gpsAvailable ? <BellRing size={16}/> : <WifiOff size={16}/>}</span><span><strong>{getVehiclePlate(vehicle)}</strong><small>{!gpsAvailable ? "GPS konumu alınamıyor" : `${alarmCount} aktif bildirim`}</small></span><ChevronRight size={16}/></button>)}
                            </div>
                            <button className="command-side-link" onClick={() => onNavigate?.("Alarm Merkezi")}>Tüm uyarıları incele <ChevronRight size={16}/></button>
                        </section>
                    </aside>
                </div>

                <div className="command-lower-grid">
                    <section className="command-feed-panel">
                        <div className="command-section-title"><div><span>AKIŞ</span><h2>Canlı operasyon günlüğü</h2></div><Activity size={20}/></div>
                        <div className="command-feed">
                            {operationFeed.length === 0 ? <div className="command-clear"><Clock3 size={25}/><strong>Yeni hareket yok</strong><span>Canlı aktiviteler burada akacak.</span></div> : operationFeed.slice(0,6).map((item,index) => <button key={`${item.plate}-${index}`} onClick={() => openVehicleByPlate(item.plate)}><i className={item.type}/><span><strong>{item.plate}</strong><small>{item.text}</small></span><em>{getRelativeTime(item.time)}</em></button>)}
                        </div>
                    </section>
                    <section className="command-insight-panel">
                        <div className="command-section-title"><div><span>GÜNLÜK ÖZET</span><h2>Bugünün görünümü</h2></div><Sparkles size={20}/></div>
                        <div className="command-insight-hero"><span><BarChart3 size={21}/></span><div><strong>{summary.moving + summary.idle}</strong><small>araç şu anda operasyonda</small></div></div>
                        <div className="command-insight-grid"><div><span>Parkta</span><b>{summary.park}</b></div><div><span>Alarm</span><b>{summary.alarm}</b></div><div><span>GPS eksik</span><b>{summary.gpsMissing}</b></div></div>
                        <div className="command-update"><RefreshCw size={15}/><span>{lastRefresh ? `Son senkronizasyon ${lastRefresh.toLocaleTimeString("tr-TR", {hour:"2-digit",minute:"2-digit"})}` : "İlk senkronizasyon bekleniyor"}</span></div>
                    </section>
                </div>
            </section>
            <VehicleDrawer open={drawerOpen} vehicle={selectedVehicle} onClose={() => setDrawerOpen(false)} onGoPlayback={handleGoPlayback} onOpenOperations={handleOpenOperations}/>
        </div>
    );
}
