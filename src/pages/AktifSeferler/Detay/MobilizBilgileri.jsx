import { Truck, Gauge, KeyRound, MapPin, Clock3, Satellite, RefreshCw } from "lucide-react";
import { requestJson, responseList } from "../../../services/requestJson";
﻿import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import "./Detay.css";
import CanliHarita from "./CanliHarita";
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

export default function MobilizBilgileri({ plaka }) {
    const [loading, setLoading] = useState(true);
    const [vehicle, setVehicle] = useState(null);
    const [error, setError] = useState("");
    const [lastRefresh, setLastRefresh] = useState(null);

    const generation=useRef(0);
    const loadVehicle = useCallback(async (signal) => {
        const id=++generation.current;
        if (!plaka) {
            setVehicle(null);
            setError("Plaka bilgisi bulunamadı.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const json=await requestJson(API_URL,{signal},{timeoutMs:25000,retries:1});
            const list=responseList(json);
            if(id!==generation.current)return;
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
            if(signal?.aborted || id!==generation.current)return;
            console.error("Mobiliz araç bilgisi alınamadı:", err);

            setError(
                err instanceof Error
                    ? err.message
                    : "Mobiliz servisine ulaşılamadı."
            );
        } finally {
            if(!signal?.aborted && id===generation.current)setLoading(false);
        }
    }, [plaka]);

    useEffect(()=>{
        const controller=new AbortController();setVehicle(null);
        loadVehicle(controller.signal);
        const timer=setInterval(()=>loadVehicle(controller.signal),30000);
        return()=>{controller.abort();generation.current++;clearInterval(timer);};
    },[loadVehicle]);

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

            kontak: [true,1,"true","1"].includes(
                vehicle?.ignition ??
                vehicle?.engine ??
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

    if (loading && !vehicle) {
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
                    onClick={()=>loadVehicle()}
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
                    onClick={()=>loadVehicle()}
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
                    <h2><Satellite size={21}/> Mobiliz araç bilgileri</h2>
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

                <button className="panel-refresh" disabled={loading} onClick={()=>loadVehicle()}><RefreshCw size={16} className={loading?"trip-spin":""}/> Yenile</button>
                <div className={`mobiliz-status ${status}`}>
                    {status === "moving" && "Hareket Halinde"}
                    {status === "idle" && "Rölantide"}
                    {status === "park" && "Park Halinde"}
                    {status === "offline" && "Çevrimdışı"}
                </div>
            </div>

            <div className="mobiliz-grid">
                <div className="mobiliz-card">
                    <span><Truck size={16}/> Plaka</span>
                    <strong>{vehicleInfo.plaka}</strong>
                </div>

                <div className="mobiliz-card">
                    <span><Gauge size={16}/> Hız</span>
                    <strong>{vehicleInfo.hiz} km/h</strong>
                </div>

                <div className="mobiliz-card">
                    <span><KeyRound size={16}/> Kontak</span>
                    <strong>
                        {vehicleInfo.kontak ? "Açık" : "Kapalı"}
                    </strong>
                </div>

                <div className="mobiliz-card">
                    <span><MapPin size={16}/> GPS</span>
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
                    <span><MapPin size={16}/> Adres</span>
                    <strong>{vehicleInfo.adres}</strong>
                </div>

                <div className="mobiliz-card">
                    <span><Clock3 size={16}/> Son Güncelleme</span>
                    <strong>
                        {formatDate(vehicleInfo.sonGuncelleme)}
                    </strong>
                </div>

                <div className="mobiliz-card">
                    <span><Satellite size={16}/> Uydu</span>
                    <strong>{vehicleInfo.uydu}</strong>
                </div>
            </div>

            <CanliHarita vehicle={vehicle} />
        </div>
    );
}