"use client";

export default function ResearchPanel({
    open, onClose,
    aiModel,
    researchTopic, setResearchTopic,
    researchLoading,
    researchStatus, researchQueries, researchSources,
    researchResult, researchStreaming,
    onRunResearch, onInsertResearch, onNewResearch,
}) {
    if (!open) return null;
    const displayContent = researchStreaming || researchResult;
    return (
        <div style={{
            position: "fixed", top: 0, right: 0, bottom: 0, width: "480px", maxWidth: "100vw",
            background: "var(--bg-1)", borderLeft: "1px solid var(--line)",
            zIndex: 1000, display: "flex", flexDirection: "column",
            boxShadow: "-8px 0 32px rgba(0,0,0,0.1)",
            animation: "slideInRight 0.2s ease-out",
        }}>
            {/* Header */}
            <div style={{
                padding: "16px 20px", borderBottom: "1px solid var(--line)",
                display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
                <div>
                    <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>🔍 Research Agent</div>
                    <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginTop: "2px" }}>
                        Multi-query deep search · {aiModel === "gpt" ? "GPT-5-mini" : "Claude"}
                    </div>
                </div>
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={onClose}
                    style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                >✕</button>
            </div>

            {/* Topic input */}
            <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)" }}>
                <div style={{ display: "flex", gap: "8px" }}>
                    <input
                        style={{
                            flex: 1, padding: "10px 14px", border: "1px solid var(--line-strong)",
                            borderRadius: "8px", background: "var(--bg-0)", color: "var(--text)",
                            fontFamily: "var(--font-mono)", fontSize: "0.76rem", outline: "none",
                            caretColor: "var(--accent)",
                        }}
                        placeholder="What do you want to research?"
                        value={researchTopic}
                        onChange={e => setResearchTopic(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); onRunResearch(researchTopic); } }}
                        disabled={researchLoading}
                        autoFocus
                    />
                    <button
                        className="btn btn-primary btn-sm"
                        onClick={() => onRunResearch(researchTopic)}
                        disabled={researchLoading || !researchTopic.trim()}
                        style={{ padding: "10px 16px", whiteSpace: "nowrap" }}
                    >{researchLoading ? "Researching…" : "Search"}</button>
                </div>
            </div>

            {/* Status & Queries */}
            {(researchStatus || researchQueries.length > 0) && (
                <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--line)", fontSize: "0.64rem" }}>
                    {researchStatus && (
                        <div style={{ color: "var(--accent)", marginBottom: researchQueries.length ? "8px" : 0, fontWeight: 600 }}>
                            ⚡ {researchStatus}
                        </div>
                    )}
                    {researchQueries.length > 0 && (
                        <div style={{ color: "var(--muted)" }}>
                            <div style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px", fontSize: "0.56rem" }}>Search queries:</div>
                            {researchQueries.map((q, i) => (
                                <div key={i} style={{ padding: "2px 0" }}>
                                    <span style={{ color: "var(--accent)", marginRight: "6px" }}>→</span>{q}
                                </div>
                            ))}
                        </div>
                    )}
                    {researchSources > 0 && (
                        <div style={{ marginTop: "6px", color: "var(--text)", fontWeight: 600 }}>
                            📄 {researchSources} sources found
                        </div>
                    )}
                </div>
            )}

            {/* Results */}
            <div style={{
                flex: 1, overflowY: "auto", padding: "16px 20px",
                fontSize: "0.74rem", lineHeight: 1.7, color: "var(--text)",
                fontFamily: "var(--font-mono)",
            }}>
                {!displayContent && !researchLoading && (
                    <div style={{ color: "var(--muted)", textAlign: "center", paddingTop: "40px", fontSize: "0.68rem" }}>
                        <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🔍</div>
                        Enter a topic above to start a deep research session.
                        <br />The agent will search multiple angles and synthesize findings.
                    </div>
                )}
                {researchLoading && !displayContent && (
                    <div style={{ paddingTop: "20px" }}>
                        <div className="skeleton-line w80" />
                        <div className="skeleton-line w60" />
                        <div className="skeleton-line w80" />
                        <div className="skeleton-line w40" />
                    </div>
                )}
                {displayContent && (
                    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {displayContent}
                        {researchStreaming && <span className="ai-cursor">▊</span>}
                    </div>
                )}
            </div>

            {/* Actions */}
            {researchResult && !researchLoading && (
                <div style={{
                    padding: "12px 20px", borderTop: "1px solid var(--line)",
                    display: "flex", gap: "8px", justifyContent: "flex-end",
                }}>
                    <button className="btn btn-ghost btn-sm" onClick={onNewResearch}>
                        ↻ New Research
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={onInsertResearch}>
                        ↵ Insert as Blocks
                    </button>
                </div>
            )}
        </div>
    );
}
