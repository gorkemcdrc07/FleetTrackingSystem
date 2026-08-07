import { useEffect, useMemo, useRef, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Polyline,
    Marker,
    Popup,
    useMap,
} from "react-leaflet";
import L from "leaflet";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
} from "recharts";
import { mobilizService } from "../services/mobiliz";
import { readStorageJson, removeStorageItem, STORAGE_KEYS } from "../services/browserStorage";
import "leaflet/dist/leaflet.css";
import "./Playback.css";

const MAP_CENTER = [39.0, 35.0];

const truckIcon = L.divIcon({
    className: "playback-truck-marker",
    html: "🚚",
    iconSize: [42, 42],
    iconAnchor: [21, 21],
});

const startIcon = L.divIcon({
    className: "playback-start-marker",
    html: "B",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
});

const endIcon = L.divIcon({
    className: "playback-end-marker",
    html: "S",
    iconSize: [36, 36],
    iconAnchor: [18, 18],
});

const stopIcon = L.divIcon({
    className: "playback-stop-marker",
    html: "⏸",
    iconSize: [32, 32],
    iconAnchor: [16, 16],
});

function getPoint(item) {
    const lat = Number(item.latitude || item.lat || item.y);
    const lng = Number(item.longitude || item.lng || item.lon || item.x);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return {
        lat,
        lng,
        speed: Number(item.speed || item.velocity || 0),
        date:
            item.gpsDate ||
            item.activityDate ||
            item.dataTime ||
            item.date ||
            item.time,
        address: item.address || item.location || "",
    };
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("tr-TR");
}

