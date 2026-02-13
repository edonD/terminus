import { mutation } from "./_generated/server";

const SEED_POSTS = [
    {
        slug: "the-future-of-european-fintech",
        title: "The Future of European Fintech Infrastructure",
        subtitle:
            "Why Europe's regulatory moat is becoming its biggest competitive advantage in building the next generation of financial plumbing.",
        excerpt:
            "Why Europe's regulatory moat is becoming its biggest competitive advantage in building the next generation of financial plumbing.",
        date: "2026.02.11",
        readTime: "8 min",
        wordCount: 2400,
        tags: ["fintech", "europe", "infrastructure"],
        status: "published",
        views: 1247,
        featured: true,
        content: `<h2 id="the-regulatory-advantage">The Regulatory Advantage</h2>
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
<p>We're building that future. And we're doing it from Europe.</p>`,
        sections: [
            { id: "the-regulatory-advantage", title: "The Regulatory Advantage" },
            { id: "infrastructure-layer", title: "The Infrastructure Layer" },
            { id: "stablecoin-rails", title: "Stablecoin Rails" },
            { id: "whats-next", title: "What's Next" },
        ],
    },
    {
        slug: "ai-agents-are-the-new-apis",
        title: "AI Agents Are the New APIs",
        subtitle:
            "The shift from request-response to autonomous task completion is the biggest paradigm shift since REST.",
        excerpt:
            "The shift from request-response to autonomous task completion is the biggest paradigm shift since REST. Here is what it means for builders.",
        date: "2026.02.08",
        readTime: "6 min",
        wordCount: 1800,
        tags: ["AI", "engineering", "architecture"],
        status: "published",
        views: 892,
        featured: false,
        content: `<h2 id="from-rest-to-agents">From REST to Agents</h2>
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
<p>The best platforms will be the ones that are easiest for agents to use — not just humans.</p>`,
        sections: [
            { id: "from-rest-to-agents", title: "From REST to Agents" },
            { id: "the-agent-loop", title: "The Agent Loop" },
            { id: "implications", title: "Implications for Builders" },
        ],
    },
    {
        slug: "stablecoins-will-eat-swift",
        title: "Stablecoins Will Eat SWIFT",
        excerpt:
            "A deep dive into why blockchain-native payment rails will replace legacy correspondence banking within the decade.",
        date: "2026.02.03",
        readTime: "12 min",
        wordCount: 3600,
        tags: ["crypto", "fintech", "payments"],
        status: "published",
        views: 2103,
        featured: false,
        content:
            "<p>Coming soon — this essay is currently being researched and written.</p>",
    },
    {
        slug: "building-in-public-lessons",
        title: "What I Learned Building in Public for 6 Months",
        excerpt:
            "Raw lessons from shipping a B2B product with zero marketing budget, zero connections, and an unreasonable amount of conviction.",
        date: "2026.01.28",
        readTime: "10 min",
        wordCount: 3000,
        tags: ["startups", "building"],
        status: "published",
        views: 1560,
        featured: false,
        content:
            "<p>Coming soon — this essay is currently being researched and written.</p>",
    },
    {
        slug: "the-mev-problem-explained",
        title: "The MEV Problem, Explained for Humans",
        excerpt:
            "Maximal Extractable Value is silently taxing every DeFi user. Here is how sandwich attacks work and what we can do about it.",
        date: "2026.01.20",
        readTime: "14 min",
        wordCount: 4200,
        tags: ["DeFi", "engineering", "crypto"],
        status: "published",
        views: 780,
        featured: false,
        content:
            "<p>Coming soon — this essay is currently being researched and written.</p>",
    },
    {
        slug: "why-i-left-corporate",
        title: "Why I Left Corporate to Build a Startup",
        excerpt: "A personal essay on leaving stability for uncertainty.",
        date: "2026.02.10",
        readTime: "—",
        wordCount: 0,
        tags: ["startups", "personal"],
        status: "draft",
        views: 0,
        featured: false,
        content: "",
    },
    {
        slug: "regulatory-arbitrage",
        title: "Regulatory Arbitrage in Digital Markets",
        excerpt: "Exploring the edges of regulatory frameworks in digital finance.",
        date: "2026.02.09",
        readTime: "—",
        wordCount: 0,
        tags: ["regulation", "fintech"],
        status: "draft",
        views: 0,
        featured: false,
        content: "",
    },
];

export const seed = mutation({
    args: {},
    handler: async (ctx) => {
        // Check if posts already exist
        const existing = await ctx.db.query("posts").first();
        if (existing) {
            console.log("Posts already seeded, skipping.");
            return "already_seeded";
        }

        for (const post of SEED_POSTS) {
            await ctx.db.insert("posts", post);
        }

        console.log(`Seeded ${SEED_POSTS.length} posts.`);
        return `seeded_${SEED_POSTS.length}`;
    },
});
