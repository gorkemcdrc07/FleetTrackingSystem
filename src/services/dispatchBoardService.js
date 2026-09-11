const STORAGE_KEY = "fts_dispatch_board";
const EVENT_NAME = "fts_dispatch_board_updated";

export const DISPATCH_COLUMNS = [
    {
        key: "waiting",
        title: "Bekliyor",
    },
    {
        key: "loading",
        title: "Yükleniyor",
    },
    {
        key: "onRoad",
        title: "Yolda",
    },
    {
        key: "delivery",
        title: "Teslimde",
    },
    {
        key: "completed",
        title: "Tamamlandı",
    },
];

function createId() {
    return `dispatch-${Date.now()}-${Math.random()
        .toString(16)
        .slice(2)}`;
}

function readBoard() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function writeBoard(items) {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(items)
    );

    window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
            detail: items,
        })
    );

    return items;
}

function normalizeStatus(status) {
    return DISPATCH_COLUMNS.some(
        (column) => column.key === status
    )
        ? status
        : "waiting";
}

function createDemoItems() {
    const now = Date.now();

    return [
        {
            id: createId(),
            status: "waiting",
            plate: "34 ABC 123",
            customer: "Pepsi",
            project: "İstanbul Dağıtım",
            driver: "Ahmet Yılmaz",
            origin: "Gebze",
            destination: "İstanbul",
            startTime: new Date(
                now + 30 * 60 * 1000
            ).toISOString(),
            eta: new Date(
                now + 4 * 60 * 60 * 1000
            ).toISOString(),
            progress: 0,
            alarmCount: 0,
            priority: "normal",
        },
        {
            id: createId(),
            status: "loading",
            plate: "34 XYZ 555",
            customer: "Hayat Kimya",
            project: "Bursa Operasyonu",
            driver: "Mehmet Kaya",
            origin: "Kocaeli",
            destination: "Bursa",
            startTime: new Date(
                now - 45 * 60 * 1000
            ).toISOString(),
            eta: new Date(
                now + 3 * 60 * 60 * 1000
            ).toISOString(),
            progress: 18,
            alarmCount: 1,
            priority: "high",
        },
        {
            id: createId(),
            status: "onRoad",
            plate: "06 AA 111",
            customer: "Frigo",
            project: "Ankara Sevkiyat",
            driver: "Ali Demir",
            origin: "İstanbul",
            destination: "Ankara",
            startTime: new Date(
                now - 2 * 60 * 60 * 1000
            ).toISOString(),
            eta: new Date(
                now + 2 * 60 * 60 * 1000
            ).toISOString(),
            progress: 62,
            alarmCount: 2,
            priority: "critical",
        },
    ];
}

export const dispatchBoardService = {
    eventName: EVENT_NAME,

    getAll() {
        const items = readBoard();

        if (items.length > 0) {
            return items;
        }

        return writeBoard(createDemoItems());
    },

    add(item = {}) {
        const current = this.getAll();

        const nextItem = {
            id: createId(),
            status: normalizeStatus(item.status),
            plate: item.plate || "-",
            customer: item.customer || "Müşteri belirtilmedi",
            project: item.project || "Proje belirtilmedi",
            driver: item.driver || "Sürücü belirtilmedi",
            origin: item.origin || "-",
            destination: item.destination || "-",
            startTime:
                item.startTime ||
                new Date().toISOString(),
            eta: item.eta || null,
            progress: Number(item.progress || 0),
            alarmCount: Number(item.alarmCount || 0),
            priority: item.priority || "normal",
            createdAt: new Date().toISOString(),
        };

        return writeBoard([
            nextItem,
            ...current,
        ]);
    },

    update(id, changes = {}) {
        const next = this.getAll().map((item) =>
            item.id === id
                ? {
                    ...item,
                    ...changes,
                    status: normalizeStatus(
                        changes.status ?? item.status
                    ),
                }
                : item
        );

        return writeBoard(next);
    },

    move(id, status) {
        return this.update(id, {
            status: normalizeStatus(status),
        });
    },

    remove(id) {
        const next = this.getAll().filter(
            (item) => item.id !== id
        );

        return writeBoard(next);
    },

    clear() {
        return writeBoard([]);
    },
};