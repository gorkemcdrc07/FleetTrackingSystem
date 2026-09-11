import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    Check,
    Search,
    Truck,
    X,
} from "lucide-react";

import "./TrackedVehicleDrawer.css";

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

function getAddress(vehicle) {
    return (
        vehicle?.address ||
        vehicle?.location ||
        vehicle?.city ||
        vehicle?.lastAddress ||
        "Adres bilgisi yok"
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

function getStatus(vehicle) {
    const speed = getSpeed(vehicle);
    const ignition = Boolean(
        vehicle?.ignition ??
        vehicle?.engine ??
        vehicle?.contact ??
        false
    );

    if (speed > 0) {
        return {
            key: "moving",
            label: "Hareket",
        };
    }

    if (ignition) {
        return {
            key: "idle",
            label: "Rölanti",
        };
    }

    return {
        key: "park",
        label: "Park",
    };
}

export default function TrackedVehicleDrawer({
    open,
    vehicles = [],
    selectedPlates = [],
    onClose,
    onSave,
}) {
    const [search, setSearch] = useState("");
    const [draftPlates, setDraftPlates] = useState([]);

    useEffect(() => {
        if (!open) return;

        setDraftPlates(
            selectedPlates
                .map(normalizePlate)
                .filter(Boolean)
        );

        setSearch("");
    }, [open, selectedPlates]);

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
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [open, onClose]);

    useEffect(() => {
        window.dispatchEvent(
            new CustomEvent(
                "fts_tracked_drawer_state",
                {
                    detail: {
                        open,
                    },
                }
            )
        );

        return () => {
            window.dispatchEvent(
                new CustomEvent(
                    "fts_tracked_drawer_state",
                    {
                        detail: {
                            open: false,
                        },
                    }
                )
            );
        };
    }, [open]);

    const filteredVehicles = useMemo(() => {
        const query = search
            .trim()
            .toLocaleLowerCase("tr-TR");

        return vehicles
            .filter((vehicle) => {
                if (!query) return true;

                return [
                    getPlate(vehicle),
                    getAddress(vehicle),
                    vehicle?.brand,
                    vehicle?.brandName,
                    vehicle?.model,
                    vehicle?.modelName,
                    vehicle?.fleetName,
                    vehicle?.groupName,
                ].some((value) =>
                    String(value || "")
                        .toLocaleLowerCase("tr-TR")
                        .includes(query)
                );
            })
            .sort((first, second) =>
                getPlate(first).localeCompare(
                    getPlate(second),
                    "tr"
                )
            );
    }, [vehicles, search]);

    const selectedVehicles = useMemo(() => {
        const selectedSet = new Set(draftPlates);

        return vehicles.filter((vehicle) =>
            selectedSet.has(
                normalizePlate(getPlate(vehicle))
            )
        );
    }, [vehicles, draftPlates]);

    const visibleNormalizedPlates = useMemo(
        () =>
            filteredVehicles.map((vehicle) =>
                normalizePlate(getPlate(vehicle))
            ),
        [filteredVehicles]
    );

    const allVisibleSelected =
        visibleNormalizedPlates.length > 0 &&
        visibleNormalizedPlates.every((plate) =>
            draftPlates.includes(plate)
        );

    function togglePlate(plate) {
        const normalized = normalizePlate(plate);

        setDraftPlates((current) => {
            if (current.includes(normalized)) {
                return current.filter(
                    (item) => item !== normalized
                );
            }

            return [...current, normalized];
        });
    }

    function toggleAllVisible() {
        setDraftPlates((current) => {
            if (allVisibleSelected) {
                const visibleSet = new Set(
                    visibleNormalizedPlates
                );

                return current.filter(
                    (plate) => !visibleSet.has(plate)
                );
            }

            return [
                ...new Set([
                    ...current,
                    ...visibleNormalizedPlates,
                ]),
            ];
        });
    }

    function handleSave() {
        onSave?.(draftPlates);
    }

    if (!open) return null;

    return (
        <div
            className="tracked-vehicle-drawer-layer"
            role="dialog"
            aria-modal="true"
            aria-label="Takip edilen araçları seç"
        >
            <button
                type="button"
                className="tracked-vehicle-drawer-backdrop"
                onClick={onClose}
                aria-label="Araç seçim panelini kapat"
            />

            <aside className="tracked-vehicle-drawer">
                <header className="tracked-vehicle-drawer-header">
                    <div className="tracked-vehicle-drawer-title">
                        <div>
                            <Truck size={22} />
                        </div>

                        <section>
                            <span>FİLO FİLTRESİ</span>
                            <h2>Takip Edilen Araçlar</h2>
                            <p>
                                Harita ve operasyon ekranlarında görmek istediğin araçları seç.
                            </p>
                        </section>
                    </div>

                    <button
                        type="button"
                        className="tracked-vehicle-drawer-close"
                        onClick={onClose}
                        aria-label="Kapat"
                    >
                        <X size={20} />
                    </button>
                </header>

                <div className="tracked-vehicle-drawer-summary">
                    <div>
                        <span>API'den gelen</span>
                        <strong>{vehicles.length}</strong>
                    </div>

                    <div className="selected">
                        <span>Seçilen</span>
                        <strong>{draftPlates.length}</strong>
                    </div>

                    <div>
                        <span>Görünen sonuç</span>
                        <strong>{filteredVehicles.length}</strong>
                    </div>
                </div>

                {selectedVehicles.length > 0 && (
                    <div className="tracked-vehicle-selected-area">
                        <div className="tracked-vehicle-selected-head">
                            <span>Seçili araçlar</span>

                            <button
                                type="button"
                                onClick={() => setDraftPlates([])}
                            >
                                Temizle
                            </button>
                        </div>

                        <div className="tracked-vehicle-chips">
                            {selectedVehicles.map((vehicle) => {
                                const plate = getPlate(vehicle);

                                return (
                                    <button
                                        key={vehicle?.id || plate}
                                        type="button"
                                        onClick={() => togglePlate(plate)}
                                    >
                                        <span>{plate}</span>
                                        <X size={13} />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                <div className="tracked-vehicle-drawer-tools">
                    <div className="tracked-vehicle-search">
                        <Search size={17} />

                        <input
                            value={search}
                            onChange={(event) =>
                                setSearch(event.target.value)
                            }
                            placeholder="Plaka, adres, marka veya filo ara..."
                            autoFocus
                        />

                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                aria-label="Aramayı temizle"
                            >
                                <X size={16} />
                            </button>
                        )}
                    </div>

                    <button
                        type="button"
                        className={
                            allVisibleSelected
                                ? "active"
                                : ""
                        }
                        onClick={toggleAllVisible}
                        disabled={filteredVehicles.length === 0}
                    >
                        {allVisibleSelected
                            ? "Görünen Seçimi Kaldır"
                            : "Görünenleri Seç"}
                    </button>
                </div>

                <div className="tracked-vehicle-list">
                    {filteredVehicles.length === 0 ? (
                        <div className="tracked-vehicle-empty">
                            Aramana uygun araç bulunamadı.
                        </div>
                    ) : (
                        filteredVehicles.map((vehicle) => {
                            const plate = getPlate(vehicle);
                            const normalizedPlate = normalizePlate(plate);
                            const checked = draftPlates.includes(normalizedPlate);
                            const status = getStatus(vehicle);

                            return (
                                <button
                                    key={vehicle?.id || plate}
                                    type="button"
                                    className={[
                                        "tracked-vehicle-row",
                                        checked ? "selected" : "",
                                    ]
                                        .filter(Boolean)
                                        .join(" ")}
                                    onClick={() => togglePlate(plate)}
                                >
                                    <span className="tracked-vehicle-checkbox">
                                        {checked && <Check size={15} />}
                                    </span>

                                    <div className="tracked-vehicle-row-main">
                                        <div>
                                            <strong>{plate}</strong>
                                            <span>{getAddress(vehicle)}</span>
                                        </div>

                                        <div className="tracked-vehicle-row-meta">
                                            <em className={status.key}>
                                                {status.label}
                                            </em>
                                            <b>{getSpeed(vehicle)} km/h</b>
                                        </div>
                                    </div>
                                </button>
                            );
                        })
                    )}
                </div>

                <footer className="tracked-vehicle-drawer-footer">
                    <div>
                        <strong>
                            {draftPlates.length > 0
                                ? `${draftPlates.length} araç seçildi`
                                : "Tüm araçlar gösterilecek"}
                        </strong>

                        <span>
                            Hiç araç seçmezsen filtre uygulanmaz.
                        </span>
                    </div>

                    <div>
                        <button
                            type="button"
                            className="secondary"
                            onClick={onClose}
                        >
                            Vazgeç
                        </button>

                        <button
                            type="button"
                            className="primary"
                            onClick={handleSave}
                        >
                            Seçimi Uygula
                        </button>
                    </div>
                </footer>
            </aside>
        </div>
    );
}
