import { useCallback, useEffect, useMemo, useState } from "react";
import Harita from "../../components/Harita/Harita";
import Filtreler from "../../components/Harita/Filtreler";
import VehicleDrawer from "../../components/VehicleDrawer/VehicleDrawer";
import "../../components/Harita/Harita.css";
import { mobilizService } from "../../services/mobiliz";

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

function getCoordinate(vehicle) {
    return {
        latitude:
            vehicle?.latitude ??
            vehicle?.lat ??
            vehicle?.y ??
            "",

        longitude:
            vehicle?.longitude ??
            vehicle?.lng ??
            vehicle?.lon ??
            vehicle?.x ??
            "",
    };
}

function getAddress(vehicle) {
    return (
        vehicle?.address ||
        vehicle?.location ||
        vehicle?.city ||
        "Konum bilgisi yok"
    );
}

function getLastDate(vehicle) {
    return (
        vehicle?.gpsDate ||
        vehicle?.activityDate ||
        vehicle?.dataTime ||
        vehicle?.lastDataTime ||
        vehicle?.date ||
        ""
    );
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString("tr-TR");
}

export default function VehicleTracking({ onNavigate }) {
    const [vehicles, setVehicles] = useState([]);
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [lastRefresh, setLastRefresh] = useState(null);

    const [filters, setFilters] = useState({
        search: "",
        status: "all",
        fleet: "",
        group: "",
    });

    const loadVehicles = useCallback(async (signal) => {
        try {
            setLoading(true);
            setError("");

            const data = await mobilizService.araclar({ signal });

            setVehicles(data);

            setSelectedVehicle((previous) => {
                if (!previous) {
                    return data[0] || null;
                }

                const previousPlate = normalizePlate(
                    getPlate(previous)
                );

                return (
                    data.find(
                        (item) =>
                            normalizePlate(getPlate(item)) ===
                            previousPlate
                    ) ||
                    data[0] ||
                    null
                );
            });

            setLastRefresh(new Date());
        } catch (err) {
            if (err?.name === "AbortError") return;

            console.error("Mobiliz araç verileri alınamadı:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Mobiliz araç verileri alınamadı."
            );
        } finally {
            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, []);

    useEffect(() => {
        const controller = new AbortController();

        loadVehicles(controller.signal);

        const timer = window.setInterval(() => {
            loadVehicles();
        }, 30000);

        return () => {
            controller.abort();
            window.clearInterval(timer);
        };
    }, [loadVehicles]);

    const filteredVehicles = useMemo(() => {
        return vehicles.filter((vehicle) => {
            const plateMatch = normalizePlate(
                getPlate(vehicle)
            ).includes(normalizePlate(filters.search));

            const statusMatch =
                filters.status === "all" ||
                getStatus(vehicle) === filters.status;

            const fleetMatch =
                !filters.fleet ||
                vehicle?.fleetName === filters.fleet;

            const groupMatch =
                !filters.group ||
                vehicle?.groupName === filters.group;

            return (
                plateMatch &&
                statusMatch &&
                fleetMatch &&
                groupMatch
            );
        });
    }, [vehicles, filters]);

    const summary = useMemo(() => {
        return {
            total: vehicles.length,
            moving: vehicles.filter(
                (vehicle) => getStatus(vehicle) === "moving"
            ).length,
            idle: vehicles.filter(
                (vehicle) => getStatus(vehicle) === "idle"
            ).length,
            park: vehicles.filter(
                (vehicle) => getStatus(vehicle) === "park"
            ).length,
        };
    }, [vehicles]);

    const selectedCoordinate = getCoordinate(selectedVehicle);

    const selectedMapsUrl =
        selectedCoordinate.latitude !== "" &&
            selectedCoordinate.longitude !== ""
            ? `https://www.google.com/maps?q=${selectedCoordinate.latitude},${selectedCoordinate.longitude}`
            : "";

    function handleSelectVehicle(vehicle) {
        setSelectedVehicle(vehicle);
        setDrawerOpen(true);
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
            "fts_focus_plate",
            getPlate(vehicle)
        );

        setDrawerOpen(false);
        onNavigate?.("Operasyon Merkezi");
    }

    return (
        <div className="arac-takibi-page premium">
            <div className="arac-takibi-header premium">
                <div>
                    <span>Mobiliz Entegrasyonu</span>
                    <h1>Araç Takibi</h1>

                    <p>
                        Canlı araç konumları, hız ve kontak durumları.
                    </p>

                    {lastRefresh && (
                        <small>
                            Son yenileme:{" "}
                            {lastRefresh.toLocaleTimeString("tr-TR", {
                                hour: "2-digit",
                                minute: "2-digit",
                                second: "2-digit",
                            })}
                        </small>
                    )}
                </div>

                <button
                    type="button"
                    onClick={() => loadVehicles()}
                    disabled={loading}
                >
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

            {error && (
                <div className="mobiliz-error">
                    <strong>Araç verileri alınamadı.</strong>
                    <span>{error}</span>

                    <button
                        type="button"
                        onClick={() => loadVehicles()}
                        disabled={loading}
                    >
                        Tekrar Dene
                    </button>
                </div>
            )}

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

                    {filteredVehicles.length === 0 ? (
                        <div className="mobiliz-empty">
                            Filtreye uygun araç bulunamadı.
                        </div>
                    ) : (
                        filteredVehicles.map((vehicle) => {
                            const plate = getPlate(vehicle);

                            return (
                                <button
                                    key={vehicle?.id || plate}
                                    type="button"
                                    className={
                                        normalizePlate(
                                            getPlate(selectedVehicle)
                                        ) === normalizePlate(plate)
                                            ? "arac-list-item active"
                                            : "arac-list-item"
                                    }
                                    onClick={() =>
                                        handleSelectVehicle(vehicle)
                                    }
                                >
                                    <div className="arac-item-top">
                                        <strong>{plate}</strong>

                                        <span
                                            className={`mini-status ${getStatus(
                                                vehicle
                                            )}`}
                                        >
                                            {getStatusText(vehicle)}
                                        </span>
                                    </div>

                                    <small>
                                        {getAddress(vehicle)}
                                    </small>

                                    <em>
                                        {getSpeed(vehicle)} km/h
                                    </em>
                                </button>
                            );
                        })
                    )}
                </aside>

                <div className="arac-harita-alani premium">
                    <Harita
                        vehicles={filteredVehicles}
                        selectedPlate={
                            selectedVehicle
                                ? getPlate(selectedVehicle)
                                : undefined
                        }
                        onVehicleClick={handleSelectVehicle}
                        height="720px"
                        zoom={6}
                    />
                </div>
            </div>

            {selectedVehicle && (
                <div className="arac-detay-bar premium">
                    <div>
                        <span>Seçili Araç</span>
                        <strong>
                            {getPlate(selectedVehicle)}
                        </strong>
                    </div>

                    <div>
                        <span>Durum</span>
                        <strong>
                            {getStatusText(selectedVehicle)}
                        </strong>
                    </div>

                    <div>
                        <span>Hız</span>
                        <strong>
                            {getSpeed(selectedVehicle)} km/h
                        </strong>
                    </div>

                    <div>
                        <span>Kontak</span>
                        <strong>
                            {selectedVehicle?.ignition ||
                                selectedVehicle?.engine
                                ? "Açık"
                                : "Kapalı"}
                        </strong>
                    </div>

                    <div>
                        <span>Koordinat</span>
                        <strong>
                            {selectedCoordinate.latitude !== ""
                                ? selectedCoordinate.latitude
                                : "-"}
                            <br />
                            {selectedCoordinate.longitude !== ""
                                ? selectedCoordinate.longitude
                                : "-"}
                        </strong>
                    </div>

                    <div>
                        <span>Adres</span>
                        <strong>
                            {getAddress(selectedVehicle)}
                        </strong>
                    </div>

                    <div>
                        <span>Son Veri</span>
                        <strong>
                            {formatDate(
                                getLastDate(selectedVehicle)
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
