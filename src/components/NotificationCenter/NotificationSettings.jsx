import { notificationEngine } from "../../services/notificationEngine";
import "./NotificationSettings.css";

export default function NotificationSettings({ settings, onChange }) {
    function update(key, value) {
        const next = notificationEngine.saveSettings({
            ...settings,
            [key]: value,
        });

        onChange(next);
    }

    return (
        <div className="notification-settings">
            <div className="notification-settings-row">
                <label>Hız Limiti</label>

                <select
                    value={settings.speedLimit}
                    onChange={(e) => update("speedLimit", Number(e.target.value))}
                >
                    <option value={90}>90 km/h</option>
                    <option value={100}>100 km/h</option>
                    <option value={110}>110 km/h</option>
                    <option value={120}>120 km/h</option>
                </select>
            </div>

            <div className="notification-settings-row">
                <label>Eski Veri Süresi</label>

                <select
                    value={settings.oldDataMinutes}
                    onChange={(e) =>
                        update("oldDataMinutes", Number(e.target.value))
                    }
                >
                    <option value={15}>15 dk</option>
                    <option value={30}>30 dk</option>
                    <option value={60}>60 dk</option>
                    <option value={120}>120 dk</option>
                    <option value={240}>240 dk</option>
                </select>
            </div>

            <label className="notification-switch">
                <input
                    type="checkbox"
                    checked={settings.idleEnabled}
                    onChange={(e) => update("idleEnabled", e.target.checked)}
                />
                <span>Rölanti Alarmı</span>
            </label>

            <label className="notification-switch">
                <input
                    type="checkbox"
                    checked={settings.gpsEnabled}
                    onChange={(e) => update("gpsEnabled", e.target.checked)}
                />
                <span>GPS Alarmı</span>
            </label>

            <label className="notification-switch">
                <input
                    type="checkbox"
                    checked={settings.geofenceEnabled}
                    onChange={(e) => update("geofenceEnabled", e.target.checked)}
                />
                <span>Geofence Alarmı</span>
            </label>

            <label className="notification-switch">
                <input
                    type="checkbox"
                    checked={settings.toastEnabled}
                    onChange={(e) => update("toastEnabled", e.target.checked)}
                />
                <span>Toast Bildirimleri</span>
            </label>
        </div>
    );
}