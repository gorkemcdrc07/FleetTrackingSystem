import { useCallback, useEffect, useMemo, useState } from "react";
import "./Detay.css";
import LiveMap from "./LiveMap";
import { apiUrl } from "../../../config/api";

const API_URL = apiUrl("/api/mobiliz/activity-last");

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

function getResponseList(json) {
    if (Array.isArray(json)) return json;
    if (Array.isArray(json?.data)) return json.data;
    if (Array.isArray(json?.result)) return json.result;
    if (Array.isArray(json?.items)) return json.items;

    return [];
}

export default function MobilizInformation({ plaka }) {
    const [loading, setLoading] = useState(true);
    const [vehicle, setVehicle] = useState(null);
    const [error, setError] = useState("");
    const [lastRefresh, setLastRefresh] = useState(null);

    const loadVehicle = useCallback(async () => {
        if (!plaka) {
            setVehicle(null);
            setError("Plaka bilgisi bulunamadı.");
            setLoading(false);
            return;
        }

        try {
            setLoading((current) => current || !vehicle);
            setError("");

            const response = await fetch(API_URL, {
                method: "GET",
                headers: {
                    Accept: "application/json",
                },
            });

            const contentType = response.headers.get("content-type") || "";

            let json;

            if (contentType.includes("application/json")) {
                json = await response.json();
            } else {
                const text = await response.text();

                throw new Error(
                    text || `Sunucu geçersiz cevap döndürdü. HTTP ${response.status}`
                );
            }

            if (!response.ok) {
                throw new Error(
                    json?.message ||
                    json?.error ||
                    `Mobiliz isteği başarısız oldu. HTTP ${response.status}`
                );
            }

            const list = getResponseList(json);

            const found = list.find(
                (item) =>
                    normalizePlate(
                        item?.plate ||
                        item?.licensePlate ||
                        item?.plateNo
                    ) === normalizePlate(plaka)
            );

            setVehicle(found || null);
            setLastRefresh(new Date());
        } catch (err) {
            console.error("Mobiliz araç bilgisi alınamadı:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Mobiliz servisine ulaşılamadı."
            );
        } finally {
            setLoading(false);
        }
    }, [plaka, vehicle]);

    useEffect(() => {
        loadVehicle();

        const timer = window.setInterval(() => {
            loadVehicle();
        }, 30000);

        return () => {
            window.clearInterval(timer);
        };
    }, [loadVehicle]);

    const vehicleInfo = useMemo(() => {
        if (!vehicle) return null;

        const hiz = Number(vehicle?.speed || vehicle?.velocity || 0);

        return {
            plaka:
                vehicle?.plate ||
                vehicle?.licensePlate ||
                vehicle?.plateNo ||
                plaka ||
                "-",

            hiz,

            kontak: Boolean(
                vehicle?.ignition ||
                vehicle?.engine ||
                vehicle?.contact
            ),

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

            adres:
                vehicle?.address ||
                vehicle?.location ||
                vehicle?.city ||
                "Adres bilgisi yok",

            sonGuncelleme:
                vehicle?.gpsDate ||
                vehicle?.activityDate ||
                vehicle?.dataTime ||
                vehicle?.lastDataTime ||
                vehicle?.date ||
                "",

            uydu:
                vehicle?.satelliteCount ??
                vehicle?.satellites ??
                "-",
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
        return (
            <div className="mobiliz-error">
                <strong>Mobiliz verisi alınamadı.</strong>
                <span>{error}</span>

                <button
                    type="button"
                    onClick={loadVehicle}
                >
                    Tekrar Dene
                </button>
            </div>
        );
    }

    if (!vehicle || !vehicleInfo) {
        return (
            <div className="mobiliz-empty">
                <strong>Bu plaka Mobiliz sisteminde bulunamadı.</strong>
                <span>{plaka || "-"}</span>

                <button
                    type="button"
                    onClick={loadVehicle}
                >
                    Yeniden Kontrol Et
                </button>
            </div>
        );
    }

    return (
        <div className="mobiliz-wrapper">
            <div className="mobiliz-header">
                <div>
                    <h2>Araç Kontrol Merkezi</h2>
                    <span>{vehicleInfo.plaka}</span>

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
                    <strong>
                        {vehicleInfo.kontak ? "Açık" : "Kapalı"}
                    </strong>
                </div>

                <div className="mobiliz-card">
                    <span>📡 GPS</span>
                    <strong>
                        {vehicleInfo.latitude !== ""
                            ? vehicleInfo.latitude
                            : "-"}
                        <br />
                        {vehicleInfo.longitude !== ""
                            ? vehicleInfo.longitude
                            : "-"}
                    </strong>
                </div>

                <div className="mobiliz-card full">
                    <span>📍 Adres</span>
                    <strong>{vehicleInfo.adres}</strong>
                </div>

                <div className="mobiliz-card">
                    <span>🕒 Son Güncelleme</span>
                    <strong>
                        {formatDate(vehicleInfo.sonGuncelleme)}
                    </strong>
                </div>

                <div className="mobiliz-card">
                    <span>🛰 Uydu</span>
                    <strong>{vehicleInfo.uydu}</strong>
                </div>
            </div>

            <LiveMap vehicle={vehicle} />
        </div>
    );
}
