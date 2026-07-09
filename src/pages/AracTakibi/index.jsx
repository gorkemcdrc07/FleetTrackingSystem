import { useEffect, useMemo, useState } from "react";
import Harita from "../../components/Harita/Harita";
import Filtreler from "../../components/Harita/Filtreler";
import AracDetayPaneli from "./AracDetayPaneli";
import "../../components/Harita/Harita.css";

const API_URL = "http://localhost:5000/api/mobiliz/activity-last";

function normalizePlate(value) {
    return String(value || "").replace(/\s/g, "").toUpperCase();
}

function getStatus(vehicle) {
    const speed = Number(vehicle?.speed || vehicle?.velocity || 0);

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

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("tr-TR");
}

export default function AracTakibi() {
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const [filters, setFilters] = useState({
        search: "",
        status: "all",
        fleet: "",
        group: "",
    });

    async function loadVehicles() {
        try {
            setLoading(true);
            setError("");

            const res = await fetch(API_URL);
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.message || "Mobiliz verisi alınamadı.");
            }

            const data = Array.isArray(json) ? json : json.data || [];

            setVehicles(data);

            setSelectedVehicle((prev) => {
                if (!prev) return data[0] || null;

                return (
                    data.find(
                        (item) =>
                            normalizePlate(item.plate) ===
                            normalizePlate(prev.plate)
                    ) ||
                    data[0] ||
                    null
                );
            });
        } catch (err) {
            console.error(err);
            setError("Mobiliz araç verileri alınamadı.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadVehicles();

        const timer = setInterval(loadVehicles, 30000);

        return () => clearInterval(timer);
    }, []);

    const filteredVehicles = useMemo(() => {
        return vehicles.filter((vehicle) => {
            const plateMatch = normalizePlate(vehicle.plate).includes(
                normalizePlate(filters.search)
            );

            const statusMatch =
                filters.status === "all" ||
                getStatus(vehicle) === filters.status;

            const fleetMatch =
                !filters.fleet || vehicle.fleetName === filters.fleet;

            const groupMatch =
                !filters.group || vehicle.groupName === filters.group;

            return plateMatch && statusMatch && fleetMatch && groupMatch;
        });
    }, [vehicles, filters]);

    const summary = useMemo(() => {
        return {
            total: vehicles.length,
            moving: vehicles.filter((v) => getStatus(v) === "moving").length,
            idle: vehicles.filter((v) => getStatus(v) === "idle").length,
            park: vehicles.filter((v) => getStatus(v) === "park").length,
        };
    }, [vehicles]);

    const selectedCoordinate = getCoordinate(selectedVehicle);

    const selectedMapsUrl =
        selectedCoordinate.latitude && selectedCoordinate.longitude
            ? `https://www.google.com/maps?q=${selectedCoordinate.latitude},${selectedCoordinate.longitude}`
            : "";

    return (
        <div className="arac-takibi-page premium">
            <div className="arac-takibi-header premium">
                <div>
                    <span>Mobiliz Entegrasyonu</span>
                    <h1>Araç Takibi</h1>
                    <p>Canlı araç konumları, hız ve kontak durumları.</p>
                </div>

                <button onClick={loadVehicles} disabled={loading}>
                    {loading ? "Yükleniyor..." : "Yenile"}
                </button>
            </div>

            <div className="arac-ozet-grid">
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
            </div>

            {error && <div className="mobiliz-error">{error}</div>}

            <Filtreler
                vehicles={vehicles}
                filters={filters}
                onChange={setFilters}
            />

            <div className="arac-takibi-layout premium">
                <aside className="arac-listesi premium">
                    <div className="arac-listesi-head">
                        <strong>Araçlar</strong>
                        <span>{filteredVehicles.length} kayıt</span>
                    </div>

                    {filteredVehicles.map((vehicle) => (
                        <button
                            key={vehicle.id || vehicle.plate}
                            className={
                                selectedVehicle?.plate === vehicle.plate
                                    ? "arac-list-item active"
                                    : "arac-list-item"
                            }
                            onClick={() => {
                                setSelectedVehicle(vehicle);
                                setDrawerOpen(true);
                            }}
                        >
                            <div className="arac-item-top">
                                <strong>{vehicle.plate}</strong>

                                <span className={`mini-status ${getStatus(vehicle)}`}>
                                    {getStatusText(vehicle)}
                                </span>
                            </div>

                            <small>
                                {vehicle.address ||
                                    vehicle.location ||
                                    vehicle.city ||
                                    "Konum bilgisi yok"}
                            </small>

                            <em>
                                {vehicle.speed || vehicle.velocity || 0} km/h
                            </em>
                        </button>
                    ))}
                </aside>

                <div className="arac-harita-alani premium">
                    <Harita
                        vehicles={filteredVehicles}
                        selectedPlate={selectedVehicle?.plate}
                        onVehicleClick={(vehicle) => {
                            setSelectedVehicle(vehicle);
                            setDrawerOpen(true);
                        }}
                        height="720px"
                        zoom={6}
                    />
                </div>
            </div>

            {selectedVehicle && (
                <div className="arac-detay-bar premium">
                    <div>
                        <span>Seçili Araç</span>
                        <strong>{selectedVehicle.plate}</strong>
                    </div>

                    <div>
                        <span>Durum</span>
                        <strong>{getStatusText(selectedVehicle)}</strong>
                    </div>

                    <div>
                        <span>Hız</span>
                        <strong>
                            {selectedVehicle.speed ||
                                selectedVehicle.velocity ||
                                0}{" "}
                            km/h
                        </strong>
                    </div>

                    <div>
                        <span>Kontak</span>
                        <strong>
                            {selectedVehicle.ignition || selectedVehicle.engine
                                ? "Açık"
                                : "Kapalı"}
                        </strong>
                    </div>

                    <div>
                        <span>Koordinat</span>
                        <strong>
                            {selectedCoordinate.latitude || "-"}
                            <br />
                            {selectedCoordinate.longitude || "-"}
                        </strong>
                    </div>

                    <div>
                        <span>Adres</span>
                        <strong>
                            {selectedVehicle.address ||
                                selectedVehicle.location ||
                                selectedVehicle.city ||
                                "-"}
                        </strong>
                    </div>

                    <div>
                        <span>Son Veri</span>
                        <strong>
                            {formatDate(
                                selectedVehicle.gpsDate ||
                                selectedVehicle.activityDate ||
                                selectedVehicle.dataTime ||
                                selectedVehicle.lastDataTime
                            )}
                        </strong>
                    </div>

                    <div className="arac-detay-actions">
                        {selectedMapsUrl && (
                            <a
                                href={selectedMapsUrl}
                                target="_blank"
                                rel="noreferrer"
                            >
                                📍 Google Maps
                            </a>
                        )}

                        <button
                            type="button"
                            onClick={() => setDrawerOpen(true)}
                        >
                            Detay
                        </button>
                    </div>
                </div>
            )}

            <AracDetayPaneli
                vehicle={drawerOpen ? selectedVehicle : null}
                onClose={() => setDrawerOpen(false)}
            />
        </div>
    );
}