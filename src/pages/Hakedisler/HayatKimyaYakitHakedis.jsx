import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import {
    Activity,
    ArrowLeft,
    BadgeTurkishLira,
    Calculator,
    CheckCircle2,
    ChevronRight,
    ClipboardPaste,
    Database,
    Download,
    FileSpreadsheet,
    Fuel,
    Gauge,
    RotateCcw,
    Route,
    Sparkles,
    Truck,
    UploadCloud,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import { islemLogla } from "../../utils/islemLogla";
import "./HayatKimyaYakitHakedis.css";
import { applyHakedisSheetBranding } from "./shared/hakedisSheetBranding";

const SPECIAL_CUSTOMERS = ["HAYAT KİMYA", "HAYAT KIMYA", "ODAK TEDARİK", "ODAK TEDARIK"];

function normalizeText(v) {
    return String(v || "").toLocaleUpperCase("tr-TR").replace(/\s+/g, " ").trim();
}

function normalizePlate(v) {
    return String(v || "").toLocaleUpperCase("tr-TR").replace(/\s+/g, "").trim();
}

function normalizeHeader(v) {
    return String(v || "")
        .toLocaleLowerCase("tr-TR")
        .replaceAll("ı", "i")
        .replaceAll("ğ", "g")
        .replaceAll("ü", "u")
        .replaceAll("ş", "s")
        .replaceAll("ö", "o")
        .replaceAll("ç", "c")
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "");
}

