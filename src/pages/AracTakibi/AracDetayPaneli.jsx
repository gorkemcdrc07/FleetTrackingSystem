import Harita from "../../components/Harita/Harita";
import "../../components/Harita/Harita.css";

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

function copyText(value) {
    if (!value) return;
    navigator.clipboard?.writeText(String(value));
}

function getLastDataDate(vehicle) {
    const value =
        vehicle?.gpsDate ||
        vehicle?.activityDate ||
        vehicle?.dataTime ||
        vehicle?.lastDataTime;

    if (!value) return null;

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;

    return date;
}

function getDataAgeInfo(vehicle) {
    const lastDate = getLastDataDate(vehicle);

    if (!lastDate) {
        return {
            status: "unknown",
            text: "Son veri zamanı bilinmiyor.",
        };
    }

    const diffMin = Math.floor((Date.now() - lastDate.getTime()) / 60000);

    if (diffMin <= 15) {
        return {
            status: "fresh",
            text: "Veri güncel.",
        };
    }

    if (diffMin <= 60) {
        return {
            status: "warning",
            text: `${diffMin} dakika önce güncellendi.`,
        };
    }

    const diffHour = Math.floor(diffMin / 60);

    return {
        status: "old",
        text: `${diffHour} saat önce güncellendi. Veri eski olabilir.`,
    };
}

export default function AracDetayPaneli({ vehicle, onClose }) {
    if (!vehicle) return null;

    const coord = getCoordinate(vehicle);
    const dataAge = getDataAgeInfo(vehicle);

    const mapsUrl =
        coord.latitude && coord.longitude
            ? `https://www.google.com/maps?q=${coord.latitude},${coord.longitude}`
            : "";

    const normalizedVehicle = {
        ...vehicle,
        latitude: coord.latitude,
        longitude: coord.longitude,
    };

    return (
        <div className="arac-drawer-overlay" onClick={onClose}>
            <aside className="arac-drawer" onClick={(e) => e.stopPropagation()}>
                <div className="arac-drawer-head">
                    <div>
                        <span>Araç Detayı</span>
                        <h2>{vehicle.plate}</h2>

                        <div className={`arac-drawer-status ${getStatus(vehicle)}`}>
                            {getStatusText(vehicle)}
                        </div>
                    </div>

                    <button onClick={onClose}>Kapat</button>
                </div>

                <div className={`arac-data-age ${dataAge.status}`}>
                    {dataAge.text}
                </div>

                <div className="arac-drawer-grid">
                    <div>
                        <span>Hız</span>
                        <strong>{vehicle.speed || vehicle.velocity || 0} km/h</strong>
                    </div>

                    <div>
                        <span>Kontak</span>
                        <strong>
                            {vehicle.ignition || vehicle.engine ? "Açık" : "Kapalı"}
                        </strong>
                    </div>

                    <div>
                        <span>Koordinat</span>
                        <strong>
                            {coord.latitude || "-"} / {coord.longitude || "-"}
                        </strong>

                        {coord.latitude && coord.longitude && (
                            <button
                                type="button"
                                className="mini-copy-btn"
                                onClick={() =>
                                    copyText(`${coord.latitude},${coord.longitude}`)
                                }
                            >
                                Kopyala
                            </button>
                        )}
                    </div>

                    <div>
                        <span>Son Veri</span>
                        <strong>
                            {formatDate(
                                vehicle.gpsDate ||
                                vehicle.activityDate ||
                                vehicle.dataTime ||
                                vehicle.lastDataTime
                            )}
                        </strong>
                    </div>

                    <div className="full">
                        <span>Adres</span>
                        <strong>
                            {vehicle.address ||
                                vehicle.location ||
                                vehicle.city ||
                                "-"}
                        </strong>
                    </div>
                </div>

                <div className="arac-tech-card">
                    <h3>Teknik Bilgiler</h3>

                    <div>
                        <span>Cihaz ID</span>
                        <strong>{vehicle.deviceId || "-"}</strong>
                    </div>

                    <div>
                        <span>Network ID</span>
                        <strong>{vehicle.networkId || "-"}</strong>
                    </div>

                    <div>
                        <span>Filo</span>
                        <strong>{vehicle.fleetName || vehicle.fleetId || "-"}</strong>
                    </div>

                    <div>
                        <span>Grup</span>
                        <strong>{vehicle.groupName || vehicle.groupId || "-"}</strong>
                    </div>

                    <div>
                        <span>Uydu</span>
                        <strong>{vehicle.satelliteCount || vehicle.satellites || "-"}</strong>
                    </div>
                </div>

                <div className="arac-drawer-map">
                    {coord.latitude && coord.longitude ? (
                        <Harita
                            vehicles={[normalizedVehicle]}
                            selectedPlate={vehicle.plate}
                            height="320px"
                            zoom={14}
                        />
                    ) : (
                        <div className="mobiliz-map-placeholder">
                            Koordinat bilgisi yok.
                        </div>
                    )}
                </div>

                {mapsUrl && (
                    <a
                        className="arac-drawer-map-btn"
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                    >
                        Google Maps’te Aç
                    </a>
                )}
            </aside>
        </div>
    );
}