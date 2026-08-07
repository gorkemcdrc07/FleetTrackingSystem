// TamamlananSeferler.jsx
import { useCallback, useEffect, useMemo, useRef, useState, Fragment } from "react";
import {
    findEtaReferenceDays,
    listCompletedTrips,
    updateCompletedTrip,
} from "../../services/completedTripRepository";
import "./CompletedTrips.css";
import ColumnLayout from "../ActiveTrips/ViewSettings/ColumnLayout";
import {
    formatDate, formatDateTime, formatNumber, fromDatetimeLocalValue,
    getActualEtaDays, getCompletedTripKey as getRowKey,
    getCompletedTripSortValue as getSortValue, getLastTripValue as getLastValue,
    hasTripWarning as isIkazli, isTonnageTrip as isTonajli,
    matchesCompletedTripColumn as matchColumnFilter,
    matchesCompletedTripSearch as matchGlobalSearch, normalizeTurkishText as normalizeTR,
    parseDate, parseDayValue as parseGunValue, splitTripValues as split,
    toDatetimeLocalValue, TONNAGE_DESCRIPTION as TONAJ_ACIKLAMA,
} from "../../domain/completedTripView";


/* ---------------------------------- İkonlar ---------------------------------- */

function IconColumns() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M9 4v16M15 4v16" stroke="currentColor" strokeWidth="2" />
        </svg>
    );
}

function IconFilter() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M4 5h16l-6 8v6l-4-2v-4L4 5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

function IconX() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M6 6l12 12M18 6L6 18" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
        </svg>
    );
}

function IconSearch() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
            <path d="M20 20l-3.2-3.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function IconChevronDown() {
    return (
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
            <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconRefresh({ spinning }) {
    return (
        <svg
            className={spinning ? "spin-icon" : ""}
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
        >
            <path
                d="M20 11A8 8 0 1 0 18.5 16.5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path d="M20 5v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconEdit() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
        </svg>
    );
}

function IconSort({ direction }) {
    return (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" className={`sort-icon-svg ${direction || ""}`}>
            <path d="M7 10l5-6 5 6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" className="sort-arrow up" />
            <path d="M7 14l5 6 5-6" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round" className="sort-arrow down" />
        </svg>
    );
}

function IconTruck() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <rect x="2" y="7" width="12" height="9" rx="1.5" stroke="currentColor" strokeWidth="2" />
            <path d="M14 10h4l3 3v3h-7z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <circle cx="7" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.8" />
            <circle cx="17.5" cy="18" r="1.6" stroke="currentColor" strokeWidth="1.8" />
        </svg>
    );
}

function IconClock() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7.5V12l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconWeight() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="6" r="2.6" stroke="currentColor" strokeWidth="2" />
            <path d="M7.5 10h9l2 10h-13z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        </svg>
    );
}

function IconAlertTriangle() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M12 4 2 20h20L12 4Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 10v4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="17.4" r="0.9" fill="currentColor" />
        </svg>
    );
}

function IconTrendUp() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <path d="M3 16l6-6 4 4 8-9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15 5h6v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconCheckCircle() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M8 12.5l2.6 2.6L16 9.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconAlertCircle() {
    return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 8v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            <circle cx="12" cy="16.2" r="0.9" fill="currentColor" />
        </svg>
    );
}

function EtaBadge({ delayed }) {
    return (
        <span className={`eta-badge ${delayed ? "danger" : "success"}`}>
            <i className="eta-dot" />
            {delayed ? "Gecikti" : "Normal"}
        </span>
    );
}

const DEFAULT_COLUMNS = [
    { key: "sefer_no", label: "Sefer No", width: 120, sticky: true, type: "sefer", locked: true },
    { key: "sefer_tarihi", label: "Sefer Tarihi", width: 115, type: "date" },
    { key: "arac_statu", label: "Araç Statü", width: 115, type: "statu", filter: "select" },
    { key: "plaka", label: "Plaka", width: 95, type: "plaka", filter: "text" },
    { key: "treyler", label: "Treyler", width: 95, type: "plaka", filter: "text" },
    { key: "surucu_ad_soyad", label: "Sürücü", width: 155, filter: "text" },
    { key: "musteri_adi", label: "Müşteri", width: 175, filter: "text" },
    { key: "musteri_siparis_no", label: "Sipariş No", width: 125, filter: "text" },
    { key: "hizmet_adi", label: "Hizmet", width: 135, filter: "text" },
    { key: "proje_adi", label: "Proje", width: 135, filter: "text" },
    { key: "yukleme_ili", label: "Yükleme İl", width: 125, type: "multi", filter: "text" },
    { key: "teslim_ili", label: "Son Teslim İl", width: 125, type: "last", filter: "text" },
    { key: "irsaliye_no", label: "İrsaliye No", width: 135, filter: "text" },
    { key: "eta_referans_gun", label: "ETA Referans", width: 120, filter: "text" },
    { key: "eta_gerceklesen_gun", label: "Gerçekleşen", width: 125, type: "gun", filter: "text" },
    { key: "eta_gecikme_suresi", label: "Gecikme", width: 115, type: "gecikme", filter: "text" },
    { key: "eta_durum", label: "ETA Durum", width: 110, type: "etaDurum", filter: "select" },
    { key: "tonaj_durumu", label: "Tonaj", width: 110, type: "tonaj", filter: "select" },
    { key: "ikaz_durumu", label: "İkaz", width: 110, type: "ikaz", filter: "select" },
    { key: "aciklama", label: "Açıklama", width: 260, type: "textLong", filter: "text" },
];

