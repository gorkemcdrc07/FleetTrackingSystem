import { BellRing } from "lucide-react";
﻿import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import { notificationEngine } from "../../services/notificationEngine";
import NotificationSettings from "./NotificationSettings";
import "./NotificationCenter.css";

const FILTERS = [
    ["all", "Tümü"],
    ["unread", "Okunmamış"],
    ["critical", "Kritik"],
    ["speed", "Hız"],
    ["idle", "Rölanti"],
    ["oldData", "Eski Veri"],
    ["gps", "GPS"],
    ["geofence", "Geofence"],
];

function formatTime(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
    });
}

function getNotificationIcon(item) {
    if (item.type === "speed") return "🚨";
    if (item.type === "idle") return "⏱️";
    if (item.type === "oldData") return "🕓";
    if (item.type === "gps") return "📡";
    if (item.type === "geofence") return "📍";
    if (item.type === "test") return "🧪";

    return "🔔";
}

function getLevelText(level) {
    if (level === "critical") return "Kritik";
    if (level === "warning") return "Uyarı";
    if (level === "danger") return "Dikkat";

    return "Bilgi";
}

function matchesFilter(item, filter) {
    if (filter === "all") return true;
    if (filter === "unread") return !item.read;
    if (filter === "critical") {
        return item.level === "critical";
    }

    return item.type === filter;
}

