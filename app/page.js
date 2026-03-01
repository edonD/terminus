"use client";

import Image from "next/image";
import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useTrackPageview } from "./hooks/useTrackPageview";

const PERSONAL_PROFILE = {
  name: "Edon",
  imagePath: "/edon-new.png",
};

function getBodyPreview(post) {
  if (!post.content) return "";
  // Strip HTML tags, decode entities, collapse whitespace
  const text = post.content
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return "";
  return text.length > 220 ? text.substring(0, 220).trimEnd() + "…" : text;
}

function PostRow({ post }) {
  return (
    <li>
      <Link href={`/post/${post.slug}`} className="home-post-row">
        <span className="home-post-date">{post.date}</span>
        <div className="home-post-copy">
          <h3>{post.title}</h3>
          {post.excerpt && <p>{post.excerpt}</p>}
          {getBodyPreview(post) && (
            <p className="home-body-preview">{getBodyPreview(post)}</p>
          )}
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
  useTrackPageview({ path: "/" });

  if (!posts) {
    return (
      <div className="home-shell" style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ color: "#7a8fa6", fontFamily: "var(--font-mono, monospace)", fontSize: "0.78rem" }}>Loading…</span>
      </div>
    );
  }

  const TOPICS = [...new Set(posts.flatMap((post) => post.tags))];
  const [featured, ...rest] = posts;

  return (
    <div className="home-shell">
      <header className="home-topbar">
        <Link href="/" className="home-brand">
          TERMINUS
        </Link>
        <nav className="home-nav">
          <Link href="/" className="active">
            Essays
          </Link>
          <Link href="/contact">Contact</Link>
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
                Going through life and learning things.
              </p>
            </div>
          </div>
          {TOPICS.length > 0 && (
            <div className="home-topics" aria-label="Topics">
              {TOPICS.slice(0, 3).map((topic, i) => (
                <span key={topic}>
                  {i > 0 && " · "}
                  {topic.toLowerCase()}
                </span>
              ))}
            </div>
          )}
        </section>

        {featured && (
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
              {featured.excerpt && <p>{featured.excerpt}</p>}
              {getBodyPreview(featured) && (
                <p className="home-body-preview">{getBodyPreview(featured)}</p>
              )}
              <span className="home-featured-cta">Read essay →</span>
            </Link>
          </section>
        )}

        {featured ? (
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
        ) : (
          <div style={{ textAlign: "center", padding: "60px 0", color: "var(--muted)", fontFamily: "var(--font-mono)", fontSize: "0.78rem" }}>
            No posts yet.
          </div>
        )}
      </main>

      <footer className="home-footer">
        Set in Playfair Display · Written in Munich · Built with conviction
      </footer>
    </div>
  );
}
