import { useEffect, useMemo, useState } from "react";
import {
    buildHandlingFeePayload,
    filterHandlingFees,
    summarizeHandlingFees,
} from "../../domain/handlingFees";
import {
    deleteHandlingFee,
    listHandlingFees,
    saveHandlingFee,
} from "../../services/handlingFeeRepository";
import "./HandlingFee.css";

const giderSecenekleri = [
    "HAMMALİYE",
    "PRİM",
    "DORSE HASARI",
    "OTOPARK ÜCRETİ",
    "KÖPRÜ/HGS",
    "ÇEKİCİ HASARI",
];

const filterInitial = {
    search: "",
    gelirGider: "Tümü",
    startDate: "",
    endDate: "",
    minAmount: "",
    maxAmount: "",
};

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

function bugununTarihi() {
    return new Date().toISOString().slice(0, 10);
}

function otomatikDonem() {
    const aylar = [
        "Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran",
        "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık",
    ];

    const now = new Date();
    return `${now.getFullYear()} ${aylar[now.getMonth()]}`;
}

function getInitialForm() {
    const aktifKullanici = getAktifKullanici();

    const kullaniciAdi =
        aktifKullanici?.ad ||
        aktifKullanici?.ad_soyad ||
        aktifKullanici?.kullanici ||
        aktifKullanici?.kullanici_adi ||
        aktifKullanici?.email ||
        "Kullanıcı";

    return {
        gelirGider: "",
        seferNo: "",
        tarih: bugununTarihi(),
        plaka: "",
        adSoyad: "",
        surucuTel: "",
        yuklemeMusteri: "",
        faturaMusteri: "",
        bolgePaletSayisi: "",
        odenenTutar: "",
        paletSayisi: "",
        donem: otomatikDonem(),
        kullanici: kullaniciAdi,
    };
}