function parseNumber(v) {
    if (v === null || v === undefined || v === "") return 0;
    if (typeof v === "number") return Number.isFinite(v) ? v : 0;

    let s = String(v).replace(/₺/g, "").replace(/\s/g, "").trim();

    if (s.includes(".") && s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
    else if (s.includes(",")) s = s.replace(",", ".");

    s = s.replace(/[^\d.-]/g, "");

    const n = Number(s);
    return Number.isFinite(n) ? n : 0;
}

function formatTL(v) {
    return Number(v || 0).toLocaleString("tr-TR", {
        style: "currency",
        currency: "TRY",
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
    });
}

function formatNumber(v) {
    return Number(v || 0).toLocaleString("tr-TR", {
        minimumFractionDigits: 4,
        maximumFractionDigits: 4,
    });
}

function readExcel(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                resolve(XLSX.utils.sheet_to_json(sheet, { defval: "" }));
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function mapRow(row) {
    const mapped = {};
    Object.entries(row).forEach(([key, value]) => {
        mapped[normalizeHeader(key)] = value;
    });
    return mapped;
}

function pick(row, keys) {
    for (const key of keys) {
        const normalized = normalizeHeader(key);
        if (row[normalized] !== undefined && row[normalized] !== "") return row[normalized];
    }
    return "";
}

function downloadExcel(rows, fileName, sheetName = "Rapor") {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    applyHakedisSheetBranding(XLSX, wb, ws, "Hayat Kimya Yakıt Hakediş Raporu");
    XLSX.writeFile(wb, fileName);
}

function parseClipboardRows(text) {
    const clean = String(text || "").trim();
    if (!clean) return [];

    const lines = clean.split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return [];

    const separator = lines[0].includes("\t") ? "\t" : ";";
    const headers = lines[0].split(separator).map((h) => h.trim());

    return lines.slice(1).map((line) => {
        const values = line.split(separator);
        const row = {};

        headers.forEach((header, index) => {
            row[header] = values[index] ?? "";
        });

        return row;
    });
}

export default function HayatKimyaYakitHakedis() {
    const yakitInputRef = useRef(null);
    const seferInputRef = useRef(null);

    const [yakitRows, setYakitRows] = useState([]);
    const [seferRows, setSeferRows] = useState([]);
    const [aracFiyatRows, setAracFiyatRows] = useState([]);

    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState("");
    const [activeStep, setActiveStep] = useState(1);
    const [calculated, setCalculated] = useState(false);

    const [pasteOpen, setPasteOpen] = useState(false);
    const [pasteText, setPasteText] = useState("");
    const [dragOver, setDragOver] = useState(false);

    const yakitReady = yakitRows.length > 0;
    const seferReady = seferRows.length > 0;
    const canCalculate = yakitReady && seferReady && !loading;

    async function loadAracFiyatlari() {
        const { data, error } = await supabase.from("arac_fiyat_yonetimi").select("*");
        if (error) throw error;

        setAracFiyatRows(data || []);
        return data || [];
    }

    async function processYakitRows(rawRows, sourceName = "Yapıştırılan Veri") {
        setLoading(true);
        setMessage("");
        setCalculated(false);

        try {
            const parsed = rawRows
                .map((raw) => {
                    const row = mapRow(raw);

                    return {
                        plaka: normalizePlate(pick(row, ["plaka"])),
                        cari_id: String(pick(row, ["cari_id", "cari id"]) || ""),
                        cari_adi: String(pick(row, ["cari_adi", "cari adı", "cari adi"]) || ""),
                        yakit_litresi: parseNumber(pick(row, ["yakit_litresi", "yakıt litresi", "yakit litresi"])),
                        birim_fiyat: parseNumber(pick(row, ["birim_fiyat", "birim fiyat"])),
                        iskontosuz_birim_fiyat: parseNumber(
                            pick(row, ["iskontosuz_birim_fiyat", "iskontosuz birim fiyat"])
                        ),
                    };
                })
                .filter((x) => x.plaka);

            await supabase
                .from("hayat_kimya_yakit_tmp")
                .delete()
                .neq("id", "00000000-0000-0000-0000-000000000000");

            if (parsed.length) {
                const { error } = await supabase.from("hayat_kimya_yakit_tmp").insert(parsed);
                if (error) throw error;
            }

            setYakitRows(parsed);
            setPasteOpen(false);
            setPasteText("");
            setActiveStep(2);

            islemLogla({
                islem_tipi: "HAYAT_KIMYA_YAKIT_EXCEL_YUKLEME",
                islem_aciklama: "Hayat Kimya yakıt verisi yüklendi",
                tablo_adi: "hayat_kimya_yakit_tmp",
                detay: { dosya: sourceName, kayit_sayisi: parsed.length },
            });

            setMessage(`Yakıt verileri yüklendi. ${parsed.length} kayıt bulundu.`);
        } catch (err) {
            console.error(err);
            alert("Yakıt verileri okunamadı.");
        } finally {
            setLoading(false);
        }
    }

    async function processSeferRows(rawRows, sourceName = "Yapıştırılan Veri") {
        setLoading(true);
        setMessage("");
        setCalculated(false);

        try {
            const parsed = rawRows
                .map((raw) => {
                    const row = mapRow(raw);

                    return {
                        musteri_adi: String(pick(row, ["musteri_adi", "müşteri adı", "musteri adi"]) || ""),
                        sefer_no: String(pick(row, ["sefer_no", "sefer no"]) || ""),
                        tms_despatch_id: String(pick(row, ["tms_despatch_id", "tms despatch id"]) || ""),
                        plaka: normalizePlate(pick(row, ["plaka"])),
                        toplam_km: parseNumber(pick(row, ["toplam_km", "toplam km", "km"])),
                    };
                })
                .filter((x) => x.plaka && x.toplam_km > 0);

            await supabase
                .from("hayat_kimya_sefer_tmp")
                .delete()
                .neq("id", "00000000-0000-0000-0000-000000000000");

            if (parsed.length) {
                const { error } = await supabase.from("hayat_kimya_sefer_tmp").insert(parsed);
                if (error) throw error;
            }

            setSeferRows(parsed);
            await loadAracFiyatlari();

            setPasteOpen(false);
            setPasteText("");
            setActiveStep(3);

            islemLogla({
                islem_tipi: "HAYAT_KIMYA_SEFER_EXCEL_YUKLEME",
                islem_aciklama: "Hayat Kimya sefer verisi yüklendi",
                tablo_adi: "hayat_kimya_sefer_tmp",
                detay: { dosya: sourceName, kayit_sayisi: parsed.length },
            });

            setMessage(`Sefer verileri yüklendi. ${parsed.length} kayıt bulundu.`);
        } catch (err) {
            console.error(err);
            alert("Sefer verileri okunamadı.");
        } finally {
            setLoading(false);
        }
    }

    async function processYakitFile(file) {
        const rawRows = await readExcel(file);
        await processYakitRows(rawRows, file.name);
    }

    async function processSeferFile(file) {
        const rawRows = await readExcel(file);
        await processSeferRows(rawRows, file.name);
    }

    async function handleYakitUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        await processYakitFile(file);
        e.target.value = "";
    }

    async function handleSeferUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        await processSeferFile(file);
        e.target.value = "";
    }

    async function handleDroppedFile(file) {
        if (!file) return;

        if (activeStep === 1) await processYakitFile(file);
        if (activeStep === 2) await processSeferFile(file);
    }

    async function handlePasteSubmit() {
        const rows = parseClipboardRows(pasteText);

        if (!rows.length) {
            alert("Yapıştırılan veri okunamadı. İlk satırda başlıklar olmalı.");
            return;
        }

        if (activeStep === 1) await processYakitRows(rows);
        if (activeStep === 2) await processSeferRows(rows);
    }

    const fiyatMap = useMemo(() => {
        return new Map(aracFiyatRows.map((x) => [normalizePlate(x.plaka), x]));
    }, [aracFiyatRows]);

    const yakitByPlate = useMemo(() => {
        const map = new Map();

        yakitRows.forEach((row) => {
            const key = normalizePlate(row.plaka);

            if (!map.has(key)) {
                map.set(key, {
                    plaka: key,
                    cari_id: row.cari_id,
                    cari_adi: row.cari_adi,
                    toplam_yakit_litresi: 0,
                    birim_fiyat: row.birim_fiyat || 0,
                    iskontosuz_birim_fiyat: row.iskontosuz_birim_fiyat || 0,
                });
            }

            const item = map.get(key);
            item.toplam_yakit_litresi += Number(row.yakit_litresi || 0);

            if (row.birim_fiyat) item.birim_fiyat = row.birim_fiyat;
            if (row.iskontosuz_birim_fiyat) item.iskontosuz_birim_fiyat = row.iskontosuz_birim_fiyat;
        });

        return map;
    }, [yakitRows]);

    const summaryRows = useMemo(() => {
        if (!calculated) return [];

        const map = new Map();

        seferRows.forEach((row) => {
            const plaka = normalizePlate(row.plaka);
            const musteri = normalizeText(row.musteri_adi);
            const isSpecial = SPECIAL_CUSTOMERS.some((x) => musteri.includes(x));

            if (!map.has(plaka)) {
                map.set(plaka, {
                    plaka,
                    km_36: 0,
                    km_37: 0,
                    toplam_km: 0,
                    tahmini_tuketim: 0,
                    gercek_yakit: 0,
                    fark_litre: 0,
                    birim_fiyat: 0,
                    duzeltme_maliyeti: 0,
                    tl_km: 0,
                    durum: "",
                    cari_id: "",
                    cari_adi: "",
                });
            }

            const item = map.get(plaka);
            const km = Number(row.toplam_km || 0);

            if (isSpecial) item.km_36 += km;
            else item.km_37 += km;

            item.toplam_km += km;
        });

        map.forEach((item, plaka) => {
            const fuel = yakitByPlate.get(plaka);
            const fiyat = fiyatMap.get(plaka);

            item.tahmini_tuketim = item.km_36 * 0.36 + item.km_37 * 0.37;
            item.gercek_yakit = fuel?.toplam_yakit_litresi || 0;
            item.fark_litre = item.tahmini_tuketim - item.gercek_yakit;
            item.birim_fiyat = fuel?.birim_fiyat || fuel?.iskontosuz_birim_fiyat || 0;
            item.duzeltme_maliyeti = item.fark_litre * item.birim_fiyat;
            item.tl_km = item.toplam_km > 0 ? item.duzeltme_maliyeti / item.toplam_km : 0;
            item.durum = item.fark_litre >= 0 ? "PRİM" : "CEZA";
            item.cari_id = fuel?.cari_id || fiyat?.cari_id || "";
            item.cari_adi = fuel?.cari_adi || fiyat?.cari_adi || "";
        });

        return Array.from(map.values()).sort((a, b) => a.plaka.localeCompare(b.plaka, "tr"));
    }, [calculated, seferRows, yakitByPlate, fiyatMap]);

    const distributionRows = useMemo(() => {
        if (!calculated) return [];

        const summaryMap = new Map(summaryRows.map((x) => [x.plaka, x]));

        return seferRows.map((row) => {
            const plaka = normalizePlate(row.plaka);
            const summary = summaryMap.get(plaka);
            const km = Number(row.toplam_km || 0);
            const seferHakedisi = km * Number(summary?.tl_km || 0);

            return {
                sefer_no: row.sefer_no,
                tms_despatch_id: row.tms_despatch_id,
                musteri_adi: row.musteri_adi,
                plaka,
                km,
                sefer_hakedisi_tl: seferHakedisi,
                cari_unvan_id: summary?.cari_id || "",
                cari_adi: summary?.cari_adi || "",
            };
        });
    }, [calculated, seferRows, summaryRows]);

    const totals = useMemo(() => {
        return summaryRows.reduce(
            (acc, row) => {
                acc.km += row.toplam_km;
                acc.tahmini += row.tahmini_tuketim;
                acc.gercek += row.gercek_yakit;
                acc.fark += row.fark_litre;
                acc.tl += row.duzeltme_maliyeti;
                return acc;
            },
            { km: 0, tahmini: 0, gercek: 0, fark: 0, tl: 0 }
        );
    }, [summaryRows]);

    function handleCalculate() {
        if (!canCalculate) return;
        setCalculated(true);
        setActiveStep(4);
        setMessage("");
    }

    function goBackStep() {
        setMessage("");
        setPasteOpen(false);
        setPasteText("");
        setDragOver(false);

        if (activeStep === 2) {
            setSeferRows([]);
            setAracFiyatRows([]);
            setCalculated(false);
            setActiveStep(1);
        }

        if (activeStep === 3) {
            setCalculated(false);
            setActiveStep(2);
        }

        if (activeStep === 4) {
            setCalculated(false);
            setActiveStep(3);
        }
    }

    function resetAll() {
        setYakitRows([]);
        setSeferRows([]);
        setAracFiyatRows([]);
        setCalculated(false);
        setActiveStep(1);
        setMessage("");
        setPasteOpen(false);
        setPasteText("");
    }

    function exportSeferRaporu() {
        const rows = distributionRows.map((x) => ({
            sefer_no: x.sefer_no,
            plaka: x.plaka,
            km: Number(x.km.toFixed(4)),
            sefer_hakedisi_tl: Number(x.sefer_hakedisi_tl.toFixed(4)),
            cari_unvan_id: x.cari_unvan_id,
        }));

        downloadExcel(rows, "hayat_kimya_sefer_hakedisleri.xlsx", "Sefer Hakedişleri");
    }

    function exportOzetRaporu() {
        const rows = summaryRows.map((x) => ({
            plaka: x.plaka,
            KM_36: Number(x.km_36.toFixed(4)),
            KM_37: Number(x.km_37.toFixed(4)),
            toplam_km: Number(x.toplam_km.toFixed(4)),
            tahmini_tuketim: Number(x.tahmini_tuketim.toFixed(4)),
            gercek_yakit: Number(x.gercek_yakit.toFixed(4)),
            fark_litre: Number(x.fark_litre.toFixed(4)),
            hakediş_tutari: Number(x.duzeltme_maliyeti.toFixed(4)),
            durum: x.durum,
        }));

        downloadExcel(rows, "hayat_kimya_ozet_data.xlsx", "Özet Data");
    }

    const detectedPasteRows = parseClipboardRows(pasteText).length;

    const stepItems = [
        { id: 1, label: "Yakıt Verisi", hint: "Yakıt Excelini yükle", icon: Fuel },
        { id: 2, label: "Sefer Verisi", hint: "Sefer Excelini yükle", icon: Truck },
        { id: 3, label: "Hesaplama", hint: "Verileri doğrula", icon: Calculator },
        { id: 4, label: "Sonuçlar", hint: "Raporları incele", icon: Activity },
    ];

    const currentTitle = activeStep === 1
        ? "Yakıt verilerini sisteme aktar"
        : activeStep === 2
            ? "Sefer verilerini sisteme aktar"
            : activeStep === 3
                ? "Hesaplamayı başlat"
                : "Hakediş sonuçları";

    return (
        <div className="hky-page premium-page-enter">
            <input ref={yakitInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleYakitUpload} />
            <input ref={seferInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleSeferUpload} />

            <section className="hky-hero">
                <div className="hky-hero-copy">
                    <div className="hky-eyebrow">
                        <span className="hky-live-dot" />
                        HAKEDİŞLER · HAYAT KİMYA YHH
                    </div>
                    <h1>Yakıt Hakediş Control Center</h1>
                    <p>
                        Yakıt ve sefer verilerini aynı akışta yükleyin, plaka bazlı tüketimi hesaplayın
                        ve hakediş dağılımlarını Excel olarak dışarı alın.
                    </p>
                    <div className="hky-hero-tags">
                        <span><Fuel size={14} /> Yakıt verisi {yakitReady ? "hazır" : "bekliyor"}</span>
                        <span><Route size={14} /> Sefer verisi {seferReady ? "hazır" : "bekliyor"}</span>
                        <span><Database size={14} /> {yakitRows.length + seferRows.length} kayıt</span>
                    </div>
                </div>

                <div className="hky-hero-status">
                    <div className="hky-status-icon"><Sparkles size={21} /></div>
                    <div>
                        <span>Aktif aşama</span>
                        <strong>{currentTitle}</strong>
                    </div>
                    <div className="hky-step-bubble">{activeStep}/4</div>
                </div>
            </section>

            <section className="hky-stepper" aria-label="Hakediş hesaplama adımları">
                {stepItems.map((step, index) => {
                    const Icon = step.icon;
                    const completed = activeStep > step.id || (step.id === 4 && calculated);
                    const active = activeStep === step.id;
                    return (
                        <div key={step.id} className={`hky-step ${active ? "is-active" : ""} ${completed ? "is-complete" : ""}`}>
                            <div className="hky-step-icon">
                                {completed ? <CheckCircle2 size={18} /> : <Icon size={18} />}
                            </div>
                            <div className="hky-step-copy">
                                <span>ADIM {step.id}</span>
                                <strong>{step.label}</strong>
                                <small>{step.hint}</small>
                            </div>
                            {index < stepItems.length - 1 && <ChevronRight className="hky-step-arrow" size={17} />}
                        </div>
                    );
                })}
            </section>

            {message && (
                <div className="hky-message">
                    <CheckCircle2 size={18} />
                    <span>{message}</span>
                </div>
            )}

            {activeStep < 4 && (
                <section className="hky-workspace">
                    <div className="hky-workspace-main">
                        <div className="hky-section-head">
                            <div>
                                <span className="hky-section-kicker">{activeStep === 1 ? "YAKIT KAYNAĞI" : activeStep === 2 ? "SEFER KAYNAĞI" : "HESAPLAMA"}</span>
                                <h2>{currentTitle}</h2>
                                <p>
                                    {activeStep === 1 && "Yakıt Excelini seçin, sürükleyip bırakın veya Excel’den kopyaladığınız satırları doğrudan yapıştırın."}
                                    {activeStep === 2 && "Sefer Excelini yükleyin. Araç fiyat eşleşmeleri bu adımın ardından hazırlanacaktır."}
                                    {activeStep === 3 && "İki veri kaynağı da hazır. Mevcut iş kurallarıyla hakediş hesaplamasını başlatabilirsiniz."}
                                </p>
                            </div>

                            {activeStep > 1 && (
                                <button className="hky-btn hky-btn-secondary" onClick={goBackStep} disabled={loading}>
                                    <ArrowLeft size={17} />
                                    Geri Gel
                                </button>
                            )}
                        </div>

                        {(activeStep === 1 || activeStep === 2) && (
                            <>
                                <div
                                    className={`hky-drop-zone ${dragOver ? "is-dragging" : ""}`}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragOver(true);
                                    }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={async (e) => {
                                        e.preventDefault();
                                        setDragOver(false);
                                        await handleDroppedFile(e.dataTransfer.files?.[0]);
                                    }}
                                >
                                    <div className="hky-drop-glow" />
                                    <div className="hky-drop-icon">
                                        {activeStep === 1 ? <Fuel size={27} /> : <Truck size={27} />}
                                    </div>
                                    <span className="hky-drop-label">EXCEL VERİ AKTARIMI</span>
                                    <h3>{activeStep === 1 ? "Yakıt Excelini buraya bırak" : "Sefer Excelini buraya bırak"}</h3>
                                    <p>.xlsx veya .xls dosyanızı sürükleyebilir ya da aşağıdaki aksiyonlardan birini kullanabilirsiniz.</p>

                                    <div className="hky-upload-actions">
                                        <button
                                            className="hky-btn hky-btn-primary"
                                            onClick={() => (activeStep === 1 ? yakitInputRef.current?.click() : seferInputRef.current?.click())}
                                            disabled={loading}
                                        >
                                            <UploadCloud size={18} />
                                            Dosya Seç
                                        </button>

                                        <button
                                            className={`hky-btn hky-btn-secondary ${pasteOpen ? "is-active" : ""}`}
                                            onClick={() => setPasteOpen((v) => !v)}
                                            disabled={loading}
                                        >
                                            <ClipboardPaste size={18} />
                                            Ekrana Yapıştır
                                        </button>
                                    </div>
                                </div>

                                {pasteOpen && (
                                    <div className="hky-paste-panel">
                                        <div className="hky-paste-head">
                                            <div>
                                                <span>HIZLI VERİ GİRİŞİ</span>
                                                <strong>Excel’den kopyala & yapıştır</strong>
                                            </div>
                                            <div className="hky-detected-count">{detectedPasteRows} satır algılandı</div>
                                        </div>
                                        <textarea
                                            value={pasteText}
                                            onChange={(e) => setPasteText(e.target.value)}
                                            placeholder={activeStep === 1
                                                ? `Excel'den başlıklarla beraber kopyalayıp buraya yapıştırın.\n\nÖrnek:\nplaka\tyakit_litresi\tbirim_fiyat\tcari_id\tcari_adi\n34ABC123\t120,5\t42,10\t12345\tFirma Adı`
                                                : `Excel'den başlıklarla beraber kopyalayıp buraya yapıştırın.\n\nÖrnek:\nmusteri_adi\tsefer_no\ttms_despatch_id\tplaka\ttoplam_km\nHAYAT KİMYA\tSF001\t123\t34ABC123\t450`
                                            }
                                        />
                                        <div className="hky-paste-footer">
                                            <small>İlk satır kolon başlıkları olmalıdır.</small>
                                            <button className="hky-btn hky-btn-primary" onClick={handlePasteSubmit} disabled={loading || !pasteText.trim()}>
                                                <CheckCircle2 size={17} />
                                                Veriyi Kullan
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        {activeStep === 3 && (
                            <div className="hky-calculate-zone">
                                <div className="hky-calc-visual">
                                    <div className="hky-calc-ring"><Calculator size={34} /></div>
                                    <span>HAZIR</span>
                                </div>
                                <div className="hky-calc-copy">
                                    <h3>Veriler hesaplama için hazır</h3>
                                    <p>Yakıt ve sefer kayıtları mevcut hesaplama kurallarınız kullanılarak eşleştirilecek.</p>
                                    <div className="hky-ready-row">
                                        <span className={yakitReady ? "is-ready" : ""}><CheckCircle2 size={15} /> {yakitRows.length} yakıt kaydı</span>
                                        <span className={seferReady ? "is-ready" : ""}><CheckCircle2 size={15} /> {seferRows.length} sefer kaydı</span>
                                        <span className={aracFiyatRows.length ? "is-ready" : ""}><CheckCircle2 size={15} /> {aracFiyatRows.length} araç fiyat kaydı</span>
                                    </div>
                                    <button className="hky-btn hky-btn-primary hky-calculate-btn" onClick={handleCalculate} disabled={!canCalculate}>
                                        <Calculator size={19} />
                                        Hakedişi Hesapla
                                        <ChevronRight size={18} />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <aside className="hky-side-panel">
                        <div className="hky-side-head">
                            <div>
                                <span>VERİ DURUMU</span>
                                <h3>Aktarım özeti</h3>
                            </div>
                            <Database size={20} />
                        </div>

                        <div className={`hky-source-card ${yakitReady ? "is-ready" : ""}`}>
                            <div className="hky-source-icon"><Fuel size={18} /></div>
                            <div>
                                <span>Yakıt verisi</span>
                                <strong>{yakitReady ? `${yakitRows.length} kayıt` : "Henüz yüklenmedi"}</strong>
                            </div>
                            {yakitReady && <CheckCircle2 size={18} />}
                        </div>

                        <div className={`hky-source-card ${seferReady ? "is-ready" : ""}`}>
                            <div className="hky-source-icon"><Truck size={18} /></div>
                            <div>
                                <span>Sefer verisi</span>
                                <strong>{seferReady ? `${seferRows.length} kayıt` : "Henüz yüklenmedi"}</strong>
                            </div>
                            {seferReady && <CheckCircle2 size={18} />}
                        </div>

                        {(activeStep === 2 || activeStep === 3) && yakitRows.length > 0 && (
                            <div className="hky-mini-list">
                                <div className="hky-mini-list-head">
                                    <span>Yakıt önizleme</span>
                                    <small>İlk 6 kayıt</small>
                                </div>
                                {yakitRows.slice(0, 6).map((row, index) => (
                                    <div className="hky-mini-row" key={`${row.plaka}-${index}`}>
                                        <strong>{row.plaka}</strong>
                                        <span>{formatNumber(row.yakit_litresi)} L</span>
                                    </div>
                                ))}
                            </div>
                        )}

                        {activeStep === 3 && seferRows.length > 0 && (
                            <div className="hky-mini-list">
                                <div className="hky-mini-list-head">
                                    <span>Sefer önizleme</span>
                                    <small>İlk 6 kayıt</small>
                                </div>
                                {seferRows.slice(0, 6).map((row, index) => (
                                    <div className="hky-mini-row" key={`${row.sefer_no}-${index}`}>
                                        <strong>{row.plaka}</strong>
                                        <span>{formatNumber(row.toplam_km)} KM</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </aside>
                </section>
            )}

            {calculated && (
                <>
                    <section className="hky-results-toolbar">
                        <div className="hky-results-title">
                            <div className="hky-result-mark"><CheckCircle2 size={21} /></div>
                            <div>
                                <span>HESAPLAMA TAMAMLANDI</span>
                                <h2>Yakıt hakediş sonuçları</h2>
                            </div>
                        </div>

                        <div className="hky-result-actions">
                            <button className="hky-btn hky-btn-secondary" onClick={goBackStep} disabled={loading}>
                                <ArrowLeft size={17} /> Geri Gel
                            </button>
                            <button className="hky-btn hky-btn-secondary" onClick={resetAll} disabled={loading}>
                                <RotateCcw size={17} /> Yeni Hesaplama
                            </button>
                            <button className="hky-btn hky-btn-secondary" onClick={exportSeferRaporu} disabled={!distributionRows.length}>
                                <FileSpreadsheet size={17} /> Sefer Raporu
                            </button>
                            <button className="hky-btn hky-btn-primary" onClick={exportOzetRaporu} disabled={!summaryRows.length}>
                                <Download size={17} /> Özet Data İndir
                            </button>
                        </div>
                    </section>

                    <section className="hky-kpi-grid">
                        <article className="hky-kpi-card">
                            <div className="hky-kpi-icon"><Route size={20} /></div>
                            <div className="hky-kpi-copy">
                                <span>Toplam KM</span>
                                <strong>{formatNumber(totals.km)}</strong>
                                <small>Seferlerden gelen toplam kilometre</small>
                            </div>
                        </article>
                        <article className="hky-kpi-card">
                            <div className="hky-kpi-icon"><Gauge size={20} /></div>
                            <div className="hky-kpi-copy">
                                <span>Tahmini Tüketim</span>
                                <strong>{formatNumber(totals.tahmini)} L</strong>
                                <small>%36 / %37 müşteri oranına göre</small>
                            </div>
                        </article>
                        <article className="hky-kpi-card">
                            <div className="hky-kpi-icon"><Fuel size={20} /></div>
                            <div className="hky-kpi-copy">
                                <span>Gerçek Yakıt</span>
                                <strong>{formatNumber(totals.gercek)} L</strong>
                                <small>Yakıt verisinden gelen toplam litre</small>
                            </div>
                        </article>
                        <article className={`hky-kpi-card hky-kpi-money ${totals.tl >= 0 ? "is-positive" : "is-negative"}`}>
                            <div className="hky-kpi-icon"><BadgeTurkishLira size={20} /></div>
                            <div className="hky-kpi-copy">
                                <span>Prim / Ceza</span>
                                <strong>{formatTL(totals.tl)}</strong>
                                <small>Fark litre × birim fiyat</small>
                            </div>
                        </article>
                    </section>

                    <section className="hky-result-panel">
                        <div className="hky-panel-head">
                            <div>
                                <span className="hky-section-kicker">PLAKA ANALİZİ</span>
                                <h2>Plaka Bazlı Özet</h2>
                                <p>KM dağılımı, tahmini/gerçek yakıt ve prim-ceza analizi.</p>
                            </div>
                            <div className="hky-count-pill">{summaryRows.length} plaka</div>
                        </div>

                        <div className="hky-table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Plaka</th>
                                        <th>KM 36</th>
                                        <th>KM 37</th>
                                        <th>Toplam KM</th>
                                        <th>Tahmini L</th>
                                        <th>Gerçek L</th>
                                        <th>Fark L</th>
                                        <th>TL/KM</th>
                                        <th>Hakediş / Ceza</th>
                                        <th>Durum</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {summaryRows.map((row) => (
                                        <tr key={row.plaka}>
                                            <td><strong className="hky-plate-chip">{row.plaka}</strong></td>
                                            <td>{formatNumber(row.km_36)}</td>
                                            <td>{formatNumber(row.km_37)}</td>
                                            <td><strong>{formatNumber(row.toplam_km)}</strong></td>
                                            <td>{formatNumber(row.tahmini_tuketim)}</td>
                                            <td>{formatNumber(row.gercek_yakit)}</td>
                                            <td className={row.fark_litre >= 0 ? "hky-positive" : "hky-negative"}>{formatNumber(row.fark_litre)}</td>
                                            <td>{formatTL(row.tl_km)}</td>
                                            <td className={row.duzeltme_maliyeti >= 0 ? "hky-positive" : "hky-negative"}><strong>{formatTL(row.duzeltme_maliyeti)}</strong></td>
                                            <td><span className={`hky-status-pill ${row.durum === "PRİM" ? "is-positive" : "is-negative"}`}>{row.durum}</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    <section className="hky-result-panel">
                        <div className="hky-panel-head">
                            <div>
                                <span className="hky-section-kicker">SEFER DAĞILIMI</span>
                                <h2>Sefer Bazlı Hakediş</h2>
                                <p>Plaka bazındaki prim/ceza tutarının sefere KM oranında dağıtımı.</p>
                            </div>
                            <div className="hky-count-pill">{distributionRows.length} sefer</div>
                        </div>

                        <div className="hky-table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Sefer No</th>
                                        <th>Plaka</th>
                                        <th>Müşteri</th>
                                        <th>KM</th>
                                        <th>Sefer Hakedişi</th>
                                        <th>Cari ID</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {distributionRows.slice(0, 300).map((row, index) => (
                                        <tr key={`${row.sefer_no}-${index}`}>
                                            <td><strong>{row.sefer_no || "—"}</strong></td>
                                            <td><strong className="hky-plate-chip">{row.plaka}</strong></td>
                                            <td>{row.musteri_adi || "—"}</td>
                                            <td>{formatNumber(row.km)}</td>
                                            <td className={row.sefer_hakedisi_tl >= 0 ? "hky-positive" : "hky-negative"}><strong>{formatTL(row.sefer_hakedisi_tl)}</strong></td>
                                            <td>{row.cari_unvan_id || "—"}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}
        </div>
    );
}
