import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import "./AracDurumlari.css";

const STATUS_OPTIONS = ["Tümü", "Müsait", "Seferde", "Bakımda", "Evrak Eksik", "Pasif", "İzinde", "Çıkartıldı"];
const LEAVE_STATUS_OPTIONS = ["Yıllık İzin", "Raporlu", "Ücretsiz İzin", "Mazeret İzni", "İdari İzin"];

const emptyForm = {
    plaka: "", surucu_isim: "", tel_no: "", tc_kimlik_no: "", ikamet_adresi: "",
    tedarikci_isim: "", kira_yakit: "", yakit: "", yakit_2: "", bolge: "",
    arac_tip: "", arac_yil: "", dorse_tip: "", dorse_yil: "", durum: "Müsait",
    cekici_ruhsat_no: "", dorse_ruhsat_no: "", cekici_muayene: "", dorse_muayene: "",
    trafik_sigorta: "", tasit_karti: "", izin_gun_sayisi: "", is_basi_tarih: "",
    liftmaster: "", gps_no: "", gsm_no: "",
};

const emptyIzinForm = { baslangic: "", bitis: "", statu: "Yıllık İzin", yeniStatu: "", aciklama: "" };
const emptyKesintiForm = { tarih: "", tip: "para", deger: "", aciklama: "" };
const emptyCikisForm = {
    cikartilan_tarih: "",
    cikartilma_nedeni: "",
    iade_gps: false,
    iade_evraklar: false,
    iade_utts: false,
    iade_gestas_negmar: false,
};

