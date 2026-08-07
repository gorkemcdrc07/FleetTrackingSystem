import L from "leaflet";

export function getVehicleStatus(vehicle) {
    const speed = Number(vehicle?.speed || vehicle?.velocity || 0);

    if (speed > 0) return "moving";
    if (vehicle?.ignition || vehicle?.engine) return "idle";
    return "park";
}

export function getStatusText(status) {
    if (status === "moving") return "Hareket Halinde";
    if (status === "idle") return "Rölantide";
    return "Park Halinde";
}

function getMarkerColor(status) {
    if (status === "moving") return "#16a34a";
    if (status === "idle") return "#f59e0b";
    return "#64748b";
}

export function createVehicleIcon(vehicle, selected = false) {
    const status = getVehicleStatus(vehicle);
    const plate = vehicle?.plate || "-";
    const color = getMarkerColor(status);

    return L.divIcon({
        className: "",
        html: `
            <div class="vehicle-marker-svg ${status} ${selected ? "selected" : ""}">
                <div class="vehicle-svg-icon" style="background:${color}">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                        <path d="M3 7.5C3 6.12 4.12 5 5.5 5H14C15.1 5 16 5.9 16 7V8H18.2C18.73 8 19.24 8.21 19.61 8.59L21.41 10.39C21.79 10.76 22 11.27 22 11.8V16H20.5C20.22 14.58 18.97 13.5 17.46 13.5C15.96 13.5 14.7 14.58 14.42 16H9.58C9.3 14.58 8.04 13.5 6.54 13.5C5.03 13.5 3.78 14.58 3.5 16H2V8.5C2 7.95 2.45 7.5 3 7.5Z" fill="white"/>
                        <path d="M17.45 18.5C18.28 18.5 18.95 17.83 18.95 17C18.95 16.17 18.28 15.5 17.45 15.5C16.62 15.5 15.95 16.17 15.95 17C15.95 17.83 16.62 18.5 17.45 18.5Z" fill="white"/>
                        <path d="M6.55 18.5C7.38 18.5 8.05 17.83 8.05 17C8.05 16.17 7.38 15.5 6.55 15.5C5.72 15.5 5.05 16.17 5.05 17C5.05 17.83 5.72 18.5 6.55 18.5Z" fill="white"/>
                    </svg>
                </div>

                <div class="vehicle-svg-plate">
                    ${plate}
                </div>
            </div>
        `,
        iconSize: selected ? [120, 44] : [104, 40],
        iconAnchor: selected ? [60, 22] : [52, 20],
    });
}
