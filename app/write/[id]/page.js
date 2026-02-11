"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import Link from "next/link";

/* ═══════════════════════════════════════════════════
   TONE & SLASH COMMAND DEFINITIONS
   ═══════════════════════════════════════════════════ */
const TONE_OPTIONS = ["formal", "conversational", "technical", "persuasive"];

const SLASH_COMMANDS = [
    { cmd: "/h1", label: "Heading 1", icon: "H1", type: "heading" },
    { cmd: "/h2", label: "Heading 2", icon: "H2", type: "heading-h3" },
    { cmd: "/quote", label: "Blockquote", icon: "❝", type: "quote" },
    { cmd: "/code", label: "Code Block", icon: "</>", type: "code" },
    { cmd: "/divider", label: "Divider", icon: "—", type: "divider" },
    { cmd: "/image", label: "Image", icon: "▣", type: "image" },
    { cmd: "/ai", label: "AI Co-Pilot", icon: "✦", type: "ai" },
];

const AI_SLASH_COMMANDS = [
    { cmd: "/ai continue", label: "Continue writing", action: "continue" },
    { cmd: "/ai rewrite", label: "Rewrite selection", action: "rewrite" },
    { cmd: "/ai shorter", label: "Make shorter", action: "shorter" },
    { cmd: "/ai longer", label: "Expand", action: "longer" },
    { cmd: "/ai outline", label: "Generate outline", action: "outline" },
    { cmd: "/ai research", label: "Research topic", action: "research" },
];

/* ═══════════════════════════════════════════════════
   STREAMING HELPER — calls /api/ai or /api/ai/research
   and progressively returns text via a callback
   ═══════════════════════════════════════════════════ */
async function streamAI({ action, input, context, customPrompt, fieldType, fieldContent, chatHistory, model, onChunk, onDone, onError }) {
    const isResearch = action === "research";
    const url = isResearch ? "/api/ai/research" : "/api/ai";
    const body = isResearch
        ? { topic: input || context, context }
        : { action, input, context, customPrompt, fieldType, fieldContent, chatHistory, model };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Unknown error" }));
            onError(err.error || `HTTP ${res.status}`);
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const payload = line.slice(6).trim();
                    if (payload === "[DONE]") {
                        onDone();
                        return;
                    }
                    try {
                        const data = JSON.parse(payload);
                        if (data.error) {
                            onError(data.error);
                            return;
                        }
                        if (data.text) {
                            onChunk(data.text);
                        }
                    } catch { /* skip non-JSON lines */ }
                }
            }
        }
        onDone();
    } catch (err) {
        onError(err.message);
    }
}

/* ═══════════════════════════════════════════════════
   EDITOR PAGE COMPONENT
   ═══════════════════════════════════════════════════ */