function formatCurrency(value) {
    return Number(value || 0).toLocaleString("tr-TR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
}

function formatDateForDisplay(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

function mapRowToForm(row) {
    return {
        gelirGider: row.gelir_gider || "",
        seferNo: row.sefer_no || "",
        tarih: row.tarih || bugununTarihi(),
        plaka: row.plaka || "",
        adSoyad: row.ad_soyad || "",
        surucuTel: row.surucu_tel || "",
        yuklemeMusteri: row.yukleme_musteri || "",
        faturaMusteri: row.fatura_musteri || "",
        bolgePaletSayisi: row.bolge_palet_sayisi || "",
        odenenTutar: row.odenen_tutar ?? "",
        paletSayisi: row.palet_sayisi ?? "",
        donem: row.donem || otomatikDonem(),
        kullanici: row.kullanici || getInitialForm().kullanici,
    };
}

export default function HandlingFee() {
    const [form, setForm] = useState(getInitialForm);
    const [kayitlar, setKayitlar] = useState([]);
    const [loading, setLoading] = useState(false);
    const [editingRow, setEditingRow] = useState(null);
    const [filters, setFilters] = useState(filterInitial);
    const [showFilters, setShowFilters] = useState(true);

    useEffect(() => {
        verileriGetir();
    }, []);

    async function verileriGetir() {
        setLoading(true);

        try {
            setKayitlar(await listHandlingFees());
        } catch (error) {
            console.error("Hamaliye verileri alınamadı:", error);
            alert("Veriler alınamadı: " + error.message);
        } finally {
            setLoading(false);
        }
    }

    const filteredKayitlar = useMemo(() => {
        return filterHandlingFees(kayitlar, filters);
    }, [kayitlar, filters]);

    const stats = useMemo(() => {
        return summarizeHandlingFees(filteredKayitlar);
    }, [filteredKayitlar]);

    const activeFilterCount = useMemo(() => {
        return Object.entries(filters).filter(([key, value]) => {
            if (key === "gelirGider") return value !== "Tümü";
            return Boolean(value);
        }).length;
    }, [filters]);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleFilterChange = (e) => {
        const { name, value } = e.target;

        setFilters((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    function resetForm() {
        setForm(getInitialForm());
        setEditingRow(null);
    }

    function duzenle(item) {
        setEditingRow(item);
        setForm(mapRowToForm(item));
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    const kaydet = async (e) => {
        e.preventDefault();

        if (!form.gelirGider || !form.seferNo) {
            alert("Gelir/Gider ve Sefer No alanları zorunludur.");
            return;
        }

        setLoading(true);

        const payload = buildHandlingFeePayload(form);

        try {
            await saveHandlingFee({ id: editingRow?.id, payload });
        } catch (error) {
            console.error("Hamaliye kayıt hatası:", error);
            alert("Kayıt yapılamadı: " + error.message);
            return;
        } finally {
            setLoading(false);
        }

        resetForm();
        await verileriGetir();
    };

    const sil = async (id) => {
        const onay = window.confirm("Bu kaydı silmek istiyor musunuz?");
        if (!onay) return;

        try {
            await deleteHandlingFee(id);
        } catch (error) {
            console.error("Hamaliye silme hatası:", error);
            alert("Kayıt silinemedi: " + error.message);
            return;
        }

        if (editingRow?.id === id) resetForm();
        await verileriGetir();
    };

    return (
        <div className="hamaliye-page">
            <div className="hamaliye-hero">
                <div>
                    <span className="hamaliye-eyebrow">Hakedişler</span>
                    <h1>Hamaliye Yönetimi</h1>
                    <p>
                        Hamaliye, prim, hasar, otopark, HGS ve çekici giderlerini
                        sefer bazlı kaydedin, filtreleyin ve gerektiğinde düzenleyin.
                    </p>
                </div>

                <div className="hamaliye-summary-grid">
                    <div className="hamaliye-summary">
                        <span>Gösterilen Kayıt</span>
                        <strong>{stats.count}</strong>
                    </div>
                    <div className="hamaliye-summary">
                        <span>Toplam Tutar</span>
                        <strong>{formatCurrency(stats.totalAmount)} ₺</strong>
                    </div>
                    <div className="hamaliye-summary">
                        <span>Toplam Palet</span>
                        <strong>{stats.totalPallet}</strong>
                    </div>
                    <div className="hamaliye-summary">
                        <span>Sefer Sayısı</span>
                        <strong>{stats.uniqueTripCount}</strong>
                    </div>
                </div>
            </div>

            <form className="hamaliye-form-card" onSubmit={kaydet}>
                <div className="hamaliye-section-title with-action">
                    <div>
                        <span>{editingRow ? "Kayıt Güncelleme" : "Yeni Kayıt"}</span>
                        <h2>{editingRow ? "Kayıt Düzenle" : "Yeni Hamaliye Kaydı"}</h2>
                        <p>{editingRow ? "Seçili kaydın bilgilerini güncelleyebilirsiniz." : "Gerekli alanları doldurup kaydı oluşturun."}</p>
                    </div>

                    {editingRow && (
                        <button type="button" className="hamaliye-ghost-btn" onClick={resetForm}>
                            Düzenlemeyi İptal Et
                        </button>
                    )}
                </div>

                <div className="hamaliye-form-grid">
                    <div className="hamaliye-field">
                        <label>Gelir/Gider</label>
                        <select name="gelirGider" value={form.gelirGider} onChange={handleChange}>
                            <option value="">Seçiniz</option>
                            {giderSecenekleri.map((item) => (
                                <option key={item} value={item}>{item}</option>
                            ))}
                        </select>
                    </div>

                    <div className="hamaliye-field">
                        <label>Sefer No</label>
                        <input name="seferNo" value={form.seferNo} onChange={handleChange} placeholder="SFR..." />
                    </div>

                    <div className="hamaliye-field">
                        <label>Tarih</label>
                        <input type="date" name="tarih" value={form.tarih} onChange={handleChange} />
                    </div>

                    <div className="hamaliye-field">
                        <label>Plaka</label>
                        <input name="plaka" value={form.plaka} onChange={handleChange} placeholder="34 ABC 123" />
                    </div>

                    <div className="hamaliye-field">
                        <label>Ad/Soyad</label>
                        <input name="adSoyad" value={form.adSoyad} onChange={handleChange} />
                    </div>

                    <div className="hamaliye-field">
                        <label>Sürücü Tel</label>
                        <input name="surucuTel" value={form.surucuTel} onChange={handleChange} />
                    </div>

                    <div className="hamaliye-field">
                        <label>Yükleme Müşteri</label>
                        <input name="yuklemeMusteri" value={form.yuklemeMusteri} onChange={handleChange} />
                    </div>

                    <div className="hamaliye-field">
                        <label>Fatura Müşteri</label>
                        <input name="faturaMusteri" value={form.faturaMusteri} onChange={handleChange} />
                    </div>

                    <div className="hamaliye-field wide">
                        <label>Bölge ve Palet Sayısı</label>
                        <input name="bolgePaletSayisi" value={form.bolgePaletSayisi} onChange={handleChange} />
                    </div>

                    <div className="hamaliye-field">
                        <label>Ödenen Tutar</label>
                        <input type="number" name="odenenTutar" value={form.odenenTutar} onChange={handleChange} />
                    </div>

                    <div className="hamaliye-field">
                        <label>Palet Sayısı</label>
                        <input type="number" name="paletSayisi" value={form.paletSayisi} onChange={handleChange} />
                    </div>

                    <div className="hamaliye-field readonly">
                        <label>Dönem</label>
                        <input name="donem" value={form.donem} readOnly />
                    </div>

                    <div className="hamaliye-field readonly">
                        <label>Kullanıcı</label>
                        <input name="kullanici" value={form.kullanici} readOnly />
                    </div>
                </div>

                <div className="hamaliye-actions">
                    {editingRow && (
                        <button type="button" className="hamaliye-cancel-btn" onClick={resetForm}>
                            Vazgeç
                        </button>
                    )}
                    <button type="submit" disabled={loading}>
                        {loading ? "İşleniyor..." : editingRow ? "Güncelle" : "Kaydet"}
                    </button>
                </div>
            </form>

            <div className="hamaliye-filter-panel">
                <div className="hamaliye-filter-head">
                    <div>
                        <span>Filtreleme</span>
                        <h2>Kayıtları Süz</h2>
                    </div>

                    <div className="hamaliye-filter-actions">
                        {activeFilterCount > 0 && <strong>{activeFilterCount} aktif filtre</strong>}
                        <button type="button" onClick={() => setShowFilters((prev) => !prev)}>
                            {showFilters ? "Filtreleri Gizle" : "Filtreleri Göster"}
                        </button>
                        <button type="button" className="danger" onClick={() => setFilters(filterInitial)}>
                            Temizle
                        </button>
                    </div>
                </div>

                {showFilters && (
                    <div className="hamaliye-filter-grid">
                        <div className="hamaliye-filter-field search">
                            <label>Genel Arama</label>
                            <input
                                name="search"
                                value={filters.search}
                                onChange={handleFilterChange}
                                placeholder="Sefer no, plaka, sürücü, müşteri ara..."
                            />
                        </div>

                        <div className="hamaliye-filter-field">
                            <label>Gelir/Gider</label>
                            <select name="gelirGider" value={filters.gelirGider} onChange={handleFilterChange}>
                                <option value="Tümü">Tümü</option>
                                {giderSecenekleri.map((item) => (
                                    <option key={item} value={item}>{item}</option>
                                ))}
                            </select>
                        </div>

                        <div className="hamaliye-filter-field">
                            <label>Başlangıç</label>
                            <input type="date" name="startDate" value={filters.startDate} onChange={handleFilterChange} />
                        </div>

                        <div className="hamaliye-filter-field">
                            <label>Bitiş</label>
                            <input type="date" name="endDate" value={filters.endDate} onChange={handleFilterChange} />
                        </div>

                        <div className="hamaliye-filter-field">
                            <label>Min Tutar</label>
                            <input type="number" name="minAmount" value={filters.minAmount} onChange={handleFilterChange} />
                        </div>

                        <div className="hamaliye-filter-field">
                            <label>Max Tutar</label>
                            <input type="number" name="maxAmount" value={filters.maxAmount} onChange={handleFilterChange} />
                        </div>
                    </div>
                )}
            </div>

            <div className="hamaliye-table-card">
                <div className="hamaliye-table-head">
                    <div>
                        <span>Kayıt Listesi</span>
                        <h2>Kayıtlar</h2>
                        <p>{filteredKayitlar.length} kayıt gösteriliyor. Toplam {formatCurrency(stats.totalAmount)} ₺</p>
                    </div>
                </div>

                <div className="hamaliye-table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>İşlem</th>
                                <th>Gelir/Gider</th>
                                <th>Sefer No</th>
                                <th>Tarih</th>
                                <th>Plaka</th>
                                <th>Ad/Soyad</th>
                                <th>Sürücü Tel</th>
                                <th>Yükleme Müşteri</th>
                                <th>Fatura Müşteri</th>
                                <th>Bölge ve Palet</th>
                                <th>Ödenen Tutar</th>
                                <th>Palet</th>
                                <th>Dönem</th>
                                <th>Kullanıcı</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredKayitlar.length === 0 ? (
                                <tr>
                                    <td colSpan="14" className="hamaliye-empty-row">
                                        {loading ? "Veriler yükleniyor..." : "Filtreye uygun kayıt bulunamadı."}
                                    </td>
                                </tr>
                            ) : (
                                filteredKayitlar.map((item) => (
                                    <tr key={item.id} className={editingRow?.id === item.id ? "editing-row" : ""}>
                                        <td>
                                            <div className="hamaliye-row-actions">
                                                <button type="button" className="hamaliye-edit-btn" onClick={() => duzenle(item)}>
                                                    Düzenle
                                                </button>
                                                <button type="button" className="hamaliye-delete-btn" onClick={() => sil(item.id)}>
                                                    Sil
                                                </button>
                                            </div>
                                        </td>
                                        <td><span className="type-badge">{item.gelir_gider}</span></td>
                                        <td><span className="trip-badge">{item.sefer_no}</span></td>
                                        <td>{formatDateForDisplay(item.tarih)}</td>
                                        <td><span className="plate-badge">{item.plaka || "—"}</span></td>
                                        <td>{item.ad_soyad || "—"}</td>
                                        <td>{item.surucu_tel || "—"}</td>
                                        <td>{item.yukleme_musteri || "—"}</td>
                                        <td>{item.fatura_musteri || "—"}</td>
                                        <td>{item.bolge_palet_sayisi || "—"}</td>
                                        <td><strong>{formatCurrency(item.odenen_tutar)} ₺</strong></td>
                                        <td>{item.palet_sayisi || "—"}</td>
                                        <td>{item.donem || "—"}</td>
                                        <td>{item.kullanici || "—"}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
