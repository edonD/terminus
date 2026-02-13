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
  const posts = useQuery(api.posts.list, { status: "published" });

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
        <nav className="home-nav">
          <Link href="/" className="active">
            Blog
          </Link>
          <a href="https://github.com/edonD" target="_blank" rel="noopener">
            GitHub
          </a>
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
      </footer>
    </div>
  );
}
