import { useEffect, useMemo, useState } from "react";
import {
    ArrowRight, Check, Eye, EyeOff, LockKeyhole, Moon, Route,
    ShieldCheck, Sparkles, Sun, UserPlus, UserRound, Wifi, BadgeCheck,
} from "lucide-react";
import { supabase } from "../supabaseClient";
import ftsLogo from "../assets/fts-logo.png";
import "./Login.css";

type KullaniciYetki = Record<string, unknown>;
type KullaniciSession = { id: string; kullanici: string; ad: string; rol: string; yetki: KullaniciYetki; };
type LoginProps = { onLogin: (user?: KullaniciSession) => void; };
type Theme = "light" | "dark";
type AuthMode = "login" | "register";

function getInitialTheme(): Theme {
    const saved = localStorage.getItem("fts_theme");
    if (saved === "light" || saved === "dark") return saved;
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const trUpper = (value: string) => value.toLocaleUpperCase("tr-TR");

function Login({ onLogin }: LoginProps) {
    const savedUser = localStorage.getItem("fts_kullanici");
    const [mode, setMode] = useState<AuthMode>("login");
    const [kullanici, setKullanici] = useState(savedUser ?? "");
    const [sifre, setSifre] = useState("");
    const [adSoyad, setAdSoyad] = useState("");
    const [kayitKullanici, setKayitKullanici] = useState("");
    const [kayitSifre, setKayitSifre] = useState("");
    const [kayitSifreTekrar, setKayitSifreTekrar] = useState("");
    const [remember, setRemember] = useState(Boolean(savedUser));
    const [showPassword, setShowPassword] = useState(false);
    const [showRegisterPassword, setShowRegisterPassword] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [theme, setTheme] = useState<Theme>(getInitialTheme);

    useEffect(() => {
        document.body.classList.add("login-body");
        document.documentElement.dataset.theme = theme;
        document.documentElement.style.colorScheme = theme;
        localStorage.setItem("fts_theme", theme);
        return () => document.body.classList.remove("login-body");
    }, [theme]);

    const greeting = useMemo(() => {
        const hour = new Date().getHours();
        if (hour < 12) return "Günaydın";
        if (hour < 18) return "İyi günler";
        return "İyi akşamlar";
    }, []);

    const clearMessages = () => { setErrorMessage(""); setSuccessMessage(""); };
    const changeMode = (next: AuthMode) => { setMode(next); clearMessages(); setSuccess(false); };

    const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); clearMessages();
        const cleanUser = kullanici.trim();
        if (!cleanUser || !sifre) { setErrorMessage("Kullanıcı adı ve şifre alanlarını doldurun."); return; }
        setLoading(true);
        try {
            const { data, error } = await supabase.from("kullanicilar")
                .select("id, kullanici, sifre, ad, rol, yetki, aktif")
                .eq("kullanici", cleanUser).maybeSingle();
            if (error) throw error;
            if (!data || data.sifre !== sifre) { setErrorMessage("Kullanıcı adı veya şifre hatalı."); setSifre(""); return; }
            if (data.aktif === false) { setErrorMessage("Bu kullanıcı pasif durumda. Yöneticinizle iletişime geçin."); return; }
            const sessionUser: KullaniciSession = { id: data.id, kullanici: data.kullanici, ad: data.ad, rol: data.rol, yetki: data.yetki || {} };
            remember ? localStorage.setItem("fts_kullanici", cleanUser) : localStorage.removeItem("fts_kullanici");
            localStorage.setItem("fts_user", JSON.stringify(sessionUser));
            setSuccess(true);
            window.setTimeout(() => onLogin(sessionUser), 400);
        } catch (err) {
            console.error("Giriş hatası:", err);
            setErrorMessage("Giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.");
        } finally { setLoading(false); }
    };

    const handleRegister = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault(); clearMessages();
        const cleanName = trUpper(adSoyad.trim().replace(/\s+/g, " "));
        const cleanUsername = kayitKullanici.trim();
        if (cleanName.length < 3) { setErrorMessage("Ad soyad alanını eksiksiz doldurun."); return; }
        if (cleanUsername.length < 3) { setErrorMessage("Kullanıcı adı en az 3 karakter olmalıdır."); return; }
        if (/\s/.test(cleanUsername)) { setErrorMessage("Kullanıcı adında boşluk kullanılamaz."); return; }
        if (kayitSifre.length < 6) { setErrorMessage("Şifre en az 6 karakter olmalıdır."); return; }
        if (kayitSifre !== kayitSifreTekrar) { setErrorMessage("Şifreler birbiriyle eşleşmiyor."); return; }
        setLoading(true);
        try {
            const { data: existing, error: checkError } = await supabase.from("kullanicilar")
                .select("id").eq("kullanici", cleanUsername).maybeSingle();
            if (checkError) throw checkError;
            if (existing) { setErrorMessage("Bu kullanıcı adı zaten kullanılıyor. Başka bir kullanıcı adı seçin."); return; }
            const { error } = await supabase.from("kullanicilar").insert({
                ad: cleanName, kullanici: cleanUsername, sifre: kayitSifre,
                rol: "KULLANICI",
                // Yeni kayıt olan kullanıcılar yalnızca ANA MENÜ ve OPERASYON
                // ekranlarını görüntüleyebilir. RAPORLAMA, HAKEDİŞLER ve SİSTEM
                // için başlangıçta hiçbir yetki verilmez.
                yetki: [
                    { page: "Dashboard", actions: ["view"] },
                    { page: "Aktif Seferler", actions: ["view"] },
                    { page: "Tamamlanan Seferler", actions: ["view"] },
                    { page: "Araç Durumları", actions: ["view"] },
                    { page: "Araç Takibi", actions: ["view"] },
                    { page: "Playback", actions: ["view"] },
                    { page: "Geofence", actions: ["view"] },
                    { page: "Operasyon Merkezi", actions: ["view"] },
                    { page: "Alarm Merkezi", actions: ["view"] },
                ],
                aktif: true,
            });
            if (error) throw error;
            setSuccessMessage("Hesabınız başarıyla oluşturuldu. Şimdi giriş yapabilirsiniz.");
            setKullanici(cleanUsername); setSifre(""); setAdSoyad(""); setKayitKullanici(""); setKayitSifre(""); setKayitSifreTekrar("");
            setMode("login");
        } catch (err) {
            console.error("Kayıt hatası:", err);
            setErrorMessage("Kayıt oluşturulamadı. Veritabanı izinlerini kontrol edip tekrar deneyin.");
        } finally { setLoading(false); }
    };

    return (
        <div className="login-page">
            <div className="login-backdrop login-backdrop-a" /><div className="login-backdrop login-backdrop-b" /><div className="login-grid" />
            <header className="login-topbar">
                <div className="login-brand"><div className="login-logo-wrap"><img src={ftsLogo} alt="FTS" className="login-logo-image" /></div><div><strong>FTS</strong><span>Odak Lojistik · Operasyon Platformu</span></div></div>
                <div className="login-topbar-actions"><span className="system-online"><i /> Sistem aktif</span><button type="button" className="theme-toggle" onClick={() => setTheme(t => t === "dark" ? "light" : "dark")} aria-label="Tema değiştir">{theme === "dark" ? <Sun size={17}/> : <Moon size={17}/>}</button></div>
            </header>
            <div className="login-layout">
                <section className="login-story" aria-label="FTS operasyon özeti">
                    <div className="story-copy"><span className="story-kicker"><Sparkles size={15}/> FTS OPERASYON SUITE</span><h1>Operasyonun kontrolü tek ekranda.</h1><p>Sefer, araç, rota, ETA ve operasyon süreçlerinizi FTS ile tek merkezden güvenle yönetin.</p></div>
                    <div className="network-visual" aria-hidden="true"><div className="network-ring ring-one"/><div className="network-ring ring-two"/><div className="network-core"><Route size={28}/><strong>FTS</strong><span>Live Ops</span></div><span className="network-point point-one"><Wifi size={14}/></span><span className="network-point point-two"><ShieldCheck size={14}/></span><span className="network-point point-three"><Route size={14}/></span></div>
                    <div className="story-status-grid"><article><div className="status-icon"><Route size={18}/></div><div><strong>Canlı operasyon</strong><span>Sefer ve rota takibi</span></div></article><article><div className="status-icon"><ShieldCheck size={18}/></div><div><strong>Güvenli erişim</strong><span>Rol bazlı yetkilendirme</span></div></article><article><div className="status-icon"><Wifi size={18}/></div><div><strong>Entegre veri</strong><span>TMS & saha akışı</span></div></article></div>
                </section>
                <main className="login-panel">
                    <div className="login-panel-inner">
                        <div className="auth-tabs" role="tablist"><button type="button" className={mode === "login" ? "active" : ""} onClick={() => changeMode("login")}><LockKeyhole size={16}/> Giriş Yap</button><button type="button" className={mode === "register" ? "active" : ""} onClick={() => changeMode("register")}><UserPlus size={16}/> Kayıt Ol</button></div>
                        <div className="login-card-header"><span className="login-eyebrow">{mode === "login" ? <><LockKeyhole size={14}/> Güvenli giriş</> : <><BadgeCheck size={14}/> Yeni hesap</>}</span><h2>{mode === "login" ? greeting : "Aramıza katılın"}</h2><p>{mode === "login" ? "FTS hesabınızla operasyon paneline giriş yapın." : "Bilgilerinizi girerek FTS hesabınızı oluşturun."}</p></div>
                        {errorMessage && <div className="login-alert" role="alert"><span>!</span><p>{errorMessage}</p></div>}
                        {successMessage && <div className="login-alert login-alert-success" role="status"><Check size={18}/><p>{successMessage}</p></div>}
                        {mode === "login" ? (
                            <form onSubmit={handleLogin} className="login-form" noValidate>
                                <Field label="Kullanıcı adı" icon={<UserRound size={18}/>}><input type="text" autoComplete="username" placeholder="Kullanıcı adınızı yazın" value={kullanici} onChange={e => {setKullanici(e.target.value); clearMessages();}} /></Field>
                                <Field label="Şifre" icon={<LockKeyhole size={18}/>} action={<PasswordButton shown={showPassword} onClick={() => setShowPassword(v=>!v)}/>}><input type={showPassword ? "text" : "password"} autoComplete="current-password" placeholder="Şifrenizi yazın" value={sifre} onChange={e => {setSifre(e.target.value); clearMessages();}} /></Field>
                                <div className="form-options"><label className="remember"><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/><span className="remember-box"><Check size={13}/></span><span>Beni hatırla</span></label><span className="secure-note"><ShieldCheck size={14}/> Güvenli oturum</span></div>
                                <SubmitButton loading={loading} success={success} label="Giriş yap" />
                            </form>
                        ) : (
                            <form onSubmit={handleRegister} className="login-form" noValidate>
                                <Field label="Ad Soyad" hint="Otomatik büyük harfe çevrilir" icon={<UserRound size={18}/>}><input type="text" autoComplete="name" placeholder="AD SOYAD" value={adSoyad} onChange={e => {setAdSoyad(trUpper(e.target.value)); clearMessages();}} /></Field>
                                <Field label="Kullanıcı adı" icon={<UserPlus size={18}/>}><input type="text" autoComplete="username" placeholder="Kullanıcı adınızı belirleyin" value={kayitKullanici} onChange={e => {setKayitKullanici(e.target.value); clearMessages();}} /></Field>
                                <Field label="Şifre" hint="En az 6 karakter" icon={<LockKeyhole size={18}/>} action={<PasswordButton shown={showRegisterPassword} onClick={()=>setShowRegisterPassword(v=>!v)}/>}><input type={showRegisterPassword ? "text" : "password"} autoComplete="new-password" placeholder="Şifrenizi belirleyin" value={kayitSifre} onChange={e => {setKayitSifre(e.target.value); clearMessages();}} /></Field>
                                <Field label="Şifre Tekrar" icon={<LockKeyhole size={18}/>}><input type={showRegisterPassword ? "text" : "password"} autoComplete="new-password" placeholder="Şifrenizi tekrar yazın" value={kayitSifreTekrar} onChange={e => {setKayitSifreTekrar(e.target.value); clearMessages();}} /></Field>
                                <button type="submit" className="login-btn" disabled={loading}>{loading ? <><span className="btn-spinner"/> Hesap oluşturuluyor</> : <>Hesap oluştur <ArrowRight size={18}/></>}</button>
                                <p className="register-note"><ShieldCheck size={14}/> Yeni hesaplar standart kullanıcı yetkisiyle oluşturulur.</p>
                            </form>
                        )}
                    </div>
                    <div className="login-panel-footer"><span>FTS · Fleet Tracking System</span><span>Odak Lojistik</span></div>
                </main>
            </div>
        </div>
    );
}

function Field({label, hint, icon, action, children}:{label:string; hint?:string; icon:React.ReactNode; action?:React.ReactNode; children:React.ReactNode}) {
    return <div className="form-group"><div className="field-label-row"><label>{label}</label>{hint && <span>{hint}</span>}</div><div className="input-shell">{icon}{children}{action}</div></div>;
}
function PasswordButton({shown,onClick}:{shown:boolean;onClick:()=>void}) { return <button type="button" className="password-toggle" onClick={onClick} aria-label={shown?"Şifreyi gizle":"Şifreyi göster"}>{shown?<EyeOff size={18}/>:<Eye size={18}/>}</button>; }
function SubmitButton({loading,success,label}:{loading:boolean;success:boolean;label:string}) { return <button type="submit" className={`login-btn ${success?"success":""}`} disabled={loading||success}>{loading?<><span className="btn-spinner"/> Doğrulanıyor</>:success?<><Check size={18}/> Giriş başarılı</>:<>{label}<ArrowRight size={18}/></>}</button>; }

export default Login;
