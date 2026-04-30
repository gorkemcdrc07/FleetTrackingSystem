import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "./detaylar.css";
import RotaDuzenleme from "./RotaDuzenleme/RotaDuzenleme";

const DRIVE_BLOCK_MIN = 270;
const SHORT_BREAK_MIN = 45;
const DAILY_REST_MIN = 660;

function split(val) {
    return String(val || "").split(";").map((x) => x.trim()).filter(Boolean);
}

function pick(row, keys) {
    for (const key of keys) {
        if (row?.[key] !== undefined && row?.[key] !== null && row?.[key] !== "") return row[key];
    }
    return "";
}

function normalizeKey(...values) {
    return values.filter(Boolean).join("|").toLocaleLowerCase("tr-TR").replace(/\s+/g, " ").trim();
}

function uniqueByLocation(stops) {
    const seen = new Set();

    return stops.filter((stop) => {
        const key = normalizeKey(stop.nokta, stop.il, stop.ilce);
        if (!key || seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    if (isNaN(date)) return null;
    return date;
}

function pad(n) {
    return String(n).padStart(2, "0");
}

function toMaskedDateTimeValue(value) {
    const date = parseDate(value);
    if (!date) return "";
    return `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function maskDateTimeInput(value) {
    const digits = value.replace(/\D/g, "").slice(0, 12);

    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    const hour = digits.slice(8, 10);
    const minute = digits.slice(10, 12);

    let result = day;
    if (month) result += `.${month}`;
    if (year) result += `.${year}`;
    if (hour) result += ` ${hour}`;
    if (minute) result += `:${minute}`;

    return result;
}

function maskedDateTimeToIso(value) {
    const digits = value.replace(/\D/g, "");
    if (digits.length < 12) return "";

    const day = digits.slice(0, 2);
    const month = digits.slice(2, 4);
    const year = digits.slice(4, 8);
    const hour = digits.slice(8, 10);
    const minute = digits.slice(10, 12);

    const date = new Date(`${year}-${month}-${day}T${hour}:${minute}`);
    if (isNaN(date)) return "";

    return date.toISOString();
}

function formatEta(min) {
    if (!min && min !== 0) return "—";
    const h = Math.floor(min / 60);
    const m = Math.round(min % 60);
    if (h <= 0) return `${m} dk`;
    if (m === 0) return `${h} sa`;
    return `${h} sa ${m} dk`;
}

function formatKm(km) {
    if (!km && km !== 0) return "—";
    return `${km.toFixed(1)} km`;
}

function addMinutes(date, min) {
    return new Date(date.getTime() + min * 60 * 1000);
}

function formatDateTime(date) {
    if (!date || isNaN(date)) return "—";

    return date.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getBaseDate(row) {
    const candidates = [
        row.sefer_tarihi,
        row.atama_tarihi,
        row.created_at,
        row.olusturma_tarihi,
    ];

    for (const item of candidates) {
        const d = parseDate(item);
        if (d) return d;
    }

    return new Date();
}

function getStatus(item) {
    if (item.cikis) {
        return {
            key: "done",
            label: item.type === "Yükleme" ? "Yükleme Tamamlandı" : "Teslim Tamamlandı",
        };
    }

    if (item.varis) {
        return {
            key: "active",
            label: item.type === "Yükleme" ? "Yükleme Noktasında" : "Teslim Noktasında",
        };
    }

    return {
        key: "waiting",
        label: "Bekliyor",
    };
}

function buildAddressCandidates(item) {
    return [
        [item.nokta, item.ilce, item.il, "Türkiye"],
        [item.ilce, item.il, "Türkiye"],
        [item.il, "Türkiye"],
    ]
        .map((parts) => parts.filter(Boolean).join(", "))
        .filter(Boolean);
}

function buildRoute(row) {
    if (Array.isArray(row.rota_detaylari) && row.rota_detaylari.length > 0) {
        return row.rota_detaylari.map((item, index) => {
            const type = item.type || (item.tip === "yukleme" ? "Yükleme" : "Teslim");

            return {
                type,
                nokta: item.nokta,
                il: item.il,
                ilce: item.ilce,
                varis: item.varis || item.gerceklesen_varis || "",
                cikis: item.cikis || item.gerceklesen_cikis || "",
                sira: item.sira || index + 1,
                id: item.id || `${type}-${index}-${item.nokta || ""}`,
                varisInput: item.varisInput || toMaskedDateTimeValue(item.varis || item.gerceklesen_varis),
                cikisInput: item.cikisInput || toMaskedDateTimeValue(item.cikis || item.gerceklesen_cikis),
                status: getStatus({
                    type,
                    varis: item.varis || item.gerceklesen_varis || "",
                    cikis: item.cikis || item.gerceklesen_cikis || "",
                }),
            };
        });
    }

    const yuklemeNoktasi = split(row.yukleme_noktasi);
    const yuklemeIl = split(row.yukleme_ili);
    const yuklemeIlce = split(row.yukleme_ilcesi);

    const teslimNoktasi = split(row.teslim_noktasi);
    const teslimIl = split(row.teslim_ili);
    const teslimIlce = split(row.teslim_ilcesi);

    const yuklemeVaris = split(pick(row, [
        "yukleme_noktasina_varis",
        "yukleme_varis",
        "yukleme_varis_tarihi",
        "yukleme_noktasi_varis",
    ]));

    const yuklemeCikis = split(pick(row, [
        "yukleme_noktasindan_cikis",
        "yukleme_cikis",
        "yukleme_cikis_tarihi",
        "yukleme_noktasi_cikis",
    ]));

    const teslimVaris = split(pick(row, [
        "teslim_noktasina_varis",
        "teslim_varis",
        "teslim_varis_tarihi",
        "teslim_noktasi_varis",
    ]));

    const teslimCikis = split(pick(row, [
        "teslim_noktasindan_cikis",
        "teslim_cikis",
        "teslim_cikis_tarihi",
        "teslim_noktasi_cikis",
    ]));

    const yukCount = Math.max(
        yuklemeNoktasi.length,
        yuklemeIl.length,
        yuklemeIlce.length,
        yuklemeVaris.length,
        yuklemeCikis.length
    );

    const tesCount = Math.max(
        teslimNoktasi.length,
        teslimIl.length,
        teslimIlce.length,
        teslimVaris.length,
        teslimCikis.length
    );

    const yuklemeStops = uniqueByLocation(
        Array.from({ length: yukCount }).map((_, i) => ({
            type: "Yükleme",
            nokta: yuklemeNoktasi[i],
            il: yuklemeIl[i],
            ilce: yuklemeIlce[i],
            varis: yuklemeVaris[i],
            cikis: yuklemeCikis[i],
        }))
    );

    const teslimStops = Array.from({ length: tesCount })
        .map((_, i) => ({
            type: "Teslim",
            nokta: teslimNoktasi[i],
            il: teslimIl[i],
            ilce: teslimIlce[i],
            varis: teslimVaris[i],
            cikis: teslimCikis[i],
        }))
        .filter((x) => x.nokta || x.il || x.ilce || x.varis || x.cikis);

    return [...yuklemeStops, ...teslimStops].map((item, index) => ({
        ...item,
        sira: index + 1,
        id: `${item.type}-${index}-${item.nokta || ""}`,
        varisInput: toMaskedDateTimeValue(item.varis),
        cikisInput: toMaskedDateTimeValue(item.cikis),
        status: getStatus(item),
    }));
}

const geoCache = new Map();

function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

async function geocodeAddress(query) {
    if (!query) return null;

    const cacheKey = query.trim().toLowerCase();

    if (geoCache.has(cacheKey)) {
        return geoCache.get(cacheKey);
    }

    try {
        await sleep(900);

        const url =
            `https://nominatim.openstreetmap.org/search?` +
            new URLSearchParams({
                q: query,
                format: "json",
                limit: 1,
                countrycodes: "tr",
            });

        const response = await fetch(url, {
            headers: {
                Accept: "application/json",
            },
        });

        if (!response.ok) {
            console.warn("Geocode HTTP error:", response.status);
            return null;
        }

        const data = await response.json();

        if (!Array.isArray(data) || !data.length) {
            return null;
        }

        const result = {
            lat: Number(data[0].lat),
            lon: Number(data[0].lon),
        };

        geoCache.set(cacheKey, result);

        return result;

    } catch (err) {
        console.error("Geocode error:", err);
        return null;
    }
}
async function fetchOsrmRoute(points) {
    if (points.length < 2) return null;

    const coords = points.map((p) => `${p.lng},${p.lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson&steps=false`;

    const res = await fetch(url);
    const data = await res.json();

    const route = data?.routes?.[0];
    if (!route) return null;

    return {
        distanceKm: route.distance / 1000,
        durationMin: route.duration / 60,
        geometry: route.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        legs: route.legs.map((leg) => ({
            distanceKm: leg.distance / 1000,
            durationMin: leg.duration / 60,
        })),
    };
}

function applyLegalEtaToLeg(driveMin, state) {
    let remaining = driveMin;
    let totalMin = 0;
    let breakMin = 0;
    let restMin = 0;

    while (remaining > 0) {
        if (state.driveInBlock >= DRIVE_BLOCK_MIN) {
            if (state.blocksInDay === 0) {
                totalMin += SHORT_BREAK_MIN;
                breakMin += SHORT_BREAK_MIN;
                state.blocksInDay = 1;
            } else {
                totalMin += DAILY_REST_MIN;
                restMin += DAILY_REST_MIN;
                state.blocksInDay = 0;
            }

            state.driveInBlock = 0;
        }

        const available = DRIVE_BLOCK_MIN - state.driveInBlock;
        const drivingNow = Math.min(remaining, available);

        totalMin += drivingNow;
        state.driveInBlock += drivingNow;
        remaining -= drivingNow;
    }

    return {
        legalDurationMin: totalMin,
        breakMin,
        restMin,
        state,
    };
}

function buildSegments(route, legs, baseDate) {
    const state = {
        driveInBlock: 0,
        blocksInDay: 0,
    };

    let cursor = new Date(baseDate);
    let cumulativeLegalMin = 0;
    let totalBreakMin = 0;
    let totalRestMin = 0;

    return route.map((stop, index) => {
        const leg = index > 0 ? legs?.[index - 1] : null;
        const actualArrival = parseDate(stop.varis);
        const actualDeparture = parseDate(stop.cikis);

        let segment = null;
        let calculatedArrival = index === 0 ? new Date(cursor) : null;

        if (leg) {
            const eta = applyLegalEtaToLeg(leg.durationMin, state);

            cumulativeLegalMin += eta.legalDurationMin;
            totalBreakMin += eta.breakMin;
            totalRestMin += eta.restMin;

            calculatedArrival = addMinutes(cursor, eta.legalDurationMin);

            segment = {
                fromIndex: index - 1,
                toIndex: index,
                distanceKm: leg.distanceKm,
                netDriveMin: leg.durationMin,
                legalDurationMin: eta.legalDurationMin,
                breakMin: eta.breakMin,
                restMin: eta.restMin,
                arrivalDate: calculatedArrival,
            };
        }

        const estimatedArrival = actualArrival || calculatedArrival;
        const nextCursor = actualDeparture || actualArrival || calculatedArrival || cursor;

        cursor = new Date(nextCursor);

        return {
            ...stop,
            status: getStatus(stop),
            segment,
            estimatedArrival,
            actualArrival,
            actualDeparture,
            hasManualTime: Boolean(actualArrival || actualDeparture),
            cumulativeLegalMin,
            totalBreakMin,
            totalRestMin,
        };
    });
}

function isRouteFullyCompleted(route) {
    return route.length > 0 && route.every((item) => item.varis && item.cikis);
}

function RouteMap({ route }) {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current || !route?.points?.length) return;

        if (mapInstanceRef.current) {
            mapInstanceRef.current.remove();
        }

        const map = L.map(mapRef.current, {
            zoomControl: true,
            scrollWheelZoom: false,
        });

        mapInstanceRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap",
        }).addTo(map);

        const bounds = [];

        route.points.forEach((point, index) => {
            const item = route.stops[index];
            const isLoad = item.type === "Yükleme";

            const marker = L.circleMarker([point.lat, point.lng], {
                radius: 8,
                color: isLoad ? "#f59e0b" : "#10b981",
                fillColor: isLoad ? "#f59e0b" : "#10b981",
                fillOpacity: 1,
                weight: 2,
            }).addTo(map);

            marker.bindPopup(`
                <strong>${index + 1}. ${item.type}</strong><br/>
                ${item.nokta || "-"}<br/>
                ${[item.il, item.ilce].filter(Boolean).join(" / ")}
            `);

            bounds.push([point.lat, point.lng]);
        });

        if (route.geometry?.length) {
            L.polyline(route.geometry, {
                color: "#3b6ef5",
                weight: 4,
                opacity: 0.85,
            }).addTo(map);

            route.geometry.forEach((p) => bounds.push(p));
        }

        if (bounds.length) {
            map.fitBounds(bounds, { padding: [30, 30] });
        }

        return () => {
            map.remove();
            mapInstanceRef.current = null;
        };
    }, [route]);

    return <div ref={mapRef} className="detay-map" />;
}