function value(v) { return v === null || v === undefined || v === "" ? "—" : v; }
function normalize(v) { return String(v || "").toLocaleLowerCase("tr-TR").trim(); }
function createId() { return window.crypto?.randomUUID ? window.crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function formatInputDate(dateText) { if (!dateText) return ""; const p = String(dateText).split("-"); return p.length === 3 ? `${p[2]}.${p[1]}.${p[0]}` : ""; }
function parseDate(dateText) { if (!dateText) return null; const p = String(dateText).split("."); if (p.length !== 3) return null; const d = new Date(`${p[2]}-${p[1]}-${p[0]}`); if (isNaN(d)) return null; d.setHours(0, 0, 0, 0); return d; }
function calculateLeaveDaysFromInput(s, e) { if (!s || !e) return ""; const a = new Date(s); const b = new Date(e); if (isNaN(a) || isNaN(b) || b < a) return ""; return String(Math.floor((b - a) / (1000 * 60 * 60 * 24)) + 1); }
function isExpiringSoon(t) { const d = parseDate(t); if (!d) return false; const n = new Date(); n.setHours(0, 0, 0, 0); const days = (d - n) / (1000 * 60 * 60 * 24); return days >= 0 && days <= 30; }
function isExpired(t) { const d = parseDate(t); if (!d) return false; const n = new Date(); n.setHours(0, 0, 0, 0); return d < n; }
function getDocumentRisk(row) { const dates = [row.cekici_muayene, row.dorse_muayene, row.trafik_sigorta]; if (dates.some(isExpired)) return "expired"; if (dates.some(isExpiringSoon)) return "soon"; return "ok"; }
function isTodayBetween(s, e) { const a = parseDate(s); const b = parseDate(e); if (!a || !b) return false; const n = new Date(); n.setHours(0, 0, 0, 0); return n >= a && n <= b; }
function getActiveLeave(row) { return (Array.isArray(row.izinler) ? row.izinler : []).find((x) => isTodayBetween(x.baslangic, x.bitis)) || null; }
function getDisplayStatus(row) { if (row.isten_cikarildi) return "Çıkartıldı"; const leave = getActiveLeave(row); return leave ? (leave.statu || "İzinde") : (row.durum || "Müsait"); }
function formatKesinti(item) { if (!item) return "—"; return item.tip === "gun" ? `${value(item.deger)} gün` : `${value(item.deger)} ₺`; }
function exitHasWarning(row) { return Boolean(row.isten_cikarildi && (!row.iade_gps || !row.iade_evraklar)); }

function cssKey(text) {
    return normalize(text).replaceAll(" ", "-").replaceAll("ı", "i").replaceAll("ğ", "g").replaceAll("ü", "u").replaceAll("ş", "s").replaceAll("ö", "o").replaceAll("ç", "c");
}

function StatusBadge({ status }) { return <span className={`status-badge ${cssKey(status || "Müsait")}`}>{status || "Müsait"}</span>; }
function RiskBadge({ risk }) { if (risk === "expired") return <span className="risk-badge danger">Süresi Geçmiş</span>; if (risk === "soon") return <span className="risk-badge warning">Yaklaşıyor</span>; return <span className="risk-badge success">Uygun</span>; }
function ExitWarningBadge({ row }) { return exitHasWarning(row) ? <span className="risk-badge danger">İade Eksik</span> : <span className="risk-badge success">İade Tamam</span>; }

export default function AracDurumlari() {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedRow, setSelectedRow] = useState(null);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("Tümü");
    const [bolgeFilter, setBolgeFilter] = useState("Tümü");
    const [aracTipFilter, setAracTipFilter] = useState("Tümü");
    const [onlyProblematic, setOnlyProblematic] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editingRow, setEditingRow] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [izinModalRow, setIzinModalRow] = useState(null);
    const [kesintiModalRow, setKesintiModalRow] = useState(null);
    const [cikisModalRow, setCikisModalRow] = useState(null);
    const [listPanel, setListPanel] = useState(null);
    const [izinForm, setIzinForm] = useState(emptyIzinForm);
    const [kesintiForm, setKesintiForm] = useState(emptyKesintiForm);
    const [cikisForm, setCikisForm] = useState(emptyCikisForm);

    useEffect(() => { loadData(); }, []);

    async function loadData() {
        setLoading(true);
        const { data, error } = await supabase.from("arac_durumlari").select("*").order("plaka", { ascending: true });
        if (error) { console.error("Araç durumları alınamadı:", error); setRows([]); }
        else setRows(data || []);
        setLoading(false);
    }

    function updateLocalRow(updatedRow) {
        setRows((p) => p.map((x) => x.id === updatedRow.id ? updatedRow : x));
        setSelectedRow((p) => p?.id === updatedRow.id ? updatedRow : p);
        setIzinModalRow((p) => p?.id === updatedRow.id ? updatedRow : p);
        setKesintiModalRow((p) => p?.id === updatedRow.id ? updatedRow : p);
        setCikisModalRow((p) => p?.id === updatedRow.id ? updatedRow : p);
    }

    function openAddForm() { setEditingRow(null); setForm(emptyForm); setFormOpen(true); }
    function openEditForm(row) { setEditingRow(row); setForm({ ...emptyForm, ...row }); setFormOpen(true); }
    function closeForm() { setFormOpen(false); setEditingRow(null); setForm(emptyForm); }
    function updateForm(field, val) { setForm((p) => ({ ...p, [field]: val })); }
    function openIzinModal(row) { setIzinModalRow(row); setIzinForm(emptyIzinForm); }
    function openKesintiModal(row) { setKesintiModalRow(row); setKesintiForm(emptyKesintiForm); }
    function openCikisModal(row) {
        setCikisModalRow(row);
        setCikisForm({
            ...emptyCikisForm,
            cikartilan_tarih: row.cikartilan_tarih || "",
            cikartilma_nedeni: row.cikartilma_nedeni || "",
            iade_gps: Boolean(row.iade_gps),
            iade_evraklar: Boolean(row.iade_evraklar),
            iade_utts: Boolean(row.iade_utts),
            iade_gestas_negmar: Boolean(row.iade_gestas_negmar),
        });
    }

    async function saveVehicle(e) {
        e.preventDefault();
        const payload = { ...form, durum: form.durum || "Müsait" };
        const query = editingRow
            ? supabase.from("arac_durumlari").update(payload).eq("id", editingRow.id).select().single()
            : supabase.from("arac_durumlari").insert(payload).select().single();
        const { data, error } = await query;
        if (error) { console.error("Araç kaydedilemedi:", error); alert("Araç kaydedilemedi."); return; }
        setRows((p) => editingRow ? p.map((x) => x.id === editingRow.id ? data : x) : [...p, data].sort((a, b) => String(a.plaka).localeCompare(String(b.plaka), "tr")));
        setSelectedRow(data); closeForm();
    }

    async function addIzin(e) {
        e.preventDefault(); if (!izinModalRow) return;
        const gun = calculateLeaveDaysFromInput(izinForm.baslangic, izinForm.bitis);
        if (!izinForm.baslangic && !izinForm.bitis && !izinForm.aciklama) return;
        if (izinForm.baslangic && izinForm.bitis && !gun) { alert("Bitiş tarihi başlangıç tarihinden önce olamaz."); return; }
        const nextList = [...(Array.isArray(izinModalRow.izinler) ? izinModalRow.izinler : []), { id: createId(), baslangic: formatInputDate(izinForm.baslangic), bitis: formatInputDate(izinForm.bitis), gun, statu: izinForm.yeniStatu.trim() || izinForm.statu || "Yıllık İzin", aciklama: izinForm.aciklama, created_at: new Date().toISOString() }];
        const { data, error } = await supabase.from("arac_durumlari").update({ izinler: nextList }).eq("id", izinModalRow.id).select().single();
        if (error) { console.error("İzin kaydedilemedi:", error); alert("İzin kaydedilemedi."); return; }
        updateLocalRow(data); setIzinForm(emptyIzinForm);
    }

    async function addKesinti(e) {
        e.preventDefault(); if (!kesintiModalRow) return;
        if (!kesintiForm.tarih && !kesintiForm.deger && !kesintiForm.aciklama) return;
        const nextList = [...(Array.isArray(kesintiModalRow.kesintiler) ? kesintiModalRow.kesintiler : []), { id: createId(), tarih: kesintiForm.tarih, tip: kesintiForm.tip || "para", deger: kesintiForm.deger, aciklama: kesintiForm.aciklama, created_at: new Date().toISOString() }];
        const { data, error } = await supabase.from("arac_durumlari").update({ kesintiler: nextList }).eq("id", kesintiModalRow.id).select().single();
        if (error) { console.error("Kesinti kaydedilemedi:", error); alert("Kesinti kaydedilemedi."); return; }
        updateLocalRow(data); setKesintiForm(emptyKesintiForm);
    }

    async function saveCikis(e) {
        e.preventDefault(); if (!cikisModalRow) return;
        if (!cikisForm.cikartilan_tarih || !cikisForm.cikartilma_nedeni.trim()) { alert("Çıkartılan tarih ve çıkarılma nedeni zorunludur."); return; }
        const payload = { ...cikisForm, durum: "Çıkartıldı", isten_cikarildi: true };
        const { data, error } = await supabase.from("arac_durumlari").update(payload).eq("id", cikisModalRow.id).select().single();
        if (error) { console.error("İşten çıkartma kaydedilemedi:", error); alert("İşten çıkartma kaydedilemedi."); return; }
        updateLocalRow(data); setCikisModalRow(null); setCikisForm(emptyCikisForm); setSelectedRow(null);
    }

    async function undoCikis(row) {
        if (!window.confirm(`${row.plaka || "Araç"} tekrar ana listeye alınsın mı?`)) return;
        const { data, error } = await supabase.from("arac_durumlari").update({ isten_cikarildi: false, durum: "Müsait" }).eq("id", row.id).select().single();
        if (error) { console.error("Araç geri alınamadı:", error); alert("Araç geri alınamadı."); return; }
        updateLocalRow(data);
    }

    async function removeIzin(row, id) { const next = (row.izinler || []).filter((x) => x.id !== id); const { data, error } = await supabase.from("arac_durumlari").update({ izinler: next }).eq("id", row.id).select().single(); if (error) return alert("İzin silinemedi."); updateLocalRow(data); }
    async function removeKesinti(row, id) { const next = (row.kesintiler || []).filter((x) => x.id !== id); const { data, error } = await supabase.from("arac_durumlari").update({ kesintiler: next }).eq("id", row.id).select().single(); if (error) return alert("Kesinti silinemedi."); updateLocalRow(data); }

    const enrichedRows = useMemo(() => rows.map((row) => ({ ...row, documentRisk: getDocumentRisk(row), durum: getDisplayStatus(row), rawDurum: row.durum || "Müsait", izinler: Array.isArray(row.izinler) ? row.izinler : [], kesintiler: Array.isArray(row.kesintiler) ? row.kesintiler : [] })), [rows]);
    const activeRows = useMemo(() => enrichedRows.filter((r) => !r.isten_cikarildi), [enrichedRows]);
    const exitedRows = useMemo(() => enrichedRows.filter((r) => r.isten_cikarildi), [enrichedRows]);
    const bolgeOptions = useMemo(() => ["Tümü", ...Array.from(new Set(activeRows.map((x) => x.bolge).filter(Boolean)))], [activeRows]);
    const aracTipOptions = useMemo(() => ["Tümü", ...Array.from(new Set(activeRows.map((x) => x.arac_tip).filter(Boolean)))], [activeRows]);
    const izinStatuOptions = useMemo(() => Array.from(new Set([...LEAVE_STATUS_OPTIONS, ...rows.flatMap((r) => (Array.isArray(r.izinler) ? r.izinler : []).map((i) => i.statu).filter(Boolean))])), [rows]);
    const statusOptions = useMemo(() => ["Tümü", ...Array.from(new Set([...STATUS_OPTIONS.filter((x) => x !== "Tümü" && x !== "Çıkartıldı"), ...activeRows.map((x) => x.durum).filter(Boolean), ...izinStatuOptions]))], [activeRows, izinStatuOptions]);
    const allIzinler = useMemo(() => activeRows.flatMap((row) => row.izinler.map((izin) => ({ ...izin, row, plaka: row.plaka, surucu_isim: row.surucu_isim, bolge: row.bolge }))), [activeRows]);
    const allKesintiler = useMemo(() => activeRows.flatMap((row) => row.kesintiler.map((kesinti) => ({ ...kesinti, row, plaka: row.plaka, surucu_isim: row.surucu_isim, bolge: row.bolge }))), [activeRows]);

    const filteredRows = useMemo(() => activeRows.filter((row) => {
        const q = normalize(search);
        const searchable = normalize([row.plaka, row.surucu_isim, row.tel_no, row.tedarikci_isim, row.bolge, row.arac_tip].join(" "));
        if (q && !searchable.includes(q)) return false;
        if (statusFilter !== "Tümü" && row.durum !== statusFilter) return false;
        if (bolgeFilter !== "Tümü" && row.bolge !== bolgeFilter) return false;
        if (aracTipFilter !== "Tümü" && row.arac_tip !== aracTipFilter) return false;
        if (onlyProblematic && row.documentRisk === "ok" && row.durum !== "Bakımda" && row.durum !== "Evrak Eksik") return false;
        return true;
    }), [activeRows, search, statusFilter, bolgeFilter, aracTipFilter, onlyProblematic]);

    return <div className="arac-page">
        <div className="arac-hero">
            <div><span className="arac-eyebrow">Filo Yönetimi</span><h1>Araç Durumları</h1><p>Araç, sürücü, evrak, izin, kesinti ve işten çıkartma takibi.</p></div>
            <div className="hero-actions">
                <button className="add-btn" onClick={openAddForm}>+ Araç Ekle</button>
                <button className={`problem-btn ${onlyProblematic ? "active" : ""}`} onClick={() => setOnlyProblematic((p) => !p)}>Problemli Araçlar</button>
                <button className="list-btn" onClick={() => setListPanel("izin")}>İzin Listesi</button>
                <button className="list-btn danger" onClick={() => setListPanel("kesinti")}>Kesinti Listesi</button>
                <button className="list-btn exit" onClick={() => setListPanel("cikis")}>Çıkarılan Araçlar</button>
            </div>
        </div>

        <div className="filter-card">
            <div className="search-box"><span>⌕</span><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Plaka, sürücü, telefon, tedarikçi ara..." /></div>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>{statusOptions.map((x) => <option key={x}>{x}</option>)}</select>
            <select value={bolgeFilter} onChange={(e) => setBolgeFilter(e.target.value)}>{bolgeOptions.map((x) => <option key={x}>{x}</option>)}</select>
            <select value={aracTipFilter} onChange={(e) => setAracTipFilter(e.target.value)}>{aracTipOptions.map((x) => <option key={x}>{x}</option>)}</select>
        </div>

        <div className="content-grid">
            <div className="table-card">
                <div className="table-top"><div><h2>Araç Listesi</h2><span>{filteredRows.length} aktif kayıt gösteriliyor</span></div></div>
                <div className="fleet-table-wrap"><table className="fleet-table"><thead><tr><th>İşlem</th><th>Plaka</th><th>Sürücü</th><th>Tel No</th><th>Tedarikçi</th><th>Kira / Yakıt</th><th>Yakıt</th><th>Bölge</th><th>Araç Tip</th><th>Durum</th><th>Evrak</th></tr></thead><tbody>
                    {loading && <tr><td colSpan="11" className="empty-cell">Yükleniyor...</td></tr>}
                    {!loading && filteredRows.length === 0 && <tr><td colSpan="11" className="empty-cell">Araç bulunamadı.</td></tr>}
                    {!loading && filteredRows.map((row) => <tr key={row.id} onClick={() => setSelectedRow(row)} className={selectedRow?.id === row.id ? "selected" : ""}>
                        <td><div className="row-actions"><button className="edit-btn" onClick={(e) => { e.stopPropagation(); openEditForm(row); }}>Düzenle</button><button className="permit-btn" onClick={(e) => { e.stopPropagation(); openIzinModal(row); }}>İzin</button><button className="deduction-btn" onClick={(e) => { e.stopPropagation(); openKesintiModal(row); }}>Kesinti</button><button className="exit-btn" onClick={(e) => { e.stopPropagation(); openCikisModal(row); }}>İşten Çıkart</button></div></td>
                        <td><span className="plate">{value(row.plaka)}</span></td><td>{value(row.surucu_isim)}</td><td>{value(row.tel_no)}</td><td>{value(row.tedarikci_isim)}</td><td>{value(row.kira_yakit)}</td><td>{value(row.yakit_2 || row.yakit)}</td><td>{value(row.bolge)}</td><td>{value(row.arac_tip)}</td><td><StatusBadge status={row.durum} /></td><td><RiskBadge risk={row.documentRisk} /></td>
                    </tr>)}
                </tbody></table></div>
            </div>

            <aside className="detail-panel">
                {!selectedRow ? <div className="empty-detail"><div className="empty-icon">🚚</div><h3>Araç seçin</h3><p>Detayları görmek için listeden bir araç seçin.</p></div> : <>
                    <div className="detail-head"><div><span>Seçili Araç</span><h2>{value(selectedRow.plaka)}</h2></div><StatusBadge status={getDisplayStatus(selectedRow)} /></div>
                    <div className="detail-actions"><button className="permit-btn" onClick={() => openIzinModal(selectedRow)}>İzin Ekle</button><button className="deduction-btn" onClick={() => openKesintiModal(selectedRow)}>Kesinti Ekle</button><button className="exit-btn wide" onClick={() => openCikisModal(selectedRow)}>İşten Çıkart</button></div>
                    <div className="detail-section"><h3>Sürücü Bilgileri</h3><Info label="Sürücü" value={selectedRow.surucu_isim} /><Info label="Telefon" value={selectedRow.tel_no} /><Info label="TC Kimlik No" value={selectedRow.tc_kimlik_no} /><Info label="İkamet Adresi" value={selectedRow.ikamet_adresi} /></div>
                    <div className="detail-section"><h3>Araç Bilgileri</h3><Info label="Araç Tip" value={selectedRow.arac_tip} /><Info label="Araç Yıl" value={selectedRow.arac_yil} /><Info label="Dorse Tip" value={selectedRow.dorse_tip} /><Info label="Dorse Yıl" value={selectedRow.dorse_yil} /><Info label="Bölge" value={selectedRow.bolge} /><Info label="Tedarikçi" value={selectedRow.tedarikci_isim} /></div>
                    <div className="detail-section"><h3>Evrak & Takip</h3><Info label="Çekici Muayene" value={selectedRow.cekici_muayene} /><Info label="Dorse Muayene" value={selectedRow.dorse_muayene} /><Info label="Trafik Sigorta" value={selectedRow.trafik_sigorta} /><Info label="GPS No" value={selectedRow.gps_no} /><Info label="Taşıt Kartı" value={selectedRow.tasit_karti} /></div>
                    <RecordPreview title="İzinler" records={selectedRow.izinler || []} type="izin" row={selectedRow} onRemove={removeIzin} />
                    <RecordPreview title="Kesintiler" records={selectedRow.kesintiler || []} type="kesinti" row={selectedRow} onRemove={removeKesinti} />
                </>}
            </aside>
        </div>

        {formOpen && <VehicleForm editingRow={editingRow} form={form} updateForm={updateForm} onSubmit={saveVehicle} onClose={closeForm} />}
        {izinModalRow && <SmallRecordModal title="İzin Ekle" subtitle={izinModalRow.plaka} type="izin" form={izinForm} setForm={setIzinForm} records={izinModalRow.izinler || []} row={izinModalRow} onRemove={removeIzin} onSubmit={addIzin} leaveStatusOptions={izinStatuOptions} onClose={() => setIzinModalRow(null)} />}
        {kesintiModalRow && <SmallRecordModal title="Kesinti Ekle" subtitle={kesintiModalRow.plaka} type="kesinti" form={kesintiForm} setForm={setKesintiForm} records={kesintiModalRow.kesintiler || []} row={kesintiModalRow} onRemove={removeKesinti} onSubmit={addKesinti} onClose={() => setKesintiModalRow(null)} />}
        {cikisModalRow && <CikisModal row={cikisModalRow} form={cikisForm} setForm={setCikisForm} onSubmit={saveCikis} onClose={() => setCikisModalRow(null)} />}
        {listPanel && <RecordListPanel type={listPanel} records={listPanel === "izin" ? allIzinler : listPanel === "kesinti" ? allKesintiler : exitedRows} onRemove={listPanel === "izin" ? removeIzin : removeKesinti} onEditExit={openCikisModal} onUndoExit={undoCikis} onClose={() => setListPanel(null)} />}
    </div>;
}

