import Harita from "../../../components/Harita/Harita";

function koordinatliVehicle(vehicle) {
    const latitude =
        vehicle?.latitude ||
        vehicle?.lat ||
        vehicle?.y ||
        "";

    const longitude =
        vehicle?.longitude ||
        vehicle?.lng ||
        vehicle?.lon ||
        vehicle?.x ||
        "";

    return {
        ...vehicle,
        latitude,
        longitude,
    };
}

export default function LiveMap({ vehicle }) {
    const normalizedVehicle = koordinatliVehicle(vehicle);

    if (!normalizedVehicle?.latitude || !normalizedVehicle?.longitude) {
        return (
            <div className="mobiliz-map-placeholder">
                Bu araç için koordinat bilgisi yok.
            </div>
        );
    }

    return (
        <div className="mobiliz-live-map">
            <Harita
                vehicles={[normalizedVehicle]}
                selectedPlate={normalizedVehicle.plate}
                height="450px"
                zoom={13}
            />
        </div>
    );
}
