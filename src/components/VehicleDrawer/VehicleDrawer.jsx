import { useEffect, useMemo, useState } from "react";
import {
    Activity,
    Bell,
    Check,
    Clock3,
    Copy,
    ExternalLink,
    Gauge,
    MapPin,
    Navigation,
    Play,
    Radio,
    Satellite,
    ShieldCheck,
    ShieldOff,
    Truck,
    X,
    Zap,
} from "lucide-react";

import "./VehicleDrawer.css";

import VehicleStatusBadge from "../UI/VehicleStatusBadge";
import EmptyState from "../UI/EmptyState";

import { notificationEngine } from "../../services/notificationEngine";
import { calculateVehicleHealth } from "../../services/vehicleHealthService";
import VehicleTimeline from "../VehicleTimeline/VehicleTimeline";
import { operationEventEngine } from "../../services/operationEventEngine";

const GEOFENCE_EVENT_KEY = "fts_geofence_events";

function normalizePlate(value) {
    return String(value || "")
        .replace(/\s/g, "")
        .toUpperCase();
}

function getPlate(vehicle) {
    return (
        vehicle?.plate ||
        vehicle?.licensePlate ||
        vehicle?.plateNo ||
        "-"
    );
}

function getSpeed(vehicle) {
    const value = Number(
        vehicle?.speed ??
        vehicle?.velocity ??
        0
    );

    return Number.isFinite(value) ? value : 0;
}

function getIgnition(vehicle) {
    return Boolean(
        vehicle?.ignition ??
        vehicle?.engine ??
        vehicle?.contact ??
        false
    );
}

function getStatus(vehicle) {
    if (!vehicle) return "offline";

    const speed = getSpeed(vehicle);

    if (speed > 0) return "moving";
    if (getIgnition(vehicle)) return "idle";

    return "park";
}

function getCoordinate(vehicle) {
    const latitude =
        vehicle?.latitude ??
        vehicle?.lat ??
        vehicle?.y ??
        null;

    const longitude =
        vehicle?.longitude ??
        vehicle?.lng ??
        vehicle?.lon ??
        vehicle?.x ??
        null;

    const parsedLatitude = Number(latitude);
    const parsedLongitude = Number(longitude);

    const hasCoordinate =
        Number.isFinite(parsedLatitude) &&
        Number.isFinite(parsedLongitude) &&
        parsedLatitude >= -90 &&
        parsedLatitude <= 90 &&
        parsedLongitude >= -180 &&
        parsedLongitude <= 180;

    return {
        latitude: hasCoordinate ? parsedLatitude : null,
        longitude: hasCoordinate ? parsedLongitude : null,
        hasCoordinate,
    };
}

function getAddress(vehicle) {
    return (
        vehicle?.address ||
        vehicle?.location ||
        vehicle?.city ||
        vehicle?.lastAddress ||
        "Adres bilgisi bulunmuyor."
    );
}

function getLastDateValue(vehicle) {
    return (
        vehicle?.gpsDate ||
        vehicle?.activityDate ||
        vehicle?.dataTime ||
        vehicle?.lastDataTime ||
        vehicle?.date ||
        null
    );
}

function formatDate(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return String(value);
    }

    return date.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getRelativeTime(value) {
    if (!value) return "Veri zamanı bilinmiyor";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Veri zamanı bilinmiyor";
    }

    const diffMilliseconds = Date.now() - date.getTime();
    const diffMinutes = Math.max(
        0,
        Math.floor(diffMilliseconds / 60000)
    );

    if (diffMinutes < 1) return "Az önce";
    if (diffMinutes < 60) return `${diffMinutes} dakika önce`;

    const hours = Math.floor(diffMinutes / 60);

    if (hours < 24) return `${hours} saat önce`;

    const days = Math.floor(hours / 24);

    return `${days} gün önce`;
}

function getSatelliteCount(vehicle) {
    return (
        vehicle?.satelliteCount ??
        vehicle?.satellites ??
        vehicle?.satellite ??
        "-"
    );
}

