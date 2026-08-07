import { useMemo } from "react";
import "./FleetMap.css";

export default function MapFilters({
    vehicles = [],
    filters,
    onChange,
}) {
    const fleets = useMemo(() => {
        return [...new Set(
            vehicles
                .map(v => v.fleetName)
                .filter(Boolean)
        )].sort();
    }, [vehicles]);

    const groups = useMemo(() => {
        return [...new Set(
            vehicles
                .map(v => v.groupName)
                .filter(Boolean)
        )].sort();
    }, [vehicles]);

    return (
        <div className="map-filters">

            <input
                type="text"
                placeholder="Plaka Ara..."
                value={filters.search}
                onChange={(e) =>
                    onChange({
                        ...filters,
                        search: e.target.value,
                    })
                }
            />

            <select
                value={filters.status}
                onChange={(e) =>
                    onChange({
                        ...filters,
                        status: e.target.value,
                    })
                }
            >
                <option value="all">Tüm Durumlar</option>
                <option value="moving">Hareket Halinde</option>
                <option value="idle">Rölantide</option>
                <option value="park">Park Halinde</option>
            </select>

            <select
                value={filters.fleet}
                onChange={(e) =>
                    onChange({
                        ...filters,
                        fleet: e.target.value,
                    })
                }
            >
                <option value="">Tüm Filolar</option>

                {fleets.map(fleet => (
                    <option
                        key={fleet}
                        value={fleet}
                    >
                        {fleet}
                    </option>
                ))}
            </select>

            <select
                value={filters.group}
                onChange={(e) =>
                    onChange({
                        ...filters,
                        group: e.target.value,
                    })
                }
            >
                <option value="">Tüm Gruplar</option>

                {groups.map(group => (
                    <option
                        key={group}
                        value={group}
                    >
                        {group}
                    </option>
                ))}
            </select>

        </div>
    );
}
