"use client";

import { useState, useEffect, useRef, useCallback, use } from "react";
import Link from "next/link";

/* ═══════════════════════════════════════════════════
   AI CO-PILOT — Simulated responses
   ═══════════════════════════════════════════════════ */
const AI_RESPONSES = {
    continue: (text) => `Furthermore, this approach enables teams to iterate faster while maintaining the structural integrity of their systems. The key insight is that complexity should be managed, not avoided — and the tools we build should reflect that philosophy.`,
    rewrite: (text) => `${text.split(" ").slice(0, 3).join(" ")} — reimagined: The core thesis remains unchanged, but the framing shifts from defensive to assertive. Instead of explaining why this matters, we demonstrate it through evidence.`,
    shorter: (text) => text.split(". ").slice(0, Math.ceil(text.split(". ").length / 2)).join(". ") + ".",
    longer: (text) => `${text}\n\nTo elaborate further: this pattern has been observed across multiple domains — from financial infrastructure to developer tooling. The companies that recognize this shift early gain a compounding advantage that becomes nearly impossible to replicate.`,
    outline: (topic) => `## Outline: ${topic}\n\n1. **Introduction** — Frame the problem\n2. **The Current State** — What exists today and why it falls short\n3. **The Shift** — What's changing and why now\n4. **Technical Deep Dive** — How it works under the hood\n5. **Implications** — What this means for builders\n6. **Conclusion** — The call to action`,
    research: (topic) => `## Research: ${topic}\n\nBased on recent analysis:\n\n- Market size estimated at $4.2B by 2028 (CAGR 23%)\n- Key players: Stripe, Adyen, Circle, Fipto\n- Regulatory tailwind from MiCA (effective 2025)\n- 67% of enterprise treasuries exploring stablecoin rails¹\n\n¹ Source: McKinsey Digital Payments Report, 2025`,
};

const TONE_OPTIONS = ["formal", "conversational", "technical", "persuasive"];
const TITLE_SUGGESTIONS = [
    "Why This Changes Everything for Builders",
    "The Infrastructure Nobody Is Talking About",
    "A First-Principles Look at What's Next",
    "The Contrarian Case for Moving Now",
    "What I Wish I Knew Before Starting",
];

/* ═══════════════════════════════════════════════════
   SLASH COMMAND DEFINITIONS
   ═══════════════════════════════════════════════════ */
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
    const [aiInline, setAiInline] = useState(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [showTitleGen, setShowTitleGen] = useState(false);
    const [cmdOpen, setCmdOpen] = useState(false);
    const [saveStatus, setSaveStatus] = useState("saved");
    const [detectedTone, setDetectedTone] = useState("conversational");
    const [seoScore, setSeoScore] = useState(72);
    const [dragId, setDragId] = useState(null);

    const blockRefs = useRef({});

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
            if ((e.metaKey || e.ctrlKey) && e.key === "t") { e.preventDefault(); setShowTitleGen(true); }
            if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave(); }
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
        // Enter: create new block
        if (e.key === "Enter" && !e.shiftKey && block.type !== "code") {
            e.preventDefault();
            addBlockAfter(block.id);
        }

        // Backspace on empty: delete block
        if (e.key === "Backspace" && block.content === "" && blocks.length > 1) {
            e.preventDefault();
            deleteBlock(block.id);
        }

        // Slash at start: show menu
        if (e.key === "/" && block.content === "") {
            setSlashMenu(block.id);
            setSlashFilter("");
            setSlashIndex(0);
        }

        // Arrow navigation for slash menu
        if (slashMenu) {
            const items = getFilteredSlashCommands();
            if (e.key === "ArrowDown") { e.preventDefault(); setSlashIndex(i => Math.min(i + 1, items.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setSlashIndex(i => Math.max(i - 1, 0)); }
            if (e.key === "Enter" && items[slashIndex]) {
                e.preventDefault();
                executeSlashCommand(items[slashIndex], block.id);
            }
            if (e.key === "Escape") setSlashMenu(null);
        }
    };

    const handleBlockInput = (e, block) => {
        const value = e.target.value || e.target.textContent;
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

        // Slash command filter
        if (slashMenu && value.startsWith("/")) {
            setSlashFilter(value);
            setSlashIndex(0);
        } else if (slashMenu && !value.startsWith("/")) {
            setSlashMenu(null);
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
            // AI command
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

    // AI execution
    const executeAI = async (action, input) => {
        setAiLoading(true);
        setAiResult(null);
        // Simulate API delay
        await new Promise(r => setTimeout(r, 1200));
        const fn = AI_RESPONSES[action];
        const result = fn ? fn(input || blocks.map(b => b.content).join(" ")) : "AI feature not available yet.";
        setAiResult(result);
        setAiLoading(false);
    };

    const insertAiResult = () => {
        if (!aiResult || !aiInline) return;
        const newId = addBlockAfter(aiInline.blockId, "paragraph", aiResult);
        setAiInline(null);
        setAiResult(null);
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

    /* ═══ TITLE GENERATOR MODAL ═══ */
    const TitleGenModal = () => {
        if (!showTitleGen) return null;
        return (
            <div className="title-gen-modal" onClick={() => setShowTitleGen(false)}>
                <div className="title-gen-box" onClick={e => e.stopPropagation()}>
                    <h3>✦ AI Title Generator</h3>
                    <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "16px" }}>
                        Based on your draft, here are 5 title options ranked by click-worthiness:
                    </p>
                    {TITLE_SUGGESTIONS.map((t, i) => (
                        <div key={i} className="title-option" onClick={() => { setTitle(t); setShowTitleGen(false); }}>
                            <span className="rank">#{i + 1}</span>
                            {t}
                        </div>
                    ))}
                    <div style={{ marginTop: "12px", textAlign: "right" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowTitleGen(false)}>Cancel</button>
                    </div>
                </div>
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
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowTitleGen(true)} title="⌘T">
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
                    placeholder="Post title…"
                    value={title}
                    onChange={e => { setTitle(e.target.value); setSaveStatus("unsaved"); }}
                />
                <input
                    className="editor-subtitle-input"
                    placeholder="Add a subtitle…"
                    value={subtitle}
                    onChange={e => { setSubtitle(e.target.value); setSaveStatus("unsaved"); }}
                />

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
                                <div className="slash-menu-title">Commands</div>
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
                        {aiInline && aiInline.blockId === block.id && (
                            <div className="ai-inline">
                                <div className="ai-inline-header">
                                    <span>✦</span> AI Co-Pilot
                                </div>
                                <div className="ai-inline-actions">
                                    {AI_SLASH_COMMANDS.map(cmd => (
                                        <button
                                            key={cmd.action}
                                            className="btn btn-ghost btn-sm"
                                            onClick={() => executeAI(cmd.action, block.content)}
                                            disabled={aiLoading}
                                        >
                                            {cmd.label}
                                        </button>
                                    ))}
                                </div>
                                {aiLoading && (
                                    <div style={{ marginTop: "10px", color: "var(--accent)", fontSize: "0.72rem" }}>
                                        ✦ Generating…
                                        <div className="skeleton-line w80" style={{ marginTop: "8px" }} />
                                        <div className="skeleton-line w60" />
                                    </div>
                                )}
                                {aiResult && (
                                    <div className="ai-result">
                                        {aiResult}
                                        <div className="ai-result-actions">
                                            <button className="btn btn-primary btn-sm" onClick={insertAiResult}>
                                                ↵ Insert
                                            </button>
                                            <button className="btn btn-ghost btn-sm" onClick={() => { setAiResult(null); setAiInline(null); }}>
                                                Dismiss
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
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
        </div>
    );
}