// Düzenleme modalinde değiştirilebilecek gerçek tablo alanları.
// eta_durum ve ikaz_durumu ekrandaki hesaplanan alanlardır; doğrudan update edilmez.
const EDIT_FIELDS = [
    { key: "sefer_no", label: "Sefer No", type: "text", group: "Sefer Bilgileri" },
    { key: "sefer_tarihi", label: "Sefer Tarihi", type: "text", group: "Sefer Bilgileri" },
    { key: "arac_statu", label: "Araç Statü", type: "text", group: "Araç / Sürücü" },
    { key: "plaka", label: "Plaka", type: "text", group: "Araç / Sürücü" },
    { key: "treyler", label: "Treyler", type: "text", group: "Araç / Sürücü" },
    { key: "surucu_ad_soyad", label: "Sürücü", type: "text", group: "Araç / Sürücü" },
    { key: "musteri_adi", label: "Müşteri", type: "text", group: "Müşteri / Proje" },
    { key: "musteri_siparis_no", label: "Sipariş No", type: "text", group: "Müşteri / Proje" },
    { key: "hizmet_adi", label: "Hizmet", type: "text", group: "Müşteri / Proje" },
    { key: "proje_adi", label: "Proje", type: "text", group: "Müşteri / Proje" },
    { key: "yukleme_ili", label: "Yükleme İl", type: "text", group: "Lokasyon / Evrak" },
    { key: "teslim_ili", label: "Son Teslim İl", type: "text", group: "Lokasyon / Evrak" },
    { key: "irsaliye_no", label: "İrsaliye No", type: "text", group: "Lokasyon / Evrak" },
    { key: "atama_yapan_kullanici", label: "Atayan Kullanıcı", type: "text", group: "Atama Bilgileri" },
    { key: "atama_tarihi", label: "Atama Tarihi", type: "datetime", group: "Atama Bilgileri" },
    { key: "tamamlanma_tarihi", label: "Tamamlanma Tarihi", type: "datetime", group: "Atama Bilgileri" },
    {
        key: "rota_detaylari",
        label: "Rota Detayları",
        type: "routeDetails",
        group: "Rota Bilgileri",
    },
];
const SELECT_COL_WIDTH = 42;
const ACTIONS_COL_WIDTH = 96;

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

/* ------------------------------ Düzenleme Modalı ------------------------------ */