function Info({ label, value: infoValue }) { return <div className="info-row"><span>{label}</span><strong>{value(infoValue)}</strong></div>; }
function FormInput({ label, value, onChange, placeholder, type = "text" }) { return <label>{label}<input type={type} value={value || ""} placeholder={placeholder || ""} onChange={(e) => onChange(e.target.value)} /></label>; }
function CheckboxField({ label, checked, onChange }) { return <label className="checkbox-field"><input type="checkbox" checked={Boolean(checked)} onChange={(e) => onChange(e.target.checked)} /><span>{label}</span></label>; }

function VehicleForm({ editingRow, form, updateForm, onSubmit, onClose }) {
    return <div className="vehicle-modal"><form className="vehicle-form" onSubmit={onSubmit}><div className="vehicle-form-head"><div><span>{editingRow ? "Kayıt Güncelle" : "Yeni Kayıt"}</span><h2>{editingRow ? "Araç Düzenle" : "Araç Ekle"}</h2></div><button type="button" onClick={onClose}>×</button></div><div className="vehicle-form-grid">
        <FormInput label="Plaka" value={form.plaka} onChange={(v) => updateForm("plaka", v)} /><FormInput label="Sürücü" value={form.surucu_isim} onChange={(v) => updateForm("surucu_isim", v)} /><FormInput label="Telefon" value={form.tel_no} onChange={(v) => updateForm("tel_no", v)} /><FormInput label="TC Kimlik No" value={form.tc_kimlik_no} onChange={(v) => updateForm("tc_kimlik_no", v)} /><FormInput label="İkamet Adresi" value={form.ikamet_adresi} onChange={(v) => updateForm("ikamet_adresi", v)} /><FormInput label="Tedarikçi" value={form.tedarikci_isim} onChange={(v) => updateForm("tedarikci_isim", v)} />
        <FormInput label="Kira / Yakıt" value={form.kira_yakit} onChange={(v) => updateForm("kira_yakit", v)} /><FormInput label="Yakıt" value={form.yakit} onChange={(v) => updateForm("yakit", v)} /><FormInput label="Yakıt 2" value={form.yakit_2} onChange={(v) => updateForm("yakit_2", v)} /><FormInput label="Bölge" value={form.bolge} onChange={(v) => updateForm("bolge", v)} /><FormInput label="Araç Tip" value={form.arac_tip} onChange={(v) => updateForm("arac_tip", v)} /><FormInput label="Araç Yıl" value={form.arac_yil} onChange={(v) => updateForm("arac_yil", v)} /><FormInput label="Dorse Tip" value={form.dorse_tip} onChange={(v) => updateForm("dorse_tip", v)} /><FormInput label="Dorse Yıl" value={form.dorse_yil} onChange={(v) => updateForm("dorse_yil", v)} />
        <label>Durum<select value={form.durum} onChange={(e) => updateForm("durum", e.target.value)}>{STATUS_OPTIONS.filter((x) => x !== "Tümü" && x !== "İzinde" && x !== "Çıkartıldı").map((x) => <option key={x}>{x}</option>)}</select></label>
        <FormInput label="Çekici Ruhsat No" value={form.cekici_ruhsat_no} onChange={(v) => updateForm("cekici_ruhsat_no", v)} /><FormInput label="Dorse Ruhsat No" value={form.dorse_ruhsat_no} onChange={(v) => updateForm("dorse_ruhsat_no", v)} /><FormInput label="Çekici Muayene" value={form.cekici_muayene} onChange={(v) => updateForm("cekici_muayene", v)} placeholder="gg.aa.yyyy" /><FormInput label="Dorse Muayene" value={form.dorse_muayene} onChange={(v) => updateForm("dorse_muayene", v)} placeholder="gg.aa.yyyy" /><FormInput label="Trafik Sigorta" value={form.trafik_sigorta} onChange={(v) => updateForm("trafik_sigorta", v)} placeholder="gg.aa.yyyy" /><FormInput label="Yetki Belgesi" value={form.tasit_karti} onChange={(v) => updateForm("tasit_karti", v)} /><FormInput label="İzin Gün Sayısı" value={form.izin_gun_sayisi} onChange={(v) => updateForm("izin_gun_sayisi", v)} /><FormInput label="İş Başı Tarih" value={form.is_basi_tarih} onChange={(v) => updateForm("is_basi_tarih", v)} placeholder="gg.aa.yyyy" /><FormInput label="Liftmaster" value={form.liftmaster} onChange={(v) => updateForm("liftmaster", v)} /><FormInput label="GPS No" value={form.gps_no} onChange={(v) => updateForm("gps_no", v)} /><FormInput label="GSM No" value={form.gsm_no} onChange={(v) => updateForm("gsm_no", v)} />
    </div><div className="vehicle-form-actions"><button type="button" className="cancel-btn" onClick={onClose}>Vazgeç</button><button type="submit" className="save-btn">Kaydet</button></div></form></div>;
}

