import { useEffect, useMemo, useRef, useState, type ComponentType } from "react";
import {
  LayoutDashboard, Route, CheckCircle2, Truck, MapPinned, History,
  Fence, RadioTower, BellRing, BarChart3, UserRoundCog, Clock3,
  PackageCheck, WalletCards, FileSpreadsheet, ClipboardList, ListChecks,
  ShieldCheck, LogOut, PanelLeftClose, PanelLeftOpen, Search, Command,
  Sparkles, X, ArrowRight, CircleDot, Sun, Moon, ChevronRight, Zap, Wifi,
  BadgeDollarSign, HandCoins, ReceiptText, BadgePercent, Calculator, Fuel, Snowflake, Baby, Layers3
} from "lucide-react";
import "./Home.css";
import logo from "../assets/fts-logo.png";

import AktifSeferler from "./AktifSeferler";
import TamamlananSeferler from "./TamamlananSeferler";
import AracDurumlari from "./AracDurumlari";
import AracTakibi from "./AracTakibi";
import YuklemedeBekleme from "./Raporlar/YuklemedeBekleme";
import TeslimdeBekleme from "./Raporlar/TeslimdeBekleme";
import KullaniciKPI from "./Raporlar/kullanicikpi";
import AracFiyatYonetimi from "./Hakedisler/AracFiyatYonetimi";
import HayatKimyaYakitHakedis from "./Hakedisler/HayatKimyaYakitHakedis";
import PepsiYakitHakedis from "./Hakedisler/PepsiYakitHakedis";
import Hamaliye from "./Hakedisler/Hamaliye";
import EbebekYakitHakedis from "./Hakedisler/EbebekYakitHakedis";
import FrigoYakitHakedis from "./Hakedisler/FrigoYakitHakedis";
import FrigoHesaplamaPage from "./Hakedisler/FrigoHesaplamaPage";
import FiloIskontoluHakedis from "./Hakedisler/FiloIskontoluHakedis";
import HakedisSeferleri from "./Hakedisler/HakedisSeferleri";
import TedarikciMasraf from "./Hakedisler/TedarikciMasraf";
import HakedisMerkezi from "./Hakedisler/HakedisMerkezi";
import HakedisExperience from "./Hakedisler/shared/HakedisExperience";
import YonetimPaneli from "./Yonetici/YonetimPaneli";
import Alarmlar from "./Alarmlar";
import Dashboard from "./Dashboard";
import Playback from "./Playback";
import Geofence from "./Geofence";
import OperasyonMerkezi from "./OperasyonMerkezi";
import NotificationCenter from "../components/NotificationCenter/NotificationCenter";
import InteractionFeedback from "../components/Premium/InteractionFeedback";

type HomeProps = { onLogout: () => void };
type NavItem = { label: string; icon: ComponentType<{ size?: number; strokeWidth?: number }> };
type NavSection = { title: string; items: NavItem[] };

const navSections: NavSection[] = [
  { title: "ANA MENÜ", items: [
    { label: "Dashboard", icon: LayoutDashboard },
    { label: "Aktif Seferler", icon: Route },
    { label: "Tamamlanan Seferler", icon: CheckCircle2 },
  ]},
  { title: "OPERASYON", items: [
    { label: "Araç Durumları", icon: Truck },
    { label: "Araç Takibi", icon: MapPinned },
    { label: "Playback", icon: History },
    { label: "Geofence", icon: Fence },
    { label: "Operasyon Merkezi", icon: RadioTower },
    { label: "Alarm Merkezi", icon: BellRing },
  ]},
  { title: "RAPORLAMA", items: [
    { label: "Kullanıcı KPİ", icon: BarChart3 },
    { label: "Yüklemede Bekleme", icon: Clock3 },
    { label: "Teslimde Bekleme", icon: PackageCheck },
  ]},
  { title: "HAKEDİŞLER", items: [
    { label: "Hakediş Merkezi", icon: Layers3 },
    { label: "Araç Cari & Fiyat", icon: BadgeDollarSign },
    { label: "Tedarikçi Masraf", icon: HandCoins },
    { label: "Hakediş Seferleri", icon: ReceiptText },
    { label: "Hamaliye", icon: ClipboardList },
    { label: "Filo İskontolu Hakediş", icon: BadgePercent },
    { label: "Frigo Hesaplama", icon: Calculator },
    { label: "Frigo Yakıt Hakediş", icon: Snowflake },
    { label: "Pepsi Yakıt Hakediş", icon: Fuel },
    { label: "Hayat Kimya Yakıt Hakediş", icon: Fuel },
    { label: "Ebebek Yakıt Hakediş", icon: Baby },
  ]},
  { title: "SİSTEM", items: [
    { label: "Yönetim Paneli", icon: ShieldCheck },
  ]},
];

