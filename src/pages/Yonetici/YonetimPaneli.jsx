import { useEffect, useMemo, useState } from "react";
import { supabase } from "../../supabaseClient";
import "./YonetimPaneli.css";

const pageGroups = [
    {
        title: "Kullanıcı İşlemleri",
        icon: "👤",
        pages: ["Aktif Seferler", "Tamamlanan Seferler"],
    },
    {
        title: "Araç Yönetimi",
        icon: "🚚",
        pages: ["Araç Durumları"],
    },
    {
        title: "Raporlar",
        icon: "📊",
        pages: ["Kullanıcı KPİ", "Yüklemede Bekleme", "Teslimde Bekleme"],
    },
    {
        title: "Hakedişler",
        icon: "₺",
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
    {
        title: "Kayıt İşlemleri",
        icon: "📝",
        pages: ["KM Kayıt"],
    },
    {
        title: "Görevler",
        icon: "✅",
        pages: ["Tüm Görevler", "Görev Ata", "Bana Gelen Görevler"],
    },
    {
        title: "Sistem",
        icon: "🔐",
        pages: ["Yönetim Paneli"],
    },
];

const allPages = pageGroups.flatMap((group) => group.pages);

const actions = [
    { key: "view", label: "Görüntüle", short: "Gör" },
    { key: "create", label: "Ekle", short: "Ekle" },
    { key: "update", label: "Düzenle", short: "Düz" },
    { key: "delete", label: "Sil", short: "Sil" },
    { key: "export", label: "Dışa Aktar", short: "Dışa" },
];

function YonetimPaneli() {
    const [kullanicilar, setKullanicilar] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [permissions, setPermissions] = useState([]);
    const [activeGroup, setActiveGroup] = useState(pageGroups[0].title);
    const [searchText, setSearchText] = useState("");
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        kullanicilariGetir();
    }, []);

    useEffect(() => {
        if (selectedUser) {
            setPermissions(
                Array.isArray(selectedUser.yetki) ? selectedUser.yetki : []
            );
        }
    }, [selectedUser]);

    const kullanicilariGetir = async () => {
        try {
            setLoading(true);

            const { data, error } = await supabase
                .from("kullanicilar")
                .select("id, kullanici, ad, rol, yetki, aktif")
                .order("ad", { ascending: true });

            if (error) throw error;

            setKullanicilar(data || []);

            if (data?.length > 0) {
                setSelectedUser(data[0]);
            }
        } catch (error) {
            console.error("Kullanıcılar alınamadı:", error);
            alert("Kullanıcılar alınamadı.");
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        const text = searchText.trim().toLowerCase();

        if (!text) return kullanicilar;

        return kullanicilar.filter((user) => {
            const name = `${user.ad || ""} ${user.kullanici || ""} ${user.rol || ""}`;
            return name.toLowerCase().includes(text);
        });
    }, [kullanicilar, searchText]);

    const activePages =
        pageGroups.find((group) => group.title === activeGroup)?.pages || [];

    const visiblePageCount = permissions.filter((item) =>
        item.actions?.includes("view")
    ).length;

    const totalActionCount = permissions.reduce(
        (total, item) => total + (item.actions?.length || 0),
        0
    );

    const hasPermission = (page, action) => {
        const pagePermission = permissions.find((item) => item.page === page);
        return pagePermission?.actions?.includes(action) || false;
    };

    const togglePermission = (page, action) => {
        setPermissions((prev) => {
            const existingPage = prev.find((item) => item.page === page);

            if (!existingPage) {
                return [...prev, { page, actions: [action] }];
            }

            const hasAction = existingPage.actions.includes(action);

            return prev.map((item) => {
                if (item.page !== page) return item;

                return {
                    ...item,
                    actions: hasAction
                        ? item.actions.filter((a) => a !== action)
                        : [...item.actions, action],
                };
            });
        });
    };

    const tumSayfaYetkileriniAc = (page) => {
        const allActions = actions.map((item) => item.key);

        setPermissions((prev) => {
            const exists = prev.find((item) => item.page === page);

            if (!exists) {
                return [...prev, { page, actions: allActions }];
            }

            return prev.map((item) =>
                item.page === page ? { ...item, actions: allActions } : item
            );
        });
    };

    const tumSayfaYetkileriniKapat = (page) => {
        setPermissions((prev) => {
            const exists = prev.find((item) => item.page === page);

            if (!exists) {
                return [...prev, { page, actions: [] }];
            }

            return prev.map((item) =>
                item.page === page ? { ...item, actions: [] } : item
            );
        });
    };

    const grupYetkileriniAc = () => {
        const allActions = actions.map((item) => item.key);

        setPermissions((prev) => {
            const next = [...prev];

            activePages.forEach((page) => {
                const index = next.findIndex((item) => item.page === page);

                if (index === -1) {
                    next.push({ page, actions: allActions });
                } else {
                    next[index] = { ...next[index], actions: allActions };
                }
            });

            return next;
        });
    };

    const grupYetkileriniKapat = () => {
        setPermissions((prev) =>
            prev.map((item) =>
                activePages.includes(item.page)
                    ? { ...item, actions: [] }
                    : item
            )
        );
    };

    const yetkileriKaydet = async () => {
        if (!selectedUser) return;

        try {
            setSaving(true);

            const { data, error } = await supabase
                .from("kullanicilar")
                .update({
                    yetki: permissions,
                    updated_at: new Date().toISOString(),
                })
                .eq("id", selectedUser.id)
                .select("id, kullanici, ad, rol, yetki, aktif")
                .single();

            if (error) throw error;

            setKullanicilar((prev) =>
                prev.map((user) => (user.id === data.id ? data : user))
            );

            setSelectedUser(data);
            setPermissions(Array.isArray(data.yetki) ? data.yetki : []);

            alert("Yetkiler kaydedildi.");
        } catch (error) {
            console.error("Yetkiler kaydedilemedi:", error);
            alert("Yetkiler kaydedilemedi.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="admin-panel-page">
            <section className="admin-hero">
                <div>
                    <span className="admin-eyebrow">Kullanıcı Yetkileri</span>
                    <h1>Yönetim Paneli</h1>
                    <p>
                        Kullanıcı bazlı sayfa erişimi ve işlem yetkilerini
                        modern panel üzerinden yönetin.
                    </p>
                </div>

                <button
                    className="save-permission-btn"
                    onClick={yetkileriKaydet}
                    disabled={!selectedUser || saving}
                >
                    <span>💾</span>
                    {saving ? "Kaydediliyor..." : "Yetkileri Kaydet"}
                </button>
            </section>

            <section className="admin-stats">
                <div className="stat-card">
                    <span>👥</span>
                    <div>
                        <strong>{kullanicilar.length}</strong>
                        <p>Toplam Kullanıcı</p>
                    </div>
                </div>

                <div className="stat-card">
                    <span>📄</span>
                    <div>
                        <strong>{allPages.length}</strong>
                        <p>Yetkilendirilebilir Sayfa</p>
                    </div>
                </div>

                <div className="stat-card">
                    <span>✅</span>
                    <div>
                        <strong>{visiblePageCount}</strong>
                        <p>Görüntüleme Yetkisi</p>
                    </div>
                </div>

                <div className="stat-card dark">
                    <span>🔐</span>
                    <div>
                        <strong>{totalActionCount}</strong>
                        <p>Aktif İşlem Yetkisi</p>
                    </div>
                </div>
            </section>

            <div className="admin-layout">
                <aside className="user-list-card">
                    <div className="panel-card-header">
                        <div>
                            <span className="section-icon">👤</span>
                            <h3>Kullanıcılar</h3>
                        </div>

                        {loading && <small>Yükleniyor...</small>}
                    </div>

                    <div className="user-search">
                        <span>⌕</span>
                        <input
                            value={searchText}
                            onChange={(event) =>
                                setSearchText(event.target.value)
                            }
                            placeholder="Kullanıcı ara..."
                        />
                    </div>

                    <div className="user-list">
                        {filteredUsers.map((user) => (
                            <button
                                key={user.id}
                                type="button"
                                className={
                                    selectedUser?.id === user.id
                                        ? "user-item active"
                                        : "user-item"
                                }
                                onClick={() => setSelectedUser(user)}
                            >
                                <div className="user-avatar">
                                    {String(user.ad || user.kullanici || "K")
                                        .charAt(0)
                                        .toUpperCase()}
                                </div>

                                <div className="user-info">
                                    <strong>{user.ad || user.kullanici}</strong>
                                    <span>
                                        {user.kullanici}
                                        {user.rol ? ` • ${user.rol}` : ""}
                                    </span>
                                </div>

                                <small
                                    className={
                                        user.aktif === false
                                            ? "status-badge passive"
                                            : "status-badge"
                                    }
                                >
                                    {user.aktif === false ? "Pasif" : "Aktif"}
                                </small>
                            </button>
                        ))}
                    </div>
                </aside>

                <section className="permission-card">
                    <div className="permission-top">
                        <div>
                            <span className="admin-eyebrow">Yetki Matrisi</span>
                            <h2>
                                {selectedUser
                                    ? `${selectedUser.ad ||
                                    selectedUser.kullanici
                                    }`
                                    : "Kullanıcı Seçiniz"}
                            </h2>
                            <p>
                                Ana başlık seçin, alt sayfalara ait işlem
                                yetkilerini açıp kapatın.
                            </p>
                        </div>

                        <div className="group-actions">
                            <button type="button" onClick={grupYetkileriniAc}>
                                Bu Başlığı Aç
                            </button>
                            <button
                                type="button"
                                className="soft-danger"
                                onClick={grupYetkileriniKapat}
                            >
                                Bu Başlığı Kapat
                            </button>
                        </div>
                    </div>

                    <div className="module-tabs">
                        {pageGroups.map((group) => (
                            <button
                                key={group.title}
                                type="button"
                                className={
                                    activeGroup === group.title ? "active" : ""
                                }
                                onClick={() => setActiveGroup(group.title)}
                            >
                                <span>{group.icon}</span>
                                <strong>{group.title}</strong>
                                <small>{group.pages.length} ekran</small>
                            </button>
                        ))}
                    </div>

                    <div className="permission-table-wrap">
                        <div className="permission-row permission-head">
                            <div>Alt Ekran</div>

                            {actions.map((action) => (
                                <div key={action.key}>{action.label}</div>
                            ))}

                            <div>Hızlı</div>
                        </div>

                        {activePages.map((page) => (
                            <div className="permission-row" key={page}>
                                <div className="page-name">
                                    <span>📌</span>
                                    {page}
                                </div>

                                {actions.map((action) => (
                                    <div key={action.key}>
                                        <button
                                            type="button"
                                            title={action.label}
                                            className={
                                                hasPermission(page, action.key)
                                                    ? "permission-toggle active"
                                                    : "permission-toggle"
                                            }
                                            onClick={() =>
                                                togglePermission(
                                                    page,
                                                    action.key
                                                )
                                            }
                                        >
                                            {hasPermission(page, action.key)
                                                ? "✓"
                                                : "—"}
                                        </button>
                                    </div>
                                ))}

                                <div className="quick-actions">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            tumSayfaYetkileriniAc(page)
                                        }
                                    >
                                        Aç
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            tumSayfaYetkileriniKapat(page)
                                        }
                                    >
                                        Kapat
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
            </div>
        </div>
    );
}

export default YonetimPaneli;