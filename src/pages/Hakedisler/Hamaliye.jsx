import { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import "./Hamaliye.css";

const giderSecenekleri = [
    "HAMMALİYE",
    "PRİM",
    "DORSE HASARI",
    "OTOPARK ÜCRETİ",
    "KÖPRÜ/HGS",
    "ÇEKİCİ HASARI",
];

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

export default function Hamaliye() {
    const [form, setForm] = useState(getInitialForm);
    const [kayitlar, setKayitlar] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        verileriGetir();
    }, []);

    async function verileriGetir() {
        setLoading(true);

        const { data, error } = await supabase
            .from("hamaliye_kayitlari")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            console.error("Hamaliye verileri alınamadı:", error);
            alert("Veriler alınamadı: " + error.message);
        } else {
            setKayitlar(data || []);
        }

        setLoading(false);
    }

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const kaydet = async (e) => {
        e.preventDefault();

        if (!form.gelirGider || !form.seferNo) {
            alert("Gelir/Gider ve Sefer No alanları zorunludur.");
            return;
        }

        const yeniKayit = {
            gelir_gider: form.gelirGider,
            sefer_no: form.seferNo,
            tarih: form.tarih || null,
            plaka: form.plaka,
            ad_soyad: form.adSoyad,
            surucu_tel: form.surucuTel,
            yukleme_musteri: form.yuklemeMusteri,
            fatura_musteri: form.faturaMusteri,
            bolge_palet_sayisi: form.bolgePaletSayisi,
            odenen_tutar: form.odenenTutar ? Number(form.odenenTutar) : 0,
            palet_sayisi: form.paletSayisi ? Number(form.paletSayisi) : 0,
            donem: form.donem,
            kullanici: form.kullanici,
        };

        const { error } = await supabase
            .from("hamaliye_kayitlari")
            .insert([yeniKayit]);

        if (error) {
            console.error("Hamaliye kayıt hatası:", error);
            alert("Kayıt yapılamadı: " + error.message);
            return;
        }

        setForm(getInitialForm());
        await verileriGetir();
    };

    const sil = async (id) => {
        const onay = window.confirm("Bu kaydı silmek istiyor musunuz?");
        if (!onay) return;

        const { error } = await supabase
            .from("hamaliye_kayitlari")
            .delete()
            .eq("id", id);

        if (error) {
            console.error("Hamaliye silme hatası:", error);
            alert("Kayıt silinemedi: " + error.message);
            return;
        }

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
                        sefer bazlı olarak kaydedebilirsiniz.
                    </p>
                </div>

                <div className="hamaliye-summary">
                    <span>Toplam Kayıt</span>
                    <strong>{kayitlar.length}</strong>
                </div>
            </div>

            <form className="hamaliye-form-card" onSubmit={kaydet}>
                <div className="hamaliye-section-title">
                    <h2>Yeni Kayıt</h2>
                    <p>Gerekli alanları doldurup kaydı oluşturun.</p>
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
                        <input name="seferNo" value={form.seferNo} onChange={handleChange} />
                    </div>

                    <div className="hamaliye-field">
                        <label>Tarih</label>
                        <input type="date" name="tarih" value={form.tarih} onChange={handleChange} />
                    </div>

                    <div className="hamaliye-field">
                        <label>Plaka</label>
                        <input name="plaka" value={form.plaka} onChange={handleChange} />
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
                    <button type="submit" disabled={loading}>
                        {loading ? "İşleniyor..." : "Kaydet"}
                    </button>
                </div>
            </form>

            <div className="hamaliye-table-card">
                <div className="hamaliye-table-head">
                    <div>
                        <h2>Kayıtlar</h2>
                        <p>Supabase üzerinde kayıtlı hamaliye giderleri.</p>
                    </div>
                </div>

                <div className="hamaliye-table-wrapper">
                    <table>
                        <thead>
                            <tr>
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
                                <th>İşlem</th>
                            </tr>
                        </thead>

                        <tbody>
                            {kayitlar.length === 0 ? (
                                <tr>
                                    <td colSpan="14" className="hamaliye-empty-row">
                                        {loading ? "Veriler yükleniyor..." : "Henüz kayıt eklenmedi."}
                                    </td>
                                </tr>
                            ) : (
                                kayitlar.map((item) => (
                                    <tr key={item.id}>
                                        <td><span className="type-badge">{item.gelir_gider}</span></td>
                                        <td>{item.sefer_no}</td>
                                        <td>{item.tarih}</td>
                                        <td>{item.plaka}</td>
                                        <td>{item.ad_soyad}</td>
                                        <td>{item.surucu_tel}</td>
                                        <td>{item.yukleme_musteri}</td>
                                        <td>{item.fatura_musteri}</td>
                                        <td>{item.bolge_palet_sayisi}</td>
                                        <td>{Number(item.odenen_tutar || 0).toLocaleString("tr-TR")} ₺</td>
                                        <td>{item.palet_sayisi}</td>
                                        <td>{item.donem}</td>
                                        <td>{item.kullanici}</td>
                                        <td>
                                            <button type="button" className="hamaliye-delete-btn" onClick={() => sil(item.id)}>
                                                Sil
                                            </button>
                                        </td>
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