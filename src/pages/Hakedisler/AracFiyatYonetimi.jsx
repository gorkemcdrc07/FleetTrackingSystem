import { useEffect, useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { supabase } from "../../supabaseClient";
import { islemLogla } from "../../utils/islemLogla";
import "./AracFiyatYonetimi.css";

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

export default function AracFiyatYonetimi() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
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
        const q = search.toLocaleLowerCase("tr-TR");

        return rows.filter((row) => {
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
    }, [rows, search]);

    return (
        <div className="afy-page">
            <input
                ref={topluGuncelleRef}
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={handleBulkUpdateFile}
            />

            <input
                ref={topluAktarimRef}
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={handleBulkImportFile}
            />

            <input
                ref={gunGuncelleRef}
                type="file"
                accept=".xlsx,.xls"
                hidden
                onChange={handleDayUpdateFile}
            />

            <div className="afy-top">
                <div>
                    <span className="afy-eyebrow">Hakediş Yönetimi</span>
                    <h1>Araç Cari ve Fiyat Yönetimi</h1>
                    <p>Araç bazlı cari, kira ve sürücü fiyat yönetimi.</p>
                </div>
            </div>

            <div className="afy-action-grid">
                <ActionButton
                    title="Excele Aktar"
                    desc="Tablodaki mevcut verileri .xlsx olarak dışarı aktarır."
                    meta="Çıktı: tüm kolonlar"
                    icon="⬇"
                    tone="blue"
                    onClick={exportExcel}
                />

                <ActionButton
                    title="Toplu Şablon İndir"
                    desc="Excel yüklemek için örnek şablon dosyası indirir."
                    meta="Gerekli: plaka"
                    icon="📄"
                    tone="slate"
                    onClick={downloadTemplate}
                />

                <ActionButton
                    title="Toplu Güncelle"
                    desc="Excel dosyasındaki verilere göre mevcut kayıtları günceller."
                    meta="Gerekli: id veya plaka"
                    icon="↻"
                    tone="orange"
                    onClick={() => topluGuncelleRef.current?.click()}
                />

                <ActionButton
                    title="Toplu Aktarım"
                    desc="Excel dosyasındaki yeni kayıtları sisteme toplu şekilde ekler."
                    meta="Gerekli: plaka"
                    icon="⇪"
                    tone="green"
                    onClick={() => topluAktarimRef.current?.click()}
                />

                <ActionButton
                    title="Gün Güncelle"
                    desc="Excel’den sadece çalışma günü bilgilerini topluca günceller."
                    meta="Gerekli: plaka, calisma_gunu"
                    icon="📅"
                    tone="purple"
                    onClick={() => gunGuncelleRef.current?.click()}
                    extraAction={downloadDayTemplate}
                    extraLabel="Şablon"
                />

                <ActionButton
                    title="Yeni Kayıt"
                    desc="Tek bir yeni araç/cari kaydı oluşturur."
                    meta="Form ile kayıt"
                    icon="+"
                    tone="primary"
                    onClick={openNew}
                />
            </div>

            <div className="afy-toolbar">
                <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Plaka, cari, araç sahibi ara..."
                />

                <button onClick={loadData}>Yenile</button>
            </div>

            <div className="afy-table-wrap">
                <table className="afy-table">
                    <thead>
                        <tr>
                            <th>İşlem</th>
                            <th>Plaka</th>
                            <th>Cari ID</th>
                            <th>Cari Adı</th>
                            <th>Araç Sahibi</th>
                            <th>Çalışma Tipi</th>
                            <th>Aylık Kira</th>
                            <th>Aylık Sürücü</th>
                            <th>Anlaşılan Yakma Oranı</th>
                            <th>Toplam Tutar</th>
                            <th>Çalışma Günü</th>
                            <th>Durum</th>
                            <th>Açıklama</th>
                        </tr>
                    </thead>

                    <tbody>
                        {loading && (
                            <tr>
                                <td colSpan="13">Yükleniyor...</td>
                            </tr>
                        )}

                        {!loading && filteredRows.length === 0 && (
                            <tr>
                                <td colSpan="13">Kayıt bulunamadı.</td>
                            </tr>
                        )}

                        {!loading && filteredRows.map((row) => (
                            <tr key={row.id} className={row.pasif ? "passive" : ""}>
                                <td>
                                    <div className="afy-actions">
                                        <button onClick={() => openEdit(row)}>Düzenle</button>
                                        <button onClick={() => togglePassive(row)}>
                                            {row.pasif ? "Aktif Yap" : "Pasif Yap"}
                                        </button>
                                    </div>
                                </td>

                                <td>
                                    <strong className="plate">{row.plaka || "—"}</strong>
                                </td>

                                <td>{row.cari_id || "—"}</td>
                                <td>{row.cari_adi || "—"}</td>
                                <td>{row.arac_sahip || "—"}</td>
                                <td>{row.calisma_tipi || "—"}</td>
                                <td>{formatTL(row.aylik_kira)}</td>
                                <td>{formatTL(row.aylik_surucu)}</td>
                                <td>{row.yakma_orani ? `%${row.yakma_orani}` : "—"}</td>
                                <td><strong>{formatTL(row.toplam_tutar)}</strong></td>
                                <td>{row.calisma_gunu || "—"}</td>

                                <td>
                                    <span className={`status ${row.pasif ? "pasif" : "aktif"}`}>
                                        {row.pasif ? "Pasif" : "Aktif"}
                                    </span>
                                </td>

                                <td>{row.aciklama || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {modalOpen && (
                <div className="afy-modal-backdrop">
                    <form className="afy-modal" onSubmit={saveRecord}>
                        <div className="afy-modal-head">
                            <div>
                                <span>{editingRow ? "Kayıt Güncelle" : "Yeni Kayıt"}</span>
                                <h2>Araç Cari ve Fiyat Yönetimi</h2>
                            </div>

                            <button type="button" onClick={() => setModalOpen(false)}>×</button>
                        </div>

                        <div className="afy-form-grid">
                            <Input label="Plaka" value={form.plaka} onChange={(v) => setForm((p) => ({ ...p, plaka: v }))} />
                            <Input label="Cari ID" value={form.cari_id} onChange={(v) => setForm((p) => ({ ...p, cari_id: v }))} />
                            <Input label="Cari Adı" value={form.cari_adi} onChange={(v) => setForm((p) => ({ ...p, cari_adi: v }))} />
                            <Input label="Araç Sahibi" value={form.arac_sahip} onChange={(v) => setForm((p) => ({ ...p, arac_sahip: v }))} />
                            <Input label="Çalışma Tipi" value={form.calisma_tipi} onChange={(v) => setForm((p) => ({ ...p, calisma_tipi: v }))} />
                            <Input label="Aylık Kira" value={form.aylik_kira} onChange={(v) => setForm((p) => ({ ...p, aylik_kira: v }))} />
                            <Input label="Aylık Sürücü" value={form.aylik_surucu} onChange={(v) => setForm((p) => ({ ...p, aylik_surucu: v }))} />
                            <Input label="Anlaşılan Yakma Oranı" value={form.yakma_orani} onChange={(v) => setForm((p) => ({ ...p, yakma_orani: v }))} />
                            <Input label="Çalışma Günü" value={form.calisma_gunu} onChange={(v) => setForm((p) => ({ ...p, calisma_gunu: v }))} />

                            <label>
                                Açıklama
                                <textarea
                                    value={form.aciklama}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            aciklama: e.target.value,
                                        }))
                                    }
                                />
                            </label>

                            <label className="afy-check">
                                <input
                                    type="checkbox"
                                    checked={form.pasif}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            pasif: e.target.checked,
                                        }))
                                    }
                                />
                                Pasif kayıt
                            </label>
                        </div>

                        <div className="afy-modal-actions">
                            <button type="button" onClick={() => setModalOpen(false)}>
                                Vazgeç
                            </button>

                            <button className="primary" type="submit">
                                Kaydet
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </div>
    );
}

function ActionButton({
    title,
    desc,
    meta,
    icon,
    onClick,
    tone = "slate",
    extraAction,
    extraLabel,
}) {
    return (
        <div className={`afy-action-card tone-${tone}`}>
            <button type="button" className="afy-action-main" onClick={onClick}>
                <span className="afy-action-icon">{icon}</span>

                <span className="afy-action-content">
                    <strong>{title}</strong>
                    <small>{desc}</small>
                    <em>{meta}</em>
                </span>
            </button>

            {extraAction && (
                <button
                    type="button"
                    className="afy-action-mini"
                    onClick={extraAction}
                >
                    {extraLabel}
                </button>
            )}
        </div>
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