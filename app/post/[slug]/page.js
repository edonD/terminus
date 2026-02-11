"use client";

import { useState, useEffect, useRef, use } from "react";
import Link from "next/link";

/* ═══ SAMPLE POST CONTENT ═══ */
const POSTS_DB = {
    "the-future-of-european-fintech": {
        title: "The Future of European Fintech Infrastructure",
        subtitle: "Why Europe's regulatory moat is becoming its biggest competitive advantage in building the next generation of financial plumbing.",
        date: "2026.02.11",
        readTime: "8 min",
        wordCount: 2400,
        tags: ["fintech", "europe", "infrastructure"],
        sections: [
            { id: "the-regulatory-advantage", title: "The Regulatory Advantage" },
            { id: "infrastructure-layer", title: "The Infrastructure Layer" },
            { id: "stablecoin-rails", title: "Stablecoin Rails" },
            { id: "whats-next", title: "What's Next" },
        ],
        content: `
<h2 id="the-regulatory-advantage">The Regulatory Advantage</h2>
<p>While Silicon Valley moves fast and breaks things, Europe has been quietly building something more durable: a regulatory framework that actually works for fintech innovation. MiCA, PSD3, and the Digital Euro initiative aren't just bureaucratic overhead — they're infrastructure.</p>
<p>The result? A predictable operating environment where compliant companies can scale without the existential risk of sudden regulatory crackdowns. This is the moat.</p>

<blockquote>The best time to build financial infrastructure in Europe was five years ago. The second best time is now.</blockquote>

<h2 id="infrastructure-layer">The Infrastructure Layer</h2>
<p>The real opportunity isn't in consumer-facing fintech apps. It's in the plumbing. The APIs, the settlement layers, the compliance engines. Every B2B payment that crosses a border reveals the cracks in legacy banking infrastructure.</p>

<pre><code class="language-javascript">// The old way: SWIFT message routing
const transfer = await swift.send({
  sender: "DEUTDEFF",
  receiver: "CHASUS33", 
  amount: 50000,
  currency: "EUR",
  // Settlement: T+2 days, maybe
  // Fee: $25-45 per transaction
  // Transparency: none
});

// The new way: Stablecoin rails
const transfer = await stablecoinRail.send({
  from: vIBAN_sender,
  to: vIBAN_receiver,
  amount: 50000,
  asset: "EURC",
  // Settlement: < 30 seconds
  // Fee: $0.001
  // Transparency: full on-chain audit trail
});</code></pre>

<h2 id="stablecoin-rails">Stablecoin Rails</h2>
<p>The convergence of regulated stablecoins (like Circle's EURC) with traditional banking APIs creates a new category: <strong>hybrid payment rails</strong>. These systems speak both IBAN and blockchain, settling in seconds instead of days.</p>
<p>For treasury teams managing cross-border payments, this isn't a nice-to-have. It's a competitive necessity. The companies that adopt these rails first will have a structural cost advantage that compounds over time.</p>

<h2 id="whats-next">What's Next</h2>
<p>The next 18 months will see the first wave of MiCA-licensed payment institutions offering stablecoin-native B2B corridors across Europe. The infrastructure is ready. The regulation is clear. The only question is who moves first.</p>
<p>We're building that future. And we're doing it from Europe.</p>
    `,
    },
    "ai-agents-are-the-new-apis": {
        title: "AI Agents Are the New APIs",
        subtitle: "The shift from request-response to autonomous task completion is the biggest paradigm shift since REST.",
        date: "2026.02.08",
        readTime: "6 min",
        wordCount: 1800,
        tags: ["AI", "engineering", "architecture"],
        sections: [
            { id: "from-rest-to-agents", title: "From REST to Agents" },
            { id: "the-agent-loop", title: "The Agent Loop" },
            { id: "implications", title: "Implications for Builders" },
        ],
        content: `
<h2 id="from-rest-to-agents">From REST to Agents</h2>
<p>For two decades, software has been built on a simple contract: send a request, get a response. REST APIs formalized this into the fabric of the internet. But AI agents break this contract entirely.</p>
<p>An agent doesn't just respond to requests — it observes, plans, executes, and iterates. It's not a function call. It's a collaborator.</p>

<blockquote>APIs are deterministic. Agents are probabilistic. This changes everything about how we architect systems.</blockquote>

<h2 id="the-agent-loop">The Agent Loop</h2>
<p>The fundamental architecture of an AI agent is deceptively simple: observe → think → act → repeat. But the implications are profound. Each cycle can produce different outputs, explore different paths, and make different decisions.</p>

<pre><code class="language-python"># The Agent Loop
class Agent:
    def __init__(self, tools, memory):
        self.tools = tools
        self.memory = memory
    
    async def run(self, objective):
        while not self.is_complete(objective):
            observation = await self.observe()
            plan = await self.think(observation, objective)
            result = await self.act(plan)
            self.memory.store(result)
        
        return self.memory.summarize()</code></pre>

<h2 id="implications">Implications for Builders</h2>
<p>If you're building developer tools, platforms, or infrastructure, the agent paradigm changes your design space completely. Your APIs need to be <strong>discoverable</strong>, not just documented. Your error messages need to be <strong>diagnostic</strong>, not just descriptive.</p>
<p>The best platforms will be the ones that are easiest for agents to use — not just humans.</p>
    `,
    },
};

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
    const post = POSTS_DB[resolvedParams.slug] || FALLBACK_POST;
    const [readProgress, setReadProgress] = useState(0);
    const [showStickyHeader, setShowStickyHeader] = useState(false);
    const [activeSection, setActiveSection] = useState("");
    const [reactions, setReactions] = useState({});
    const headerRef = useRef(null);

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
            const sections = post.sections || [];
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
    }, [post.sections]);

    const toggleReaction = (type) => {
        setReactions((prev) => ({ ...prev, [type]: !prev[type] }));
    };

    const copyCode = (text) => {
        navigator.clipboard.writeText(text);
    };

    // Process content to add terminal-style code blocks
    const processContent = (html) => {
        return html.replace(
            /<pre><code class="language-(\w+)">([\s\S]*?)<\/code><\/pre>/g,
            (match, lang, code) => {
                const decoded = code.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
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
                        {post.tags.map((t) => (
                            <span key={t} className="tag">[{t}]</span>
                        ))}
                    </div>
                </div>

                {/* Table of Contents */}
                {post.sections.length > 0 && (
                    <nav className="toc">
                        <h4>Contents</h4>
                        {post.sections.map((s) => (
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
                        dangerouslySetInnerHTML={{ __html: processContent(post.content) }}
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