function SmallRecordModal({ title, subtitle, type, form, setForm, records = [], row, onRemove, onSubmit, onClose, leaveStatusOptions = LEAVE_STATUS_OPTIONS }) {
    const isIzin = type === "izin"; const previewDays = calculateLeaveDaysFromInput(form.baslangic, form.bitis);
    return <div className="vehicle-modal"><form className="small-record-modal" onSubmit={onSubmit}><div className="small-modal-head"><div><span>{subtitle}</span><h2>{title}</h2></div><button type="button" onClick={onClose}>×</button></div><div className="small-modal-body">
        {isIzin ? <><FormInput label="Başlangıç Tarihi" type="date" value={form.baslangic} onChange={(v) => setForm((p) => ({ ...p, baslangic: v }))} /><FormInput label="Bitiş Tarihi" type="date" value={form.bitis} onChange={(v) => setForm((p) => ({ ...p, bitis: v }))} /><label>İzin Statüsü<select value={form.statu} onChange={(e) => setForm((p) => ({ ...p, statu: e.target.value, yeniStatu: "" }))}>{leaveStatusOptions.map((x) => <option key={x}>{x}</option>)}</select></label><FormInput label="Yeni Statü Ekle" value={form.yeniStatu} placeholder="Örn: Doğum İzni" onChange={(v) => setForm((p) => ({ ...p, yeniStatu: v }))} /><div className="auto-day-box"><span>Gün Sayısı</span><strong>{previewDays || "—"}</strong></div><FormInput label="Açıklama" value={form.aciklama} placeholder="İzin açıklaması" onChange={(v) => setForm((p) => ({ ...p, aciklama: v }))} /></> : <><FormInput label="Tarih" value={form.tarih} placeholder="gg.aa.yyyy" onChange={(v) => setForm((p) => ({ ...p, tarih: v }))} /><label>Kesinti Tipi<select value={form.tip} onChange={(e) => setForm((p) => ({ ...p, tip: e.target.value, deger: "" }))}><option value="para">Para</option><option value="gun">Gün</option></select></label><FormInput label={form.tip === "gun" ? "Gün Sayısı" : "Tutar"} value={form.deger} placeholder={form.tip === "gun" ? "Örn: 2" : "Örn: 1500"} onChange={(v) => setForm((p) => ({ ...p, deger: v }))} /><FormInput label="Açıklama" value={form.aciklama} placeholder="Kesinti açıklaması" onChange={(v) => setForm((p) => ({ ...p, aciklama: v }))} /></>}
    </div><RecordMiniList type={type} records={records} row={row} onRemove={onRemove} /><div className="small-modal-actions"><button type="button" className="cancel-btn" onClick={onClose}>Vazgeç</button><button type="submit" className="save-btn">Kaydet</button></div></form></div>;
}

