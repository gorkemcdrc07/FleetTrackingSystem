import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react";
import { supabase } from "../../supabaseClient";
import "./TamamlananSeferler.css";
import SutunDuzeni from "../AktifSeferler/Gorunum/SutunDuzeni";
import * as XLSX from "xlsx-js-style";

function formatDate(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d)) return value;

    return d.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function formatDateTime(value) {
    if (!value) return "—";
    const d = new Date(value);
    if (isNaN(d)) return value;

    return d.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatNumber(value) {
    if (value === null || value === undefined || value === "") return "—";
    return Number(value).toLocaleString("tr-TR", {
        maximumFractionDigits: 2,
    });
}

function split(val) {
    return String(val || "")
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean);
}

function getLastValue(value) {
    const parts = split(value);
    return parts.length ? parts[parts.length - 1] : "";
}

function normalizeTR(value) {
    return String(value || "")
        .toLocaleUpperCase("tr-TR")
        .replace(/\s+/g, " ")
        .trim();
}

function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date) ? null : date;
}

function parseGunValue(value) {
    if (!value) return null;

    const text = String(value)
        .replace(",", ".")
        .replace(/[^\d.]/g, "");

    const num = Number(text);
    return Number.isFinite(num) ? num : null;
}

function getActualEtaDays(row) {
    const rota = Array.isArray(row.rota_detaylari) ? row.rota_detaylari : [];
    if (!rota.length) return null;

    const loads = rota.filter((x) => x.tip === "yukleme" || x.type === "Yükleme");
    const deliveries = rota.filter((x) => x.tip === "teslim" || x.type === "Teslim");

    const firstLoad = loads[0];
    const lastDelivery = deliveries[deliveries.length - 1];

    const start = parseDate(firstLoad?.cikis || firstLoad?.gerceklesen_cikis);
    const end = parseDate(lastDelivery?.varis || lastDelivery?.gerceklesen_varis);

    if (!start || !end) return null;

    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return null;

    return Number((diffMs / (1000 * 60 * 60 * 24)).toFixed(2));
}

function IconColumns() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M9 4v16M15 4v16" stroke="currentColor" strokeWidth="2" />
        </svg>
    );
}

function EtaBadge({ delayed }) {
    return (
        <span className={`eta-badge ${delayed ? "danger" : "success"}`}>
            {delayed ? "Gecikti" : "Normal"}
        </span>
    );
}

const IKAZ_ACIKLAMA =
    "Operasyon verimsizlik konusunda ikaz edildi ama yine de araç bulamadıkları için filo ataması yapıldı.";

const TONAJ_ACIKLAMA = "Tonajlı";

function isTonajli(row) {
    return String(row?.tonaj_durumu || "").trim() === TONAJ_ACIKLAMA;
}

function isIkazli(row) {
    return Boolean(String(row?.aciklama || "").trim());
}

const DEFAULT_COLUMNS = [
    { key: "sefer_no", label: "Sefer No", width: 120, sticky: true, type: "sefer", locked: true },
    { key: "sefer_tarihi", label: "Sefer Tarihi", width: 115, type: "date" },
    { key: "arac_statu", label: "Araç Statü", width: 115, type: "statu" },
    { key: "plaka", label: "Plaka", width: 95, type: "plaka" },
    { key: "treyler", label: "Treyler", width: 95, type: "plaka" },
    { key: "surucu_ad_soyad", label: "Sürücü", width: 155 },
    { key: "musteri_adi", label: "Müşteri", width: 175 },
    { key: "musteri_siparis_no", label: "Sipariş No", width: 125 },
    { key: "hizmet_adi", label: "Hizmet", width: 135 },
    { key: "proje_adi", label: "Proje", width: 135 },
    { key: "yukleme_ili", label: "Yükleme İl", width: 125, type: "multi" },
    { key: "teslim_ili", label: "Son Teslim İl", width: 125, type: "last" },
    { key: "irsaliye_no", label: "İrsaliye No", width: 135 },
    { key: "eta_referans_gun", label: "ETA Referans", width: 120 },
    { key: "eta_gerceklesen_gun", label: "Gerçekleşen", width: 125, type: "gun" },
    { key: "eta_gecikme_suresi", label: "Gecikme", width: 115, type: "gecikme" },
    { key: "eta_durum", label: "ETA Durum", width: 110, type: "etaDurum" },
    { key: "tonaj_durumu", label: "Tonaj", width: 110, type: "tonaj" },
    { key: "ikaz_durumu", label: "İkaz", width: 110, type: "ikaz" },
    { key: "aciklama", label: "Açıklama", width: 260, type: "textLong" },
];

