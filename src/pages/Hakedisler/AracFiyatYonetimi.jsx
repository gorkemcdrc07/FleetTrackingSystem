import { useEffect, useMemo, useRef, useState } from "react";
import {
    Activity, ArchiveRestore, ArrowLeft, BadgeTurkishLira, CalendarDays, CarFront, CheckCircle2,
    ChevronRight, CircleDollarSign, Download, Edit3, FileDown, FileSpreadsheet, Home,
    Plus, RefreshCw, RotateCcw, Search, Sparkles, Upload, UserRound, UsersRound, X
} from "lucide-react";
import * as XLSX from "xlsx";
import { supabase } from "../../supabaseClient";
import { islemLogla } from "../../utils/islemLogla";
import "./AracFiyatYonetimi.css";
import { applyHakedisSheetBranding } from "./shared/hakedisSheetBranding";

const emptyForm = {
    plaka: "",
    cari_id: "",
    cari_adi: "",
    arac_sahip: "",
    calisma_tipi: "",
    aylik_kira: "",
    aylik_surucu: "",
    yakma_orani: "",
    calisma_gunu: "",
    pasif: false,
    aciklama: "",
};

const templateRows = [
    {
        plaka: "34ABC123",
        cari_id: "C001",
        cari_adi: "ÖRNEK CARİ",
        arac_sahip: "Özmal",
        calisma_tipi: "Serbest Filo",
        aylik_kira: 125000,
        aylik_surucu: 25000,
        yakma_orani: 0,
        calisma_gunu: 30,
        pasif: false,
        aciklama: "Örnek kayıt",
    },
];

function formatTL(value) {
    if (value === null || value === undefined || value === "") return "—";

    return Number(value).toLocaleString("tr-TR", {
        style: "currency",
        currency: "TRY",
        maximumFractionDigits: 0,
    });
}

function toNumber(value) {
    if (value === "" || value === null || value === undefined) return null;

    const n = Number(
        String(value)
            .replace("₺", "")
            .replace("%", "")
            .replace(/\s/g, "")
            .replace(/\./g, "")
            .replace(",", ".")
    );

    return Number.isFinite(n) ? n : null;
}

function normalizePlate(value) {
    return String(value || "")
        .toLocaleUpperCase("tr-TR")
        .replace(/\s+/g, "")
        .trim();
}

function toBool(value) {
    const v = String(value ?? "").toLocaleLowerCase("tr-TR").trim();
    return ["true", "1", "evet", "e", "pasif"].includes(v);
}

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: "array" });
                const sheet = workbook.Sheets[workbook.SheetNames[0]];
                const json = XLSX.utils.sheet_to_json(sheet, { defval: "" });
                resolve(json);
            } catch (err) {
                reject(err);
            }
        };

        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}

function downloadXlsx(rows, fileName, sheetName = "Veriler") {
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    applyHakedisSheetBranding(XLSX, workbook, worksheet, "Araç Cari & Fiyat Raporu");
    XLSX.writeFile(workbook, fileName);
}

function mapExcelRow(row) {
    return {
        plaka: normalizePlate(row.plaka),
        cari_id: row.cari_id ? String(row.cari_id) : null,
        cari_adi: row.cari_adi || null,
        arac_sahip: row.arac_sahip || null,
        calisma_tipi: row.calisma_tipi || null,
        aylik_kira: toNumber(row.aylik_kira),
        aylik_surucu: toNumber(row.aylik_surucu),
        yakma_orani: toNumber(row.yakma_orani),
        calisma_gunu: toNumber(row.calisma_gunu),
        pasif: toBool(row.pasif),
        aciklama: row.aciklama || null,
        updated_at: new Date().toISOString(),
    };
}

