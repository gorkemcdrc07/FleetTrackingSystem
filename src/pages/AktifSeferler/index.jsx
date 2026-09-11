import { hasWarning, toggleWarningText } from "../../domain/tripWarning";
﻿import { createPortal } from "react-dom";
import { Search, RefreshCw, CalendarDays, SlidersHorizontal, Download, ArrowRight, ChevronLeft, ChevronRight, MoreHorizontal, X, Truck, Route, Clock3, Weight, TriangleAlert, Trash2, Columns3, FileText, MapPin, ListFilter, CheckCircle2, Copy, CheckSquare2, Square, Sparkles, Layers3, Keyboard, RotateCcw, ClipboardList, CalendarRange } from "lucide-react";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "../../supabaseClient";
import { moveTripToCompleted } from "../../services/tripRepository";
import { createRouteDetails as createRotaDetaylari } from "../../domain/activeTrips";
import { useActiveTrips } from "./useActiveTrips";
import "./AktifSeferler.css";
import Detaylar from "./detaylar";
import SutunDuzeni from "./Gorunum/SutunDuzeni";
import ETA from "./ETA/ETA";
import * as XLSX from "xlsx";
import { islemLogla } from "../../utils/islemLogla";
import "./AktifSeferlerModern.css";
import "./DetailsModern.css";

function IconChevron({open}) { return <ChevronRight size={15} style={{transform:open?"rotate(90deg)":"none"}}/>; }
const IconPin = () => <MapPin size={14}/>;
const IconDetail = () => <FileText size={15}/>;
const IconETA = () => <Clock3 size={15}/>;
const IconIkaz = () => <TriangleAlert size={15}/>;
const IconTonaj = () => <Weight size={15}/>;
const IconTrash = () => <Trash2 size={15}/>;
const IconColumns = () => <Columns3 size={17}/>;

function MoreActions({children, plate}) {
    const [position,setPosition]=useState(null);
    const trigger=useRef(null);
    const panel=useRef(null);
    useEffect(()=>{
        if(!position) return;
        const dismiss=e=>{ if(!panel.current?.contains(e.target) && !trigger.current?.contains(e.target)) setPosition(null); };
        const close=e=>{if(e.key==="Escape"){setPosition(null);trigger.current?.focus();}};
        const move=()=>setPosition(null);
        document.addEventListener("pointerdown",dismiss);
        document.addEventListener("keydown",close);
        window.addEventListener("resize",move);
        panel.current?.querySelector("button")?.focus();
        return ()=>{document.removeEventListener("pointerdown",dismiss);document.removeEventListener("keydown",close);window.removeEventListener("resize",move);};
    },[position]);
    return <><button ref={trigger} className="op-btn trip-more" aria-label={`${plate || "Sefer"} diğer işlemler`} aria-expanded={!!position} title="Diğer işlemler" onClick={e=>{e.stopPropagation();const r=trigger.current.getBoundingClientRect();setPosition(position?null:{left:Math.min(r.left,window.innerWidth-200),top:Math.min(r.bottom+8,window.innerHeight-180)});}}><MoreHorizontal size={17}/></button>{position && createPortal(<div ref={panel} className="trip-actions-popover" role="group" aria-label="Diğer sefer işlemleri" style={position}>{React.Children.map(children,child=>React.isValidElement(child)?React.cloneElement(child,{onClick:async e=>{try{await child.props.onClick?.(e);}finally{setPosition(null);trigger.current?.focus();}}}):child)}</div>,document.body)}</>;
}

function RouteStep({ index, total, step }) {
    const isLoad = step.type === "yukle" || step.tip === "yukleme";

    return (
        <div className="route-step">
            <div className="route-track">
                <div className={`route-dot ${isLoad ? "yukle" : "teslim"}`}>{index + 1}</div>
                {index < total - 1 && <div className="route-line" />}
            </div>

            <div className={`route-card ${isLoad ? "route-card-yukle" : "route-card-teslim"}`}>
                <div className="route-card-top">
                    <span className={`route-type ${isLoad ? "yukle" : "teslim"}`}>{isLoad ? "Yükleme" : "Teslim"}</span>
                    <span className="route-order">{index + 1}. Durak</span>
                </div>

                {step.firma && <div className="route-firma">{step.firma}</div>}
                {step.nokta && <div className="route-nokta">{step.nokta}</div>}

                {(step.il || step.ilce) && (
                    <div className="route-location">
                        <IconPin />
                        {[step.il, step.ilce].filter(Boolean).join(" / ")}
                    </div>
                )}
            </div>
        </div>
    );
}

function DetailPanel({ row }) {
    const routeSteps =
        Array.isArray(row.rota_detaylari) && row.rota_detaylari.length
            ? row.rota_detaylari
            : createRotaDetaylari(row);

    const yuklemeCount = routeSteps.filter((x) => x.tip === "yukleme" || x.type === "yukle").length;
    const teslimCount = routeSteps.filter((x) => x.tip === "teslim" || x.type === "teslim").length;

    return (
        <div className="detail-panel route-panel">
            <div className="route-header">
                <div>
                    <div className="route-title">Sefer Rotası</div>
                    <div className="route-subtitle">
                        Aynı yükleme noktası tek durak gösterilir. Araç yüklemelerden sonra teslimlere sıralı ilerler.
                    </div>
                </div>

                <div className="route-summary">
                    <span>{yuklemeCount} yükleme</span>
                    <span>{teslimCount} teslim</span>
                </div>
            </div>

            <div className="route-list">
                {routeSteps.map((step, i) => (
                    <RouteStep key={`${step.tip || step.type}-${i}-${step.nokta || step.firma || ""}`} index={i} total={routeSteps.length} step={step} />
                ))}
            </div>
        </div>
    );
}

const TONAJ_ACIKLAMA = "Tonajlı";

const DEFAULT_COLUMNS = [
    { key: "_ops", label: "İşlemler", width: 205, sticky: true, locked: true },
    { key: "_expand", label: "", width: 40, sticky: true, locked: true },
    { key: "sefer_no", label: "Sefer No", width: 120, sticky: true, type: "sefer", locked: true },
    { key: "sefer_tarihi", label: "Sefer Tarihi", width: 108, type: "date" },
    { key: "arac_statu", label: "Araç Statü", width: 115, type: "statu" },
    { key: "plaka", label: "Plaka", width: 95, type: "plaka" },
    { key: "treyler", label: "Treyler", width: 95, type: "plaka" },
    { key: "surucu_ad_soyad", label: "Sürücü", width: 155 },
    { key: "surucu_tckn", label: "TC Kimlik", width: 120 },
    { key: "surucu_telefon", label: "Telefon", width: 120 },
    { key: "musteri_adi", label: "Müşteri", width: 175 },
    { key: "musteri_siparis_no", label: "Sipariş No", width: 125 },
    { key: "hizmet_adi", label: "Hizmet", width: 135 },
    { key: "proje_adi", label: "Proje", width: 135 },
    { key: "yukleme_noktasi", label: "Yükleme Noktası", width: 155, type: "multi" },
    { key: "yukleme_ili", label: "Yükleme İl", width: 110, type: "multi" },
    { key: "yukleme_ilcesi", label: "Yükleme İlçe", width: 110, type: "multi" },
    { key: "teslim_alan_firma", label: "Teslim Firması", width: 165, type: "multi" },
    { key: "teslim_noktasi", label: "Teslim Noktası", width: 155, type: "multi" },
    { key: "teslim_ili", label: "Teslim İl", width: 110, type: "multi" },
    { key: "teslim_ilcesi", label: "Teslim İlçe", width: 110, type: "multi" },
    { key: "irsaliye_no", label: "İrsaliye No", width: 135 },
    { key: "aciklama", label: "Açıklama", width: 220, type: "textLong" },
    { key: "atama_yapan_kullanici", label: "Atayan Kullanıcı", width: 148 },
    { key: "atama_tarihi", label: "Atama Tarihi", width: 115, type: "date" },
];




const ACTIVE_TRIPS_PREFS_KEY = "fts_active_trips_preferences_v1";

function loadActiveTripsPreferences() {
    try {
        const parsed = JSON.parse(localStorage.getItem(ACTIVE_TRIPS_PREFS_KEY) || "null");
        return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
        return {};
    }
}

function saveActiveTripsPreferences(next) {
    try {
        localStorage.setItem(ACTIVE_TRIPS_PREFS_KEY, JSON.stringify(next));
    } catch {
        // Tarayıcı depolaması kapalıysa ekran çalışmaya devam etsin.
    }
}

const TABLE_LAYOUT_KEY = "aktif_seferler";
const USER_LAYOUT_COLUMN = "sutun_gorunumu";

function getDefaultTableLayout() {
    return {
        columnFilters: {},
        columnWidths: {},
        columnOrder: DEFAULT_COLUMNS.map((col) => col.key),
        visibleColumnKeys: DEFAULT_COLUMNS.map((col) => col.key),
    };
}

