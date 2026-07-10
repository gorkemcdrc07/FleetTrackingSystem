import "./VehicleStatusBadge.css";

export default function VehicleStatusBadge({ status }) {
    const value = status || "park";

    const labelMap = {
        moving: "Hareket",
        idle: "Rölanti",
        park: "Park",
        offline: "Çevrimdışı",
    };

    return (
        <span className={`ui-vehicle-status ${value}`}>
            {labelMap[value] || "Bilinmiyor"}
        </span>
    );
}