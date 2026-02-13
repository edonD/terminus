"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";

const PERSONAL_PROFILE = {
  name: "Edon",
  imagePath: "/edon-new.png",
};

function PostRow({ post }) {
  return (
    <li>
      <Link href={`/post/${post.slug}`} className="home-post-row">
        <span className="home-post-date">{post.date}</span>
        <div className="home-post-copy">
          <h3>{post.title}</h3>
          <p>{post.excerpt}</p>
        </div>
        <span className="home-post-meta">
          {post.readTime}
          <br />
          {post.wordCount}w
        </span>
      </Link>
    </li>
  );
}

export default function HomePage() {
<<<<<<< HEAD
  const posts = useQuery(api.posts.list, { status: "published" });
=======
  const [cmdOpen, setCmdOpen] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (e) => {
    e.preventDefault();
    if (!email || !email.includes("@")) return;
    const subs = JSON.parse(localStorage.getItem("terminus_subs") || "[]");
    if (!subs.includes(email)) {
      subs.push(email);
      localStorage.setItem("terminus_subs", JSON.stringify(subs));
    }
    setSubscribed(true);
    setEmail("");
  };
>>>>>>> 5b5058c3e16e07d1a2d462924acbc2009bbcbd78

  if (!posts) {
    return (
      <div className="home-shell" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#7a8fa6", fontFamily: "var(--font-mono, monospace)", fontSize: "0.78rem" }}>Loading…</span>
      </div>
    );
  }

  const TOPICS = [...new Set(posts.flatMap((post) => post.tags))];
  const [featured, ...rest] = posts;

  if (!featured) {
    return (
      <div className="home-shell" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#7a8fa6", fontFamily: "var(--font-mono, monospace)", fontSize: "0.78rem" }}>No posts yet.</span>
      </div>
    );
  }

  return (
    <div className="home-shell">
      <header className="home-topbar">
        <Link href="/" className="home-brand">
          TERMINUS
        </Link>
<<<<<<< HEAD
        <nav className="home-nav">
          <Link href="/" className="active">
            Blog
          </Link>
          <a href="https://github.com/edonD" target="_blank" rel="noopener">
            GitHub
          </a>
=======
        <nav className="topbar-nav">
          <Link href="/" className="active">Blog</Link>
          <a href="https://x.com/edon_d" target="_blank" rel="noopener">X</a>
>>>>>>> 5b5058c3e16e07d1a2d462924acbc2009bbcbd78
          <a href="mailto:hello@terminus.blog">Contact</a>
        </nav>
      </header>

      <main className="home-main">
        <section className="home-hero">
          <div className="home-intro-card">
            <div className="home-avatar-wrap">
              <Image
                src={PERSONAL_PROFILE.imagePath}
                alt={`Portrait of ${PERSONAL_PROFILE.name}`}
                width={400}
                height={400}
                className="home-avatar"
                sizes="(max-width: 760px) 92vw, 320px"
                quality={100}
                priority
              />
            </div>
            <div>
              <p className="home-kicker">Personal notebook by {PERSONAL_PROFILE.name}</p>
              <h1>Signal over noise.</h1>
              <p className="home-subtitle">
                I am {PERSONAL_PROFILE.name}. I write essays on fintech
                infrastructure, AI systems, and real lessons from building
                products from first principles.
              </p>
            </div>
          </div>
          <div className="home-topics" aria-label="Topics">
            {TOPICS.map((topic) => (
              <span key={topic} className="home-topic-pill">
                {topic.toLowerCase()}
              </span>
            ))}
          </div>
        </section>

<<<<<<< HEAD
        <section className="home-featured" aria-labelledby="featured-heading">
          <p id="featured-heading" className="home-section-label">
            Featured
          </p>
          <Link href={`/post/${featured.slug}`} className="home-featured-link">
            <div className="home-featured-meta">
              <span>{featured.date}</span>
              <span>{featured.readTime}</span>
              <span>{featured.wordCount} words</span>
            </div>
            <h2>{featured.title}</h2>
            <p>{featured.excerpt}</p>
            <span className="home-featured-cta">Read essay {"->"}</span>
          </Link>
        </section>

        <section className="home-archive" aria-labelledby="archive-heading">
          <div className="home-archive-head">
            <p id="archive-heading" className="home-section-label">
              Archive
            </p>
            <span>{posts.length} essays</span>
          </div>
          <ul className="home-post-list">
            <PostRow post={featured} />
            {rest.map((post) => (
              <PostRow key={post.slug} post={post} />
            ))}
          </ul>
        </section>
      </main>

      <footer className="home-footer">
        TERMINUS | {new Date().getFullYear()} | Built with conviction
=======
      {/* ── Subscribe ── */}
      <section className="subscribe-section">
        <div className="subscribe-box">
          <span className="subscribe-icon">◉</span>
          <h3>Get new posts delivered to your inbox</h3>
          <p>No spam. Unsubscribe anytime. Just signal.</p>
          {subscribed ? (
            <div className="subscribe-success">
              <span>✓</span> You're in. Welcome to the terminal.
            </div>
          ) : (
            <form className="subscribe-form" onSubmit={handleSubscribe}>
              <input
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary btn-sm">Subscribe</button>
            </form>
          )}
        </div>
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
>>>>>>> 5b5058c3e16e07d1a2d462924acbc2009bbcbd78
      </footer>
    </div>
  );
}
