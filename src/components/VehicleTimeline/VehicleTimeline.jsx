import {
    useMemo,
    useState,
} from "react";

import {
    AlertTriangle,
    CarFront,
    Clock3,
    Gauge,
    MapPin,
    Navigation,
    Radio,
    Search,
    ShieldCheck,
} from "lucide-react";

import {
    buildVehicleTimeline,
    getVehicleTimelineSummary,
} from "../../services/vehicleTimelineService";

import "./VehicleTimeline.css";

const FILTERS = [
    {
        key: "all",
        label: "Tümü",
    },
    {
        key: "alarm",
        label: "Alarmlar",
    },
    {
        key: "movement",
        label: "Hareket",
    },
    {
        key: "gps",
        label: "GPS",
    },
    {
        key: "geofence",
        label: "Geofence",
    },
    {
        key: "critical",
        label: "Kritik",
    },
];

function getIcon(item) {
    if (item.type === "speed") {
        return <Gauge size={18} />;
    }

    if (item.type === "gps") {
        return <Radio size={18} />;
    }

    if (
        item.type === "geofence-in" ||
        item.type === "geofence-out"
    ) {
        return <MapPin size={18} />;
    }

    if (item.type === "moving") {
        return <Navigation size={18} />;
    }

    if (item.type === "idle") {
        return <Clock3 size={18} />;
    }

    if (item.type === "park") {
        return <CarFront size={18} />;
    }

    if (
        item.level === "critical" ||
        item.level === "danger"
    ) {
        return <AlertTriangle size={18} />;
    }

    return <ShieldCheck size={18} />;
}

function formatTime(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleTimeString(
        "tr-TR",
        {
            hour: "2-digit",
            minute: "2-digit",
        }
    );
}

function formatFullDate(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString(
        "tr-TR",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        }
    );
}

function getDateGroup(value) {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "Tarih Bilinmiyor";
    }

    const now = new Date();

    const todayKey =
        now.toDateString();

    const yesterday =
        new Date(now);

    yesterday.setDate(
        yesterday.getDate() - 1
    );

    if (
        date.toDateString() ===
        todayKey
    ) {
        return "Bugün";
    }

    if (
        date.toDateString() ===
        yesterday.toDateString()
    ) {
        return "Dün";
    }

    return date.toLocaleDateString(
        "tr-TR",
        {
            day: "2-digit",
            month: "long",
            year: "numeric",
        }
    );
}

function matchesFilter(
    item,
    filter
) {
    if (filter === "all") {
        return true;
    }

    if (filter === "critical") {
        return (
            item.level === "critical" ||
            item.level === "danger"
        );
    }

    return item.category === filter;
}

