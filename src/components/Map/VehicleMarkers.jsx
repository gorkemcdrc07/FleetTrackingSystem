import MarkerClusterGroup from "react-leaflet-cluster";
import { Marker, Popup } from "react-leaflet";
import VehiclePopup from "./VehiclePopup";
import { createVehicleIcon } from "./VehicleIcon";

function normalizePlate(value) {
    return String(value || "").replace(/\s/g, "").toUpperCase();
}

export default function VehicleMarkers({
    vehicles = [],
    selectedPlate,
    onVehicleClick,
}) {
    return (
        <MarkerClusterGroup
            chunkedLoading
            maxClusterRadius={55}
            spiderfyOnMaxZoom
            showCoverageOnHover={false}
        >
            {vehicles.map((vehicle) => {
                const lat = Number(vehicle.latitude || vehicle.lat || vehicle.y);
                const lng = Number(
                    vehicle.longitude || vehicle.lng || vehicle.lon || vehicle.x
                );

                if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;

                const selected =
                    normalizePlate(vehicle.plate) === normalizePlate(selectedPlate);

                return (
                    <Marker
                        key={vehicle.id || vehicle.plate}
                        position={[lat, lng]}
                        icon={createVehicleIcon(vehicle, selected)}
                        eventHandlers={{
                            click: () => onVehicleClick?.(vehicle),
                        }}
                    >
                        <Popup minWidth={320}>
                            <VehiclePopup vehicle={vehicle} />
                        </Popup>
                    </Marker>
                );
            })}
        </MarkerClusterGroup>
    );
}
