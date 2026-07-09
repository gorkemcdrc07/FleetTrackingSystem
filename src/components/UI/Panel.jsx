import "./Panel.css";

export default function Panel({ title, subtitle, actions, children, className = "" }) {
    return (
        <section className={`ui-panel ${className}`}>
            {(title || subtitle || actions) && (
                <div className="ui-panel-head">
                    <div>
                        {title && <h2>{title}</h2>}
                        {subtitle && <p>{subtitle}</p>}
                    </div>

                    {actions && <div className="ui-panel-actions">{actions}</div>}
                </div>
            )}

            {children}
        </section>
    );
}