function CellValue({ col, row }) {
    if (col.key === "eta_durum") return <EtaBadge delayed={row.eta_gecikme} />;

    if (col.type === "tonaj") {
        return isTonajli(row) ? (
            <span className="mini-status tonaj">Tonajlı</span>
        ) : (
            <span className="muted">—</span>
        );
    }

    if (col.type === "ikaz") {
        return isIkazli(row) ? (
            <span className="mini-status ikaz" title={row.aciklama}>İkazlı</span>
        ) : (
            <span className="muted">—</span>
        );
    }

    const val = row[col.key];

    if (col.type === "sefer") return <span className="sefer-badge">{val || "—"}</span>;
    if (col.type === "plaka") return val ? <span className="plate-cell">{val}</span> : <span className="muted">—</span>;
    if (col.type === "statu") return val ? <span className="statu-pill">{val}</span> : <span className="muted">—</span>;
    if (col.type === "date") return <span className="date-val">{formatDate(val)}</span>;

    if (col.type === "last") {
        const last = getLastValue(val);
        return last ? <span>{last}</span> : <span className="muted">—</span>;
    }

    if (col.type === "gun") {
        return val ? <span>{formatNumber(val)} Gün</span> : <span className="muted">—</span>;
    }

    if (col.type === "gecikme") {
        if (val) return <span>{formatNumber(val)} Gün</span>;
        return row.eta_gecikme ? <span>Gecikme var</span> : <span className="muted">—</span>;
    }

    if (col.type === "textLong") {
        return val ? <span className="long-text-cell" title={val}>{val}</span> : <span className="muted">—</span>;
    }

    if (col.type === "multi") {
        const parts = split(val);
        if (!parts.length) return <span className="muted">—</span>;
        if (parts.length === 1) return <span>{parts[0]}</span>;

        return (
            <span className="multi-val">
                <span className="multi-first">{parts[0]}</span>
                <span className="multi-more">+{parts.length - 1}</span>
            </span>
        );
    }

    return val ? <span>{val}</span> : <span className="muted">—</span>;
}

function JsonBlock({ title, value }) {
    if (!value) return null;

    return (
        <div className="detail-section">
            <h4>{title}</h4>
            <pre>{JSON.stringify(value, null, 2)}</pre>
        </div>
    );
}

function diffText(startValue, endValue) {
    const start = parseDate(startValue);
    const end = parseDate(endValue);

    if (!start || !end) return "—";

    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return "—";

    const totalMinutes = Math.floor(diffMs / (1000 * 60));
    const days = Math.floor(totalMinutes / 1440);
    const hours = Math.floor((totalMinutes % 1440) / 60);
    const minutes = totalMinutes % 60;

    const parts = [];
    if (days) parts.push(`${days} gün`);
    if (hours) parts.push(`${hours} saat`);
    if (minutes) parts.push(`${minutes} dk`);

    return parts.length ? parts.join(" ") : "0 dk";
}

function getInTime(item) {
    return item.giris || item.varis || item.gerceklesen_varis || item.planlanan_varis;
}

function getOutTime(item) {
    return item.cikis || item.gerceklesen_cikis || item.planlanan_cikis;
}

function getLocation(item) {
    return item.il || item.sehir || item.lokasyon || item.adres || "—";
}

