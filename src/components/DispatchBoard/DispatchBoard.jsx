import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    DISPATCH_COLUMNS,
    dispatchBoardService,
} from "../../services/dispatchBoardService";

import "./DispatchBoard.css";

function formatTime(value) {
    if (!value) return "-";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return "-";
    }

    return date.toLocaleString("tr-TR", {
        day: "2-digit",
        month: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getDelayInfo(item) {
    if (!item?.eta) {
        return {
            delayed: false,
            text: "ETA yok",
        };
    }

    const etaDate = new Date(item.eta);

    if (Number.isNaN(etaDate.getTime())) {
        return {
            delayed: false,
            text: "ETA geçersiz",
        };
    }

    const diffMinutes = Math.floor(
        (Date.now() - etaDate.getTime()) / 60000
    );

    if (diffMinutes <= 0) {
        return {
            delayed: false,
            text: `${Math.abs(diffMinutes)} dk kaldı`,
        };
    }

    return {
        delayed: true,
        text: `${diffMinutes} dk gecikti`,
    };
}

function clampProgress(value) {
    return Math.max(
        0,
        Math.min(100, Number(value || 0))
    );
}

export default function DispatchBoard({
    onOpenVehicle,
}) {
    const [items, setItems] = useState(() =>
        dispatchBoardService.getAll()
    );

    const [draggingId, setDraggingId] =
        useState(null);

    const [dropColumn, setDropColumn] =
        useState(null);

    const [search, setSearch] =
        useState("");

    function refresh() {
        setItems(dispatchBoardService.getAll());
    }

    useEffect(() => {
        window.addEventListener(
            dispatchBoardService.eventName,
            refresh
        );

        window.addEventListener(
            "storage",
            refresh
        );

        return () => {
            window.removeEventListener(
                dispatchBoardService.eventName,
                refresh
            );

            window.removeEventListener(
                "storage",
                refresh
            );
        };
    }, []);

    const filteredItems = useMemo(() => {
        const query = search
            .trim()
            .toLocaleLowerCase("tr-TR");

        if (!query) return items;

        return items.filter((item) =>
            [
                item.plate,
                item.customer,
                item.project,
                item.driver,
                item.origin,
                item.destination,
            ].some((value) =>
                String(value || "")
                    .toLocaleLowerCase("tr-TR")
                    .includes(query)
            )
        );
    }, [items, search]);

    function handleDragStart(event, item) {
        setDraggingId(item.id);

        event.dataTransfer.effectAllowed =
            "move";

        event.dataTransfer.setData(
            "text/plain",
            item.id
        );
    }

    function handleDrop(event, status) {
        event.preventDefault();

        const id =
            event.dataTransfer.getData(
                "text/plain"
            ) || draggingId;

        if (!id) return;

        dispatchBoardService.move(id, status);

        setDraggingId(null);
        setDropColumn(null);
    }

    return (
        <section className="dispatch-board">
            <header className="dispatch-board-head">
                <div>
                    <span>Operasyon Yönetimi</span>
                    <h2>Dispatch Board</h2>
                    <p>
                        Seferleri operasyon durumuna göre
                        sürükleyip bırak.
                    </p>
                </div>

                <div className="dispatch-board-head-actions">
                    <div className="dispatch-board-search">
                        <input
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Plaka, müşteri veya sürücü ara..."
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

                    <button
                        type="button"
                        onClick={() => {
                            dispatchBoardService.add({
                                plate: "Yeni Araç",
                                customer: "Yeni Müşteri",
                                project: "Yeni Operasyon",
                                driver: "Sürücü atanmadı",
                                status: "waiting",
                            });
                        }}
                    >
                        + Yeni Operasyon
                    </button>
                </div>
            </header>

            <div className="dispatch-board-columns">
                {DISPATCH_COLUMNS.map((column) => {
                    const columnItems =
                        filteredItems.filter(
                            (item) =>
                                item.status ===
                                column.key
                        );

                    return (
                        <section
                            key={column.key}
                            className={[
                                "dispatch-column",
                                dropColumn ===
                                    column.key
                                    ? "drop-active"
                                    : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            onDragOver={(event) => {
                                event.preventDefault();
                                setDropColumn(
                                    column.key
                                );
                            }}
                            onDragLeave={() =>
                                setDropColumn(null)
                            }
                            onDrop={(event) =>
                                handleDrop(
                                    event,
                                    column.key
                                )
                            }
                        >
                            <div className="dispatch-column-head">
                                <div>
                                    <span>
                                        {column.title}
                                    </span>

                                    <strong>
                                        {
                                            columnItems.length
                                        }
                                    </strong>
                                </div>
                            </div>

                            <div className="dispatch-column-list">
                                {columnItems.length ===
                                    0 ? (
                                    <div className="dispatch-column-empty">
                                        Bu aşamada operasyon
                                        bulunmuyor.
                                    </div>
                                ) : (
                                    columnItems.map(
                                        (item) => {
                                            const delay =
                                                getDelayInfo(
                                                    item
                                                );

                                            const progress =
                                                clampProgress(
                                                    item.progress
                                                );

                                            return (
                                                <article
                                                    key={
                                                        item.id
                                                    }
                                                    draggable
                                                    className={[
                                                        "dispatch-card",
                                                        draggingId ===
                                                            item.id
                                                            ? "dragging"
                                                            : "",
                                                        item.priority ||
                                                        "normal",
                                                    ]
                                                        .filter(
                                                            Boolean
                                                        )
                                                        .join(
                                                            " "
                                                        )}
                                                    onDragStart={(
                                                        event
                                                    ) =>
                                                        handleDragStart(
                                                            event,
                                                            item
                                                        )
                                                    }
                                                    onDragEnd={() => {
                                                        setDraggingId(
                                                            null
                                                        );

                                                        setDropColumn(
                                                            null
                                                        );
                                                    }}
                                                >
                                                    <div className="dispatch-card-top">
                                                        <div>
                                                            <span>
                                                                {
                                                                    item.customer
                                                                }
                                                            </span>

                                                            <strong>
                                                                {
                                                                    item.plate
                                                                }
                                                            </strong>
                                                        </div>

                                                        {item.alarmCount >
                                                            0 && (
                                                                <em>
                                                                    {
                                                                        item.alarmCount
                                                                    }{" "}
                                                                    Alarm
                                                                </em>
                                                            )}
                                                    </div>

                                                    <div className="dispatch-card-project">
                                                        {
                                                            item.project
                                                        }
                                                    </div>

                                                    <div className="dispatch-card-route">
                                                        <span>
                                                            {
                                                                item.origin
                                                            }
                                                        </span>

                                                        <i>
                                                            →
                                                        </i>

                                                        <span>
                                                            {
                                                                item.destination
                                                            }
                                                        </span>
                                                    </div>

                                                    <div className="dispatch-card-info">
                                                        <div>
                                                            <span>
                                                                Sürücü
                                                            </span>

                                                            <strong>
                                                                {
                                                                    item.driver
                                                                }
                                                            </strong>
                                                        </div>

                                                        <div>
                                                            <span>
                                                                ETA
                                                            </span>

                                                            <strong>
                                                                {formatTime(
                                                                    item.eta
                                                                )}
                                                            </strong>
                                                        </div>
                                                    </div>

                                                    <div className="dispatch-progress">
                                                        <div>
                                                            <span>
                                                                İlerleme
                                                            </span>

                                                            <strong>
                                                                {
                                                                    progress
                                                                }
                                                                %
                                                            </strong>
                                                        </div>

                                                        <div className="dispatch-progress-track">
                                                            <i
                                                                style={{
                                                                    width: `${progress}%`,
                                                                }}
                                                            />
                                                        </div>
                                                    </div>

                                                    <div className="dispatch-card-footer">
                                                        <span
                                                            className={
                                                                delay.delayed
                                                                    ? "delayed"
                                                                    : ""
                                                            }
                                                        >
                                                            {
                                                                delay.text
                                                            }
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                onOpenVehicle?.(
                                                                    item.plate,
                                                                    item
                                                                )
                                                            }
                                                        >
                                                            Aracı Aç
                                                        </button>
                                                    </div>
                                                </article>
                                            );
                                        }
                                    )
                                )}
                            </div>
                        </section>
                    );
                })}
            </div>
        </section>
    );
}