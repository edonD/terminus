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
    const [filter, setFilter] = useState("all");

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
        if (filter !== "all") result = result.filter(p => p.status === filter);
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
    }, [searchQuery, sortKey, sortDir, filter]);

    const totalViews = POSTS.reduce((s, p) => s + p.views, 0);
    const publishedCount = POSTS.filter(p => p.status === "published").length;
    const draftCount = POSTS.filter(p => p.status === "draft").length;

    const sparkData = useMemo(() => {
        const data = {};
        POSTS.forEach(p => {
            data[p.id] = Array.from({ length: 7 }, () => Math.floor(Math.random() * p.views / 7 + Math.random() * 20));
        });
        return data;
    }, []);

    return (
        <div className="dash-shell">
            {/* ── Topbar ── */}
            <header className="dash-topbar">
                <div className="dash-topbar-left">
                    <Link href="/" className="dash-brand">
                        <span className="dash-brand-dot" />
                        TERMINUS
                    </Link>
                    <span className="dash-divider" />
                    <span className="dash-label">Writer</span>
                </div>
                <div className="dash-topbar-right">
                    <nav className="dash-nav">
                        <Link href="/" className="dash-nav-link">Blog</Link>
                        <Link href="/write" className="dash-nav-link active">Dashboard</Link>
                    </nav>
                    <button className="cmd-trigger" onClick={() => setCmdOpen(true)}>
                        <span>⌘K</span>
                    </button>
                    <Link href="/write/new" className="btn btn-primary btn-sm">
                        ✦ New Post
                    </Link>
                </div>
            </header>

            <main className="dash-content">
                {/* ── Stats ── */}
                <section className="dash-stats">
                    <div className="dash-stat-card">
                        <div className="dash-stat-icon">📄</div>
                        <div>
                            <div className="dash-stat-value">{POSTS.length}</div>
                            <div className="dash-stat-label">Total Posts</div>
                        </div>
                    </div>
                    <div className="dash-stat-card">
                        <div className="dash-stat-icon">●</div>
                        <div>
                            <div className="dash-stat-value">{publishedCount}</div>
                            <div className="dash-stat-label">Published</div>
                        </div>
                    </div>
                    <div className="dash-stat-card">
                        <div className="dash-stat-icon">◌</div>
                        <div>
                            <div className="dash-stat-value">{draftCount}</div>
                            <div className="dash-stat-label">Drafts</div>
                        </div>
                    </div>
                    <div className="dash-stat-card accent-glow">
                        <div className="dash-stat-icon">👁</div>
                        <div>
                            <div className="dash-stat-value">{totalViews.toLocaleString()}</div>
                            <div className="dash-stat-label">Total Views</div>
                            <div className="dash-stat-delta">↑ 12% this week</div>
                        </div>
                    </div>
                </section>

                {/* ── Quick Actions ── */}
                <section className="dash-quick-actions">
                    <Link href="/write/new" className="dash-quick-card">
                        <div className="dash-quick-icon">✦</div>
                        <div className="dash-quick-label">New Post</div>
                        <p>Start with a blank canvas or pick a template.</p>
                    </Link>
                    <Link href="/write/new" className="dash-quick-card">
                        <div className="dash-quick-icon">◈</div>
                        <div className="dash-quick-label">Deep Analysis</div>
                        <p>Research a topic with AI, then auto-generate a draft.</p>
                    </Link>
                    <button className="dash-quick-card" onClick={() => setCmdOpen(true)}>
                        <div className="dash-quick-icon">⌘</div>
                        <div className="dash-quick-label">Command Bar</div>
                        <p>Quick access to all actions. Press ⌘K anytime.</p>
                    </button>
                </section>

                {/* ── Post List ── */}
                <section className="dash-posts-section">
                    <div className="dash-posts-header">
                        <div className="dash-posts-title-row">
                            <h2>All Posts</h2>
                            <span className="dash-posts-count">{filteredPosts.length} of {POSTS.length}</span>
                        </div>
                        <div className="dash-posts-controls">
                            <div className="dash-filter-tabs">
                                {[
                                    { key: "all", label: "All" },
                                    { key: "published", label: "Published" },
                                    { key: "draft", label: "Drafts" },
                                ].map(tab => (
                                    <button
                                        key={tab.key}
                                        className={`dash-filter-tab ${filter === tab.key ? "active" : ""}`}
                                        onClick={() => setFilter(tab.key)}
                                    >
                                        {tab.label}
                                    </button>
                                ))}
                            </div>
                            <input
                                className="dash-search"
                                placeholder="Search posts…"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="dash-sort-bar">
                        {[
                            { key: "title", label: "Title" },
                            { key: "views", label: "Views" },
                            { key: "lastEdited", label: "Edited" },
                        ].map(col => (
                            <button
                                key={col.key}
                                className={`dash-sort-btn ${sortKey === col.key ? "active" : ""}`}
                                onClick={() => handleSort(col.key)}
                            >
                                {col.label} {sortKey === col.key ? (sortDir === "asc" ? "↑" : "↓") : ""}
                            </button>
                        ))}
                    </div>

                    <div className="dash-post-list">
                        {filteredPosts.map((post) => (
                            <Link
                                key={post.id}
                                href={`/write/${post.id}`}
                                className="dash-post-card"
                            >
                                <div className="dash-post-card-main">
                                    <div className="dash-post-status">
                                        <span className={`dash-status-dot ${post.status}`} />
                                    </div>
                                    <div className="dash-post-info">
                                        <h3>{post.title}</h3>
                                        <div className="dash-post-meta">
                                            <span>{post.lastEdited}</span>
                                            <span className="dash-meta-sep">·</span>
                                            <span>{post.readTime}</span>
                                            {post.views > 0 && (
                                                <>
                                                    <span className="dash-meta-sep">·</span>
                                                    <span>{post.views.toLocaleString()} views</span>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                </div>
                                <div className="dash-post-card-right">
                                    {post.views > 0 && <Sparkline data={sparkData[post.id]} />}
                                    <span className="dash-post-arrow">→</span>
                                </div>
                            </Link>
                        ))}
                        {filteredPosts.length === 0 && (
                            <div className="dash-empty">No posts found.</div>
                        )}
                    </div>
                </section>
            </main>

            <CommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} />
        </div>
    );
}
