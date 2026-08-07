import "./FleetMap.css";

function formatDate(date) {
    if (!date) return "-";

    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) return String(date);

    return parsed.toLocaleString("tr-TR");
}

function getCoordinate(vehicle) {
    const latitude = vehicle.latitude || vehicle.lat || vehicle.y;
    const longitude = vehicle.longitude || vehicle.lng || vehicle.lon || vehicle.x;

    return {
        latitude,
        longitude,
    };
}

export default function VehiclePopup({ vehicle }) {
    const speed = Number(vehicle.speed || vehicle.velocity || 0);
    const ignition = Boolean(vehicle.ignition || vehicle.engine);

    const status =
        speed > 0
            ? "Hareket Halinde"
            : ignition
                ? "Rölantide"
                : "Park Halinde";

    const statusClass =
        speed > 0 ? "moving" : ignition ? "idle" : "park";

    const { latitude, longitude } = getCoordinate(vehicle);

    const mapsUrl =
        latitude && longitude
            ? `https://www.google.com/maps?q=${latitude},${longitude}`
            : "";

    return (
        <div className="map-popup">
            <div className="popup-header">
                <div className="popup-plate">{vehicle.plate || "-"}</div>

                <div className={`popup-status ${statusClass}`}>
                    {status}
                </div>
            </div>

            <div className="popup-grid">
                <div>
                    <span>🚚 Marka</span>
                    <strong>{vehicle.brandName || vehicle.brand || "-"}</strong>
                </div>

                <div>
                    <span>🚛 Model</span>
                    <strong>{vehicle.modelName || vehicle.model || "-"}</strong>
                </div>

                <div>
                    <span>⚡ Hız</span>
                    <strong>{speed} km/h</strong>
                </div>

                <div>
                    <span>🔑 Kontak</span>
                    <strong>{ignition ? "Açık" : "Kapalı"}</strong>
                </div>

                <div>
                    <span>🛰 GPS</span>
                    <strong>
                        {latitude || "-"}
                        <br />
                        {longitude || "-"}
                    </strong>
                </div>

                <div>
                    <span>🕒 Son Veri</span>
                    <strong>
                        {formatDate(
                            vehicle.gpsDate ||
                            vehicle.dataTime ||
                            vehicle.activityDate ||
                            vehicle.lastDataTime
                        )}
                    </strong>
                </div>
            </div>

            <div className="popup-address">
                📍 {vehicle.address || vehicle.location || vehicle.city || "-"}
            </div>

            {mapsUrl && (
                <a
                    className="popup-map-link"
                    href={mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                >
                    Google Maps’te Aç
                </a>
            )}
        </div>
    );
}
