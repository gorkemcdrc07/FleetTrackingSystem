import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { syncFromTMS, mapTMSRows } from "./tmsService";
import { supabase } from "../../supabaseClient";
import "./AktifSeferler.css";
import Detaylar from "./detaylar";
import SutunDuzeni from "./Gorunum/SutunDuzeni";
import ETA from "./ETA/ETA";
import * as XLSX from "xlsx";
import { islemLogla } from "../../utils/islemLogla";

function split(val) {
    return String(val || "")
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean);
}

function normalizeKey(...values) {
    return values
        .filter(Boolean)
        .join("|")
        .toLocaleLowerCase("tr-TR")
        .replace(/\s+/g, " ")
        .trim();
}

function uniqueStops(stops) {
    const seen = new Set();

    return stops.filter((stop) => {
        const key = normalizeKey(stop.firma, stop.nokta, stop.il, stop.ilce);
        if (!key) return false;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

function createRotaDetaylari(row) {
    const yuklemeNoktasi = split(row.yukleme_noktasi);
    const yuklemeIl = split(row.yukleme_ili);
    const yuklemeIlce = split(row.yukleme_ilcesi);

    const teslimFirma = split(row.teslim_alan_firma);
    const teslimNoktasi = split(row.teslim_noktasi);
    const teslimIl = split(row.teslim_ili);
    const teslimIlce = split(row.teslim_ilcesi);

    const yukCount = Math.max(yuklemeNoktasi.length, yuklemeIl.length, yuklemeIlce.length);
    const tesCount = Math.max(teslimFirma.length, teslimNoktasi.length, teslimIl.length, teslimIlce.length);

    const yuklemeStops = uniqueStops(
        Array.from({ length: yukCount }).map((_, i) => ({
            tip: "yukleme",
            sira: i + 1,
            firma: null,
            nokta: yuklemeNoktasi[i] || null,
            il: yuklemeIl[i] || null,
            ilce: yuklemeIlce[i] || null,
            planlanan_varis: null,
            gerceklesen_varis: null,
            planlanan_cikis: null,
            gerceklesen_cikis: null,
        }))
    );

    const teslimStops = Array.from({ length: tesCount })
        .map((_, i) => ({
            tip: "teslim",
            sira: yuklemeStops.length + i + 1,
            firma: teslimFirma[i] || null,
            nokta: teslimNoktasi[i] || null,
            il: teslimIl[i] || null,
            ilce: teslimIlce[i] || null,
            planlanan_varis: null,
            gerceklesen_varis: null,
            planlanan_cikis: null,
            gerceklesen_cikis: null,
        }))
        .filter((x) => x.firma || x.nokta || x.il || x.ilce);

    return [...yuklemeStops, ...teslimStops];
}

function IconChevron({ open }) {
    return (
        <svg viewBox="0 0 16 16" fill="none" width="13" height="13" style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.18s ease", flexShrink: 0 }}>
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function IconPin() {
    return (
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none">
            <path d="M12 21s-8-7.5-8-12a8 8 0 0 1 16 0c0 4.5-8 12-8 12z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="12" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
        </svg>
    );
}

function IconDetail() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="3" width="18" height="18" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M8 8h8M8 12h8M8 16h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function IconETA() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v5l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function IconIkaz() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
            <path d="M12 9v4M12 17h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
    );
}

function IconTonaj() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
                d="M3 17h18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
            <path
                d="M7 17V9l5-4 5 4v8"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
            />
        </svg>
    );
}

function IconTrash() {
    return (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none">
            <path
                d="M3 6h18"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />

            <path
                d="M8 6V4h8v2"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            <path
                d="M19 6l-1 14H6L5 6"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinejoin="round"
            />

            <path
                d="M10 11v5M14 11v5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
            />
        </svg>
    );
}

function IconColumns() {
    return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
            <rect x="3" y="4" width="18" height="16" rx="3" stroke="currentColor" strokeWidth="2" />
            <path d="M9 4v16M15 4v16" stroke="currentColor" strokeWidth="2" />
        </svg>
    );
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

const IKAZ_ACIKLAMA =
    "Operasyon verimsizlik konusunda ikaz edildi ama yine de araç bulamadıkları için filo ataması yapıldı.";

const TONAJ_ACIKLAMA = "Tonajlı";

const DEFAULT_COLUMNS = [
    { key: "_ops", label: "İşlemler", width: 160, sticky: true, locked: true },
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

function parseGunValue(value) {
    if (!value) return null;

    const text = String(value)
        .replace(",", ".")
        .replace(/[^\d.]/g, "");

    const num = Number(text);
    return Number.isFinite(num) ? num : null;
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
    const ikazli = row.aciklama === IKAZ_ACIKLAMA;
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
                <IconIkaz /> İkaz
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
            <button className={`expand-btn ${isOpen ? "open" : ""}`} onClick={onToggle} aria-label={isOpen ? "Kapat" : "Detay"} style={{ border: "none", cursor: "pointer" }}>
                <IconChevron open={isOpen} />
            </button>
        );
    }

    const val = row[col.key];

    if (col.type === "sefer") return <span className="sefer-badge">{val || "—"}</span>;
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
    const [rows, setRows] = useState([]);
    const [expandedId, setExpandedId] = useState(null);
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
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
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
    const [deletingTrip, setDeletingTrip] = useState(false);

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

    const baseRows = useMemo(
        () => rows.filter((r) => r.sefer_no?.startsWith("SFR")),
        [rows]
    );

    const visibleRows = useMemo(() => {
        const activeFilters = Object.entries(columnFilters).filter(([, filter]) => !isColumnFilterEmpty(filter));
        if (!activeFilters.length) return baseRows;

        const columnMap = new Map(DEFAULT_COLUMNS.map((col) => [col.key, col]));

        return baseRows.filter((row) =>
            activeFilters.every(([key, filter]) => {
                const col = columnMap.get(key);
                if (!col) return true;
                return rowMatchesColumnFilter(row, col, filter);
            })
        );
    }, [baseRows, columnFilters]);

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
                const actualDays = getActualEtaDays(row);

                if (!actualDays) continue;

                const cikis = normalizeTR(getLastValue(row.yukleme_ili));
                const varis = normalizeTR(getLastValue(row.teslim_ili));

                if (!cikis || !varis) continue;

                const { data, error } = await supabase
                    .from("eta_referanslari")
                    .select("*")
                    .ilike("cikis", `${cikis}%`)
                    .ilike("varis", `${varis}%`)
                    .maybeSingle();

                if (error || !data) continue;

                const etaDays = parseGunValue(data["gün"]);

                if (!etaDays) continue;

                const rowKey = row.id || row.sefer_no;

                if (actualDays > etaDays) {
                    nextMap[rowKey] = {
                        actualDays,
                        etaDays,
                        km: data.km,
                        gun: data["gün"],
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
        const rowKey = row.id || row.sefer_no;

        setRows((prev) =>
            prev.map((item) =>
                (item.id || item.sefer_no) === rowKey
                    ? { ...item, aciklama: IKAZ_ACIKLAMA }
                    : item
            )
        );

        try {
            const { error } = await supabase
                .from("aktif_seferler")
                .update({ aciklama: IKAZ_ACIKLAMA })
                .eq("sefer_no", row.sefer_no);

            if (error) throw error;

            setToast({
                type: "success",
                message: "İkaz verildi ve açıklama kaydedildi.",
            });

            setTimeout(() => setToast(null), 2600);
        } catch (err) {
            console.error("İkaz açıklaması kaydedilemedi:", err);

            setToast({
                type: "error",
                message: "İkaz kaydedilirken hata oluştu.",
            });

            setTimeout(() => setToast(null), 2600);
        }
    }, []);
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

            const { error: insertError } = await supabase
                .from("tamamlanan_seferler")
                .upsert(payload, { onConflict: "sefer_no" });

            if (insertError) throw insertError;

            const { error: deleteError } = await supabase
                .from("aktif_seferler")
                .delete()
                .eq("sefer_no", row.sefer_no);

            if (deleteError) throw deleteError;

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

    const supabasedenListele = useCallback(async () => {
        setLoading(true);

        try {
            const { data, error } = await supabase
                .from("aktif_seferler")
                .select("*")
                .eq("pasif", false)
                .gte("sefer_tarihi", startDate)
                .lte("sefer_tarihi", endDate)
                .order("sefer_tarihi", { ascending: false });

            if (error) throw error;

            setRows(data || []);
        } catch (err) {
            console.error("Supabase listeleme hatası:", err);
            alert("Kayıtlı veriler alınırken hata oluştu.");
        } finally {
            setLoading(false);
        }
    }, [startDate, endDate]);

    const tmsdenCekVeKaydet = useCallback(async () => {
        setSyncing(true);

        try {
            const incoming = await syncFromTMS({
                start: `${startDate}T00:00:00`,
                end: `${endDate}T23:59:59`,
            });

            const { data: completedRows, error: completedError } = await supabase
                .from("tamamlanan_seferler")
                .select("sefer_no");

            if (completedError) throw completedError;

            const completedSet = new Set((completedRows || []).map((x) => x.sefer_no));

            const { data: passiveRows, error: passiveError } = await supabase
                .from("aktif_seferler")
                .select("sefer_no")
                .eq("pasif", true);

            if (passiveError) throw passiveError;

            const passiveSet = new Set(
                (passiveRows || []).map((x) => x.sefer_no)
            );

            const mappedRows = mapTMSRows(incoming)
                .filter((r) => r.sefer_no?.startsWith("SFR"))
                .filter((r) => !completedSet.has(r.sefer_no))
                .filter((r) => !passiveSet.has(r.sefer_no))
                .map((r) => ({
                    sefer_no: r.sefer_no,
                    sefer_tarihi: r.sefer_tarihi,
                    arac_statu: r.arac_statu,
                    plaka: r.plaka,
                    treyler: r.treyler,
                    surucu_ad_soyad: r.surucu_ad_soyad,
                    surucu_tckn: r.surucu_tckn,
                    surucu_telefon: r.surucu_telefon,
                    musteri_adi: r.musteri_adi,
                    musteri_siparis_no: r.musteri_siparis_no,
                    hizmet_adi: r.hizmet_adi,
                    proje_adi: r.proje_adi,
                    yukleme_noktasi: r.yukleme_noktasi,
                    yukleme_ili: r.yukleme_ili,
                    yukleme_ilcesi: r.yukleme_ilcesi,
                    teslim_alan_firma: r.teslim_alan_firma,
                    teslim_noktasi: r.teslim_noktasi,
                    teslim_ili: r.teslim_ili,
                    teslim_ilcesi: r.teslim_ilcesi,
                    irsaliye_no: r.irsaliye_no,
                    aciklama: null,
                    atama_yapan_kullanici: r.atama_yapan_kullanici,
                    atama_tarihi: r.atama_tarihi,
                    rota_detaylari: createRotaDetaylari(r),
                    ham_veri: r,
                }));

            const { error: saveError } = await supabase
                .from("aktif_seferler")
                .upsert(mappedRows, {
                    onConflict: "sefer_no",
                    ignoreDuplicates: true,
                });

            if (saveError) throw saveError;

            await supabasedenListele();
        } catch (err) {
            console.error("TMS çekme / kayıt hatası:", err);
            alert("TMS verileri alınırken veya Supabase'e kaydedilirken hata oluştu.");
        } finally {
            setSyncing(false);
        }
    }, [startDate, endDate, supabasedenListele]);

    useEffect(() => {
        supabasedenListele();
    }, [supabasedenListele]);

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
        <div className="aktif-page">
            <div className="aktif-header">
                <div>
                    <span className="aktif-eyebrow">Lojistik Yönetimi</span>
                    <h1>Aktif Seferler</h1>
                </div>

                <div className="aktif-header-actions">
                    <div className="aktif-count-badge">{visibleRows.length}/{baseRows.length} sefer</div>

                    {canExport && (
                        <button
                            className="eta-export-btn"
                            type="button"
                            onClick={exportEtaUyumsuzExcel}
                            disabled={!etaUyumsuzRows.length}
                            title="ETA uyumsuz satırları Excel'e aktar"
                        >
                            ETA Uyumsuz Excel
                            <span>{etaUyumsuzRows.length}</span>
                        </button>
                    )}
                    <button
                        className="columns-icon-btn"
                        type="button"
                        onClick={() => setShowSutunDuzeni(true)}
                        title="Sütun Düzeni"
                        aria-label="Sütun Düzeni"
                    >
                        <IconColumns />
                    </button>
                </div>
            </div>

            <div className="filter-card">
                <div className="filter-info">
                    <div className="filter-icon" aria-hidden="true">
                        ↻
                    </div>

                    <div className="filter-title-block">
                        <span className="filter-kicker">Tarih Aralığı</span>
                        <strong>Seferleri TMS’den güncelle</strong>
                    </div>
                </div>

                <div className="filter-controls">
                    <div className="filter-date-group">
                        <div className="date-field">
                            <label>Başlangıç</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>

                        <div className="date-separator">→</div>

                        <div className="date-field">
                            <label>Bitiş</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="filter-divider" />

                    {canUpdate && (
                        <button
                            className="tms-refresh-btn"
                            onClick={tmsdenCekVeKaydet}
                            disabled={loading || syncing}
                        >
                            {syncing ? (
                                <>
                                    <span className="btn-spinner" />
                                    Yenileniyor
                                </>
                            ) : (
                                <>
                                    <span className="refresh-icon">↻</span>
                                    TMS’den Yenile
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>

            <div className="table-toolbar">
                <div className="table-toolbar-left">
                    <span className="toolbar-count">
                        {visibleRows.length}/{baseRows.length} sefer
                    </span>

                    <span className="toolbar-hint">
                        Aktif sefer listesi
                    </span>
                </div>

                <div className="table-toolbar-actions">
                    <button
                        type="button"
                        className={`toolbar-filter-btn ${Object.keys(columnFilters).length ? "has-filter" : ""}`}
                        onClick={() => setShowColumnFilters(true)}
                    >
                        Sütun Filtreleri

                        {Object.keys(columnFilters).length > 0 && (
                            <span>{Object.keys(columnFilters).length}</span>
                        )}
                    </button>
                </div>
            </div>

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
                                onClick={() => setShowColumnFilters(false)}
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

            <div className="aktif-card">
                <div className="table-wrapper">
                    <table className="aktif-table">
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
                            {visibleRows.length === 0 && (
                                <tr>
                                    <td colSpan={columnsWithLayout.length} className="empty-cell">
                                        <div className="empty-state">
                                            <div className="empty-icon" aria-hidden="true">▱</div>
                                            <strong>Seçili tarih aralığında kayıtlı sefer bulunmuyor.</strong>
                                            <span>Farklı bir tarih aralığı seçerek listeyi güncelleyebilirsiniz.</span>
                                        </div>
                                    </td>
                                </tr>
                            )}

                            {visibleRows.map((row) => {
                                const rowKey = row.id || row.sefer_no;
                                const isOpen = expandedId === rowKey;
                                const expandable = canExpand(row);

                                return (
                                    <React.Fragment key={rowKey}>
                                        <tr className={`main-row ${isOpen ? "is-open" : ""}`}>
                                            {columnsWithLayout.map((col) => (
                                                <td key={col.key} className={col.sticky ? "sticky-col" : ""} style={col.sticky ? { left: col.left } : undefined}>
                                                    {col.key === "_expand" ? (
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
                                                                onETA={(r) => setEtaRow(r)}
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
                    <div className="complete-modal">
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
                    <div className="delete-modal">

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