function sanitizeTableLayout(layout) {
    const defaults = getDefaultTableLayout();
    const defaultKeys = defaults.visibleColumnKeys;
    const lockedKeys = DEFAULT_COLUMNS.filter((col) => col.locked).map((col) => col.key);

    const savedOrder = Array.isArray(layout?.columnOrder) ? layout.columnOrder : [];
    const columnOrder = [
        ...savedOrder.filter((key) => defaultKeys.includes(key)),
        ...defaultKeys.filter((key) => !savedOrder.includes(key)),
    ];

    const savedVisible = Array.isArray(layout?.visibleColumnKeys) ? layout.visibleColumnKeys : defaultKeys;
    const visibleColumnKeys = Array.from(
        new Set([
            ...savedVisible.filter((key) => defaultKeys.includes(key)),
            ...lockedKeys,
        ])
    );

    return {
        columnFilters: layout?.columnFilters && typeof layout.columnFilters === "object" ? layout.columnFilters : {},
        columnWidths: layout?.columnWidths && typeof layout.columnWidths === "object" ? layout.columnWidths : {},
        columnOrder,
        visibleColumnKeys,
    };
}

function getAktifKullanici() {
    try {
        return (
            JSON.parse(localStorage.getItem("fts_user") || "null") ||
            JSON.parse(localStorage.getItem("kullanici") || "null") ||
            JSON.parse(localStorage.getItem("aktifKullanici") || "null") ||
            JSON.parse(localStorage.getItem("user") || "null") ||
            null
        );
    } catch {
        return null;
    }
}
async function findKullaniciRow() {
    const aktifKullanici = getAktifKullanici();

    if (!aktifKullanici) return null;

    const kullaniciMail =
        aktifKullanici.email ||
        aktifKullanici.mail ||
        aktifKullanici.eposta;

    const kullaniciAdi =
        aktifKullanici.kullanici_adi ||
        aktifKullanici.kullaniciAdi ||
        aktifKullanici.username ||
        aktifKullanici.ad;

    const attempts = [
        kullaniciMail ? { field: "email", value: kullaniciMail } : null,
        kullaniciMail ? { field: "mail", value: kullaniciMail } : null,
        kullaniciAdi ? { field: "kullanici", value: kullaniciAdi } : null,
    ].filter(Boolean);

    for (const attempt of attempts) {
        const { data, error } = await supabase
            .from("kullanicilar")
            .select(`id, ${USER_LAYOUT_COLUMN}`)
            .eq(attempt.field, attempt.value)
            .maybeSingle();

        if (!error && data) {
            return {
                row: data,
                matchField: attempt.field,
                matchValue: attempt.value,
            };
        }
    }

    return null;
} async function loadUserTableLayout() {
    const found = await findKullaniciRow();
    if (!found?.row) return getDefaultTableLayout();

    const allLayouts = found.row?.[USER_LAYOUT_COLUMN] || {};
    return sanitizeTableLayout(allLayouts?.[TABLE_LAYOUT_KEY]);
}

async function saveUserTableLayout(layout) {
    const found = await findKullaniciRow();
    if (!found?.row) {
        console.warn("Kullanıcı bulunamadı, sütun görünümü kaydedilmedi.");
        return;
    }
    const currentLayouts = found.row?.[USER_LAYOUT_COLUMN] || {};
    const nextLayouts = {
        ...currentLayouts,
        [TABLE_LAYOUT_KEY]: sanitizeTableLayout(layout),
    };

    const { error } = await supabase
        .from("kullanicilar")
        .update({ [USER_LAYOUT_COLUMN]: nextLayouts })
        .eq(found.matchField, found.matchValue);

    if (error) throw error;
}

function formatDate(val) {
    if (!val) return null;
    const d = new Date(val);
    if (isNaN(d)) return val;

    return d.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function parseDate(value) {
    if (!value) return null;
    const date = new Date(value);
    return isNaN(date) ? null : date;
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

    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

function getActualEtaHours(row) {
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

    return diffMs / (1000 * 60 * 60);
}

function parseGunValue(value) {
    if (!value) return null;

    const text = String(value)
        .replace(",", ".")
        .replace(/[^\d.]/g, "");

    const num = Number(text);
    return Number.isFinite(num) ? num : null;
}

function split(val) {
    return String(val || "")
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean);
}

function getLastValue(value) {
    return String(value || "")
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean)
        .at(-1) || "";
}

function normalizeTR(value) {
    return String(value || "")
        .toLocaleUpperCase("tr-TR")
        .replace(/\s+/g, " ")
        .trim();
}

const ISTANBUL_ANADOLU_ILCELERI = [
    "ADALAR",
    "ATAŞEHİR",
    "BEYKOZ",
    "ÇEKMEKÖY",
    "KADIKÖY",
    "KARTAL",
    "MALTEPE",
    "PENDİK",
    "SANCAKTEPE",
    "SULTANBEYLİ",
    "ŞİLE",
    "TUZLA",
    "ÜMRANİYE",
    "ÜSKÜDAR",
];

function normalizeCompare(value) {
    return normalizeTR(value)
        .replaceAll("İ", "I")
        .replaceAll("İ", "I")
        .replaceAll("Ğ", "G")
        .replaceAll("Ü", "U")
        .replaceAll("Ş", "S")
        .replaceAll("Ö", "O")
        .replaceAll("Ç", "C");
}

function isIstanbul(value) {
    return normalizeCompare(value) === "ISTANBUL";
}

function getEtaCikisValue(yuklemeIl, yuklemeIlce) {
    const il = normalizeTR(yuklemeIl);
    const ilce = normalizeTR(yuklemeIlce);
    const ilceCompare = normalizeCompare(yuklemeIlce);

    if (!isIstanbul(yuklemeIl)) return il;
    if (!ilce) return "";

    const anadoluCompareList = ISTANBUL_ANADOLU_ILCELERI.map(normalizeCompare);

    return anadoluCompareList.includes(ilceCompare)
        ? "İSTANBUL ANADOLU"
        : "İSTANBUL AVRUPA";
}

function getFilterText(row, col) {
    if (!col || col.key?.startsWith("_")) return "";

    const raw = row?.[col.key];

    if (col.type === "date") {
        return formatDate(raw) || String(raw || "");
    }

    if (col.type === "multi") {
        const parts = split(raw);
        return parts.length ? parts.join(" ") : String(raw || "");
    }

    return String(raw || "");
}
function getColumnFilterOptions(rows, col) {
    if (!col || col.key?.startsWith("_")) return [];

    const values = new Map();

    rows.forEach((row) => {
        const raw = row?.[col.key];
        const parts = col.type === "multi"
            ? split(raw)
            : [getFilterText(row, col)].filter(Boolean);
        parts.forEach((part) => {
            const label = String(part || "").trim();
            if (!label) return;

            const key = normalizeTR(label);
            if (!values.has(key)) values.set(key, label);
        });
    });

    return Array.from(values.values()).sort((a, b) =>
        String(a).localeCompare(String(b), "tr", { sensitivity: "base" })
    );
}

function isColumnFilterEmpty(filter) {
    return !filter || (!String(filter.search || "").trim() && (!Array.isArray(filter.values) || filter.values.length === 0));
}

function rowMatchesColumnFilter(row, col, filter) {
    if (isColumnFilterEmpty(filter)) return true;

    const text = normalizeTR(getFilterText(row, col));
    const search = normalizeTR(filter.search);

    if (search && !text.includes(search)) return false;

    if (Array.isArray(filter.values) && filter.values.length) {
        const selected = filter.values
            .map(normalizeTR)
            .filter(Boolean);

        const rowValues = col.type === "multi"
            ? split(row?.[col.key]).map(normalizeTR).filter(Boolean)
            : [normalizeTR(getFilterText(row, col))].filter(Boolean);

        if (!rowValues.length) return false;

        if (col.key === "arac_statu") {
            return selected.some((value) =>
                rowValues.some((rowValue) => rowValue === value)
            );
        }

        return selected.some((value) =>
            rowValues.some((rowValue) =>
                rowValue === value ||
                rowValue.includes(value) ||
                value.includes(rowValue)
            )
        );
    }

    return true;
}


