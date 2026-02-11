"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";

/* ═══ SAMPLE DASHBOARD DATA ═══ */
const POSTS = [
    { id: "1", title: "The Future of European Fintech Infrastructure", status: "published", views: 1247, readTime: "8 min", lastEdited: "2026.02.11", slug: "the-future-of-european-fintech" },
    { id: "2", title: "AI Agents Are the New APIs", status: "published", views: 892, readTime: "6 min", lastEdited: "2026.02.08", slug: "ai-agents-are-the-new-apis" },
    { id: "3", title: "Stablecoins Will Eat SWIFT", status: "published", views: 2103, readTime: "12 min", lastEdited: "2026.02.03", slug: "stablecoins-will-eat-swift" },
    { id: "4", title: "What I Learned Building in Public for 6 Months", status: "published", views: 1560, readTime: "10 min", lastEdited: "2026.01.28", slug: "building-in-public-lessons" },
    { id: "5", title: "The MEV Problem, Explained for Humans", status: "published", views: 780, readTime: "14 min", lastEdited: "2026.01.20", slug: "the-mev-problem-explained" },
    { id: "6", title: "Why I Left Corporate to Build a Startup", status: "draft", views: 0, readTime: "—", lastEdited: "2026.02.10", slug: "why-i-left-corporate" },
    { id: "7", title: "Regulatory Arbitrage in Digital Markets", status: "draft", views: 0, readTime: "—", lastEdited: "2026.02.09", slug: "regulatory-arbitrage" },
];

/* ═══ SPARKLINE COMPONENT ═══ */
function Sparkline({ data }) {
    const max = Math.max(...data);
    const points = data.map((v, i) => {
        const x = (i / (data.length - 1)) * 60;
        const y = 18 - (v / max) * 14;
        return `${x},${y}`;
    }).join(" ");

    return (
        <svg className="sparkline" width="60" height="20" viewBox="0 0 60 20">
            <polyline
                points={points}
                fill="none"
                stroke="var(--accent)"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.7"
            />
        </svg>
    );
}

