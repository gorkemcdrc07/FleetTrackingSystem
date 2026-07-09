import { useEffect, useMemo, useState } from "react";
import Harita from "../components/Harita/Harita";
import "../components/Harita/Harita.css";
import "./OperasyonMerkezi.css";
import PageHeader from "../components/UI/PageHeader";
import StatCard from "../components/UI/StatCard";
import Panel from "../components/UI/Panel";

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

function getStatusText(vehicle) {
    const status = getStatus(vehicle);

    if (status === "moving") return "Hareket Halinde";
    if (status === "idle") return "Rölantide";
    return "Park Halinde";
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

function getAddress(vehicle) {
    return vehicle?.address || vehicle?.location || vehicle?.city || "Adres bilgisi yok";
}

function normalizePlate(value) {
    return String(value || "").replace(/\s/g, "").toUpperCase();
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

function createVehicleOperations(vehicles = []) {
    const events = [];

    vehicles.forEach((vehicle) => {
        const speed = getSpeed(vehicle);
        const plate = vehicle?.plate || "-";
        const lastDate = getLastDate(vehicle);

        if (speed > 0) {
            events.push({
                type: "moving",
                title: "Araç hareket halinde",
                plate,
                text: `${speed} km/h hızla ilerliyor.`,
                time: lastDate,
            });
        }

        if (vehicle?.ignition && speed === 0) {
            events.push({
                type: "idle",
                title: "Rölanti",
                plate,
                text: "Kontak açık, araç beklemede.",
                time: lastDate,
            });
        }

        if (!vehicle?.ignition && speed === 0) {
            events.push({
                type: "park",
                title: "Park",
                plate,
                text: "Araç park halinde.",
                time: lastDate,
            });
        }
    });

    return events;
}

function createGeofenceOperations(events = []) {
    return events.map((event) => ({
        type: event.status === "inside" ? "geofence-in" : "geofence-out",
        title: event.status === "inside" ? "Geofence içinde" : "Geofence dışında",
        plate: event.plate || "-",
        text: event.geofenceName || "Geofence alanı",
        time: event.createdAt ? new Date(event.createdAt) : null,
    }));
}

function formatTime(value) {
    if (!value) return "-";

    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function OperasyonMerkezi() {
    const [vehicles, setVehicles] = useState([]);
    const [geofenceEvents, setGeofenceEvents] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [loading, setLoading] = useState(false);
    const [lastRefresh, setLastRefresh] = useState(null);

    async function loadData() {
        try {
            setLoading(true);

            const res = await fetch(API_URL);
            const json = await res.json();
            const data = Array.isArray(json) ? json : json.data || [];

            setVehicles(data);
            setGeofenceEvents(loadGeofenceEvents());
            setSelectedVehicle((prev) => prev || data[0] || null);
            setLastRefresh(new Date());
        } catch (err) {
            console.error("Operasyon verisi alınamadı:", err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadData();

        const timer = setInterval(loadData, 30000);

        return () => clearInterval(timer);
    }, []);

    const filteredVehicles = useMemo(() => {
        return vehicles.filter((vehicle) => {
            const plateMatch = normalizePlate(vehicle?.plate).includes(
                normalizePlate(search)
            );

            const statusMatch =
                statusFilter === "all" || getStatus(vehicle) === statusFilter;

            return plateMatch && statusMatch;
        });
    }, [vehicles, search, statusFilter]);

    const summary = useMemo(() => {
        return {
            total: vehicles.length,
            moving: vehicles.filter((v) => getStatus(v) === "moving").length,
            idle: vehicles.filter((v) => getStatus(v) === "idle").length,
            park: vehicles.filter((v) => getStatus(v) === "park").length,
            geofence: geofenceEvents.filter((e) => e.status === "inside").length,
        };
    }, [vehicles, geofenceEvents]);

    const operations = useMemo(() => {
        return [
            ...createGeofenceOperations(geofenceEvents),
            ...createVehicleOperations(vehicles),
        ]
            .sort((a, b) => {
                const aTime = a.time ? new Date(a.time).getTime() : 0;
                const bTime = b.time ? new Date(b.time).getTime() : 0;
                return bTime - aTime;
            })
            .slice(0, 30);
    }, [vehicles, geofenceEvents]);

    return (
        <div className="operasyon-page">
            <PageHeader
                eyebrow="Canlı Kontrol Merkezi"
                title="Operasyon Merkezi"
                description={`Harita, araçlar, geofence olayları ve operasyon akışı tek ekranda.${lastRefresh
                        ? ` Son yenileme: ${lastRefresh.toLocaleTimeString("tr-TR")}`
                        : ""
                    }`}
                actions={
                    <button onClick={loadData} disabled={loading}>
                        {loading ? "Yenileniyor..." : "Yenile"}
                    </button>
                }
            />

            <div className="operasyon-kpi-grid">
                <StatCard label="Toplam Araç" value={summary.total} />
                <StatCard label="Hareket" value={summary.moving} tone="success" />
                <StatCard label="Rölanti" value={summary.idle} tone="warning" />
                <StatCard label="Park" value={summary.park} />
                <StatCard label="Geofence İçinde" value={summary.geofence} tone="danger" />
            </div>
            <div className="operasyon-layout">
                <Panel
                    className="operasyon-map-card"
                    title="Canlı Harita"
                    subtitle={`${filteredVehicles.length} araç görüntüleniyor`}
                >
                    <Harita
                        vehicles={filteredVehicles}
                        selectedPlate={selectedVehicle?.plate}
                        onVehicleClick={setSelectedVehicle}
                        height="720px"
                        zoom={6}
                    />
                </Panel>

                <aside className="operasyon-side">
                    <Panel title="Araçlar" className="operasyon-panel">
                        <h2>Araçlar</h2>

                        <div className="operasyon-filters">
                            <input
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                placeholder="Plaka ara..."
                            />

                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">Tüm Durumlar</option>
                                <option value="moving">Hareket</option>
                                <option value="idle">Rölanti</option>
                                <option value="park">Park</option>
                            </select>
                        </div>

                        <div className="operasyon-vehicle-list">
                            {filteredVehicles.map((vehicle) => (
                                <button
                                    key={vehicle.id || vehicle.plate}
                                    type="button"
                                    className={
                                        selectedVehicle?.plate === vehicle.plate
                                            ? "active"
                                            : ""
                                    }
                                    onClick={() => setSelectedVehicle(vehicle)}
                                >
                                    <div>
                                        <strong>{vehicle.plate}</strong>
                                        <span>{getStatusText(vehicle)}</span>
                                    </div>

                                    <em>{getSpeed(vehicle)} km/h</em>
                                </button>
                            ))}
                        </div>
                    </Panel>

                    <Panel title="Seçili Araç" className="operasyon-panel">

                        {selectedVehicle ? (
                            <div className="operasyon-selected">
                                <strong>{selectedVehicle.plate}</strong>
                                <span>{getStatusText(selectedVehicle)}</span>

                                <div className="operasyon-selected-grid">
                                    <div>
                                        <small>Hız</small>
                                        <b>{getSpeed(selectedVehicle)} km/h</b>
                                    </div>

                                    <div>
                                        <small>Kontak</small>
                                        <b>
                                            {selectedVehicle.ignition ||
                                                selectedVehicle.engine
                                                ? "Açık"
                                                : "Kapalı"}
                                        </b>
                                    </div>
                                </div>

                                <p>{getAddress(selectedVehicle)}</p>
                            </div>
                        ) : (
                            <div className="operasyon-empty">
                                Araç seçilmedi.
                            </div>
                        )}
                    </Panel>

                    <Panel title="Canlı Operasyon Akışı" className="operasyon-panel">

                        <div className="operasyon-timeline">
                            {operations.length === 0 ? (
                                <div className="operasyon-empty">
                                    Operasyon kaydı yok.
                                </div>
                            ) : (
                                operations.map((item, index) => (
                                    <div
                                        className={`operasyon-event ${item.type}`}
                                        key={`${item.plate}-${item.type}-${index}`}
                                    >
                                        <time>{formatTime(item.time)}</time>

                                        <div>
                                            <span>{item.title}</span>
                                            <strong>{item.plate}</strong>
                                            <p>{item.text}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </Panel>
                </aside>
            </div>
        </div>
    );
}