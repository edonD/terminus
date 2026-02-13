"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

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
    const incrementViews = useMutation(api.posts.incrementViews);

    const post = dbPost || FALLBACK_POST;
    const isLoading = dbPost === undefined;
    const sections = post.sections || [];

    const [readProgress, setReadProgress] = useState(0);
    const [showStickyHeader, setShowStickyHeader] = useState(false);
    const [activeSection, setActiveSection] = useState("");
    const [reactions, setReactions] = useState({});
    const headerRef = useRef(null);
    const viewIncremented = useRef(false);

    // Increment views once on mount
    useEffect(() => {
        if (dbPost && dbPost._id && !viewIncremented.current) {
            viewIncremented.current = true;
            incrementViews({ id: dbPost._id });
        }
    }, [dbPost, incrementViews]);

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

            // Active section tracking
            for (let i = sections.length - 1; i >= 0; i--) {
                const el = document.getElementById(sections[i].id);
                if (el && el.getBoundingClientRect().top <= 120) {
                    setActiveSection(sections[i].id);
                    break;
                }
            }
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
            <div class="code-block-dots"><span></span><span></span><span></span></div>
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
                    <Link href="/">Blog</Link>
                    <a href="https://x.com/edon_d" target="_blank" rel="noopener">X</a>
                </nav>
            </header>

            <div className="post-page">
                {/* Post header */}
                <div className="post-header" ref={headerRef}>
                    <div className="post-card-meta">
                        <span className="post-card-date">{post.date}</span>
                        <span>·</span>
                        <span className="post-card-readtime">{post.readTime}</span>
                        <span>·</span>
                        <span>{post.wordCount} words</span>
                    </div>
                    <h1>{post.title}</h1>
                    <p className="post-header-sub">{post.subtitle}</p>
                    <div className="post-card-tags" style={{ justifyContent: "center", marginTop: "16px" }}>
                        {(post.tags || []).map((t) => (
                            <span key={t} className="tag">[{t}]</span>
                        ))}
                    </div>
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
                </div>
            </div>

            {/* Footer */}
            <footer style={{
                position: "relative",
                zIndex: 1,
                textAlign: "center",
                padding: "40px 24px",
                borderTop: "1px solid var(--line)",
                fontSize: "0.6rem",
                color: "var(--muted)",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
            }}>
                TERMINUS · {new Date().getFullYear()} · Built with conviction
            </footer>
        </>
    );
}