/* ═══ COMMAND BAR ═══ */
function CommandBar({ open, onClose }) {
    const [query, setQuery] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);

    const commands = [
        { icon: "✦", label: "New Post", action: () => window.location.href = "/write/new" },
        { icon: "◉", label: "View Blog", action: () => window.location.href = "/" },
        { icon: "↗", label: "Publish All Drafts", action: () => { } },
        { icon: "↓", label: "Export All as Markdown", action: () => { } },
        { icon: "⚙", label: "Settings", action: () => { } },
    ];

    const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

    useEffect(() => {
        if (open) { setQuery(""); setActiveIndex(0); }
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const handler = (e) => {
            if (e.key === "Escape") onClose();
            if (e.key === "ArrowDown") { e.preventDefault(); setActiveIndex(i => Math.min(i + 1, filtered.length - 1)); }
            if (e.key === "ArrowUp") { e.preventDefault(); setActiveIndex(i => Math.max(i - 1, 0)); }
            if (e.key === "Enter" && filtered[activeIndex]) { filtered[activeIndex].action(); onClose(); }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [open, filtered, activeIndex, onClose]);

    if (!open) return null;

    return (
        <div className="cmd-overlay" onClick={onClose}>
            <div className="cmd-palette" onClick={e => e.stopPropagation()}>
                <div className="cmd-input-wrap">
                    <span className="search-icon">⌕</span>
                    <input className="cmd-input" placeholder="Type a command…" value={query}
                        onChange={e => { setQuery(e.target.value); setActiveIndex(0); }} autoFocus />
                </div>
                <div className="cmd-results">
                    {filtered.map((cmd, i) => (
                        <div key={cmd.label} className={`cmd-item ${i === activeIndex ? "active" : ""}`}
                            onClick={() => { cmd.action(); onClose(); }} onMouseEnter={() => setActiveIndex(i)}>
                            <div className="cmd-icon">{cmd.icon}</div>
                            {cmd.label}
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

/* ═══ DASHBOARD PAGE ═══ */
export default function WriteDashboard() {
    const [searchQuery, setSearchQuery] = useState("");
    const [sortKey, setSortKey] = useState("lastEdited");
    const [sortDir, setSortDir] = useState("desc");
    const [cmdOpen, setCmdOpen] = useState(false);

    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(o => !o); }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    const handleSort = (key) => {
        if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
        else { setSortKey(key); setSortDir("desc"); }
    };

    const filteredPosts = useMemo(() => {
        let result = [...POSTS];
        if (searchQuery) {
            result = result.filter(p => p.title.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        result.sort((a, b) => {
            let av = a[sortKey], bv = b[sortKey];
            if (typeof av === "string") av = av.toLowerCase();
            if (typeof bv === "string") bv = bv.toLowerCase();
            if (av < bv) return sortDir === "asc" ? -1 : 1;
            if (av > bv) return sortDir === "asc" ? 1 : -1;
            return 0;
        });
        return result;
    }, [searchQuery, sortKey, sortDir]);

    const totalViews = POSTS.reduce((s, p) => s + p.views, 0);
    const publishedCount = POSTS.filter(p => p.status === "published").length;
    const draftCount = POSTS.filter(p => p.status === "draft").length;

    // Generate random sparkline data for each post
    const sparkData = useMemo(() => {
        const data = {};
        POSTS.forEach(p => {
            data[p.id] = Array.from({ length: 7 }, () => Math.floor(Math.random() * p.views / 7 + Math.random() * 20));
        });
        return data;
    }, []);

    return (
        <div className="dashboard-layout">
            {/* Sidebar */}
            <aside className="sidebar">
                <div className="sidebar-brand">◉ TERMINUS</div>
                <Link href="/" className="sidebar-link">◇ Blog</Link>
                <Link href="/write" className="sidebar-link active">▦ Dashboard</Link>
                <Link href="/write/new" className="sidebar-link">✦ New Post</Link>
                <div className="sidebar-spacer" />
                <button className="sidebar-link" onClick={() => setCmdOpen(true)} style={{ border: "none", background: "none", cursor: "pointer", textAlign: "left", width: "100%" }}>
                    ⌘ Command Bar
                </button>
                <div className="sidebar-footer">TERMINUS · Edon</div>
            </aside>

            {/* Main */}
            <main className="dash-main">
                <div className="dash-header">
                    <h1>Dashboard</h1>
                    <Link href="/write/new" className="btn btn-primary btn-sm">✦ New Post</Link>
                </div>

                {/* Stats */}
                <div className="stat-row">
                    <div className="stat-card">
                        <div className="stat-label">Total Posts</div>
                        <div className="stat-value">{POSTS.length}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Published</div>
                        <div className="stat-value">{publishedCount}</div>
                        <div className="stat-delta">● live</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Drafts</div>
                        <div className="stat-value">{draftCount}</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-label">Total Views</div>
                        <div className="stat-value">{totalViews.toLocaleString()}</div>
                        <div className="stat-delta">↑ 12% this week</div>
                    </div>
                </div>

                {/* Post Table */}
                <div className="post-table-wrap">
                    <div className="post-table-header">
                        <h3>All Posts</h3>
                        <input
                            className="post-table-search"
                            placeholder="Search posts…"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <table className="post-table">
                        <thead>
                            <tr>
                                <th onClick={() => handleSort("title")} style={{ width: "40%" }}>
                                    Title {sortKey === "title" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                                </th>
                                <th onClick={() => handleSort("status")} style={{ width: "12%" }}>
                                    Status {sortKey === "status" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                                </th>
                                <th onClick={() => handleSort("views")} style={{ width: "12%" }}>
                                    Views {sortKey === "views" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                                </th>
                                <th style={{ width: "12%" }}>Trend</th>
                                <th style={{ width: "10%" }}>Read Time</th>
                                <th onClick={() => handleSort("lastEdited")} style={{ width: "14%" }}>
                                    Edited {sortKey === "lastEdited" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredPosts.map((post) => (
                                <tr key={post.id} onClick={() => window.location.href = `/write/${post.id}`}>
                                    <td style={{ fontWeight: 500, color: "var(--text)" }}>{post.title}</td>
                                    <td>
                                        <span className={`status-dot ${post.status}`} />
                                        {post.status === "published" ? "Published" : "Draft"}
                                    </td>
                                    <td>{post.views > 0 ? post.views.toLocaleString() : "—"}</td>
                                    <td>{post.views > 0 ? <Sparkline data={sparkData[post.id]} /> : "—"}</td>
                                    <td>{post.readTime}</td>
                                    <td style={{ fontFamily: "var(--font-mono)", fontSize: "0.68rem" }}>{post.lastEdited}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </main>

            <CommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} />
        </div>
    );
}
