"use client";

export default function TitleGenModal({ show, onClose, loading, suggestions, onSelect, onRegenerate }) {
    if (!show) return null;
    return (
        <div className="title-gen-modal" onClick={onClose}>
            <div className="title-gen-box" onClick={e => e.stopPropagation()}>
                <h3>✦ AI Title Generator</h3>
                <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "16px" }}>
                    {loading
                        ? "Generating titles from your draft with Claude…"
                        : "Click a title to use it:"}
                </p>
                {loading && suggestions.length === 0 && (
                    <div style={{ padding: "12px 0" }}>
                        <div className="skeleton-line w80" />
                        <div className="skeleton-line w60" />
                        <div className="skeleton-line w80" />
                    </div>
                )}
                {suggestions.map((t, i) => (
                    <div key={i} className="title-option" onClick={() => onSelect(t)}>
                        <span className="rank">#{i + 1}</span>
                        {t}
                    </div>
                ))}
                <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between" }}>
                    <button className="btn btn-ghost btn-sm" onClick={onClose}>Cancel</button>
                    {!loading && (
                        <button className="btn btn-ghost btn-sm" onClick={onRegenerate}>↻ Regenerate</button>
                    )}
                </div>
            </div>
        </div>
    );
}
