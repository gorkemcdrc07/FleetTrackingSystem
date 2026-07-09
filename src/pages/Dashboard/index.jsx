import { useEffect, useMemo, useState } from "react";
import Harita from "../../components/Harita/Harita";
import "../../components/Harita/Harita.css";
import "./Dashboard.css";

const API_URL = "http://localhost:5000/api/mobiliz/activity-last";
const GEOFENCE_EVENT_KEY = "fts_geofence_events";

function getSpeed(vehicle) {
    return Number(vehicle?.speed || vehicle?.velocity || 0);
}

function getStatus(vehicle) {
    const speed = getSpeed(vehicle);
    if (speed > 0) return "moving";
    if (vehicle?.ignition || vehicle?.engine) return "idle";
    return "park";
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

function loadGeofenceEvents() {
    try {
        const raw = localStorage.getItem(GEOFENCE_EVENT_KEY);
        const list = raw ? JSON.parse(raw) : [];
        return Array.isArray(list) ? list : [];
    } catch {
        return [];
    }
}

function createAlarms(vehicles = []) {
    const alarms = [];

    vehicles.forEach((vehicle) => {
        const speed = getSpeed(vehicle);
        const plate = vehicle?.plate || "-";

        if (speed >= 90) {
            alarms.push({
                level: "critical",
                title: "Hız Limiti",
                plate,
                message: `${speed} km/h hızla hareket ediyor.`,
            });
        }

        if (vehicle?.ignition && speed === 0) {
            alarms.push({
                level: "warning",
                title: "Rölanti",
                plate,
                message: "Kontak açık, araç hareket etmiyor.",
            });
        }

        const lastDate = getLastDate(vehicle);

        if (lastDate) {
            const diffMin = Math.floor((Date.now() - lastDate.getTime()) / 60000);

            if (diffMin > 60) {
                alarms.push({
                    level: "danger",
                    title: "Veri Eski",
                    plate,
                    message: `${Math.floor(diffMin / 60)} saat önce veri geldi.`,
                });
            }
        }
    });

    return alarms;
}

function createGeofenceAlarms(events = []) {
    return events.slice(0, 6).map((event) => ({
        level: event.status === "inside" ? "warning" : "danger",
        title: event.status === "inside" ? "Geofence İçinde" : "Geofence Dışında",
        plate: event.plate || "-",
        message: `${event.plate || "-"} ${event.geofenceName || "seçili alan"} ${event.status === "inside" ? "içinde." : "dışında."
            }`,
    }));
}

function createOperationFeed(vehicles = []) {
    const feed = [];

    vehicles.forEach((vehicle) => {
        const speed = getSpeed(vehicle);
        const plate = vehicle?.plate || "-";

        if (speed > 0) {
            feed.push({
                type: "moving",
                title: "Araç hareket halinde",
                plate,
                text: `${speed} km/h hızla ilerliyor.`,
            });
        }

        if (vehicle?.ignition && speed === 0) {
            feed.push({
                type: "idle",
                title: "Rölanti",
                plate,
                text: "Kontak açık, araç beklemede.",
            });
        }

        const lastDate = getLastDate(vehicle);

        if (lastDate) {
            feed.push({
                type: "data",
                title: "Son veri alındı",
                plate,
                text: lastDate.toLocaleTimeString("tr-TR"),
            });
        }
    });

    return feed;
}

function createGeofenceFeed(events = []) {
    return events.slice(0, 8).map((event) => ({
        type: event.status === "inside" ? "geofence-in" : "geofence-out",
        title: event.status === "inside" ? "Geofence içinde" : "Geofence dışında",
        plate: event.plate || "-",
        text: event.geofenceName || "Geofence alanı",
    }));
}

export default function Dashboard() {
    const [vehicles, setVehicles] = useState([]);
    const [geofenceEvents, setGeofenceEvents] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [loading, setLoading] = useState(false);

    async function loadData() {
        try {
            setLoading(true);

            const res = await fetch(API_URL);
            const json = await res.json();
            const data = Array.isArray(json) ? json : json.data || [];

            setVehicles(data);
            setGeofenceEvents(loadGeofenceEvents());
            setSelectedVehicle((prev) => prev || data[0] || null);
        } catch (err) {
            console.error("Dashboard verisi alınamadı:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();

        const timer = setInterval(loadData, 30000);

        return () => clearInterval(timer);
    }, []);

    const summary = useMemo(() => {
        return {
            total: vehicles.length,
            moving: vehicles.filter((v) => getStatus(v) === "moving").length,
            idle: vehicles.filter((v) => getStatus(v) === "idle").length,
            park: vehicles.filter((v) => getStatus(v) === "park").length,
            geofence: geofenceEvents.filter((e) => e.status === "inside").length,
            alarm: createAlarms(vehicles).length + geofenceEvents.length,
        };
    }, [vehicles, geofenceEvents]);

    const alarms = useMemo(() => {
        return [
            ...createGeofenceAlarms(geofenceEvents),
            ...createAlarms(vehicles),
        ].slice(0, 8);
    }, [vehicles, geofenceEvents]);

    const operationFeed = useMemo(() => {
        return [
            ...createGeofenceFeed(geofenceEvents),
            ...createOperationFeed(vehicles),
        ].slice(0, 12);
    }, [vehicles, geofenceEvents]);

    const fastestVehicles = useMemo(() => {
        return [...vehicles]
            .filter((vehicle) => getSpeed(vehicle) > 0)
            .sort((a, b) => getSpeed(b) - getSpeed(a))
            .slice(0, 8);
    }, [vehicles]);

    const idleVehicles = useMemo(() => {
        return vehicles
            .filter((vehicle) => vehicle?.ignition && getSpeed(vehicle) === 0)
            .slice(0, 8);
    }, [vehicles]);

    const parkedVehicles = useMemo(() => {
        return vehicles
            .filter((vehicle) => !vehicle?.ignition && getSpeed(vehicle) === 0)
            .slice(0, 8);
    }, [vehicles]);

    return (
        <div className="dashboard-page">
            <div className="dashboard-head">
                <div>
                    <span>Fleet Tracking System</span>
                    <h1>Canlı Filo Dashboard</h1>
                    <p>Tüm araçlar, canlı harita, alarmlar ve geofence olayları tek ekranda.</p>
                </div>

                <button onClick={loadData} disabled={loading}>
                    {loading ? "Yükleniyor..." : "Yenile"}
                </button>
            </div>

            <div className="dash-kpi-grid">
                <div>
                    <span>Toplam Araç</span>
                    <strong>{summary.total}</strong>
                </div>

                <div>
                    <span>Hareket Halinde</span>
                    <strong>{summary.moving}</strong>
                </div>

                <div>
                    <span>Rölantide</span>
                    <strong>{summary.idle}</strong>
                </div>

                <div>
                    <span>Park Halinde</span>
                    <strong>{summary.park}</strong>
                </div>

                <div>
                    <span>Geofence İçinde</span>
                    <strong>{summary.geofence}</strong>
                </div>

                <div>
                    <span>Alarm / Olay</span>
                    <strong>{summary.alarm}</strong>
                </div>
            </div>

            <div className="dashboard-main-grid">
                <section className="dashboard-map-card">
                    <div className="dash-section-title">
                        <div>
                            <h2>Canlı Harita</h2>
                            <p>{vehicles.length} araç izleniyor</p>
                        </div>
                    </div>

                    <Harita
                        vehicles={vehicles}
                        selectedPlate={selectedVehicle?.plate}
                        onVehicleClick={setSelectedVehicle}
                        height="620px"
                        zoom={6}
                    />
                </section>

                <aside className="dashboard-side">
                    <section className="dash-panel">
                        <h2>Seçili Araç</h2>

                        {selectedVehicle ? (
                            <div className="dash-selected">
                                <strong>{selectedVehicle.plate}</strong>
                                <span>{getSpeed(selectedVehicle)} km/h</span>
                                <p>
                                    {selectedVehicle.address ||
                                        selectedVehicle.location ||
                                        selectedVehicle.city ||
                                        "Adres bilgisi yok"}
                                </p>
                            </div>
                        ) : (
                            <p>Araç seçilmedi.</p>
                        )}
                    </section>

                    <section className="dash-panel">
                        <h2>Son Alarmlar</h2>

                        <div className="dash-alarm-list">
                            {alarms.length === 0 ? (
                                <div className="dash-empty">Aktif alarm yok.</div>
                            ) : (
                                alarms.map((alarm, index) => (
                                    <div
                                        className={`dash-alarm ${alarm.level}`}
                                        key={`${alarm.plate}-${alarm.title}-${index}`}
                                    >
                                        <span>{alarm.title}</span>
                                        <strong>{alarm.plate}</strong>
                                        <p>{alarm.message}</p>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="dash-panel">
                        <h2>Operasyon Akışı</h2>

                        <div className="operation-feed">
                            {operationFeed.length === 0 ? (
                                <div className="dash-empty">Operasyon kaydı yok.</div>
                            ) : (
                                operationFeed.map((item, index) => (
                                    <div
                                        className={`operation-item ${item.type}`}
                                        key={`${item.plate}-${index}`}
                                    >
                                        <span>{item.title}</span>
                                        <strong>{item.plate}</strong>
                                        <p>{item.text}</p>
                                    </div>
                                ))
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
                                fastestVehicles.map((vehicle) => (
                                    <div
                                        className="fast-vehicle"
                                        key={vehicle.id || vehicle.plate}
                                    >
                                        <strong>{vehicle.plate}</strong>
                                        <span>{getSpeed(vehicle)} km/h</span>
                                    </div>
                                ))
                            )}
                        </div>
                    </section>

                    <section className="dash-panel">
                        <h2>Rölanti / Park</h2>

                        <div className="idle-park-grid">
                            <div>
                                <span>Rölantide</span>
                                <strong>{idleVehicles.length}</strong>
                            </div>

                            <div>
                                <span>Parkta</span>
                                <strong>{parkedVehicles.length}</strong>
                            </div>
                        </div>

                        <div className="mini-vehicle-list">
                            {idleVehicles.slice(0, 4).map((vehicle) => (
                                <div key={vehicle.id || vehicle.plate}>
                                    <strong>{vehicle.plate}</strong>
                                    <span>Rölanti</span>
                                </div>
                            ))}
                        </div>
                    </section>
                </aside>
            </div>
        </div>
    );
}