function OpsBtns({
    row,
    onDetail,
    onIkaz,
    onETA,
    onTonaj,
    onSeferSil,
    etaDelayed
}) {
    const ikazli = hasWarning(row);
    const tonajli = row.tonaj_durumu === TONAJ_ACIKLAMA;

    return (
        <div className="ops-cell">
            <button
                className="op-btn op-btn-detail"
                title="Sefer Detayı"
                onClick={async (e) => {
                    e.stopPropagation();

                    await islemLogla({
                        islem_tipi: "SEFER_DETAY_ACMA",
                        islem_aciklama: "Detay ekranı açıldı",
                        tablo_adi: "aktif_seferler",
                        kayit_id: row.id || null,
                        sefer_no: row.sefer_no || null,
                        plaka: row.plaka || null,
                        detay: {
                            buton: "Detay",
                            ekran: "Aktif Seferler",
                        },
                    });

                    onDetail(row);
                }}
            >
                <IconDetail /> Detay
            </button>

            <button
                className={`op-btn op-btn-eta ${etaDelayed ? "is-delayed" : ""}`}
                title={etaDelayed ? "ETA Gecikti" : "ETA"}
                onClick={async (e) => {
                    e.stopPropagation();

                    await islemLogla({
                        islem_tipi: "ETA_ACMA",
                        islem_aciklama: "ETA ekranı açıldı",
                        tablo_adi: "aktif_seferler",
                        kayit_id: row.id || null,
                        sefer_no: row.sefer_no || null,
                        plaka: row.plaka || null,
                        detay: {
                            buton: "ETA",
                            ekran: "Aktif Seferler",
                        },
                    });

                    onETA(row);
                }}
            >
                <IconETA /> ETA
            </button>

            <MoreActions plate={row.plaka}>
            <button
                className={`op-btn op-btn-tonaj ${tonajli ? "is-active" : ""}`}
                title="Tonaj"
                onClick={async (e) => {
                    e.stopPropagation();

                    await islemLogla({
                        islem_tipi: "TONAJ_BUTON",
                        islem_aciklama: "Tonaj işlemi tetiklendi",
                        tablo_adi: "aktif_seferler",
                        kayit_id: row.id || null,
                        sefer_no: row.sefer_no || null,
                        plaka: row.plaka || null,
                        detay: {
                            buton: "Tonaj",
                            ekran: "Aktif Seferler",
                            onceki_durum: row.tonaj_durumu || null,
                        },
                    });

                    onTonaj(row);
                }}
            >
                <IconTonaj />
                {tonajli ? "Tonajlı" : "Tonaj"}
            </button>

            <button
                className={`op-btn op-btn-ikaz ${ikazli ? "is-active" : ""}`}
                title="İkaz"
                onClick={async (e) => {
                    e.stopPropagation();

                    await islemLogla({
                        islem_tipi: "IKAZ_BUTON",
                        islem_aciklama: "İkaz işlemi tetiklendi",
                        tablo_adi: "aktif_seferler",
                        kayit_id: row.id || null,
                        sefer_no: row.sefer_no || null,
                        plaka: row.plaka || null,
                        detay: {
                            buton: "İkaz",
                            ekran: "Aktif Seferler",
                        },
                    });

                    onIkaz(row);
                }}
            >
                <IconIkaz /> {ikazli ? "İkazı kaldır" : "İkaz ver"}
            </button>

            <button
                className="op-btn op-btn-delete danger"
                title="Sefer Sil"
                onClick={async (e) => {
                    e.stopPropagation();

                    await islemLogla({
                        islem_tipi: "SEFER_SIL",
                        islem_aciklama: "Sefer pasif hale getirildi",
                        tablo_adi: "aktif_seferler",
                        kayit_id: row.id || null,
                        sefer_no: row.sefer_no || null,
                        plaka: row.plaka || null,
                        detay: {
                            buton: "Sefer Sil",
                            ekran: "Aktif Seferler",
                        },
                    });

                    onSeferSil(row);
                }}
            >
                <IconTrash />
                Sil
            </button>

            </MoreActions>
        </div>
    );
}
function CellValue({
    col,
    row,
    isOpen,
    onToggle,
    onDetail,
    onIkaz,
    onETA,
    onTonaj,
    onSeferSil,
    etaDelayed
}) {
    if (col.key === "_ops") {
        return (
            <OpsBtns
                row={row}
                onDetail={onDetail}
                onIkaz={onIkaz}
                onETA={onETA}
                onTonaj={onTonaj}
                onSeferSil={onSeferSil}
                etaDelayed={etaDelayed}
            />
        );
    }

    if (col.key === "_expand") {
        return (
            <button className={`expand-btn ${isOpen ? "open" : ""}`} onClick={onToggle} aria-expanded={isOpen} aria-label={isOpen ? "Rotayı kapat" : "Rotayı göster"} style={{ border: "none", cursor: "pointer" }}>
                <IconChevron open={isOpen} />
            </button>
        );
    }

    const val = row[col.key];

    if (col.type === "sefer") return <div className="trip-identity"><span className="sefer-badge">{val || "—"}</span>{hasWarning(row) && <span className="trip-warning-badge"><TriangleAlert size={12}/> İkazlı</span>}</div>;
    if (col.type === "plaka") return val ? <span className="plate-cell">{val}</span> : <span className="muted">—</span>;
    if (col.type === "statu") return val ? <span className="statu-pill">{val}</span> : <span className="muted">—</span>;

    if (col.type === "date") {
        const f = formatDate(val);
        return f ? <span className="date-val">{f}</span> : <span className="muted">—</span>;
    }

    if (col.type === "textLong") {
        return val ? <span className="long-text-cell" title={val}>{val}</span> : <span className="muted">—</span>;
    }

    if (col.type === "multi") {
        const parts = split(val);
        if (!parts.length) return <span className="muted">—</span>;
        if (parts.length === 1) return <span style={{ color: "var(--text-1)", fontWeight: 500 }}>{parts[0]}</span>;

        return (
            <span className="multi-val">
                <span className="multi-first">{parts[0]}</span>
                <span className="multi-more">+{parts.length - 1}</span>
            </span>
        );
    }

    return val ? <span style={{ color: "var(--text-1)" }}>{val}</span> : <span className="muted">—</span>;
}


