"use client";
import { useState, useEffect } from "react";

export default function CommandBar({ open, onClose, title, subtitle, blocks }) {
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
        if (!open) return;
        const handler = (e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
            if (e.key === "Enter" && filtered[idx]) { filtered[idx].action(); onClose(); }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, filtered, idx, onClose]);

    if (!open) return null;
    return (
        <div className="cmd-overlay" onClick={onClose}>
            <div className="cmd-palette" onClick={e => e.stopPropagation()}>
                <div className="cmd-input-wrap">
                    <span className="search-icon">⌕</span>
                    <input className="cmd-input" placeholder="Type a command…" value={query}
                        onChange={e => { setQuery(e.target.value); setIdx(0); }} autoFocus />
                </div>
                <div className="cmd-results">
                    {filtered.map((c, i) => (
                        <div key={c.label} className={`cmd-item ${i === idx ? "active" : ""}`}
                            onClick={() => { c.action(); onClose(); }} onMouseEnter={() => setIdx(i)}>
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
}
