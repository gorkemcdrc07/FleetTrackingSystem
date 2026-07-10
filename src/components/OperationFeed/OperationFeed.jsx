import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { operationEventEngine } from "../../services/operationEventEngine";
import "./OperationFeed.css";

const FILTERS = [
    ["all", "Tümü"],
    ["unread", "Yeni"],
    ["moving", "Hareket"],
    ["idle", "Rölanti"],
    ["park", "Park"],
    ["gps", "GPS"],
    ["geofence", "Geofence"],
    ["critical", "Kritik"],
];

function normalizePlate(value) {
    return String(value || "")
        .replace(/\s/g, "")
        .toUpperCase();
}

function getIcon(type) {
    if (type === "moving") return "🚚";
    if (type === "idle") return "⏱️";
    if (type === "park") return "🅿️";
    if (type === "gps") return "📡";
    if (type === "speed") return "🚨";
    if (type === "geofence-in") return "📍";
    if (type === "geofence-out") return "📤";

    return "🔔";
}

function formatTime(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getDateGroup(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Daha Eski";
    }

    const today = new Date();
    const yesterday = new Date();

    yesterday.setDate(today.getDate() - 1);

    const dateKey = date.toDateString();

    if (dateKey === today.toDateString()) {
        return "Bugün";
    }

    if (
        dateKey === yesterday.toDateString()
    ) {
        return "Dün";
    }

    return date.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "long",
        year: "numeric",
    });
}

function matchesFilter(item, filter) {
    if (filter === "all") return true;
    if (filter === "unread") return !item.read;

    if (filter === "geofence") {
        return (
            item.type === "geofence-in" ||
            item.type === "geofence-out"
        );
    }

    if (filter === "critical") {
        return (
            item.level === "critical" ||
            item.level === "danger"
        );
    }

    return item.type === filter;
}

