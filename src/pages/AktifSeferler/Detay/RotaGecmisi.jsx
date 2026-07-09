import { useEffect, useMemo, useState } from "react";
import "./Detay.css";

const API_URL = "http://localhost:5000/api/mobiliz/locations";

function formatDateForMobiliz(date) {
    const pad = (n) => String(n).padStart(2, "0");

    return (
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
        `T${pad(date.getHours())}:${pad(date.getMinutes())}+0300`
    );
}

function normalizePlate(value) {
    return String(value || "").replace(/\s/g, "").toUpperCase();
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("tr-TR");
}

export default function RotaGecmisi({ plaka }) {
    const [loading, setLoading] = useState(false);
    const [locations, setLocations] = useState([]);
    const [error, setError] = useState("");

    const tarihAraligi = useMemo(() => {
        const end = new Date();
        const start = new Date();
        start.setHours(start.getHours() - 24);

        return {
            start: formatDateForMobiliz(start),
            end: formatDateForMobiliz(end),
        };
    }, []);

    async function loadLocations() {
        try {
            setLoading(true);
            setError("");

            const params = new URLSearchParams({
                plate: normalizePlate(plaka),
                start: tarihAraligi.start,
                end: tarihAraligi.end,
            });

            const res = await fetch(`${API_URL}?${params.toString()}`);
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.message || "Rota geçmişi alınamadı.");
            }

            const data = Array.isArray(json)
                ? json
                : json.data || json.Data || [];

            setLocations(data);
        } catch (err) {
            console.error(err);
            setError(
                "Mobiliz rota geçmişi alınamadı. Parametre adları dokümana göre güncellenebilir."
            );
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (!plaka) return;
        loadLocations();
    }, [plaka]);

    return (
        <div className="rota-gecmisi">
            <div className="rota-gecmisi-head">
                <div>
                    <h2>🛣️ Rota Geçmişi</h2>
                    <p>
                        {plaka} için son 24 saatlik Mobiliz konum hareketleri.
                    </p>
                </div>

                <button onClick={loadLocations} disabled={loading}>
                    {loading ? "Yükleniyor..." : "Yenile"}
                </button>
            </div>

            {error && <div className="mobiliz-error">{error}</div>}

            {!error && loading && (
                <div className="mobiliz-loading">
                    Rota geçmişi yükleniyor...
                </div>
            )}

            {!error && !loading && locations.length === 0 && (
                <div className="mobiliz-empty">
                    Bu araç için rota geçmişi bulunamadı.
                </div>
            )}

            {!error && !loading && locations.length > 0 && (
                <div className="rota-listesi">
                    {locations.slice(0, 100).map((item, index) => (
                        <div
                            className="rota-item"
                            key={item.id || `${index}-${item.latitude}-${item.longitude}`}
                        >
                            <div>
                                <strong>{index + 1}. Konum</strong>
                                <span>
                                    {item.address ||
                                        item.location ||
                                        item.city ||
                                        "Adres yok"}
                                </span>
                            </div>

                            <small>
                                {formatDate(
                                    item.gpsDate ||
                                    item.date ||
                                    item.activityDate ||
                                    item.dataTime
                                )}
                            </small>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}