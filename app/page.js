"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

/* ═══ SAMPLE POSTS DATA ═══ */
const SAMPLE_POSTS = [
  {
    slug: "the-future-of-european-fintech",
    title: "The Future of European Fintech Infrastructure",
    excerpt: "Why Europe's regulatory moat is becoming its biggest competitive advantage in building the next generation of financial plumbing.",
    date: "2026.02.11",
    readTime: "8 min",
    tags: ["fintech", "europe", "infrastructure"],
    wordCount: 2400,
  },
  {
    slug: "ai-agents-are-the-new-apis",
    title: "AI Agents Are the New APIs",
    excerpt: "The shift from request-response to autonomous task completion is the biggest paradigm shift since REST. Here's what it means for builders.",
    date: "2026.02.08",
    readTime: "6 min",
    tags: ["AI", "engineering", "architecture"],
    wordCount: 1800,
  },
  {
    slug: "stablecoins-will-eat-swift",
    title: "Stablecoins Will Eat SWIFT",
    excerpt: "A deep dive into why blockchain-native payment rails will replace legacy correspondence banking within the decade.",
    date: "2026.02.03",
    readTime: "12 min",
    tags: ["crypto", "fintech", "payments"],
    wordCount: 3600,
  },
  {
    slug: "building-in-public-lessons",
    title: "What I Learned Building in Public for 6 Months",
    excerpt: "Raw lessons from shipping a B2B product with zero marketing budget, zero connections, and an unreasonable amount of conviction.",
    date: "2026.01.28",
    readTime: "10 min",
    tags: ["startups", "building"],
    wordCount: 3000,
  },
  {
    slug: "the-mev-problem-explained",
    title: "The MEV Problem, Explained for Humans",
    excerpt: "Maximal Extractable Value is silently taxing every DeFi user. Here's how sandwich attacks work and what we can do about it.",
    date: "2026.01.20",
    readTime: "14 min",
    tags: ["DeFi", "engineering", "crypto"],
    wordCount: 4200,
  },
];

/* ═══ POST CARD with 3D tilt ═══ */
function PostCard({ post }) {
  const cardRef = useRef(null);

  const handleMouseMove = (e) => {
    const card = cardRef.current;
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const ry = ((x - centerX) / centerX) * 3;
    const rx = ((centerY - y) / centerY) * 3;
    card.style.setProperty("--rx", `${rx}deg`);
    card.style.setProperty("--ry", `${ry}deg`);
  };

  const handleMouseLeave = () => {
    const card = cardRef.current;
    if (!card) return;
    card.style.setProperty("--rx", "0deg");
    card.style.setProperty("--ry", "0deg");
  };

  const readProgress = Math.min(100, (post.wordCount / 50));

  return (
    <Link
      href={`/post/${post.slug}`}
      className="post-card"
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <div className="post-card-meta">
        <span className="post-card-date">{post.date}</span>
        <span>·</span>
        <span className="post-card-readtime">{post.readTime}</span>
      </div>
      <h3>{post.title}</h3>
      <p>{post.excerpt}</p>
      <div className="post-card-tags">
        {post.tags.map((t) => (
          <span key={t} className="tag">[{t}]</span>
        ))}
      </div>
      <div className="post-card-progress" style={{ width: `${readProgress}%` }} />
    </Link>
  );
}

/* ═══ SKELETON LOADER ═══ */
function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <div className="skeleton-line w40" />
      <div className="skeleton-line w80" />
      <div className="skeleton-line w60" />
    </div>
  );
}

