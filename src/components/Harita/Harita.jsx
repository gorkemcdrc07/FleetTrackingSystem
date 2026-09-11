import {
    MapContainer,
    ScaleControl,
    TileLayer,
    useMap,
} from "react-leaflet";

import {
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import Markerlar from "./Markerlar";
import "./Harita.css";

const DEFAULT_CENTER = [39.0, 35.0];

const MAP_THEMES = {
    standart: {
        label: "Standart",
        description: "OpenStreetMap",
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
    },

    acik: {
        label: "Açık",
        description: "CARTO Light",
        url: "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
        attribution: "© OpenStreetMap © CARTO",
        maxZoom: 20,
    },

    koyu: {
        label: "Koyu",
        description: "CARTO Dark",
        url: "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",
        attribution: "© OpenStreetMap © CARTO",
        maxZoom: 20,
    },

    uydu: {
        label: "Uydu",
        description: "Esri Satellite",
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        attribution:
            "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics",
        maxZoom: 19,
    },
};

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

function getCoordinates(vehicle) {
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

    const lat = Number(latitude);
    const lng = Number(longitude);

    const valid =
        Number.isFinite(lat) &&
        Number.isFinite(lng) &&
        lat >= -90 &&
        lat <= 90 &&
        lng >= -180 &&
        lng <= 180 &&
        !(lat === 0 && lng === 0);

    return {
        lat: valid ? lat : null,
        lng: valid ? lng : null,
        valid,
    };
}

function getValidVehicles(vehicles = []) {
    return vehicles.filter(
        (vehicle) => getCoordinates(vehicle).valid
    );
}

function getAverageCenter(vehicles = []) {
    const validVehicles =
        getValidVehicles(vehicles);

    if (validVehicles.length === 0) {
        return DEFAULT_CENTER;
    }

    const total = validVehicles.reduce(
        (result, vehicle) => {
            const coordinate =
                getCoordinates(vehicle);

            result.lat += coordinate.lat;
            result.lng += coordinate.lng;

            return result;
        },
        {
            lat: 0,
            lng: 0,
        }
    );

    return [
        total.lat / validVehicles.length,
        total.lng / validVehicles.length,
    ];
}

function SelectedVehicleFocus({
    vehicles,
    selectedPlate,
}) {
    const map = useMap();

    useEffect(() => {
        if (!selectedPlate) return;

        const selectedVehicle =
            vehicles.find(
                (vehicle) =>
                    normalizePlate(
                        getPlate(vehicle)
                    ) ===
                    normalizePlate(
                        selectedPlate
                    )
            );

        if (!selectedVehicle) return;

        const coordinate =
            getCoordinates(selectedVehicle);

        if (!coordinate.valid) return;

        map.flyTo(
            [
                coordinate.lat,
                coordinate.lng,
            ],
            Math.max(map.getZoom(), 14),
            {
                duration: 0.75,
            }
        );
    }, [
        map,
        vehicles,
        selectedPlate,
    ]);

    return null;
}

function FitVehiclesController({
    vehicles,
    requestId,
}) {
    const map = useMap();

    useEffect(() => {
        if (!requestId) return;

        const coordinates =
            getValidVehicles(vehicles).map(
                (vehicle) => {
                    const coordinate =
                        getCoordinates(vehicle);

                    return [
                        coordinate.lat,
                        coordinate.lng,
                    ];
                }
            );

        if (coordinates.length === 0) {
            map.flyTo(DEFAULT_CENTER, 6, {
                duration: 0.65,
            });

            return;
        }

        if (coordinates.length === 1) {
            map.flyTo(
                coordinates[0],
                14,
                {
                    duration: 0.65,
                }
            );

            return;
        }

        map.fitBounds(coordinates, {
            padding: [55, 55],
            maxZoom: 14,
            animate: true,
            duration: 0.7,
        });
    }, [
        map,
        vehicles,
        requestId,
    ]);

    return null;
}

function MapResizeController({
    fullscreen,
}) {
    const map = useMap();

    useEffect(() => {
        const timer = window.setTimeout(
            () => {
                map.invalidateSize({
                    animate: false,
                });
            },
            180
        );

        return () =>
            window.clearTimeout(timer);
    }, [map, fullscreen]);

    return null;
}

function MapZoomReader({
    onZoomChange,
}) {
    const map = useMap();

    useEffect(() => {
        function handleZoom() {
            onZoomChange?.(
                map.getZoom()
            );
        }

        handleZoom();

        map.on(
            "zoomend",
            handleZoom
        );

        return () => {
            map.off(
                "zoomend",
                handleZoom
            );
        };
    }, [map, onZoomChange]);

    return null;
}

export default function Harita({
    vehicles = [],
    selectedPlate,
    onVehicleClick,
    zoom = 6,
    height = "100%",
    defaultTheme = "standart",
    showToolbar = true,
    showLabelsByDefault = true,
}) {
    const shellRef = useRef(null);

    const [theme, setTheme] =
        useState(defaultTheme);

    const [
        labelsVisible,
        setLabelsVisible,
    ] = useState(
        showLabelsByDefault
    );

    const [
        fullscreen,
        setFullscreen,
    ] = useState(false);

    const [
        fitRequestId,
        setFitRequestId,
    ] = useState(0);

    const [
        currentZoom,
        setCurrentZoom,
    ] = useState(zoom);

    const center = useMemo(
        () => getAverageCenter(vehicles),
        [vehicles]
    );

    const validVehicles = useMemo(
        () => getValidVehicles(vehicles),
        [vehicles]
    );

    const invalidVehicleCount =
        vehicles.length -
        validVehicles.length;

    const activeTheme =
        MAP_THEMES[theme] ||
        MAP_THEMES.standart;

    useEffect(() => {
        function handleFullscreenChange() {
            const isFullscreen =
                document.fullscreenElement ===
                shellRef.current;

            setFullscreen(isFullscreen);
        }

        document.addEventListener(
            "fullscreenchange",
            handleFullscreenChange
        );

        return () => {
            document.removeEventListener(
                "fullscreenchange",
                handleFullscreenChange
            );
        };
    }, []);

    async function toggleFullscreen() {
        const element =
            shellRef.current;

        if (!element) return;

        try {
            if (
                document.fullscreenElement
            ) {
                await document.exitFullscreen();
            } else {
                await element.requestFullscreen();
            }
        } catch (error) {
            console.error(
                "Tam ekran modu açılamadı:",
                error
            );
        }
    }

    function fitAllVehicles() {
        setFitRequestId(
            Date.now()
        );
    }

    return (
        <div
            ref={shellRef}
            className={[
                "harita-shell",
                fullscreen
                    ? "is-fullscreen"
                    : "",
                `theme-${theme}`,
            ]
                .filter(Boolean)
                .join(" ")}
            style={{
                height: fullscreen
                    ? "100vh"
                    : height,
            }}
        >
            {showToolbar && (
                <div className="harita-toolbar harita-toolbar-pro">
                    <div className="harita-toolbar-identity">
                        <div className="harita-live-indicator">
                            <i />
                        </div>

                        <div>
                            <strong>
                                Canlı Filo Haritası
                            </strong>

                            <span>
                                {validVehicles.length} konumlu araç
                                {invalidVehicleCount > 0
                                    ? ` · ${invalidVehicleCount} GPS yok`
                                    : ""}
                            </span>
                        </div>
                    </div>

                    <div className="harita-toolbar-actions">
                        <button
                            type="button"
                            className="harita-tool-button"
                            onClick={
                                fitAllVehicles
                            }
                            title="Tüm araçları göster"
                        >
                            <span>⌖</span>
                            <b>
                                Tüm Araçlar
                            </b>
                        </button>

                        <button
                            type="button"
                            className={[
                                "harita-tool-button",
                                labelsVisible
                                    ? "active"
                                    : "",
                            ]
                                .filter(Boolean)
                                .join(" ")}
                            onClick={() =>
                                setLabelsVisible(
                                    (current) =>
                                        !current
                                )
                            }
                            title="Araç etiketlerini aç veya kapat"
                        >
                            <span>🏷</span>
                            <b>
                                Etiketler
                            </b>
                        </button>

                        <label className="harita-theme-select">
                            <span>
                                Katman
                            </span>

                            <select
                                value={theme}
                                onChange={(
                                    event
                                ) =>
                                    setTheme(
                                        event
                                            .target
                                            .value
                                    )
                                }
                            >
                                {Object.entries(
                                    MAP_THEMES
                                ).map(
                                    ([
                                        key,
                                        item,
                                    ]) => (
                                        <option
                                            key={
                                                key
                                            }
                                            value={
                                                key
                                            }
                                        >
                                            {
                                                item.label
                                            }
                                        </option>
                                    )
                                )}
                            </select>
                        </label>

                        <button
                            type="button"
                            className="harita-fullscreen-button"
                            onClick={
                                toggleFullscreen
                            }
                            title={
                                fullscreen
                                    ? "Tam ekrandan çık"
                                    : "Tam ekran"
                            }
                        >
                            {fullscreen
                                ? "✕"
                                : "⛶"}
                        </button>
                    </div>
                </div>
            )}

            <div className="harita-map-area">
                <MapContainer
                    center={center}
                    zoom={zoom}
                    className="harita-map"
                    zoomControl
                    preferCanvas
                >
                    <TileLayer
                        key={theme}
                        attribution={
                            activeTheme.attribution
                        }
                        url={
                            activeTheme.url
                        }
                        maxZoom={
                            activeTheme.maxZoom
                        }
                    />

                    <ScaleControl
                        position="bottomleft"
                        metric
                        imperial={false}
                    />

                    <SelectedVehicleFocus
                        vehicles={vehicles}
                        selectedPlate={
                            selectedPlate
                        }
                    />

                    <FitVehiclesController
                        vehicles={vehicles}
                        requestId={
                            fitRequestId
                        }
                    />

                    <MapResizeController
                        fullscreen={
                            fullscreen
                        }
                    />

                    <MapZoomReader
                        onZoomChange={
                            setCurrentZoom
                        }
                    />

                    <Markerlar
                        vehicles={
                            validVehicles
                        }
                        selectedPlate={
                            selectedPlate
                        }
                        onVehicleClick={
                            onVehicleClick
                        }
                        showLabels={
                            labelsVisible
                        }
                        currentZoom={
                            currentZoom
                        }
                    />
                </MapContainer>

                <div className="harita-status-bar">
                    <div>
                        <span className="harita-status-dot" />

                        <strong>
                            Canlı
                        </strong>
                    </div>

                    <div>
                        Zoom {currentZoom}
                    </div>

                    <div>
                        {activeTheme.label}
                    </div>

                    <div>
                        {validVehicles.length} araç
                    </div>
                </div>
            </div>
        </div>
    );
}