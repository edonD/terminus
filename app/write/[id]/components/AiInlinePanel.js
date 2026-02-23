"use client";

const AI_SLASH_COMMANDS = [
    { cmd: "/ai continue", label: "Continue writing", action: "continue" },
    { cmd: "/ai rewrite", label: "Rewrite selection", action: "rewrite" },
    { cmd: "/ai shorter", label: "Make shorter", action: "shorter" },
    { cmd: "/ai longer", label: "Expand", action: "longer" },
    { cmd: "/ai outline", label: "Generate outline", action: "outline" },
    { cmd: "/ai research", label: "Research topic", action: "research" },
];

export default function AiInlinePanel({
    fieldLabel, fieldType, fieldContent,
    aiModel, setAiModel,
    aiLoading, aiStreaming, aiResult,
    customPrompt, setCustomPrompt,
    aiChatHistory,
    executeAI, executeCustomAI, insertAiResult,
    onClose, aiInline,
}) {
    return (
        <div className="ai-inline" style={{ marginBottom: "12px" }}>
            <div className="ai-inline-header" style={{ justifyContent: "space-between" }}>
                <span><span>✦</span> AI Co-Pilot — <strong>{fieldLabel || fieldType}</strong>
                    {fieldContent ? <span style={{ fontSize: "0.58rem", color: "var(--muted)", marginLeft: "8px" }}>"{fieldContent.substring(0, 60)}{fieldContent.length > 60 ? "…" : ""}"</span> : null}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <div style={{ display: "flex", borderRadius: "4px", overflow: "hidden", border: "1px solid var(--line-strong)", fontSize: "0.6rem" }}>
                        <button
                            onClick={() => setAiModel("claude")}
                            style={{ padding: "2px 8px", background: aiModel === "claude" ? "var(--accent)" : "transparent", color: aiModel === "claude" ? "var(--bg-0)" : "var(--muted)", border: "none", cursor: "pointer", fontWeight: 600 }}
                        >Claude</button>
                        <button
                            onClick={() => setAiModel("gpt")}
                            style={{ padding: "2px 8px", background: aiModel === "gpt" ? "var(--accent)" : "transparent", color: aiModel === "gpt" ? "var(--bg-0)" : "var(--muted)", border: "none", cursor: "pointer", fontWeight: 600 }}
                        >GPT-5-mini</button>
                    </div>
                    <button className="btn btn-ghost btn-sm" onClick={onClose} style={{ padding: "2px 8px", fontSize: "0.72rem" }}>✕</button>
                </div>
            </div>

            {/* Recent history */}
            {aiChatHistory.length > 0 && (
                <div style={{ marginBottom: "8px", maxHeight: "100px", overflowY: "auto", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                    <div style={{ fontSize: "0.56rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Recent</div>
                    {aiChatHistory.slice(-3).map((h, i) => (
                        <div key={i} style={{ fontSize: "0.62rem", color: "var(--muted)", padding: "2px 0", display: "flex", gap: "6px" }}>
                            <span style={{ color: "var(--accent)" }}>✦</span>
                            <span>{h.prompt} → <em>{h.response.substring(0, 50)}…</em></span>
                        </div>
                    ))}
                </div>
            )}

            <div className="ai-inline-actions">
                {AI_SLASH_COMMANDS.map(cmd => (
                    <button key={cmd.action} className="btn btn-ghost btn-sm" onClick={() => executeAI(cmd.action, fieldContent)} disabled={aiLoading}>{cmd.label}</button>
                ))}
            </div>

            {/* Custom prompt */}
            <div style={{ marginTop: "10px", display: "flex", gap: "6px" }}>
                <input
                    style={{ flex: 1, padding: "7px 12px", border: "1px solid var(--line-strong)", borderRadius: "6px", background: "var(--bg-0)", color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: "0.72rem", outline: "none", caretColor: "var(--accent)" }}
                    placeholder="Type a custom prompt… e.g. 'make this more persuasive'"
                    value={customPrompt}
                    onChange={e => setCustomPrompt(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); executeCustomAI(); } }}
                    disabled={aiLoading}
                    autoFocus
                />
                <button className="btn btn-primary btn-sm" onClick={executeCustomAI} disabled={aiLoading || !customPrompt.trim()}>⏎</button>
            </div>

            {/* Streaming */}
            {aiLoading && (
                <div style={{ marginTop: "10px" }}>
                    <div style={{ color: "var(--accent)", fontSize: "0.68rem", marginBottom: "6px" }}>✦ {aiStreaming ? "Streaming…" : "Thinking…"}</div>
                    {aiStreaming ? (
                        <div className="ai-result" style={{ opacity: 0.85 }}>{aiStreaming}<span className="ai-cursor">▊</span></div>
                    ) : (<><div className="skeleton-line w80" style={{ marginTop: "4px" }} /><div className="skeleton-line w60" /></>)}
                </div>
            )}

            {/* Result */}
            {aiResult && !aiLoading && (
                <div className="ai-result">
                    {aiResult}
                    <div className="ai-result-actions">
                        <button className="btn btn-primary btn-sm" onClick={insertAiResult}>↵ Insert</button>
                        <button className="btn btn-ghost btn-sm" onClick={() => executeAI(aiInline?.action || "rewrite", aiResult)}>↻ Retry</button>
                        <button className="btn btn-ghost btn-sm" onClick={onClose}>Dismiss</button>
                    </div>
                </div>
            )}
        </div>
    );
}
