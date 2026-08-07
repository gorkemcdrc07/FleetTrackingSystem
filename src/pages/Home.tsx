import { useState } from "react";
import { MdAdminPanelSettings } from "react-icons/md";

import "./Home.css";

import NotificationCenter from "../components/NotificationCenter/NotificationCenter";
import NotificationToasts from "../components/NotificationCenter/NotificationToasts";
import PageOutlet from "../navigation/PageOutlet";
import { menuGroups, PAGE_IDS, pageLabels, resolvePageId, type PageId } from "../navigation/pages";
import { getCurrentUser } from "../services/sessionStorage";
import { STORAGE_KEYS, writeStorageText } from "../services/browserStorage";

type HomeProps = {
    onLogout: () => void;
};

function Home({ onLogout }: HomeProps) {
    const [activePage, setActivePage] = useState<PageId>(PAGE_IDS.dashboard);

    const aktifKullanici = getCurrentUser();

    const kullaniciAdi =
        aktifKullanici?.ad ||
        aktifKullanici?.kullanici ||
        aktifKullanici?.kullanici_adi ||
        aktifKullanici?.email ||
        "Kullanıcı";

    const kullaniciRol =
        aktifKullanici?.rol || "Kullanıcı";

    const avatarLetter = String(
        kullaniciAdi || "K"
    )
        .charAt(0)
        .toUpperCase();

    function handleNotificationVehicleOpen(
        plate: string
    ) {
        if (!plate) return;

        writeStorageText(STORAGE_KEYS.focusPlate, plate);

        setActivePage(PAGE_IDS.operationsCenter);
    }

    function handleNavigate(page: string) {
        setActivePage(resolvePageId(page));
    }

    return (
        <div className="home-container">
            <header className="topbar">
                <button
                    type="button"
                    className="brand"
                    onClick={() =>
                        setActivePage(PAGE_IDS.dashboard)
                    }
                >
                    <div className="brand-logo">
                        F
                    </div>

                    <div className="brand-text">
                        <strong>FTS</strong>
                        <span>
                            Fleet Tracking System
                        </span>
                    </div>
                </button>

                <nav className="nav-menu">
                    {menuGroups.map((group) => (
                        <div
                            className="nav-group"
                            key={group.title}
                        >
                            <button
                                className="nav-button"
                                type="button"
                            >
                                <span className="nav-icon">
                                    {group.icon}
                                </span>

                                {group.title}

                                <span className="nav-arrow">
                                    ⌄
                                </span>
                            </button>

                            <div className="mega-menu">
                                <div className="mega-header">
                                    <div className="mega-icon">
                                        {group.icon}
                                    </div>

                                    <div>
                                        <h3>
                                            {group.title}
                                        </h3>

                                        <p>
                                            {
                                                group.items
                                                    .length
                                            }{" "}
                                            işlem
                                        </p>
                                    </div>
                                </div>

                                <div className="mega-list">
                                    {group.items.map(
                                        (item) => (
                                            <button
                                                key={item}
                                                type="button"
                                                className={`mega-item ${activePage ===
                                                        item
                                                        ? "active"
                                                        : ""
                                                    }`}
                                                onClick={() =>
                                                    setActivePage(
                                                        item
                                                    )
                                                }
                                            >
                                                <span>
                                                    {pageLabels[item]}
                                                </span>

                                                <small>
                                                    →
                                                </small>
                                            </button>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </nav>

                <div className="top-actions">
                    <NotificationCenter
                        onOpenVehicle={
                            handleNotificationVehicleOpen
                        }
                    />

                    <div className="profile">
                        <div className="avatar">
                            {avatarLetter}
                        </div>

                        <div>
                            <strong>
                                {kullaniciAdi}
                            </strong>

                            <span>
                                {kullaniciRol}
                            </span>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="admin-btn"
                        onClick={() =>
                            setActivePage(
                                PAGE_IDS.admin
                            )
                        }
                    >
                        <MdAdminPanelSettings className="admin-icon" />

                        <span>
                            Yönetim Paneli
                        </span>
                    </button>

                    <button
                        type="button"
                        onClick={onLogout}
                        className="logout-btn"
                    >
                        Çıkış
                    </button>
                </div>
            </header>

            <main className="main-content">
                <PageOutlet pageId={activePage} onNavigate={handleNavigate} />
            </main>

            <NotificationToasts
                onOpenVehicle={
                    handleNotificationVehicleOpen
                }
            />
        </div>
    );
}

export default Home;
