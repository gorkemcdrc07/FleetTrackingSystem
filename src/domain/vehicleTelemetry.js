export function normalizeVehiclePlate(value) {
    return String(value || "").replace(/\s/g, "").toUpperCase();
}

export function getVehiclePlate(vehicle) {
    return vehicle?.plate || vehicle?.licensePlate || vehicle?.plateNo || "-";
}

export function getVehicleSpeed(vehicle) {
    const value = Number(vehicle?.speed ?? vehicle?.velocity ?? 0);
    return Number.isFinite(value) ? value : 0;
}

export function getVehicleIgnition(vehicle) {
    return Boolean(vehicle?.ignition ?? vehicle?.engine ?? vehicle?.contact ?? false);
}
