import "./Timeline.css";

export default function Timeline({
    items = [],
    emptyText = "Kayıt bulunmuyor.",
    onItemClick,
}) {
    return (
        <div className="ui-timeline">
            {items.length === 0 ? (
                <div className="ui-timeline-empty">{emptyText}</div>
            ) : (
                items.map((item, index) => {
                    const clickable = Boolean(onItemClick && item.plate);

                    return (
                        <button
                            key={`${item.plate || item.title}-${item.type}-${index}`}
                            type="button"
                            className={`ui-timeline-item ${item.type || ""} ${clickable ? "clickable" : ""
                                }`}
                            onClick={() => clickable && onItemClick(item)}
                            disabled={!clickable}
                        >
                            <time>{item.timeText || "-"}</time>

                            <div>
                                <span>{item.title}</span>
                                <strong>{item.plate}</strong>
                                <p>{item.text}</p>
                            </div>
                        </button>
                    );
                })
            )}
        </div>
    );
}