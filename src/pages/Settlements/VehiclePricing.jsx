import { useEffect, useMemo, useRef, useState } from "react";
import { logAuditEvent } from "../../services/auditLogger";
import {
    buildVehiclePricingPayload,
    filterVehiclePricing,
    normalizePlate,
    parsePricingNumber,
    upsertVehiclePricingRow,
} from "../../domain/vehiclePricing";
import {
    insertVehiclePricingBatch,
    listVehiclePricing,
    saveVehiclePricing,
    setVehiclePricingPassive,
    updateVehiclePricingBatch,
    updateVehiclePricingDays,
} from "../../services/vehiclePricingRepository";
import "./VehiclePricing.css";

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

function readExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = async (e) => {
            try {
                const xlsxModule = await import("xlsx");
                const XLSX = xlsxModule.default || xlsxModule;
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

async function downloadXlsx(rows, fileName, sheetName = "Veriler") {
    const xlsxModule = await import("xlsx");
    const XLSX = xlsxModule.default || xlsxModule;
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    XLSX.writeFile(workbook, fileName);
}

function mapExcelRow(row) {
    return buildVehiclePricingPayload(row, { fromExcel: true });
}

export default function VehiclePricing() {
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

        try {
            setRows(await listVehiclePricing());
        } catch (error) {
            console.error(error);
            setRows([]);
        } finally {
            setLoading(false);
        }
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

            await insertVehiclePricingBatch(payload);

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
            const count = await updateVehiclePricingBatch(
                excelRows.map((row) => ({ id: row.id, payload: mapExcelRow(row) }))
            );

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
            const count = await updateVehiclePricingDays(
                excelRows.map((row) => ({
                    plaka: normalizePlate(row.plaka),
                    calismaGunu: parsePricingNumber(row.calisma_gunu),
                }))
            );

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

        const payload = buildVehiclePricingPayload(form);

        try {
            const data = await saveVehiclePricing({ id: editingRow?.id, payload });
            setRows((previousRows) => upsertVehiclePricingRow(previousRows, data));

            await logAuditEvent({
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
        let data;
        try {
            data = await setVehiclePricingPassive(row.id, !row.pasif);
        } catch (error) {
            console.error(error);
            alert("Durum güncellenemedi.");
            return;
        }

        setRows((prev) =>
            prev.map((x) => (x.id === row.id ? data : x))
        );

        await logAuditEvent({
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
        return filterVehiclePricing(rows, search);
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
