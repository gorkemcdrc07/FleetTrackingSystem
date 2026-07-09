import { useEffect, useMemo, useState } from "react";
import "./Detay.css";
import CanliHarita from "./CanliHarita";

const API_URL = "http://localhost:5000/api/mobiliz/activity-last";

function normalizePlate(value) {
    return String(value || "").replace(/\s/g, "").toUpperCase();
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return String(value);

    return date.toLocaleString("tr-TR");
}

export default function MobilizBilgileri({ plaka }) {
    const [loading, setLoading] = useState(true);
    const [vehicle, setVehicle] = useState(null);
    const [error, setError] = useState("");

    async function loadVehicle() {
        try {
            if (!vehicle) setLoading(true);

            setError("");

            const res = await fetch(API_URL);
            const json = await res.json();

            if (!res.ok) {
                throw new Error(json?.message || "Mobiliz verisi alınamadı.");
            }

            const list = Array.isArray(json) ? json : json.data || [];

            const found = list.find(
                (item) => normalizePlate(item.plate) === normalizePlate(plaka)
            );

            setVehicle(found || null);
        } catch (err) {
            console.error(err);
            setError("Mobiliz servisine ulaşılamadı.");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        loadVehicle();

        const timer = setInterval(loadVehicle, 30000);

        return () => clearInterval(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [plaka]);

    const vehicleInfo = useMemo(() => {
        if (!vehicle) return null;

        const hiz = Number(vehicle.speed || vehicle.velocity || 0);

        return {
            plaka: vehicle.plate || plaka || "-",
            hiz,
            kontak: Boolean(vehicle.ignition || vehicle.engine),
            latitude: vehicle.latitude || vehicle.lat || vehicle.y || "",
            longitude:
                vehicle.longitude ||
                vehicle.lng ||
                vehicle.lon ||
                vehicle.x ||
                "",
            adres:
                vehicle.address ||
                vehicle.location ||
                vehicle.city ||
                "Adres bilgisi yok",
            sonGuncelleme:
                vehicle.gpsDate ||
                vehicle.activityDate ||
                vehicle.dataTime ||
                vehicle.lastDataTime ||
                vehicle.date ||
                "",
            uydu: vehicle.satelliteCount || vehicle.satellites || "-",
        };
    }, [vehicle, plaka]);

    const status = useMemo(() => {
        if (!vehicleInfo) return "offline";
        if (vehicleInfo.hiz > 0) return "moving";
        if (vehicleInfo.kontak) return "idle";
        return "park";
    }, [vehicleInfo]);

    if (loading) {
        return (
            <div className="mobiliz-loading">
                Mobiliz bilgileri yükleniyor...
            </div>
        );
    }

    if (error) {
        return <div className="mobiliz-error">{error}</div>;
    }

    if (!vehicle || !vehicleInfo) {
        return (
            <div className="mobiliz-empty">
                Bu plaka Mobiliz sisteminde bulunamadı.
            </div>
        );
    }

    return (
        <div className="mobiliz-wrapper">
            <div className="mobiliz-header">
                <div>
                    <h2>Araç Kontrol Merkezi</h2>
                    <span>{vehicleInfo.plaka}</span>
                </div>

                <div className={`mobiliz-status ${status}`}>
                    {status === "moving" && "🟢 Hareket Halinde"}
                    {status === "idle" && "🟡 Rölantide"}
                    {status === "park" && "⚪ Park Halinde"}
                    {status === "offline" && "🔴 Çevrimdışı"}
                </div>
            </div>

            <div className="mobiliz-grid">
                <div className="mobiliz-card">
                    <span>🚚 Plaka</span>
                    <strong>{vehicleInfo.plaka}</strong>
                </div>

                <div className="mobiliz-card">
                    <span>⚡ Hız</span>
                    <strong>{vehicleInfo.hiz} km/h</strong>
                </div>

                <div className="mobiliz-card">
                    <span>🔑 Kontak</span>
                    <strong>{vehicleInfo.kontak ? "Açık" : "Kapalı"}</strong>
                </div>

                <div className="mobiliz-card">
                    <span>📡 GPS</span>
                    <strong>
                        {vehicleInfo.latitude || "-"}
                        <br />
                        {vehicleInfo.longitude || "-"}
                    </strong>
                </div>

                <div className="mobiliz-card full">
                    <span>📍 Adres</span>
                    <strong>{vehicleInfo.adres}</strong>
                </div>

                <div className="mobiliz-card">
                    <span>🕒 Son Güncelleme</span>
                    <strong>{formatDate(vehicleInfo.sonGuncelleme)}</strong>
                </div>

                <div className="mobiliz-card">
                    <span>🛰 Uydu</span>
                    <strong>{vehicleInfo.uydu}</strong>
                </div>
            </div>

            <CanliHarita vehicle={vehicle} />
        </div>
    );
}