import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight,
    Check,
    Eye,
    EyeOff,
    LockKeyhole,
    Moon,
    Route,
    ShieldCheck,
    Sparkles,
    Sun,
    UserRound,
    UserPlus,
    Wifi,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import ftsLogo from "../assets/fts-logo.png";
import "./Login.css";

type KullaniciYetki = Array<{ page: string; actions: string[] }>;

type KullaniciSession = {
    id: string;
    kullanici: string;
    ad: string;
    rol: string;
    yetki: KullaniciYetki;
};

type LoginProps = {
    onLogin: (user?: KullaniciSession) => void;
};

type Theme = "light" | "dark";

// Yeni kayıt olan standart kullanıcıların başlangıç yetkileri:
// ANA MENÜ + OPERASYON açık; RAPORLAMA + HAKEDİŞLER + SİSTEM kapalıdır.
const DEFAULT_REGISTER_PERMISSIONS: KullaniciYetki = [
    { page: "Dashboard", actions: ["view"] },
    { page: "Aktif Seferler", actions: ["view"] },
    { page: "Tamamlanan Seferler", actions: ["view"] },
    { page: "Araç Durumları", actions: ["view"] },
    { page: "Araç Takibi", actions: ["view"] },
    { page: "Playback", actions: ["view"] },
    { page: "Geofence", actions: ["view"] },
    { page: "Operasyon Merkezi", actions: ["view"] },
    { page: "Alarm Merkezi", actions: ["view"] },
];