function CikisModal({ row, form, setForm, onSubmit, onClose }) {
    return <div className="vehicle-modal"><form className="small-record-modal exit-modal" onSubmit={onSubmit}><div className="small-modal-head"><div><span>{row.plaka}</span><h2>İşten Çıkart</h2></div><button type="button" onClick={onClose}>×</button></div><div className="small-modal-body exit-body">
        <FormInput label="Çıkartılan Tarih" type="date" value={form.cikartilan_tarih} onChange={(v) => setForm((p) => ({ ...p, cikartilan_tarih: v }))} />
        <label className="textarea-label">Çıkarılma Nedeni<textarea value={form.cikartilma_nedeni || ""} placeholder="Çıkarılma nedenini yazın" onChange={(e) => setForm((p) => ({ ...p, cikartilma_nedeni: e.target.value }))} /></label>
        <div className="exit-checks"><h3>İptal / İade Kontrolü</h3><CheckboxField label="GPS iptal/iade edildi" checked={form.iade_gps} onChange={(v) => setForm((p) => ({ ...p, iade_gps: v }))} /><CheckboxField label="Evraklar teslim alındı" checked={form.iade_evraklar} onChange={(v) => setForm((p) => ({ ...p, iade_evraklar: v }))} /><CheckboxField label="UTTS iptal edildi" checked={form.iade_utts} onChange={(v) => setForm((p) => ({ ...p, iade_utts: v }))} /><CheckboxField label="Gestaş / Negmar iptal edildi" checked={form.iade_gestas_negmar} onChange={(v) => setForm((p) => ({ ...p, iade_gestas_negmar: v }))} /></div>
        {(!form.iade_gps || !form.iade_evraklar) && <div className="exit-warning">GPS veya evrak teslimi eksik. Araç çıkarılan araçlar panelinde sürekli uyarı verecek.</div>}
    </div><div className="small-modal-actions"><button type="button" className="cancel-btn" onClick={onClose}>Vazgeç</button><button type="submit" className="save-btn danger-save">İşten Çıkart</button></div></form></div>;
}

