import "./PageHeader.css";

export default function PageHeader({
    eyebrow,
    title,
    description,
    actions,
}) {
    return (
        <div className="ui-page-header">
            <div>
                {eyebrow && <span>{eyebrow}</span>}
                <h1>{title}</h1>
                {description && <p>{description}</p>}
            </div>

            {actions && <div className="ui-page-header-actions">{actions}</div>}
        </div>
    );
}