function ColumnFiltersPanel({ columns, rows, filters, onChange, onClearAll }) {
    const filterableColumns = columns.filter((col) => !col.key?.startsWith("_"));
    const [activeColumnKey, setActiveColumnKey] = useState(filterableColumns[0]?.key || "");

    useEffect(() => {
        if (!filterableColumns.some((col) => col.key === activeColumnKey)) {
            setActiveColumnKey(filterableColumns[0]?.key || "");
        }
    }, [activeColumnKey, filterableColumns]);

    const activeColumn = filterableColumns.find((col) => col.key === activeColumnKey) || filterableColumns[0];
    const activeFilter = filters[activeColumn?.key] || { search: "", values: [] };

    const options = useMemo(() => {
        if (!activeColumn) return [];
        return getColumnFilterOptions(rows, activeColumn);
    }, [rows, activeColumn]);

    const filteredOptions = useMemo(() => {
        const term = normalizeTR(activeFilter.search);
        if (!term) return options.slice(0, 60);
        return options.filter((option) => normalizeTR(option).includes(term)).slice(0, 60);
    }, [options, activeFilter.search]);

    const activeFilterCount = useMemo(() => {
        return Object.values(filters).reduce((total, filter) => {
            if (isColumnFilterEmpty(filter)) return total;
            return total + 1;
        }, 0);
    }, [filters]);

    const setFilter = useCallback((key, nextFilter) => {
        onChange((prev) => {
            const next = { ...prev };

            if (isColumnFilterEmpty(nextFilter)) delete next[key];
            else next[key] = nextFilter;

            return next;
        });
    }, [onChange]);

    const toggleValue = useCallback((value) => {
        if (!activeColumn) return;

        const values = Array.isArray(activeFilter.values) ? activeFilter.values : [];
        const exists = values.includes(value);
        const nextValues = exists ? values.filter((item) => item !== value) : [...values, value];

        setFilter(activeColumn.key, {
            ...activeFilter,
            values: nextValues,
        });
    }, [activeColumn, activeFilter, setFilter]);

    if (!activeColumn) return null;

    return (
        <div className="column-filter-panel">
            <div className="column-filter-top">
                <div>
                    <span className="column-filter-kicker">Sütun Filtreleri</span>
                    <strong>Akıllı tablo filtreleme</strong>
                    <p>Bir sütun seç, arama yap veya hazır değerlerden çoklu seçim uygula.</p>
                </div>

                <button
                    type="button"
                    className="column-filter-clear-all"
                    onClick={onClearAll}
                    disabled={!activeFilterCount}
                >
                    Filtreleri Temizle
                    {activeFilterCount > 0 && <span>{activeFilterCount}</span>}
                </button>
            </div>

            <div className="column-filter-body">
                <div className="column-filter-tabs" aria-label="Filtrelenecek sütunlar">
                    {filterableColumns.map((col) => {
                        const hasFilter = !isColumnFilterEmpty(filters[col.key]);

                        return (
                            <button
                                key={col.key}
                                type="button"
                                className={`column-filter-tab ${activeColumn.key === col.key ? "active" : ""} ${hasFilter ? "has-filter" : ""}`}
                                onClick={() => setActiveColumnKey(col.key)}
                            >
                                <span>{col.label || col.key}</span>
                                {hasFilter && <i />}
                            </button>
                        );
                    })}
                </div>

                <div className="column-filter-workspace">
                    <div className="column-filter-search-row">
                        <div className="column-filter-search">
                            <span>⌕</span>
                            <input
                                value={activeFilter.search || ""}
                                onChange={(e) =>
                                    setFilter(activeColumn.key, {
                                        ...activeFilter,
                                        search: e.target.value,
                                    })
                                }
                                placeholder={`${activeColumn.label} içinde ara...`}
                            />
                        </div>

                        <button
                            type="button"
                            className="column-filter-clear"
                            onClick={() => setFilter(activeColumn.key, { search: "", values: [] })}
                            disabled={isColumnFilterEmpty(activeFilter)}
                        >
                            Bu sütunu temizle
                        </button>
                    </div>

                    <div className="column-filter-selected">
                        {Array.isArray(activeFilter.values) && activeFilter.values.length ? (
                            activeFilter.values.map((value) => (
                                <button key={value} type="button" onClick={() => toggleValue(value)}>
                                    {value}
                                    <span>×</span>
                                </button>
                            ))
                        ) : (
                            <span>Henüz değer seçilmedi. Arama yazabilir veya aşağıdan seçim yapabilirsin.</span>
                        )}
                    </div>

                    <div className="column-filter-options">
                        {filteredOptions.length ? (
                            filteredOptions.map((option) => {
                                const checked = Array.isArray(activeFilter.values) && activeFilter.values.includes(option);

                                return (
                                    <label key={option} className={checked ? "checked" : ""}>
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleValue(option)}
                                        />
                                        <span>{option}</span>
                                    </label>
                                );
                            })
                        ) : (
                            <div className="column-filter-empty">Bu sütunda eşleşen değer yok.</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function AktifSeferler() {
    const [expandedId, setExpandedId] = useState(null);
    const [search, setSearch] = useState("");
    const initialPrefs = useMemo(() => loadActiveTripsPreferences(), []);
    const [quickFilter,setQuickFilter]=useState("all");
    const [projectFilter,setProjectFilter]=useState("all");
    const [density,setDensity]=useState(initialPrefs.density === "compact" ? "compact" : "comfortable");
    const [selectedRowKeys,setSelectedRowKeys]=useState([]);
    const [page,setPage]=useState(1);
    const [pageSize,setPageSize]=useState([25,50,100].includes(Number(initialPrefs.pageSize)) ? Number(initialPrefs.pageSize) : 25);
    const [detailRow, setDetailRow] = useState(null);
    const [etaRow, setEtaRow] = useState(null);
    const [delayedEtaMap, setDelayedEtaMap] = useState({});
    const today = new Date();

    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    const formatInputDate = (date) =>
        date.toISOString().split("T")[0];

    const [startDate, setStartDate] = useState(
        formatInputDate(yesterday)
    );

    const [endDate, setEndDate] = useState(
        formatInputDate(today)
    );
    const {
        rows,
        setRows,
        loading,
        syncing, syncState, loadError, refresh,
        synchronize: tmsdenCekVeKaydet,
    } = useActiveTrips({ startDate, endDate });
    const [showSutunDuzeni, setShowSutunDuzeni] = useState(false);
    const [showColumnFilters, setShowColumnFilters] = useState(false);
    const [toast, setToast] = useState(null);
    const [completionCandidate, setCompletionCandidate] = useState(null);
    const [completingTrip, setCompletingTrip] = useState(false);
    const defaultLayout = useMemo(() => getDefaultTableLayout(), []);
    const [layoutReady, setLayoutReady] = useState(false);
    const [columnFilters, setColumnFilters] = useState(defaultLayout.columnFilters);
    const [columnWidths, setColumnWidths] = useState(defaultLayout.columnWidths);
    const [columnOrder, setColumnOrder] = useState(defaultLayout.columnOrder);
    const [visibleColumnKeys, setVisibleColumnKeys] = useState(defaultLayout.visibleColumnKeys);
    const [aktifKullaniciDb, setAktifKullaniciDb] = useState(null);
    const [yetkiLoading, setYetkiLoading] = useState(true);
    const [deleteCandidate, setDeleteCandidate] = useState(null);
    const warningPending = useRef(new Set());
    const searchInputRef = useRef(null);
    const [deletingTrip, setDeletingTrip] = useState(false);

    useEffect(() => {
        saveActiveTripsPreferences({ density, pageSize });
    }, [density, pageSize]);

    useEffect(() => {
        async function kullaniciYetkisiniGetir() {
            try {
                const localUser = getAktifKullanici();

                if (!localUser) {
                    setYetkiLoading(false);
                    return;
                }

                let query = supabase
                    .from("kullanicilar")
                    .select("id, kullanici, ad, rol, yetki, aktif");

                if (localUser.id) {
                    query = query.eq("id", localUser.id);
                } else {
                    query = query.eq(
                        "kullanici",
                        localUser.kullanici || localUser.kullanici_adi || localUser.username || localUser.ad
                    );
                }

                const { data, error } = await query.maybeSingle();

                if (error) throw error;

                setAktifKullaniciDb(data);
            } catch (error) {
                console.error("Kullanıcı yetkisi alınamadı:", error);
            } finally {
                setYetkiLoading(false);
            }
        }

        kullaniciYetkisiniGetir();
    }, []);

    const handleSeferSil = useCallback((row) => {
        setDeleteCandidate(row);
    }, []);

    const confirmDeleteTrip = useCallback(async () => {
        if (!deleteCandidate) return;

        setDeletingTrip(true);

        try {
            const { error } = await supabase
                .from("aktif_seferler")
                .update({
                    pasif: true,
                    pasif_tarihi: new Date().toISOString(),
                    pasif_nedeni: "Kullanıcı tarafından silindi",
                })
                .eq("sefer_no", deleteCandidate.sefer_no);

            if (error) throw error;

            setRows((prev) =>
                prev.filter(
                    (item) => item.sefer_no !== deleteCandidate.sefer_no
                )
            );

            setDeleteCandidate(null);

            setToast({
                type: "success",
                message: "Sefer pasif hale getirildi.",
            });

            setTimeout(() => setToast(null), 2600);

        } catch (err) {
            console.error("Sefer silme hatası:", err);

            setToast({
                type: "error",
                message: "Sefer silinirken hata oluştu.",
            });

            setTimeout(() => setToast(null), 2600);
        } finally {
            setDeletingTrip(false);
        }
    }, [deleteCandidate]);

    const kullaniciYetki = Array.isArray(aktifKullaniciDb?.yetki)
        ? aktifKullaniciDb.yetki
        : [];

    const can = (page, action) => {
        const pagePermission = kullaniciYetki.find((item) => item.page === page);
        return pagePermission?.actions?.includes(action) || false;
    };

    const canView = can("Aktif Seferler", "view");
    const canUpdate = can("Aktif Seferler", "update");
    const canExport = can("Aktif Seferler", "export");    const resizingRef = useRef(null);
    const layoutSaveTimerRef = useRef(null);

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

    const baseRows = useMemo(() => rows, [rows]);

    const projectStats = useMemo(() => {
        const projects = new Map();

        baseRows.forEach((row) => {
            const label = String(row.proje_adi || "").replace(/\s+/g, " ").trim();
            if (!label) return;

            const key = normalizeCompare(label);
            const current = projects.get(key);
            if (current) {
                current.count += 1;
            } else {
                projects.set(key, { key, label, count: 1 });
            }
        });

        return Array.from(projects.values()).sort((a, b) =>
            b.count - a.count || a.label.localeCompare(b.label, "tr", { sensitivity: "base" })
        );
    }, [baseRows]);

    const visibleRows = useMemo(() => {
        const activeFilters = Object.entries(columnFilters).filter(([,filter])=>!isColumnFilterEmpty(filter));
        const columnMap = new Map(DEFAULT_COLUMNS.map(col=>[col.key,col]));
        return baseRows.filter(row=>{
            const text=normalizeCompare([row.sefer_no,row.plaka,row.treyler,row.surucu_ad_soyad,row.musteri_adi,row.proje_adi,row.yukleme_ili,row.teslim_ili].join(" "));
            const matchesSearch=!search || text.includes(normalizeCompare(search));
            const rowKey=row.id || row.sefer_no;
            const matchesQuick=quickFilter==="all" || (quickFilter==="tonaj" && row.tonaj_durumu===TONAJ_ACIKLAMA) || (quickFilter==="ikaz" && hasWarning(row)) || (quickFilter==="eta" && Boolean(delayedEtaMap[rowKey]));
            const matchesProject=projectFilter==="all" || normalizeCompare(row.proje_adi)===projectFilter;
            return matchesSearch && matchesQuick && matchesProject && activeFilters.every(([key,filter])=>!columnMap.has(key)||rowMatchesColumnFilter(row,columnMap.get(key),filter));
        });
    },[baseRows,columnFilters,search,quickFilter,projectFilter,delayedEtaMap]);
    const pageCount=Math.max(1,Math.ceil(visibleRows.length/pageSize));
    const currentPage=Math.min(page,pageCount);
    const pageRows=visibleRows.slice((currentPage-1)*pageSize,currentPage*pageSize);
    useEffect(()=>setPage(1),[search,quickFilter,projectFilter,columnFilters,startDate,endDate,pageSize]);
    useEffect(()=>{
        if(projectFilter!=="all" && !projectStats.some(project=>project.key===projectFilter)){
            setProjectFilter("all");
        }
    },[projectFilter,projectStats]);
    const quickCounts={all:baseRows.length,tonaj:baseRows.filter(r=>r.tonaj_durumu===TONAJ_ACIKLAMA).length,ikaz:baseRows.filter(r=>hasWarning(r)).length,eta:baseRows.filter(r=>Boolean(delayedEtaMap[r.id || r.sefer_no])).length};
    const selectedRows=useMemo(()=>baseRows.filter(r=>selectedRowKeys.includes(r.id || r.sefer_no)),[baseRows,selectedRowKeys]);
    const pageRowKeys=pageRows.map(r=>r.id || r.sefer_no);
    const visibleRowKeys=visibleRows.map(r=>r.id || r.sefer_no);
    const allPageSelected=pageRowKeys.length>0 && pageRowKeys.every(key=>selectedRowKeys.includes(key));
    const allVisibleSelected=visibleRowKeys.length>0 && visibleRowKeys.every(key=>selectedRowKeys.includes(key));
    const togglePageSelection=()=>setSelectedRowKeys(prev=>allPageSelected?prev.filter(key=>!pageRowKeys.includes(key)):Array.from(new Set([...prev,...pageRowKeys])));
    const toggleVisibleSelection=()=>setSelectedRowKeys(prev=>allVisibleSelected?prev.filter(key=>!visibleRowKeys.includes(key)):Array.from(new Set([...prev,...visibleRowKeys])));
    const clearSelection=()=>setSelectedRowKeys([]);
    const toggleRowSelection=(key)=>setSelectedRowKeys(prev=>prev.includes(key)?prev.filter(x=>x!==key):[...prev,key]);
    const exportRowsToExcel=(items,filePrefix="aktif_seferler")=>{
        if(!items.length){setToast({type:"error",message:"Dışa aktarılacak sefer bulunamadı."});setTimeout(()=>setToast(null),2200);return;}
        const data=items.map(r=>({"Sefer No":r.sefer_no||"","Sefer Tarihi":formatDate(r.sefer_tarihi)||"","Plaka":r.plaka||"","Treyler":r.treyler||"","Sürücü":r.surucu_ad_soyad||"","Müşteri":r.musteri_adi||"","Proje":r.proje_adi||"","Yükleme":r.yukleme_noktasi||"","Teslim":r.teslim_noktasi||"","Araç Statü":r.arac_statu||"","İkaz":hasWarning(r)?"Var":"Yok","Tonaj":r.tonaj_durumu||""}));
        const ws=XLSX.utils.json_to_sheet(data), wb=XLSX.utils.book_new();XLSX.utils.book_append_sheet(wb,ws,"Aktif Seferler");XLSX.writeFile(wb,`${filePrefix}_${new Date().toISOString().slice(0,10)}.xlsx`);
        setToast({type:"success",message:`${items.length} sefer Excel dosyasına aktarıldı.`});setTimeout(()=>setToast(null),2200);
    };
    const copySelectedPlates=async()=>{const plates=[...new Set(selectedRows.map(r=>r.plaka).filter(Boolean))];if(!plates.length){setToast({type:"error",message:"Kopyalanacak plaka seçilmedi."});setTimeout(()=>setToast(null),2200);return;} await navigator.clipboard.writeText(plates.join("\n"));setToast({type:"success",message:`${plates.length} plaka panoya kopyalandı.`});setTimeout(()=>setToast(null),2200);};
    const copySelectedSummary=async()=>{
        if(!selectedRows.length){setToast({type:"error",message:"Özet için önce sefer seçin."});setTimeout(()=>setToast(null),2200);return;}
        const lines=selectedRows.map(r=>[r.sefer_no,r.plaka,r.surucu_ad_soyad,r.proje_adi].filter(Boolean).join(" | "));
        await navigator.clipboard.writeText(lines.join("\n"));
        setToast({type:"success",message:`${selectedRows.length} sefer özeti panoya kopyalandı.`});setTimeout(()=>setToast(null),2200);
    };
    const applyDatePreset=(preset)=>{
        const end=new Date();
        const start=new Date(end);
        if(preset==="today") start.setDate(end.getDate());
        if(preset==="yesterday") start.setDate(end.getDate()-1);
        if(preset==="week") start.setDate(end.getDate()-6);
        setStartDate(formatInputDate(start));
        setEndDate(formatInputDate(end));
    };
    function applyOperationView(){
        const keys=["_ops","_expand","sefer_no","plaka","arac_statu","surucu_ad_soyad","musteri_adi","yukleme_ili","teslim_ili","sefer_tarihi"];
        setVisibleColumnKeys(keys);setColumnOrder([...keys,...DEFAULT_COLUMNS.map(c=>c.key).filter(k=>!keys.includes(k))]);
    }
    useEffect(()=>{
        const onKeyDown=(event)=>{
            const target=event.target;
            const typing=target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement || target?.isContentEditable;
            if(event.key==="/" && !typing){event.preventDefault();searchInputRef.current?.focus();return;}
            if(event.altKey && event.key.toLowerCase()==="f" && !typing){event.preventDefault();setShowColumnFilters(true);return;}
            if(event.altKey && event.key.toLowerCase()==="r" && !typing && canUpdate && !loading && !syncing){event.preventDefault();tmsdenCekVeKaydet();return;}
            if(event.key==="Escape" && !showColumnFilters && !showSutunDuzeni && search){setSearch("");}
        };
        window.addEventListener("keydown",onKeyDown);
        return()=>window.removeEventListener("keydown",onKeyDown);
    },[canUpdate,loading,syncing,tmsdenCekVeKaydet,showColumnFilters,showSutunDuzeni,search]);

    useEffect(()=>{
        if(!showColumnFilters && !showSutunDuzeni) return;
        const previousFocus=document.activeElement;
        const panel=document.querySelector(showColumnFilters?".filter-drawer":".sutun-panel");
        const focusable=()=>Array.from(panel?.querySelectorAll('button:not(:disabled), input:not(:disabled), select, [tabindex="0"]')||[]).filter(el=>el.getClientRects().length);
        focusable()[0]?.focus();
        const close=e=>{
            if(e.key==="Escape"){setShowColumnFilters(false);setShowSutunDuzeni(false);}
            if(e.key==="Tab"){
                const list=focusable(),first=list[0],last=list.at(-1);
                if(e.shiftKey && document.activeElement===first){e.preventDefault();last?.focus();}
                else if(!e.shiftKey && document.activeElement===last){e.preventDefault();first?.focus();}
            }
        };
        window.addEventListener("keydown",close);
        return()=>{window.removeEventListener("keydown",close);previousFocus?.focus();};
    },[showColumnFilters,showSutunDuzeni]);

    const clearColumnFilters = useCallback(() => {
        setColumnFilters({});
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadLayout() {
            try {
                const layout = await loadUserTableLayout();

                if (cancelled) return;

                setColumnFilters(layout.columnFilters);
                setColumnWidths(layout.columnWidths);
                setColumnOrder(layout.columnOrder);
                setVisibleColumnKeys(layout.visibleColumnKeys);
            } catch (err) {
                console.error("Kullanıcı sütun görünümü alınamadı:", err);
            } finally {
                if (!cancelled) setLayoutReady(true);
            }
        }

        loadLayout();

        return () => {
            cancelled = true;
        };
    }, []);

    useEffect(() => {
        if (!layoutReady) return;

        if (layoutSaveTimerRef.current) {
            clearTimeout(layoutSaveTimerRef.current);
        }

        layoutSaveTimerRef.current = setTimeout(async () => {
            try {
                await saveUserTableLayout({
                    columnFilters,
                    columnWidths,
                    columnOrder,
                    visibleColumnKeys,
                });
            } catch (err) {
                console.error("Kullanıcı sütun görünümü kaydedilemedi:", err);
            }
        }, 600);

        return () => {
            if (layoutSaveTimerRef.current) {
                clearTimeout(layoutSaveTimerRef.current);
            }
        };
    }, [layoutReady, columnFilters, columnWidths, columnOrder, visibleColumnKeys]);

    useEffect(() => {
        let cancelled = false;

        async function checkEtaDelays() {
            const nextMap = {};

            for (const row of visibleRows) {
                const actualHours = getActualEtaHours(row);

                if (!actualHours) continue;
                const yuklemeIl = getLastValue(row.yukleme_ili);
                const yuklemeIlce = getLastValue(row.yukleme_ilcesi);

                const cikis = getEtaCikisValue(yuklemeIl, yuklemeIlce);
                const varis = normalizeTR(getLastValue(row.teslim_ili));

                if (!cikis || !varis) continue;

                const { data, error } = await supabase
                    .from("eta_referanslari")
                    .select("*")
                    .ilike("cikis", `${cikis}%`)
                    .ilike("varis", `${varis}%`)
                    .limit(1);

                if (error || !data?.length) continue;

                const etaRef = data[0];
                const etaDays = parseGunValue(etaRef["gün"]);
                if (!etaDays) continue;

                const rowKey = row.id || row.sefer_no;

                const toleranceMinutes = 15;
                const limitHours = etaDays * 24 + toleranceMinutes / 60;

                if (actualHours > limitHours) {
                    nextMap[rowKey] = {
                        actualDays: Number((actualHours / 24).toFixed(2)),
                        etaDays,
                        km: etaRef.km,
                        gun: etaRef["gün"],
                    };
                }
            }

            if (!cancelled) {
                setDelayedEtaMap(nextMap);
            }
        }

        checkEtaDelays();

        return () => {
            cancelled = true;
        };
    }, [visibleRows]);

    const persistVisibleColumns = useCallback((next) => {
        setVisibleColumnKeys(next);
    }, []);

    const persistColumnOrder = useCallback((next) => {
        setColumnOrder(next);
    }, []);

    const toggleColumn = useCallback((key) => {
        const col = DEFAULT_COLUMNS.find((x) => x.key === key);
        if (col?.locked) return;

        setVisibleColumnKeys((prev) => {
            const exists = prev.includes(key);
            const next = exists ? prev.filter((x) => x !== key) : [...prev, key];
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

            return next;
        });
    }, []);

    const handleIkaz = useCallback(async (row) => {
        if (warningPending.current.has(row.sefer_no)) return;
        warningPending.current.add(row.sefer_no);
        const next = toggleWarningText(row.aciklama);
        try {
            const { data, error } = await supabase.from("aktif_seferler")
                .update({ aciklama: next }).eq("sefer_no", row.sefer_no).select("sefer_no, aciklama");
            if (error) throw error;
            if (!data?.length) throw new Error("Kayıt güncellenemedi; yetki veya sefer durumunu kontrol edin.");
            setRows(prev=>prev.map(item=>item.sefer_no===row.sefer_no?{...item,aciklama:data[0].aciklama}:item));
            setToast({type:"success",message:hasWarning(row)?"İkaz kaldırıldı.":"Sefer ikazlı olarak işaretlendi."});
        } catch (error) {
            setToast({type:"error",message:`İkaz değiştirilemedi. ${error.message || "Lütfen yeniden deneyin."}`});
        } finally {
            warningPending.current.delete(row.sefer_no);
            setTimeout(()=>setToast(null),4000);
        }
    }, [setRows]);
    const handleTonaj = useCallback(async (row) => {
        const aktifMi = row.tonaj_durumu === TONAJ_ACIKLAMA;

        const yeniDeger = aktifMi ? null : TONAJ_ACIKLAMA;

        setRows((prev) =>
            prev.map((item) =>
                item.sefer_no === row.sefer_no
                    ? {
                        ...item,
                        tonaj_durumu: yeniDeger,
                    }
                    : item
            )
        );

        try {
            const { error } = await supabase
                .from("aktif_seferler")
                .update({
                    tonaj_durumu: yeniDeger,
                })
                .eq("sefer_no", row.sefer_no);

            if (error) throw error;

        } catch (err) {
            console.error("Tonaj güncelleme hatası:", err);
        }
    }, []);


    const isAllRouteDatesFilled = useCallback((row) => {
        const rota = Array.isArray(row.rota_detaylari) ? row.rota_detaylari : [];

        if (!rota.length) return false;

        return rota.every((step) =>
            step.planlanan_varis &&
            step.gerceklesen_varis &&
            step.planlanan_cikis &&
            step.gerceklesen_cikis
        );
    }, []);

    const completeTrip = useCallback(async (row) => {
        setCompletingTrip(true);

        try {
            const actualDays = getActualEtaDays(row);

            const cikis = normalizeTR(getLastValue(row.yukleme_ili));
            const varis = normalizeTR(getLastValue(row.teslim_ili));

            let etaReferansGun = null;
            let etaGecikme = false;
            let etaGecikmeSuresi = null;

            const rowKey = row.id || row.sefer_no;
            const delayedInfo = delayedEtaMap[rowKey];

            if (delayedInfo) {
                etaReferansGun = delayedInfo.gun;
                etaGecikme = true;
                etaGecikmeSuresi = Number(
                    (delayedInfo.actualDays - delayedInfo.etaDays).toFixed(2)
                );
            }

            try {
                const { data } = await supabase
                    .from("eta_referanslari")
                    .select("*")
                    .ilike("cikis", `${cikis}%`)
                    .ilike("varis", `${varis}%`)
                    .maybeSingle();

                if (data) {
                    etaReferansGun = data["gün"];

                    const etaDays = parseGunValue(data["gün"]);

                    if (!delayedInfo && actualDays && etaDays) {
                        etaGecikme = actualDays > etaDays;

                        etaGecikmeSuresi = etaGecikme
                            ? Number((actualDays - etaDays).toFixed(2))
                            : 0;
                    }
                }
            } catch (err) {
                console.error("ETA completion check error:", err);
            }

            const payload = {
                sefer_no: row.sefer_no,
                sefer_tarihi: row.sefer_tarihi || null,
                plaka: row.plaka || null,
                treyler: row.treyler || null,
                surucu_ad_soyad: row.surucu_ad_soyad || null,
                musteri_adi: row.musteri_adi || null,
                musteri_siparis_no: row.musteri_siparis_no || null,
                hizmet_adi: row.hizmet_adi || null,
                proje_adi: row.proje_adi || null,
                arac_statu: row.arac_statu || null,
                aciklama: row.aciklama || null,
                irsaliye_no: row.irsaliye_no || null,
                atama_yapan_kullanici: row.atama_yapan_kullanici || null,
                atama_tarihi: row.atama_tarihi || null,
                rota_detaylari: row.rota_detaylari || null,
                ham_veri: row.ham_veri || null,
                ana_kayit: row,

                eta_referans_gun: etaReferansGun,
                eta_gerceklesen_gun: actualDays,
                eta_gecikme: etaGecikme,
                eta_gecikme_suresi: etaGecikmeSuresi,
                tonaj_durumu: row.tonaj_durumu || null,
            };

            await moveTripToCompleted(payload);

            setRows((prev) => prev.filter((item) => item.sefer_no !== row.sefer_no));
            setCompletionCandidate(null);

            setToast({
                type: "success",
                message: "Sefer tamamlandı ve tamamlanan seferlere aktarıldı.",
            });

            setTimeout(() => setToast(null), 2600);
        } catch (err) {
            console.error("Sefer tamamlama hatası:", err);

            setToast({
                type: "error",
                message: "Sefer tamamlanırken hata oluştu.",
            });

            setTimeout(() => setToast(null), 2600);
        } finally {
            setCompletingTrip(false);
        }
    }, [delayedEtaMap]);
    const resetColumnLayout = useCallback(() => {
        const defaultOrder = DEFAULT_COLUMNS.map((col) => col.key);
        const defaultVisible = DEFAULT_COLUMNS.map((col) => col.key);

        setColumnWidths({});
        setColumnFilters({});
        persistColumnOrder(defaultOrder);
        persistVisibleColumns(defaultVisible);
    }, [persistColumnOrder, persistVisibleColumns]);

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

            setColumnWidths((prev) => ({ ...prev, [key]: nextWidth }));
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

    useEffect(() => {
        if (completionCandidate) return;

        const candidate = visibleRows.find((row) => isAllRouteDatesFilled(row));

        if (!candidate) return;

        setCompletionCandidate(candidate);
    }, [visibleRows, completionCandidate, isAllRouteDatesFilled]);

    const etaUyumsuzRows = useMemo(() => {
        return visibleRows.filter((row) => delayedEtaMap[row.id || row.sefer_no]);
    }, [visibleRows, delayedEtaMap]);

    const exportEtaUyumsuzExcel = useCallback(() => {
        if (!etaUyumsuzRows.length) {
            setToast({
                type: "error",
                message: "Excel'e aktarılacak ETA uyumsuzluğu bulunamadı.",
            });
            setTimeout(() => setToast(null), 2600);
            return;
        }

        const excelRows = etaUyumsuzRows.map((row) => {
            const rowKey = row.id || row.sefer_no;
            const eta = delayedEtaMap[rowKey] || {};

            return {
                "Sefer No": row.sefer_no || "",
                "Sefer Tarihi": formatDate(row.sefer_tarihi) || "",
                "Plaka": row.plaka || "",
                "Sürücü": row.surucu_ad_soyad || "",
                "Müşteri": row.musteri_adi || "",
                "Yükleme İl": row.yukleme_ili || "",
                "Teslim İl": row.teslim_ili || "",
                "Gerçekleşen Gün": eta.actualDays ?? "",
                "Referans ETA Gün": eta.gun ?? eta.etaDays ?? "",
                "Gecikme Gün": eta.actualDays && eta.etaDays ? eta.actualDays - eta.etaDays : "",
                "KM": eta.km || "",
            };
        });

        const headers = Object.keys(excelRows[0]);
        const worksheet = XLSX.utils.json_to_sheet(excelRows);

        const workbook = XLSX.utils.book_new();

        XLSX.utils.book_append_sheet(
            workbook,
            worksheet,
            "ETA Uyumsuzlukları"
        );

        XLSX.writeFile(
            workbook,
            `eta_uyumsuzluklari_${new Date().toISOString().slice(0, 10)}.xlsx`
        );
    }, [etaUyumsuzRows, delayedEtaMap]);

    const canExpand = (row) =>
        (Array.isArray(row.rota_detaylari) && row.rota_detaylari.length > 0) ||
        split(row.yukleme_noktasi).length > 0 ||
        split(row.teslim_noktasi).length > 0 ||
        split(row.teslim_alan_firma).length > 0;

    if (yetkiLoading) {
        return (
            <div className="aktif-page">
                <div className="aktif-header">
                    <div>
                        <span className="aktif-eyebrow">Yetki Kontrolü</span>
                        <h1>Yetkiler yükleniyor...</h1>
                    </div>
                </div>
            </div>
        );
    }

    if (!canView) {
        return (
            <div className="aktif-page">
                <div className="aktif-header">
                    <div>
                        <span className="aktif-eyebrow">Yetkisiz Erişim</span>
                        <h1>Bu ekran için yetkiniz yok</h1>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`aktif-page trips-modern density-${density}`}>
            <header className="aktif-header">
                <div><span className="aktif-eyebrow">OPERASYON / SEFER YÖNETİMİ</span><h1>Aktif Seferler</h1><p>Atamadan teslimata, tüm operasyonunuzu yönetin.</p></div>
                <div className="aktif-header-actions">
                    {canExport && <button className="eta-export-btn" type="button" onClick={exportEtaUyumsuzExcel} disabled={!etaUyumsuzRows.length} title="ETA uyumsuz satırları Excel’e aktar"><Download size={16}/> ETA raporu <span>{etaUyumsuzRows.length}</span></button>}
                    <button className="columns-icon-btn" type="button" onClick={()=>setShowSutunDuzeni(true)} aria-label="Sütun Düzeni"><IconColumns/> Görünüm</button>
                </div>
            </header>
            <section className="trip-overview" aria-label="Sefer özeti">
                <div><span className="trip-metric-icon"><Route size={21}/></span><span><small>Aktif sefer</small><strong>{baseRows.length}</strong></span><em>Seçili tarih aralığı</em></div>
                <div><span className="trip-metric-icon teal"><Truck size={21}/></span><span><small>Atanan araç</small><strong>{new Set(baseRows.map(r=>r.plaka).filter(Boolean)).size}</strong></span></div>
                <div><span className="trip-metric-icon amber"><Weight size={21}/></span><span><small>Tonajlı sefer</small><strong>{quickCounts.tonaj}</strong></span></div>
                <div><span className="trip-metric-icon rose"><TriangleAlert size={21}/></span><span><small>İkazlı sefer</small><strong>{quickCounts.ikaz}</strong></span></div>
            </section>
            <section className="trip-sync-bar" aria-label="Tarih ve veri yenileme">
                <div className="trip-sync-label"><CalendarDays size={18}/><span><strong>Sefer dönemi</strong><small>Listelenecek tarih aralığı</small></span></div>
                <div className="filter-date-group"><label className="date-field"><span>Başlangıç</span><input type="date" disabled={syncing} aria-label="Başlangıç tarihi" value={startDate} onChange={e=>setStartDate(e.target.value)}/></label><ArrowRight size={16}/><label className="date-field"><span>Bitiş</span><input type="date" disabled={syncing} aria-label="Bitiş tarihi" value={endDate} onChange={e=>setEndDate(e.target.value)}/></label></div>
                <div className="trip-date-presets" aria-label="Hızlı tarih aralıkları"><button type="button" onClick={()=>applyDatePreset("today")}>Bugün</button><button type="button" onClick={()=>applyDatePreset("yesterday")}>Dün + bugün</button><button type="button" onClick={()=>applyDatePreset("week")}><CalendarRange size={14}/> Son 7 gün</button></div>
                <div className="trip-sync-status" role="status">{syncing ? "TMS verileri alınıyor…" : loading ? "Liste yükleniyor…" : "Kayıtlı seferler gösteriliyor"}</div>
                {canUpdate && <button className="tms-refresh-btn" onClick={tmsdenCekVeKaydet} disabled={loading||syncing}><RefreshCw size={16} className={syncing?"trip-spin":""}/>{syncing?"Yenileniyor…":"TMS’den Yenile"}</button>}
            </section>
            {loadError && <div className="sync-result error" role="alert"><TriangleAlert size={20}/><span>{loadError}</span><button onClick={()=>refresh().catch(()=>{})}>Listeyi yeniden yükle</button></div>}
            {syncState && <section className={`sync-result ${syncState.stage}`} aria-live="polite" aria-busy={syncing}>
                <div className="sync-result-heading">{syncing?<RefreshCw size={22} className="trip-spin"/>:syncState.stage==="success"?<CheckCircle2 size={22}/>:<TriangleAlert size={22}/>}<div><strong>{syncState.message}</strong><small>{syncing ? "İşlem sürüyor; bu ekranı açık tutabilirsiniz." : syncState.finishedAt ? `Son tamamlanma ${syncState.finishedAt}` : "Kaydedilen kayıtlar korunur. Yeniden deneyebilirsiniz."}</small></div></div>
                {syncing && <div className="sync-progress-track"><i/></div>}
                <div className="sync-steps">{[{key:"fetching",label:"TMS bağlantısı"},{key:"checking",label:"Kayıt kontrolü"},{key:"saving",label:"Kaydetme"},{key:"refreshing",label:"Liste yenileme"}].map((step,index)=><span key={step.key} className={step.key===syncState.stage?"current":""}>{index+1}. {step.label}</span>)}</div>
                <div className="sync-counts"><span>Alınan <b>{syncState.received??"—"}</b></span><span>Yeni sefer <b>{syncState.newCount??"—"}</b></span><span>Güncellenen <b>{syncState.updatedCount??"—"}</b></span><span>Değişmeyen <b>{syncState.unchangedCount??"—"}</b></span><span>Kapsam dışı <b>{syncState.excludedCount??"—"}</b></span>{syncState.skippedCount>0&&<span>Atlanan <b>{syncState.skippedCount}</b></span>}</div>
            </section>}
            <section className="trip-workspace">
            <div className="trip-viewbar"><div className="trip-quick-filters" aria-label="Hızlı filtreler">{[{key:"all",label:"Tüm seferler"},{key:"tonaj",label:"Tonajlı"},{key:"ikaz",label:"İkazlı"},{key:"eta",label:"ETA riskli"}].map(item=><button key={item.key} aria-pressed={quickFilter===item.key} className={quickFilter===item.key?"selected":""} onClick={()=>setQuickFilter(item.key)}>{item.label}<span>{quickCounts[item.key]}</span></button>)}</div><button className="trip-preset" onClick={applyOperationView}><Sparkles size={15}/> Operasyon görünümü</button></div>
            <div className="project-filter-section">
                <div className="project-filter-heading"><span className="project-filter-icon"><Layers3 size={16}/></span><div><strong>Proje dağılımı</strong><small>Projeye göre seferleri tek tıkla filtreleyin</small></div></div>
                <div className="project-filter-list" aria-label="Proje filtreleri">
                    <button type="button" className={`project-filter-chip ${projectFilter==="all"?"selected":""}`} aria-pressed={projectFilter==="all"} onClick={()=>setProjectFilter("all")}><span>Tüm projeler</span><b>{baseRows.length}</b></button>
                    {projectStats.map(project=><button type="button" key={project.key} className={`project-filter-chip ${projectFilter===project.key?"selected":""}`} aria-pressed={projectFilter===project.key} title={`${project.label}: ${project.count} aktif sefer`} onClick={()=>setProjectFilter(prev=>prev===project.key?"all":project.key)}><span>{project.label}</span><b>{project.count}</b></button>)}
                </div>
            </div>
            <div className="table-toolbar">
                <label className="trip-search"><Search size={18}/><input ref={searchInputRef} aria-label="Seferlerde ara" placeholder="Sefer, plaka, sürücü, müşteri veya proje ara…" value={search} onChange={e=>setSearch(e.target.value)}/><kbd>/</kbd>{search && <button aria-label="Aramayı temizle" onClick={()=>setSearch("")}><X size={14}/></button>}</label>
                <div className="table-toolbar-actions"><span className="trip-shortcuts" title="Klavye kısayolları"><Keyboard size={15}/><span><kbd>/</kbd> Ara <kbd>Alt+F</kbd> Filtre <kbd>Alt+R</kbd> Yenile</span></span><button className="trip-density" onClick={()=>setDensity(density==="comfortable"?"compact":"comfortable")} aria-pressed={density==="compact"} title="Satır yoğunluğu"><ListFilter size={16}/>{density==="compact"?"Sıkı":"Rahat"}</button><button type="button" className="toolbar-filter-btn" onClick={()=>setShowColumnFilters(true)}><SlidersHorizontal size={16}/> Filtreler{Object.keys(columnFilters).length>0 && <span>{Object.keys(columnFilters).length}</span>}</button></div>
            </div>
            <div className="trip-commandbar">
                <div className="trip-selection-info"><CheckSquare2 size={16}/><strong>{selectedRows.length}</strong><span>sefer seçili</span></div>
                <div className="trip-command-actions">
                    <button type="button" onClick={togglePageSelection}>{allPageSelected?<CheckSquare2 size={15}/>:<Square size={15}/>} {allPageSelected?"Sayfa seçimini kaldır":"Bu sayfayı seç"}</button>
                    <button type="button" disabled={!visibleRows.length} onClick={toggleVisibleSelection}>{allVisibleSelected?<CheckSquare2 size={15}/>:<Square size={15}/>} {allVisibleSelected?"Tüm eşleşenleri bırak":`Tüm ${visibleRows.length} eşleşeni seç`}</button>
                    <button type="button" disabled={!selectedRows.length} onClick={copySelectedPlates}><Copy size={15}/> Plakaları kopyala</button>
                    <button type="button" disabled={!selectedRows.length} onClick={copySelectedSummary}><ClipboardList size={15}/> Özeti kopyala</button>
                    <button type="button" disabled={!selectedRows.length} onClick={clearSelection}><RotateCcw size={15}/> Seçimi temizle</button>
                    {canExport && <button type="button" disabled={!selectedRows.length} onClick={()=>exportRowsToExcel(selectedRows,"secili_aktif_seferler")}><Download size={15}/> Seçileni Excel</button>}
                    {canExport && <button type="button" className="command-primary" disabled={!visibleRows.length} onClick={()=>exportRowsToExcel(visibleRows,"filtreli_aktif_seferler")}><Download size={15}/> Görünümü dışa aktar</button>}
                </div>
            </div>
            {(search || quickFilter!=="all" || projectFilter!=="all" || Object.keys(columnFilters).length>0) && <div className="trip-active-filters"><div className="trip-active-filter-summary"><strong>{visibleRows.length} eşleşen sefer</strong>{search&&<button type="button" onClick={()=>setSearch("")}><Search size={12}/> “{search}” <X size={11}/></button>}{quickFilter!=="all"&&<button type="button" onClick={()=>setQuickFilter("all")}><ListFilter size={12}/> {({tonaj:"Tonajlı",ikaz:"İkazlı",eta:"ETA riskli"})[quickFilter]} <X size={11}/></button>}{projectFilter!=="all"&&<button type="button" onClick={()=>setProjectFilter("all")}><Layers3 size={12}/> {projectStats.find(p=>p.key===projectFilter)?.label||"Proje"} <X size={11}/></button>}{Object.keys(columnFilters).length>0&&<button type="button" onClick={clearColumnFilters}><SlidersHorizontal size={12}/> {Object.keys(columnFilters).length} sütun filtresi <X size={11}/></button>}</div><button className="trip-clear-all" onClick={()=>{setSearch("");setQuickFilter("all");setProjectFilter("all");clearColumnFilters();}}><RotateCcw size={13}/> Tüm filtreleri sıfırla</button></div>}
            {showColumnFilters && (
                <div
                    className="filter-drawer-overlay"
                    onMouseDown={() => setShowColumnFilters(false)}
                >
                    <div
                        className="filter-drawer"
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <div className="filter-drawer-head">
                            <div>
                                <span>Filtreleme</span>
                                <h3>Sütun Filtreleri</h3>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowColumnFilters(false)} aria-label="Filtreleri kapat"
                            >
                                ×
                            </button>
                        </div>

                        <ColumnFiltersPanel
                            columns={visibleOrderedColumns}
                            rows={baseRows}
                            filters={columnFilters}
                            onChange={setColumnFilters}
                            onClearAll={clearColumnFilters}
                        />
                    </div>
                </div>
            )}

            <div className="trip-table-hint"><ArrowRight size={12}/> Tüm bilgiler için tabloyu yana kaydırın. Sütun genişliklerini başlıktan ayarlayabilirsiniz.</div>
            <div className="aktif-card">
                <div className="table-wrapper" tabIndex={0} role="region" aria-label="Aktif sefer tablosu; diğer sütunlar için yana kaydırın" aria-busy={loading}>
                    <table className="aktif-table"><caption className="trip-sr-only">Aktif seferler, {visibleRows.length} kayıt</caption>
                        <colgroup>
                            {columnsWithLayout.map((col) => (
                                <col key={col.key} style={{ width: col.width, minWidth: col.width }} />
                            ))}
                        </colgroup>

                        <thead>
                            <tr>
                                {columnsWithLayout.map((col) => (
                                    <th scope="col"
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
                            {visibleRows.length === 0 && (
                                <tr>
                                    <td colSpan={columnsWithLayout.length} className="empty-cell">
                                        <div className="empty-state">
                                            <div className="empty-icon" aria-hidden="true"><Search size={28}/></div>
                                            <strong>{loading?"Seferler yükleniyor…":"Gösterilecek sefer bulunamadı"}</strong>
                                            <span>Aramayı, filtreleri veya tarih aralığını değiştirebilirsiniz.</span>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {pageRows.map((row) => {
                                const rowKey = row.id || row.sefer_no;
                                const isOpen = expandedId === rowKey;
                                const expandable = canExpand(row);

                                return (
                                    <React.Fragment key={rowKey}>
                                        <tr className={`main-row ${isOpen ? "is-open" : ""} ${hasWarning(row) ? "is-warned" : ""} ${selectedRowKeys.includes(rowKey)?"is-selected":""}`}>
                                            {columnsWithLayout.map((col) => (
                                                <td key={col.key} className={col.sticky ? "sticky-col" : ""} style={col.sticky ? { left: col.left } : undefined}>
                                                    {col.key === "_ops" ? (
                                                        <div className="ops-select-wrap"><button type="button" className={`row-select-btn ${selectedRowKeys.includes(rowKey)?"selected":""}`} aria-label={selectedRowKeys.includes(rowKey)?"Seçimi kaldır":"Seferi seç"} onClick={(e)=>{e.stopPropagation();toggleRowSelection(rowKey);}}>{selectedRowKeys.includes(rowKey)?<CheckSquare2 size={15}/>:<Square size={15}/>}</button><CellValue col={col} row={row} isOpen={isOpen} onDetail={(r)=>setDetailRow(r)} onIkaz={handleIkaz} onETA={(r)=>setEtaRow({...r,yukleme_ili:r.yukleme_ili||r.ham_veri?.yukleme_ili,yukleme_ilcesi:r.yukleme_ilcesi||r.yukleme_ilce||r.ham_veri?.yukleme_ilcesi||r.ham_veri?.yukleme_ilce,teslim_ili:r.teslim_ili||r.ham_veri?.teslim_ili})} onTonaj={handleTonaj} onSeferSil={handleSeferSil} etaDelayed={Boolean(delayedEtaMap[rowKey])}/></div>
                                                    ) : col.key === "_expand" ? (
                                                        expandable ? (
                                                            <CellValue
                                                                col={col}
                                                                row={row}
                                                                isOpen={isOpen}
                                                                onToggle={(e) => {
                                                                    e.stopPropagation();
                                                                    setExpandedId(isOpen ? null : rowKey);
                                                                }}
                                                            />
                                                        ) : null
                                                    ) : (
                                                            <CellValue
                                                                col={col}
                                                                row={row}
                                                                isOpen={isOpen}
                                                                onDetail={(r) => setDetailRow(r)}
                                                                onIkaz={handleIkaz}
                                                                onETA={(r) =>
                                                                    setEtaRow({
                                                                        ...r,

                                                                        yukleme_ili:
                                                                            r.yukleme_ili ||
                                                                            r.ham_veri?.yukleme_ili,

                                                                        yukleme_ilcesi:
                                                                            r.yukleme_ilcesi ||
                                                                            r.yukleme_ilce ||
                                                                            r.ham_veri?.yukleme_ilcesi ||
                                                                            r.ham_veri?.yukleme_ilce,

                                                                        teslim_ili:
                                                                            r.teslim_ili ||
                                                                            r.ham_veri?.teslim_ili,
                                                                    })
                                                                }
                                                                onTonaj={handleTonaj}
                                                                onSeferSil={handleSeferSil}
                                                                etaDelayed={Boolean(delayedEtaMap[rowKey])}
                                                        />
                                                    )}
                                                </td>
                                            ))}
                                        </tr>

                                        {isOpen && (
                                            <tr className="detail-row">
                                                <td colSpan={columnsWithLayout.length} className="det-content-td">
                                                    <DetailPanel row={row} />
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>

            <footer className="trip-pagination"><span>{visibleRows.length ? (currentPage-1)*pageSize+1 : 0}–{Math.min(currentPage*pageSize,visibleRows.length)} / {visibleRows.length} sefer</span><div><label>Satır <select aria-label="Sayfa başına satır" value={pageSize} onChange={e=>setPageSize(Number(e.target.value))}>{[25,50,100].map(n=><option key={n} value={n}>{n}</option>)}</select></label><button aria-label="Önceki sayfa" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}><ChevronLeft size={17}/></button><b>{currentPage} / {pageCount}</b><button aria-label="Sonraki sayfa" disabled={currentPage===pageCount} onClick={()=>setPage(currentPage+1)}><ChevronRight size={17}/></button></div></footer>
            </section>

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

            {completionCandidate && (
                <div className="complete-modal-overlay">
                    <div className="complete-modal" role="dialog" aria-modal="true" aria-label="Seferi tamamla">
                        <div className="complete-modal-icon">✓</div>

                        <h3>Tüm bilgiler girildi</h3>

                        <p>
                            <strong>{completionCandidate.sefer_no}</strong> numaralı seferin tüm tarih alanları dolduruldu.
                            Seferi tamamlamak ister misiniz?
                        </p>

                        <div className="complete-modal-actions">
                            <button
                                type="button"
                                className="complete-cancel"
                                disabled={completingTrip}
                                onClick={() => {
                                    setDetailRow(completionCandidate);
                                    setCompletionCandidate(null);
                                }}
                            >
                                Düzenle
                            </button>

                            <button
                                type="button"
                                className="complete-confirm"
                                disabled={completingTrip}
                                onClick={() => completeTrip(completionCandidate)}
                            >
                                {completingTrip ? "Tamamlanıyor..." : "Evet, tamamla"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className={`toast-popup ${toast.type}`}>
                    <div className="toast-icon">{toast.type === "success" ? "✓" : "!"}</div>

                    <div className="toast-content">
                        <strong>{toast.type === "success" ? "İşlem Başarılı" : "Hata"}</strong>
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}
            {deleteCandidate && (
                <div className="delete-modal-overlay">
                    <div className="delete-modal" role="dialog" aria-modal="true" aria-label="Seferi sil">

                        <div className="delete-modal-icon">
                            🗑
                        </div>

                        <h3>Seferi Pasif Hale Getir</h3>

                        <p>
                            <strong>{deleteCandidate.sefer_no}</strong>
                            {" "}numaralı sefer pasif hale getirilecek.
                            <br />
                            TMS’den tekrar gelmeyecek.
                        </p>

                        <div className="delete-modal-actions">

                            <button
                                type="button"
                                className="delete-cancel"
                                disabled={deletingTrip}
                                onClick={() => setDeleteCandidate(null)}
                            >
                                Vazgeç
                            </button>

                            <button
                                type="button"
                                className="delete-confirm"
                                disabled={deletingTrip}
                                onClick={confirmDeleteTrip}
                            >
                                {deletingTrip ? "Siliniyor..." : "Evet, Pasif Yap"}
                            </button>

                        </div>
                    </div>
                </div>
            )}

            <Detaylar
                row={detailRow}
                onClose={() => {
                    setDetailRow(null);
                }}
                onRouteSaved={(updatedRow) => {
                    const rowKey = updatedRow.id || updatedRow.sefer_no;

                    setRows((prev) =>
                        prev.map((item) =>
                            (item.id || item.sefer_no) === rowKey
                                ? { ...item, ...updatedRow }
                                : item
                        )
                    );

                    setDetailRow(updatedRow);
                }}
                onTripReadyToComplete={(updatedRow) => {
                    setDetailRow(null);
                    setCompletionCandidate(updatedRow);
                }}
            />
            <ETA
                row={etaRow}
                onClose={() => setEtaRow(null)}
            />
        </div>
    );
}

export default AktifSeferler;
