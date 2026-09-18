import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    Ban,
    Check,
    CheckCircle2,
    ChevronRight,
    Clock3,
    Download,
    Eye,
    FileKey2,
    KeyRound,
    Layers3,
    LockKeyhole,
    Pencil,
    Plus,
    RefreshCw,
    RotateCcw,
    Save,
    Search,
    ShieldCheck,
    Sparkles,
    Trash2,
    UserCheck,
    UserPlus,
    UserRound,
    Users,
    X,
    XCircle,
} from "lucide-react";
import { supabase } from "../../supabaseClient";
import "./YonetimPaneli.css";

const pageGroups = [
    { title: "Kullanıcı İşlemleri", icon: UserRound, pages: ["Aktif Seferler", "Tamamlanan Seferler"] },
    { title: "Araç & Operasyon", icon: Layers3, pages: ["Araç Durumları", "Araç Takibi", "Playback", "Geofence", "Operasyon Merkezi", "Alarm Merkezi"] },
    { title: "Raporlar", icon: FileKey2, pages: ["Kullanıcı KPİ", "Yüklemede Bekleme", "Teslimde Bekleme"] },
    {
        title: "Hakedişler",
        icon: Download,
        pages: [
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
    { title: "Kayıt İşlemleri", icon: Pencil, pages: ["KM Kayıt"] },
    { title: "Görevler", icon: CheckCircle2, pages: ["Tüm Görevler", "Görev Ata", "Bana Gelen Görevler"] },
    { title: "Sistem", icon: ShieldCheck, pages: ["Yönetim Paneli"] },
];

const allPages = pageGroups.flatMap((group) => group.pages);

const actions = [
    { key: "view", label: "Görüntüle", icon: Eye },
    { key: "create", label: "Ekle", icon: Plus },
    { key: "update", label: "Düzenle", icon: Pencil },
    { key: "delete", label: "Sil", icon: Trash2 },
    { key: "export", label: "Dışa Aktar", icon: Download },
];

const emptyNewUser = { ad: "", kullanici: "", sifre: "", rol: "KULLANICI", aktif: true };

const normalizePermissions = (value) =>
    Array.isArray(value)
        ? value.map((item) => ({
              page: item.page,
              actions: Array.isArray(item.actions) ? [...item.actions] : [],
          }))
        : [];

const permissionsSignature = (value) =>
    JSON.stringify(
        normalizePermissions(value)
            .map((item) => ({ page: item.page, actions: [...item.actions].sort() }))
            .sort((a, b) => a.page.localeCompare(b.page, "tr"))
    );

const hasPermissionSafe = (permissions, page, action) => permissions.find((item) => item.page === page)?.actions?.includes(action) || false;

function YonetimPaneli() {
    const [kullanicilar, setKullanicilar] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [permissions, setPermissions] = useState([]);
    const [activeGroup, setActiveGroup] = useState(pageGroups[0].title);
    const [searchText, setSearchText] = useState("");
    const [userFilter, setUserFilter] = useState("all");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState(null);
    const [recentLogs, setRecentLogs] = useState([]);
    const [activityLoading, setActivityLoading] = useState(false);
    const [createOpen, setCreateOpen] = useState(false);
    const [newUser, setNewUser] = useState(emptyNewUser);
    const [creatingUser, setCreatingUser] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState("");
    const [deletingUser, setDeletingUser] = useState(false);
    const [statusSaving, setStatusSaving] = useState(false);

    useEffect(() => {
        kullanicilariGetir();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            setPermissions(normalizePermissions(selectedUser.yetki));
            loadRecentActivity(selectedUser);
        } else {
            setPermissions([]);
            setRecentLogs([]);
        }
    }, [selectedUser]);

    const kullanicilariGetir = async () => {
        try {
            setLoading(true);
            setMessage(null);
            const { data, error } = await supabase
                .from("kullanicilar")
                .select("id, kullanici, ad, rol, yetki, aktif")
                .order("ad", { ascending: true });
            if (error) throw error;
            const users = data || [];
            setKullanicilar(users);
            setSelectedUser((current) => users.find((user) => user.id === current?.id) || users[0] || null);
        } catch (error) {
            console.error("Kullanıcılar alınamadı:", error);
            setMessage({ type: "error", text: "Kullanıcı listesi alınamadı." });
        } finally {
            setLoading(false);
        }
    };

    const loadRecentActivity = async (user) => {
        if (!user) return;
        try {
            setActivityLoading(true);
            const { data, error } = await supabase
                .from("kullanici_islem_loglari")
                .select("*")
                .order("created_at", { ascending: false })
                .limit(300);
            if (error) throw error;
            const keys = [user.kullanici, user.ad].filter(Boolean).map((x) => String(x).toLocaleLowerCase("tr-TR"));
            setRecentLogs((data || []).filter((log) => {
                const who = String(log.kullanici || log.kullanici_ad || "").toLocaleLowerCase("tr-TR");
                return keys.includes(who);
            }).slice(0, 30));
        } catch (error) {
            console.error("Kullanıcı aktivitesi alınamadı:", error);
            setRecentLogs([]);
        } finally {
            setActivityLoading(false);
        }
    };

    const activityLabel = (type) => ({
        SEFER_DETAY_ACMA: "Sefer detayı açtı",
        ETA_ACMA: "ETA ekranını açtı",
        TONAJ_BUTON: "Tonaj işlemi yaptı",
        IKAZ_BUTON: "İkaz işlemi yaptı",
        SEFER_DETAY_GUNCELLEME: "Sefer detayını güncelledi",
        ROTA_SIRASI_VE_DETAY_GUNCELLEME: "Rota sırasını / detayını güncelledi",
        ARAC_EKLEME: "Araç ekledi",
        ARAC_DUZENLEME: "Araç düzenledi",
        ARAC_IZIN_EKLEME: "Araç izni ekledi",
        ARAC_IZIN_SILME: "Araç izni sildi",
        ARAC_KESINTI_EKLEME: "Kesinti ekledi",
        ARAC_KESINTI_SILME: "Kesinti sildi",
        ARAC_ISTEN_CIKARTMA: "Aracı işten çıkarttı",
        ARAC_ANA_LISTEYE_ALMA: "Aracı ana listeye aldı",
    }[type] || type || "İşlem yaptı");

    const filteredUsers = useMemo(() => {
        const text = searchText.trim().toLocaleLowerCase("tr-TR");
        return kullanicilar.filter((user) => {
            if (userFilter === "active" && user.aktif === false) return false;
            if (userFilter === "passive" && user.aktif !== false) return false;
            if (!text) return true;
            const name = `${user.ad || ""} ${user.kullanici || ""} ${user.rol || ""}`.toLocaleLowerCase("tr-TR");
            return name.includes(text);
        });
    }, [kullanicilar, searchText, userFilter]);

    const activePages = pageGroups.find((group) => group.title === activeGroup)?.pages || [];
    const visiblePageCount = permissions.filter((item) => item.actions?.includes("view")).length;
    const totalActionCount = permissions.reduce((total, item) => total + (item.actions?.length || 0), 0);
    const activeUserCount = kullanicilar.filter((user) => user.aktif !== false).length;
    const passiveUserCount = kullanicilar.length - activeUserCount;
    const permissionCoverage = allPages.length ? Math.round((visiblePageCount / allPages.length) * 100) : 0;
    const enabledModuleCount = pageGroups.filter((group) => group.pages.some((page) => hasPermissionSafe(permissions, page, "view"))).length;
    const hasChanges = selectedUser ? permissionsSignature(permissions) !== permissionsSignature(selectedUser.yetki) : false;

    const hasPermission = (page, action) => permissions.find((item) => item.page === page)?.actions?.includes(action) || false;

    const togglePermission = (page, action) => {
        setMessage(null);
        setPermissions((prev) => {
            const existingPage = prev.find((item) => item.page === page);
            if (!existingPage) return [...prev, { page, actions: [action] }];
            const hasAction = existingPage.actions.includes(action);
            return prev.map((item) => item.page !== page ? item : {
                ...item,
                actions: hasAction ? item.actions.filter((itemAction) => itemAction !== action) : [...item.actions, action],
            });
        });
    };

    const setPageActions = (page, enabled) => {
        const nextActions = enabled ? actions.map((item) => item.key) : [];
        setMessage(null);
        setPermissions((prev) => {
            const exists = prev.some((item) => item.page === page);
            if (!exists) return [...prev, { page, actions: nextActions }];
            return prev.map((item) => item.page === page ? { ...item, actions: nextActions } : item);
        });
    };

    const setGroupActions = (enabled) => {
        const nextActions = enabled ? actions.map((item) => item.key) : [];
        setMessage(null);
        setPermissions((prev) => {
            const next = [...prev];
            activePages.forEach((page) => {
                const index = next.findIndex((item) => item.page === page);
                if (index === -1) next.push({ page, actions: nextActions });
                else next[index] = { ...next[index], actions: nextActions };
            });
            return next;
        });
    };

    const resetPermissions = () => {
        if (!selectedUser) return;
        setPermissions(normalizePermissions(selectedUser.yetki));
        setMessage({ type: "info", text: "Kaydedilmemiş değişiklikler geri alındı." });
    };

    const selectUser = (user) => {
        if (hasChanges && selectedUser?.id !== user.id) {
            const accepted = window.confirm("Kaydedilmemiş yetki değişiklikleri var. Kullanıcı değiştirilsin mi?");
            if (!accepted) return;
        }
        setMessage(null);
        setSelectedUser(user);
    };

    const yetkileriKaydet = async () => {
        if (!selectedUser || !hasChanges) return;
        try {
            setSaving(true);
            setMessage(null);
            const { data, error } = await supabase
                .from("kullanicilar")
                .update({ yetki: permissions, updated_at: new Date().toISOString() })
                .eq("id", selectedUser.id)
                .select("id, kullanici, ad, rol, yetki, aktif")
                .single();
            if (error) throw error;
            setKullanicilar((prev) => prev.map((user) => user.id === data.id ? data : user));
            setSelectedUser(data);
            setPermissions(normalizePermissions(data.yetki));
            setMessage({ type: "success", text: "Yetkiler başarıyla kaydedildi." });
        } catch (error) {
            console.error("Yetkiler kaydedilemedi:", error);
            setMessage({ type: "error", text: "Yetkiler kaydedilemedi. Lütfen tekrar deneyin." });
        } finally {
            setSaving(false);
        }
    };

    const createUser = async (event) => {
        event.preventDefault();
        const ad = newUser.ad.trim();
        const kullanici = newUser.kullanici.trim();
        const sifre = newUser.sifre;
        if (!ad || !kullanici || !sifre) {
            setMessage({ type: "error", text: "Ad, kullanıcı adı ve şifre zorunludur." });
            return;
        }
        if (sifre.length < 4) {
            setMessage({ type: "error", text: "Şifre en az 4 karakter olmalıdır." });
            return;
        }
        try {
            setCreatingUser(true);
            const { data, error } = await supabase
                .from("kullanicilar")
                .insert({ ad, kullanici, sifre, rol: newUser.rol || "KULLANICI", aktif: newUser.aktif, yetki: [] })
                .select("id, kullanici, ad, rol, yetki, aktif")
                .single();
            if (error) throw error;
            setKullanicilar((prev) => [...prev, data].sort((a, b) => String(a.ad || a.kullanici).localeCompare(String(b.ad || b.kullanici), "tr")));
            setSelectedUser(data);
            setNewUser(emptyNewUser);
            setCreateOpen(false);
            setMessage({ type: "success", text: `${data.ad || data.kullanici} kullanıcısı oluşturuldu. Şimdi yetkilerini belirleyebilirsiniz.` });
        } catch (error) {
            console.error("Kullanıcı eklenemedi:", error);
            const detail = String(error?.message || "").toLowerCase().includes("duplicate") ? "Bu kullanıcı adı zaten kullanılıyor." : "Kullanıcı oluşturulamadı.";
            setMessage({ type: "error", text: detail });
        } finally {
            setCreatingUser(false);
        }
    };

    const toggleUserStatus = async () => {
        if (!selectedUser) return;
        const nextActive = selectedUser.aktif === false;
        try {
            setStatusSaving(true);
            const { data, error } = await supabase
                .from("kullanicilar")
                .update({ aktif: nextActive, updated_at: new Date().toISOString() })
                .eq("id", selectedUser.id)
                .select("id, kullanici, ad, rol, yetki, aktif")
                .single();
            if (error) throw error;
            setKullanicilar((prev) => prev.map((user) => user.id === data.id ? data : user));
            setSelectedUser(data);
            setMessage({ type: "success", text: `Kullanıcı ${nextActive ? "aktif" : "pasif"} duruma alındı.` });
        } catch (error) {
            console.error("Kullanıcı durumu güncellenemedi:", error);
            setMessage({ type: "error", text: "Kullanıcı durumu güncellenemedi." });
        } finally {
            setStatusSaving(false);
        }
    };

    const deleteUser = async () => {
        if (!selectedUser || deleteConfirm !== selectedUser.kullanici) return;
        try {
            setDeletingUser(true);
            const deletingId = selectedUser.id;
            const deletingName = selectedUser.ad || selectedUser.kullanici;
            const { error } = await supabase.from("kullanicilar").delete().eq("id", deletingId);
            if (error) throw error;
            const remaining = kullanicilar.filter((user) => user.id !== deletingId);
            setKullanicilar(remaining);
            setSelectedUser(remaining[0] || null);
            setDeleteOpen(false);
            setDeleteConfirm("");
            setMessage({ type: "success", text: `${deletingName} kullanıcısı silindi.` });
        } catch (error) {
            console.error("Kullanıcı silinemedi:", error);
            setMessage({ type: "error", text: "Kullanıcı silinemedi. Bağlı kayıtları veya veritabanı yetkilerini kontrol edin." });
        } finally {
            setDeletingUser(false);
        }
    };

    return (
        <div className="admin-console-page">
            <header className="admin-console-hero">
                <div className="admin-console-brand">
                    <div className="admin-console-brand-icon"><ShieldCheck size={22} /></div>
                    <div>
                        <span className="admin-kicker"><Sparkles size={13} /> ADMIN CONTROL CENTER</span>
                        <h1>Yönetim Paneli</h1>
                        <p>Kullanıcıları, erişim kapsamını ve sistem aktivitelerini tek merkezden yönetin.</p>
                    </div>
                </div>
                <div className="admin-hero-actions">
                    <button className="admin-action subtle" type="button" onClick={kullanicilariGetir} disabled={loading}>
                        <RefreshCw size={16} className={loading ? "spin" : ""} /> Yenile
                    </button>
                    <button className="admin-action create" type="button" onClick={() => setCreateOpen(true)}>
                        <UserPlus size={17} /> Yeni Kullanıcı
                    </button>
                    <button className="admin-action save" type="button" onClick={yetkileriKaydet} disabled={!selectedUser || !hasChanges || saving}>
                        <Save size={17} /> {saving ? "Kaydediliyor" : "Yetkileri Kaydet"}
                    </button>
                </div>
            </header>

            <section className="admin-command-strip">
                <div><Users size={18} /><span>Kullanıcılar</span><strong>{kullanicilar.length}</strong><small>{activeUserCount} aktif</small></div>
                <div><Layers3 size={18} /><span>Ekranlar</span><strong>{allPages.length}</strong><small>{pageGroups.length} modül</small></div>
                <div><Eye size={18} /><span>Erişim</span><strong>{permissionCoverage}%</strong><small>{visiblePageCount} ekran açık</small></div>
                <div><KeyRound size={18} /><span>İşlem Yetkisi</span><strong>{totalActionCount}</strong><small>{hasChanges ? "Kaydedilmedi" : "Güncel"}</small></div>
            </section>

            {message && (
                <div className={`admin-console-feedback ${message.type}`}>
                    {message.type === "success" ? <CheckCircle2 size={17} /> : message.type === "error" ? <XCircle size={17} /> : <ShieldCheck size={17} />}
                    <span>{message.text}</span>
                    <button type="button" onClick={() => setMessage(null)}><X size={15} /></button>
                </div>
            )}

            <div className="admin-console-layout">
                <aside className="admin-directory-panel">
                    <div className="admin-panel-heading">
                        <div><Users size={18} /><div><strong>Kullanıcı Dizini</strong><span>{filteredUsers.length} kullanıcı gösteriliyor</span></div></div>
                        <button type="button" className="icon-action" onClick={() => setCreateOpen(true)} title="Yeni kullanıcı"><Plus size={17} /></button>
                    </div>

                    <label className="admin-console-search">
                        <Search size={16} />
                        <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="Ad, kullanıcı veya rol ara" />
                        {searchText && <button type="button" onClick={() => setSearchText("")}><X size={14} /></button>}
                    </label>

                    <div className="admin-directory-filters">
                        <button className={userFilter === "all" ? "active" : ""} onClick={() => setUserFilter("all")}>Tümü <b>{kullanicilar.length}</b></button>
                        <button className={userFilter === "active" ? "active" : ""} onClick={() => setUserFilter("active")}>Aktif <b>{activeUserCount}</b></button>
                        <button className={userFilter === "passive" ? "active" : ""} onClick={() => setUserFilter("passive")}>Pasif <b>{passiveUserCount}</b></button>
                    </div>

                    <div className="admin-directory-list">
                        {filteredUsers.map((user) => {
                            const userPermissions = normalizePermissions(user.yetki);
                            const pageCount = userPermissions.filter((item) => item.actions?.includes("view")).length;
                            return (
                                <button key={user.id} className={`directory-user ${selectedUser?.id === user.id ? "selected" : ""}`} type="button" onClick={() => selectUser(user)}>
                                    <span className="directory-avatar">{String(user.ad || user.kullanici || "K").charAt(0).toUpperCase()}</span>
                                    <span className="directory-copy"><strong>{user.ad || user.kullanici}</strong><small>@{user.kullanici} · {user.rol || "KULLANICI"}</small><em>{pageCount} ekran yetkili</em></span>
                                    <span className={`directory-state ${user.aktif === false ? "passive" : ""}`}>{user.aktif === false ? "Pasif" : "Aktif"}</span>
                                    <ChevronRight className="directory-chevron" size={16} />
                                </button>
                            );
                        })}
                        {!loading && !filteredUsers.length && <div className="directory-empty"><Search size={25} /><strong>Kullanıcı bulunamadı</strong><span>Filtreleri değiştirin.</span></div>}
                    </div>
                </aside>

                <main className="admin-access-workspace">
                    {selectedUser ? (
                        <>
                            <section className="admin-profile-banner">
                                <div className="profile-main">
                                    <span className="profile-avatar">{String(selectedUser.ad || selectedUser.kullanici || "K").charAt(0).toUpperCase()}</span>
                                    <div><span className="admin-kicker">SEÇİLİ KULLANICI</span><h2>{selectedUser.ad || selectedUser.kullanici}</h2><p>@{selectedUser.kullanici} · {selectedUser.rol || "KULLANICI"}</p></div>
                                </div>
                                <div className="profile-actions">
                                    <span className={`profile-status ${selectedUser.aktif === false ? "passive" : ""}`}><i />{selectedUser.aktif === false ? "Pasif kullanıcı" : "Aktif kullanıcı"}</span>
                                    <button className="admin-action subtle" type="button" onClick={toggleUserStatus} disabled={statusSaving}>{selectedUser.aktif === false ? <UserCheck size={16} /> : <Ban size={16} />}{selectedUser.aktif === false ? "Aktifleştir" : "Pasifleştir"}</button>
                                    <button className="admin-action danger" type="button" onClick={() => { setDeleteConfirm(""); setDeleteOpen(true); }}><Trash2 size={16} /> Kullanıcıyı Sil</button>
                                </div>
                            </section>

                            <section className="access-health-grid">
                                <article><span>Erişim kapsamı</span><strong>{permissionCoverage}%</strong><div className="access-progress"><i style={{ width: `${permissionCoverage}%` }} /></div><small>{visiblePageCount}/{allPages.length} ekran</small></article>
                                <article><span>Açık modül</span><strong>{enabledModuleCount}</strong><small>{pageGroups.length} modülden</small></article>
                                <article><span>İşlem yetkisi</span><strong>{totalActionCount}</strong><small>Toplam aksiyon</small></article>
                                <article><span>Son aktivite</span><strong>{recentLogs.length ? new Date(recentLogs[0].created_at).toLocaleDateString("tr-TR") : "—"}</strong><small>{recentLogs.length} kayıt bulundu</small></article>
                            </section>

                            <section className="admin-module-rail">
                                {pageGroups.map((group) => {
                                    const Icon = group.icon;
                                    const granted = group.pages.filter((page) => hasPermission(page, "view")).length;
                                    return (
                                        <button key={group.title} type="button" className={activeGroup === group.title ? "active" : ""} onClick={() => setActiveGroup(group.title)}>
                                            <span className="rail-icon"><Icon size={17} /></span><span><strong>{group.title}</strong><small>{granted}/{group.pages.length} ekran</small></span>
                                        </button>
                                    );
                                })}
                            </section>

                            <section className="permission-workbench">
                                <div className="workbench-head">
                                    <div><span className="admin-kicker">YETKİ MATRİSİ</span><h3>{activeGroup}</h3><p>Her ekran için işlem bazlı erişim belirleyin.</p></div>
                                    <div className="workbench-actions">
                                        {hasChanges && <span className="unsaved-dot">Kaydedilmedi</span>}
                                        <button type="button" className="admin-action subtle" disabled={!hasChanges} onClick={resetPermissions}><RotateCcw size={15} /> Geri Al</button>
                                        <button type="button" className="admin-action allow" onClick={() => setGroupActions(true)}><Check size={15} /> Tümünü Aç</button>
                                        <button type="button" className="admin-action deny" onClick={() => setGroupActions(false)}><Ban size={15} /> Tümünü Kapat</button>
                                    </div>
                                </div>
                                <div className="permission-grid-table">
                                    <div className="permission-grid-row permission-grid-head"><div>Ekran</div>{actions.map((action) => <div key={action.key}>{action.label}</div>)}<div>Hızlı</div></div>
                                    {activePages.map((page) => (
                                        <div className="permission-grid-row" key={page}>
                                            <div className="permission-page"><span><FileKey2 size={15} /></span><strong>{page}</strong></div>
                                            {actions.map((action) => {
                                                const Icon = action.icon;
                                                const enabled = hasPermission(page, action.key);
                                                return <div key={action.key}><button type="button" className={`access-switch ${enabled ? "on" : ""}`} onClick={() => togglePermission(page, action.key)} title={`${page} · ${action.label}`}>{enabled ? <Check size={15} /> : <Icon size={14} />}</button></div>;
                                            })}
                                            <div className="row-quick"><button onClick={() => setPageActions(page, true)}>Aç</button><button className="danger" onClick={() => setPageActions(page, false)}>Kapat</button></div>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </>
                    ) : <div className="admin-no-selection"><Users size={35} /><h2>Kullanıcı seçilmedi</h2><p>Yetki yönetimine başlamak için soldan kullanıcı seçin veya yeni kullanıcı oluşturun.</p><button className="admin-action create" onClick={() => setCreateOpen(true)}><UserPlus size={16} /> Yeni Kullanıcı</button></div>}
                </main>

                <aside className="admin-insight-panel">
                    <div className="insight-head"><div><Activity size={18} /><span><strong>Aktivite Akışı</strong><small>Son kullanıcı hareketleri</small></span></div><button type="button" className="icon-action" onClick={() => loadRecentActivity(selectedUser)} disabled={!selectedUser || activityLoading}><RefreshCw size={16} className={activityLoading ? "spin" : ""} /></button></div>
                    <div className="activity-timeline">
                        {activityLoading && <div className="activity-empty">Aktiviteler yükleniyor...</div>}
                        {!activityLoading && recentLogs.slice(0, 12).map((log) => (
                            <article key={log.id} className="activity-event">
                                <span className="activity-node"><Activity size={13} /></span>
                                <div><strong>{activityLabel(log.islem_tipi)}</strong><p>{log.islem_aciklama || "İşlem açıklaması yok."}</p><div className="activity-tags">{log.sefer_no && <span>{log.sefer_no}</span>}{log.plaka && <span>{log.plaka}</span>}</div><time><Clock3 size={11} /> {new Date(log.created_at).toLocaleString("tr-TR")}</time></div>
                            </article>
                        ))}
                        {!activityLoading && !recentLogs.length && <div className="activity-empty"><Activity size={25} /><strong>Aktivite bulunamadı</strong><span>Bu kullanıcı için kayıt yok.</span></div>}
                    </div>
                    {selectedUser && <div className="insight-security"><LockKeyhole size={18} /><div><strong>Güvenlik Özeti</strong><p>{selectedUser.aktif === false ? "Bu hesap pasif durumda ve giriş yapamaz." : `Bu hesap ${visiblePageCount} ekrana erişebiliyor.`}</p></div></div>}
                </aside>
            </div>

            {createOpen && (
                <div className="admin-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setCreateOpen(false)}>
                    <form className="admin-user-modal" onSubmit={createUser}>
                        <div className="modal-accent" />
                        <header><div className="modal-title-icon"><UserPlus size={20} /></div><div><span className="admin-kicker">KULLANICI YÖNETİMİ</span><h2>Yeni Kullanıcı Oluştur</h2><p>Giriş bilgilerini oluşturun; yetkileri kayıttan sonra matriste belirleyin.</p></div><button type="button" className="modal-close" onClick={() => setCreateOpen(false)}><X size={18} /></button></header>
                        <div className="admin-user-form-grid">
                            <label><span>Ad Soyad *</span><input autoFocus value={newUser.ad} onChange={(e) => setNewUser((p) => ({ ...p, ad: e.target.value }))} placeholder="Örn. Ahmet Yılmaz" /></label>
                            <label><span>Kullanıcı Adı *</span><input value={newUser.kullanici} onChange={(e) => setNewUser((p) => ({ ...p, kullanici: e.target.value.trim() }))} placeholder="ahmet" autoComplete="off" /></label>
                            <label><span>Şifre *</span><input type="password" value={newUser.sifre} onChange={(e) => setNewUser((p) => ({ ...p, sifre: e.target.value }))} placeholder="En az 4 karakter" autoComplete="new-password" /></label>
                            <label><span>Rol</span><select value={newUser.rol} onChange={(e) => setNewUser((p) => ({ ...p, rol: e.target.value }))}><option value="KULLANICI">KULLANICI</option><option value="ADMIN">ADMIN</option><option value="YONETICI">YÖNETİCİ</option></select></label>
                        </div>
                        <label className="admin-active-toggle"><input type="checkbox" checked={newUser.aktif} onChange={(e) => setNewUser((p) => ({ ...p, aktif: e.target.checked }))} /><span className="toggle-ui" /><span><strong>Hesabı aktif oluştur</strong><small>Aktif kullanıcı sisteme hemen giriş yapabilir.</small></span></label>
                        <div className="modal-note"><ShieldCheck size={16} /><span>Yeni kullanıcı başlangıçta hiçbir ekran yetkisine sahip olmaz. Oluşturduktan sonra yetki matrisinden erişim verebilirsiniz.</span></div>
                        <footer><button type="button" className="admin-action subtle" onClick={() => setCreateOpen(false)}>Vazgeç</button><button type="submit" className="admin-action create" disabled={creatingUser}><UserPlus size={16} /> {creatingUser ? "Oluşturuluyor" : "Kullanıcı Oluştur"}</button></footer>
                    </form>
                </div>
            )}

            {deleteOpen && selectedUser && (
                <div className="admin-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setDeleteOpen(false)}>
                    <div className="admin-delete-modal">
                        <div className="delete-icon"><Trash2 size={23} /></div>
                        <span className="admin-kicker danger-text">GERİ ALINAMAZ İŞLEM</span>
                        <h2>Kullanıcı silinsin mi?</h2>
                        <p><strong>{selectedUser.ad || selectedUser.kullanici}</strong> hesabı kullanıcı tablosundan kalıcı olarak silinecek.</p>
                        <div className="delete-warning"><ShieldCheck size={17} /><span>İşlem günlükleri ayrı tabloda tutulduğu için geçmiş loglar korunabilir; ancak kullanıcı artık giriş yapamaz.</span></div>
                        <label className="delete-confirm-field"><span>Onaylamak için <b>{selectedUser.kullanici}</b> yazın</span><input value={deleteConfirm} onChange={(e) => setDeleteConfirm(e.target.value)} placeholder={selectedUser.kullanici} /></label>
                        <footer><button className="admin-action subtle" type="button" onClick={() => setDeleteOpen(false)}>Vazgeç</button><button className="admin-action danger-solid" type="button" disabled={deleteConfirm !== selectedUser.kullanici || deletingUser} onClick={deleteUser}><Trash2 size={16} /> {deletingUser ? "Siliniyor" : "Kalıcı Olarak Sil"}</button></footer>
                    </div>
                </div>
            )}
        </div>
    );
}

export default YonetimPaneli;
