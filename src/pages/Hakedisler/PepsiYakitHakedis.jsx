import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../supabaseClient";
import { islemLogla } from "../../utils/islemLogla";
import "./PepsiYakitHakedis.css";

const PEPSI_CUSTOMERS = ["PEPSI", "PEPSİ"];

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

function downloadExcel(rows, fileName, sheetName = "Rapor") {
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, fileName);
}

function getRateByMusteri(musteriAdi) {
    const musteri = normalizeText(musteriAdi);
    const isPepsi = PEPSI_CUSTOMERS.some((x) => musteri.includes(x));
    return isPepsi ? 0.38 : 0.37;
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

export default function PepsiYakitHakedis() {
    const yakitInputRef = useRef(null);
    const seferInputRef = useRef(null);

    const [yakitRows, setYakitRows] = useState([]);
    const [seferRows, setSeferRows] = useState([]);

    const [loading, setLoading] = useState(false);
    const [activeStep, setActiveStep] = useState(1);
    const [calculated, setCalculated] = useState(false);

    const [snackbar, setSnackbar] = useState("");
    const [pasteOpen, setPasteOpen] = useState(false);
    const [pasteText, setPasteText] = useState("");
    const [dragOver, setDragOver] = useState(false);

    const [previewTitle, setPreviewTitle] = useState("");
    const [previewRows, setPreviewRows] = useState([]);

    const yakitReady = yakitRows.length > 0;
    const seferReady = seferRows.length > 0;
    const canCalculate = yakitReady && seferReady && !loading;

    function showSnackbar(text) {
        setSnackbar(text);
        window.setTimeout(() => setSnackbar(""), 3200);
    }

    function createYakitTemplate() {
        downloadExcel(
            [
                {
                    plaka: "34ABC123",
                    cari_id: "10001",
                    cari_adi: "PEPSI ÖRNEK CARİ",
                    birim_fiyat: 42.1,
                    iskontosuz_birim_fiyat: 45.5,
                    yakit_litresi: 120.5,
                },
            ],
            "pepsi_yakit_sablon.xlsx",
            "Yakıt Şablonu"
        );
    }

    function createSeferTemplate() {
        downloadExcel(
            [
                {
                    musteri_adi: "PEPSI",
                    sefer_no: "SF001",
                    tms_despatch_id: "123456789012345678",
                    plaka: "34ABC123",
                    toplam_km: 450,
                },
            ],
            "pepsi_sefer_sablon.xlsx",
            "Sefer Şablonu"
        );
    }

    async function processYakitRows(rawRows, sourceName = "Yapıştırılan Veri") {
        setLoading(true);
        setCalculated(false);

        try {
            const parsed = rawRows
                .map((raw) => {
                    const row = mapRow(raw);

                    return {
                        plaka: normalizePlate(pick(row, ["plaka"])),
                        cari_id: String(pick(row, ["cari_id", "cari id"]) || ""),
                        cari_adi: String(pick(row, ["cari_adi", "cari adı", "cari adi"]) || ""),
                        birim_fiyat: parseNumber(pick(row, ["birim_fiyat", "birim fiyat"])),
                        iskontosuz_birim_fiyat: parseNumber(
                            pick(row, ["iskontosuz_birim_fiyat", "iskontosuz birim fiyat"])
                        ),
                        yakit_litresi: parseNumber(pick(row, ["yakit_litresi", "yakıt litresi", "yakit litresi"])),
                    };
                })
                .filter((x) => x.plaka && x.yakit_litresi > 0);

            await supabase
                .from("frigo_yakit_tmp")
                .delete()
                .neq("id", "00000000-0000-0000-0000-000000000000");

            if (parsed.length) {
                const { error } = await supabase.from("frigo_yakit_tmp").insert(parsed);
                if (error) throw error;
            }

            setYakitRows(parsed);
            setPasteOpen(false);
            setPasteText("");
            setActiveStep(2);

            islemLogla({
                islem_tipi: "PEPSI_YAKIT_EXCEL_YUKLEME",
                islem_aciklama: "Pepsi yakıt verisi yüklendi",
                tablo_adi: "frigo_yakit_tmp",
                detay: { dosya: sourceName, kayit_sayisi: parsed.length },
            });

            showSnackbar(`Yakıt verileri yüklendi. ${parsed.length} kayıt bulundu.`);
        } catch (err) {
            console.error(err);
            alert("Yakıt verileri okunamadı.");
        } finally {
            setLoading(false);
        }
    }

    async function processSeferRows(rawRows, sourceName = "Yapıştırılan Veri") {
        setLoading(true);
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
                .from("frigo_sefer_tmp")
                .delete()
                .neq("id", "00000000-0000-0000-0000-000000000000");

            if (parsed.length) {
                const { error } = await supabase.from("frigo_sefer_tmp").insert(parsed);
                if (error) throw error;
            }

            setSeferRows(parsed);
            setPasteOpen(false);
            setPasteText("");
            setActiveStep(3);

            islemLogla({
                islem_tipi: "PEPSI_SEFER_EXCEL_YUKLEME",
                islem_aciklama: "Pepsi sefer verisi yüklendi",
                tablo_adi: "frigo_sefer_tmp",
                detay: { dosya: sourceName, kayit_sayisi: parsed.length },
            });

            showSnackbar(`Sefer verileri yüklendi. ${parsed.length} kayıt bulundu.`);
        } catch (err) {
            console.error(err);
            alert("Sefer verileri okunamadı.");
        } finally {
            setLoading(false);
        }
    }

    async function processFile(file) {
        if (!file) return;

        const rawRows = await readExcel(file);

        if (activeStep === 1) await processYakitRows(rawRows, file.name);
        if (activeStep === 2) await processSeferRows(rawRows, file.name);
    }

    async function handleYakitUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        await processYakitRows(await readExcel(file), file.name);
        e.target.value = "";
    }

    async function handleSeferUpload(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        await processSeferRows(await readExcel(file), file.name);
        e.target.value = "";
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

    function goBackStep() {
        setPasteOpen(false);
        setPasteText("");
        setDragOver(false);
        setCalculated(false);

        if (activeStep === 2) {
            setSeferRows([]);
            setActiveStep(1);
        }

        if (activeStep === 3) {
            setActiveStep(2);
        }

        if (activeStep === 4) {
            setActiveStep(3);
        }
    }

    function resetAll() {
        setYakitRows([]);
        setSeferRows([]);
        setCalculated(false);
        setActiveStep(1);
        setPasteOpen(false);
        setPasteText("");
        setDragOver(false);
        setPreviewRows([]);
        setPreviewTitle("");
    }

    const yakitByPlate = useMemo(() => {
        const map = new Map();

        yakitRows.forEach((row) => {
            const plaka = normalizePlate(row.plaka);

            if (!map.has(plaka)) {
                map.set(plaka, {
                    plaka,
                    cari_id: row.cari_id,
                    cari_adi: row.cari_adi,
                    toplam_yakit_litresi: 0,
                    birim_fiyat_sum: 0,
                    iskontosuz_birim_fiyat_sum: 0,
                    fiyat_count: 0,
                });
            }

            const item = map.get(plaka);
            item.toplam_yakit_litresi += Number(row.yakit_litresi || 0);

            if (row.birim_fiyat || row.iskontosuz_birim_fiyat) {
                item.birim_fiyat_sum += Number(row.birim_fiyat || 0);
                item.iskontosuz_birim_fiyat_sum += Number(row.iskontosuz_birim_fiyat || 0);
                item.fiyat_count += 1;
            }
        });

        map.forEach((item) => {
            item.birim_fiyat = item.fiyat_count > 0 ? item.birim_fiyat_sum / item.fiyat_count : 0;
            item.iskontosuz_birim_fiyat =
                item.fiyat_count > 0 ? item.iskontosuz_birim_fiyat_sum / item.fiyat_count : 0;
        });

        return map;
    }, [yakitRows]);

    const summaryRows = useMemo(() => {
        if (!calculated) return [];

        const map = new Map();

        seferRows.forEach((row) => {
            const plaka = normalizePlate(row.plaka);
            const rate = getRateByMusteri(row.musteri_adi);
            const km = Number(row.toplam_km || 0);

            if (!map.has(plaka)) {
                map.set(plaka, {
                    plaka,
                    km_38: 0,
                    km_37: 0,
                    toplam_km: 0,
                    toplam_tuketim: 0,
                    gercek_yakit: 0,
                    litre_farki: 0,
                    birim_fiyat: 0,
                    iskontosuz_birim_fiyat: 0,
                    duzeltme_maliyeti: 0,
                    tl_km: 0,
                    durum: "",
                    cari_id: "",
                    cari_adi: "",
                });
            }

            const item = map.get(plaka);

            if (rate === 0.38) item.km_38 += km;
            else item.km_37 += km;

            item.toplam_km += km;
            item.toplam_tuketim += km * rate;
        });

        map.forEach((item, plaka) => {
            const fuel = yakitByPlate.get(plaka);

            item.gercek_yakit = fuel?.toplam_yakit_litresi || 0;
            item.birim_fiyat = fuel?.birim_fiyat || 0;
            item.iskontosuz_birim_fiyat = fuel?.iskontosuz_birim_fiyat || 0;
            item.litre_farki = item.toplam_tuketim - item.gercek_yakit;

            item.duzeltme_maliyeti =
                item.litre_farki >= 0
                    ? item.litre_farki * item.birim_fiyat
                    : -Math.abs(item.litre_farki) * item.iskontosuz_birim_fiyat;

            item.tl_km = item.toplam_km > 0 ? item.duzeltme_maliyeti / item.toplam_km : 0;
            item.durum = item.duzeltme_maliyeti >= 0 ? "HAKEDİŞ" : "CEZA";
            item.cari_id = fuel?.cari_id || "";
            item.cari_adi = fuel?.cari_adi || "";
        });

        return Array.from(map.values()).sort((a, b) => a.plaka.localeCompare(b.plaka, "tr"));
    }, [calculated, seferRows, yakitByPlate]);

    const distributionRows = useMemo(() => {
        if (!calculated) return [];

        const summaryMap = new Map(summaryRows.map((x) => [x.plaka, x]));

        return seferRows.map((row) => {
            const plaka = normalizePlate(row.plaka);
            const summary = summaryMap.get(plaka);
            const km = Number(row.toplam_km || 0);

            return {
                sefer_no: row.sefer_no,
                tms_despatch_id: row.tms_despatch_id,
                musteri_adi: row.musteri_adi,
                plaka,
                km,
                oran: getRateByMusteri(row.musteri_adi),
                sefer_hakedisi_tl: km * Number(summary?.tl_km || 0),
                cari_unvan_id: summary?.cari_id || "",
                cari_adi: summary?.cari_adi || "",
            };
        });
    }, [calculated, seferRows, summaryRows]);

    const totals = useMemo(() => {
        return summaryRows.reduce(
            (acc, row) => {
                acc.plaka += 1;
                acc.km += row.toplam_km;
                acc.litre += row.litre_farki;
                acc.tutar += row.duzeltme_maliyeti;
                acc.tahmini += row.toplam_tuketim;
                acc.gercek += row.gercek_yakit;
                return acc;
            },
            { plaka: 0, km: 0, litre: 0, tutar: 0, tahmini: 0, gercek: 0 }
        );
    }, [summaryRows]);

    function handleCalculate() {
        if (!canCalculate) return;
        setCalculated(true);
        setActiveStep(4);
        showSnackbar("Pepsi yakıt hakediş hesaplaması tamamlandı.");
    }

    function exportSeferRaporu() {
        const rows = distributionRows.map((x) => ({
            sefer_no: x.sefer_no,
            tms_despatch_id: x.tms_despatch_id,
            plaka: x.plaka,
            musteri_adi: x.musteri_adi,
            km: Number(x.km.toFixed(4)),
            oran: x.oran,
            sefer_hakedisi_tl: Number(x.sefer_hakedisi_tl.toFixed(4)),
            cari_unvan_id: x.cari_unvan_id,
        }));

        downloadExcel(rows, "pepsi_sefer_hakedisleri_raporu.xlsx", "Sefer Hakedişleri");
    }

    function exportOzetRaporu() {
        const rows = summaryRows.map((x) => ({
            plaka: x.plaka,
            KM_38: Number(x.km_38.toFixed(4)),
            KM_37: Number(x.km_37.toFixed(4)),
            toplam_km: Number(x.toplam_km.toFixed(4)),
            TOPLAM_TUKETIM: Number(x.toplam_tuketim.toFixed(4)),
            gercek_yakit: Number(x.gercek_yakit.toFixed(4)),
            litre_farki: Number(x.litre_farki.toFixed(4)),
            birim_fiyat: Number(x.birim_fiyat.toFixed(4)),
            iskontosuz_birim_fiyat: Number(x.iskontosuz_birim_fiyat.toFixed(4)),
            DUZELTME_MALIYETI: Number(x.duzeltme_maliyeti.toFixed(4)),
            durum: x.durum,
        }));

        downloadExcel(rows, "pepsi_ozet_data.xlsx", "Özet Data");
    }

    const detectedPasteRows = parseClipboardRows(pasteText).length;

    return (
        <div className="pepsi-page">
            <input ref={yakitInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleYakitUpload} />
            <input ref={seferInputRef} type="file" accept=".xlsx,.xls" hidden onChange={handleSeferUpload} />

            <div className="pepsi-brand">
                <div className="pepsi-brand-badge">
                    <span className="brand-dot"></span>
                    <div>
                        <strong>PEPSI</strong>
                        <small>Yakıt Hakediş Yönetimi</small>
                    </div>
                </div>
            </div>

            {snackbar && <div className="pepsi-snackbar">{snackbar}</div>}

            {activeStep < 4 && (
                <div className="pepsi-wizard">
                    {activeStep === 1 && (
                        <section className="upload-screen single-screen">
                            <div className="upload-main">
                                <div className="template-actions">
                                    <button className="ghost-btn" onClick={createYakitTemplate}>
                                        Yakıt Şablonu İndir
                                    </button>
                                    <button className="ghost-btn" onClick={createSeferTemplate}>
                                        Sefer Şablonu İndir
                                    </button>
                                </div>

                                <h2>Yakıt verilerini yükle</h2>
                                <p>
                                    Önce örnek şablonu indirebilir, ardından yakıt Excelini sürükle bırak, dosya seç veya
                                    Excel’den kopyaladığın veriyi yapıştır.
                                </p>

                                <div
                                    className={`drop-zone ${dragOver ? "drag-over" : ""}`}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragOver(true);
                                    }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={async (e) => {
                                        e.preventDefault();
                                        setDragOver(false);
                                        await processFile(e.dataTransfer.files?.[0]);
                                    }}
                                >
                                    <div className="drop-icon">⛽</div>
                                    <h3>Yakıt Excelini buraya bırak</h3>
                                    <p>Gerekli kolonlar: plaka, cari_id, cari_adi, birim_fiyat, iskontosuz_birim_fiyat, yakit_litresi</p>

                                    <div className="upload-actions">
                                        <button className="big-action primary" onClick={() => yakitInputRef.current?.click()} disabled={loading}>
                                            Dosya Seç
                                        </button>

                                        <button className="ghost-btn" onClick={() => setPasteOpen((v) => !v)} disabled={loading}>
                                            Ekrana Yapıştır
                                        </button>
                                    </div>
                                </div>

                                {pasteOpen && (
                                    <div className="paste-panel">
                                        <textarea
                                            value={pasteText}
                                            onChange={(e) => setPasteText(e.target.value)}
                                            placeholder={`plaka	cari_id	cari_adi	birim_fiyat	iskontosuz_birim_fiyat	yakit_litresi
34ABC123	10001	PEPSI ÖRNEK	42,10	45,50	120,5`}
                                        />

                                        <div className="paste-actions">
                                            <span>{detectedPasteRows} satır algılandı</span>
                                            <button className="primary" onClick={handlePasteSubmit} disabled={loading || !pasteText.trim()}>
                                                Veriyi Kullan
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </section>
                    )}

                    {activeStep === 2 && (
                        <section className="upload-screen">
                            <div className="upload-main">
                                <div className="screen-actions-top">
                                    <button className="back-btn" onClick={goBackStep} disabled={loading}>
                                        ← Geri Gel
                                    </button>
                                </div>

                                <h2>Sefer verilerini yükle</h2>
                                <p>Pepsi sefer Excelini yükle. Pepsi müşterisi için tüketim oranı %38, diğer müşteriler için %37 uygulanır.</p>

                                <div
                                    className={`drop-zone ${dragOver ? "drag-over" : ""}`}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        setDragOver(true);
                                    }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={async (e) => {
                                        e.preventDefault();
                                        setDragOver(false);
                                        await processFile(e.dataTransfer.files?.[0]);
                                    }}
                                >
                                    <div className="drop-icon">🚚</div>
                                    <h3>Sefer Excelini buraya bırak</h3>
                                    <p>Gerekli kolonlar: musteri_adi, sefer_no, tms_despatch_id, plaka, toplam_km</p>

                                    <div className="upload-actions">
                                        <button className="big-action primary" onClick={() => seferInputRef.current?.click()} disabled={loading}>
                                            Dosya Seç
                                        </button>

                                        <button className="ghost-btn" onClick={() => setPasteOpen((v) => !v)} disabled={loading}>
                                            Ekrana Yapıştır
                                        </button>
                                    </div>
                                </div>

                                {pasteOpen && (
                                    <div className="paste-panel">
                                        <textarea
                                            value={pasteText}
                                            onChange={(e) => setPasteText(e.target.value)}
                                            placeholder={`musteri_adi	sefer_no	tms_despatch_id	plaka	toplam_km
PEPSI	SF001	123456789012345678	34ABC123	450`}
                                        />

                                        <div className="paste-actions">
                                            <span>{detectedPasteRows} satır algılandı</span>
                                            <button className="primary" onClick={handlePasteSubmit} disabled={loading || !pasteText.trim()}>
                                                Veriyi Kullan
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="mini-preview done-preview">
                                <h3>Yakıt verileri hazır</h3>
                                <p>{yakitRows.length} kayıt</p>

                                <button
                                    className="ghost-btn preview-btn"
                                    onClick={() => {
                                        setPreviewTitle("Yakıt Önizleme");
                                        setPreviewRows(yakitRows.slice(0, 30));
                                    }}
                                >
                                    Önizle
                                </button>

                                <div className="mini-table">
                                    {yakitRows.slice(0, 6).map((row, index) => (
                                        <div key={`${row.plaka}-${index}`}>
                                            <b>{row.plaka}</b>
                                            <span>{formatNumber(row.yakit_litresi)} L</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}

                    {activeStep === 3 && (
                        <section className="upload-screen">
                            <div className="upload-main calculate-main">
                                <div className="screen-actions-top">
                                    <button className="back-btn" onClick={goBackStep} disabled={loading}>
                                        ← Geri Gel
                                    </button>
                                </div>

                                <h2>Hesaplamayı başlat</h2>
                                <p>Yakıt ve sefer verileri hazır. Plaka bazlı tahmini tüketim, gerçek yakıt, fark litre ve düzeltme maliyeti hesaplanacak.</p>

                                <button className="big-action primary calculate-button" onClick={handleCalculate} disabled={!canCalculate}>
                                    Hesapla
                                </button>
                            </div>

                            <div className="mini-preview done-preview">
                                <h3>Yüklenen veriler</h3>
                                <p>Yakıt: {yakitRows.length} kayıt</p>
                                <p>Sefer: {seferRows.length} kayıt</p>

                                <button
                                    className="ghost-btn preview-btn"
                                    onClick={() => {
                                        setPreviewTitle("Sefer Önizleme");
                                        setPreviewRows(seferRows.slice(0, 30));
                                    }}
                                >
                                    Önizle
                                </button>

                                <div className="mini-table">
                                    {seferRows.slice(0, 6).map((row, index) => (
                                        <div key={`${row.sefer_no}-${index}`}>
                                            <b>{row.plaka}</b>
                                            <span>{formatNumber(row.toplam_km)} KM</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            )}

            {calculated && (
                <>
                    <div className="result-topbar">
                        <div className="result-left-actions">
                            <button className="back-btn" onClick={goBackStep} disabled={loading}>
                                ← Geri Gel
                            </button>
                            <button className="ghost-btn" onClick={resetAll} disabled={loading}>
                                Yeni Hesaplama
                            </button>
                        </div>

                        <div className="report-actions">
                            <button className="primary" onClick={exportSeferRaporu} disabled={!distributionRows.length}>
                                Sefer Hakedişleri Raporu
                            </button>
                            <button className="primary" onClick={exportOzetRaporu} disabled={!summaryRows.length}>
                                Özet Data
                            </button>
                        </div>
                    </div>

                    <div className="kpi-cards">
                        <div className="kpi-card">
                            <span>Plaka Sayısı</span>
                            <strong>{totals.plaka}</strong>
                            <small>Hesaplanan araç</small>
                        </div>
                        <div className="kpi-card">
                            <span>Toplam KM</span>
                            <strong>{formatNumber(totals.km)}</strong>
                            <small>Sefer toplamı</small>
                        </div>
                        <div className="kpi-card">
                            <span>Hakediş Litresi</span>
                            <strong>{formatNumber(totals.litre)} L</strong>
                            <small>Tahmini - gerçek yakıt</small>
                        </div>
                        <div className={`kpi-card ${totals.tutar >= 0 ? "positive" : "negative"}`}>
                            <span>Hakediş Tutarı</span>
                            <strong>{formatTL(totals.tutar)}</strong>
                            <small>Düzeltme maliyeti</small>
                        </div>
                    </div>

                    <div className="result-grid">
                        <section className="result-panel">
                            <div className="panel-head">
                                <div>
                                    <h2>Plaka Bazlı Fark</h2>
                                    <p>Tahmini litre, gerçek litre ve litre farkı.</p>
                                </div>
                                <span>{summaryRows.length} plaka</span>
                            </div>

                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Plaka</th>
                                            <th>KM %38</th>
                                            <th>KM %37</th>
                                            <th>Toplam KM</th>
                                            <th>TOPLAM_TUKETIM</th>
                                            <th>Gerçek Litre</th>
                                            <th>Litre Farkı</th>
                                            <th>Düzeltme Maliyeti</th>
                                            <th>Durum</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {summaryRows.map((row) => (
                                            <tr key={row.plaka}>
                                                <td><strong className="plate-chip">{row.plaka}</strong></td>
                                                <td>{formatNumber(row.km_38)}</td>
                                                <td>{formatNumber(row.km_37)}</td>
                                                <td>{formatNumber(row.toplam_km)}</td>
                                                <td>{formatNumber(row.toplam_tuketim)}</td>
                                                <td>{formatNumber(row.gercek_yakit)}</td>
                                                <td className={row.litre_farki >= 0 ? "good" : "bad"}>
                                                    {formatNumber(row.litre_farki)}
                                                </td>
                                                <td className={row.duzeltme_maliyeti >= 0 ? "good" : "bad"}>
                                                    {formatTL(row.duzeltme_maliyeti)}
                                                </td>
                                                <td>
                                                    <span className={row.durum === "HAKEDİŞ" ? "badge good-bg" : "badge bad-bg"}>
                                                        {row.durum}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        <section className="result-panel">
                            <div className="panel-head">
                                <div>
                                    <h2>Hakediş / Ceza Listesi</h2>
                                    <p>Sefer bazlı dağıtılmış hakediş veya ceza tutarı.</p>
                                </div>
                                <span>{distributionRows.length} sefer</span>
                            </div>

                            <div className="table-wrap">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Sefer No</th>
                                            <th>TMS Despatch ID</th>
                                            <th>Müşteri</th>
                                            <th>Plaka</th>
                                            <th>KM</th>
                                            <th>Oran</th>
                                            <th>Sefer Hakedişi</th>
                                            <th>Cari ID</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {distributionRows.slice(0, 400).map((row, index) => (
                                            <tr key={`${row.sefer_no}-${index}`}>
                                                <td>{row.sefer_no || "—"}</td>
                                                <td>{row.tms_despatch_id || "—"}</td>
                                                <td>{row.musteri_adi || "—"}</td>
                                                <td><strong className="plate-chip">{row.plaka}</strong></td>
                                                <td>{formatNumber(row.km)}</td>
                                                <td>%{Math.round(row.oran * 100)}</td>
                                                <td className={row.sefer_hakedisi_tl >= 0 ? "good" : "bad"}>
                                                    {formatTL(row.sefer_hakedisi_tl)}
                                                </td>
                                                <td>{row.cari_unvan_id || "—"}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </section>
                    </div>
                </>
            )}

            {previewRows.length > 0 && (
                <div className="preview-overlay" onClick={() => setPreviewRows([])}>
                    <div className="preview-dialog" onClick={(e) => e.stopPropagation()}>
                        <div className="preview-head">
                            <h3>{previewTitle}</h3>
                            <button className="ghost-btn" onClick={() => setPreviewRows([])}>
                                Kapat
                            </button>
                        </div>

                        <div className="preview-table">
                            <table>
                                <thead>
                                    <tr>
                                        {Object.keys(previewRows[0] || {}).map((key) => (
                                            <th key={key}>{key}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {previewRows.map((row, index) => (
                                        <tr key={index}>
                                            {Object.keys(previewRows[0] || {}).map((key) => (
                                                <td key={key}>{String(row[key] ?? "")}</td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}