import { useEffect, useMemo, useState } from "react";
import {
    MapContainer,
    TileLayer,
    Circle,
    Polygon,
    Popup,
    Marker,
    useMap,
} from "react-leaflet";
import L from "leaflet";
import { mobilizService } from "../services/mobiliz";
import "leaflet/dist/leaflet.css";
import "leaflet-draw/dist/leaflet.draw.css";
import "leaflet-draw";
import "./Geofence.css";

const STORAGE_KEY = "fts_geofences";
const EVENT_STORAGE_KEY = "fts_geofence_events";
const MAP_CENTER = [39.0, 35.0];

const vehicleIcon = L.divIcon({
    className: "geo-vehicle-marker",
    html: "🚚",
    iconSize: [34, 34],
    iconAnchor: [17, 17],
});

function createId() {
    return `geo-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function loadGeofences() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    } catch {
        return [];
    }
}

function saveGeofences(items) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}
function saveGeofenceEvents(events) {
    localStorage.setItem(EVENT_STORAGE_KEY, JSON.stringify(events));
}

function getVehiclePoint(vehicle) {
    const lat = Number(vehicle.latitude || vehicle.lat || vehicle.y);
    const lng = Number(vehicle.longitude || vehicle.lng || vehicle.lon || vehicle.x);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

    return { lat, lng };
}

function distanceMeters(a, b) {
    const R = 6371000;
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const lat1 = (a.lat * Math.PI) / 180;
    const lat2 = (b.lat * Math.PI) / 180;

    const x =
        Math.sin(dLat / 2) ** 2 +
        Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);

    return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function pointInPolygon(point, polygon) {
    let inside = false;

    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng;
        const yi = polygon[i].lat;
        const xj = polygon[j].lng;
        const yj = polygon[j].lat;

        const intersect =
            yi > point.lat !== yj > point.lat &&
            point.lng < ((xj - xi) * (point.lat - yi)) / (yj - yi) + xi;

        if (intersect) inside = !inside;
    }

    return inside;
}

function isVehicleInsideGeofence(vehicle, geofence) {
    const point = getVehiclePoint(vehicle);
    if (!point || !geofence) return false;

    if (geofence.type === "circle") {
        return distanceMeters(point, geofence.center) <= geofence.radius;
    }

    if (geofence.type === "polygon") {
        return pointInPolygon(point, geofence.points || []);
    }

    return false;
}

function DrawTools({ onCreated }) {
    const map = useMap();

    useEffect(() => {
        const drawnItems = new L.FeatureGroup();
        map.addLayer(drawnItems);

        const drawControl = new L.Control.Draw({
            position: "topright",
            draw: {
                polyline: false,
                marker: false,
                circlemarker: false,
                circle: true,
                polygon: true,
                rectangle: true,
            },
            edit: {
                featureGroup: drawnItems,
                edit: false,
                remove: false,
            },
        });

        map.addControl(drawControl);

        function handleCreated(e) {
            const layer = e.layer;
            drawnItems.addLayer(layer);
            onCreated(e);
            drawnItems.removeLayer(layer);
        }

        map.on(L.Draw.Event.CREATED, handleCreated);

        return () => {
            map.off(L.Draw.Event.CREATED, handleCreated);
            map.removeControl(drawControl);
            map.removeLayer(drawnItems);
        };
    }, [map, onCreated]);

    return null;
}

export default function Geofence() {
    const [geofences, setGeofences] = useState([]);
    const [vehicles, setVehicles] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [name, setName] = useState("");
    const [loading, setLoading] = useState(false);

    const selected = useMemo(
        () => geofences.find((item) => item.id === selectedId),
        [geofences, selectedId]
    );

    const insideVehicles = useMemo(() => {
        if (!selected) return [];
        return vehicles.filter((vehicle) => isVehicleInsideGeofence(vehicle, selected));
    }, [vehicles, selected]);

    const geofenceEvents = useMemo(() => {
        if (!selected) return [];

        return vehicles.map((vehicle) => {
            const inside = isVehicleInsideGeofence(vehicle, selected);

            return {
                plate: vehicle.plate || "-",
                status: inside ? "inside" : "outside",
                message: inside
                    ? `${vehicle.plate} seçili alan içinde.`
                    : `${vehicle.plate} seçili alan dışında.`,
                speed: vehicle.speed || vehicle.velocity || 0,
            };
        });
    }, [vehicles, selected]);

    useEffect(() => {
        if (!selected || geofenceEvents.length === 0) return;

        const eventsToSave = geofenceEvents.map((event) => ({
            ...event,
            geofenceId: selected.id,
            geofenceName: selected.name,
            createdAt: new Date().toISOString(),
        }));

        saveGeofenceEvents(eventsToSave);
    }, [geofenceEvents, selected]);
    async function loadVehicles() {
        try {
            setLoading(true);
            const list = await mobilizService.sonKonum();
            setVehicles(Array.isArray(list) ? list : []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        setGeofences(loadGeofences());
        loadVehicles();

        const timer = setInterval(loadVehicles, 30000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        saveGeofences(geofences);
    }, [geofences]);

    function handleCreated(e) {
        const layer = e.layer;
        const type = e.layerType;

        let item = null;

        if (type === "circle") {
            const center = layer.getLatLng();

            item = {
                id: createId(),
                name: `Geofence ${geofences.length + 1}`,
                type: "circle",
                center: {
                    lat: center.lat,
                    lng: center.lng,
                },
                radius: layer.getRadius(),
                createdAt: new Date().toISOString(),
            };
        }

        if (type === "polygon" || type === "rectangle") {
            const latlngs = layer.getLatLngs()?.[0] || [];

            item = {
                id: createId(),
                name: `Geofence ${geofences.length + 1}`,
                type: "polygon",
                points: latlngs.map((p) => ({
                    lat: p.lat,
                    lng: p.lng,
                })),
                createdAt: new Date().toISOString(),
            };
        }

        if (!item) return;

        setGeofences((prev) => [...prev, item]);
        setSelectedId(item.id);
        setName(item.name);
    }

    function renameSelected() {
        if (!selectedId || !name.trim()) return;

        setGeofences((prev) =>
            prev.map((item) =>
                item.id === selectedId ? { ...item, name: name.trim() } : item
            )
        );
    }

    function deleteSelected() {
        setGeofences((prev) => prev.filter((item) => item.id !== selectedId));
        setSelectedId("");
        setName("");
    }

    function clearAll() {
        setGeofences([]);
        setSelectedId("");
        setName("");
    }

    return (
        <div className="geofence-page">
            <div className="geofence-head">
                <div>
                    <span>Alan Yönetimi</span>
                    <h1>Geofence</h1>
                    <p>Alan çiz, canlı araçların giriş/çıkış durumunu takip et.</p>
                </div>

                <div className="geofence-head-actions">
                    <button type="button" onClick={loadVehicles}>
                        {loading ? "Yenileniyor..." : "Araçları Yenile"}
                    </button>

                    <button type="button" onClick={clearAll} className="danger">
                        Tümünü Temizle
                    </button>
                </div>
            </div>

            <div className="geofence-grid">
                <section className="geofence-map-card">
                    <MapContainer center={MAP_CENTER} zoom={6} className="geofence-map">
                        <TileLayer
                            attribution="© OpenStreetMap"
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />

                        <DrawTools onCreated={handleCreated} />

                        {geofences.map((item) => {
                            const isSelected = selectedId === item.id;

                            if (item.type === "circle") {
                                return (
                                    <Circle
                                        key={item.id}
                                        center={[item.center.lat, item.center.lng]}
                                        radius={item.radius}
                                        pathOptions={{
                                            weight: isSelected ? 4 : 2,
                                            fillOpacity: isSelected ? 0.22 : 0.12,
                                        }}
                                        eventHandlers={{
                                            click: () => {
                                                setSelectedId(item.id);
                                                setName(item.name);
                                            },
                                        }}
                                    >
                                        <Popup>
                                            <strong>{item.name}</strong>
                                            <br />
                                            Daire
                                            <br />
                                            Radius: {(item.radius / 1000).toFixed(2)} km
                                        </Popup>
                                    </Circle>
                                );
                            }

                            return (
                                <Polygon
                                    key={item.id}
                                    positions={item.points.map((p) => [p.lat, p.lng])}
                                    pathOptions={{
                                        weight: isSelected ? 4 : 2,
                                        fillOpacity: isSelected ? 0.22 : 0.12,
                                    }}
                                    eventHandlers={{
                                        click: () => {
                                            setSelectedId(item.id);
                                            setName(item.name);
                                        },
                                    }}
                                >
                                    <Popup>
                                        <strong>{item.name}</strong>
                                        <br />
                                        Çokgen
                                        <br />
                                        Nokta: {item.points.length}
                                    </Popup>
                                </Polygon>
                            );
                        })}

                        {vehicles.map((vehicle) => {
                            const point = getVehiclePoint(vehicle);
                            if (!point) return null;

                            const isInside = selected
                                ? isVehicleInsideGeofence(vehicle, selected)
                                : false;

                            return (
                                <Marker
                                    key={vehicle.id || vehicle.plate}
                                    position={[point.lat, point.lng]}
                                    icon={vehicleIcon}
                                >
                                    <Popup>
                                        <strong>{vehicle.plate}</strong>
                                        <br />
                                        {vehicle.speed || vehicle.velocity || 0} km/h
                                        <br />
                                        {isInside ? "Seçili alan içinde" : "Alan dışında"}
                                    </Popup>
                                </Marker>
                            );
                        })}
                    </MapContainer>
                </section>

                <aside className="geofence-side">
                    <section>
                        <h2>Özet</h2>

                        <div className="geofence-summary">
                            <div>
                                <span>Alan</span>
                                <strong>{geofences.length}</strong>
                            </div>

                            <div>
                                <span>Araç</span>
                                <strong>{vehicles.length}</strong>
                            </div>

                            <div>
                                <span>İçeride</span>
                                <strong>{insideVehicles.length}</strong>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h2>Geofence Listesi</h2>

                        {geofences.length === 0 ? (
                            <div className="geofence-empty">Henüz alan oluşturulmadı.</div>
                        ) : (
                            <div className="geofence-list">
                                {geofences.map((item) => (
                                    <button
                                        key={item.id}
                                        type="button"
                                        className={selectedId === item.id ? "active" : ""}
                                        onClick={() => {
                                            setSelectedId(item.id);
                                            setName(item.name);
                                        }}
                                    >
                                        <strong>{item.name}</strong>
                                        <span>{item.type === "circle" ? "Daire" : "Çokgen"}</span>
                                    </button>
                                ))}
                            </div>
                        )}
                    </section>

                    <section>
                        <h2>Seçili Alan</h2>

                        {selected ? (
                            <>
                                <label className="geofence-label">
                                    Alan adı
                                    <input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                    />
                                </label>

                                <div className="geofence-actions">
                                    <button type="button" onClick={renameSelected}>
                                        Kaydet
                                    </button>

                                    <button
                                        type="button"
                                        onClick={deleteSelected}
                                        className="danger"
                                    >
                                        Sil
                                    </button>
                                </div>

                                <div className="geofence-detail">
                                    <div>
                                        <span>Tip</span>
                                        <strong>
                                            {selected.type === "circle" ? "Daire" : "Çokgen"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>İçerideki Araç</span>
                                        <strong>{insideVehicles.length}</strong>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="geofence-empty">
                                Haritadan veya listeden bir alan seç.
                            </div>
                        )}
                    </section>

                    <section>
                        <h2>Alan İçindeki Araçlar</h2>

                        {!selected ? (
                            <div className="geofence-empty">Önce bir alan seç.</div>
                        ) : insideVehicles.length === 0 ? (
                            <div className="geofence-empty">Bu alanda araç yok.</div>
                        ) : (
                            <div className="inside-vehicle-list">
                                {insideVehicles.map((vehicle) => (
                                    <div key={vehicle.id || vehicle.plate}>
                                        <strong>{vehicle.plate}</strong>
                                        <span>
                                            {vehicle.speed || vehicle.velocity || 0} km/h
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                    <section>
                        <h2>Canlı Geofence Olayları</h2>

                        {!selected ? (
                            <div className="geofence-empty">Olayları görmek için alan seç.</div>
                        ) : geofenceEvents.length === 0 ? (
                            <div className="geofence-empty">Araç verisi yok.</div>
                        ) : (
                            <div className="geofence-event-list">
                                {geofenceEvents.slice(0, 10).map((event, index) => (
                                    <div
                                        key={`${event.plate}-${index}`}
                                        className={`geofence-event ${event.status}`}
                                    >
                                        <strong>{event.plate}</strong>
                                        <span>{event.message}</span>
                                        <small>{event.speed} km/h</small>
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </aside>
            </div>
        </div>
    );
}