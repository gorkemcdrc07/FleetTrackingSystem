const STORAGE_KEY = "fts_tracked_vehicles";
const EVENT_NAME = "fts_tracked_vehicles_updated";

function normalizePlate(value) {
    return String(value || "")
        .replace(/\s/g, "")
        .toUpperCase();
}

function readPlates() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];

        return Array.isArray(parsed)
            ? parsed
                  .map(normalizePlate)
                  .filter(Boolean)
            : [];
    } catch {
        return [];
    }
}

function writePlates(plates) {
    const next = [
        ...new Set(
            plates
                .map(normalizePlate)
                .filter(Boolean)
        ),
    ];

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(next)
    );

    window.dispatchEvent(
        new CustomEvent(EVENT_NAME, {
            detail: next,
        })
    );

    return next;
}

export const trackedVehiclesService = {
    eventName: EVENT_NAME,

    getAll() {
        return readPlates();
    },

    isTracked(plate) {
        return readPlates().includes(
            normalizePlate(plate)
        );
    },

    add(plate) {
        return writePlates([
            ...readPlates(),
            plate,
        ]);
    },

    remove(plate) {
        const normalized =
            normalizePlate(plate);

        return writePlates(
            readPlates().filter(
                (item) =>
                    item !== normalized
            )
        );
    },

    toggle(plate) {
        if (this.isTracked(plate)) {
            return this.remove(plate);
        }

        return this.add(plate);
    },

    clear() {
        return writePlates([]);
    },

    filterVehicles(vehicles = []) {
        const tracked = readPlates();

        if (tracked.length === 0) {
            return vehicles;
        }

        return vehicles.filter((vehicle) =>
            tracked.includes(
                normalizePlate(
                    vehicle?.plate ||
                        vehicle?.licensePlate ||
                        vehicle?.plateNo
                )
            )
        );
    },
};