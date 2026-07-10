import { useEffect, useRef, useState } from "react";
import { notificationEngine } from "../../services/notificationEngine";
import "./NotificationToasts.css";

function getIcon(item) {
    if (item?.type === "speed") return "🚨";
    if (item?.type === "idle") return "⏱️";
    if (item?.type === "oldData") return "🕓";
    if (item?.type === "gps") return "📡";
    if (item?.type === "geofence") return "📍";
    if (item?.type === "test") return "🧪";

    if (item?.level === "critical") return "⛔";
    if (item?.level === "warning") return "⚠️";
    if (item?.level === "danger") return "❗";

    return "🔔";
}

export default function NotificationToasts({
    onOpenVehicle,
}) {
    const [toasts, setToasts] = useState([]);
    const timersRef = useRef(new Map());

    function removeToast(id) {
        setToasts((current) =>
            current.filter((item) => item.id !== id)
        );

        const timer = timersRef.current.get(id);

        if (timer) {
            window.clearTimeout(timer);
            timersRef.current.delete(id);
        }
    }

    function scheduleRemoval(item) {
        const currentTimer =
            timersRef.current.get(item.id);

        if (currentTimer) {
            window.clearTimeout(currentTimer);
        }

        const timer = window.setTimeout(() => {
            removeToast(item.id);
        }, 6500);

        timersRef.current.set(item.id, timer);
    }

    function addToasts(items) {
        const settings =
            notificationEngine.getSettings();

        if (settings.toastEnabled === false) {
            setToasts([]);
            return;
        }

        const incoming = Array.isArray(items)
            ? items
            : [];

        if (incoming.length === 0) return;

        setToasts((current) => {
            const merged = [...incoming, ...current];

            const unique = merged.filter(
                (item, index, array) =>
                    array.findIndex(
                        (candidate) =>
                            candidate.id === item.id
                    ) === index
            );

            return unique.slice(0, 4);
        });

        incoming.forEach(scheduleRemoval);
    }

    useEffect(() => {
        function handleToastEvent(event) {
            addToasts(event?.detail || []);
        }

        window.addEventListener(
            notificationEngine.toastEventName,
            handleToastEvent
        );

        return () => {
            window.removeEventListener(
                notificationEngine.toastEventName,
                handleToastEvent
            );

            timersRef.current.forEach((timer) => {
                window.clearTimeout(timer);
            });

            timersRef.current.clear();
        };
    }, []);

    function handleOpen(item) {
        if (!item?.plate || item.plate === "-") {
            removeToast(item.id);
            return;
        }

        notificationEngine.markRead(item.id);

        localStorage.setItem(
            "fts_focus_plate",
            item.plate
        );

        onOpenVehicle?.(item.plate);
        removeToast(item.id);
    }

    if (toasts.length === 0) return null;

    return (
        <div
            className="notification-toasts"
            aria-live="polite"
        >
            {toasts.map((item) => (
                <article
                    key={item.id}
                    className={`notification-toast ${item.level || ""
                        }`}
                >
                    <button
                        type="button"
                        className="notification-toast-main"
                        onClick={() => handleOpen(item)}
                    >
                        <div className="notification-toast-icon">
                            {getIcon(item)}
                        </div>

                        <div className="notification-toast-content">
                            <span>{item.plate}</span>
                            <strong>{item.title}</strong>
                            <p>{item.message}</p>
                        </div>
                    </button>

                    <button
                        type="button"
                        className="notification-toast-close"
                        onClick={() =>
                            removeToast(item.id)
                        }
                        aria-label="Bildirimi kapat"
                    >
                        ×
                    </button>
                </article>
            ))}
        </div>
    );
}