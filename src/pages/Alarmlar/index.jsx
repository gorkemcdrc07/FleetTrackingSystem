import { useEffect, useMemo, useState } from "react";
import { CheckCheck, MapPin, RefreshCw } from "lucide-react";
import "./Alarmlar.css";
import { notificationEngine } from "../../services/notificationEngine";
import { mobilizService } from "../../services/mobiliz";
const GEOFENCE_EVENT_KEY = "fts_geofence_events";

function getSpeed(vehicle) {
    return Number(vehicle?.speed || vehicle?.velocity || 0);
}

function getPlate(vehicle) {
    return vehicle?.plate || "-";
}

function getAddress(vehicle) {
    return vehicle?.address || vehicle?.location || vehicle?.city || "-";
}

function getCoordinate(vehicle) {
    return {
        latitude: vehicle?.latitude || vehicle?.lat || vehicle?.y || "",
        longitude:
            vehicle?.longitude ||
            vehicle?.lng ||
            vehicle?.lon ||
            vehicle?.x ||
            "",
    };
}

function getLastDate(vehicle) {
    const value =
        vehicle?.gpsDate ||
        vehicle?.activityDate ||
        vehicle?.dataTime ||
        vehicle?.lastDataTime;

    if (!value) return null;

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
}

function normalizePlate(value) {
    return String(value || "").replace(/\s/g, "").toUpperCase();
}

function buildAlarm(vehicle, data) {
    const coord = getCoordinate(vehicle);

    return {
        ...data,
        plate: getPlate(vehicle),
        address: getAddress(vehicle),
        latitude: coord.latitude,
        longitude: coord.longitude,
    };
}

