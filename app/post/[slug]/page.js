"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useTrackPageview } from "../../hooks/useTrackPageview";

/* ═══ FALLBACK POST ═══ */
const FALLBACK_POST = {
    title: "Post Not Found",
    subtitle: "This post doesn't exist yet. Maybe you should write it.",
    date: "—",
    readTime: "—",
    wordCount: 0,
    tags: [],
    sections: [],
    content: "<p>The void stares back.</p>",
};

/* ═══ POST PAGE ═══ */
export default function PostPage({ params }) {
    const resolvedParams = use(params);
    const dbPost = useQuery(api.posts.getBySlug, { slug: resolvedParams.slug });

    const post = dbPost || FALLBACK_POST;
    const isLoading = dbPost === undefined;
    const sections = post.sections || [];

    const [readProgress, setReadProgress] = useState(0);
    const [showStickyHeader, setShowStickyHeader] = useState(false);
    const [activeSection, setActiveSection] = useState("");
    const [reactions, setReactions] = useState({});
    const headerRef = useRef(null);

    // Track pageview (replaces incrementViews)
    useTrackPageview({
        path: `/post/${resolvedParams.slug}`,
        slug: resolvedParams.slug,
        postId: dbPost?._id,
        ready: !!dbPost,
    });

    useEffect(() => {
        const handleScroll = () => {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            setReadProgress(docHeight > 0 ? (scrollTop / docHeight) * 100 : 0);

            // Sticky header visibility
            if (headerRef.current) {
                const headerBottom = headerRef.current.getBoundingClientRect().bottom;
                setShowStickyHeader(headerBottom < 0);
            }

            // Active section tracking — use viewport midpoint for reliable detection
            const viewMid = window.innerHeight / 2;
            let active = "";
            for (let i = 0; i < sections.length; i++) {
                const el = document.getElementById(sections[i].id);
                if (el && el.getBoundingClientRect().top <= viewMid) {
                    active = sections[i].id;
                }
            }
            if (active) setActiveSection(active);
        };

        window.addEventListener("scroll", handleScroll, { passive: true });
        return () => window.removeEventListener("scroll", handleScroll);
    }, [sections]);

    const toggleReaction = (type) => {
        setReactions((prev) => ({ ...prev, [type]: !prev[type] }));
    };

    // Process content to add terminal-style code blocks
    const processContent = (html) => {
        return html.replace(
            /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
            (match, lang, code) => {
                return `<div class="code-block">
          <div class="code-block-header">
            <span class="code-block-lang">${lang}</span>
            <button class="code-block-copy" onclick="navigator.clipboard.writeText(this.closest('.code-block').querySelector('pre').textContent)">Copy</button>
          </div>
          <pre><code>${code}</code></pre>
        </div>`;
            }
        ).replace(
            /<blockquote>([\s\S]*?)<\/blockquote>/g,
            (match, text) => `<div class="pull-quote">${text}</div>`
        );
    };

    if (isLoading) {
        return (
            <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#050608" }}>
                <span style={{ color: "#7a8fa6", fontFamily: "var(--font-mono, monospace)", fontSize: "0.78rem" }}>Loading…</span>
            </div>
        );
    }

    return (
        <>
            {/* Reading progress */}
            <div className="reading-progress" style={{ width: `${readProgress}%` }} />

            {/* Sticky header */}
            <div className={`sticky-header ${showStickyHeader ? "visible" : ""}`}>
                <span className="post-title-mini">{post.title}</span>
                <span>{post.readTime} · {post.wordCount} words</span>
            </div>

            {/* Topbar */}
            <header className="topbar">
                <Link href="/" className="brand">
                    <span className="brand-dot" />
                    TERMINUS
                </Link>
                <nav className="topbar-nav">
                    <Link href="/">Essays</Link>
                    <a href="mailto:hello@terminus.blog">Contact</a>
                </nav>
            </header>

            <div className="post-page">
                {/* Post header */}
                <div className="post-header" ref={headerRef}>
                    <h1>{post.title}</h1>
                    {post.subtitle && <p className="post-header-sub">{post.subtitle}</p>}
                    <div className="post-card-meta">
                        <span>{post.date}</span>
                        <span>·</span>
                        <span>{post.readTime}</span>
                        {(post.tags || []).length > 0 && (
                            <>
                                <span>·</span>
                                <span>{(post.tags || []).join(", ")}</span>
                            </>
                        )}
                    </div>
                    <div className="post-header-rule" />
                </div>

                {/* Table of Contents */}
                {sections.length > 0 && (
                    <nav className="toc">
                        <h4>Contents</h4>
                        {sections.map((s) => (
                            <a
                                key={s.id}
                                href={`#${s.id}`}
                                className={activeSection === s.id ? "active" : ""}
                            >
                                {s.title}
                            </a>
                        ))}
                    </nav>
                )}

                {/* Post content */}
                <div className="post-content-wrapper">
                    <div
                        className="post-body"
                        dangerouslySetInnerHTML={{ __html: processContent(post.content || "") }}
                    />

                    {/* Reactions */}
                    <div className="reactions">
                        {[
                            { key: "useful", label: "useful", icon: "→" },
                            { key: "thought", label: "thought-provoking", icon: "→" },
                            { key: "saved", label: "saved", icon: "→" },
                        ].map((r) => (
                            <button
                                key={r.key}
                                className={`reaction-btn ${reactions[r.key] ? "active" : ""}`}
                                onClick={() => toggleReaction(r.key)}
                            >
                                <span className="arrow">[{r.icon}</span> {r.label}]
                            </button>
                        ))}
                    </div>

                    {/* Page marker */}
                    <div className="page-marker">
                        — {Math.max(1, Math.round((post.wordCount || 0) / 250))} —
                    </div>
                </div>
            </div>

            {/* Footer colophon */}
            <footer className="post-colophon">
                Set in Playfair Display · Written in Munich · Built with conviction
            </footer>
        </>
    );
}
