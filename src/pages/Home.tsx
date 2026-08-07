import { useState } from "react";
import { MdAdminPanelSettings } from "react-icons/md";

import "./Home.css";

import ActiveTrips from "./ActiveTrips";
import CompletedTrips from "./CompletedTrips";
import VehicleStatuses from "./VehicleStatuses";
import VehicleTracking from "./VehicleTracking";

import LoadingWaitReport from "./Reports/LoadingWaitReport";
import DeliveryWaitReport from "./Reports/DeliveryWaitReport";
import UserKpiReport from "./Reports/UserKpiReport";

import VehiclePricing from "./Settlements/VehiclePricing";
import HayatKimyaFuelSettlement from "./Settlements/HayatKimyaFuelSettlement";
import PepsiFuelSettlement from "./Settlements/PepsiFuelSettlement";
import HandlingFee from "./Settlements/HandlingFee";

import AdminPanel from "./Admin/AdminPanel";

import Alarms from "./Alarms";
import Dashboard from "./Dashboard";
import Playback from "./Playback";
import Geofence from "./Geofence";
import OperationsCenter from "./OperationsCenter";

import NotificationCenter from "../components/NotificationCenter/NotificationCenter";
import NotificationToasts from "../components/NotificationCenter/NotificationToasts";
import { menuGroups, PAGE_IDS, pageLabels, resolvePageId, type PageId } from "../navigation/pages";

type HomeProps = {
    onLogout: () => void;
};

function getAktifKullanici() {
    try {
        return (
            JSON.parse(
                localStorage.getItem("fts_user") || "null"
            ) ||
            JSON.parse(
                localStorage.getItem("kullanici") || "null"
            ) ||
            JSON.parse(
                localStorage.getItem("aktifKullanici") ||
                "null"
            ) ||
            JSON.parse(
                localStorage.getItem("user") || "null"
            ) ||
            null
        );
    } catch {
        return null;
    }
}

function Home({ onLogout }: HomeProps) {
    const [activePage, setActivePage] = useState<PageId>(PAGE_IDS.dashboard);

    const aktifKullanici = getAktifKullanici();

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

        localStorage.setItem(
            "fts_focus_plate",
            plate
        );

        setActivePage(PAGE_IDS.operationsCenter);
    }

    function handleNavigate(page: string) {
        setActivePage(resolvePageId(page));
    }

    const renderPage = () => {
        if (activePage === PAGE_IDS.dashboard) {
            return (
                <Dashboard
                    onNavigate={handleNavigate}
                />
            );
        }

        if (activePage === PAGE_IDS.activeTrips) {
            return <ActiveTrips />;
        }

        if (activePage === PAGE_IDS.completedTrips) {
            return <CompletedTrips />;
        }

        if (activePage === PAGE_IDS.vehicleStatuses) {
            return <VehicleStatuses />;
        }

        if (activePage === PAGE_IDS.vehicleTracking) {
            return (
                <VehicleTracking
                    onNavigate={handleNavigate}
                />
            );
        }

        if (activePage === PAGE_IDS.playback) {
            return <Playback />;
        }

        if (activePage === PAGE_IDS.geofence) {
            return <Geofence />;
        }

        if (activePage === PAGE_IDS.alarms) {
            return <Alarms />;
        }

        if (activePage === PAGE_IDS.operationsCenter) {
            return (
                <OperationsCenter
                    onNavigate={handleNavigate}
                />
            );
        }

        if (activePage === PAGE_IDS.loadingWaitReport) {
            return <LoadingWaitReport />;
        }

        if (activePage === PAGE_IDS.deliveryWaitReport) {
            return <DeliveryWaitReport />;
        }

        if (activePage === PAGE_IDS.userKpiReport) {
            return <UserKpiReport />;
        }

        if (
            activePage === PAGE_IDS.vehiclePricing
        ) {
            return <VehiclePricing />;
        }

        if (activePage === PAGE_IDS.hayatKimyaFuelSettlement) {
            return <HayatKimyaFuelSettlement />;
        }

        if (activePage === PAGE_IDS.pepsiFuelSettlement) {
            return <PepsiFuelSettlement />;
        }

        if (activePage === PAGE_IDS.handlingFee) {
            return <HandlingFee />;
        }

        if (activePage === PAGE_IDS.admin) {
            return <AdminPanel />;
        }

        return (
            <section className="hero-panel">
                <div>
                    <span className="eyebrow">
                        Aktif Sayfa
                    </span>

                    <h1>{pageLabels[activePage]}</h1>

                    <p>
                        Seçilen modül için içerik alanı
                        burada görüntülenecek.
                    </p>
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
                {renderPage()}
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