function loadGeofenceEvents() {
    try {
        const raw = localStorage.getItem(GEOFENCE_EVENT_KEY);
        const list = raw ? JSON.parse(raw) : [];

        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

function createGeofenceAlarms(events = []) {
    return events.map((event, index) => ({
        id: `geo-${event.plate}-${event.geofenceId}-${index}`,
        type: "geofence",
        level: event.status === "inside" ? "warning" : "danger",
        title:
            event.status === "inside"
                ? "Geofence Giriş / İçeride"
                : "Geofence Dışında",
        plate: event.plate || "-",
        message:
            event.status === "inside"
                ? `${event.plate} ${event.geofenceName || "seçili alan"} içinde.`
                : `${event.plate} ${event.geofenceName || "seçili alan"} dışında.`,
        address: event.geofenceName || "Geofence",
        latitude: event.latitude || "",
        longitude: event.longitude || "",
        createdAt: event.createdAt,
    }));
}

function createAlarms(vehicles = [], settings) {
    const speedLimit = Number(settings?.speedLimit || 90);
    const oldDataMinutes = Number(settings?.oldDataMinutes || 60);
    const idleEnabled = settings?.idleEnabled !== false;
    const gpsEnabled = settings?.gpsEnabled !== false;
    const alarms = [];

    vehicles.forEach((vehicle) => {
        const speed = getSpeed(vehicle);
        const lastDate = getLastDate(vehicle);

        if (speed >= speedLimit) {
            alarms.push(
                buildAlarm(vehicle, {
                    type: "speed",
                    level: "critical",
                    title: "Hız Limiti Aşıldı",
                    message: `${speed} km/h hızla hareket ediyor.`,
                })
            );
        }

        if (idleEnabled && vehicle.ignition && speed === 0) {
            alarms.push(
                buildAlarm(vehicle, {
                    type: "idle",
                    level: "warning",
                    title: "Rölanti Uyarısı",
                    message: "Kontak açık fakat araç hareket etmiyor.",
                })
            );
        }

        if (lastDate) {
            const diffMin = Math.floor(
                (Date.now() - lastDate.getTime()) / 60000
            );

            if (diffMin > oldDataMinutes) {
                alarms.push(
                    buildAlarm(vehicle, {
                        type: "oldData",
                        level: "danger",
                        title: "Veri Eski",
                        message: `Son veri ${Math.floor(
                            diffMin / 60
                        )} saat önce geldi.`,
                    })
                );
            }
        }

        if (gpsEnabled && !vehicle.latitude && !vehicle.lat && !vehicle.y) {
            alarms.push(
                buildAlarm(vehicle, {
                    type: "gps",
                    level: "danger",
                    title: "GPS Konumu Yok",
                    message: "Araçtan koordinat bilgisi alınamıyor.",
                })
            );
        }
    });

    return alarms;
}

export default function Alarmlar() {
    const [vehicles, setVehicles] = useState([]);
    const [geofenceEvents, setGeofenceEvents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [levelFilter, setLevelFilter] = useState("all");
    const [typeFilter, setTypeFilter] = useState("all");
    const [search, setSearch] = useState("");
    const [lastRefresh, setLastRefresh] = useState(null);
    const [error, setError] = useState("");
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [acknowledged, setAcknowledged] = useState(() => new Set(JSON.parse(localStorage.getItem("fts_acknowledged_alarms") || "[]")));
    const [alarmSettings, setAlarmSettings] = useState(() => {
        try {
            const saved = JSON.parse(
                localStorage.getItem("fts_alarm_settings") || "null"
            );

            return (
                saved || {
                    speedLimit: 90,
                    oldDataMinutes: 60,
                    idleEnabled: true,
                    gpsEnabled: true,
                }
            );
        } catch {
            return {
                speedLimit: 90,
                oldDataMinutes: 60,
                idleEnabled: true,
                gpsEnabled: true,
            };
        }
    });

    useEffect(() => {
        localStorage.setItem(
            "fts_alarm_settings",
            JSON.stringify(alarmSettings)
        );
    }, [alarmSettings]);

    async function loadData() {
        setLoading(true);
        setError("");

        try {
            const data = await mobilizService.araclar();

            setVehicles(data);
            setGeofenceEvents(loadGeofenceEvents());
            notificationEngine.processVehicles(data);
            notificationEngine.processGeofenceEvents();
            setLastRefresh(new Date());
        } catch (err) {
            console.error("Alarm verisi alınamadı:", err);
            setError(err?.message || "Alarm verisi alınamadı.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();

        if (!autoRefresh) return undefined;
        const timer = setInterval(loadData, 30000);
        return () => clearInterval(timer);
    }, [autoRefresh]);

    const vehicleAlarms = useMemo(
        () => createAlarms(vehicles, alarmSettings),
        [vehicles, alarmSettings]
    );

    const geofenceAlarms = useMemo(
        () => createGeofenceAlarms(geofenceEvents),
        [geofenceEvents]
    );

    const alarms = useMemo(
        () => [...geofenceAlarms, ...vehicleAlarms],
        [geofenceAlarms, vehicleAlarms]
    );

    function alarmKey(alarm) {
        return `${alarm.plate}|${alarm.type}|${alarm.title}`;
    }

    function acknowledgeAlarm(alarm) {
        setAcknowledged((prev) => {
            const next = new Set(prev);
            next.add(alarmKey(alarm));
            localStorage.setItem("fts_acknowledged_alarms", JSON.stringify([...next]));
            return next;
        });
    }

    const filteredAlarms = useMemo(() => {
        return alarms.filter((alarm) => {
            const levelMatch =
                levelFilter === "all" || alarm.level === levelFilter;

            const typeMatch =
                typeFilter === "all" || alarm.type === typeFilter;

            const searchMatch = normalizePlate(alarm.plate).includes(
                normalizePlate(search)
            );

            const notAcknowledged = !acknowledged.has(alarmKey(alarm));
            return levelMatch && typeMatch && searchMatch && notAcknowledged;
        });
    }, [alarms, levelFilter, typeFilter, search, acknowledged]);

    const summary = useMemo(() => {
        return {
            total: alarms.length,
            critical: alarms.filter((x) => x.level === "critical").length,
            warning: alarms.filter((x) => x.level === "warning").length,
            danger: alarms.filter((x) => x.level === "danger").length,
        };
    }, [alarms]);

    return (
        <div className="alarmlar-page">
            <div className="alarmlar-header">
                <div>
                    <span>Canlı İzleme</span>
                    <h1>Alarm Merkezi</h1>
                    <p>
                        Mobiliz ve Geofence verilerine göre oluşturulan canlı
                        uyarılar.
                        {lastRefresh && (
                            <>
                                {" "}
                                Son yenileme:{" "}
                                {lastRefresh.toLocaleTimeString("tr-TR")}
                            </>
                        )}
                    </p>
                </div>

                <div className="alarm-extra-actions">
                    <label className="alarm-toggle">
                        <input type="checkbox" checked={autoRefresh} onChange={(e) => setAutoRefresh(e.target.checked)} />
                        30 sn otomatik yenile
                    </label>
                    <button onClick={loadData} disabled={loading}>
                        <RefreshCw size={15} /> {loading ? "Yükleniyor..." : "Yenile"}
                    </button>
                </div>
            </div>

            {error && <div className="alarm-error">{error}</div>}

            <div className="alarm-summary">
                <div>
                    <span>Toplam Alarm</span>
                    <strong>{summary.total}</strong>
                </div>

                <div>
                    <span>Kritik</span>
                    <strong>{summary.critical}</strong>
                </div>

                <div>
                    <span>Uyarı</span>
                    <strong>{summary.warning}</strong>
                </div>

                <div>
                    <span>Veri/GPS/Geo</span>
                    <strong>{summary.danger}</strong>
                </div>
            </div>

            <div className="alarm-toolbar">
            <div className="alarm-search">
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Plaka ara..."
                    />
                </div>

                <div className="alarm-filter">
                    <button
                        className={levelFilter === "all" ? "active" : ""}
                        onClick={() => setLevelFilter("all")}
                    >
                        Tümü
                    </button>

                    <button
                        className={levelFilter === "critical" ? "active" : ""}
                        onClick={() => setLevelFilter("critical")}
                    >
                        Kritik
                    </button>

                    <button
                        className={levelFilter === "warning" ? "active" : ""}
                        onClick={() => setLevelFilter("warning")}
                    >
                        Uyarı
                    </button>

                    <button
                        className={levelFilter === "danger" ? "active" : ""}
                        onClick={() => setLevelFilter("danger")}
                    >
                        Dikkat
                    </button>
                </div>

                <div className="alarm-type-filter">
                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value)}
                    >
                        <option value="all">Tüm Alarm Tipleri</option>
                        <option value="speed">Hız Limiti</option>
                        <option value="idle">Rölanti</option>
                        <option value="oldData">Veri Eski</option>
                        <option value="gps">GPS Yok</option>
                        <option value="geofence">Geofence</option>
                    </select>
                </div>

            </div>

            <div className="alarm-settings">
                <div>
                    <span>Hız Limiti</span>
                    <input
                        type="number"
                        value={alarmSettings.speedLimit}
                        onChange={(e) =>
                            setAlarmSettings((prev) => ({
                                ...prev,
                                speedLimit: e.target.value,
                            }))
                        }
                    />
                </div>

                <div>
                    <span>Veri Eski Süresi (dk)</span>
                    <input
                        type="number"
                        value={alarmSettings.oldDataMinutes}
                        onChange={(e) =>
                            setAlarmSettings((prev) => ({
                                ...prev,
                                oldDataMinutes: e.target.value,
                            }))
                        }
                    />
                </div>

                <label>
                    <input
                        type="checkbox"
                        checked={alarmSettings.idleEnabled}
                        onChange={(e) =>
                            setAlarmSettings((prev) => ({
                                ...prev,
                                idleEnabled: e.target.checked,
                            }))
                        }
                    />
                    Rölanti Alarmı
                </label>

                <label>
                    <input
                        type="checkbox"
                        checked={alarmSettings.gpsEnabled}
                        onChange={(e) =>
                            setAlarmSettings((prev) => ({
                                ...prev,
                                gpsEnabled: e.target.checked,
                            }))
                        }
                    />
                    GPS Alarmı
                </label>
            </div>

            <div className="alarm-list">
                {filteredAlarms.length === 0 ? (
                    <div className="alarm-empty">Aktif alarm bulunmuyor.</div>
                ) : (
                    filteredAlarms.map((alarm, index) => {
                        const mapsUrl =
                            alarm.latitude && alarm.longitude
                                ? `https://www.google.com/maps?q=${alarm.latitude},${alarm.longitude}`
                                : "";

                        return (
                            <div
                                className={`alarm-card ${alarm.level}`}
                                key={`${alarm.plate}-${alarm.type}-${index}`}
                            >
                                <div>
                                    <span>{alarm.title}</span>
                                    <strong>{alarm.plate}</strong>
                                    <p>{alarm.message}</p>
                                    <small>{alarm.address}</small>
                                </div>

                                <div className="alarm-actions">
                                    <em>
                                        {alarm.level === "critical" &&
                                            "Kritik"}
                                        {alarm.level === "warning" && "Uyarı"}
                                        {alarm.level === "danger" && "Dikkat"}
                                    </em>

                                    <button type="button" className="alarm-ack-btn" onClick={() => acknowledgeAlarm(alarm)}>
                                        <CheckCheck size={13} /> İncelendi
                                    </button>

                                    {mapsUrl && (
                                        <a
                                            className="alarm-map-link"
                                            href={mapsUrl}
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            <MapPin size={13} /> Haritada Aç
                                        </a>
                                    )}
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
}