function distanceKm(a, b) {
    const R = 6371;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;

    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function getMaxSpeed(route) {
    if (!route.length) return 0;
    return Math.max(...route.map((p) => Number(p.speed || 0)));
}

function getAverageSpeed(route) {
    const moving = route.filter((p) => Number(p.speed || 0) > 0);
    if (!moving.length) return 0;

    const total = moving.reduce((sum, p) => sum + Number(p.speed || 0), 0);
    return total / moving.length;
}

function detectStops(route) {
    const stops = [];
    let start = null;

    route.forEach((point, index) => {
        const speed = Number(point.speed || 0);

        if (speed === 0 && !start) {
            start = { ...point, startIndex: index };
        }

        if ((speed > 0 || index === route.length - 1) && start) {
            const endPoint = route[index - 1] || point;

            stops.push({
                ...start,
                endDate: endPoint.date,
                endIndex: index - 1,
            });

            start = null;
        }
    });

    return stops;
}

function getVehicleStatus(vehicle) {
    const speed = Number(vehicle?.speed || vehicle?.velocity || 0);

    if (speed > 0) return "Hareket Halinde";
    if (vehicle?.ignition || vehicle?.engine) return "Rölantide";
    return "Park Halinde";
}

function getVehicleAddress(vehicle) {
    return vehicle?.address || vehicle?.location || vehicle?.city || "Adres bilgisi yok";
}

function getVehicleSpeed(vehicle) {
    return Number(vehicle?.speed || vehicle?.velocity || 0);
}

function MapFocus({ route, selectedPoint }) {
    const map = useMap();

    useEffect(() => {
        if (route.length > 1) {
            map.fitBounds(route.map((p) => [p.lat, p.lng]), {
                padding: [42, 42],
            });
            return;
        }

        if (selectedPoint) {
            map.flyTo([selectedPoint.lat, selectedPoint.lng], 14);
        }
    }, [map, route, selectedPoint]);

    return null;
}

export default function Playback() {
    const timerRef = useRef(null);
    const autoLoadRef = useRef(false);

    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicleFromDrawer, setSelectedVehicleFromDrawer] = useState(null);
    const [plate, setPlate] = useState("");
    const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
    const [route, setRoute] = useState([]);
    const [index, setIndex] = useState(0);
    const [speed, setSpeed] = useState(1);
    const [playing, setPlaying] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const selectedPoint = route[index] || null;

    const completedRoute = useMemo(() => {
        if (!route.length) return [];
        return route.slice(0, index + 1);
    }, [route, index]);

    const remainingRoute = useMemo(() => {
        if (!route.length) return [];
        return route.slice(index);
    }, [route, index]);

    const progressPercent = useMemo(() => {
        if (route.length <= 1) return 0;
        return Math.round((index / (route.length - 1)) * 100);
    }, [route.length, index]);

    const totalKm = useMemo(() => {
        if (route.length < 2) return 0;

        return route.reduce((total, point, i) => {
            if (i === 0) return total;
            return total + distanceKm(route[i - 1], point);
        }, 0);
    }, [route]);

    const maxSpeed = useMemo(() => getMaxSpeed(route), [route]);
    const averageSpeed = useMemo(() => getAverageSpeed(route), [route]);
    const stops = useMemo(() => detectStops(route), [route]);

    const speedChartData = useMemo(() => {
        return route.map((p, i) => ({
            index: i,
            speed: Number(p.speed || 0),
            time: formatDate(p.date),
        }));
    }, [route]);

    async function loadVehicles() {
        try {
            const list = await mobilizService.araclar();
            const vehicleList = Array.isArray(list) ? list : [];

            setVehicles(vehicleList);

            if (!plate && !autoLoadRef.current && vehicleList[0]?.plate) {
                setPlate(vehicleList[0].plate);
            }
        } catch (err) {
            console.error(err);
            setError("Araç listesi alınamadı.");
        }
    }

    async function loadPlayback(targetPlate = plate, targetDate = date) {
        if (!targetPlate || !targetDate) return;

        try {
            setLoading(true);
            setError("");
            setPlaying(false);
            setIndex(0);

            const start = `${targetDate}T00:00:00+0000`;
            const end = `${targetDate}T23:59:59+0000`;

            const data = await mobilizService.rotaDetayi(targetPlate, start, end);

            const points = data
                .map(getPoint)
                .filter(Boolean)
                .sort(
                    (a, b) =>
                        new Date(a.date || 0).getTime() -
                        new Date(b.date || 0).getTime()
                );

            setRoute(points);

            if (!points.length) {
                setError("Seçilen tarih için rota verisi bulunamadı.");
            }

            if (points.length === 1) {
                setError(
                    "Bu tarihte sadece 1 konum noktası geldi. Playback için daha fazla nokta gerekiyor."
                );
            }
        } catch (err) {
            console.error(err);
            setError("Playback verisi alınamadı.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        try {
            const vehicle = readStorageJson(STORAGE_KEYS.playbackVehicle, null);

            if (!vehicle) return;

            if (vehicle?.plate) {
                autoLoadRef.current = true;
                setSelectedVehicleFromDrawer(vehicle);
                setPlate(vehicle.plate);
            }

            removeStorageItem(STORAGE_KEYS.playbackVehicle);
        } catch (err) {
            console.error(err);
        }
    }, []);

    useEffect(() => {
        loadVehicles();
    }, []);

    useEffect(() => {
        if (!autoLoadRef.current || !plate || !date) return;

        autoLoadRef.current = false;
        loadPlayback(plate, date);
    }, [plate, date]);

    useEffect(() => {
        clearInterval(timerRef.current);

        if (!playing || route.length <= 1) return;

        timerRef.current = setInterval(() => {
            setIndex((prev) => {
                if (prev >= route.length - 1) {
                    setPlaying(false);
                    return prev;
                }

                return prev + 1;
            });
        }, Math.max(120, 900 / speed));

        return () => clearInterval(timerRef.current);
    }, [playing, route, speed]);

    return (
        <div className="playback-page">
            <div className="playback-head">
                <div>
                    <span>Geçmiş Rota Oynatma</span>
                    <h1>Playback</h1>
                    <p>Araçların geçmiş konumlarını harita üzerinde oynat.</p>
                </div>

                <button onClick={() => loadPlayback()} disabled={loading || !plate}>
                    {loading ? "Rota Yükleniyor..." : "Rotayı Getir"}
                </button>
            </div>

            {selectedVehicleFromDrawer && (
                <div className="playback-selected-vehicle">
                    <div>
                        <span>Seçili Araç</span>
                        <strong>{selectedVehicleFromDrawer.plate}</strong>
                        <small>{getVehicleStatus(selectedVehicleFromDrawer)}</small>
                    </div>

                    <div>
                        <span>Mevcut Hız</span>
                        <strong>{getVehicleSpeed(selectedVehicleFromDrawer)} km/h</strong>
                        <small>
                            {selectedVehicleFromDrawer.ignition ||
                                selectedVehicleFromDrawer.engine
                                ? "Kontak Açık"
                                : "Kontak Kapalı"}
                        </small>
                    </div>

                    <div>
                        <span>Son Konum</span>
                        <strong>{getVehicleAddress(selectedVehicleFromDrawer)}</strong>
                        <small>Drawer üzerinden aktarıldı</small>
                    </div>
                </div>
            )}

            <div className="playback-toolbar">
                <label>
                    Araç
                    <select
                        value={plate}
                        onChange={(e) => {
                            setPlate(e.target.value);
                            setSelectedVehicleFromDrawer(null);
                        }}
                    >
                        {vehicles.map((vehicle) => (
                            <option
                                key={vehicle.id || vehicle.plate}
                                value={vehicle.plate}
                            >
                                {vehicle.plate}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Tarih
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                    />
                </label>

                <label>
                    Hız
                    <div className="speed-buttons">
                        {[1, 2, 4, 8, 16].map((item) => (
                            <button
                                key={item}
                                type="button"
                                className={speed === item ? "active" : ""}
                                onClick={() => setSpeed(item)}
                            >
                                {item}x
                            </button>
                        ))}
                    </div>
                </label>
            </div>

            {error && <div className="playback-error">{error}</div>}

            <div className="playback-grid">
                <section className="playback-map-card">
                    <MapContainer
                        center={MAP_CENTER}
                        zoom={6}
                        className="playback-map"
                    >
                        <TileLayer
                            attribution="© OpenStreetMap"
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        {remainingRoute.length > 1 && (
                            <Polyline
                                positions={remainingRoute.map((p) => [p.lat, p.lng])}
                                weight={6}
                                opacity={0.45}
                                pathOptions={{
                                    color: "#2563eb",
                                }}
                            />
                        )}

                        {completedRoute.length > 1 && (
                            <Polyline
                                positions={completedRoute.map((p) => [p.lat, p.lng])}
                                weight={7}
                                opacity={0.95}
                                pathOptions={{
                                    color: "#64748b",
                                }}
                            />
                        )}

                        {route[0] && (
                            <Marker
                                position={[route[0].lat, route[0].lng]}
                                icon={startIcon}
                            >
                                <Popup>Başlangıç: {formatDate(route[0].date)}</Popup>
                            </Marker>
                        )}

                        {route.length > 1 && (
                            <Marker
                                position={[
                                    route[route.length - 1].lat,
                                    route[route.length - 1].lng,
                                ]}
                                icon={endIcon}
                            >
                                <Popup>
                                    Bitiş: {formatDate(route[route.length - 1].date)}
                                </Popup>
                            </Marker>
                        )}

                        {stops.map((stop, i) => (
                            <Marker
                                key={`stop-${i}`}
                                position={[stop.lat, stop.lng]}
                                icon={stopIcon}
                            >
                                <Popup>
                                    Duraklama
                                    <br />
                                    Başlangıç: {formatDate(stop.date)}
                                    <br />
                                    Bitiş: {formatDate(stop.endDate)}
                                </Popup>
                            </Marker>
                        ))}

                        {selectedPoint && (
                            <Marker
                                position={[selectedPoint.lat, selectedPoint.lng]}
                                icon={truckIcon}
                            >
                                <Popup>
                                    {plate}
                                    <br />
                                    {selectedPoint.speed} km/h
                                    <br />
                                    {formatDate(selectedPoint.date)}
                                </Popup>
                            </Marker>
                        )}

                        <MapFocus route={route} selectedPoint={selectedPoint} />
                    </MapContainer>

                    <div className="playback-map-floating">
                        <span>Canlı Playback</span>
                        <strong>{plate || "-"}</strong>
                        <p>{selectedPoint ? `${selectedPoint.speed} km/h` : "-"}</p>

                        <div className="playback-progress">
                            <div style={{ width: `${progressPercent}%` }} />
                        </div>

                        <small>
                            {route.length ? index + 1 : 0} / {route.length} nokta
                        </small>
                    </div>
                </section>

                <aside className="playback-side">
                    <section>
                        <h2>Rota Özeti</h2>

                        <div className="playback-kpi">
                            <div>
                                <span>Nokta</span>
                                <strong>{route.length}</strong>
                            </div>

                            <div>
                                <span>Toplam KM</span>
                                <strong>{totalKm.toFixed(1)}</strong>
                            </div>

                            <div>
                                <span>Maks. Hız</span>
                                <strong>{maxSpeed} km/h</strong>
                            </div>

                            <div>
                                <span>Ort. Hız</span>
                                <strong>{averageSpeed.toFixed(1)} km/h</strong>
                            </div>

                            <div>
                                <span>Duraklama</span>
                                <strong>{stops.length}</strong>
                            </div>

                            <div>
                                <span>Başlangıç</span>
                                <strong>{formatDate(route[0]?.date)}</strong>
                            </div>

                            <div>
                                <span>Bitiş</span>
                                <strong>
                                    {formatDate(route[route.length - 1]?.date)}
                                </strong>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2>Oynatma</h2>

                        <div className="playback-timeline-info">
                            <span>
                                {route.length ? index + 1 : 0} / {route.length}
                            </span>

                            <strong>
                                {selectedPoint ? formatDate(selectedPoint.date) : "-"}
                            </strong>
                        </div>

                        <div className="playback-controls playback-controls-advanced">
                            <button
                                type="button"
                                onClick={() => setIndex(0)}
                                disabled={route.length === 0}
                            >
                                ⏮ Baştan
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setIndex((prev) => Math.max(prev - 1, 0))
                                }
                                disabled={route.length === 0}
                            >
                                ← Geri
                            </button>

                            <button
                                type="button"
                                onClick={() => setPlaying((prev) => !prev)}
                                disabled={route.length <= 1}
                            >
                                {playing ? "⏸ Duraklat" : "▶ Oynat"}
                            </button>

                            <button
                                type="button"
                                onClick={() =>
                                    setIndex((prev) =>
                                        Math.min(prev + 1, route.length - 1)
                                    )
                                }
                                disabled={route.length === 0}
                            >
                                İleri →
                            </button>
                        </div>

                        <input
                            type="range"
                            min="0"
                            max={Math.max(route.length - 1, 0)}
                            value={index}
                            onChange={(e) => setIndex(Number(e.target.value))}
                            disabled={route.length === 0}
                        />

                        <div className="playback-range-dates">
                            <span>{formatDate(route[0]?.date)}</span>
                            <span>{formatDate(route[route.length - 1]?.date)}</span>
                        </div>
                    </section>

                    <section>
                        <h2>Anlık Nokta</h2>

                        {selectedPoint ? (
                            <div className="point-card">
                                <strong>{plate}</strong>
                                <span>{selectedPoint.speed} km/h</span>
                                <p>{formatDate(selectedPoint.date)}</p>
                                <small>
                                    {selectedPoint.lat}, {selectedPoint.lng}
                                </small>
                            </div>
                        ) : (
                            <div className="playback-empty">Rota seçilmedi.</div>
                        )}
                    </section>

                    <section>
                        <h2>Hız Grafiği</h2>

                        {speedChartData.length === 0 ? (
                            <div className="playback-empty">Grafik verisi yok.</div>
                        ) : (
                            <div className="speed-chart">
                                <ResponsiveContainer width="100%" height={180}>
                                    <LineChart data={speedChartData}>
                                        <XAxis dataKey="index" hide />
                                        <YAxis width={30} />
                                        <Tooltip
                                            formatter={(value) => [
                                                `${value} km/h`,
                                                "Hız",
                                            ]}
                                            labelFormatter={(label) =>
                                                speedChartData[label]?.time || "-"
                                            }
                                        />
                                        <Line
                                            type="monotone"
                                            dataKey="speed"
                                            strokeWidth={3}
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        )}
                    </section>

                    <section>
                        <h2>Duraklamalar</h2>

                        {stops.length === 0 ? (
                            <div className="playback-empty">
                                Duraklama bulunamadı.
                            </div>
                        ) : (
                            <div className="stop-list">
                                {stops.slice(0, 8).map((stop, i) => (
                                    <button
                                        key={`stop-list-${i}`}
                                        type="button"
                                        onClick={() => setIndex(stop.startIndex)}
                                    >
                                        <strong>Duraklama #{i + 1}</strong>
                                        <span>{formatDate(stop.date)}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>
                </aside>
            </div>
        </div>
    );
}
