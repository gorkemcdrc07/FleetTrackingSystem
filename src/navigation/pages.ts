export const PAGE_IDS = {
    dashboard: "dashboard",
    activeTrips: "activeTrips",
    completedTrips: "completedTrips",
    vehicleStatuses: "vehicleStatuses",
    vehicleTracking: "vehicleTracking",
    playback: "playback",
    geofence: "geofence",
    operationsCenter: "operationsCenter",
    alarms: "alarms",
    userKpiReport: "userKpiReport",
    loadingWaitReport: "loadingWaitReport",
    deliveryWaitReport: "deliveryWaitReport",
    hayatKimyaFuelSettlement: "hayatKimyaFuelSettlement",
    pepsiFuelSettlement: "pepsiFuelSettlement",
    frigoFuelSettlement: "frigoFuelSettlement",
    tripLeaseDriverSettlement: "tripLeaseDriverSettlement",
    vehiclePricing: "vehiclePricing",
    fleetDiscountedFuel: "fleetDiscountedFuel",
    supplierExpense: "supplierExpense",
    handlingFee: "handlingFee",
    mileageEntry: "mileageEntry",
    allTasks: "allTasks",
    assignTask: "assignTask",
    assignedTasks: "assignedTasks",
    admin: "admin",
} as const;

export type PageId = typeof PAGE_IDS[keyof typeof PAGE_IDS];

export const pageLabels: Record<PageId, string> = {
    dashboard: "Dashboard",
    activeTrips: "Aktif Seferler",
    completedTrips: "Tamamlanan Seferler",
    vehicleStatuses: "Araç Durumları",
    vehicleTracking: "Araç Takibi",
    playback: "Playback",
    geofence: "Geofence",
    operationsCenter: "Operasyon Merkezi",
    alarms: "Alarm Merkezi",
    userKpiReport: "Kullanıcı KPİ",
    loadingWaitReport: "Yüklemede Bekleme",
    deliveryWaitReport: "Teslimde Bekleme",
    hayatKimyaFuelSettlement: "Hayat Kimya YHH",
    pepsiFuelSettlement: "Pepsi YHH",
    frigoFuelSettlement: "Frigo YHH",
    tripLeaseDriverSettlement: "Sefer Kira & Sürücü Hakediş",
    vehiclePricing: "Plaka Kira & Sürücü Tutarları",
    fleetDiscountedFuel: "Filo %12 İskontolu Yakıt",
    supplierExpense: "Tedarikçi Masraf",
    handlingFee: "Hamaliye",
    mileageEntry: "KM Kayıt",
    allTasks: "Tüm Görevler",
    assignTask: "Görev Ata",
    assignedTasks: "Bana Gelen Görevler",
    admin: "Yönetim Paneli",
};

export type MenuGroup = {
    title: string;
    icon: string;
    items: PageId[];
};

export const menuGroups: MenuGroup[] = [
    { title: "Kullanıcı İşlemleri", icon: "👤", items: [PAGE_IDS.activeTrips, PAGE_IDS.completedTrips] },
    { title: "Araç Yönetimi", icon: "🚚", items: [
        PAGE_IDS.vehicleStatuses, PAGE_IDS.vehicleTracking, PAGE_IDS.playback,
        PAGE_IDS.geofence, PAGE_IDS.operationsCenter, PAGE_IDS.alarms,
    ] },
    { title: "Raporlar", icon: "📊", items: [
        PAGE_IDS.userKpiReport, PAGE_IDS.loadingWaitReport, PAGE_IDS.deliveryWaitReport,
    ] },
    { title: "Hakedişler", icon: "₺", items: [
        PAGE_IDS.hayatKimyaFuelSettlement, PAGE_IDS.pepsiFuelSettlement,
        PAGE_IDS.frigoFuelSettlement, PAGE_IDS.tripLeaseDriverSettlement,
        PAGE_IDS.vehiclePricing, PAGE_IDS.fleetDiscountedFuel,
        PAGE_IDS.supplierExpense, PAGE_IDS.handlingFee,
    ] },
    { title: "Kayıt İşlemleri", icon: "📝", items: [PAGE_IDS.mileageEntry] },
    { title: "Görevler", icon: "✅", items: [PAGE_IDS.allTasks, PAGE_IDS.assignTask, PAGE_IDS.assignedTasks] },
];

const legacyPageIds = new Map<string, PageId>(
    Object.entries(pageLabels).map(([id, label]) => [label, id as PageId])
);

export function resolvePageId(value: string): PageId {
    if (value in pageLabels) return value as PageId;
    return legacyPageIds.get(value) ?? PAGE_IDS.dashboard;
}