export default function OperationFeed({
    onOpenVehicle,
    maxItems = 100,
    title = "Canlı Operasyon Akışı",
}) {
    const listRef = useRef(null);

    const [events, setEvents] = useState(
        () => operationEventEngine.getAll()
    );

    const [filter, setFilter] =
        useState("all");

    const [search, setSearch] =
        useState("");

    const [autoScroll, setAutoScroll] =
        useState(true);

    function refresh() {
        setEvents(
            operationEventEngine.getAll()
        );
    }

    useEffect(() => {
        refresh();

        window.addEventListener(
            operationEventEngine.eventName,
            refresh
        );

        window.addEventListener(
            "storage",
            refresh
        );

        return () => {
            window.removeEventListener(
                operationEventEngine.eventName,
                refresh
            );

            window.removeEventListener(
                "storage",
                refresh
            );
        };
    }, []);

    const filteredEvents = useMemo(() => {
        const query = search
            .trim()
            .toLocaleLowerCase("tr-TR");

        return events
            .filter((item) => {
                const filterMatch =
                    matchesFilter(item, filter);

                const searchMatch =
                    !query ||
                    String(item.plate || "")
                        .toLocaleLowerCase("tr-TR")
                        .includes(query) ||
                    String(item.title || "")
                        .toLocaleLowerCase("tr-TR")
                        .includes(query) ||
                    String(item.message || "")
                        .toLocaleLowerCase("tr-TR")
                        .includes(query);

                return (
                    filterMatch &&
                    searchMatch
                );
            })
            .slice(0, maxItems);
    }, [
        events,
        filter,
        search,
        maxItems,
    ]);

    const groupedEvents = useMemo(() => {
        return filteredEvents.reduce(
            (result, item) => {
                const group =
                    getDateGroup(
                        item.createdAt
                    );

                if (!result[group]) {
                    result[group] = [];
                }

                result[group].push(item);

                return result;
            },
            {}
        );
    }, [filteredEvents]);

    const unreadCount = useMemo(
        () =>
            events.filter(
                (item) => !item.read
            ).length,
        [events]
    );

    useEffect(() => {
        if (!autoScroll) return;
        if (!listRef.current) return;

        listRef.current.scrollTo({
            top: 0,
            behavior: "smooth",
        });
    }, [events, autoScroll]);

    function handleOpen(item) {
        operationEventEngine.markRead(
            item.id
        );

        if (
            item.plate &&
            item.plate !== "-"
        ) {
            onOpenVehicle?.(
                item.plate,
                item
            );
        }
    }

    return (
        <section className="operation-feed-v2">
            <header className="operation-feed-v2-head">
                <div>
                    <span>
                        <i />
                        CANLI
                    </span>

                    <h2>{title}</h2>

                    <p>
                        {unreadCount} yeni olay ·{" "}
                        {events.length} toplam kayıt
                    </p>
                </div>

                <div className="operation-feed-v2-head-actions">
                    <button
                        type="button"
                        className={
                            autoScroll
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setAutoScroll(
                                (current) =>
                                    !current
                            )
                        }
                    >
                        Otomatik Akış
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            operationEventEngine.markAllRead()
                        }
                        disabled={
                            unreadCount === 0
                        }
                    >
                        Tümünü Oku
                    </button>
                </div>
            </header>

            <div className="operation-feed-v2-tools">
                <div className="operation-feed-v2-filters">
                    {FILTERS.map(
                        ([key, label]) => (
                            <button
                                key={key}
                                type="button"
                                className={
                                    filter === key
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setFilter(key)
                                }
                            >
                                {label}
                            </button>
                        )
                    )}
                </div>

                <div className="operation-feed-v2-search">
                    <input
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                        placeholder="Plaka veya olay ara..."
                    />

                    {search && (
                        <button
                            type="button"
                            onClick={() =>
                                setSearch("")
                            }
                        >
                            ×
                        </button>
                    )}
                </div>
            </div>

            <div
                className="operation-feed-v2-list"
                ref={listRef}
            >
                {filteredEvents.length === 0 ? (
                    <div className="operation-feed-v2-empty">
                        Bu filtreye uygun operasyon
                        kaydı bulunmuyor.
                    </div>
                ) : (
                    Object.entries(
                        groupedEvents
                    ).map(([group, items]) => (
                        <div
                            key={group}
                            className="operation-feed-v2-group"
                        >
                            <div className="operation-feed-v2-group-title">
                                <span>{group}</span>
                                <i />
                            </div>

                            <div className="operation-feed-v2-group-list">
                                {items.map((item) => (
                                    <article
                                        key={item.id}
                                        className={[
                                            "operation-feed-v2-item",
                                            item.type || "",
                                            item.level || "",
                                            item.read
                                                ? "read"
                                                : "",
                                        ]
                                            .filter(Boolean)
                                            .join(" ")}
                                    >
                                        <button
                                            type="button"
                                            className="operation-feed-v2-item-main"
                                            onClick={() =>
                                                handleOpen(
                                                    item
                                                )
                                            }
                                        >
                                            <div className="operation-feed-v2-icon">
                                                {getIcon(
                                                    item.type
                                                )}
                                            </div>

                                            <div className="operation-feed-v2-content">
                                                <div className="operation-feed-v2-top">
                                                    <span>
                                                        {
                                                            item.title
                                                        }
                                                    </span>

                                                    <time>
                                                        {formatTime(
                                                            item.createdAt
                                                        )}
                                                    </time>
                                                </div>

                                                <strong>
                                                    {item.plate}
                                                </strong>

                                                <p>
                                                    {
                                                        item.message
                                                    }
                                                </p>
                                            </div>
                                        </button>

                                        <div className="operation-feed-v2-actions">
                                            {!item.read ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        operationEventEngine.markRead(
                                                            item.id
                                                        )
                                                    }
                                                >
                                                    Okundu
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        operationEventEngine.markUnread(
                                                            item.id
                                                        )
                                                    }
                                                >
                                                    Yeni
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    operationEventEngine.remove(
                                                        item.id
                                                    )
                                                }
                                            >
                                                Sil
                                            </button>
                                        </div>
                                    </article>
                                ))}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </section>
    );
}