function RoutePoint({ item, index, total, showDriveDetail, onChangeStopDateTime }) {
    const isLoad = item.type === "Yükleme";
    const segment = item.segment;

    return (
        <div className="detay-route-row">
            <div className="detay-route-track">
                <div className={`detay-route-dot ${isLoad ? "load" : "delivery"}`}>
                    {index + 1}
                </div>
                {index < total - 1 && <div className="detay-route-line" />}
            </div>

            <div className={`detay-route-card ${isLoad ? "load" : "delivery"}`}>
                <div className="detay-route-top">
                    <div className="detay-route-left">
                        <span className={`detay-route-type ${isLoad ? "load" : "delivery"}`}>
                            {item.type}
                        </span>

                        {item.hasManualTime && (
                            <span className="detay-manual-badge">
                                Gerçek zaman girildi
                            </span>
                        )}
                    </div>

                    <div className="detay-route-badges">
                        <span className={`detay-status ${item.status.key}`}>
                            {item.status.label}
                        </span>
                        <span className="detay-route-stop">{index + 1}. Nokta</span>
                    </div>
                </div>

                {showDriveDetail && segment && (
                    <div className="detay-segment-box">
                        <div className="detay-segment-title">
                            {segment.fromIndex + 1}. noktadan {segment.toIndex + 1}. noktaya geçiş
                        </div>

                        <div className="detay-segment-grid">
                            <span>Mesafe <strong>{formatKm(segment.distanceKm)}</strong></span>
                            <span>Net sürüş <strong>{formatEta(segment.netDriveMin)}</strong></span>
                            <span>Mola <strong>{formatEta(segment.breakMin)}</strong></span>
                            <span>Dinlenme <strong>{formatEta(segment.restMin)}</strong></span>
                            <span>Gerçek ETA <strong>{formatEta(segment.legalDurationMin)}</strong></span>
                        </div>
                    </div>
                )}

                <div className="detay-info-grid">
                    <div className="detay-info-item">
                        <span>Nokta</span>
                        <strong>{item.nokta || "—"}</strong>
                    </div>

                    <div className="detay-info-item">
                        <span>İl</span>
                        <strong>{item.il || "—"}</strong>
                    </div>

                    <div className="detay-info-item">
                        <span>İlçe</span>
                        <strong>{item.ilce || "—"}</strong>
                    </div>

                    <div className="detay-info-item detay-input-item">
                        <span>{isLoad ? "Yükleme Noktasına Varış" : "Teslim Noktasına Varış"}</span>
                        <input
                            className="detay-masked-date-input"
                            inputMode="numeric"
                            placeholder="gg.aa.yyyy ss:dd"
                            value={item.varisInput ?? ""}
                            onChange={(e) => onChangeStopDateTime(index, "varis", e.target.value)}
                        />
                    </div>

                    <div className="detay-info-item detay-input-item">
                        <span>{isLoad ? "Yükleme Noktasından Çıkış" : "Teslim Noktasından Çıkış"}</span>
                        <input
                            className="detay-masked-date-input"
                            inputMode="numeric"
                            placeholder="gg.aa.yyyy ss:dd"
                            value={item.cikisInput ?? ""}
                            onChange={(e) => onChangeStopDateTime(index, "cikis", e.target.value)}
                        />
                    </div>

                    <div className="detay-info-item detay-arrival-card">
                        <span>Tahmini Varış</span>
                        <strong>{formatDateTime(item.estimatedArrival)}</strong>
                        {item.actualArrival && <small>Gerçek varış baz alındı</small>}
                    </div>
                </div>
            </div>
        </div>
    );
}

