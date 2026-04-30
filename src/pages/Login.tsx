import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";
import "./Login.css";

type KullaniciYetki = Record<string, unknown>;

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

function Login({ onLogin }: LoginProps) {
    const savedUser = localStorage.getItem("fts_kullanici");

    const [kullanici, setKullanici] = useState(savedUser ?? "");
    const [sifre, setSifre] = useState("");
    const [remember, setRemember] = useState(Boolean(savedUser));
    const [showPassword, setShowPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [fieldError, setFieldError] = useState<"kullanici" | "sifre" | "all" | null>(null);

    useEffect(() => {
        document.body.classList.add("login-body");

        return () => {
            document.body.classList.remove("login-body");
        };
    }, []);

    const clearError = () => {
        setErrorMessage("");
        setFieldError(null);
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
                .eq("kullanici", cleanUser)
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
                yetki: data.yetki || {},
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
            <div className="ambient ambient-one" />
            <div className="ambient ambient-two" />
            <div className="grid-glow" />

            <div className="login-shell">
                <section className="login-hero" aria-label="FTS sistem tanıtımı">
                    <div className="brand-topline">
                        <div className="fts-logo" aria-label="FTS">
                            <span>F</span>
                            <span>T</span>
                            <span>S</span>
                        </div>

                        <div className="brand-meta">
                            <strong>Fleet Tracking System</strong>
                            <span>Lojistik operasyon paneli</span>
                        </div>
                    </div>

                    <div className="hero-center">
                        <div className="orbital-card">
                            <div className="orbit orbit-a" />
                            <div className="orbit orbit-b" />
                            <div className="orbit orbit-c" />
                            <div className="orb-core">FTS</div>
                            <span className="route-node node-a" />
                            <span className="route-node node-b" />
                            <span className="route-node node-c" />
                        </div>

                        <span className="hero-chip">Canlı operasyon akışı</span>
                        <h1>Seferleri daha net, daha hızlı yönetin.</h1>
                        <p>
                            Aktif seferler, ETA, rota detayları ve kullanıcı yetkileri FTS üzerinde tek, sade ve modern bir panelde birleşir.
                        </p>
                    </div>

                    <div className="hero-metrics">
                        <div>
                            <strong>7/24</strong>
                            <span>Operasyon</span>
                        </div>
                        <div>
                            <strong>JSONB</strong>
                            <span>Yetki modeli</span>
                        </div>
                        <div>
                            <strong>TMS</strong>
                            <span>Veri senkronu</span>
                        </div>
                    </div>
                </section>

                <main className="login-card" aria-label="Giriş formu">
                    <div className="mobile-brand">
                        <div className="fts-logo small">
                            <span>F</span>
                            <span>T</span>
                            <span>S</span>
                        </div>
                        <span>Fleet Tracking System</span>
                    </div>

                    <div className="login-card-header">
                        <span className="login-eyebrow">Güvenli Giriş</span>
                        <h2>FTS’ye giriş yap</h2>
                        <p>Kullanıcı adı ve şifrenizle operasyon paneline erişin.</p>
                    </div>

                    {errorMessage && (
                        <div className="login-alert" role="alert">
                            {errorMessage}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="login-form" noValidate>
                        <div className="form-group">
                            <label htmlFor="kullanici">Kullanıcı</label>
                            <input
                                id="kullanici"
                                type="text"
                                autoComplete="username"
                                placeholder="Kullanıcı adınız"
                                value={kullanici}
                                className={fieldError === "kullanici" || fieldError === "all" ? "input-error" : ""}
                                onChange={(e) => {
                                    setKullanici(e.target.value);
                                    clearError();
                                }}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="sifre">Şifre</label>

                            <div className="password-wrapper">
                                <input
                                    id="sifre"
                                    type={showPassword ? "text" : "password"}
                                    autoComplete="current-password"
                                    placeholder="Şifreniz"
                                    value={sifre}
                                    className={fieldError === "sifre" || fieldError === "all" ? "input-error" : ""}
                                    onChange={(e) => {
                                        setSifre(e.target.value);
                                        clearError();
                                    }}
                                />

                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPassword((prev) => !prev)}
                                >
                                    {showPassword ? "Gizle" : "Göster"}
                                </button>
                            </div>
                        </div>

                        <div className="form-options">
                            <label className="remember">
                                <input
                                    type="checkbox"
                                    checked={remember}
                                    onChange={(e) => setRemember(e.target.checked)}
                                />
                                <span>Beni hatırla</span>
                            </label>

                            <span className="secure-note">Yetkiler tablo üzerinden okunur</span>
                        </div>

                        <button
                            type="submit"
                            className={`login-btn ${success ? "success" : ""}`}
                            disabled={loading || success}
                        >
                            {loading ? (
                                <span className="btn-spinner" aria-hidden="true" />
                            ) : success ? (
                                <>
                                    <span className="check-icon">✓</span>
                                    Giriş başarılı
                                </>
                            ) : (
                                <>
                                    Giriş yap
                                    <span className="arrow-icon">→</span>
                                </>
                            )}
                        </button>
                    </form>

                    <div className="login-footer-note">
                        <span>FTS</span>
                        <p>Rol ve yetki bilgileri <strong>kullanicilar.yetki</strong> JSONB alanından alınır.</p>
                    </div>
                </main>
            </div>
        </div>
    );
}

export default Login;