function EditSeferModal({ row, saving, onClose, onSave }) {
    const groupedFields = useMemo(() => {
        return EDIT_FIELDS.reduce((acc, field) => {
            const group = field.group || "Genel";
            if (!acc[group]) acc[group] = [];
            acc[group].push(field);
            return acc;
        }, {});
    }, []);

    const [form, setForm] = useState(() => {
        const initial = {};

        EDIT_FIELDS.forEach((field) => {
            const rawValue = row?.[field.key];

            if (field.type === "datetime") {
                initial[field.key] = toDatetimeLocalValue(rawValue);
            } else if (field.type === "routeDetails") {
                initial[field.key] = Array.isArray(rawValue)
                    ? rawValue.map((item) => ({ ...item }))
                    : [];
            } else {
                initial[field.key] = rawValue ?? "";
            }
        });

        initial.tonaj_durumu = isTonajli(row);
        initial.aciklama = row?.aciklama || "";

        return initial;
    });

    if (!row) return null;

    function updateField(key, value) {
        setForm((prev) => ({ ...prev, [key]: value }));
    }

    function getExistingRouteKey(item, keys, fallbackKey) {
        return keys.find((key) => Object.prototype.hasOwnProperty.call(item || {}, key)) || fallbackKey;
    }

    function updateRouteItem(index, updater) {
        setForm((prev) => {
            const rota = Array.isArray(prev.rota_detaylari)
                ? prev.rota_detaylari.map((item) => ({ ...item }))
                : [];

            if (!rota[index]) return prev;

            rota[index] = updater(rota[index]);

            return {
                ...prev,
                rota_detaylari: rota,
            };
        });
    }

    function updateRouteText(index, keys, fallbackKey, value) {
        updateRouteItem(index, (item) => {
            const targetKey = getExistingRouteKey(item, keys, fallbackKey);
            return {
                ...item,
                [targetKey]: value,
            };
        });
    }

    function updateRouteDate(index, keys, fallbackKey, value) {
        updateRouteItem(index, (item) => {
            const targetKey = getExistingRouteKey(item, keys, fallbackKey);
            return {
                ...item,
                [targetKey]: fromDatetimeLocalValue(value),
            };
        });
    }

    function addRouteItem() {
        setForm((prev) => ({
            ...prev,
            rota_detaylari: [
                ...(Array.isArray(prev.rota_detaylari) ? prev.rota_detaylari : []),
                {
                    tip: "",
                    il: "",
                    giris: null,
                    cikis: null,
                },
            ],
        }));
    }

    function removeRouteItem(index) {
        setForm((prev) => ({
            ...prev,
            rota_detaylari: (Array.isArray(prev.rota_detaylari) ? prev.rota_detaylari : [])
                .filter((_, itemIndex) => itemIndex !== index),
        }));
    }

    function normalizeNumber(value) {
        if (value === "" || value === null || value === undefined) return null;
        const parsed = Number(String(value).replace(",", "."));
        return Number.isFinite(parsed) ? parsed : null;
    }

    function handleSubmit(e) {
        e.preventDefault();

        const payload = {};

        EDIT_FIELDS.forEach((field) => {
            const value = form[field.key];

            if (field.type === "number") {
                payload[field.key] = normalizeNumber(value);
            } else if (field.type === "datetime") {
                payload[field.key] = fromDatetimeLocalValue(value);
            } else if (field.type === "routeDetails") {
                payload[field.key] = Array.isArray(value) ? value : [];
            } else {
                payload[field.key] = String(value ?? "").trim();
            }
        });

        payload.tonaj_durumu = form.tonaj_durumu ? TONAJ_ACIKLAMA : "";
        payload.aciklama = String(form.aciklama ?? "").trim();

        onSave(payload);
    }
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="edit-modal edit-modal-wide" onClick={(e) => e.stopPropagation()}>
                <div className="edit-modal-header">
                    <div>
                        <span className="edit-modal-eyebrow">Sefer Düzenle</span>
                        <h3>{row.sefer_no || "Sefer"}</h3>
                    </div>

                    <button type="button" className="modal-close-btn" onClick={onClose} aria-label="Kapat">
                        <IconX />
                    </button>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="edit-form-sections">
                        {Object.entries(groupedFields).map(([groupName, fields]) => (
                            <section className="edit-section" key={groupName}>
                                <div className="edit-section-title">{groupName}</div>

                                <div className="edit-form-grid edit-form-grid-wide">
                                    {fields.map((field) => {
                                        if (field.type === "routeDetails") {
                                            const rota = Array.isArray(form[field.key])
                                                ? form[field.key]
                                                : [];

                                            return (
                                                <div className="edit-field edit-field-full" key={field.key}>
                                                    <div className="route-edit-header">
                                                        <div>
                                                            <span>{field.label}</span>
                                                            <small>{rota.length} durak</small>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className="route-add-btn"
                                                            onClick={addRouteItem}
                                                        >
                                                            + Durak Ekle
                                                        </button>
                                                    </div>

                                                    <div className="route-edit-table-wrap">
                                                        <table className="route-edit-table route-edit-table-inputs">
                                                            <thead>
                                                                <tr>
                                                                    <th>#</th>
                                                                    <th>Tür</th>
                                                                    <th>Lokasyon</th>
                                                                    <th>Giriş</th>
                                                                    <th>Çıkış</th>
                                                                    <th>Süre</th>
                                                                    <th>İşlem</th>
                                                                </tr>
                                                            </thead>

                                                            <tbody>
                                                                {!rota.length && (
                                                                    <tr>
                                                                        <td colSpan={7} className="route-edit-empty">
                                                                            Rota detayı bulunamadı. “Durak Ekle” ile yeni kayıt oluşturabilirsiniz.
                                                                        </td>
                                                                    </tr>
                                                                )}

                                                                {rota.map((item, index) => {
                                                                    const typeKey = getExistingRouteKey(item, ["tip", "type", "tur"], "tip");
                                                                    const locationKey = getExistingRouteKey(item, ["il", "sehir", "lokasyon", "adres"], "il");
                                                                    const inKey = getExistingRouteKey(
                                                                        item,
                                                                        ["giris", "varis", "gerceklesen_varis", "planlanan_varis"],
                                                                        "giris"
                                                                    );
                                                                    const outKey = getExistingRouteKey(
                                                                        item,
                                                                        ["cikis", "gerceklesen_cikis", "planlanan_cikis"],
                                                                        "cikis"
                                                                    );
                                                                    const inTime = item[inKey];
                                                                    const outTime = item[outKey];

                                                                    return (
                                                                        <tr key={`${field.key}-${index}`}>
                                                                            <td className="route-edit-index">{index + 1}</td>

                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    value={item[typeKey] ?? ""}
                                                                                    onChange={(e) =>
                                                                                        updateRouteText(
                                                                                            index,
                                                                                            ["tip", "type", "tur"],
                                                                                            "tip",
                                                                                            e.target.value
                                                                                        )
                                                                                    }
                                                                                    placeholder="Yükleme / Teslim"
                                                                                />
                                                                            </td>

                                                                            <td>
                                                                                <input
                                                                                    type="text"
                                                                                    value={item[locationKey] ?? ""}
                                                                                    onChange={(e) =>
                                                                                        updateRouteText(
                                                                                            index,
                                                                                            ["il", "sehir", "lokasyon", "adres"],
                                                                                            "il",
                                                                                            e.target.value
                                                                                        )
                                                                                    }
                                                                                    placeholder="İl veya lokasyon"
                                                                                />
                                                                            </td>

                                                                            <td>
                                                                                <input
                                                                                    type="datetime-local"
                                                                                    value={toDatetimeLocalValue(inTime)}
                                                                                    onChange={(e) =>
                                                                                        updateRouteDate(
                                                                                            index,
                                                                                            ["giris", "varis", "gerceklesen_varis", "planlanan_varis"],
                                                                                            "giris",
                                                                                            e.target.value
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </td>

                                                                            <td>
                                                                                <input
                                                                                    type="datetime-local"
                                                                                    value={toDatetimeLocalValue(outTime)}
                                                                                    onChange={(e) =>
                                                                                        updateRouteDate(
                                                                                            index,
                                                                                            ["cikis", "gerceklesen_cikis", "planlanan_cikis"],
                                                                                            "cikis",
                                                                                            e.target.value
                                                                                        )
                                                                                    }
                                                                                />
                                                                            </td>

                                                                            <td className="route-duration-cell">
                                                                                {diffText(inTime, outTime)}
                                                                            </td>

                                                                            <td className="route-action-cell">
                                                                                <button
                                                                                    type="button"
                                                                                    className="route-delete-btn"
                                                                                    onClick={() => removeRouteItem(index)}
                                                                                    aria-label={`${index + 1}. durağı sil`}
                                                                                    title="Durağı sil"
                                                                                >
                                                                                    Sil
                                                                                </button>
                                                                            </td>
                                                                        </tr>
                                                                    );
                                                                })}
                                                            </tbody>
                                                        </table>
                                                    </div>
                                                </div>
                                            );
                                        }
                                        return (
                                            <label className="edit-field" key={field.key}>
                                                <span>{field.label}</span>
                                                <input
                                                    type={field.type === "datetime" ? "datetime-local" : field.type}
                                                    step={field.type === "number" ? "0.01" : undefined}
                                                    value={form[field.key] ?? ""}
                                                    onChange={(e) => updateField(field.key, e.target.value)}
                                                />
                                            </label>
                                        );
                                    })}
                                </div>
                            </section>
                        ))}

                        <section className="edit-section">
                            <div className="edit-section-title">Durum / İkaz</div>

                            <label className="edit-field edit-toggle-field edit-field-full">
                                <span>Tonaj Durumu</span>

                                <button
                                    type="button"
                                    className={`toggle-switch ${form.tonaj_durumu ? "is-on" : ""}`}
                                    onClick={() => updateField("tonaj_durumu", !form.tonaj_durumu)}
                                >
                                    <i />
                                </button>

                                <span className="toggle-hint">
                                    {form.tonaj_durumu ? "Tonajlı" : "Tonajsız"}
                                </span>
                            </label>

                            <label className="edit-field edit-field-full">
                                <span>Açıklama / İkaz</span>
                                <textarea
                                    rows={4}
                                    value={form.aciklama}
                                    onChange={(e) => updateField("aciklama", e.target.value)}
                                    placeholder="İkaz veya not girin. Boş bırakılırsa ikaz kalkar."
                                />
                            </label>
                        </section>
                    </div>

                    <div className="edit-modal-footer">
                        <button type="button" className="btn-secondary" onClick={onClose} disabled={saving}>
                            Vazgeç
                        </button>

                        <button type="submit" className="btn-primary" disabled={saving}>
                            {saving ? "Kaydediliyor..." : "Değişiklikleri Kaydet"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

/* --------------------------------- Toast Alanı --------------------------------- */

function ToastStack({ toasts, onDismiss }) {
    if (!toasts.length) return null;

    return (
        <div className="toast-stack">
            {toasts.map((toast) => (
                <div className={`toast toast-${toast.type}`} key={toast.id}>
                    <span className="toast-icon">
                        {toast.type === "success" ? <IconCheckCircle /> : <IconAlertCircle />}
                    </span>
                    <span className="toast-message">{toast.message}</span>
                    <button type="button" className="toast-close" onClick={() => onDismiss(toast.id)} aria-label="Kapat">
                        <IconX />
                    </button>
                </div>
            ))}
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
            etaReferansGun = await findEtaReferenceDays({ origin: cikis, destination: varis });
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

function CompletedTrips() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showColumnLayout, setShowColumnLayout] = useState(false);
    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");
    const [onlyEtaMismatch, setOnlyEtaMismatch] = useState(false);
    const [expandedRows, setExpandedRows] = useState({});
    const [showFilters, setShowFilters] = useState(false);
    const [columnFilters, setColumnFilters] = useState({});
    const [globalSearch, setGlobalSearch] = useState("");
    const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
    const [selectedIds, setSelectedIds] = useState({});
    const [editingRow, setEditingRow] = useState(null);
    const [savingEdit, setSavingEdit] = useState(false);
    const [toasts, setToasts] = useState([]);
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

    /* ------------------------------- Toast yardımcıları ------------------------------- */

    const addToast = useCallback((message, type = "info") => {
        const id = `${Date.now()}-${Math.random()}`;
        setToasts((prev) => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 3600);
    }, []);

    const dismissToast = useCallback((id) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    /* --------------------------------- Veri yükleme --------------------------------- */

    const loadData = useCallback(
        async ({ silent = false } = {}) => {
            if (silent) setRefreshing(true);
            else setLoading(true);

            try {
                const data = await listCompletedTrips();

                const enriched = [];
                for (const row of data || []) {
                    enriched.push(await enrichEta(row));
                }

                setRows(enriched);
                if (silent) addToast("Liste güncellendi.", "success");
            } catch (err) {
                console.error("Tamamlanan seferler alınamadı:", err);
                addToast(`Veriler alınamadı: ${err.message || "Bilinmeyen hata"}`, "error");
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [addToast]
    );

    useEffect(() => {
        loadData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const toggleExpanded = useCallback((id) => {
        setExpandedRows((prev) => ({
            ...prev,
            [id]: !prev[id],
        }));
    }, []);

    const updateColumnFilter = useCallback((key, value) => {
        setColumnFilters((prev) => {
            const next = { ...prev };
            if (!value) {
                delete next[key];
            } else {
                next[key] = value;
            }
            return next;
        });
    }, []);

    const clearColumnFilters = useCallback(() => setColumnFilters({}), []);

    /* -------------------------------- Seçim yönetimi -------------------------------- */

    const toggleSelectRow = useCallback((key) => {
        setSelectedIds((prev) => {
            const next = { ...prev };
            if (next[key]) delete next[key];
            else next[key] = true;
            return next;
        });
    }, []);

    const clearSelection = useCallback(() => setSelectedIds({}), []);

    /* -------------------------------- Sıralama yönetimi -------------------------------- */

    const requestSort = useCallback((key) => {
        setSortConfig((prev) => {
            if (prev.key !== key) return { key, direction: "asc" };
            if (prev.direction === "asc") return { key, direction: "desc" };
            return { key: null, direction: null };
        });
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

    const avgDelayDays = useMemo(() => {
        const delayed = rows.filter((r) => r.eta_gecikme && r.eta_gecikme_suresi);
        if (!delayed.length) return 0;
        const total = delayed.reduce((sum, r) => sum + Number(r.eta_gecikme_suresi || 0), 0);
        return Number((total / delayed.length).toFixed(1));
    }, [rows]);

    // Araç statü sütunu için mevcut verideki benzersiz değerlerden dinamik seçenek listesi.
    const aracStatuOptions = useMemo(() => {
        return Array.from(new Set(rows.map((r) => r.arac_statu).filter(Boolean))).sort((a, b) =>
            a.localeCompare(b, "tr-TR")
        );
    }, [rows]);

    const activeColumnFilterEntries = useMemo(
        () => Object.entries(columnFilters).filter(([, value]) => value),
        [columnFilters]
    );

    const activeFilterCount = activeColumnFilterEntries.length + (globalSearch ? 1 : 0);

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

            if (!matchGlobalSearch(row, globalSearch)) return false;

            for (const [key, value] of activeColumnFilterEntries) {
                const col = DEFAULT_COLUMNS.find((c) => c.key === key);
                if (col && !matchColumnFilter(row, col, value)) return false;
            }

            return true;
        });
    }, [rows, startDate, endDate, onlyEtaMismatch, activeColumnFilterEntries, globalSearch]);

    const sortedRows = useMemo(() => {
        if (!sortConfig.key) return filteredRows;

        const col = DEFAULT_COLUMNS.find((c) => c.key === sortConfig.key);
        if (!col) return filteredRows;

        const copy = [...filteredRows];
        const dir = sortConfig.direction === "asc" ? 1 : -1;

        copy.sort((a, b) => {
            const va = getSortValue(a, col);
            const vb = getSortValue(b, col);
            if (va < vb) return -1 * dir;
            if (va > vb) return 1 * dir;
            return 0;
        });

        return copy;
    }, [filteredRows, sortConfig]);

    const selectedCount = useMemo(
        () => Object.values(selectedIds).filter(Boolean).length,
        [selectedIds]
    );

    const allVisibleSelected = useMemo(() => {
        if (!sortedRows.length) return false;
        return sortedRows.every((row) => selectedIds[getRowKey(row)]);
    }, [sortedRows, selectedIds]);

    const toggleSelectAllVisible = useCallback(() => {
        setSelectedIds((prev) => {
            if (allVisibleSelected) {
                const next = { ...prev };
                sortedRows.forEach((row) => delete next[getRowKey(row)]);
                return next;
            }

            const next = { ...prev };
            sortedRows.forEach((row) => {
                next[getRowKey(row)] = true;
            });
            return next;
        });
    }, [allVisibleSelected, sortedRows]);

    /* --------------------------------- Excel dışa aktarım --------------------------------- */

    function createExcelHeaderStyle(bg = "1E293B") {
        return {
            font: { bold: true, color: { rgb: "FFFFFF" }, sz: 11 },
            fill: { fgColor: { rgb: bg } },
            alignment: { horizontal: "center", vertical: "center", wrapText: true },
            border: {
                top: { style: "thin", color: { rgb: "CBD5E1" } },
                bottom: { style: "thin", color: { rgb: "CBD5E1" } },
                left: { style: "thin", color: { rgb: "CBD5E1" } },
                right: { style: "thin", color: { rgb: "CBD5E1" } },
            },
        };
    }

    function styleExcelWorksheet(XLSX, worksheet, headerRowIndex = 0) {
        if (!worksheet["!ref"]) return;

        const range = XLSX.utils.decode_range(worksheet["!ref"]);

        for (let C = range.s.c; C <= range.e.c; C++) {
            const cellAddress = XLSX.utils.encode_cell({ r: headerRowIndex, c: C });
            if (!worksheet[cellAddress]) continue;
            worksheet[cellAddress].s = createExcelHeaderStyle();
        }

        for (let R = headerRowIndex + 1; R <= range.e.r; R++) {
            for (let C = range.s.c; C <= range.e.c; C++) {
                const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
                if (!worksheet[cellAddress]) continue;

                worksheet[cellAddress].s = {
                    alignment: { vertical: "center", wrapText: true },
                    border: {
                        top: { style: "thin", color: { rgb: "E2E8F0" } },
                        bottom: { style: "thin", color: { rgb: "E2E8F0" } },
                        left: { style: "thin", color: { rgb: "E2E8F0" } },
                        right: { style: "thin", color: { rgb: "E2E8F0" } },
                    },
                };
            }
        }
    }

    function buildReportRow(row, forcedStatusLabel) {
        return {
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
            "ETA Durum": forcedStatusLabel || (row.eta_gecikme ? "Gecikti" : "Normal"),
            "Tonaj": isTonajli(row) ? "Tonajlı" : "",
            "İkaz": isIkazli(row) ? "İkazlı" : "",
            "Açıklama": row.aciklama || "",
        };
    }

    async function exportRowsToExcel(sourceRows, { title, filenamePrefix, sheetName, forcedStatusLabel, emptyMessage }) {
        if (!sourceRows.length) {
            addToast(emptyMessage || "Excel'e aktarılacak kayıt bulunamadı.", "error");
            return false;
        }

        const xlsxModule = await import("xlsx-js-style");
        const XLSX = xlsxModule.default || xlsxModule;
        const reportRows = sourceRows.map((row) => buildReportRow(row, forcedStatusLabel));
        const worksheet = XLSX.utils.json_to_sheet(reportRows, { origin: "A6" });
        const dateFilterLine =
            startDate || endDate
                ? `Tarih Filtresi: ${startDate || "Başlangıç yok"} - ${endDate || "Bitiş yok"}`
                : "Tarih Filtresi: Tüm tarih aralığı";

        XLSX.utils.sheet_add_aoa(
            worksheet,
            [
                [title],
                [`Rapor Tarihi: ${formatDate(new Date())}`],
                [`Toplam Kayıt: ${sourceRows.length}`],
                [dateFilterLine],
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
            { wch: 15 }, { wch: 15 }, { wch: 16 }, { wch: 14 }, { wch: 14 },
            { wch: 24 }, { wch: 30 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
            { wch: 26 }, { wch: 26 }, { wch: 18 }, { wch: 18 }, { wch: 18 },
            { wch: 18 }, { wch: 16 }, { wch: 14 }, { wch: 14 }, { wch: 42 },
        ];

        worksheet["!rows"] = [
            { hpt: 34 },
            { hpt: 23 },
            { hpt: 23 },
            { hpt: 23 },
            { hpt: 10 },
            { hpt: 32 },
        ];

        worksheet["!autofilter"] = {
            ref: `A6:T${reportRows.length + 6}`,
        };

        worksheet["A1"].s = {
            font: { bold: true, sz: 22, color: { rgb: "FFFFFF" } },
            fill: { fgColor: { rgb: "0F172A" } },
            alignment: { horizontal: "center", vertical: "center" },
        };

        styleExcelWorksheet(XLSX, worksheet, 5);

        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

        XLSX.writeFile(
            workbook,
            `${filenamePrefix}-${new Date().toISOString().slice(0, 10)}.xlsx`,
            { cellStyles: true }
        );

        addToast(`${sourceRows.length} kayıt Excel'e aktarıldı.`, "success");
        return true;
    }

    function exportAllToExcel() {
        exportRowsToExcel(sortedRows, {
            title: "TAMAMLANAN SEFERLER RAPORU",
            filenamePrefix: "tamamlanan-seferler",
            sheetName: "Tamamlanan Seferler",
        });
    }

    function exportEtaMismatchToExcel() {
        const etaRows = sortedRows.filter((row) => row.eta_gecikme);

        return exportRowsToExcel(etaRows, {
            title: "ETA UYUMSUZLUK RAPORU",
            filenamePrefix: "eta-uyumsuzluk-raporu",
            sheetName: "ETA Raporu",
            forcedStatusLabel: "Uyumsuz / Gecikti",
            emptyMessage: "Excel'e aktarılacak ETA uyumsuzluğu bulunamadı.",
        });
    }

    async function exportSelectedToExcel() {
        const selectedRows = sortedRows.filter((row) => selectedIds[getRowKey(row)]);

        const success = await exportRowsToExcel(selectedRows, {
            title: "SEÇİLİ SEFERLER RAPORU",
            filenamePrefix: "secili-seferler",
            sheetName: "Seçili Seferler",
            emptyMessage: "Aktarılacak seçili sefer bulunamadı.",
        });

        if (success) clearSelection();
    }

    /* ---------------------------------- Düzenleme ---------------------------------- */

    const handleSaveEdit = useCallback(
        async (formValues) => {
            if (!editingRow) return;

            setSavingEdit(true);
            try {
                const data = await updateCompletedTrip(editingRow, formValues);

                const targetKey = getRowKey(editingRow);
                setRows((prev) =>
                    prev.map((r) =>
                        getRowKey(r) === targetKey ? { ...r, ...formValues, ...(data || {}) } : r
                    )
                );

                addToast("Sefer bilgileri güncellendi.", "success");
                setEditingRow(null);
            } catch (err) {
                console.error("Sefer güncellenemedi:", err);
                addToast(`Güncelleme başarısız: ${err.message || "Bilinmeyen hata"}`, "error");
            } finally {
                setSavingEdit(false);
            }
        },
        [editingRow, addToast]
    );

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
        let stickyLeft = SELECT_COL_WIDTH;

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

    const totalColumnCount = columnsWithLayout.length + 2; // seçim + işlemler

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

    function renderSelectFilter(colKey, value, onChange, options, placeholder = "Tümü") {
        const isActive = Boolean(value);

        return (
            <div className={`column-filter-control select-control ${isActive ? "is-active" : ""}`}>
                <select
                    className="filter-select"
                    value={value || ""}
                    onChange={(e) => onChange(e.target.value)}
                    aria-label="Sütun filtresi"
                >
                    <option value="">{placeholder}</option>
                    {options.map((option) => (
                        <option key={option.value} value={option.value}>
                            {option.label}
                        </option>
                    ))}
                </select>
                <span className="filter-select-arrow">
                    <IconChevronDown />
                </span>
                {isActive && (
                    <button
                        type="button"
                        className="filter-clear-btn select-clear"
                        onClick={() => onChange("")}
                        aria-label="Filtreyi temizle"
                    >
                        <IconX />
                    </button>
                )}
            </div>
        );
    }

    function renderFilterCell(col) {
        const currentValue = columnFilters[col.key] || "";

        if (col.key === "sefer_tarihi") {
            return (
                <span className="filter-cell-hint">
                    Tarih aralığı üst panelden seçilir
                </span>
            );
        }

        if (col.key === "eta_durum") {
            return renderSelectFilter(
                "eta_durum",
                columnFilters.eta_durum,
                (value) => updateColumnFilter("eta_durum", value),
                [
                    { value: "gecikti", label: "Gecikti" },
                    { value: "normal", label: "Normal" },
                ]
            );
        }

        if (col.type === "tonaj") {
            return renderSelectFilter(
                "tonaj_durumu",
                columnFilters.tonaj_durumu,
                (value) => updateColumnFilter("tonaj_durumu", value),
                [
                    { value: "var", label: "Tonajlı" },
                    { value: "yok", label: "Tonajsız" },
                ]
            );
        }

        if (col.type === "ikaz") {
            return renderSelectFilter(
                "ikaz_durumu",
                columnFilters.ikaz_durumu,
                (value) => updateColumnFilter("ikaz_durumu", value),
                [
                    { value: "var", label: "İkazlı" },
                    { value: "yok", label: "İkazsız" },
                ]
            );
        }

        if (col.key === "arac_statu") {
            return renderSelectFilter(
                "arac_statu",
                columnFilters.arac_statu,
                (value) => updateColumnFilter("arac_statu", value),
                aracStatuOptions.map((opt) => ({ value: opt, label: opt }))
            );
        }

        if (col.filter === "text") {
            const isActive = Boolean(currentValue);

            return (
                <div className={`column-filter-control filter-text-wrap ${isActive ? "is-active" : ""}`}>
                    <span className="filter-search-icon">
                        <IconSearch />
                    </span>
                    <input
                        type="text"
                        className="filter-input"
                        placeholder="Sütunda ara"
                        value={currentValue}
                        onChange={(e) => updateColumnFilter(col.key, e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                    />
                    {isActive && (
                        <button
                            type="button"
                            className="filter-clear-btn"
                            onClick={() => updateColumnFilter(col.key, "")}
                            aria-label="Filtreyi temizle"
                        >
                            <IconX />
                        </button>
                    )}
                </div>
            );
        }

        return <span className="filter-cell-hint muted-hint">Filtre yok</span>;
    }

    return (
        <div className="tamamlanan-page">
            <ToastStack toasts={toasts} onDismiss={dismissToast} />

            <div className="tamamlanan-header">
                <div className="tamamlanan-title-area">
                    <span className="tamamlanan-eyebrow">Operasyon Yönetimi</span>
                    <h1>Tamamlanan Seferler</h1>
                </div>

                <div className="tamamlanan-stats">
                    <div className="stat-card">
                        <span className="stat-icon-wrap"><IconTruck /></span>
                        <strong>{filteredRows.length}</strong>
                        <span>Toplam Sefer</span>
                    </div>

                    <div className="stat-card danger">
                        <span className="stat-icon-wrap"><IconClock /></span>
                        <strong>{delayedCount}</strong>
                        <span>ETA Gecikmiş</span>
                    </div>

                    <div className="stat-card warning">
                        <span className="stat-icon-wrap"><IconWeight /></span>
                        <strong>{tonajCount}</strong>
                        <span>Tonajlı</span>
                    </div>

                    <div className="stat-card danger">
                        <span className="stat-icon-wrap"><IconAlertTriangle /></span>
                        <strong>{ikazCount}</strong>
                        <span>İkazlı</span>
                    </div>

                    <div className="stat-card info">
                        <span className="stat-icon-wrap"><IconTrendUp /></span>
                        <strong>{avgDelayDays}</strong>
                        <span>Ort. Gecikme (Gün)</span>
                    </div>
                </div>
            </div>

            <div className="tamamlanan-toolbar">
                <div className="date-filter">
                    <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                    <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
                </div>

                <div className={`global-search-wrap ${globalSearch ? "is-active" : ""}`}>
                    <span className="filter-search-icon">
                        <IconSearch />
                    </span>
                    <input
                        type="text"
                        placeholder="Tüm sütunlarda ara..."
                        value={globalSearch}
                        onChange={(e) => setGlobalSearch(e.target.value)}
                    />
                    {globalSearch && (
                        <button
                            type="button"
                            className="filter-clear-btn"
                            onClick={() => setGlobalSearch("")}
                            aria-label="Aramayı temizle"
                        >
                            <IconX />
                        </button>
                    )}
                </div>

                <button
                    className="listele-btn refresh-btn"
                    type="button"
                    onClick={() => loadData({ silent: true })}
                    disabled={refreshing || loading}
                >
                    <IconRefresh spinning={refreshing} />
                    Yenile
                </button>

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
                    className="listele-btn success-btn"
                    type="button"
                    onClick={exportAllToExcel}
                >
                    Excel'e Aktar
                </button>

                <button
                    className={`listele-btn filter-toggle-btn ${showFilters ? "is-active" : ""}`}
                    type="button"
                    onClick={() => setShowFilters((v) => !v)}
                >
                    <IconFilter />
                    Filtrele
                    {activeFilterCount > 0 && <span className="filter-count-badge">{activeFilterCount}</span>}
                </button>

                <button
                    className="listele-btn secondary"
                    type="button"
                    onClick={() => setShowColumnLayout(true)}
                >
                    <IconColumns />
                    Sütun Düzeni
                </button>
            </div>

            {selectedCount > 0 && (
                <div className="bulk-actions-bar">
                    <span className="bulk-actions-label">
                        <b>{selectedCount}</b> sefer seçildi
                    </span>
                    <button type="button" className="bulk-action-btn" onClick={exportSelectedToExcel}>
                        Seçilenleri Excel'e Aktar
                    </button>
                    <button type="button" className="bulk-clear-btn" onClick={clearSelection}>
                        Seçimi Temizle
                    </button>
                </div>
            )}

            {showFilters && activeFilterCount > 0 && (
                <div className="active-filters-bar">
                    <span className="active-filters-label">Aktif filtreler:</span>
                    {globalSearch && (
                        <span className="filter-chip">
                            Genel Arama: <b>{globalSearch}</b>
                            <button type="button" onClick={() => setGlobalSearch("")} aria-label="Aramayı kaldır">
                                <IconX />
                            </button>
                        </span>
                    )}
                    {activeColumnFilterEntries.map(([key, value]) => {
                        const col = DEFAULT_COLUMNS.find((c) => c.key === key);
                        return (
                            <span className="filter-chip" key={key}>
                                {col?.label || key}: <b>{value}</b>
                                <button type="button" onClick={() => updateColumnFilter(key, "")} aria-label="Filtreyi kaldır">
                                    <IconX />
                                </button>
                            </span>
                        );
                    })}
                    <button
                        type="button"
                        className="clear-all-filters-btn"
                        onClick={() => {
                            clearColumnFilters();
                            setGlobalSearch("");
                        }}
                    >
                        Tümünü Temizle
                    </button>
                </div>
            )}

            <div className="tamamlanan-card">
                <div className="table-wrapper">
                    <table className="tamamlanan-table">
                        <colgroup>
                            <col style={{ width: SELECT_COL_WIDTH, minWidth: SELECT_COL_WIDTH }} />
                            {columnsWithLayout.map((col) => (
                                <col key={col.key} style={{ width: col.width, minWidth: col.width }} />
                            ))}
                            <col style={{ width: ACTIONS_COL_WIDTH, minWidth: ACTIONS_COL_WIDTH }} />
                        </colgroup>

                        <thead>
                            <tr>
                                <th className="sticky-col th-sticky select-col-th" style={{ left: 0 }}>
                                    <input
                                        type="checkbox"
                                        className="row-checkbox"
                                        checked={allVisibleSelected}
                                        onChange={toggleSelectAllVisible}
                                        aria-label="Tümünü seç"
                                    />
                                </th>

                                {columnsWithLayout.map((col) => {
                                    const isSorted = sortConfig.key === col.key;
                                    return (
                                        <th
                                            key={col.key}
                                            className={[
                                                col.sticky ? "sticky-col th-sticky" : "",
                                                "resizable-th",
                                                "sortable-th",
                                                columnFilters[col.key] ? "has-column-filter" : "",
                                                isSorted ? "is-sorted" : "",
                                            ].filter(Boolean).join(" ")}
                                            style={col.sticky ? { left: col.left } : undefined}
                                        >
                                            <span className="th-label-btn" onClick={() => requestSort(col.key)}>
                                                <span>{col.label}</span>
                                                <span className="sort-icon">
                                                    <IconSort direction={isSorted ? sortConfig.direction : null} />
                                                </span>
                                            </span>
                                            <span className="column-resizer" onMouseDown={(e) => startResize(e, col)} />
                                        </th>
                                    );
                                })}

                                <th className="actions-col-th sticky-right" style={{ right: 0 }}>
                                    İşlemler
                                </th>
                            </tr>

                            {showFilters && (
                                <tr className="filter-row">
                                    <th className="sticky-col select-col-th" style={{ left: 0, top: 40 }} />

                                    {columnsWithLayout.map((col) => (
                                        <th
                                            key={`filter-${col.key}`}
                                            className={[
                                                col.sticky ? "sticky-col" : "",
                                                "filter-th",
                                                columnFilters[col.key] ? "is-filtered" : "",
                                            ].filter(Boolean).join(" ")}
                                            style={col.sticky ? { left: col.left, top: 40 } : { top: 40 }}
                                        >
                                            {renderFilterCell(col)}
                                        </th>
                                    ))}

                                    <th className="actions-col-th sticky-right filter-th" style={{ right: 0, top: 40 }}>
                                        <span className="filter-cell-hint muted-hint">Filtre yok</span>
                                    </th>
                                </tr>
                            )}
                        </thead>

                        <tbody>
                            {loading &&
                                Array.from({ length: 8 }).map((_, i) => (
                                    <tr className="skeleton-row" key={`skeleton-${i}`}>
                                        <td className="sticky-col" style={{ left: 0 }}>
                                            <div className="skeleton-bar" style={{ width: 16 }} />
                                        </td>
                                        {columnsWithLayout.map((col) => (
                                            <td key={col.key} className={col.sticky ? "sticky-col" : ""} style={col.sticky ? { left: col.left } : undefined}>
                                                <div
                                                    className="skeleton-bar"
                                                    style={{ width: `${45 + ((i * 13 + col.width) % 40)}%` }}
                                                />
                                            </td>
                                        ))}
                                        <td className="sticky-right" style={{ right: 0 }}>
                                            <div className="skeleton-bar" style={{ width: 28 }} />
                                        </td>
                                    </tr>
                                ))}

                            {!loading && sortedRows.length === 0 && (
                                <tr>
                                    <td colSpan={totalColumnCount} className="empty-cell">
                                        {activeFilterCount > 0 || onlyEtaMismatch || startDate || endDate
                                            ? "Filtrelere uyan sefer bulunamadı."
                                            : "Tamamlanan sefer bulunamadı."}
                                    </td>
                                </tr>
                            )}

                            {!loading && sortedRows.map((row) => {
                                const rowId = getRowKey(row);
                                const isSelected = Boolean(selectedIds[rowId]);

                                return (
                                    <Fragment key={rowId}>
                                        <tr
                                            className={`${row.eta_gecikme ? "is-delayed" : ""} clickable-row ${expandedRows[rowId] ? "is-expanded" : ""} ${isSelected ? "is-selected" : ""}`}
                                            onClick={() => toggleExpanded(rowId)}
                                        >
                                            <td className="sticky-col select-col-td" style={{ left: 0 }} onClick={(e) => e.stopPropagation()}>
                                                <input
                                                    type="checkbox"
                                                    className="row-checkbox"
                                                    checked={isSelected}
                                                    onChange={() => toggleSelectRow(rowId)}
                                                    aria-label="Satırı seç"
                                                />
                                            </td>

                                            {columnsWithLayout.map((col) => (
                                                <td
                                                    key={col.key}
                                                    className={col.sticky ? "sticky-col" : ""}
                                                    style={col.sticky ? { left: col.left } : undefined}
                                                >
                                                    <CellValue col={col} row={row} />
                                                </td>
                                            ))}

                                            <td className="actions-col-td sticky-right" style={{ right: 0 }} onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    type="button"
                                                    className="edit-icon-btn"
                                                    onClick={() => setEditingRow(row)}
                                                    title="Seferi düzenle"
                                                >
                                                    <IconEdit />
                                                    Düzenle
                                                </button>
                                            </td>
                                        </tr>

                                        {expandedRows[rowId] && (
                                            <tr className="detail-row">
                                                <td colSpan={totalColumnCount}>
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

            {showColumnLayout && (
                <ColumnLayout
                    columns={orderedColumns}
                    visibleColumnKeys={visibleColumnKeys}
                    onToggleColumn={toggleColumn}
                    onReorderColumns={reorderColumns}
                    onReset={resetColumnLayout}
                    onClose={() => setShowColumnLayout(false)}
                />
            )}

            {editingRow && (
                <EditSeferModal
                    row={editingRow}
                    saving={savingEdit}
                    onClose={() => setEditingRow(null)}
                    onSave={handleSaveEdit}
                />
            )}
        </div>
    );
}

export default CompletedTrips;