function getInitialTheme(): Theme {
    const saved = localStorage.getItem("fts_theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function Login({ onLogin }: LoginProps) {
    const savedUser = localStorage.getItem("fts_kullanici");

    const [kullanici, setKullanici] = useState(savedUser ?? "");
    const [sifre, setSifre] = useState("");
    const [remember, setRemember] = useState(Boolean(savedUser));
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [theme, setTheme] = useState<Theme>(getInitialTheme);
    const [fieldError, setFieldError] = useState<"kullanici" | "sifre" | "all" | null>(null);
    const [mode, setMode] = useState<"login" | "register">("login");
    const [adSoyad, setAdSoyad] = useState("");
    const [sifreTekrar, setSifreTekrar] = useState("");

    useEffect(() => {
        document.body.classList.add("login-body");
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
        localStorage.setItem("fts_theme", theme);

        return () => {
            document.body.classList.remove("login-body");
        };
    }, [theme]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Günaydın";
        if (hour < 18) return "İyi günler";
        return "İyi akşamlar";
    }, []);

    const clearError = () => {
        setErrorMessage("");
        setFieldError(null);
    };

    const switchMode = (nextMode: "login" | "register") => {
        setMode(nextMode);
        clearError();
        setSifre("");
        setSifreTekrar("");
        setSuccess(false);
    };

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        clearError();

        const cleanName = adSoyad.trim().toLocaleUpperCase("tr-TR");
        const cleanUser = kullanici.trim();
        if (!cleanName || !cleanUser || !sifre || !sifreTekrar) {
            setErrorMessage("Ad soyad, kullanıcı adı ve şifre alanlarının tamamını doldurun.");
            setFieldError("all");
            return;
        }
        if (cleanUser.length < 3) {
            setErrorMessage("Kullanıcı adı en az 3 karakter olmalıdır.");
            setFieldError("kullanici");
            return;
        }
        if (sifre.length < 4) {
            setErrorMessage("Şifre en az 4 karakter olmalıdır.");
            setFieldError("sifre");
            return;
        }
        if (sifre !== sifreTekrar) {
            setErrorMessage("Şifreler birbiriyle eşleşmiyor.");
            setFieldError("sifre");
            return;
        }

        setLoading(true);
        try {
            const { data: existing, error: lookupError } = await supabase
                .from("kullanicilar")
                .select("id")
                .ilike("kullanici", cleanUser)
                .maybeSingle();
            if (lookupError) throw lookupError;
            if (existing) {
                setErrorMessage("Bu kullanıcı adı zaten kullanılıyor.");
                setFieldError("kullanici");
                return;
            }

            const { error } = await supabase.from("kullanicilar").insert({
                ad: cleanName,
                kullanici: cleanUser,
                sifre,
                rol: "KULLANICI",
                aktif: true,
                yetki: DEFAULT_REGISTER_PERMISSIONS,
            });
            if (error) throw error;

            setSuccess(true);
            setErrorMessage("");
            window.setTimeout(() => {
                setSuccess(false);
                switchMode("login");
                setKullanici(cleanUser);
                setAdSoyad("");
            }, 700);
        } catch (err) {
            console.error("Kayıt hatası:", err);
            setErrorMessage("Kayıt oluşturulamadı. Veritabanı izinlerini kontrol edip tekrar deneyin.");
            setFieldError("all");
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        clearError();

        const cleanUser = kullanici.trim();

        if (!cleanUser) {
            setErrorMessage("Kullanıcı adı boş bırakılamaz.");
            setFieldError("kullanici");
            return;
        }

        if (!sifre) {
            setErrorMessage("Şifre boş bırakılamaz.");
            setFieldError("sifre");
            return;
        }

        setLoading(true);

        try {
            const { data, error } = await supabase
                .from("kullanicilar")
                .select("id, kullanici, sifre, ad, rol, yetki, aktif")
                .ilike("kullanici", cleanUser)
                .maybeSingle();

            if (error) throw error;

            if (!data) {
                setErrorMessage("Kullanıcı bulunamadı.");
                setFieldError("all");
                setSifre("");
                return;
            }

            if (data.aktif === false) {
                setErrorMessage("Bu kullanıcı pasif durumda. Yöneticinizle iletişime geçin.");
                setFieldError("all");
                setSifre("");
                return;
            }

            if (data.sifre !== sifre) {
                setErrorMessage("Kullanıcı adı veya şifre hatalı.");
                setFieldError("all");
                setSifre("");
                return;
            }

            const sessionUser: KullaniciSession = {
                id: data.id,
                kullanici: data.kullanici,
                ad: data.ad,
                rol: data.rol,
                yetki: Array.isArray(data.yetki) ? data.yetki : [],
            };

            if (remember) {
                localStorage.setItem("fts_kullanici", cleanUser);
            } else {
                localStorage.removeItem("fts_kullanici");
            }

            localStorage.setItem("fts_user", JSON.stringify(sessionUser));
            setSuccess(true);

            window.setTimeout(() => {
                onLogin(sessionUser);
            }, 450);
        } catch (err) {
            console.error("Giriş hatası:", err);
            setErrorMessage("Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.");
            setFieldError("all");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-backdrop login-backdrop-a" />
            <div className="login-backdrop login-backdrop-b" />
            <div className="login-grid" />

            <header className="login-topbar">
                <div className="login-brand">
                    <div className="login-logo-wrap">
                        <img src={ftsLogo} alt="FTS" className="login-logo-image" />
                    </div>
                    <div>
                        <strong>FTS</strong>
                        <span>Odak Lojistik · Operasyon Platformu</span>
                    </div>
                </div>

                <div className="login-topbar-actions">
                    <span className="system-online"><i /> Sistem aktif</span>
                    <button
                        type="button"
                        className="theme-toggle"
                        onClick={() => setTheme((current) => current === "dark" ? "light" : "dark")}
                        aria-label={theme === "dark" ? "Açık temaya geç" : "Koyu temaya geç"}
                        title={theme === "dark" ? "Açık tema" : "Koyu tema"}
                    >
                        {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
                    </button>
                </div>
            </header>

            <div className="login-layout">
                <section className="login-story" aria-label="FTS operasyon özeti">
                    <div className="story-copy">
                        <span className="story-kicker"><Sparkles size={15} /> FTS OPERASYON SUITE</span>
                        <h1>Filonuzu tek merkezden yönetin.</h1>
                        <p>
                            Sefer, araç, ETA, rota ve hakediş süreçlerini aynı operasyon ekranında izleyin; ekibiniz doğru veriye daha hızlı ulaşsın.
                        </p>
                    </div>

                    <div className="network-visual" aria-hidden="true">
                        <div className="network-ring ring-one" />
                        <div className="network-ring ring-two" />
                        <div className="network-core">
                            <Route size={28} />
                            <strong>FTS</strong>
                            <span>Live Ops</span>
                        </div>
                        <span className="network-point point-one"><Wifi size={14} /></span>
                        <span className="network-point point-two"><ShieldCheck size={14} /></span>
                        <span className="network-point point-three"><Route size={14} /></span>
                    </div>

                    <div className="story-status-grid">
                        <article>
                            <div className="status-icon"><Route size={18} /></div>
                            <div><strong>Canlı operasyon</strong><span>Sefer ve rota takibi</span></div>
                        </article>
                        <article>
                            <div className="status-icon"><ShieldCheck size={18} /></div>
                            <div><strong>Yetki kontrollü</strong><span>Rol bazlı erişim</span></div>
                        </article>
                        <article>
                            <div className="status-icon"><Wifi size={18} /></div>
                            <div><strong>Entegre veri</strong><span>TMS & saha akışı</span></div>
                        </article>
                    </div>
                </section>

                <main className="login-panel" aria-label="Giriş formu">
                    <div className="login-panel-inner">
                        <div className="login-card-header">
                            <span className="login-eyebrow">{mode === "login" ? <LockKeyhole size={14} /> : <UserPlus size={14} />} {mode === "login" ? "Güvenli giriş" : "Yeni hesap"}</span>
                            <h2>{mode === "login" ? greeting : "Hesap oluştur"}</h2>
                            <p>{mode === "login" ? "FTS hesabınızla operasyon paneline giriş yapın." : "Bilgilerinizi girin, hesabınızı birkaç saniyede oluşturun."}</p>
                        </div>

                        <div className="auth-tabs" role="tablist" aria-label="Hesap işlemleri">
                            <button type="button" className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>Giriş yap</button>
                            <button type="button" className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>Kayıt ol</button>
                        </div>

                        {errorMessage && (
                            <div className="login-alert" role="alert">
                                <span>!</span><p>{errorMessage}</p>
                            </div>
                        )}

                        {mode === "login" ? (
                        <form onSubmit={handleSubmit} className="login-form" noValidate>
                            <div className="form-group">
                                <label htmlFor="kullanici">Kullanıcı adı</label>
                                <div className={`input-shell ${fieldError === "kullanici" || fieldError === "all" ? "input-error" : ""}`}>
                                    <UserRound size={18} />
                                    <input id="kullanici" type="text" autoComplete="username" placeholder="Kullanıcı adınızı yazın" value={kullanici} onChange={(e) => { setKullanici(e.target.value); clearError(); }} />
                                </div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="sifre">Şifre</label>
                                <div className={`input-shell ${fieldError === "sifre" || fieldError === "all" ? "input-error" : ""}`}>
                                    <LockKeyhole size={18} />
                                    <input id="sifre" type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Şifrenizi yazın" value={sifre} onChange={(e) => { setSifre(e.target.value); clearError(); }} />
                                    <button type="button" className="password-toggle" onClick={() => setShowPassword((prev) => !prev)} aria-label={showPassword ? "Şifreyi gizle" : "Şifreyi göster"}>{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                                </div>
                            </div>
                            <div className="form-options">
                                <label className="remember"><input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} /><span className="remember-box"><Check size={13} /></span><span>Beni hatırla</span></label>
                                <span className="secure-note"><ShieldCheck size={14} /> Güvenli oturum</span>
                            </div>
                            <button type="submit" className={`login-btn ${success ? "success" : ""}`} disabled={loading || success}>
                                {loading ? <><span className="btn-spinner" />Doğrulanıyor</> : success ? <><Check size={18} />Giriş başarılı</> : <>Giriş yap<ArrowRight size={18} /></>}
                            </button>
                        </form>
                        ) : (
                        <form onSubmit={handleRegister} className="login-form register-form" noValidate>
                            <div className="form-group">
                                <label htmlFor="adSoyad">Ad soyad</label>
                                <div className={`input-shell ${fieldError === "all" ? "input-error" : ""}`}><UserRound size={18} /><input id="adSoyad" type="text" autoComplete="name" placeholder="Adınızı ve soyadınızı yazın" value={adSoyad} onChange={(e) => { setAdSoyad(e.target.value.toLocaleUpperCase("tr-TR")); clearError(); }} /></div>
                            </div>
                            <div className="form-group">
                                <label htmlFor="registerKullanici">Kullanıcı adı</label>
                                <div className={`input-shell ${fieldError === "kullanici" || fieldError === "all" ? "input-error" : ""}`}><UserRound size={18} /><input id="registerKullanici" type="text" autoComplete="username" placeholder="Örn. gorkem.cadirci" value={kullanici} onChange={(e) => { setKullanici(e.target.value); clearError(); }} /></div>
                            </div>
                            <div className="register-password-grid">
                                <div className="form-group"><label htmlFor="registerSifre">Şifre</label><div className={`input-shell ${fieldError === "sifre" || fieldError === "all" ? "input-error" : ""}`}><LockKeyhole size={18} /><input id="registerSifre" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="En az 4 karakter" value={sifre} onChange={(e) => { setSifre(e.target.value); clearError(); }} /></div></div>
                                <div className="form-group"><label htmlFor="sifreTekrar">Şifre tekrar</label><div className={`input-shell ${fieldError === "sifre" || fieldError === "all" ? "input-error" : ""}`}><LockKeyhole size={18} /><input id="sifreTekrar" type={showPassword ? "text" : "password"} autoComplete="new-password" placeholder="Şifreyi tekrar yazın" value={sifreTekrar} onChange={(e) => { setSifreTekrar(e.target.value); clearError(); }} /></div></div>
                            </div>
                            <div className="register-note"><ShieldCheck size={15} /><span>Hesap standart kullanıcı rolüyle oluşturulur. Ana Menü ve Operasyon ekranları otomatik açılır; Raporlama, Hakedişler ve Sistem ekranları kapalıdır.</span></div>
                            <button type="submit" className={`login-btn ${success ? "success" : ""}`} disabled={loading || success}>
                                {loading ? <><span className="btn-spinner" />Hesap oluşturuluyor</> : success ? <><Check size={18} />Hesap oluşturuldu</> : <><UserPlus size={18} />Kayıt ol</>}
                            </button>
                        </form>
                        )}

                        <div className="login-trust-note">
                            <ShieldCheck size={17} />
                            <p>Rol ve ekran yetkileri hesabınıza göre otomatik uygulanır.</p>
                        </div>
                    </div>

                    <div className="login-panel-footer">
                        <span>FTS · Fleet Tracking System</span>
                        <span>Odak Lojistik</span>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Login;