function readGeofenceEvents() {
    try {
        const raw = localStorage.getItem(GEOFENCE_EVENT_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function getLatestGeofenceEvent(plate) {
    const normalizedPlate = normalizePlate(plate);

    return readGeofenceEvents()
        .filter(
            (event) =>
                normalizePlate(event?.plate) === normalizedPlate
        )
        .sort((a, b) => {
            const aTime = new Date(
                a?.createdAt || a?.date || 0
            ).getTime();

            const bTime = new Date(
                b?.createdAt || b?.date || 0
            ).getTime();

            return bTime - aTime;
        })[0] || null;
}

function getNotificationIcon(type) {
    if (type === "speed") return <Gauge size={18} />;
    if (type === "idle") return <Clock3 size={18} />;
    if (type === "oldData") return <Radio size={18} />;
    if (type === "gps") return <Satellite size={18} />;
    if (type === "geofence") return <MapPin size={18} />;

    return <Bell size={18} />;
}

function getLevelText(level) {
    if (level === "critical") return "Kritik";
    if (level === "danger") return "Dikkat";
    if (level === "warning") return "Uyarı";

    return "Bilgi";
}

function DetailItem({
    icon,
    label,
    value,
    description,
    full = false,
}) {
    return (
        <div
            className={[
                "vehicle-command-detail",
                full ? "full" : "",
            ]
                .filter(Boolean)
                .join(" ")}
        >
            <div className="vehicle-command-detail-icon">
                {icon}
            </div>

            <div>
                <span>{label}</span>
                <strong>{value}</strong>

                {description && (
                    <small>{description}</small>
                )}
            </div>
        </div>
    );
}

export default function VehicleDrawer({
    open,
    vehicle,
    onClose,
    onGoPlayback,
    onOpenOperations,
}) {
    const [notifications, setNotifications] = useState([]);
    const health = useMemo(() => {
        if (!vehicle) {
            return {
                score: 0,
                status: {
                    key: "critical",
                    label: "Bilinmiyor",
                },
                reasons: [],
            };
        }

        return calculateVehicleHealth(
            vehicle,
            notifications
        );
    }, [vehicle, notifications]);
    const [copied, setCopied] = useState(false);

    const plate = getPlate(vehicle);
    const speed = getSpeed(vehicle);
    const ignition = getIgnition(vehicle);
    const status = getStatus(vehicle);
    const coordinate = getCoordinate(vehicle);
    const lastDateValue = getLastDateValue(vehicle);

    const geofenceEvent = useMemo(
        () => getLatestGeofenceEvent(plate),
        [plate, open]
    );
    const timelineNotifications = useMemo(() => {
    if (!vehicle || plate === "-") {
        return [];
    }

    return notificationEngine.getByPlate(
        plate,
        100
    );
}, [vehicle, plate, notifications, open]);


const vehicleGeofenceEvents = useMemo(() => {
    if (!vehicle || plate === "-") {
        return [];
    }

    const normalizedPlate =
        normalizePlate(plate);

    return readGeofenceEvents()
        .filter(
            (event) =>
                normalizePlate(
                    event?.plate
                ) === normalizedPlate
        )
        .sort((a, b) => {
            const firstDate = new Date(
                a?.createdAt ||
                a?.date ||
                0
            ).getTime();

            const secondDate = new Date(
                b?.createdAt ||
                b?.date ||
                0
            ).getTime();

            return secondDate - firstDate;
        });
}, [vehicle, plate, open]);

    const mapsUrl = coordinate.hasCoordinate
        ? `https://www.google.com/maps?q=${coordinate.latitude},${coordinate.longitude}`
        : "";

    const coordinateText = coordinate.hasCoordinate
        ? `${coordinate.latitude}, ${coordinate.longitude}`
        : "Koordinat bulunmuyor";

    function refreshNotifications() {
        if (!vehicle || plate === "-") {
            setNotifications([]);
            return;
        }

        setNotifications(
            notificationEngine.getByPlate(plate, 8)
        );
    }

    useEffect(() => {
        refreshNotifications();

        window.addEventListener(
            notificationEngine.eventName,
            refreshNotifications
        );

        window.addEventListener(
            "storage",
            refreshNotifications
        );

        return () => {
            window.removeEventListener(
                notificationEngine.eventName,
                refreshNotifications
            );

            window.removeEventListener(
                "storage",
                refreshNotifications
            );
        };
    }, [plate]);

    useEffect(() => {
        if (!open) return undefined;

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        function handleKeyDown(event) {
            if (event.key === "Escape") {
                onClose?.();
            }
        }

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.body.style.overflow = previousOverflow;
            document.removeEventListener(
                "keydown",
                handleKeyDown
            );
        };
    }, [open, onClose]);

    useEffect(() => {
        if (!open) {
            setCopied(false);
        }
    }, [open]);

    if (!open) return null;

    async function handleCopyCoordinate() {
        if (!coordinate.hasCoordinate) return;

        try {
            await navigator.clipboard.writeText(
                `${coordinate.latitude}, ${coordinate.longitude}`
            );

            setCopied(true);

            window.setTimeout(() => {
                setCopied(false);
            }, 1800);
        } catch (error) {
            console.error(
                "Koordinat kopyalanamadı:",
                error
            );
        }
    }

    function handleMarkRead(id) {
        notificationEngine.markRead(id);
        refreshNotifications();
    }

    function handleRemoveNotification(id) {
        notificationEngine.remove(id);
        refreshNotifications();
    }

    return (
        <div
            className="vehicle-command-layer"
            role="dialog"
            aria-modal="true"
            aria-label="Araç detay paneli"
        >
            <button
                type="button"
                className="vehicle-command-backdrop"
                onClick={onClose}
                aria-label="Araç detay panelini kapat"
            />

            <aside className="vehicle-command-drawer">
                <header className="vehicle-command-header">
                    <div className="vehicle-command-identity">
                        <div className="vehicle-command-truck-icon">
                            <Truck size={24} />
                        </div>

                        <div>
                            <span className="vehicle-command-eyebrow">
                                Araç Komuta Merkezi
                            </span>

                            <div className="vehicle-command-title-row">
                                <h2>{plate}</h2>

                                {vehicle && (
                                    <VehicleStatusBadge
                                        status={status}
                                    />
                                )}
                            </div>

                            <p>
                                {getRelativeTime(lastDateValue)}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="vehicle-command-close"
                        onClick={onClose}
                        aria-label="Kapat"
                    >
                        <X size={22} />
                    </button>
                </header>

                {!vehicle ? (
                    <EmptyState
                        title="Araç seçilmedi."
                        description="Detayları incelemek için harita veya araç listesinden bir araç seç."
                    />
                ) : (
                    <div className="vehicle-command-content">
                        <section className="vehicle-command-live-card">
                            <div className="vehicle-command-live-head">
                                <div>
                                    <span>
                                        <Activity size={15} />
                                        Canlı Durum
                                    </span>

                                    <strong>
                                        {status === "moving" &&
                                            "Araç hareket halinde"}

                                        {status === "idle" &&
                                            "Araç rölantide"}

                                        {status === "park" &&
                                            "Araç park halinde"}

                                        {status === "offline" &&
                                            "Araç çevrimdışı"}
                                    </strong>
                                </div>

                                <div className="vehicle-command-live-dot">
                                    <i />
                                    CANLI
                                </div>
                            </div>

                            <div className="vehicle-command-primary-stats">
                                <div>
                                    <span>
                                        <Gauge size={16} />
                                        Anlık Hız
                                    </span>

                                    <strong>
                                        {speed}
                                        <small>km/h</small>
                                    </strong>
                                </div>

                                <div>
                                    <span>
                                        <Zap size={16} />
                                        Kontak
                                    </span>

                                    <strong>
                                        {ignition ? "Açık" : "Kapalı"}
                                    </strong>
                                </div>
                            </div>
                            </section>


                            <section className="vehicle-command-section">
                                <div className="vehicle-command-section-head">
                                    <div>
                                        <span>Araç Analizi</span>
                                        <h3>Araç sağlık skoru</h3>
                                    </div>

                                    <strong>
                                        {health.score}
                                    </strong>
                                </div>

                                <div
                                    className={`vehicle-health-card ${health.status.key}`}
                                >
                                    <div className="vehicle-health-score">
                                        <div
                                            className="vehicle-health-ring"
                                            style={{
                                                "--health-score": health.score,
                                            }}
                                        >
                                            <div>
                                                <strong>
                                                    {health.score}
                                                </strong>

                                                <span>/100</span>
                                            </div>
                                        </div>

                                        <div className="vehicle-health-summary">
                                            <span>
                                                Genel Durum
                                            </span>

                                            <strong>
                                                {health.status.label}
                                            </strong>

                                            <p>
                                                Araç telemetri ve alarm
                                                verilerine göre hesaplandı.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="vehicle-health-reasons">
                                        {health.reasons.map(
                                            (reason, index) => (
                                                <div
                                                    key={`${reason.type}-${index}`}
                                                    className={`vehicle-health-reason ${reason.level}`}
                                                >
                                                    <i />

                                                    <span>
                                                        {reason.label}
                                                    </span>

                                                    {reason.penalty > 0 && (
                                                        <strong>
                                                            -{reason.penalty}
                                                        </strong>
                                                    )}
                                                </div>
                                            )
                                        )}
                                    </div>
                                </div>
                            </section>
                        <section className="vehicle-command-section">
                            <div className="vehicle-command-section-head">
                                <div>
                                    <span>Telemetri</span>
                                    <h3>Araç bilgileri</h3>
                                </div>
                            </div>

                            <div className="vehicle-command-detail-grid">
                                <DetailItem
                                    icon={<MapPin size={18} />}
                                    label="Adres"
                                    value={getAddress(vehicle)}
                                    full
                                />

                                <DetailItem
                                    icon={<Navigation size={18} />}
                                    label="Koordinat"
                                    value={coordinateText}
                                    description={
                                        coordinate.hasCoordinate
                                            ? "Geçerli GPS konumu"
                                            : "Konum alınamıyor"
                                    }
                                />

                                <DetailItem
                                    icon={<Clock3 size={18} />}
                                    label="Son Veri"
                                    value={formatDate(lastDateValue)}
                                    description={getRelativeTime(
                                        lastDateValue
                                    )}
                                />

                                <DetailItem
                                    icon={<Satellite size={18} />}
                                    label="Uydu"
                                    value={getSatelliteCount(vehicle)}
                                    description="GPS uydu sayısı"
                                />

                                <DetailItem
                                    icon={<Radio size={18} />}
                                    label="Veri Durumu"
                                    value={
                                        lastDateValue
                                            ? "Veri alınıyor"
                                            : "Veri yok"
                                    }
                                    description={
                                        lastDateValue
                                            ? "Mobiliz bağlantısı aktif"
                                            : "Son veri zamanı bulunamadı"
                                    }
                                />
                            </div>
                        </section>

                        <section className="vehicle-command-section">
                            <div className="vehicle-command-section-head">
                                <div>
                                    <span>Alan Kontrolü</span>
                                    <h3>Geofence durumu</h3>
                                </div>
                            </div>

                            <div
                                className={[
                                    "vehicle-command-geofence",
                                    geofenceEvent?.status === "inside"
                                        ? "inside"
                                        : geofenceEvent
                                            ? "outside"
                                            : "unknown",
                                ].join(" ")}
                            >
                                <div className="vehicle-command-geofence-icon">
                                    {geofenceEvent?.status ===
                                        "inside" ? (
                                        <ShieldCheck size={24} />
                                    ) : (
                                        <ShieldOff size={24} />
                                    )}
                                </div>

                                <div>
                                    <span>
                                        {!geofenceEvent &&
                                            "Geofence kaydı yok"}

                                        {geofenceEvent?.status ===
                                            "inside" &&
                                            "Tanımlı alan içinde"}

                                        {geofenceEvent?.status !==
                                            "inside" &&
                                            geofenceEvent &&
                                            "Tanımlı alan dışında"}
                                    </span>

                                    <strong>
                                        {geofenceEvent?.geofenceName ||
                                            "Alan bilgisi bulunmuyor"}
                                    </strong>

                                    <small>
                                        {geofenceEvent
                                            ? formatDate(
                                                geofenceEvent.createdAt ||
                                                geofenceEvent.date
                                            )
                                            : "Bu araç için geofence olayı kaydedilmemiş."}
                                    </small>
                                </div>
                            </div>
                        </section>
                        <section className="vehicle-command-section">
    <div className="vehicle-command-section-head">
        <div>
            <span>Araç Geçmişi</span>
            <h3>Operasyon zaman çizelgesi</h3>
        </div>

        <strong>
            {timelineNotifications.length +
                vehicleOperationEvents.length +
                vehicleGeofenceEvents.length}
        </strong>
    </div>

    <VehicleTimeline
        vehicle={vehicle}
        notifications={timelineNotifications}
        operationEvents={vehicleOperationEvents}
        geofenceEvents={vehicleGeofenceEvents}
        maxItems={150}
        onEventClick={(event) => {
            const latitude =
                event?.metadata?.latitude ??
                event?.metadata?.lat;

            const longitude =
                event?.metadata?.longitude ??
                event?.metadata?.lng;

            if (
                latitude == null ||
                longitude == null
            ) {
                return;
            }

            window.open(
                `https://www.google.com/maps?q=${latitude},${longitude}`,
                "_blank",
                "noopener,noreferrer"
            );
        }}
    />
</section>

                        <section className="vehicle-command-section">
                            <div className="vehicle-command-section-head">
                                <div>
                                    <span>Alarm Merkezi</span>
                                    <h3>Son bildirimler</h3>
                                </div>

                                <strong>
                                    {notifications.length}
                                </strong>
                            </div>

                            {notifications.length === 0 ? (
                                <EmptyState
                                    title="Bildirim bulunmuyor."
                                    description="Bu araç için kayıtlı aktif bildirim yok."
                                />
                            ) : (
                                <div className="vehicle-command-notification-list">
                                    {notifications.map((notification) => (
                                        <article
                                            key={notification.id}
                                            className={[
                                                "vehicle-command-notification",
                                                notification.level || "",
                                                notification.read
                                                    ? "read"
                                                    : "",
                                            ]
                                                .filter(Boolean)
                                                .join(" ")}
                                        >
                                            <div className="vehicle-command-notification-icon">
                                                {getNotificationIcon(
                                                    notification.type
                                                )}
                                            </div>

                                            <div className="vehicle-command-notification-body">
                                                <div className="vehicle-command-notification-top">
                                                    <span>
                                                        {
                                                            notification.title
                                                        }
                                                    </span>

                                                    <em>
                                                        {getLevelText(
                                                            notification.level
                                                        )}
                                                    </em>
                                                </div>

                                                <p>
                                                    {
                                                        notification.message
                                                    }
                                                </p>

                                                <small>
                                                    {formatDate(
                                                        notification.createdAt
                                                    )}
                                                </small>

                                                <div className="vehicle-command-notification-actions">
                                                    {!notification.read && (
                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                handleMarkRead(
                                                                    notification.id
                                                                )
                                                            }
                                                        >
                                                            Okundu
                                                        </button>
                                                    )}

                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            handleRemoveNotification(
                                                                notification.id
                                                            )
                                                        }
                                                    >
                                                        Sil
                                                    </button>
                                                </div>
                                            </div>
                                        </article>
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}

                {vehicle && (
                    <footer className="vehicle-command-footer">
                        <div className="vehicle-command-secondary-actions">
                            {mapsUrl && (
                                <a
                                    href={mapsUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                >
                                    <MapPin size={17} />
                                    Haritada Aç
                                    <ExternalLink size={14} />
                                </a>
                            )}

                            <button
                                type="button"
                                onClick={handleCopyCoordinate}
                                disabled={!coordinate.hasCoordinate}
                            >
                                {copied ? (
                                    <Check size={17} />
                                ) : (
                                    <Copy size={17} />
                                )}

                                {copied
                                    ? "Kopyalandı"
                                    : "Koordinatı Kopyala"}
                            </button>
                        </div>

                        <div className="vehicle-command-main-actions">
                            {onOpenOperations && (
                                <button
                                    type="button"
                                    className="vehicle-command-operation-button"
                                    onClick={() =>
                                        onOpenOperations(vehicle)
                                    }
                                >
                                    <Activity size={18} />
                                    Operasyon Merkezi
                                </button>
                            )}

                            <button
                                type="button"
                                className="vehicle-command-playback-button"
                                onClick={() =>
                                    onGoPlayback?.(vehicle)
                                }
                            >
                                <Play size={18} />
                                Playback’e Git
                            </button>
                        </div>
                    </footer>
                )}
            </aside>
        </div>
    );
}