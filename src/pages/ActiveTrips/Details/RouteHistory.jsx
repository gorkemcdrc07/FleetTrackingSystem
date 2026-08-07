import { useCallback, useEffect, useMemo, useState } from "react";
import "./Detay.css";
import { mobilizService } from "../../../services/mobiliz";

function pad(value) {
    return String(value).padStart(2, "0");
}

function formatDateForMobiliz(date) {
    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}+0300`
    );
}

function normalizePlate(value) {
    return String(value || "")
        .replace(/\s/g, "")
        .toUpperCase();
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString("tr-TR");
}

function getLatitude(item) {
    return (
        item?.latitude ??
        item?.lat ??
        item?.y ??
        null
    );
}

function getLongitude(item) {
    return (
        item?.longitude ??
        item?.lng ??
        item?.lon ??
        item?.x ??
        null
    );
}

function getLocationDate(item) {
    return (
        item?.gpsDate ||
        item?.date ||
        item?.activityDate ||
        item?.dataTime ||
        item?.lastDataTime ||
        null
    );
}

function getAddress(item) {
    return (
        item?.address ||
        item?.location ||
        item?.city ||
        "Adres bilgisi yok"
    );
}

export default function RouteHistory({ plaka }) {
    const [loading, setLoading] = useState(false);
    const [locations, setLocations] = useState([]);
    const [error, setError] = useState("");
    const [lastRefresh, setLastRefresh] = useState(null);

    const normalizedPlate = useMemo(
        () => normalizePlate(plaka),
        [plaka]
    );

    const loadLocations = useCallback(
        async (signal) => {
            if (!normalizedPlate) {
                setLocations([]);
                setError("Plaka bilgisi bulunamadı.");
                return;
            }

            try {
                setLoading(true);
                setError("");

                // Her yenilemede gerçek son 24 saat yeniden hesaplanır.
                const endDate = new Date();
                const startDate = new Date(
                    endDate.getTime() - 24 * 60 * 60 * 1000
                );

                const params = {
                    plate: normalizedPlate,
                    start: formatDateForMobiliz(startDate),
                    end: formatDateForMobiliz(endDate),
                };

                const data = (await mobilizService.locations(params, { signal }))
                    .filter(Boolean)
                    .sort((a, b) => {
                        const aTime = new Date(
                            getLocationDate(a) || 0
                        ).getTime();

                        const bTime = new Date(
                            getLocationDate(b) || 0
                        ).getTime();

                        return bTime - aTime;
                    });

                setLocations(data);
                setLastRefresh(new Date());
            } catch (err) {
                if (err?.name === "AbortError") return;

                console.error(
                    "Mobiliz rota geçmişi alınamadı:",
                    err
                );

                setLocations([]);
                setError(
                    err instanceof Error
                        ? err.message
                        : "Mobiliz rota geçmişi alınamadı."
                );
            } finally {
                if (!signal?.aborted) {
                    setLoading(false);
                }
            }
        },
        [normalizedPlate]
    );

    useEffect(() => {
        const controller = new AbortController();

        loadLocations(controller.signal);

        return () => {
            controller.abort();
        };
    }, [loadLocations]);

    function handleRefresh() {
        loadLocations();
    }

    return (
        <div className="rota-gecmisi">
            <div className="rota-gecmisi-head">
                <div>
                    <h2>🛣️ Rota Geçmişi</h2>

                    <p>
                        {plaka || "-"} için son 24 saatlik Mobiliz
                        konum hareketleri.
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
                    onClick={handleRefresh}
                    disabled={loading || !normalizedPlate}
                >
                    {loading ? "Yükleniyor..." : "Yenile"}
                </button>
            </div>

            {error && (
                <div className="mobiliz-error">
                    <strong>Rota geçmişi alınamadı.</strong>
                    <span>{error}</span>

                    <button
                        type="button"
                        onClick={handleRefresh}
                        disabled={loading}
                    >
                        Tekrar Dene
                    </button>
                </div>
            )}

            {!error && loading && (
                <div className="mobiliz-loading">
                    Rota geçmişi yükleniyor...
                </div>
            )}

            {!error && !loading && locations.length === 0 && (
                <div className="mobiliz-empty">
                    <strong>Rota geçmişi bulunamadı.</strong>
                    <span>
                        Bu araç için son 24 saatte konum kaydı
                        bulunmuyor.
                    </span>
                </div>
            )}

            {!error && !loading && locations.length > 0 && (
                <>
                    <div className="rota-gecmisi-summary">
                        <span>Toplam Konum</span>
                        <strong>{locations.length}</strong>
                    </div>

                    <div className="rota-listesi">
                        {locations.slice(0, 100).map((item, index) => {
                            const latitude = getLatitude(item);
                            const longitude = getLongitude(item);
                            const locationDate = getLocationDate(item);

                            const mapsUrl =
                                latitude !== null &&
                                    longitude !== null
                                    ? `https://www.google.com/maps?q=${latitude},${longitude}`
                                    : null;

                            return (
                                <div
                                    className="rota-item"
                                    key={
                                        item?.id ||
                                        `${index}-${latitude}-${longitude}-${locationDate}`
                                    }
                                >
                                    <div className="rota-item-content">
                                        <strong>
                                            {index + 1}. Konum
                                        </strong>

                                        <span>{getAddress(item)}</span>

                                        {latitude !== null &&
                                            longitude !== null && (
                                                <small>
                                                    {latitude}, {longitude}
                                                </small>
                                            )}
                                    </div>

                                    <div className="rota-item-side">
                                        <time>
                                            {formatDate(locationDate)}
                                        </time>

                                        {mapsUrl && (
                                            <a
                                                href={mapsUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Haritada Aç
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}
        </div>
    );
}
