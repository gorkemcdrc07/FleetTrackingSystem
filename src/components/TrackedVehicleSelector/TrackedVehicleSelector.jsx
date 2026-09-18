import {
    useEffect,
    useMemo,
    useState,
} from "react";

import { trackedVehiclesService } from "../../services/trackedVehiclesService";
import "./TrackedVehicleSelector.css";

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

export default function TrackedVehicleSelector({
    vehicles = [],
}) {
    const [trackedPlates, setTrackedPlates] =
        useState(() =>
            trackedVehiclesService.getAll()
        );

    const [search, setSearch] =
        useState("");

    function refresh() {
        setTrackedPlates(
            trackedVehiclesService.getAll()
        );
    }

    useEffect(() => {
        window.addEventListener(
            trackedVehiclesService.eventName,
            refresh
        );

        window.addEventListener(
            "storage",
            refresh
        );

        return () => {
            window.removeEventListener(
                trackedVehiclesService.eventName,
                refresh
            );

            window.removeEventListener(
                "storage",
                refresh
            );
        };
    }, []);

    const filteredVehicles = useMemo(() => {
        const query = normalizePlate(search);

        return vehicles.filter((vehicle) =>
            normalizePlate(
                getPlate(vehicle)
            ).includes(query)
        );
    }, [vehicles, search]);

    function handleToggle(plate) {
        trackedVehiclesService.toggle(plate);
        refresh();
    }

    function selectAllVisible() {
        const visiblePlates =
            filteredVehicles.map(getPlate);

        const next = [
            ...new Set([
                ...trackedPlates,
                ...visiblePlates.map(
                    normalizePlate
                ),
            ]),
        ];

        localStorage.setItem(
            "fts_tracked_vehicles",
            JSON.stringify(next)
        );

        window.dispatchEvent(
            new CustomEvent(
                trackedVehiclesService.eventName
            )
        );

        refresh();
    }

    return (
        <section className="tracked-selector">
            <div className="tracked-selector-head">
                <div>
                    <span>Araç Seçimi</span>
                    <h3>Takip edilecek araçlar</h3>
                    <p>
                        Seçilen araçlar harita ve
                        operasyon ekranlarında gösterilir.
                    </p>
                </div>

                <strong>
                    {trackedPlates.length}
                </strong>
            </div>

            <div className="tracked-selector-tools">
                <input
                    value={search}
                    onChange={(event) =>
                        setSearch(
                            event.target.value
                        )
                    }
                    placeholder="Plaka ara..."
                />

                <button
                    type="button"
                    onClick={selectAllVisible}
                >
                    Görünenleri Seç
                </button>

                <button
                    type="button"
                    onClick={() =>
                        trackedVehiclesService.clear()
                    }
                >
                    Seçimi Temizle
                </button>
            </div>

            <div className="tracked-selector-list">
                {filteredVehicles.map(
                    (vehicle) => {
                        const plate =
                            getPlate(vehicle);

                        const checked =
                            trackedPlates.includes(
                                normalizePlate(
                                    plate
                                )
                            );

                        return (
                            <label
                                key={
                                    vehicle?.id ||
                                    plate
                                }
                                className={
                                    checked
                                        ? "selected"
                                        : ""
                                }
                            >
                                <input
                                    type="checkbox"
                                    checked={
                                        checked
                                    }
                                    onChange={() =>
                                        handleToggle(
                                            plate
                                        )
                                    }
                                />

                                <div>
                                    <strong>
                                        {plate}
                                    </strong>

                                    <span>
                                        {vehicle?.address ||
                                            vehicle?.location ||
                                            vehicle?.city ||
                                            "Adres bilgisi yok"}
                                    </span>
                                </div>
                            </label>
                        );
                    }
                )}
            </div>
        </section>
    );
}