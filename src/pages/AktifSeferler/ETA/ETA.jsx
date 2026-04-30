import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../../supabaseClient";
import "./ETA.css";

function split(val) {
    return String(val || "")
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean);
}

function normalizeTR(value) {
    return String(value || "")
        .toLocaleUpperCase("tr-TR")
        .replace(/\s+/g, " ")
        .trim();
}

function getLastValue(value) {
    const parts = split(value);
    return parts.length ? parts[parts.length - 1] : "";
}

function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date) ? null : date;
}

function formatDateTime(value) {
    const date = parseDate(value);
    if (!date) return "—";

    return date.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function parseGunValue(value) {
    if (!value) return null;

    const text = String(value)
        .replace(",", ".")
        .replace(/[^\d.]/g, "");

    const num = Number(text);
    return Number.isFinite(num) ? num : null;
}

function getActualEtaInfo(row) {
    const rota = Array.isArray(row?.rota_detaylari) ? row.rota_detaylari : [];
    if (!rota.length) return null;

    const loads = rota.filter((x) => x.tip === "yukleme" || x.type === "Yükleme");
    const deliveries = rota.filter((x) => x.tip === "teslim" || x.type === "Teslim");

    const firstLoad = loads[0];
    const lastDelivery = deliveries[deliveries.length - 1];

    const startValue = firstLoad?.cikis || firstLoad?.gerceklesen_cikis;
    const endValue = lastDelivery?.varis || lastDelivery?.gerceklesen_varis;

    const start = parseDate(startValue);
    const end = parseDate(endValue);

    if (!start || !end) {
        return {
            startValue,
            endValue,
            actualDays: null,
            actualHours: null,
            actualText: "Tarih bilgisi eksik",
            isComplete: false,
        };
    }

    const diffMs = end.getTime() - start.getTime();

    if (diffMs < 0) {
        return {
            startValue,
            endValue,
            actualDays: null,
            actualHours: null,
            actualText: "Tarih aralığı hatalı",
            isComplete: false,
        };
    }

    const totalHours = diffMs / (1000 * 60 * 60);
    const days = Math.floor(totalHours / 24);
    const hours = Math.round(totalHours % 24);

    return {
        startValue,
        endValue,
        actualDays: totalHours / 24,
        actualHours: totalHours,
        actualText: `${days} gün ${hours} saat`,
        isComplete: true,
    };
}

function ETA({ row, onClose }) {
    const [etaData, setEtaData] = useState(null);
    const [loading, setLoading] = useState(false);
    const [errorText, setErrorText] = useState("");

    const etaKeys = useMemo(() => {
        if (!row) return null;

        const yuklemeIl = getLastValue(row.yukleme_ili);
        const teslimIl = getLastValue(row.teslim_ili);

        return {
            cikis: normalizeTR(yuklemeIl),
            varis: normalizeTR(teslimIl),
        };
    }, [row]);

    const actualEtaInfo = useMemo(() => {
        return getActualEtaInfo(row);
    }, [row]);

    const etaLimitDays = useMemo(() => {
        return parseGunValue(etaData?.["gün"]);
    }, [etaData]);

    const isDelayed = useMemo(() => {
        if (!actualEtaInfo?.isComplete || !etaLimitDays) return false;
        return actualEtaInfo.actualDays > etaLimitDays;
    }, [actualEtaInfo, etaLimitDays]);

    useEffect(() => {
        if (!row || !etaKeys) return;

        async function fetchEta() {
            setLoading(true);
            setErrorText("");
            setEtaData(null);

            try {
                if (!etaKeys.cikis) {
                    setErrorText("Yükleme ili bulunamadı.");
                    return;
                }

                if (!etaKeys.varis) {
                    setErrorText("Son teslim ili bulunamadı.");
                    return;
                }

                const { data, error } = await supabase
                    .from("eta_referanslari")
                    .select("*")
                    .ilike("cikis", `${etaKeys.cikis}%`)
                    .ilike("varis", `${etaKeys.varis}%`)
                    .maybeSingle();

                if (error) throw error;

                if (!data) {
                    setErrorText("ETA tablosunda eşleşen kayıt bulunamadı.");
                    return;
                }

                setEtaData(data);
            } catch (err) {
                console.error("ETA sorgu hatası:", err);
                setErrorText("ETA bilgisi alınırken hata oluştu.");
            } finally {
                setLoading(false);
            }
        }

        fetchEta();
    }, [row, etaKeys]);

    if (!row) return null;

    return (
        <div className="eta-overlay" onClick={onClose}>
            <div className="eta-panel" onClick={(e) => e.stopPropagation()}>
                <div className="eta-header">
                    <div>
                        <div className="eta-eyebrow">ETA Yönetimi</div>
                        <h2>{row.sefer_no}</h2>
                    </div>

                    <button className="eta-close" onClick={onClose}>
                        ×
                    </button>
                </div>

                <div className="eta-body">
                    <div className={`eta-status-banner ${isDelayed ? "danger" : "success"}`}>
                        <div>
                            <span>Durum</span>
                            <strong>
                                {!actualEtaInfo?.isComplete
                                    ? "Kontrol için tarih eksik"
                                    : isDelayed
                                        ? "ETA Gecikmiş"
                                        : "ETA Uyumlu"}
                            </strong>
                        </div>

                        <div className="eta-status-pill">
                            {isDelayed ? "Gecikme Var" : "Normal"}
                        </div>
                    </div>

                    <div className="eta-grid">
                        <div className="eta-card">
                            <span>Sefer No</span>
                            <strong>{row.sefer_no}</strong>
                        </div>

                        <div className="eta-card">
                            <span>Yükleme İli / Çıkış</span>
                            <strong>{etaKeys?.cikis || "—"}</strong>
                        </div>

                        <div className="eta-card">
                            <span>Son Teslim İli / Varış</span>
                            <strong>{etaKeys?.varis || "—"}</strong>
                        </div>

                        <div className="eta-card eta-result-card">
                            <span>Referans Gün</span>

                            {loading ? (
                                <strong>Yükleniyor...</strong>
                            ) : errorText ? (
                                <strong className="eta-error-text">{errorText}</strong>
                            ) : (
                                <strong>{etaData?.["gün"] || "—"}</strong>
                            )}
                        </div>

                        <div className="eta-card">
                            <span>KM</span>
                            <strong>{etaData?.km ? `${etaData.km} km` : "—"}</strong>
                        </div>

                        <div className={`eta-card eta-actual-card ${isDelayed ? "danger" : ""}`}>
                            <span>Gerçekleşen Süre</span>
                            <strong>{actualEtaInfo?.actualText || "—"}</strong>
                        </div>

                        <div className="eta-card">
                            <span>İlk Yükleme Çıkış</span>
                            <strong>{formatDateTime(actualEtaInfo?.startValue)}</strong>
                        </div>

                        <div className="eta-card">
                            <span>Son Teslim Varış</span>
                            <strong>{formatDateTime(actualEtaInfo?.endValue)}</strong>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ETA;