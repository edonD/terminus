"use client";

export default function ArchitectPanel({ blocks, showOutline, onClose, activeBlockId, blockRefs }) {
    const headings = blocks.filter(b => b.type === "heading" || b.type === "heading-h3");

    return (
        <div className={`architect-panel ${showOutline ? "open" : ""}`}>
            <div className="architect-title">
                <span style={{ fontSize: "1.1em" }}>◱</span> Structure
                <button
                    onClick={onClose}
                    style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.8rem" }}
                >✕</button>
            </div>

            {headings.length === 0 ? (
                <div style={{ color: "var(--muted)", fontSize: "0.76rem", fontStyle: "italic", textAlign: "center", marginTop: "40px" }}>
                    No headings yet.<br />Type /h1 or /h2 to outline your thoughts.
                </div>
            ) : (
                <div className="architect-list">
                    {headings.map(h => (
                        <div
                            key={h.id}
                            className={`architect-item ${h.type === "heading" ? "architect-item-h2" : "architect-item-h3"} ${activeBlockId === h.id ? "active" : ""}`}
                            onClick={() => {
                                if (blockRefs.current[h.id]) {
                                    blockRefs.current[h.id].scrollIntoView({ behavior: "smooth", block: "center" });
                                    blockRefs.current[h.id].focus();
                                }
                            }}
                        >
                            {h.content || <span style={{ opacity: 0.4, fontStyle: "italic" }}>Empty heading</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
