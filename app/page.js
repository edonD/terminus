import Image from "next/image";
import Link from "next/link";

const SAMPLE_POSTS = [
  {
    slug: "the-future-of-european-fintech",
    title: "The Future of European Fintech Infrastructure",
    excerpt:
      "Why Europe's regulatory moat is becoming its biggest competitive advantage in building the next generation of financial plumbing.",
    date: "2026.02.11",
    readTime: "8 min",
    tags: ["fintech", "europe", "infrastructure"],
    wordCount: 2400,
  },
  {
    slug: "ai-agents-are-the-new-apis",
    title: "AI Agents Are the New APIs",
    excerpt:
      "The shift from request-response to autonomous task completion is the biggest paradigm shift since REST. Here is what it means for builders.",
    date: "2026.02.08",
    readTime: "6 min",
    tags: ["AI", "engineering", "architecture"],
    wordCount: 1800,
  },
  {
    slug: "stablecoins-will-eat-swift",
    title: "Stablecoins Will Eat SWIFT",
    excerpt:
      "A deep dive into why blockchain-native payment rails will replace legacy correspondence banking within the decade.",
    date: "2026.02.03",
    readTime: "12 min",
    tags: ["crypto", "fintech", "payments"],
    wordCount: 3600,
  },
  {
    slug: "building-in-public-lessons",
    title: "What I Learned Building in Public for 6 Months",
    excerpt:
      "Raw lessons from shipping a B2B product with zero marketing budget, zero connections, and an unreasonable amount of conviction.",
    date: "2026.01.28",
    readTime: "10 min",
    tags: ["startups", "building"],
    wordCount: 3000,
  },
  {
    slug: "the-mev-problem-explained",
    title: "The MEV Problem, Explained for Humans",
    excerpt:
      "Maximal Extractable Value is silently taxing every DeFi user. Here is how sandwich attacks work and what we can do about it.",
    date: "2026.01.20",
    readTime: "14 min",
    tags: ["DeFi", "engineering", "crypto"],
    wordCount: 4200,
  },
];

const PERSONAL_PROFILE = {
  name: "Edon",
  imagePath: "/edon.png",
};

const TOPICS = [...new Set(SAMPLE_POSTS.flatMap((post) => post.tags))];

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
  const [featured, ...rest] = SAMPLE_POSTS;

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
            <span>{SAMPLE_POSTS.length} essays</span>
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
