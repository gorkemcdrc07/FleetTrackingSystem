import {
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";

import { notificationEngine } from "../../services/notificationEngine";
import { useTrackedVehicles } from "../../context/TrackedVehiclesContext";

import "./NotificationToasts.css";

function normalizePlate(value) {
    return String(value || "")
        .replace(/\s/g, "")
        .toUpperCase();
}

function getIcon(level) {
    if (level === "critical") return "⛔";
    if (level === "danger") return "🔴";
    if (level === "warning") return "⚠️";
    if (level === "success") return "✅";
    return "🔔";
}

function formatTime(value) {
    if (!value) return "";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    return date.toLocaleTimeString("tr-TR", {
        hour: "2-digit",
        minute: "2-digit",
    });
}

export default function NotificationToasts() {
    const {
        trackedPlates,
        hasTrackedVehicles,
    } = useTrackedVehicles();

    const [
        allNotifications,
        setAllNotifications,
    ] = useState(() =>
        notificationEngine.getAll()
    );

    const [
        trackedDrawerOpen,
        setTrackedDrawerOpen,
    ] = useState(false);

    const refresh = useCallback(() => {
        const settings =
            notificationEngine.getSettings();

        if (settings.toastEnabled === false) {
            setAllNotifications([]);
            return;
        }

        setAllNotifications(
            notificationEngine.getAll()
        );
    }, []);

    useEffect(() => {
        refresh();

        window.addEventListener(
            notificationEngine.eventName,
            refresh
        );

        window.addEventListener(
            notificationEngine.toastEventName,
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
                notificationEngine.toastEventName,
                refresh
            );

            window.removeEventListener(
                "storage",
                refresh
            );
        };
    }, [refresh]);

    useEffect(() => {
        function handleDrawerState(event) {
            setTrackedDrawerOpen(
                Boolean(
                    event?.detail?.open
                )
            );
        }

        window.addEventListener(
            "fts_tracked_drawer_state",
            handleDrawerState
        );

        return () => {
            window.removeEventListener(
                "fts_tracked_drawer_state",
                handleDrawerState
            );
        };
    }, []);

    const notifications = useMemo(() => {
        const unread =
            allNotifications.filter(
                (item) => !item.read
            );

        if (!hasTrackedVehicles) {
            return unread.slice(0, 20);
        }

        const allowedPlates = new Set(
            trackedPlates.map(
                normalizePlate
            )
        );

        return unread
            .filter((item) =>
                allowedPlates.has(
                    normalizePlate(
                        item?.plate
                    )
                )
            )
            .slice(0, 20);
    }, [
        allNotifications,
        trackedPlates,
        hasTrackedVehicles,
    ]);

    const tickerItems = useMemo(() => {
        return notifications.map((item) => ({
            ...item,

            tickerKey:
                item.id ||
                `${item.type}-${item.plate}-${item.ref}`,
        }));
    }, [notifications]);

    function handleOpen(item) {
        if (!item?.plate) return;

        localStorage.setItem(
            "fts_focus_plate",
            item.plate
        );

        window.dispatchEvent(
            new CustomEvent(
                "fts_notification_vehicle_open",
                {
                    detail: {
                        plate: item.plate,
                        notificationId:
                            item.id,
                    },
                }
            )
        );
    }

    function dismiss(item, event) {
        event.stopPropagation();

        if (item?.id) {
            notificationEngine.remove(
                item.id
            );
        }

        refresh();
    }

    function hideVisibleNotifications() {
        const visibleIds = new Set(
            tickerItems
                .map((item) => item.id)
                .filter(Boolean)
        );

        notificationEngine
            .getAll()
            .forEach((item) => {
                if (
                    visibleIds.has(item.id) &&
                    !item.read
                ) {
                    notificationEngine.markRead(
                        item.id
                    );
                }
            });

        refresh();
    }

    if (
        tickerItems.length === 0 ||
        trackedDrawerOpen
    ) {
        return null;
    }

    return (
        <div className="notification-ticker">
            <div className="notification-ticker-label">
                <span className="notification-ticker-pulse" />

                <strong>
                    CANLI ALARMLAR
                </strong>

                <em>
                    {tickerItems.length}
                </em>
            </div>

            <div className="notification-ticker-viewport">
                <div className="notification-ticker-track">
                    {[
                        ...tickerItems,
                        ...tickerItems,
                    ].map((item, index) => (
                        <button
                            key={`${item.tickerKey}-${index}`}
                            type="button"
                            className={[
                                "notification-ticker-item",
                                item.level ||
                                    "info",
                            ]
                                .filter(
                                    Boolean
                                )
                                .join(" ")}
                            onClick={() =>
                                handleOpen(item)
                            }
                        >
                            <span className="notification-ticker-icon">
                                {getIcon(
                                    item.level
                                )}
                            </span>

                            <strong>
                                {item.plate ||
                                    "-"}
                            </strong>

                            <span>
                                {item.title ||
                                    "Bildirim"}
                            </span>

                            {item.message && (
                                <small>
                                    {
                                        item.message
                                    }
                                </small>
                            )}

                            <time>
                                {formatTime(
                                    item.createdAt
                                )}
                            </time>

                            <span
                                role="button"
                                tabIndex={0}
                                className="notification-ticker-close"
                                onClick={(
                                    event
                                ) =>
                                    dismiss(
                                        item,
                                        event
                                    )
                                }
                                onKeyDown={(
                                    event
                                ) => {
                                    if (
                                        event.key ===
                                            "Enter" ||
                                        event.key ===
                                            " "
                                    ) {
                                        dismiss(
                                            item,
                                            event
                                        );
                                    }
                                }}
                                aria-label="Bildirimi kapat"
                            >
                                ×
                            </span>
                        </button>
                    ))}
                </div>
            </div>

            <button
                type="button"
                className="notification-ticker-clear"
                onClick={
                    hideVisibleNotifications
                }
            >
                Görünenleri Gizle
            </button>
        </div>
    );
}