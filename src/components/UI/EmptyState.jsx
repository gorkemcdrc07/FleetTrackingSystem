import "./EmptyState.css";

export default function EmptyState({ title = "Kayıt bulunmuyor.", description }) {
    return (
        <div className="ui-empty-state">
            <strong>{title}</strong>
            {description && <p>{description}</p>}
        </div>
    );
}