export default function AracFiyatYonetimi({ onNavigate }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [modalOpen, setModalOpen] = useState(false);
    const [editingRow, setEditingRow] = useState(null);
    const [form, setForm] = useState(emptyForm);

    const topluGuncelleRef = useRef(null);
    const topluAktarimRef = useRef(null);
    const gunGuncelleRef = useRef(null);

    useEffect(() => {
        loadData();
    }, []);

    async function loadData() {
        setLoading(true);

        const { data, error } = await supabase
            .from("arac_fiyat_yonetimi")
            .select("*")
            .order("plaka", { ascending: true });

        if (error) {
            console.error(error);
            setRows([]);
        } else {
            setRows(data || []);
        }

        setLoading(false);
    }

    function openNew() {
        setEditingRow(null);
        setForm(emptyForm);
        setModalOpen(true);
    }

    function openEdit(row) {
        setEditingRow(row);

        setForm({
            plaka: row.plaka || "",
            cari_id: row.cari_id || "",
            cari_adi: row.cari_adi || "",
            arac_sahip: row.arac_sahip || "",
            calisma_tipi: row.calisma_tipi || "",
            aylik_kira: row.aylik_kira ?? "",
            aylik_surucu: row.aylik_surucu ?? "",
            yakma_orani: row.yakma_orani ?? "",
            calisma_gunu: row.calisma_gunu ?? "",
            pasif: Boolean(row.pasif),
            aciklama: row.aciklama || "",
        });

        setModalOpen(true);
    }

    function exportExcel() {
        const exportRows = filteredRows.map((row) => ({
            id: row.id,
            plaka: row.plaka,
            cari_id: row.cari_id,
            cari_adi: row.cari_adi,
            arac_sahip: row.arac_sahip,
            calisma_tipi: row.calisma_tipi,
            aylik_kira: row.aylik_kira,
            aylik_surucu: row.aylik_surucu,
            yakma_orani: row.yakma_orani,
            toplam_tutar: row.toplam_tutar,
            calisma_gunu: row.calisma_gunu,
            pasif: row.pasif,
            aciklama: row.aciklama,
        }));

        downloadXlsx(exportRows, "arac_fiyat_yonetimi.xlsx");
    }

    function downloadTemplate() {
        downloadXlsx(templateRows, "arac_fiyat_yonetimi_sablon.xlsx", "Şablon");
    }

    function downloadDayTemplate() {
        downloadXlsx(
            [
                {
                    plaka: "34ABC123",
                    calisma_gunu: 30,
                },
            ],
            "arac_fiyat_yonetimi_gun_guncelle_sablon.xlsx",
            "Gün Güncelle"
        );
    }

    async function handleBulkImportFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const excelRows = await readExcelFile(file);

            const payload = excelRows
                .map(mapExcelRow)
                .filter((x) => x.plaka);

            if (payload.length === 0) {
                alert("Aktarılacak kayıt bulunamadı. Plaka alanı zorunludur.");
                return;
            }

            const { error } = await supabase
                .from("arac_fiyat_yonetimi")
                .insert(payload);

            if (error) throw error;

            alert(`${payload.length} yeni kayıt eklendi.`);
            await loadData();
        } catch (err) {
            console.error(err);
            alert("Toplu aktarım yapılamadı.");
        } finally {
            e.target.value = "";
        }
    }

    async function handleBulkUpdateFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const excelRows = await readExcelFile(file);
            let count = 0;

            for (const row of excelRows) {
                const payload = mapExcelRow(row);

                if (!payload.plaka && !row.id) continue;

                let query = supabase
                    .from("arac_fiyat_yonetimi")
                    .update(payload);

                if (row.id) {
                    query = query.eq("id", row.id);
                } else {
                    query = query.eq("plaka", payload.plaka);
                }

                const { error } = await query;

                if (error) throw error;
                count++;
            }

            alert(`${count} kayıt güncellendi.`);
            await loadData();
        } catch (err) {
            console.error(err);
            alert("Toplu güncelleme yapılamadı.");
        } finally {
            e.target.value = "";
        }
    }

    async function handleDayUpdateFile(e) {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            const excelRows = await readExcelFile(file);
            let count = 0;

            for (const row of excelRows) {
                const plaka = normalizePlate(row.plaka);
                const calismaGunu = toNumber(row.calisma_gunu);

                if (!plaka || calismaGunu === null) continue;

                const { error } = await supabase
                    .from("arac_fiyat_yonetimi")
                    .update({
                        calisma_gunu: calismaGunu,
                        updated_at: new Date().toISOString(),
                    })
                    .eq("plaka", plaka);

                if (error) throw error;
                count++;
            }

            alert(`${count} aracın çalışma günü güncellendi.`);
            await loadData();
        } catch (err) {
            console.error(err);
            alert("Gün güncelleme yapılamadı.");
        } finally {
            e.target.value = "";
        }
    }

    async function saveRecord(e) {
        e.preventDefault();

        const payload = {
            plaka: normalizePlate(form.plaka),
            cari_id: form.cari_id || null,
            cari_adi: form.cari_adi || null,
            arac_sahip: form.arac_sahip || null,
            calisma_tipi: form.calisma_tipi || null,
            aylik_kira: toNumber(form.aylik_kira),
            aylik_surucu: toNumber(form.aylik_surucu),
            yakma_orani: toNumber(form.yakma_orani),
            calisma_gunu: toNumber(form.calisma_gunu),
            pasif: Boolean(form.pasif),
            aciklama: form.aciklama || null,
            updated_at: new Date().toISOString(),
        };

        try {
            let result;

            if (editingRow) {
                result = await supabase
                    .from("arac_fiyat_yonetimi")
                    .update(payload)
                    .eq("id", editingRow.id)
                    .select()
                    .single();
            } else {
                result = await supabase
                    .from("arac_fiyat_yonetimi")
                    .insert(payload)
                    .select()
                    .single();
            }

            const { data, error } = result;

            if (error) throw error;

            if (editingRow) {
                setRows((prev) =>
                    prev.map((x) => (x.id === data.id ? data : x))
                );
            } else {
                setRows((prev) =>
                    [...prev, data].sort((a, b) =>
                        String(a.plaka).localeCompare(String(b.plaka), "tr")
                    )
                );
            }

            await islemLogla({
                islem_tipi: editingRow
                    ? "ARAC_FIYAT_GUNCELLEME"
                    : "ARAC_FIYAT_EKLEME",
                islem_aciklama: editingRow
                    ? "Araç fiyat kaydı güncellendi"
                    : "Araç fiyat kaydı eklendi",
                tablo_adi: "arac_fiyat_yonetimi",
                kayit_id: data.id,
                plaka: data.plaka,
                eski_deger: editingRow || null,
                yeni_deger: data,
            });

            setModalOpen(false);
            setEditingRow(null);
            setForm(emptyForm);
        } catch (err) {
            console.error(err);
            alert("Kayıt kaydedilemedi.");
        }
    }

    async function togglePassive(row) {
        const { data, error } = await supabase
            .from("arac_fiyat_yonetimi")
            .update({
                pasif: !row.pasif,
                updated_at: new Date().toISOString(),
            })
            .eq("id", row.id)
            .select()
            .single();

        if (error) {
            alert("Durum güncellenemedi.");
            return;
        }

        setRows((prev) =>
            prev.map((x) => (x.id === row.id ? data : x))
        );

        await islemLogla({
            islem_tipi: "ARAC_FIYAT_DURUM",
            islem_aciklama: row.pasif
                ? "Araç fiyat kaydı aktife alındı"
                : "Araç fiyat kaydı pasife alındı",
            tablo_adi: "arac_fiyat_yonetimi",
            kayit_id: row.id,
            plaka: row.plaka,
            eski_deger: { pasif: row.pasif },
            yeni_deger: { pasif: !row.pasif },
        });
    }

    const filteredRows = useMemo(() => {
        const q = search.toLocaleLowerCase("tr-TR").trim();

        return rows.filter((row) => {
            if (statusFilter === "active" && row.pasif) return false;
            if (statusFilter === "passive" && !row.pasif) return false;

            const text = [
                row.plaka,
                row.cari_id,
                row.cari_adi,
                row.arac_sahip,
                row.calisma_tipi,
                row.aciklama,
            ]
                .join(" ")
                .toLocaleLowerCase("tr-TR");

            return text.includes(q);
        });
    }, [rows, search, statusFilter]);

    const summary = useMemo(() => {
        const active = rows.filter((row) => !row.pasif);
        const passive = rows.length - active.length;
        const monthlyRent = active.reduce((sum, row) => sum + (Number(row.aylik_kira) || 0), 0);
        const monthlyDriver = active.reduce((sum, row) => sum + (Number(row.aylik_surucu) || 0), 0);
        const total = active.reduce((sum, row) => sum + (Number(row.toplam_tutar) || 0), 0);
        const uniqueCaris = new Set(active.map((row) => row.cari_id || row.cari_adi).filter(Boolean)).size;

        return { active: active.length, passive, monthlyRent, monthlyDriver, total, uniqueCaris };
    }, [rows]);

    return (
        <div className="afy-page premium-page-enter">
            <input ref={topluGuncelleRef} type="file" accept=".xlsx,.xls" hidden onChange={handleBulkUpdateFile} />
            <input ref={topluAktarimRef} type="file" accept=".xlsx,.xls" hidden onChange={handleBulkImportFile} />
            <input ref={gunGuncelleRef} type="file" accept=".xlsx,.xls" hidden onChange={handleDayUpdateFile} />

            <section className="afy-hero">
                <div className="afy-hero-copy">
                    <div className="afy-hero-kicker"><Sparkles size={14} /> HAKEDİŞLER / MASTER DATA</div>
                    <h1>Araç Cari & Fiyat</h1>
                    <p>Araçların cari bağlantılarını, aylık maliyetlerini ve çalışma parametrelerini tek merkezden yönetin.</p>
                    <div className="afy-hero-badges">
                        <span><Activity size={13} /> {summary.active} aktif araç</span>
                        <span><UsersRound size={13} /> {summary.uniqueCaris} cari</span>
                        <span><CircleDollarSign size={13} /> Finans verisi güncel</span>
                    </div>
                </div>

                <div className="afy-hero-actions">
                    <button className="afy-btn afy-btn-ghost" onClick={loadData} disabled={loading}>
                        <RefreshCw size={16} className={loading ? "spin" : ""} />
                        Yenile
                    </button>
                    <button className="afy-btn afy-btn-primary" onClick={openNew}>
                        <Plus size={17} /> Yeni Kayıt
                    </button>
                </div>
            </section>

            <section className="afy-metrics">
                <Metric icon={CarFront} label="Aktif Araç" value={summary.active} note={`${summary.passive} pasif kayıt`} tone="indigo" />
                <Metric icon={BadgeTurkishLira} label="Aylık Kira" value={formatTL(summary.monthlyRent)} note="Aktif araç toplamı" tone="violet" />
                <Metric icon={UserRound} label="Aylık Sürücü" value={formatTL(summary.monthlyDriver)} note="Aktif araç toplamı" tone="cyan" />
                <Metric icon={CircleDollarSign} label="Toplam Tutar" value={formatTL(summary.total)} note="Sistemde hesaplanan" tone="green" />
            </section>

            <section className="afy-command-card">
                <div className="afy-command-head">
                    <div>
                        <span>İşlem Merkezi</span>
                        <strong>Tüm mevcut aksiyonlar</strong>
                    </div>
                    <small>Eski ekrandaki işlemlerin tamamı korunur; yalnızca görünüm modernleştirilmiştir.</small>
                </div>

                <div className="afy-action-groups">
                    <ActionGroup title="LİSTE İŞLEMLERİ" subtitle="Listeyi yenile veya Excel çıktısı al">
                        <ModernAction icon={RefreshCw} label="Yenile" onClick={loadData} disabled={loading} />
                        <ModernAction icon={Download} label="Excel’e Aktar" onClick={exportExcel} tone="primary" />
                    </ActionGroup>

                    <ActionGroup title="EXCEL & TOPLU İŞLEMLER" subtitle="Şablon, güncelleme ve toplu aktarım">
                        <ModernAction icon={FileDown} label="Toplu Şablon İndir" onClick={downloadTemplate} />
                        <ModernAction icon={RefreshCw} label="Toplu Güncelle" onClick={() => topluGuncelleRef.current?.click()} tone="info" />
                        <ModernAction icon={Upload} label="Toplu Aktarım" onClick={() => topluAktarimRef.current?.click()} tone="success" />
                        <ModernAction icon={CalendarDays} label="Gün Şablonu" onClick={downloadDayTemplate} />
                        <ModernAction icon={CalendarDays} label="Gün Güncelle" onClick={() => gunGuncelleRef.current?.click()} tone="warning" />
                    </ActionGroup>

                    <ActionGroup title="KAYIT & GEZİNME" subtitle="Kayıt ekle veya sayfalar arasında geçiş yap">
                        <ModernAction icon={Plus} label="Yeni Kayıt" onClick={openNew} tone="success" />
                        <ModernAction icon={ArrowLeft} label="Geri" onClick={() => onNavigate?.("Dashboard")} />
                        <ModernAction icon={Home} label="Anasayfa" onClick={() => onNavigate?.("Dashboard")} />
                    </ActionGroup>
                </div>

                <div className="afy-command-note">
                    <Activity size={15} />
                    <span>Toplu güncelleme mevcut kayıtları plaka/ID üzerinden günceller. Toplu aktarım yeni kayıt ekler. Gün Güncelle yalnızca çalışma günü alanını değiştirir.</span>
                </div>
            </section>

            <section className="afy-data-card">
                <div className="afy-data-head">
                    <div>
                        <span className="afy-section-kicker">FİYAT LİSTESİ</span>
                        <h2>Araç maliyet kayıtları</h2>
                        <p>{filteredRows.length} kayıt gösteriliyor · toplam {rows.length} kayıt</p>
                    </div>
                    <div className="afy-status-tabs" role="group" aria-label="Durum filtresi">
                        <button className={statusFilter === "all" ? "active" : ""} onClick={() => setStatusFilter("all")}>Tümü <b>{rows.length}</b></button>
                        <button className={statusFilter === "active" ? "active" : ""} onClick={() => setStatusFilter("active")}>Aktif <b>{summary.active}</b></button>
                        <button className={statusFilter === "passive" ? "active" : ""} onClick={() => setStatusFilter("passive")}>Pasif <b>{summary.passive}</b></button>
                    </div>
                </div>

                <div className="afy-toolbar">
                    <label className="afy-search">
                        <Search size={17} />
                        <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Plaka, cari adı, araç sahibi veya çalışma tipi ara..." />
                        {search && <button type="button" onClick={() => setSearch("")} aria-label="Aramayı temizle"><X size={15} /></button>}
                    </label>
                    <div className="afy-toolbar-actions">
                        <div className="afy-filter-summary">
                            <FileSpreadsheet size={16} />
                            <span>{statusFilter === "all" ? "Tüm durumlar" : statusFilter === "active" ? "Aktif kayıtlar" : "Pasif kayıtlar"}</span>
                        </div>
                        <button type="button" className="afy-reset-filter" onClick={() => { setSearch(""); setStatusFilter("all"); }}>
                            <RotateCcw size={14} /> Filtreleri Sıfırla
                        </button>
                    </div>
                </div>

                <div className="afy-table-wrap">
                    <table className="afy-table">
                        <thead>
                            <tr>
                                <th>Araç / Durum</th>
                                <th>Cari</th>
                                <th>Araç Sahibi</th>
                                <th>Çalışma Tipi</th>
                                <th className="num">Aylık Kira</th>
                                <th className="num">Aylık Sürücü</th>
                                <th className="num">Yakma</th>
                                <th className="num">Toplam</th>
                                <th className="num">Gün</th>
                                <th>Açıklama</th>
                                <th className="actions-col">İşlem</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading && Array.from({ length: 5 }).map((_, i) => (
                                <tr key={`skeleton-${i}`} className="afy-skeleton-row"><td colSpan="11"><span /></td></tr>
                            ))}
                            {!loading && filteredRows.length === 0 && (
                                <tr><td colSpan="11"><div className="afy-empty"><Search size={26} /><strong>Kayıt bulunamadı</strong><span>Arama veya durum filtresini değiştirin.</span></div></td></tr>
                            )}
                            {!loading && filteredRows.map((row) => (
                                <tr key={row.id} className={row.pasif ? "passive" : ""}>
                                    <td>
                                        <div className="afy-vehicle-cell">
                                            <div className="afy-vehicle-icon"><CarFront size={16} /></div>
                                            <div><strong>{row.plaka || "—"}</strong><span className={`afy-inline-status ${row.pasif ? "passive" : "active"}`}>{row.pasif ? "Pasif" : "Aktif"}</span></div>
                                        </div>
                                    </td>
                                    <td><div className="afy-cari-cell"><strong>{row.cari_adi || "—"}</strong><span>{row.cari_id || "Cari ID yok"}</span></div></td>
                                    <td>{row.arac_sahip || "—"}</td>
                                    <td><span className="afy-type-chip">{row.calisma_tipi || "Tanımsız"}</span></td>
                                    <td className="num">{formatTL(row.aylik_kira)}</td>
                                    <td className="num">{formatTL(row.aylik_surucu)}</td>
                                    <td className="num">{row.yakma_orani ? `%${row.yakma_orani}` : "—"}</td>
                                    <td className="num afy-total-cell">{formatTL(row.toplam_tutar)}</td>
                                    <td className="num">{row.calisma_gunu || "—"}</td>
                                    <td className="afy-note" title={row.aciklama || ""}>{row.aciklama || "—"}</td>
                                    <td>
                                        <div className="afy-row-actions">
                                            <button className="edit" onClick={() => openEdit(row)} title="Kaydı düzenle"><Edit3 size={15} /></button>
                                            <button className={row.pasif ? "restore" : "archive"} onClick={() => togglePassive(row)} title={row.pasif ? "Aktife al" : "Pasife al"}>
                                                {row.pasif ? <ArchiveRestore size={15} /> : <CheckCircle2 size={15} />}
                                            </button>
                                            <button className="more" onClick={() => openEdit(row)} title="Detayı aç"><ChevronRight size={16} /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </section>

            {modalOpen && (
                <div className="afy-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setModalOpen(false)}>
                    <form className="afy-modal" onSubmit={saveRecord}>
                        <div className="afy-modal-head">
                            <div className="afy-modal-title-wrap">
                                <div className="afy-modal-icon"><CarFront size={20} /></div>
                                <div>
                                    <span>{editingRow ? "KAYIT DÜZENLE" : "YENİ ARAÇ KAYDI"}</span>
                                    <h2>{editingRow ? editingRow.plaka : "Araç Cari & Fiyat"}</h2>
                                    <p>Cari ve maliyet parametrelerini güncelleyin.</p>
                                </div>
                            </div>
                            <button className="afy-close" type="button" onClick={() => setModalOpen(false)} aria-label="Kapat"><X size={18} /></button>
                        </div>

                        <div className="afy-form-section">
                            <div className="afy-form-section-title"><CarFront size={16} /><span>Araç & Cari Bilgileri</span></div>
                            <div className="afy-form-grid">
                                <Input label="Plaka" value={form.plaka} onChange={(v) => setForm((p) => ({ ...p, plaka: v }))} />
                                <Input label="Cari ID" value={form.cari_id} onChange={(v) => setForm((p) => ({ ...p, cari_id: v }))} />
                                <Input label="Cari Adı" value={form.cari_adi} onChange={(v) => setForm((p) => ({ ...p, cari_adi: v }))} />
                                <Input label="Araç Sahibi" value={form.arac_sahip} onChange={(v) => setForm((p) => ({ ...p, arac_sahip: v }))} />
                                <Input label="Çalışma Tipi" value={form.calisma_tipi} onChange={(v) => setForm((p) => ({ ...p, calisma_tipi: v }))} />
                            </div>
                        </div>

                        <div className="afy-form-section">
                            <div className="afy-form-section-title"><BadgeTurkishLira size={16} /><span>Maliyet Parametreleri</span></div>
                            <div className="afy-form-grid afy-money-grid">
                                <Input label="Aylık Kira" value={form.aylik_kira} onChange={(v) => setForm((p) => ({ ...p, aylik_kira: v }))} />
                                <Input label="Aylık Sürücü" value={form.aylik_surucu} onChange={(v) => setForm((p) => ({ ...p, aylik_surucu: v }))} />
                                <Input label="Anlaşılan Yakma Oranı" value={form.yakma_orani} onChange={(v) => setForm((p) => ({ ...p, yakma_orani: v }))} />
                                <Input label="Çalışma Günü" value={form.calisma_gunu} onChange={(v) => setForm((p) => ({ ...p, calisma_gunu: v }))} />
                            </div>
                        </div>

                        <div className="afy-form-section afy-form-bottom">
                            <label className="afy-textarea-label"><span>Açıklama</span><textarea value={form.aciklama} placeholder="Kayıt hakkında not..." onChange={(e) => setForm((p) => ({ ...p, aciklama: e.target.value }))} /></label>
                            <label className="afy-switch-card">
                                <div><strong>Pasif kayıt</strong><span>Bu kaydı aktif listelerden ayır.</span></div>
                                <input type="checkbox" checked={form.pasif} onChange={(e) => setForm((p) => ({ ...p, pasif: e.target.checked }))} />
                                <i />
                            </label>
                        </div>

                        <div className="afy-modal-actions">
                            <button className="afy-btn afy-btn-ghost" type="button" onClick={() => setModalOpen(false)}>Vazgeç</button>
                            <button className="afy-btn afy-btn-primary" type="submit"><CheckCircle2 size={16} /> {editingRow ? "Değişiklikleri Kaydet" : "Kaydı Oluştur"}</button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function Metric({ icon: Icon, label, value, note, tone }) {
    return (
        <article className={`afy-metric tone-${tone}`}>
            <div className="afy-metric-icon"><Icon size={20} /></div>
            <div className="afy-metric-copy"><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
            <div className="afy-metric-glow" />
        </article>
    );
}

function ActionGroup({ title, subtitle, children }) {
    return (
        <div className="afy-action-group">
            <div className="afy-action-group-head">
                <strong>{title}</strong>
                <span>{subtitle}</span>
            </div>
            <div className="afy-action-group-buttons">{children}</div>
        </div>
    );
}

function ModernAction({ icon: Icon, label, onClick, tone = "default", disabled = false }) {
    return (
        <button type="button" className={`afy-modern-action tone-${tone}`} onClick={onClick} disabled={disabled}>
            <span className="afy-modern-action-icon"><Icon size={16} /></span>
            <span className="afy-modern-action-label">{label}</span>
            <ChevronRight size={14} className="afy-modern-action-arrow" />
        </button>
    );
}

function Input({ label, value, onChange }) {
    return (
        <label>
            {label}
            <input value={value || ""} onChange={(e) => onChange(e.target.value)} />
        </label>
    );
}