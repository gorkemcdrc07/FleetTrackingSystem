import "./StatCard.css";

export default function StatCard({ label, value, hint, tone = "default" }) {
    return (
        <div className={`ui-stat-card ${tone}`}>
            <span>{label}</span>
            <strong>{value}</strong>
            {hint && <small>{hint}</small>}
        </div>
    );
}