export default function EditorPage({ params }) {
    const resolvedParams = use(params);
    const isNew = resolvedParams.id === "new";

    const [title, setTitle] = useState(isNew ? "" : "The Future of European Fintech Infrastructure");
    const [subtitle, setSubtitle] = useState(isNew ? "" : "Why Europe's regulatory moat is becoming its biggest competitive advantage.");
    const [blocks, setBlocks] = useState(isNew ? [
        { id: "b1", type: "paragraph", content: "" },
    ] : [
        { id: "b1", type: "paragraph", content: "While Silicon Valley moves fast and breaks things, Europe has been quietly building something more durable: a regulatory framework that actually works for fintech innovation." },
        { id: "b2", type: "heading", content: "The Infrastructure Layer" },
        { id: "b3", type: "paragraph", content: "The real opportunity isn't in consumer-facing fintech apps. It's in the plumbing. The APIs, the settlement layers, the compliance engines." },
        { id: "b4", type: "quote", content: "The best time to build financial infrastructure in Europe was five years ago. The second best time is now." },
        { id: "b5", type: "paragraph", content: "Every B2B payment that crosses a border reveals the cracks in legacy banking infrastructure. SWIFT was built for a world of batch processing and paper trails — not real-time settlement and programmable money." },
        { id: "b6", type: "code", content: "const transfer = await stablecoinRail.send({\n  from: vIBAN_sender,\n  to: vIBAN_receiver,\n  amount: 50000,\n  asset: \"EURC\",\n});" },
        { id: "b7", type: "paragraph", content: "" },
    ]);

    const [focusMode, setFocusMode] = useState(false);
    const [activeBlockId, setActiveBlockId] = useState(null);
    const [slashMenu, setSlashMenu] = useState(null);
    const [slashFilter, setSlashFilter] = useState("");
    const [slashIndex, setSlashIndex] = useState(0);
    const [aiInline, setAiInline] = useState(null); // { blockId, action, fieldType }
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [aiStreaming, setAiStreaming] = useState("");
    const [customPrompt, setCustomPrompt] = useState("");
    const [aiModel, setAiModel] = useState("claude"); // "claude" or "gpt"
    const [aiChatHistory, setAiChatHistory] = useState([]); // [{ role, fieldType, prompt, response }]
    const [showTitleGen, setShowTitleGen] = useState(false);
    const [titleSuggestions, setTitleSuggestions] = useState([]);
    const [titlesLoading, setTitlesLoading] = useState(false);
    const [cmdOpen, setCmdOpen] = useState(false);
    const [saveStatus, setSaveStatus] = useState("saved");
    const [detectedTone, setDetectedTone] = useState("conversational");
    const [seoScore, setSeoScore] = useState(72);
    const [dragId, setDragId] = useState(null);
    const [researchOpen, setResearchOpen] = useState(false);
    const [researchTopic, setResearchTopic] = useState("");
    const [researchResult, setResearchResult] = useState("");
    const [researchStreaming, setResearchStreaming] = useState("");
    const [researchLoading, setResearchLoading] = useState(false);
    const [researchQueries, setResearchQueries] = useState([]);
    const [researchStatus, setResearchStatus] = useState("");
    const [researchSources, setResearchSources] = useState(0);

    const blockRefs = useRef({});
    const aiInlineRef = useRef(aiInline);
    const slashMenuRef = useRef(slashMenu);

    // Keep refs in sync for keyboard shortcuts
    useEffect(() => { aiInlineRef.current = aiInline; }, [aiInline]);
    useEffect(() => { slashMenuRef.current = slashMenu; }, [slashMenu]);

    // Auto-detect tone from content
    useEffect(() => {
        const allText = blocks.map(b => b.content).join(" ").toLowerCase();
        if (allText.includes("furthermore") || allText.includes("consequently")) setDetectedTone("formal");
        else if (allText.includes("function") || allText.includes("const") || allText.includes("api")) setDetectedTone("technical");
        else if (allText.includes("you") || allText.includes("let's")) setDetectedTone("conversational");
        else setDetectedTone("persuasive");
    }, [blocks]);

    // Update SEO score
    useEffect(() => {
        const wordCount = getWordCount();
        let score = 50;
        if (title.length > 20 && title.length < 80) score += 15;
        if (subtitle.length > 40) score += 10;
        if (wordCount > 500) score += 10;
        if (blocks.some(b => b.type === "heading")) score += 8;
        if (wordCount > 1000) score += 7;
        setSeoScore(Math.min(98, score));
    }, [title, subtitle, blocks]);

    // Global keyboard shortcuts
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(o => !o); }
            if ((e.metaKey || e.ctrlKey) && e.key === "t") { e.preventDefault(); generateTitles(); }
            if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave(); }
            if (e.key === "Escape") {
                if (aiInlineRef.current) { setAiInline(null); setAiResult(null); setAiStreaming(""); setAiLoading(false); }
                // slashMenu ESC is handled at the block level in handleBlockKeyDown
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    const getWordCount = useCallback(() => {
        const text = [title, subtitle, ...blocks.map(b => b.content)].join(" ");
        return text.split(/\s+/).filter(Boolean).length;
    }, [title, subtitle, blocks]);

    const getCharCount = useCallback(() => {
        return [title, subtitle, ...blocks.map(b => b.content)].join("").length;
    }, [title, subtitle, blocks]);

    const getReadTime = useCallback(() => {
        const words = getWordCount();
        const mins = Math.max(1, Math.ceil(words / 250));
        return `${mins} min`;
    }, [getWordCount]);

    const getDraftContext = useCallback(() => {
        return [title, subtitle, ...blocks.map(b => b.content)].filter(Boolean).join("\n\n");
    }, [title, subtitle, blocks]);

    // Build structured doc context with field labels
    const getStructuredContext = useCallback(() => {
        const parts = [];
        if (title) parts.push(`[TITLE]: ${title}`);
        if (subtitle) parts.push(`[SUBTITLE]: ${subtitle}`);
        blocks.forEach((b, i) => {
            if (b.content) parts.push(`[${b.type.toUpperCase()} block ${i + 1}]: ${b.content}`);
        });
        return parts.join("\n");
    }, [title, subtitle, blocks]);

    // Get the field type label for current AI target
    const getFieldType = useCallback((blockId) => {
        if (blockId === "__title__") return "title";
        if (blockId === "__subtitle__") return "subtitle";
        const block = blocks.find(b => b.id === blockId);
        return block?.type || "paragraph";
    }, [blocks]);

    // Get field content for AI target
    const getFieldContent = useCallback((blockId) => {
        if (blockId === "__title__") return title;
        if (blockId === "__subtitle__") return subtitle;
        const block = blocks.find(b => b.id === blockId);
        return block?.content || "";
    }, [title, subtitle, blocks]);

    const handleSave = () => {
        setSaveStatus("saving");
        setTimeout(() => setSaveStatus("saved"), 600);
    };

    // Block operations
    const updateBlock = (id, content) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
        setSaveStatus("unsaved");
    };

    const addBlockAfter = (afterId, type = "paragraph", content = "") => {
        const newId = `b${Date.now()}`;
        setBlocks(prev => {
            const idx = prev.findIndex(b => b.id === afterId);
            const newBlocks = [...prev];
            newBlocks.splice(idx + 1, 0, { id: newId, type, content });
            return newBlocks;
        });
        setTimeout(() => {
            if (blockRefs.current[newId]) blockRefs.current[newId].focus();
        }, 50);
        return newId;
    };

    const deleteBlock = (id) => {
        if (blocks.length <= 1) return;
        const idx = blocks.findIndex(b => b.id === id);
        setBlocks(prev => prev.filter(b => b.id !== id));
        const prevBlock = blocks[idx - 1];
        if (prevBlock && blockRefs.current[prevBlock.id]) {
            blockRefs.current[prevBlock.id].focus();
        }
    };

    // Handle block key events
    const handleBlockKeyDown = (e, block) => {
        // Slash menu navigation (only intercept specific keys)
        if (slashMenu) {
            const items = getFilteredSlashCommands();
            if (e.key === "ArrowDown") { e.preventDefault(); setSlashIndex(i => Math.min(i + 1, items.length - 1)); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); setSlashIndex(i => Math.max(i - 1, 0)); return; }
            if (e.key === "Enter" && items[slashIndex]) {
                e.preventDefault();
                executeSlashCommand(items[slashIndex], block.id);
                return;
            }
            if (e.key === "Escape") {
                e.preventDefault();
                setSlashMenu(null);
                setSlashFilter("");
                return;
            }
            // All other keys (typing, Backspace, etc.) fall through to native behavior
            // handleBlockInput (onChange) manages opening/closing the menu based on content
        }

        // Normal block key handling (runs whether or not slash menu was open)
        if (e.key === "Enter" && !e.shiftKey && block.type !== "code" && !slashMenu) {
            e.preventDefault();
            addBlockAfter(block.id);
        }
        if (e.key === "Backspace" && block.content === "" && blocks.length > 1) {
            e.preventDefault();
            deleteBlock(block.id);
        }
    };

    const handleBlockInput = (e, block) => {
        const value = e.target.value ?? e.target.textContent ?? "";
        updateBlock(block.id, value);

        // Markdown shortcuts
        if (value === "## ") {
            updateBlock(block.id, "");
            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, type: "heading", content: "" } : b));
        }
        if (value === "### ") {
            updateBlock(block.id, "");
            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, type: "heading-h3", content: "" } : b));
        }
        if (value === "> ") {
            updateBlock(block.id, "");
            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, type: "quote", content: "" } : b));
        }
        if (value === "```") {
            updateBlock(block.id, "");
            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, type: "code", content: "" } : b));
        }
        if (value === "---") {
            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, type: "divider", content: "" } : b));
            addBlockAfter(block.id);
        }

        // Slash menu: open when value is exactly "/"
        if (value === "/" && !slashMenu) {
            setSlashMenu(block.id);
            setSlashFilter("");
            setSlashIndex(0);
        } else if (slashMenu && value.startsWith("/")) {
            setSlashFilter(value);
            setSlashIndex(0);
        } else if (slashMenu && !value.startsWith("/")) {
            // Closed naturally by deleting the "/"
            setSlashMenu(null);
            setSlashFilter("");
        }
    };

    const getFilteredSlashCommands = () => {
        const all = [...SLASH_COMMANDS, ...AI_SLASH_COMMANDS.map(a => ({ ...a, icon: "✦", type: "ai" }))];
        if (!slashFilter) return all;
        return all.filter(c => (c.cmd || c.label).toLowerCase().includes(slashFilter.toLowerCase()));
    };

    const executeSlashCommand = (cmd, blockId) => {
        setSlashMenu(null);

        if (cmd.action) {
            if (cmd.action === "research") {
                updateBlock(blockId, "");
                setResearchOpen(true);
                return;
            }
            setAiInline({ blockId, action: cmd.action });
            updateBlock(blockId, "");
            return;
        }

        if (cmd.type === "divider") {
            setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, type: "divider", content: "" } : b));
            addBlockAfter(blockId);
        } else if (cmd.type === "ai") {
            setAiInline({ blockId, action: null });
            updateBlock(blockId, "");
        } else {
            setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, type: cmd.type, content: "" } : b));
        }
    };

    /* ═══════════════════════════════════════════════════
       AI EXECUTION — Real Claude streaming with history
       ═══════════════════════════════════════════════════ */
    const executeAI = async (action, input) => {
        setAiLoading(true);
        setAiResult(null);
        setAiStreaming("");

        const fieldType = aiInline ? getFieldType(aiInline.blockId) : "paragraph";
        const fieldContent = aiInline ? getFieldContent(aiInline.blockId) : input;
        let accumulated = "";

        await streamAI({
            action,
            input: input || "",
            context: getStructuredContext(),
            fieldType,
            fieldContent,
            chatHistory: aiChatHistory.slice(-10), // last 10 interactions
            model: aiModel,
            onChunk: (text) => {
                accumulated += text;
                setAiStreaming(accumulated);
            },
            onDone: () => {
                setAiResult(accumulated);
                setAiStreaming("");
                setAiLoading(false);
                // Save to chat history
                setAiChatHistory(prev => [...prev, {
                    role: "assistant",
                    fieldType,
                    prompt: `[${action}] on ${fieldType}: "${(input || "").substring(0, 100)}"`,
                    response: accumulated.substring(0, 300),
                    timestamp: Date.now(),
                }]);
            },
            onError: (err) => {
                setAiResult(`Error: ${err}`);
                setAiStreaming("");
                setAiLoading(false);
            },
        });
    };

    const executeCustomAI = async () => {
        if (!customPrompt.trim()) return;
        setAiLoading(true);
        setAiResult(null);
        setAiStreaming("");

        const fieldType = aiInline ? getFieldType(aiInline.blockId) : "paragraph";
        const fieldContent = aiInline ? getFieldContent(aiInline.blockId) : "";
        let accumulated = "";
        const promptText = customPrompt;
        setCustomPrompt("");

        await streamAI({
            action: "custom",
            input: fieldContent,
            context: getStructuredContext(),
            customPrompt: promptText,
            fieldType,
            fieldContent,
            chatHistory: aiChatHistory.slice(-10),
            model: aiModel,
            onChunk: (text) => {
                accumulated += text;
                setAiStreaming(accumulated);
            },
            onDone: () => {
                setAiResult(accumulated);
                setAiStreaming("");
                setAiLoading(false);
                setAiChatHistory(prev => [...prev, {
                    role: "assistant",
                    fieldType,
                    prompt: promptText.substring(0, 100),
                    response: accumulated.substring(0, 300),
                    timestamp: Date.now(),
                }]);
            },
            onError: (err) => {
                setAiResult(`Error: ${err}`);
                setAiStreaming("");
                setAiLoading(false);
            },
        });
    };

    const insertAiResult = () => {
        if (!aiResult || !aiInline) return;
        if (aiInline.blockId === "__title__") {
            setTitle(aiResult.trim());
        } else if (aiInline.blockId === "__subtitle__") {
            setSubtitle(aiResult.trim());
        } else {
            addBlockAfter(aiInline.blockId, "paragraph", aiResult);
        }
        setAiInline(null);
        setAiResult(null);
    };

    /* ═══════════════════════════════════════════════════
       TITLE GENERATOR — Real Claude API
       ═══════════════════════════════════════════════════ */
    const generateTitles = async () => {
        setShowTitleGen(true);
        setTitlesLoading(true);
        setTitleSuggestions([]);

        let accumulated = "";

        await streamAI({
            action: "titles",
            input: title || "",
            context: getDraftContext(),
            onChunk: (text) => {
                accumulated += text;
                // Parse numbered lines in real-time
                const lines = accumulated.split("\n").filter(l => /^\d+[\.\)]/.test(l.trim()));
                setTitleSuggestions(lines.map(l => l.replace(/^\d+[\.\)]\s*/, "").trim()));
            },
            onDone: () => {
                const lines = accumulated.split("\n").filter(l => /^\d+[\.\)]/.test(l.trim()));
                setTitleSuggestions(lines.map(l => l.replace(/^\d+[\.\)]\s*/, "").trim()));
                setTitlesLoading(false);
            },
            onError: (err) => {
                setTitleSuggestions([`Error: ${err}`]);
                setTitlesLoading(false);
            },
        });
    };

    // Drag and drop
    const handleDragStart = (id) => setDragId(id);
    const handleDragOver = (e, id) => {
        e.preventDefault();
        if (!dragId || dragId === id) return;
        const dragIdx = blocks.findIndex(b => b.id === dragId);
        const overIdx = blocks.findIndex(b => b.id === id);
        const newBlocks = [...blocks];
        const [moved] = newBlocks.splice(dragIdx, 1);
        newBlocks.splice(overIdx, 0, moved);
        setBlocks(newBlocks);
    };
    const handleDragEnd = () => setDragId(null);

    /* ═══ REUSABLE AI INLINE PANEL ═══ */
    const AiInlinePanel = ({ fieldLabel }) => {
        const fieldType = getFieldType(aiInline?.blockId);
        const fieldContent = getFieldContent(aiInline?.blockId);
        return (
            <div className="ai-inline" style={{ marginBottom: "12px" }}>
                <div className="ai-inline-header" style={{ justifyContent: "space-between" }}>
                    <span><span>✦</span> AI Co-Pilot — <strong>{fieldLabel || fieldType}</strong>
                        {fieldContent ? <span style={{ fontSize: "0.58rem", color: "var(--muted)", marginLeft: "8px" }}>“{fieldContent.substring(0, 60)}{fieldContent.length > 60 ? "…" : ""}”</span> : null}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ display: "flex", borderRadius: "4px", overflow: "hidden", border: "1px solid var(--line-strong)", fontSize: "0.6rem" }}>
                            <button
                                onClick={() => setAiModel("claude")}
                                style={{ padding: "2px 8px", background: aiModel === "claude" ? "var(--accent)" : "transparent", color: aiModel === "claude" ? "#000" : "var(--muted)", border: "none", cursor: "pointer", fontWeight: 600 }}
                            >Claude</button>
                            <button
                                onClick={() => setAiModel("gpt")}
                                style={{ padding: "2px 8px", background: aiModel === "gpt" ? "var(--accent)" : "transparent", color: aiModel === "gpt" ? "#000" : "var(--muted)", border: "none", cursor: "pointer", fontWeight: 600 }}
                            >GPT-5-mini</button>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setAiInline(null); setAiResult(null); setAiStreaming(""); setAiLoading(false); }} style={{ padding: "2px 8px", fontSize: "0.72rem" }}>✕</button>
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
                            <button className="btn btn-ghost btn-sm" onClick={() => { setAiResult(null); setAiInline(null); }}>Dismiss</button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

    /* ═══ COMMAND BAR ═══ */
    const CommandBar = () => {
        const [query, setQuery] = useState("");
        const [idx, setIdx] = useState(0);
        const commands = [
            { icon: "↗", label: "Publish", action: () => alert("Publishing...") },
            { icon: "▷", label: "Preview", action: () => window.open(`/post/preview`, "_blank") },
            {
                icon: "↓", label: "Export as Markdown", action: () => {
                    const md = `# ${title}\n\n${subtitle}\n\n${blocks.map(b => {
                        if (b.type === "heading") return `## ${b.content}`;
                        if (b.type === "heading-h3") return `### ${b.content}`;
                        if (b.type === "quote") return `> ${b.content}`;
                        if (b.type === "code") return "```\n" + b.content + "\n```";
                        if (b.type === "divider") return "---";
                        return b.content;
                    }).join("\n\n")}`;
                    navigator.clipboard.writeText(md);
                    alert("Markdown copied to clipboard!");
                }
            },
            { icon: "◉", label: "Dashboard", action: () => window.location.href = "/write" },
            { icon: "◇", label: "View Blog", action: () => window.location.href = "/" },
        ];
        const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

        useEffect(() => {
            if (!cmdOpen) return;
            const handler = (e) => {
                if (e.key === "Escape") setCmdOpen(false);
                if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
                if (e.key === "Enter" && filtered[idx]) { filtered[idx].action(); setCmdOpen(false); }
            };
            window.addEventListener("keydown", handler);
            return () => window.removeEventListener("keydown", handler);
        }, [cmdOpen, filtered, idx]);

        if (!cmdOpen) return null;
        return (
            <div className="cmd-overlay" onClick={() => setCmdOpen(false)}>
                <div className="cmd-palette" onClick={e => e.stopPropagation()}>
                    <div className="cmd-input-wrap">
                        <span className="search-icon">⌕</span>
                        <input className="cmd-input" placeholder="Type a command…" value={query}
                            onChange={e => { setQuery(e.target.value); setIdx(0); }} autoFocus />
                    </div>
                    <div className="cmd-results">
                        {filtered.map((c, i) => (
                            <div key={c.label} className={`cmd-item ${i === idx ? "active" : ""}`}
                                onClick={() => { c.action(); setCmdOpen(false); }} onMouseEnter={() => setIdx(i)}>
                                <div className="cmd-icon">{c.icon}</div>
                                {c.label}
                            </div>
                        ))}
                    </div>
                    <div className="cmd-footer">
                        <span>↑↓ Navigate · ⏎ Select · Esc Close</span>
                        <span>TERMINUS</span>
                    </div>
                </div>
            </div>
        );
    };

    /* ═══ TITLE GENERATOR MODAL — Real AI ═══ */
    const TitleGenModal = () => {
        if (!showTitleGen) return null;
        return (
            <div className="title-gen-modal" onClick={() => setShowTitleGen(false)}>
                <div className="title-gen-box" onClick={e => e.stopPropagation()}>
                    <h3>✦ AI Title Generator</h3>
                    <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "16px" }}>
                        {titlesLoading
                            ? "Generating titles from your draft with Claude…"
                            : "Click a title to use it:"}
                    </p>
                    {titlesLoading && titleSuggestions.length === 0 && (
                        <div style={{ padding: "12px 0" }}>
                            <div className="skeleton-line w80" />
                            <div className="skeleton-line w60" />
                            <div className="skeleton-line w80" />
                        </div>
                    )}
                    {titleSuggestions.map((t, i) => (
                        <div key={i} className="title-option" onClick={() => { setTitle(t); setShowTitleGen(false); }}>
                            <span className="rank">#{i + 1}</span>
                            {t}
                        </div>
                    ))}
                    <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowTitleGen(false)}>Cancel</button>
                        {!titlesLoading && (
                            <button className="btn btn-ghost btn-sm" onClick={generateTitles}>↻ Regenerate</button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    /* ═══ RESEARCH AGENT ═══ */
    const runResearch = async (topic) => {
        if (!topic.trim()) return;
        setResearchLoading(true);
        setResearchResult("");
        setResearchStreaming("");
        setResearchQueries([]);
        setResearchStatus("Starting research…");
        setResearchSources(0);

        try {
            const res = await fetch("/api/ai/research", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic,
                    context: getStructuredContext(),
                    model: aiModel,
                }),
            });

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const payload = line.slice(6);
                    if (payload === "[DONE]") continue;
                    try {
                        const data = JSON.parse(payload);
                        if (data.status) setResearchStatus(data.status);
                        if (data.queries) setResearchQueries(data.queries);
                        if (data.sourceCount) setResearchSources(data.sourceCount);
                        if (data.text) {
                            accumulated += data.text;
                            setResearchStreaming(accumulated);
                        }
                        if (data.error) {
                            setResearchResult(`Error: ${data.error}`);
                            setResearchLoading(false);
                            return;
                        }
                    } catch { /* skip */ }
                }
            }
            setResearchResult(accumulated);
            setResearchStreaming("");
            setResearchLoading(false);
            setResearchStatus("");
        } catch (err) {
            setResearchResult(`Error: ${err.message}`);
            setResearchLoading(false);
        }
    };

    const insertResearch = () => {
        const content = researchResult;
        if (!content) return;
        // Split into paragraphs and add as new blocks
        const paragraphs = content.split("\n\n").filter(Boolean);
        let lastId = blocks[blocks.length - 1]?.id || "b1";
        paragraphs.forEach((p) => {
            const isHeading = p.startsWith("## ") || p.startsWith("# ");
            const newId = `b${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
            setBlocks(prev => {
                const idx = prev.findIndex(b => b.id === lastId);
                const newBlocks = [...prev];
                newBlocks.splice(idx + 1, 0, {
                    id: newId,
                    type: isHeading ? "heading" : "paragraph",
                    content: isHeading ? p.replace(/^#+\s*/, "").replace(/[📊🏢📈🔥💡🔗]\s*/g, "") : p,
                });
                return newBlocks;
            });
            lastId = newId;
        });
        setResearchOpen(false);
    };

    const ResearchPanel = () => {
        if (!researchOpen) return null;
        const displayContent = researchStreaming || researchResult;
        return (
            <div style={{
                position: "fixed", top: 0, right: 0, bottom: 0, width: "480px", maxWidth: "100vw",
                background: "var(--bg-1)", borderLeft: "1px solid var(--line)",
                zIndex: 1000, display: "flex", flexDirection: "column",
                boxShadow: "-8px 0 32px rgba(0,0,0,0.3)",
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
                        onClick={() => { setResearchOpen(false); setResearchLoading(false); }}
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
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); runResearch(researchTopic); } }}
                            disabled={researchLoading}
                            autoFocus
                        />
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => runResearch(researchTopic)}
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
                        <button className="btn btn-ghost btn-sm" onClick={() => { setResearchResult(""); setResearchStreaming(""); setResearchQueries([]); setResearchSources(0); }}>
                            ↻ New Research
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={insertResearch}>
                            ↵ Insert as Blocks
                        </button>
                    </div>
                )}
            </div>
        );
    };

    /* ═══ RENDER ═══ */
    return (
        <div className="editor-layout">
            {/* Editor topbar */}
            <div className="editor-topbar">
                <div className="editor-topbar-left">
                    <Link href="/write">← Dashboard</Link>
                    <span className="editor-status">
                        {saveStatus === "saved" ? <span className="saved">● Saved</span> :
                            saveStatus === "saving" ? "Saving…" : "● Unsaved"}
                    </span>
                </div>
                <div className="editor-topbar-right">
                    <button className="btn btn-ghost btn-sm" onClick={() => setFocusMode(f => !f)}>
                        {focusMode ? "◉ Focus ON" : "○ Focus"}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setResearchOpen(true)}>
                        🔍 Research
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={generateTitles} title="⌘T">
                        ✦ Titles
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setCmdOpen(true)}>
                        ⌘K
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleSave}>
                        Publish
                    </button>
                </div>
            </div>

            {/* Editor canvas */}
            <div className="editor-canvas">
                <input
                    className="editor-title-input"
                    placeholder="Post title… (type / for AI)"
                    value={title}
                    onChange={e => { setTitle(e.target.value); setSaveStatus("unsaved"); }}
                    onKeyDown={e => {
                        if (e.key === "/") {
                            e.preventDefault();
                            setAiInline({ blockId: "__title__", action: null, fieldType: "title" });
                        }
                    }}
                />
                {/* AI panel for title */}
                {aiInline && aiInline.blockId === "__title__" && <AiInlinePanel fieldLabel="Title" />}

                <input
                    className="editor-subtitle-input"
                    placeholder="Add a subtitle… (type / for AI)"
                    value={subtitle}
                    onChange={e => { setSubtitle(e.target.value); setSaveStatus("unsaved"); }}
                    onKeyDown={e => {
                        if (e.key === "/") {
                            e.preventDefault();
                            setAiInline({ blockId: "__subtitle__", action: null, fieldType: "subtitle" });
                        }
                    }}
                />
                {/* AI panel for subtitle */}
                {aiInline && aiInline.blockId === "__subtitle__" && <AiInlinePanel fieldLabel="Subtitle" />}

                {/* Blocks */}
                {blocks.map((block) => (
                    <div
                        key={block.id}
                        className={`block ${focusMode && activeBlockId !== block.id ? "dimmed" : ""}`}
                        draggable
                        onDragStart={() => handleDragStart(block.id)}
                        onDragOver={(e) => handleDragOver(e, block.id)}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="block-grab">⠿</div>

                        {block.type === "divider" ? (
                            <div className="block-divider" />
                        ) : block.type === "code" ? (
                            <div className="code-block" style={{ margin: "8px 0" }}>
                                <div className="code-block-header">
                                    <div className="code-block-dots"><span /><span /><span /></div>
                                    <span className="code-block-lang">code</span>
                                </div>
                                <textarea
                                    ref={el => blockRefs.current[block.id] = el}
                                    value={block.content}
                                    onChange={e => updateBlock(block.id, e.target.value)}
                                    onFocus={() => setActiveBlockId(block.id)}
                                    style={{
                                        width: "100%",
                                        minHeight: "80px",
                                        padding: "16px",
                                        border: "none",
                                        background: "transparent",
                                        color: "#c5d0de",
                                        fontFamily: "var(--font-mono)",
                                        fontSize: "0.82rem",
                                        lineHeight: "1.65",
                                        outline: "none",
                                        resize: "vertical",
                                        caretColor: "var(--accent)",
                                    }}
                                    placeholder="Write code…"
                                />
                            </div>
                        ) : block.type === "quote" ? (
                            <div className="block-quote">
                                <textarea
                                    ref={el => blockRefs.current[block.id] = el}
                                    className="block-content"
                                    value={block.content}
                                    onChange={e => handleBlockInput(e, block)}
                                    onKeyDown={e => handleBlockKeyDown(e, block)}
                                    onFocus={() => setActiveBlockId(block.id)}
                                    placeholder="Write a quote…"
                                    rows={1}
                                    style={{ fontStyle: "italic", resize: "none" }}
                                />
                            </div>
                        ) : (
                            <textarea
                                ref={el => blockRefs.current[block.id] = el}
                                className={`block-content ${block.type === "heading" ? "heading" : ""} ${block.type === "heading-h3" ? "heading-h3" : ""}`}
                                value={block.content}
                                onChange={e => handleBlockInput(e, block)}
                                onKeyDown={e => handleBlockKeyDown(e, block)}
                                onFocus={() => setActiveBlockId(block.id)}
                                placeholder={block.type === "heading" ? "Heading…" : block.type === "heading-h3" ? "Subheading…" : "Write something, or type / for commands…"}
                                rows={1}
                                style={{ resize: "none" }}
                            />
                        )}

                        {/* Slash command menu */}
                        {slashMenu === block.id && (
                            <div className="slash-menu">
                                <div className="slash-menu-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>Commands</span>
                                    <button onClick={() => setSlashMenu(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.72rem", padding: "0 4px" }}>✕</button>
                                </div>
                                {getFilteredSlashCommands().map((cmd, i) => (
                                    <div
                                        key={cmd.cmd || cmd.label}
                                        className={`slash-menu-item ${i === slashIndex ? "active" : ""}`}
                                        onClick={() => executeSlashCommand(cmd, block.id)}
                                        onMouseEnter={() => setSlashIndex(i)}
                                    >
                                        <span className="icon">{cmd.icon}</span>
                                        {cmd.label}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* AI inline prompt */}
                        {aiInline && aiInline.blockId === block.id && <AiInlinePanel fieldLabel={block.type} />}
                    </div>
                ))}
            </div>

            {/* Editor footer */}
            <div className="editor-footer">
                <div className="editor-footer-stats">
                    <span>{getWordCount()} words</span>
                    <span>{getReadTime()} read</span>
                    <span>{getCharCount()} chars</span>
                </div>
                <div className="editor-footer-indicators">
                    <div className="tone-badge">
                        <span className="dot" />
                        {detectedTone}
                    </div>
                    <div className="seo-gauge">
                        SEO
                        <div className="seo-gauge-bar">
                            <div className="seo-gauge-fill" style={{ width: `${seoScore}%` }} />
                        </div>
                        {seoScore}
                    </div>
                </div>
            </div>

            <CommandBar />
            <TitleGenModal />
            <ResearchPanel />
        </div>
    );
}
