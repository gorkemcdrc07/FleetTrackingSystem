import "./PageHeader.css";

export default function PageHeader({
    eyebrow,
    title,
    description,
    actions,
}) {
    return (
        <header className="page-header">
            <div className="page-header-content">
                {eyebrow && (
                    <span className="page-header-eyebrow">
                        {eyebrow}
                    </span>
                )}

                <h1>{title}</h1>

                {description && (
                    <p>{description}</p>
                )}
            </div>

            {actions && (
                <div className="page-header-actions">
                    {actions}
                </div>
            )}
        </header>
    );
}