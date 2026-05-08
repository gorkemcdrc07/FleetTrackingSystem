export type PermissionAction = "view" | "create" | "update" | "delete" | "export";

export type PagePermission = {
    page: string;
    actions: PermissionAction[];
};

export type RolePermission = {
    role: string;
    permissions: PagePermission[];
};

export const allPages = [
    "Aktif Seferler",
    "Tamamlanan Seferler",
    "Araç Durumları",
    "Kullanıcı KPİ",
    "Yüklemede Bekleme",
    "Teslimde Bekleme",
    "Hayat Kimya YHH",
    "Pepsi YHH",
    "Frigo YHH",
    "Sefer Kira & Sürücü Hakediş",
    "Plaka Kira & Sürücü Tutarları",
    "Filo %12 İskontolu Yakıt",
    "Tedarikçi Masraf",
    "Hamaliye",
    "KM Kayıt",
    "Tüm Görevler",
    "Görev Ata",
    "Bana Gelen Görevler",
    "Yönetim Paneli",
];

export const rolePermissions: RolePermission[] = [
    {
        role: "Admin",
        permissions: allPages.map((page) => ({
            page,
            actions: ["view", "create", "update", "delete", "export"],
        })),
    },
    {
        role: "Kullanıcı",
        permissions: [
            {
                page: "Aktif Seferler",
                actions: ["view"],
            },
            {
                page: "Tamamlanan Seferler",
                actions: ["view"],
            },
            {
                page: "Araç Durumları",
                actions: ["view"],
            },
        ],
    },
    {
        role: "Operasyon",
        permissions: [
            {
                page: "Aktif Seferler",
                actions: ["view", "create", "update"],
            },
            {
                page: "Tamamlanan Seferler",
                actions: ["view"],
            },
            {
                page: "Araç Durumları",
                actions: ["view", "update"],
            },
            {
                page: "Görev Ata",
                actions: ["view", "create"],
            },
        ],
    },
    {
        role: "Muhasebe",
        permissions: [
            {
                page: "Hayat Kimya YHH",
                actions: ["view", "update", "export"],
            },
            {
                page: "Pepsi YHH",
                actions: ["view", "update", "export"],
            },
            {
                page: "Plaka Kira & Sürücü Tutarları",
                actions: ["view", "update", "export"],
            },
        ],
    },
];

export function hasPermission(
    role: string,
    page: string,
    action: PermissionAction = "view"
) {
    const roleData = rolePermissions.find((item) => item.role === role);

    if (!roleData) return false;

    const pageData = roleData.permissions.find((item) => item.page === page);

    if (!pageData) return false;

    return pageData.actions.includes(action);
}