function Detaylar({ row, onClose, onTripReadyToComplete }) {
    const [mapRoute, setMapRoute] = useState(null);
    const [routeLoading, setRouteLoading] = useState(false);
    const [routeError, setRouteError] = useState("");
    const [showDriveDetail, setShowDriveDetail] = useState(false);
    const [editableRoute, setEditableRoute] = useState([]);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState(null);
    const [showRouteEditor, setShowRouteEditor] = useState(false);

    useEffect(() => {
        if (!row) {
            setEditableRoute([]);
            return;
        }

        setEditableRoute(buildRoute(row));
    }, [row]);

    const routeGeoKey = useMemo(() => {
        return editableRoute
            .map((x) => `${x.type}|${x.nokta}|${x.il}|${x.ilce}`)
            .join(";;");
    }, [editableRoute]);

    const enrichedRoute = useMemo(() => {
        if (!row) return [];
        const baseDate = getBaseDate(row);
        return buildSegments(editableRoute, mapRoute?.legs || [], baseDate);
    }, [row, editableRoute, mapRoute]);

    function showToast(type, message) {
        setToast({ type, message });

        setTimeout(() => {
            setToast(null);
        }, 2600);
    }

    function handleChangeStopDateTime(index, field, value) {
        const maskedValue = maskDateTimeInput(value);
        const isoValue = maskedDateTimeToIso(maskedValue);

        setEditableRoute((prev) =>
            prev.map((item, i) => {
                if (i !== index) return item;

                const updated = {
                    ...item,
                    [`${field}Input`]: maskedValue,
                    [field]: isoValue,
                };

                return {
                    ...updated,
                    status: getStatus(updated),
                };
            })
        );
    }

    function handleSaveReorderedRoute(nextRoute) {
        const updatedRoute = nextRoute.map((item, index) => ({
            ...item,
            sira: index + 1,
            id: item.id || `${item.type}-${index}-${item.nokta || ""}`,
            status: getStatus(item),
        }));

        setEditableRoute(updatedRoute);
        setShowRouteEditor(false);

        showToast(
            "success",
            "Teslim sırası güncellendi. Kaydet butonuyla kalıcı hale getirebilirsin."
        );
    }

    async function handleSaveRouteDetails() {
        if (!row) return;

        setSaving(true);

        try {
            const rotaDetaylari = editableRoute.map((item, index) => ({
                tip: item.type === "Yükleme" ? "yukleme" : "teslim",
                type: item.type,
                sira: index + 1,

                nokta: item.nokta || null,
                il: item.il || null,
                ilce: item.ilce || null,

                varis: item.varis || null,
                cikis: item.cikis || null,

                varisInput: item.varisInput || "",
                cikisInput: item.cikisInput || "",
            }));

            let query = supabase
                .from("aktif_seferler")
                .update({
                    rota_detaylari: rotaDetaylari,
                    updated_at: new Date().toISOString(),
                });

            if (row.id) {
                query = query.eq("id", row.id);
            } else {
                query = query.eq("sefer_no", row.sefer_no);
            }

            const { error } = await query;

            if (error) throw error;

            showToast("success", "Rota detayları kaydedildi.");

            if (isRouteFullyCompleted(rotaDetaylari)) {
                setTimeout(() => {
                    onTripReadyToComplete?.({
                        ...row,
                        rota_detaylari: rotaDetaylari,
                    });
                }, 350);
            }
        } catch (err) {
            console.error("Detay kaydetme hatası:", err);
            showToast("error", "Rota detayları kaydedilirken hata oluştu.");
        } finally {
            setSaving(false);
        }
    }

    useEffect(() => {
        if (!row || editableRoute.length < 2) {
            setMapRoute(null);
            return;
        }

        let cancelled = false;

        async function loadRoute() {
            setRouteLoading(true);
            setRouteError("");
            setShowDriveDetail(false);

            try {
                const points = [];
                const pointStops = [];

                for (const stop of editableRoute) {
                    const addresses = buildAddressCandidates(stop);
                    const point = await geocodeAddress(addresses);

                    if (point) {
                        points.push(point);
                        pointStops.push(stop);
                    }

                    await new Promise((resolve) => setTimeout(resolve, 350));
                }

                if (cancelled) return;

                if (points.length < 2) {
                    setMapRoute(null);
                    setRouteError("Harita için yeterli koordinat bulunamadı.");
                    return;
                }

                const osrm = await fetchOsrmRoute(points);

                if (cancelled) return;

                setMapRoute({
                    stops: pointStops,
                    points,
                    geometry: osrm?.geometry || points.map((p) => [p.lat, p.lng]),
                    distanceKm: osrm?.distanceKm,
                    durationMin: osrm?.durationMin,
                    legs: osrm?.legs || [],
                });
            } catch {
                if (!cancelled) {
                    setMapRoute(null);
                    setRouteError("Rota hesaplanırken hata oluştu.");
                }
            } finally {
                if (!cancelled) setRouteLoading(false);
            }
        }

        loadRoute();

        return () => {
            cancelled = true;
        };
    }, [row, routeGeoKey]);

    useEffect(() => {
        if (!row) return;

        const handler = (e) => {
            if (e.key === "Escape") {
                if (showRouteEditor) {
                    setShowRouteEditor(false);
                } else {
                    onClose();
                }
            }
        };

        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [row, onClose, showRouteEditor]);

    if (!row) return null;

    const totalBreakMin = enrichedRoute.at(-1)?.totalBreakMin || 0;
    const totalRestMin = enrichedRoute.at(-1)?.totalRestMin || 0;
    const totalLegalMin = enrichedRoute.at(-1)?.cumulativeLegalMin || 0;
    const manualCount = enrichedRoute.filter((x) => x.hasManualTime).length;

    return (
        <div className="detay-overlay" onClick={onClose}>
            <div className="detay-panel" onClick={(e) => e.stopPropagation()}>
                <div className="detay-header">
                    <div>
                        <div className="detay-eyebrow">Rota Detayı</div>
                        <h2>{row.sefer_no || "Sefer Detayı"}</h2>
                    </div>

                    <div style={{ display: "flex", gap: 8 }}>
                        <button
                            className="detay-close-btn"
                            onClick={() => setShowRouteEditor(true)}
                            disabled={saving}
                        >
                            Teslim Sırası Düzenle
                        </button>

                        <button
                            className="detay-close-btn"
                            onClick={handleSaveRouteDetails}
                            disabled={saving}
                        >
                            {saving ? "Kaydediliyor..." : "Kaydet"}
                        </button>

                        <button className="detay-close-btn" onClick={onClose}>
                            Kapat
                        </button>
                    </div>
                </div>

                <div className="detay-summary">
                    <span>{editableRoute.filter((x) => x.type === "Yükleme").length} yükleme</span>
                    <span>{editableRoute.filter((x) => x.type === "Teslim").length} teslim</span>
                    <span>{editableRoute.length} rota noktası</span>
                    <span>{manualCount} gerçek zaman</span>
                    <span>{mapRoute?.distanceKm ? `${mapRoute.distanceKm.toFixed(1)} km` : "Mesafe —"}</span>
                    <span>Net sürüş {mapRoute?.durationMin ? formatEta(mapRoute.durationMin) : "—"}</span>
                    <span>Gerçek ETA {totalLegalMin ? formatEta(totalLegalMin) : "—"}</span>

                    <button
                        type="button"
                        className="detay-drive-btn"
                        onClick={() => setShowDriveDetail((v) => !v)}
                    >
                        {showDriveDetail ? "Sürüş Detayını Gizle" : "Sürüş Detayı"}
                    </button>
                </div>

                <div className="detay-helper-card">
                    Varış veya çıkış saati girildiğinde, sonraki noktaların tahmini varış hesabı bu gerçek zamana göre yeniden hesaplanır.
                </div>

                {showDriveDetail && (
                    <div className="detay-drive-detail">
                        <div className="detay-drive-title">ETA Hesap Mantığı</div>

                        <div className="detay-eta-rule">
                            <strong>Döngü:</strong>
                            <span>4.5 saat yol</span>
                            <span>45 dk mola</span>
                            <span>4.5 saat yol</span>
                            <span>11 saat dinlenme</span>
                        </div>

                        <div className="detay-drive-summary">
                            <div>
                                <span>Toplam Mola</span>
                                <strong>{formatEta(totalBreakMin)}</strong>
                            </div>

                            <div>
                                <span>Toplam Dinlenme</span>
                                <strong>{formatEta(totalRestMin)}</strong>
                            </div>

                            <div>
                                <span>Net Sürüş</span>
                                <strong>{mapRoute?.durationMin ? formatEta(mapRoute.durationMin) : "—"}</strong>
                            </div>

                            <div>
                                <span>Gerçek ETA</span>
                                <strong>{totalLegalMin ? formatEta(totalLegalMin) : "—"}</strong>
                            </div>
                        </div>
                    </div>
                )}

                <div className="detay-map-card">
                    {routeLoading && <div className="detay-map-loading">Harita, kilometre ve ETA hesaplanıyor...</div>}
                    {!routeLoading && routeError && <div className="detay-map-error">{routeError}</div>}
                    {!routeLoading && mapRoute && <RouteMap route={mapRoute} />}
                </div>

                <div className="detay-route-list">
                    {enrichedRoute.length === 0 ? (
                        <div className="detay-empty">Bu sefer için rota detayı bulunamadı.</div>
                    ) : (
                        enrichedRoute.map((item, index) => (
                            <RoutePoint
                                key={`${item.type}-${index}-${item.nokta || ""}`}
                                item={item}
                                index={index}
                                total={enrichedRoute.length}
                                showDriveDetail={showDriveDetail}
                                onChangeStopDateTime={handleChangeStopDateTime}
                            />
                        ))
                    )}
                </div>

                {toast && (
                    <div className={`detay-toast ${toast.type}`}>
                        <div className="detay-toast-icon">
                            {toast.type === "success" ? "✓" : "!"}
                        </div>

                        <div>
                            <strong>{toast.type === "success" ? "Kaydedildi" : "Hata"}</strong>
                            <span>{toast.message}</span>
                        </div>
                    </div>
                )}

                {showRouteEditor && (
                    <RotaDuzenleme
                        route={editableRoute}
                        onClose={() => setShowRouteEditor(false)}
                        onSave={handleSaveReorderedRoute}
                    />
                )}
            </div>
        </div>
    );
}

export default Detaylar;