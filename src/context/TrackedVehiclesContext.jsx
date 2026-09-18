import {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useState,
} from "react";

const STORAGE_KEY = "fts_tracked_vehicles";

const TrackedVehiclesContext = createContext(null);

function normalizePlate(value) {
    return String(value || "")
        .replace(/\s/g, "")
        .toUpperCase();
}

function getVehiclePlate(vehicle) {
    return (
        vehicle?.plate ||
        vehicle?.licensePlate ||
        vehicle?.plateNo ||
        ""
    );
}

function readTrackedPlates() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        if (!Array.isArray(parsed)) {
            return [];
        }

        return [
            ...new Set(
                parsed
                    .map(normalizePlate)
                    .filter(Boolean)
            ),
        ];
    } catch {
        return [];
    }
}

function saveTrackedPlates(plates) {
    const normalized = [
        ...new Set(
            plates
                .map(normalizePlate)
                .filter(Boolean)
        ),
    ];

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(normalized)
    );

    return normalized;
}

export function TrackedVehiclesProvider({
    children,
}) {
    const [
        trackedPlates,
        setTrackedPlatesState,
    ] = useState(readTrackedPlates);

    const setTrackedPlates = useCallback(
        (plates = []) => {
            const next =
                saveTrackedPlates(plates);

            setTrackedPlatesState(next);
        },
        []
    );

    const addVehicle = useCallback(
        (plate) => {
            const normalized =
                normalizePlate(plate);

            if (!normalized) return;

            setTrackedPlatesState(
                (current) => {
                    const next = [
                        ...new Set([
                            ...current,
                            normalized,
                        ]),
                    ];

                    saveTrackedPlates(next);

                    return next;
                }
            );
        },
        []
    );

    const removeVehicle = useCallback(
        (plate) => {
            const normalized =
                normalizePlate(plate);

            setTrackedPlatesState(
                (current) => {
                    const next =
                        current.filter(
                            (item) =>
                                item !==
                                normalized
                        );

                    saveTrackedPlates(next);

                    return next;
                }
            );
        },
        []
    );

    const toggleVehicle = useCallback(
        (plate) => {
            const normalized =
                normalizePlate(plate);

            if (!normalized) return;

            setTrackedPlatesState(
                (current) => {
                    const exists =
                        current.includes(
                            normalized
                        );

                    const next = exists
                        ? current.filter(
                              (item) =>
                                  item !==
                                  normalized
                          )
                        : [
                              ...current,
                              normalized,
                          ];

                    saveTrackedPlates(next);

                    return next;
                }
            );
        },
        []
    );

    const clearTrackedVehicles =
        useCallback(() => {
            saveTrackedPlates([]);
            setTrackedPlatesState([]);
        }, []);

    const isTracked = useCallback(
        (plate) =>
            trackedPlates.includes(
                normalizePlate(plate)
            ),
        [trackedPlates]
    );

    const filterVehicles = useCallback(
        (vehicles = []) => {
            if (
                trackedPlates.length === 0
            ) {
                return vehicles;
            }

            return vehicles.filter(
                (vehicle) =>
                    trackedPlates.includes(
                        normalizePlate(
                            getVehiclePlate(
                                vehicle
                            )
                        )
                    )
            );
        },
        [trackedPlates]
    );

    useEffect(() => {
        function handleStorage(event) {
            if (
                event.key &&
                event.key !== STORAGE_KEY
            ) {
                return;
            }

            setTrackedPlatesState(
                readTrackedPlates()
            );
        }

        window.addEventListener(
            "storage",
            handleStorage
        );

        return () => {
            window.removeEventListener(
                "storage",
                handleStorage
            );
        };
    }, []);

    const value = useMemo(
        () => ({
            trackedPlates,
            trackedCount:
                trackedPlates.length,
            hasTrackedVehicles:
                trackedPlates.length > 0,

            setTrackedPlates,
            addVehicle,
            removeVehicle,
            toggleVehicle,
            clearTrackedVehicles,
            isTracked,
            filterVehicles,
        }),
        [
            trackedPlates,
            setTrackedPlates,
            addVehicle,
            removeVehicle,
            toggleVehicle,
            clearTrackedVehicles,
            isTracked,
            filterVehicles,
        ]
    );

    return (
        <TrackedVehiclesContext.Provider
            value={value}
        >
            {children}
        </TrackedVehiclesContext.Provider>
    );
}

export function useTrackedVehicles() {
    const context = useContext(
        TrackedVehiclesContext
    );

    if (!context) {
        throw new Error(
            "useTrackedVehicles, TrackedVehiclesProvider içinde kullanılmalıdır."
        );
    }

    return context;
}