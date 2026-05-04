import { useState } from "react";
import "./Home.css";
import AktifSeferler from "./AktifSeferler";
import TamamlananSeferler from "./TamamlananSeferler";
import AracDurumlari from "./AracDurumları";
import YuklemedeBekleme from "./Raporlar/YuklemedeBekleme";
import TeslimdeBekleme from "./Raporlar/TeslimdeBekleme";
import KullaniciKPI from "./Raporlar/kullanicikpi";
import AracFiyatYonetimi from "./Hakedisler/AracFiyatYonetimi";
import HayatKimyaYakitHakedis from "./Hakedisler/HayatKimyaYakitHakedis";
import PepsiYakitHakedis from "./Hakedisler/PepsiYakitHakedis";

type HomeProps = {
    onLogout: () => void;
};

type MenuGroup = {
    title: string;
    icon: string;
    items: string[];
};

const menuGroups: MenuGroup[] = [
    {
        title: "Kullanıcı İşlemleri",
        icon: "👤",
        items: ["Aktif Seferler", "Tamamlanan Seferler"],
    },
    {
        title: "Araç Yönetimi",
        icon: "🚚",
        items: ["Araç Durumları"],
    },
    {
        title: "Raporlar",
        icon: "📊",
        items: ["Kullanıcı KPİ", "Yüklemede Bekleme", "Teslimde Bekleme"],
    },
    {
        title: "Hakedişler",
        icon: "₺",
        items: [
            "Hayat Kimya YHH",
            "Pepsi YHH",
            "Frigo YHH",
            "Sefer Kira & Sürücü Hakediş",
            "Plaka Kira & Sürücü Tutarları",
            "Filo %12 İskontolu Yakıt",
            "Tedarikçi Masraf",
            "Hamaliye",
        ],
    },
    {
        title: "Kayıt İşlemleri",
        icon: "📝",
        items: ["KM Kayıt"],
    },
    {
        title: "Görevler",
        icon: "✅",
        items: ["Tüm Görevler", "Görev Ata", "Bana Gelen Görevler"],
    },
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

function Home({ onLogout }: HomeProps) {
    const [activePage, setActivePage] = useState("Dashboard");

    const aktifKullanici = getAktifKullanici();

    const kullaniciAdi =
        aktifKullanici?.ad ||
        aktifKullanici?.kullanici ||
        aktifKullanici?.kullanici_adi ||
        aktifKullanici?.email ||
        "Kullanıcı";

    const kullaniciRol = aktifKullanici?.rol || "Kullanıcı";

    const avatarLetter = String(kullaniciAdi || "K").charAt(0).toUpperCase();

    const renderPage = () => {
        if (activePage === "Aktif Seferler") return <AktifSeferler />;

        if (activePage === "Tamamlanan Seferler") return <TamamlananSeferler />;

        if (activePage === "Araç Durumları") return <AracDurumlari />;

        if (activePage === "Yüklemede Bekleme") return <YuklemedeBekleme />;

        if (activePage === "Teslimde Bekleme") return <TeslimdeBekleme />;

        if (activePage === "Kullanıcı KPİ") return <KullaniciKPI />;

        if (activePage === "Plaka Kira & Sürücü Tutarları") return <AracFiyatYonetimi />;

        if (activePage === "Hayat Kimya YHH") return <HayatKimyaYakitHakedis />;

        if (activePage === "Pepsi YHH") return <PepsiYakitHakedis />;

        return (
            <section className="hero-panel">
                <div>
                    <span className="eyebrow">Aktif Sayfa</span>
                    <h1>{activePage}</h1>
                    <p>Seçilen modül için içerik alanı burada görüntülenecek.</p>
                </div>

                <div className="system-card">
                    <span className="pulse" />
                    Sistem Aktif
                </div>
            </section>
        );
    };

    return (
        <div className="home-container">
            <header className="topbar">
                <div className="brand" onClick={() => setActivePage("Dashboard")}>
                    <div className="brand-logo">F</div>

                    <div className="brand-text">
                        <strong>FTS</strong>
                        <span>Fleet Tracking System</span>
                    </div>
                </div>

                <nav className="nav-menu">
                    {menuGroups.map((group) => (
                        <div className="nav-group" key={group.title}>
                            <button className="nav-button" type="button">
                                <span className="nav-icon">{group.icon}</span>
                                {group.title}
                                <span className="nav-arrow">⌄</span>
                            </button>

                            <div className="mega-menu">
                                <div className="mega-header">
                                    <div className="mega-icon">{group.icon}</div>

                                    <div>
                                        <h3>{group.title}</h3>
                                        <p>{group.items.length} işlem</p>
                                    </div>
                                </div>

                                <div className="mega-list">
                                    {group.items.map((item) => (
                                        <button
                                            key={item}
                                            type="button"
                                            className={`mega-item ${activePage === item ? "active" : ""}`}
                                            onClick={() => setActivePage(item)}
                                        >
                                            <span>{item}</span>
                                            <small>→</small>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="top-actions">
                    <button className="notification-btn" type="button">
                        🔔
                        <span />
                    </button>

                    <div className="profile">
                        <div className="avatar">{avatarLetter}</div>

                        <div>
                            <strong>{kullaniciAdi}</strong>
                            <span>{kullaniciRol}</span>
                        </div>
                    </div>

                    <button onClick={onLogout} className="logout-btn">
                        Çıkış
                    </button>
                </div>
            </header>

            <main className="main-content">{renderPage()}</main>
        </div>
    );
}

export default Home;