export default function NotificationCenter({
    onOpenVehicle,
}) {
    const rootRef = useRef(null);

    const [open, setOpen] = useState(false);
    const [settingsOpen, setSettingsOpen] =
        useState(false);

    const [filter, setFilter] = useState("all");
    const [search, setSearch] = useState("");

    const [settings, setSettings] = useState(() =>
        notificationEngine.getSettings()
    );

    const [notifications, setNotifications] =
        useState(() => notificationEngine.getAll());

    const unreadCount = useMemo(
        () =>
            notifications.filter((item) => !item.read)
                .length,
        [notifications]
    );

    const summary = useMemo(() => {
        return {
            total: notifications.length,

            unread: notifications.filter(
                (item) => !item.read
            ).length,

            critical: notifications.filter(
                (item) =>
                    item.level === "critical"
            ).length,

            geofence: notifications.filter(
                (item) =>
                    item.type === "geofence"
            ).length,
        };
    }, [notifications]);

    const filteredNotifications = useMemo(() => {
        const query = search
            .trim()
            .toLocaleLowerCase("tr-TR");

        return notifications.filter((item) => {
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

            return filterMatch && searchMatch;
        });
    }, [notifications, filter, search]);

    function refresh() {
        setNotifications(notificationEngine.getAll());
        setSettings(notificationEngine.getSettings());
    }

    useEffect(() => {
        notificationEngine.cleanup();
        refresh();

        window.addEventListener(
            notificationEngine.eventName,
            refresh
        );

        window.addEventListener(
            "storage",
            refresh
        );

        return () => {
            window.removeEventListener(
                notificationEngine.eventName,
                refresh
            );

            window.removeEventListener(
                "storage",
                refresh
            );
        };
    }, []);

    useEffect(() => {
        function handleClickOutside(event) {
            if (!open) return;
            if (!rootRef.current) return;

            if (
                !rootRef.current.contains(event.target)
            ) {
                setOpen(false);
                setSettingsOpen(false);
            }
        }

        function handleEscape(event) {
            if (event.key === "Escape") {
                setOpen(false);
                setSettingsOpen(false);
            }
        }

        document.addEventListener(
            "mousedown",
            handleClickOutside
        );

        document.addEventListener(
            "keydown",
            handleEscape
        );

        return () => {
            document.removeEventListener(
                "mousedown",
                handleClickOutside
            );

            document.removeEventListener(
                "keydown",
                handleEscape
            );
        };
    }, [open]);

    function handleMarkAllRead() {
        setNotifications(
            notificationEngine.markAllRead()
        );
    }

    function handleMarkRead(id) {
        setNotifications(
            notificationEngine.markRead(id)
        );
    }

    function handleMarkUnread(id) {
        setNotifications(
            notificationEngine.markUnread(id)
        );
    }

    function handleRemove(id) {
        setNotifications(
            notificationEngine.remove(id)
        );
    }

    function handleClearRead() {
        setNotifications(
            notificationEngine.removeRead()
        );
    }

    function handleClear() {
        setNotifications(notificationEngine.clear());
    }

    function handleTest() {
        setNotifications(
            notificationEngine.addTest()
        );

        setOpen(true);
    }

    function handleOpenVehicle(item) {
        if (!item?.plate || item.plate === "-") {
            return;
        }

        localStorage.setItem(
            "fts_focus_plate",
            item.plate
        );

        notificationEngine.markRead(item.id);
        refresh();

        setOpen(false);
        setSettingsOpen(false);

        onOpenVehicle?.(item.plate);
    }

    return (
        <div
            className="notification-center"
            ref={rootRef}
        >
            <button
                type="button"
                className="notification-trigger"
                onClick={() =>
                    setOpen((previous) => !previous)
                }
                aria-label="Bildirim merkezini aç"
            >
                <BellRing size={19} strokeWidth={2}/>

                {unreadCount > 0 && (
                    <span>
                        {unreadCount > 99
                            ? "99+"
                            : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="notification-panel">
                    <div className="notification-panel-head">
                        <div>
                            <strong>Bildirim Merkezi</strong>

                            <small>
                                {unreadCount} okunmamış ·{" "}
                                {notifications.length} toplam
                            </small>
                        </div>

                        <div>
                            <button
                                type="button"
                                onClick={() =>
                                    setSettingsOpen(
                                        (previous) =>
                                            !previous
                                    )
                                }
                                title="Bildirim ayarları"
                            >
                                ⚙
                            </button>

                            <button
                                type="button"
                                onClick={handleTest}
                                title="Test bildirimi oluştur"
                            >
                                Test
                            </button>

                            <button
                                type="button"
                                onClick={handleMarkAllRead}
                                disabled={unreadCount === 0}
                            >
                                Tümünü Oku
                            </button>
                        </div>
                    </div>

                    <div className="notification-summary">
                        <button
                            type="button"
                            className={
                                filter === "all"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                setFilter("all")
                            }
                        >
                            <span>Toplam</span>
                            <strong>
                                {summary.total}
                            </strong>
                        </button>

                        <button
                            type="button"
                            className={
                                filter === "unread"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                setFilter("unread")
                            }
                        >
                            <span>Okunmamış</span>
                            <strong>
                                {summary.unread}
                            </strong>
                        </button>

                        <button
                            type="button"
                            className={
                                filter === "critical"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                setFilter("critical")
                            }
                        >
                            <span>Kritik</span>
                            <strong>
                                {summary.critical}
                            </strong>
                        </button>

                        <button
                            type="button"
                            className={
                                filter === "geofence"
                                    ? "active"
                                    : ""
                            }
                            onClick={() =>
                                setFilter("geofence")
                            }
                        >
                            <span>Geofence</span>
                            <strong>
                                {summary.geofence}
                            </strong>
                        </button>
                    </div>

                    <div className="notification-filters">
                        {FILTERS.map(([key, label]) => (
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
                        ))}
                    </div>

                    <div className="notification-search">
                        <input
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Plaka, başlık veya mesaj ara..."
                        />

                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                            >
                                ×
                            </button>
                        )}
                    </div>

                    {settingsOpen && (
                        <NotificationSettings
                            settings={settings}
                            onChange={(nextSettings) => {
                                setSettings(
                                    notificationEngine.saveSettings(
                                        nextSettings
                                    )
                                );
                            }}
                        />
                    )}

                    <div className="notification-list">
                        {filteredNotifications.length ===
                            0 ? (
                            <div className="notification-empty">
                                Bu filtreye uygun bildirim
                                bulunmuyor.
                            </div>
                        ) : (
                            filteredNotifications
                                .slice(0, 50)
                                .map((item) => (
                                    <article
                                        key={item.id}
                                        className={`notification-item ${item.level || ""
                                            } ${item.read
                                                ? "read"
                                                : ""
                                            }`}
                                    >
                                        <button
                                            type="button"
                                            className="notification-item-main"
                                            onClick={() =>
                                                handleOpenVehicle(
                                                    item
                                                )
                                            }
                                            disabled={
                                                !item.plate ||
                                                item.plate ===
                                                "-"
                                            }
                                        >
                                            <div className="notification-item-icon">
                                                {getNotificationIcon(
                                                    item
                                                )}
                                            </div>

                                            <div className="notification-item-content">
                                                <div className="notification-item-top">
                                                    <span>
                                                        {
                                                            item.title
                                                        }
                                                    </span>

                                                    <em>
                                                        {getLevelText(
                                                            item.level
                                                        )}
                                                    </em>
                                                </div>

                                                <strong>
                                                    {item.plate}
                                                </strong>

                                                <p>
                                                    {
                                                        item.message
                                                    }
                                                </p>

                                                <small>
                                                    {formatDate(
                                                        item.createdAt
                                                    )}{" "}
                                                    ·{" "}
                                                    {formatTime(
                                                        item.createdAt
                                                    )}
                                                </small>
                                            </div>
                                        </button>

                                        <div className="notification-item-actions">
                                            {!item.read ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        handleMarkRead(
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
                                                        handleMarkUnread(
                                                            item.id
                                                        )
                                                    }
                                                >
                                                    Okunmadı
                                                </button>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() =>
                                                    handleRemove(
                                                        item.id
                                                    )
                                                }
                                            >
                                                Sil
                                            </button>
                                        </div>
                                    </article>
                                ))
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="notification-panel-footer">
                            <button
                                type="button"
                                onClick={handleClearRead}
                            >
                                Okunanları Temizle
                            </button>

                            <button
                                type="button"
                                className="danger"
                                onClick={handleClear}
                            >
                                Tümünü Temizle
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}