export default function VehicleTimeline({
    vehicle,
    notifications = [],
    operationEvents = [],
    geofenceEvents = [],
    onEventClick,
    maxItems = 150,
}) {
    const [filter, setFilter] =
        useState("all");

    const [search, setSearch] =
        useState("");

    const events = useMemo(
        () =>
            buildVehicleTimeline({
                vehicle,
                notifications,
                operationEvents,
                geofenceEvents,
                maxItems,
            }),
        [
            vehicle,
            notifications,
            operationEvents,
            geofenceEvents,
            maxItems,
        ]
    );

    const summary = useMemo(
        () =>
            getVehicleTimelineSummary(
                events
            ),
        [events]
    );

    const filteredEvents =
        useMemo(() => {
            const query = search
                .trim()
                .toLocaleLowerCase(
                    "tr-TR"
                );

            return events.filter(
                (item) => {
                    const filterMatch =
                        matchesFilter(
                            item,
                            filter
                        );

                    const searchMatch =
                        !query ||
                        String(
                            item.title ||
                            ""
                        )
                            .toLocaleLowerCase(
                                "tr-TR"
                            )
                            .includes(
                                query
                            ) ||
                        String(
                            item.message ||
                            ""
                        )
                            .toLocaleLowerCase(
                                "tr-TR"
                            )
                            .includes(
                                query
                            );

                    return (
                        filterMatch &&
                        searchMatch
                    );
                }
            );
        }, [
            events,
            filter,
            search,
        ]);

    const groupedEvents =
        useMemo(() => {
            return filteredEvents.reduce(
                (
                    result,
                    item
                ) => {
                    const group =
                        getDateGroup(
                            item.createdAt
                        );

                    if (!result[group]) {
                        result[group] = [];
                    }

                    result[group].push(
                        item
                    );

                    return result;
                },
                {}
            );
        }, [filteredEvents]);

    if (!vehicle) {
        return (
            <div className="vehicle-timeline-empty">
                Araç seçilmedi.
            </div>
        );
    }

    return (
        <section className="vehicle-timeline">
            <header className="vehicle-timeline-head">
                <div>
                    <span>
                        ARAÇ GEÇMİŞİ
                    </span>

                    <h3>
                        Canlı zaman çizelgesi
                    </h3>

                    <p>
                        Alarm, GPS,
                        hareket ve geofence
                        olayları.
                    </p>
                </div>

                <strong>
                    {summary.total}
                </strong>
            </header>

            <div className="vehicle-timeline-summary">
                <div>
                    <span>Toplam</span>
                    <strong>
                        {summary.total}
                    </strong>
                </div>

                <div className="danger">
                    <span>Kritik</span>
                    <strong>
                        {summary.critical}
                    </strong>
                </div>

                <div className="warning">
                    <span>Alarm</span>
                    <strong>
                        {summary.alarm}
                    </strong>
                </div>

                <div className="info">
                    <span>Hareket</span>
                    <strong>
                        {summary.movement}
                    </strong>
                </div>

                <div>
                    <span>GPS</span>
                    <strong>
                        {summary.gps}
                    </strong>
                </div>

                <div className="success">
                    <span>Geofence</span>
                    <strong>
                        {summary.geofence}
                    </strong>
                </div>
            </div>

            <div className="vehicle-timeline-tools">
                <div className="vehicle-timeline-filters">
                    {FILTERS.map(
                        (item) => (
                            <button
                                key={
                                    item.key
                                }
                                type="button"
                                className={
                                    filter ===
                                    item.key
                                        ? "active"
                                        : ""
                                }
                                onClick={() =>
                                    setFilter(
                                        item.key
                                    )
                                }
                            >
                                {
                                    item.label
                                }
                            </button>
                        )
                    )}
                </div>

                <div className="vehicle-timeline-search">
                    <Search size={15} />

                    <input
                        value={search}
                        onChange={(
                            event
                        ) =>
                            setSearch(
                                event
                                    .target
                                    .value
                            )
                        }
                        placeholder="Olay ara..."
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

            <div className="vehicle-timeline-list">
                {filteredEvents.length ===
                0 ? (
                    <div className="vehicle-timeline-empty">
                        Bu filtreye uygun
                        olay bulunamadı.
                    </div>
                ) : (
                    Object.entries(
                        groupedEvents
                    ).map(
                        ([
                            group,
                            items,
                        ]) => (
                            <div
                                key={
                                    group
                                }
                                className="vehicle-timeline-group"
                            >
                                <div className="vehicle-timeline-group-title">
                                    <span>
                                        {
                                            group
                                        }
                                    </span>

                                    <i />
                                </div>

                                <div className="vehicle-timeline-items">
                                    {items.map(
                                        (
                                            item
                                        ) => (
                                            <article
                                                key={
                                                    item.id
                                                }
                                                className={[
                                                    "vehicle-timeline-item",
                                                    item.type,
                                                    item.level,
                                                ]
                                                    .filter(
                                                        Boolean
                                                    )
                                                    .join(
                                                        " "
                                                    )}
                                            >
                                                <div className="vehicle-timeline-line">
                                                    <div className="vehicle-timeline-dot">
                                                        {getIcon(
                                                            item
                                                        )}
                                                    </div>

                                                    <i />
                                                </div>

                                                <button
                                                    type="button"
                                                    className="vehicle-timeline-card"
                                                    onClick={() =>
                                                        onEventClick?.(
                                                            item
                                                        )
                                                    }
                                                >
                                                    <div className="vehicle-timeline-card-top">
                                                        <strong>
                                                            {
                                                                item.title
                                                            }
                                                        </strong>

                                                        <time
                                                            title={formatFullDate(
                                                                item.createdAt
                                                            )}
                                                        >
                                                            {formatTime(
                                                                item.createdAt
                                                            )}
                                                        </time>
                                                    </div>

                                                    <p>
                                                        {
                                                            item.message
                                                        }
                                                    </p>

                                                    <footer>
                                                        <span>
                                                            {
                                                                item.source
                                                            }
                                                        </span>

                                                        <em>
                                                            {
                                                                item.category
                                                            }
                                                        </em>
                                                    </footer>
                                                </button>
                                            </article>
                                        )
                                    )}
                                </div>
                            </div>
                        )
                    )
                )}
            </div>
        </section>
    );
}