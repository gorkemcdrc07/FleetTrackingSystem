import { MapContainer, TileLayer, useMap } from "react-leaflet";
import { useEffect, useMemo, useState } from "react";
import Markerlar from "./Markerlar";
import "./Harita.css";

const MAP_THEMES = {
    standart: {
        label: "Standart",
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: "© OpenStreetMap",
    },
    acik: {
        label: "Açık",
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution: "© OpenStreetMap © CARTO",
    },
    koyu: {
        label: "Koyu",
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: "© OpenStreetMap © CARTO",
    },
};

function ortalamaMerkez(vehicles = []) {
    const valid = vehicles.filter(
        (v) =>
            Number.isFinite(Number(v.latitude || v.lat || v.y)) &&
            Number.isFinite(Number(v.longitude || v.lng || v.lon || v.x))
    );

    if (!valid.length) return [39.0, 35.0];

    const lat =
        valid.reduce((a, b) => a + Number(b.latitude || b.lat || b.y), 0) /
        valid.length;

    const lng =
        valid.reduce(
            (a, b) => a + Number(b.longitude || b.lng || b.lon || b.x),
            0
        ) / valid.length;

    return [lat, lng];
}

function normalizePlate(value) {
    return String(value || "").replace(/\s/g, "").toUpperCase();
}

function HaritaOdakla({ vehicles, selectedPlate }) {
    const map = useMap();

    useEffect(() => {
        if (!selectedPlate) return;

        const selected = vehicles.find(
            (v) => normalizePlate(v.plate) === normalizePlate(selectedPlate)
        );

        if (!selected) return;

        const lat = Number(selected.latitude || selected.lat || selected.y);
        const lng = Number(
            selected.longitude || selected.lng || selected.lon || selected.x
        );

        if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

        map.flyTo([lat, lng], 14, {
            duration: 0.8,
        });
    }, [map, vehicles, selectedPlate]);

    return null;
}

export default function Harita({
    vehicles = [],
    selectedPlate,
    onVehicleClick,
    zoom = 6,
    height = "100%",
}) {
    const [theme, setTheme] = useState("standart");

    const center = useMemo(() => ortalamaMerkez(vehicles), [vehicles]);
    const activeTheme = MAP_THEMES[theme] || MAP_THEMES.standart;

    return (
        <div className="harita-shell" style={{ height }}>
            <div className="harita-toolbar">
                <div>
                    <strong>Harita</strong>
                    <span>{vehicles.length} araç</span>
                </div>

                <select
                    value={theme}
                    onChange={(e) => setTheme(e.target.value)}
                >
                    {Object.entries(MAP_THEMES).map(([key, item]) => (
                        <option key={key} value={key}>
                            {item.label}
                        </option>
                    ))}
                </select>
            </div>

            <MapContainer
                center={center}
                zoom={zoom}
                className="harita-map"
            >
                <TileLayer
                    attribution={activeTheme.attribution}
                    url={activeTheme.url}
                />

                <HaritaOdakla
                    vehicles={vehicles}
                    selectedPlate={selectedPlate}
                />

                <Markerlar
                    vehicles={vehicles}
                    selectedPlate={selectedPlate}
                    onVehicleClick={onVehicleClick}
                />
            </MapContainer>
        </div>
    );
}