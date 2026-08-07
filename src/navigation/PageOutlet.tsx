import { lazy, Suspense, type ComponentType, type LazyExoticComponent } from "react";
import PageErrorBoundary from "../components/PageErrorBoundary/PageErrorBoundary";
import { PAGE_IDS, pageLabels, type PageId } from "./pages";

type PageOutletProps = {
    pageId: PageId;
    onNavigate: (page: string) => void;
};

type LazyPage = LazyExoticComponent<ComponentType<any>>;

const pageComponents: Partial<Record<PageId, LazyPage>> = {
    [PAGE_IDS.dashboard]: lazy(() => import("../pages/Dashboard")),
    [PAGE_IDS.activeTrips]: lazy(() => import("../pages/ActiveTrips")),
    [PAGE_IDS.completedTrips]: lazy(() => import("../pages/CompletedTrips")),
    [PAGE_IDS.vehicleStatuses]: lazy(() => import("../pages/VehicleStatuses")),
    [PAGE_IDS.vehicleTracking]: lazy(() => import("../pages/VehicleTracking")),
    [PAGE_IDS.playback]: lazy(() => import("../pages/Playback")),
    [PAGE_IDS.geofence]: lazy(() => import("../pages/Geofence")),
    [PAGE_IDS.operationsCenter]: lazy(() => import("../pages/OperationsCenter")),
    [PAGE_IDS.alarms]: lazy(() => import("../pages/Alarms")),
    [PAGE_IDS.userKpiReport]: lazy(() => import("../pages/Reports/UserKpiReport")),
    [PAGE_IDS.loadingWaitReport]: lazy(() => import("../pages/Reports/LoadingWaitReport")),
    [PAGE_IDS.deliveryWaitReport]: lazy(() => import("../pages/Reports/DeliveryWaitReport")),
    [PAGE_IDS.vehiclePricing]: lazy(() => import("../pages/Settlements/VehiclePricing")),
    [PAGE_IDS.hayatKimyaFuelSettlement]: lazy(() => import("../pages/Settlements/HayatKimyaFuelSettlement")),
    [PAGE_IDS.pepsiFuelSettlement]: lazy(() => import("../pages/Settlements/PepsiFuelSettlement")),
    [PAGE_IDS.handlingFee]: lazy(() => import("../pages/Settlements/HandlingFee")),
    [PAGE_IDS.admin]: lazy(() => import("../pages/Admin/AdminPanel")),
};

const navigationAwarePages = new Set<PageId>([
    PAGE_IDS.dashboard,
    PAGE_IDS.vehicleTracking,
    PAGE_IDS.operationsCenter,
]);

function LoadingState() {
    return (
        <section className="page-state" aria-live="polite">
            <span className="page-state__spinner" aria-hidden="true" />
            <p>Modül yükleniyor…</p>
        </section>
    );
}

function Placeholder({ pageId }: { pageId: PageId }) {
    return (
        <section className="hero-panel">
            <div>
                <span className="eyebrow">Aktif Sayfa</span>
                <h1>{pageLabels[pageId]}</h1>
                <p>Seçilen modül için içerik alanı burada görüntülenecek.</p>
            </div>
            <div className="system-card"><span className="pulse" />Sistem Aktif</div>
        </section>
    );
}

export default function PageOutlet({ pageId, onNavigate }: PageOutletProps) {
    const PageComponent = pageComponents[pageId];
    if (!PageComponent) return <Placeholder pageId={pageId} />;

    const pageProps = navigationAwarePages.has(pageId) ? { onNavigate } : {};

    return (
        <PageErrorBoundary key={pageId}>
            <Suspense fallback={<LoadingState />}>
                <PageComponent {...pageProps} />
            </Suspense>
        </PageErrorBoundary>
    );
}