/* ═══ COMMAND BAR (⌘K) ═══ */
function CommandBar({ open, onClose }) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef(null);

  const commands = [
    { icon: "✦", label: "New Post", shortcut: "⌘N", action: () => window.location.href = "/write/new" },
    { icon: "◉", label: "Dashboard", shortcut: "⌘D", action: () => window.location.href = "/write" },
    { icon: "⌕", label: "Search Posts", shortcut: "", action: () => { } },
    { icon: "▶", label: "Preview", shortcut: "⌘P", action: () => { } },
    { icon: "↗", label: "Publish", shortcut: "⌘⏎", action: () => { } },
    { icon: "↓", label: "Export as Markdown", shortcut: "", action: () => { } },
    { icon: "⚙", label: "Settings", shortcut: "⌘,", action: () => { } },
  ];

  const filtered = commands.filter((c) =>
    c.label.toLowerCase().includes(query.toLowerCase())
  );

  useEffect(() => {
    if (open && inputRef.current) inputRef.current.focus();
    setQuery("");
    setActiveIndex(0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
      }
      if (e.key === "Enter" && filtered[activeIndex]) {
        filtered[activeIndex].action();
        onClose();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, filtered, activeIndex, onClose]);

  if (!open) return null;

  return (
    <div className="cmd-overlay" onClick={onClose}>
      <div className="cmd-palette" onClick={(e) => e.stopPropagation()}>
        <div className="cmd-input-wrap">
          <span className="search-icon">⌕</span>
          <input
            ref={inputRef}
            className="cmd-input"
            placeholder="Type a command or search…"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIndex(0); }}
          />
        </div>
        <div className="cmd-results">
          <div className="cmd-group-title">Commands</div>
          {filtered.map((cmd, i) => (
            <div
              key={cmd.label}
              className={`cmd-item ${i === activeIndex ? "active" : ""}`}
              onClick={() => { cmd.action(); onClose(); }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <div className="cmd-icon">{cmd.icon}</div>
              {cmd.label}
              {cmd.shortcut && <span className="cmd-shortcut">{cmd.shortcut}</span>}
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ padding: "20px", textAlign: "center", color: "var(--muted)", fontSize: "0.72rem" }}>
              No results found
            </div>
          )}
        </div>
        <div className="cmd-footer">
          <span>↑↓ Navigate · ⏎ Select · Esc Close</span>
          <span>TERMINUS</span>
        </div>
      </div>
    </div>
  );
}

/* ═══ MAIN PAGE ═══ */
export default function HomePage() {
  const [cmdOpen, setCmdOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);

  // ⌘K global shortcut
  useEffect(() => {
    const handler = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const loadMore = () => {
    setLoading(true);
    setTimeout(() => {
      setShowMore(true);
      setLoading(false);
    }, 800);
  };

  const visiblePosts = showMore ? SAMPLE_POSTS : SAMPLE_POSTS.slice(0, 3);

  return (
    <>
      {/* ── Topbar ── */}
      <header className="topbar">
        <Link href="/" className="brand">
          <span className="brand-dot" />
          TERMINUS
        </Link>
        <nav className="topbar-nav">
          <Link href="/" className="active">Blog</Link>
          <a href="https://github.com/edonD" target="_blank" rel="noopener">GitHub</a>
          <a href="mailto:hello@terminus.blog">Contact</a>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section className="hero-landing">
        <p className="hero-kicker">Written by Edon</p>
        <h1 className="hero-title">
          Thoughts on building<br />
          the future<span className="cursor">_</span>
        </h1>
        <p className="hero-sub">
          Engineering, fintech, AI, and the raw lessons from building products
          that matter. No fluff — just signal.
        </p>
      </section>

      {/* ── Posts ── */}
      <section className="posts-section">
        <div className="posts-section-header">
          <h2>Latest Transmissions</h2>
          <span style={{ fontSize: "0.62rem", color: "var(--muted)" }}>
            {SAMPLE_POSTS.length} posts
          </span>
        </div>
        <div className="posts-grid">
          {visiblePosts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
          {loading && <>
            <SkeletonCard />
            <SkeletonCard />
          </>}
        </div>
        {!showMore && !loading && (
          <div style={{ textAlign: "center", marginTop: "24px" }}>
            <button className="btn btn-ghost" onClick={loadMore}>
              Load More
            </button>
          </div>
        )}
      </section>

      {/* ── Footer ── */}
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

      {/* ── Command palette ── */}
      <CommandBar open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}