function RecordMiniList({ type, records, row, onRemove }) {
    const isIzin = type === "izin";
    return <div className={`modal-record-list ${type}`}><div className="modal-record-list-head"><strong>Mevcut Kayıtlar</strong><span>{records.length} kayıt</span></div>{records.length === 0 ? <div className="modal-record-empty">Henüz kayıt yok.</div> : records.map((item) => <div className="modal-record-item" key={item.id}><div><strong>{isIzin ? `${value(item.baslangic)} - ${value(item.bitis)}` : `${value(item.tarih)} / ${formatKesinti(item)}`}</strong><span>{isIzin ? `${value(item.gun)} gün • ${value(item.statu)} • ${value(item.aciklama)}` : value(item.aciklama)}</span></div><button type="button" onClick={() => onRemove(row, item.id)}>Sil</button></div>)}</div>;
}

function RecordPreview({ title, records, type, row, onRemove }) {
    const isIzin = type === "izin";
    return <div className={`detail-section record-preview ${type}`}><div className="record-preview-head"><h3>{title}</h3><span>{records.length} kayıt</span></div>{records.length === 0 ? <p className="preview-empty">Kayıt yok.</p> : records.map((item) => <div className="preview-item" key={item.id}><div className="preview-main"><strong>{isIzin ? `${value(item.baslangic)} - ${value(item.bitis)}` : `${value(item.tarih)} / ${formatKesinti(item)}`}</strong><span>{isIzin ? `${value(item.gun)} gün • ${value(item.statu)}` : item.tip === "gun" ? "Gün kesintisi" : "Para kesintisi"}</span>{item.aciklama && <p>{item.aciklama}</p>}</div><button type="button" className="preview-delete" onClick={() => onRemove(row, item.id)}>Sil</button></div>)}</div>;
}