function RouteGroup({ title, subtitle, items, variant }) {
    return (
        <div className={`route-group-card ${variant}`}>
            <div className="route-group-head">
                <div>
                    <span>{subtitle}</span>
                    <h5>{title}</h5>
                </div>
                <strong>{items.length}</strong>
            </div>

            {!items.length && (
                <div className="detail-empty">Kayıt bulunamadı.</div>
            )}

            {!!items.length && (
                <div className="route-group-list">
                    {items.map((item, index) => {
                        const inTime = getInTime(item);
                        const outTime = getOutTime(item);

                        return (
                            <div className="route-mini-card" key={index}>
                                <div className="route-mini-left">
                                    <div className="route-mini-index">{index + 1}</div>
                                    <div>
                                        <span>{item.tip || item.type || "Durak"}</span>
                                        <strong>{getLocation(item)}</strong>
                                    </div>
                                </div>

                                <div className="route-time-row">
                                    <div>
                                        <span>Giriş</span>
                                        <strong>{formatDateTime(inTime)}</strong>
                                    </div>

                                    <div>
                                        <span>Çıkış</span>
                                        <strong>{formatDateTime(outTime)}</strong>
                                    </div>

                                    <div className="duration-box">
                                        <span>Geçen Süre</span>
                                        <strong>{diffText(inTime, outTime)}</strong>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function RowDetails({ row }) {
    const rota = Array.isArray(row.rota_detaylari) ? row.rota_detaylari : [];

    const yuklemeler = rota.filter((item) => {
        const type = normalizeTR(item.tip || item.type);
        return type.includes("YUK") || type.includes("LOAD");
    });

    const teslimler = rota.filter((item) => {
        const type = normalizeTR(item.tip || item.type);
        return type.includes("TESL") || type.includes("DELIVERY");
    });

    const allTimes = rota
        .flatMap((item) => [getInTime(item), getOutTime(item)])
        .map(parseDate)
        .filter(Boolean)
        .sort((a, b) => a.getTime() - b.getTime());

    const firstTime = allTimes[0];
    const lastTime = allTimes[allTimes.length - 1];

    return (
        <div className="detail-viewport-panel premium-detail">
            <div className="premium-detail-card">
                <div className="premium-detail-header">
                    <div>
                        <span>Sefer Zaman Akışı</span>
                        <h4>{row.sefer_no || "Sefer Detayı"}</h4>
                        <div className="detail-status-row">
                            {isTonajli(row) && <span className="mini-status tonaj">Tonajlı</span>}
                            {isIkazli(row) && <span className="mini-status ikaz" title={row.aciklama}>İkazlı</span>}
                        </div>
                    </div>

                    <div className="premium-summary">
                        <div>
                            <span>Yükleme</span>
                            <strong>{yuklemeler.length}</strong>
                        </div>
                        <div>
                            <span>Teslim</span>
                            <strong>{teslimler.length}</strong>
                        </div>
                        <div>
                            <span>Toplam Süre</span>
                            <strong>{diffText(firstTime, lastTime)}</strong>
                        </div>
                    </div>
                </div>

                <div className="route-flow-line">
                    <div>
                        <span>İlk Hareket</span>
                        <strong>{formatDateTime(firstTime)}</strong>
                    </div>

                    <div className="flow-bar">
                        <i />
                    </div>

                    <div>
                        <span>Son İşlem</span>
                        <strong>{formatDateTime(lastTime)}</strong>
                    </div>
                </div>

                <div className="route-groups-grid">
                    <RouteGroup
                        title="Yüklemeler"
                        subtitle="Başlangıç Noktaları"
                        items={yuklemeler}
                        variant="load"
                    />

                    <RouteGroup
                        title="Teslimler"
                        subtitle="Varış Noktaları"
                        items={teslimler}
                        variant="delivery"
                    />
                </div>
            </div>
        </div>
    );
}

async function enrichEta(row) {
    let etaReferansGun = row.eta_referans_gun || null;
    let etaGerceklesenGun = row.eta_gerceklesen_gun ?? getActualEtaDays(row);
    let etaGecikme = Boolean(row.eta_gecikme);
    let etaGecikmeSuresi = row.eta_gecikme_suresi ?? null;

    if (!etaReferansGun) {
        const cikis = normalizeTR(getLastValue(row.yukleme_ili));
        const varis = normalizeTR(getLastValue(row.teslim_ili));

        if (cikis && varis) {
            const { data } = await supabase
                .from("eta_referanslari")
                .select("*")
                .ilike("cikis", `${cikis}%`)
                .ilike("varis", `${varis}%`)
                .maybeSingle();

            if (data) etaReferansGun = data["gün"];
        }
    }

    const etaDays = parseGunValue(etaReferansGun);

    if (etaGerceklesenGun && etaDays) {
        etaGecikme = etaGerceklesenGun > etaDays;
        etaGecikmeSuresi = etaGecikme ? Number((etaGerceklesenGun - etaDays).toFixed(2)) : 0;
    }

    return {
        ...row,
        eta_referans_gun: etaReferansGun,
        eta_gerceklesen_gun: etaGerceklesenGun,
        eta_gecikme: etaGecikme,
        eta_gecikme_suresi: etaGecikmeSuresi,
    };
}

function TamamlananSeferler() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showSutunDuzeni, setShowSutunDuzeni] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [onlyEtaMismatch, setOnlyEtaMismatch] = useState(false);
    const [expandedRows, setExpandedRows] = useState({});
    const resizingRef = useRef(null);

    const [columnWidths, setColumnWidths] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem("tamamlananSeferlerColumnWidths")) || {};
        } catch {
            return {};
        }
    });

    const [columnOrder, setColumnOrder] = useState(() => {
        try {
            const saved = JSON.parse(localStorage.getItem("tamamlananSeferlerColumnOrder"));
            if (Array.isArray(saved) && saved.length) return saved;
            return DEFAULT_COLUMNS.map((col) => col.key);
        } catch {
            return DEFAULT_COLUMNS.map((col) => col.key);
        }
    });

    const [visibleColumnKeys, setVisibleColumnKeys] = useState(() => {
        const defaultKeys = DEFAULT_COLUMNS.map((col) => col.key);

        try {
            const saved = JSON.parse(localStorage.getItem("tamamlananSeferlerVisibleColumns"));
            if (Array.isArray(saved) && saved.length) {
                const lockedKeys = DEFAULT_COLUMNS.filter((col) => col.locked).map((col) => col.key);
                const merged = Array.from(new Set([...saved, ...lockedKeys]));
                localStorage.setItem("tamamlananSeferlerVisibleColumns", JSON.stringify(merged));
                return merged;
            }
            return defaultKeys;
        } catch {
            return defaultKeys;
        }
    });

    const toggleExpanded = useCallback((id) => {
        setExpandedRows((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    }, []);

    useEffect(() => {
        async function loadData() {
            setLoading(true);

            try {
                const { data, error } = await supabase
                    .from("tamamlanan_seferler")
                    .select("*")
                    .order("sefer_tarihi", { ascending: false });

                if (error) throw error;

                const enriched = [];
                for (const row of data || []) {
                    enriched.push(await enrichEta(row));
                }

                setRows(enriched);
            } catch (err) {
                console.error("Tamamlanan seferler alınamadı:", err);
            } finally {
                setLoading(false);
            }
        }

        loadData();
    }, []);

    const delayedCount = useMemo(() => {
        return rows.filter((x) => x.eta_gecikme).length;
    }, [rows]);

    const tonajCount = useMemo(() => {
        return rows.filter(isTonajli).length;
    }, [rows]);

    const ikazCount = useMemo(() => {
        return rows.filter(isIkazli).length;
    }, [rows]);

    const filteredRows = useMemo(() => {
        return rows.filter((row) => {
            const rowDate = parseDate(row.sefer_tarihi);

            if (startDate && rowDate && rowDate < new Date(startDate)) return false;

            if (endDate && rowDate) {
                const end = new Date(endDate);
                end.setHours(23, 59, 59, 999);
                if (rowDate > end) return false;
            }

            if (onlyEtaMismatch && !row.eta_gecikme) return false;

            return true;
        });
    }, [rows, startDate, endDate, onlyEtaMismatch]);

    function exportEtaMismatchToExcel() {
        const etaRows = filteredRows.filter((row) => row.eta_gecikme);

        if (!etaRows.length) {
            alert("Excel'e aktarılacak ETA uyumsuzluğu bulunamadı.");
            return false;
        }

        const reportRows = etaRows.map((row) => ({
            "Sefer No": row.sefer_no || "",
            "Sefer Tarihi": formatDate(row.sefer_tarihi),
            "Araç Statü": row.arac_statu || "",
            "Plaka": row.plaka || "",
            "Treyler": row.treyler || "",
            "Sürücü": row.surucu_ad_soyad || "",
            "Müşteri": row.musteri_adi || "",
            "Sipariş No": row.musteri_siparis_no || "",
            "Hizmet": row.hizmet_adi || "",
            "Proje": row.proje_adi || "",
            "Yükleme İl": row.yukleme_ili || "",
            "Son Teslim İl": row.teslim_ili || "",
            "İrsaliye No": row.irsaliye_no || "",
            "ETA Referans Gün": row.eta_referans_gun || "",
            "Gerçekleşen Gün": row.eta_gerceklesen_gun || "",
            "Gecikme Süresi": row.eta_gecikme_suresi || "",
            "ETA Durum": "Uyumsuz / Gecikti",
            "Tonaj": isTonajli(row) ? "Tonajlı" : "",
            "İkaz": isIkazli(row) ? "İkazlı" : "",
            "Açıklama": row.aciklama || "",
        }));

        const worksheet = XLSX.utils.json_to_sheet(reportRows, { origin: "A6" });

        XLSX.utils.sheet_add_aoa(
            worksheet,
            [
                ["ETA UYUMSUZLUK RAPORU"],
                [`Rapor Tarihi: ${formatDate(new Date())}`],
                [`Toplam Uyumsuz Sefer: ${etaRows.length}`],
                [
                    startDate || endDate
                        ? `Tarih Filtresi: ${startDate || "Başlangıç yok"} - ${endDate || "Bitiş yok"}`
                        : "Tarih Filtresi: Tüm tarih aralığı",
                ],
                [""],
            ],
            { origin: "A1" }
        );

        worksheet["!merges"] = [
            { s: { r: 0, c: 0 }, e: { r: 0, c: 19 } },
            { s: { r: 1, c: 0 }, e: { r: 1, c: 19 } },
            { s: { r: 2, c: 0 }, e: { r: 2, c: 19 } },
            { s: { r: 3, c: 0 }, e: { r: 3, c: 19 } },
            { s: { r: 4, c: 0 }, e: { r: 4, c: 19 } },
        ];

        worksheet["!cols"] = [
            { wch: 15 }, { wch: 15 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 24 },
            { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 26 }, { wch: 26 },
            { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 18 }, { wch: 22 }, { wch: 14 }, { wch: 14 }, { wch: 40 },
        ];

        worksheet["!rows"] = [
            { hpt: 34 },
            { hpt: 24 },
            { hpt: 24 },
            { hpt: 24 },
            { hpt: 10 },
            { hpt: 30 },
        ];

        worksheet["!autofilter"] = {
            ref: `A6:T${reportRows.length + 6}`,
        };

        const range = XLSX.utils.decode_range(worksheet["!ref"]);

        worksheet["A1"].s = {
            font: { bold: true, sz: 22, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "0F172A" } },
            alignment: { horizontal: "center", vertical: "center" },
        };

        for (let C = range.s.c; C <= range.e.c; C++) {
            const cellAddress = XLSX.utils.encode_cell({ r: 5, c: C });
            if (!worksheet[cellAddress]) continue;

            worksheet[cellAddress].s = {
                font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
                fill: { fgColor: { rgb: "334155" } },
                alignment: { horizontal: "center", vertical: "center", wrapText: true },
                border: {
                    top: { style: "thin", color: { rgb: "94A3B8" } },
                    bottom: { style: "thin", color: { rgb: "94A3B8" } },
                    left: { style: "thin", color: { rgb: "94A3B8" } },
                    right: { style: "thin", color: { rgb: "94A3B8" } },
                },
            };
        }

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, "ETA Raporu");

        XLSX.writeFile(
            workbook,
            `eta-uyumsuzluk-raporu-${new Date().toISOString().slice(0, 10)}.xlsx`,
            { cellStyles: true }
        );

        return true;
    }

    const orderedColumns = useMemo(() => {
        const map = new Map(DEFAULT_COLUMNS.map((col) => [col.key, col]));
        const ordered = columnOrder.map((key) => map.get(key)).filter(Boolean);
        const missing = DEFAULT_COLUMNS.filter((col) => !columnOrder.includes(col.key));
        return [...ordered, ...missing];
    }, [columnOrder]);

    const visibleOrderedColumns = useMemo(() => {
        return orderedColumns.filter((col) => visibleColumnKeys.includes(col.key) || col.locked);
    }, [orderedColumns, visibleColumnKeys]);

    const columnsWithLayout = useMemo(() => {
        let stickyLeft = 0;

        return visibleOrderedColumns.map((col) => {
            const width = columnWidths[col.key] || col.width;
            const nextCol = {
                ...col,
                width,
                left: col.sticky ? stickyLeft : undefined,
            };

            if (col.sticky) stickyLeft += width;
            return nextCol;
        });
    }, [visibleOrderedColumns, columnWidths]);

    const toggleColumn = useCallback((key) => {
        const col = DEFAULT_COLUMNS.find((x) => x.key === key);
        if (col?.locked) return;

        setVisibleColumnKeys((prev) => {
            const next = prev.includes(key)
                ? prev.filter((x) => x !== key)
                : [...prev, key];

            localStorage.setItem("tamamlananSeferlerVisibleColumns", JSON.stringify(next));
            return next;
        });
    }, []);

    const reorderColumns = useCallback((sourceKey, targetKey) => {
        setColumnOrder((prev) => {
            const sourceIndex = prev.indexOf(sourceKey);
            const targetIndex = prev.indexOf(targetKey);
            if (sourceIndex === -1 || targetIndex === -1) return prev;

            const next = [...prev];
            const [removed] = next.splice(sourceIndex, 1);
            next.splice(targetIndex, 0, removed);

            localStorage.setItem("tamamlananSeferlerColumnOrder", JSON.stringify(next));
            return next;
        });
    }, []);

    const resetColumnLayout = useCallback(() => {
        const defaultOrder = DEFAULT_COLUMNS.map((col) => col.key);
        const defaultVisible = DEFAULT_COLUMNS.map((col) => col.key);

        localStorage.removeItem("tamamlananSeferlerColumnOrder");
        localStorage.removeItem("tamamlananSeferlerVisibleColumns");
        localStorage.removeItem("tamamlananSeferlerColumnWidths");

        setColumnOrder(defaultOrder);
        setVisibleColumnKeys(defaultVisible);
        setColumnWidths({});
    }, []);

    const startResize = useCallback((e, col) => {
        e.preventDefault();
        e.stopPropagation();

        resizingRef.current = {
            key: col.key,
            startX: e.clientX,
            startWidth: col.width,
        };

        document.body.classList.add("is-column-resizing");
    }, []);

    useEffect(() => {
        const onMouseMove = (e) => {
            if (!resizingRef.current) return;

            const { key, startX, startWidth } = resizingRef.current;
            const nextWidth = Math.max(50, startWidth + e.clientX - startX);

            setColumnWidths((prev) => {
                const next = { ...prev, [key]: nextWidth };
                localStorage.setItem("tamamlananSeferlerColumnWidths", JSON.stringify(next));
                return next;
            });
        };

        const onMouseUp = () => {
            resizingRef.current = null;
            document.body.classList.remove("is-column-resizing");
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);

        return () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            document.body.classList.remove("is-column-resizing");
        };
    }, []);

    return (
        <div className="tamamlanan-page">
            <div className="tamamlanan-header">
                <div>
                    <span className="tamamlanan-eyebrow">Operasyon Yönetimi</span>
                    <h1>Tamamlanan Seferler</h1>
                </div>

                <div className="tamamlanan-stats">
                    <div className="stat-card">
                        <strong>{filteredRows.length}</strong>
                        <span>Toplam Sefer</span>
                    </div>

                    <div className="stat-card danger">
                        <strong>{delayedCount}</strong>
                        <span>ETA Gecikmiş</span>
                    </div>

                    <div className="stat-card warning">
                        <strong>{tonajCount}</strong>
                        <span>Tonajlı</span>
                    </div>

                    <div className="stat-card danger">
                        <strong>{ikazCount}</strong>
                        <span>İkazlı</span>
                    </div>

                    <div className="date-filter">
                        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                    </div>

                    <button
                        className={`listele-btn ${onlyEtaMismatch ? "danger-btn" : ""}`}
                        type="button"
                        onClick={() => {
                            if (!onlyEtaMismatch) {
                                setOnlyEtaMismatch(true);
                                return;
                            }

                            const exported = exportEtaMismatchToExcel();

                            if (exported) {
                                setOnlyEtaMismatch(false);
                            }
                        }}
                    >
                        {onlyEtaMismatch ? "ETA Raporunu Al" : "ETA Uyumsuzlukları Göster"}
                    </button>

                    <button
                        className="listele-btn secondary"
                        type="button"
                        onClick={() => setShowSutunDuzeni(true)}
                    >
                        <IconColumns />
                        Sütun Düzeni
                    </button>
                </div>
            </div>

            <div className="tamamlanan-card">
                <div className="table-wrapper">
                    <table className="tamamlanan-table">
                        <colgroup>
                            {columnsWithLayout.map((col) => (
                                <col key={col.key} style={{ width: col.width, minWidth: col.width }} />
                            ))}
                        </colgroup>

                        <thead>
                            <tr>
                                {columnsWithLayout.map((col) => (
                                    <th
                                        key={col.key}
                                        className={col.sticky ? "sticky-col th-sticky resizable-th" : "resizable-th"}
                                        style={col.sticky ? { left: col.left } : undefined}
                                    >
                                        <span>{col.label}</span>
                                        <span className="column-resizer" onMouseDown={(e) => startResize(e, col)} />
                                    </th>
                                ))}
                            </tr>
                        </thead>

                        <tbody>
                            {loading && (
                                <tr>
                                    <td colSpan={columnsWithLayout.length} className="empty-cell">
                                        Yükleniyor...
                                    </td>
                                </tr>
                            )}

                            {!loading && filteredRows.length === 0 && (
                                <tr>
                                    <td colSpan={columnsWithLayout.length} className="empty-cell">
                                        Tamamlanan sefer bulunamadı.
                                    </td>
                                </tr>
                            )}

                            {!loading && filteredRows.map((row) => {
                                const rowId = row.id || row.sefer_no;

                                return (
                                    <Fragment key={rowId}>
                                        <tr
                                            className={`${row.eta_gecikme ? "is-delayed" : ""} clickable-row ${expandedRows[rowId] ? "is-expanded" : ""}`}
                                            onClick={() => toggleExpanded(rowId)}
                                        >
                                            {columnsWithLayout.map((col) => (
                                                <td
                                                    key={col.key}
                                                    className={col.sticky ? "sticky-col" : ""}
                                                    style={col.sticky ? { left: col.left } : undefined}
                                                >
                                                    <CellValue col={col} row={row} />
                                                </td>
                                            ))}
                                        </tr>

                                        {expandedRows[rowId] && (
                                            <tr className="detail-row">
                                                <td colSpan={columnsWithLayout.length}>
                                                    <RowDetails row={row} />
                                                </td>
                                            </tr>
                                        )}
                                    </Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            {showSutunDuzeni && (
                <SutunDuzeni
                    columns={orderedColumns}
                    visibleColumnKeys={visibleColumnKeys}
                    onToggleColumn={toggleColumn}
                    onReorderColumns={reorderColumns}
                    onReset={resetColumnLayout}
                    onClose={() => setShowSutunDuzeni(false)}
                />
            )}
        </div>
    );
}

export default TamamlananSeferler;