function getAktifKullanici() {
  try {
    return JSON.parse(localStorage.getItem("fts_user") || "null") ||
      JSON.parse(localStorage.getItem("kullanici") || "null") ||
      JSON.parse(localStorage.getItem("aktifKullanici") || "null") ||
      JSON.parse(localStorage.getItem("user") || "null") || null;
  } catch { return null; }
}

export default function Home({ onLogout }: HomeProps) {
  const [activePage, setActivePage] = useState("Dashboard");
  const [menuOpen, setMenuOpen] = useState(() => localStorage.getItem("fts_sidebar_pinned") === "1");
  const [commandOpen, setCommandOpen] = useState(false);
  const [commandQuery, setCommandQuery] = useState("");
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const saved = localStorage.getItem("fts_theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });
  const commandInputRef = useRef<HTMLInputElement | null>(null);
  const user = getAktifKullanici();
  const userName = user?.ad || user?.kullanici || user?.kullanici_adi || user?.email || "Kullanıcı";
  const role = user?.rol || "Kullanıcı";
  const avatar = String(userName).charAt(0).toUpperCase();
  const allNavItems = useMemo(() => navSections.flatMap((section) => section.items.map((item) => ({ ...item, section: section.title }))), []);
  const filteredCommands = useMemo(() => {
    const q = commandQuery.trim().toLocaleLowerCase("tr-TR");
    if (!q) return allNavItems;
    return allNavItems.filter((item) => `${item.label} ${item.section}`.toLocaleLowerCase("tr-TR").includes(q));
  }, [allNavItems, commandQuery]);


  useEffect(() => {
    localStorage.setItem("fts_sidebar_pinned", menuOpen ? "1" : "0");
  }, [menuOpen]);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;
    localStorage.setItem("fts_theme", theme);
  }, [theme]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setCommandOpen((value) => !value);
      }
      if (event.key === "Escape") setCommandOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    if (!commandOpen) return;
    setCommandQuery("");
    requestAnimationFrame(() => commandInputRef.current?.focus());
  }, [commandOpen]);

  function navigate(label: string) {
    setActivePage(label);
    setCommandOpen(false);
  }

  function handleNotificationVehicleOpen(plate: string) {
    if (!plate) return;
    localStorage.setItem("fts_focus_plate", plate);
    navigate("Operasyon Merkezi");
  }

  const renderPage = () => {
    if (activePage === "Dashboard") return <Dashboard onNavigate={navigate} />;
    if (activePage === "Aktif Seferler") return <AktifSeferler />;
    if (activePage === "Tamamlanan Seferler") return <TamamlananSeferler />;
    if (activePage === "Araç Durumları") return <AracDurumlari />;
    if (activePage === "Araç Takibi") return <AracTakibi onNavigate={navigate} />;
    if (activePage === "Playback") return <Playback />;
    if (activePage === "Geofence") return <Geofence />;
    if (activePage === "Alarm Merkezi") return <Alarmlar />;
    if (activePage === "Operasyon Merkezi") return <OperasyonMerkezi onNavigate={navigate} />;
    if (activePage === "Yüklemede Bekleme") return <YuklemedeBekleme />;
    if (activePage === "Teslimde Bekleme") return <TeslimdeBekleme />;
    if (activePage === "Kullanıcı KPİ") return <KullaniciKPI />;
    if (activePage === "Hakediş Merkezi") return <HakedisMerkezi onNavigate={navigate} />;
    if (activePage === "Araç Cari & Fiyat") return <HakedisExperience page={activePage} onNavigate={navigate}><AracFiyatYonetimi onNavigate={navigate} /></HakedisExperience>;
    if (activePage === "Hayat Kimya Yakıt Hakediş") return <HakedisExperience page={activePage} onNavigate={navigate}><HayatKimyaYakitHakedis /></HakedisExperience>;
    if (activePage === "Pepsi Yakıt Hakediş") return <HakedisExperience page={activePage} onNavigate={navigate}><PepsiYakitHakedis /></HakedisExperience>;
    if (activePage === "Hamaliye") return <HakedisExperience page={activePage} onNavigate={navigate}><Hamaliye /></HakedisExperience>;
    if (activePage === "Ebebek Yakıt Hakediş") return <HakedisExperience page={activePage} onNavigate={navigate}><EbebekYakitHakedis /></HakedisExperience>;
    if (activePage === "Frigo Yakıt Hakediş") return <HakedisExperience page={activePage} onNavigate={navigate}><FrigoYakitHakedis /></HakedisExperience>;
    if (activePage === "Frigo Hesaplama") return <HakedisExperience page={activePage} onNavigate={navigate}><FrigoHesaplamaPage /></HakedisExperience>;
    if (activePage === "Filo İskontolu Hakediş") return <HakedisExperience page={activePage} onNavigate={navigate}><FiloIskontoluHakedis /></HakedisExperience>;
    if (activePage === "Hakediş Seferleri") return <HakedisExperience page={activePage} onNavigate={navigate}><HakedisSeferleri onNavigate={navigate} onFileReady={() => {}} /></HakedisExperience>;
    if (activePage === "Tedarikçi Masraf") return <HakedisExperience page={activePage} onNavigate={navigate}><TedarikciMasraf onNavigate={navigate} /></HakedisExperience>;
    if (activePage === "Yönetim Paneli") return <YonetimPaneli />;
    return <div className="fts-placeholder"><ListChecks size={28}/><h2>{activePage}</h2><p>Bu modül sonraki tasarım turunda yenilenecek.</p></div>;
  };

  return (
    <div className="home-container premium-shell">
      <InteractionFeedback />

      <aside className={`sidebar ${menuOpen ? "is-open" : ""}`} aria-label="Ana menü" onKeyDown={(event) => { if (event.key === "Escape" && !menuOpen) { (event.target as HTMLElement).blur(); } }}>
        <span className="sidebar-ambient sidebar-ambient-one" aria-hidden="true" />
        <span className="sidebar-ambient sidebar-ambient-two" aria-hidden="true" />
        <button className="sidebar-brand" data-feedback-label="Dashboard" onClick={() => navigate("Dashboard")} type="button">
          <span className="sidebar-logo-shell"><img src={logo} alt="Filo Takip Sistemi" /><i className="sidebar-logo-pulse" /></span>
          <span className="sidebar-brand-copy"><b>Filo Takip</b><small><span className="sidebar-live-dot"/> Operations Suite</small></span>
          <ChevronRight className="sidebar-brand-arrow" size={16}/>
        </button>

        <div className="sidebar-top-actions">
          <button className="sidebar-toggle" type="button" aria-label={menuOpen ? "Menü sabitlemesini kaldır" : "Menüyü sabitle"} aria-expanded={menuOpen} aria-controls="main-navigation" onClick={(event) => { setMenuOpen(!menuOpen); event.currentTarget.blur(); }}>
            {menuOpen ? <PanelLeftClose size={17}/> : <PanelLeftOpen size={17}/>}<span>{menuOpen ? "Dar moda geç" : "Menüyü sabitle"}</span>
          </button>
          <button className="sidebar-command" type="button" onClick={() => setCommandOpen(true)} aria-label="Hızlı erişimi aç">
            <Search size={16}/><span>Hızlı erişim</span><kbd>⌘K</kbd>
          </button>
        </div>

        <nav className="sidebar-nav" id="main-navigation" aria-label="Sayfalar">
          {navSections.map((section) => (
            <div className="sidebar-section" key={section.title}>
              <div className="sidebar-section-title">{section.title}</div>
              {section.items.map(({ label, icon: Icon }) => (
                <button
                  key={label}
                  type="button"
                  className={`sidebar-link ${activePage === label ? "active" : ""}`}
                  aria-label={label}
                  title={label}
                  aria-current={activePage === label ? "page" : undefined}
                  onClick={(event) => { navigate(label); if (event.detail > 0) event.currentTarget.blur(); }}
                >
                  <span className="sidebar-link-glow" aria-hidden="true" />
                  <span className="sidebar-link-icon"><Icon size={18} strokeWidth={2} /></span>
                  <span className="sidebar-link-label">{label}</span>
                  {label === "Operasyon Merkezi" && <span className="sidebar-link-badge"><Zap size={10}/> CANLI</span>}
                  {activePage === label && <span className="sidebar-active-dot" aria-hidden="true" />}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-system-card">
            <span className="sidebar-system-icon"><Wifi size={15}/><i/></span>
            <span className="sidebar-system-copy"><strong>Sistem çevrimiçi</strong><small>Servisler çalışıyor</small></span>
            <span className="sidebar-system-badge">LIVE</span>
          </div>
          <div className="sidebar-quick-row">
            <div className="sidebar-notification-row">
              <NotificationCenter onOpenVehicle={handleNotificationVehicleOpen} />
              <span>Bildirimler</span>
            </div>
            <button className="sidebar-theme-mini" type="button" aria-label={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"} title={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"} onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")}>
              <span>{theme === "dark" ? <Sun size={16}/> : <Moon size={16}/>}</span><b>{theme === "dark" ? "Açık tema" : "Koyu tema"}</b>
            </button>
          </div>
          <button className="sidebar-profile" aria-label="Kullanıcı profili" title="Kullanıcı profili" type="button" onClick={() => navigate("Yönetim Paneli")}>
            <span className="sidebar-avatar">{avatar}<i/></span>
            <span className="sidebar-profile-copy"><strong>{userName}</strong><small>{role}</small></span>
            <span className="sidebar-profile-go"><UserRoundCog size={16}/></span>
          </button>
          <button className="sidebar-logout" aria-label="Çıkış Yap" title="Çıkış Yap" onClick={onLogout} type="button"><LogOut size={16}/><span>Çıkış Yap</span><ChevronRight className="sidebar-logout-arrow" size={14}/></button>
        </div>
      </aside>

      <main className="main-content">
        <div className="premium-appbar">
          <div className="premium-appbar-page"><span className="premium-appbar-icon"><Sparkles size={15}/></span><div><small>FTS / Operasyon</small><strong>{activePage}</strong></div></div>
          <button className="premium-command-trigger" type="button" onClick={() => setCommandOpen(true)} aria-label="Hızlı erişimi aç">
            <Search size={16}/><span>Sayfa veya işlem ara...</span><kbd><Command size={12}/> K</kbd>
          </button>
          <button
            className="premium-theme-toggle"
            type="button"
            data-feedback-label={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
            aria-label={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
            title={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
            onClick={() => setTheme((value) => value === "dark" ? "light" : "dark")}
          >
            <span className="premium-theme-toggle-track" aria-hidden="true">
              <Sun size={14} className="theme-sun"/>
              <Moon size={14} className="theme-moon"/>
              <i />
            </span>
            <span>{theme === "dark" ? "Koyu" : "Açık"}</span>
          </button>
          <div className="premium-live-chip"><CircleDot size={14}/><span>Sistem aktif</span></div>
        </div>
        <div className="content-frame"><div key={activePage} className="premium-page-enter">{renderPage()}</div></div>
      </main>

      {commandOpen && (
        <div className="premium-command-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setCommandOpen(false); }}>
          <div className="premium-command-panel" role="dialog" aria-modal="true" aria-label="Hızlı erişim">
            <div className="premium-command-search"><Search size={19}/><input ref={commandInputRef} value={commandQuery} onChange={(event) => setCommandQuery(event.target.value)} placeholder="Dashboard, araç takibi, alarm..." /><button data-feedback="off" type="button" aria-label="Kapat" onClick={() => setCommandOpen(false)}><X size={17}/></button></div>
            <div className="premium-command-hint"><Sparkles size={14}/><span>Menüde dolaşmadan istediğin ekrana anında geç.</span><kbd>ESC</kbd></div>
            <div className="premium-command-results">
              {filteredCommands.length ? filteredCommands.map(({ label, icon: Icon, section }) => (
                <button type="button" key={label} onClick={() => navigate(label)} className={activePage === label ? "active" : ""}>
                  <span className="premium-command-result-icon"><Icon size={17}/></span><span><strong>{label}</strong><small>{section}</small></span><ArrowRight size={15}/>
                </button>
              )) : <div className="premium-command-empty">Aramana uygun ekran bulunamadı.</div>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