function RecordListPanel({ type, records, onRemove, onEditExit, onUndoExit, onClose }) {
    const isIzin = type === "izin", isKesinti = type === "kesinti", isCikis = type === "cikis";
    const title = isIzin ? "Tüm Araçların İzin Listesi" : isKesinti ? "Tüm Araçların Kesinti Listesi" : "Çıkarılan Araçlar";
    return <div className="side-panel-backdrop" onClick={onClose}><aside className={`record-side-panel ${type}`} onClick={(e) => e.stopPropagation()}><div className="side-panel-head"><div><span>Genel liste</span><h2>{title}</h2></div><button type="button" onClick={onClose}>×</button></div><div className="side-panel-summary"><strong>{records.length}</strong><span>toplam kayıt</span></div><div className="side-panel-list">
        {records.length === 0 ? <div className="modal-record-empty">Henüz kayıt yok.</div> : records.map((item) => isCikis ? <div className="side-panel-item exit-item" key={item.id}><div className="side-panel-item-top"><strong>{value(item.plaka)}</strong><ExitWarningBadge row={item} /></div><div className="side-panel-meta"><span>{value(item.surucu_isim)}</span><span>{value(item.bolge)}</span></div><div className="side-panel-date-line">Çıkış: {value(item.cikartilan_tarih)}</div><p><b>Neden:</b> {value(item.cikartilma_nedeni)}</p><div className="exit-status-grid"><span className={item.iade_gps ? "ok" : "bad"}>GPS</span><span className={item.iade_evraklar ? "ok" : "bad"}>Evraklar</span><span className={item.iade_utts ? "ok" : "bad"}>UTTS</span><span className={item.iade_gestas_negmar ? "ok" : "bad"}>Gestaş/Negmar</span></div><div className="side-panel-actions"><button className="edit-btn" onClick={() => onEditExit(item)}>Düzenle</button><button className="permit-btn" onClick={() => onUndoExit(item)}>Ana Listeye Al</button></div></div> : <div className="side-panel-item" key={`${item.row?.id || item.plaka}-${item.id}`}><div className="side-panel-item-top"><strong>{value(item.plaka)}</strong>{isIzin && <StatusBadge status={item.statu || "İzin"} />}</div><div className="side-panel-meta"><span>{value(item.surucu_isim)}</span><span>{value(item.bolge)}</span></div><div className="side-panel-date-line">{isIzin ? `${value(item.baslangic)} - ${value(item.bitis)} • ${value(item.gun)} gün` : `${value(item.tarih)} • ${formatKesinti(item)} • ${item.tip === "gun" ? "Gün kesintisi" : "Para kesintisi"}`}</div>{item.aciklama && <p>{item.aciklama}</p>}<button type="button" className="preview-delete" onClick={() => onRemove(item.row, item.id)}>Sil</button></div>)}
    </div></aside></div>;
}
