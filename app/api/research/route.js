import { NextResponse } from "next/server";

/* ═══════════════════════════════════════════════════
   DEEP RESEARCH AGENT — Multi-stage iterative pipeline
   ─────────────────────────────────────────────────────
   Stage 1 : LLM query decomposition  (topic → sub-queries)
   Stage 2 : Parallel Tavily search    (advanced + raw content)
   Stage 3 : Source scoring & ranking
   Stage 4 : LLM gap analysis          (enough? → more queries)
   Stage 5 : Second-round search       (fill gaps)
   Stage 6 : Final LLM synthesis       (structured output)
   ═══════════════════════════════════════════════════ */

const TAVILY_SEARCH_URL = "https://api.tavily.com/search";
const OPENAI_URL = "https://api.openai.com/v1/responses";
const MODEL = "gpt-5-mini";

const MAX_TOPIC_LENGTH = 300;
const MAX_SOURCES = 20;
const MAX_RAW_CHARS = 3000; // per source, to stay within context window

const INTENT_PROMPTS = {
  explain:
    "Write to teach from first principles with clear definitions and smooth transitions.",
  contrarian:
    "Challenge assumptions, highlight where consensus is weak, and present counter-evidence.",
  strategy:
    "Focus on actionable strategy, sequencing, tradeoffs, and decision frameworks.",
  tutorial:
    "Create a step-by-step implementation guide with checkpoints and practical examples.",
};

const AUDIENCE_LABELS = {
  founders: "startup founders and operators",
  engineers: "technical builders and engineering leads",
  investors: "investors, analysts, and decision-makers",
  general: "curious professionals with mixed technical depth",
};

/* ── Utility helpers ── */

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

function norm(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function normUrl(s) {
  if (!s) return null;
  try {
    const u = new URL(s);
    u.hash = "";
    return u.toString();
  } catch {
    return null;
  }
}

function domain(s) {
  try {
    return new URL(s).hostname.replace(/^www\./i, "");
  } catch {
    return "";
  }
}

function parseJsonLoose(text) {
  if (!text) return null;
  const c = text.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "");
  const f = c.indexOf("{");
  const l = c.lastIndexOf("}");
  if (f === -1 || l <= f) return null;
  try {
    return JSON.parse(c.slice(f, l + 1));
  } catch {
    return null;
  }
}

function uniqBy(arr, keyFn) {
  const seen = new Set();
  return arr.filter((x) => {
    const k = keyFn(x);
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function truncate(s, max) {
  if (!s || s.length <= max) return s || "";
  return s.slice(0, max) + "…";
}

/* ── Source scoring ── */

function scoreSource(src, topic) {
  let s = 0;
  const snip = (src.snippet || "").toLowerCase();
  const ttl = (src.title || "").toLowerCase();
  const t = topic.toLowerCase();
  const d = (src.domain || "").toLowerCase();

  if (ttl.includes(t)) s += 5;
  if (snip.includes(t)) s += 3;
  if (src.rawContent) s += 4; // full content available = high value
  if (snip.length > 200) s += 2;
  if (/\b20(2[4-9]|3\d)\b/.test(snip)) s += 2; // recent dates
  if (d.endsWith(".gov") || d.endsWith(".edu")) s += 3;
  if (d.includes("arxiv.org")) s += 2;
  if (d.includes("wikipedia.org")) s -= 1;
  // Penalise very short/empty content
  if (snip.length < 40 && !src.rawContent) s -= 2;
  return s;
}

/* ═══════════════════════════════════════════════════
   STAGE 1 — LLM Query Decomposition
   ═══════════════════════════════════════════════════ */

async function decomposeQueries({ openAiKey, topic, intent, audience, depth }) {
  const numQueries = depth === "deep" ? 8 : depth === "balanced" ? 6 : 4;

  const prompt = `You are a research query planner. Given a research topic, generate ${numQueries} diverse, specific search queries that together cover the topic comprehensively.

Topic: "${topic}"
Intent: ${intent}
Target audience: ${AUDIENCE_LABELS[audience] || AUDIENCE_LABELS.general}

Requirements:
- Each query should target a DIFFERENT angle or sub-topic
- Include at least 1 query for recent developments (mention the current year ${new Date().getFullYear()})
- Include at least 1 query for data/statistics/evidence
- Include at least 1 query for expert opinions or case studies
- For "contrarian" intent, include queries that look for criticism/risks/limitations
- For "tutorial" intent, include queries for step-by-step guides and best practices
- Make queries specific enough to return high-quality results (not generic)

Return ONLY a JSON object: { "queries": ["query1", "query2", ...], "subTopics": ["subtopic1", "subtopic2", ...] }`;

  try {
    const res = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openAiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        input: [{ role: "user", content: prompt }],
        temperature: 0.4,
      }),
    });

    if (!res.ok) throw new Error(`Query decomposition failed (${res.status})`);
    const data = await res.json();
    const text = norm(data?.output_text) || norm(data?.choices?.[0]?.message?.content) || "";
    const parsed = parseJsonLoose(text);
    if (parsed?.queries?.length) return parsed;
  } catch {
    // fallback to static queries
  }

  // Deterministic fallback
  return {
    queries: buildStaticQueries(topic, intent, audience, depth),
    subTopics: [topic],
  };
}

function buildStaticQueries(topic, intent, audience, depth) {
  const year = new Date().getFullYear();
  const hints = {
    contrarian: "criticism risks limitations",
    tutorial: "step-by-step guide best practices",
    strategy: "strategy roadmap framework",
    explain: "explained overview trends",
  };
  const h = hints[intent] || hints.explain;
  const a = AUDIENCE_LABELS[audience] || AUDIENCE_LABELS.general;
  const qs = [
    topic,
    `${topic} ${h}`,
    `${topic} latest ${year}`,
    `${topic} data statistics evidence`,
    `${topic} case study examples`,
    `${topic} for ${a}`,
    `${topic} expert analysis`,
    `${topic} future outlook predictions`,
  ];
  const count = depth === "deep" ? 8 : depth === "balanced" ? 6 : 4;
  return qs.slice(0, count);
}

/* ═══════════════════════════════════════════════════
   STAGE 2 — Parallel Tavily Search (advanced + raw content)
   ═══════════════════════════════════════════════════ */

async function searchTavily(query, maxResults, apiKey, includeTopic) {
  const body = {
    query,
    max_results: maxResults,
    search_depth: "advanced",
    include_answer: false,
    include_images: false,
    include_raw_content: "markdown",
  };
  if (includeTopic && includeTopic !== "general") {
    body.topic = includeTopic;
  }

  const res = await fetch(TAVILY_SEARCH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(`Tavily search failed (${res.status})`);
  const data = await res.json();
  return (data?.results || [])
    .map((item) => {
      const url = normUrl(item.url);
      if (!url) return null;
      return {
        title: norm(item.title) || "Untitled",
        url,
        snippet: norm(item.content || ""),
        rawContent: truncate(item.raw_content || "", MAX_RAW_CHARS),
        domain: domain(url),
        publishedDate: item.published_date || null,
        provider: "tavily",
      };
    })
    .filter(Boolean);
}

async function gatherSources(queries, maxPerQuery) {
  const tavilyKey = process.env.TAVILY_API_KEY;
  if (!tavilyKey) {
    return { sources: [], searchLog: [{ error: "TAVILY_API_KEY not configured" }] };
  }

  const searchLog = [];
  const workers = queries.map(async (query) => {
    const start = Date.now();
    try {
      const results = await searchTavily(query, maxPerQuery, tavilyKey, "general");
      searchLog.push({ query, results: results.length, ms: Date.now() - start });
      return results;
    } catch (err) {
      searchLog.push({ query, error: err.message, ms: Date.now() - start });
      return [];
    }
  });

  const settled = await Promise.allSettled(workers);
  const all = settled
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => r.value);

  return { sources: all, searchLog };
}

/* ═══════════════════════════════════════════════════
   STAGE 3 — Source Ranking & Deduplication
   ═══════════════════════════════════════════════════ */

function rankSources(rawSources, topic, limit) {
  const scored = rawSources.map((s) => ({ ...s, score: scoreSource(s, topic) }));
  scored.sort((a, b) => b.score - a.score);
  const deduped = uniqBy(scored, (s) => s.url).slice(0, limit);
  return deduped.map((s, i) => ({
    id: `S${i + 1}`,
    title: s.title,
    url: s.url,
    snippet: s.snippet,
    rawContent: s.rawContent,
    domain: s.domain,
    publishedDate: s.publishedDate,
    provider: s.provider,
    score: s.score,
  }));
}

/* ═══════════════════════════════════════════════════
   STAGE 4 — LLM Gap Analysis
   ═══════════════════════════════════════════════════ */

async function analyzeGaps({ openAiKey, topic, intent, audience, sources, subTopics }) {
  if (sources.length >= 10) {
    // Quick check: do we have enough coverage?
    const sourceText = sources
      .slice(0, 8)
      .map((s) => `[${s.id}] ${s.title} — ${s.snippet.slice(0, 100)}`)
      .join("\n");

    const prompt = `You are evaluating research coverage. Given the sources found so far, determine if we need MORE targeted searches to fill knowledge gaps.

Topic: "${topic}"
Intent: ${intent}
Audience: ${AUDIENCE_LABELS[audience] || AUDIENCE_LABELS.general}
Sub-topics to cover: ${(subTopics || []).join(", ")}

Sources found so far:
${sourceText}

If the research is SUFFICIENT, return: { "sufficient": true, "gaps": [] }
If there are GAPS, return: { "sufficient": false, "gaps": ["gap1", "gap2"], "additionalQueries": ["query1", "query2"] }
Maximum 3 additional queries. Return ONLY valid JSON.`;

    try {
      const res = await fetch(OPENAI_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${openAiKey}`,
        },
        body: JSON.stringify({
          model: MODEL,
          input: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const text = norm(data?.output_text) || norm(data?.choices?.[0]?.message?.content) || "";
        const parsed = parseJsonLoose(text);
        if (parsed && !parsed.sufficient && parsed.additionalQueries?.length) {
          return { needsMore: true, gapQueries: parsed.additionalQueries.slice(0, 3), gaps: parsed.gaps || [] };
        }
      }
    } catch {
      // Continue without gap analysis
    }
  }
  return { needsMore: false, gapQueries: [], gaps: [] };
}

/* ═══════════════════════════════════════════════════
   STAGE 6 — Final LLM Synthesis
   ═══════════════════════════════════════════════════ */

async function synthesize({ openAiKey, topic, intent, audience, sources, queries, subTopics, gaps }) {
  // Build rich source context with raw content when available
  const sourceText = sources
    .map((s) => {
      const parts = [`[${s.id}] ${s.title}`, `URL: ${s.url}`, `Domain: ${s.domain}`];
      if (s.publishedDate) parts.push(`Published: ${s.publishedDate}`);
      if (s.rawContent && s.rawContent.length > 100) {
        parts.push(`Full content:\n${s.rawContent}`);
      } else {
        parts.push(`Snippet: ${s.snippet || "(no snippet)"}`);
      }
      return parts.join("\n");
    })
    .join("\n\n---\n\n");

  const prompt = `You are a senior research analyst preparing a comprehensive research brief for a blog writer.

RESEARCH CONTEXT
─────────────
Topic: ${topic}
Intent: ${intent} — ${INTENT_PROMPTS[intent] || INTENT_PROMPTS.explain}
Audience: ${AUDIENCE_LABELS[audience] || AUDIENCE_LABELS.general}
Sub-topics explored: ${(subTopics || []).join(", ")}
Search queries used: ${queries.join(" | ")}
${gaps.length ? `Knowledge gaps identified: ${gaps.join("; ")}` : ""}

INSTRUCTIONS
─────────────
1. ONLY use information from the sources below. Never invent facts.
2. Cite sources using their IDs: [S1], [S2], etc.
3. Prioritize recent data — sources with dates from ${new Date().getFullYear()} are more valuable.
4. For the outline, create 5-7 section headings that flow logically.
5. For sectionStarters, write 1-2 compelling opening sentences for each outline section that hook the reader.
6. keyTakeaways should be 5-8 specific, evidence-backed claims with source citations.
7. riskyClaims: flag any statements that lack strong evidence or could be contested.
8. summaryMarkdown: write a polished 400-600 word summary using proper markdown formatting.

Return ONLY valid JSON with this exact schema:
{
  "suggestedTitle": "string — compelling, specific article title",
  "thesis": "string — the central argument in 1-2 sentences",
  "oneSentenceAngle": "string — the unique angle this article takes",
  "outline": ["string — section heading"],
  "sectionStarters": ["string — opening sentences for each section"],
  "summaryMarkdown": "string — polished markdown summary with [S#] citations",
  "keyTakeaways": ["string — specific claim with [S#] citation"],
  "riskyClaims": ["string — statements that need verification"],
  "confidenceScore": 0.0-1.0
}

SOURCES
─────────────
${sourceText}`;

  const res = await fetch(OPENAI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      input: [{ role: "user", content: prompt }],
      temperature: 0.15,
    }),
  });

  if (!res.ok) throw new Error(`Synthesis failed (${res.status})`);
  const data = await res.json();
  const text = norm(data?.output_text) || norm(data?.choices?.[0]?.message?.content) || "";
  const parsed = parseJsonLoose(text);
  if (!parsed) throw new Error("Synthesis JSON parse failed");
  return parsed;
}

/* ── Deterministic fallback synthesis ── */

function fallbackSynthesis({ topic, intent, audience, sources, queries }) {
  const top = sources.slice(0, 6);
  return {
    suggestedTitle: `Research Brief: ${topic}`,
    thesis: top[0]?.snippet || `Summary of available sources on ${topic}.`,
    oneSentenceAngle: INTENT_PROMPTS[intent] || INTENT_PROMPTS.explain,
    outline: [
      "Hook and context",
      "Current state and key facts",
      "Recent developments",
      "Analysis and tradeoffs",
      "Actionable next steps",
    ],
    sectionStarters: [
      `Why ${topic} matters now.`,
      "The strongest signal from current evidence.",
      "What changed recently.",
      "The tradeoffs to consider.",
      "What builders should do next.",
    ],
    summaryMarkdown: top.map((s, i) => `- [S${i + 1}] ${s.title}: ${s.snippet}`).join("\n"),
    keyTakeaways: top.map((s) => s.snippet).filter(Boolean).slice(0, 5),
    riskyClaims: [],
    confidenceScore: 0.3,
    generatedFrom: "fallback",
    usedQueries: queries,
  };
}

/* ═══════════════════════════════════════════════════
   MAIN HANDLER — Orchestrates the full pipeline
   ═══════════════════════════════════════════════════ */

export async function POST(req) {
  try {
    const body = await req.json();

    const topic = norm(body?.topic || "").slice(0, MAX_TOPIC_LENGTH);
    if (!topic) {
      return NextResponse.json({ error: "topic is required" }, { status: 400 });
    }

    const intent = norm(body?.intent || "explain").toLowerCase();
    const audience = norm(body?.audience || "general").toLowerCase();
    const depth = norm(body?.depth || "balanced").toLowerCase();
    const maxSources = clamp(Number(body?.maxSources || 12), 4, MAX_SOURCES);

    const openAiKey = process.env.OPENAI_API_KEY;
    const pipeline = { stages: [], timing: {} };
    let t0;

    /* ── Stage 1: Query Decomposition ── */
    t0 = Date.now();
    let decomposition;
    if (openAiKey) {
      decomposition = await decomposeQueries({ openAiKey, topic, intent, audience, depth });
    } else {
      decomposition = {
        queries: buildStaticQueries(topic, intent, audience, depth),
        subTopics: [topic],
      };
    }
    pipeline.timing.queryDecomposition = Date.now() - t0;
    pipeline.stages.push({
      stage: "query_decomposition",
      queries: decomposition.queries,
      subTopics: decomposition.subTopics,
    });

    /* ── Stage 2: Parallel Search (Round 1) ── */
    t0 = Date.now();
    const round1 = await gatherSources(decomposition.queries, 4);
    pipeline.timing.searchRound1 = Date.now() - t0;
    pipeline.stages.push({
      stage: "search_round_1",
      totalResults: round1.sources.length,
      searchLog: round1.searchLog,
    });

    /* ── Stage 3: Rank Sources ── */
    let sources = rankSources(round1.sources, topic, maxSources);

    if (!sources.length) {
      return NextResponse.json(
        {
          error: "No sources found. Try a more specific topic or check your TAVILY_API_KEY.",
          pipeline,
        },
        { status: 502 }
      );
    }

    /* ── Stage 4: Gap Analysis ── */
    let gapResult = { needsMore: false, gapQueries: [], gaps: [] };
    if (openAiKey && depth !== "quick") {
      t0 = Date.now();
      gapResult = await analyzeGaps({
        openAiKey,
        topic,
        intent,
        audience,
        sources,
        subTopics: decomposition.subTopics,
      });
      pipeline.timing.gapAnalysis = Date.now() - t0;
      pipeline.stages.push({
        stage: "gap_analysis",
        needsMore: gapResult.needsMore,
        gaps: gapResult.gaps,
        additionalQueries: gapResult.gapQueries,
      });
    }

    /* ── Stage 5: Second-Round Search (if gaps found) ── */
    if (gapResult.needsMore && gapResult.gapQueries.length) {
      t0 = Date.now();
      const round2 = await gatherSources(gapResult.gapQueries, 3);
      pipeline.timing.searchRound2 = Date.now() - t0;
      pipeline.stages.push({
        stage: "search_round_2",
        totalResults: round2.sources.length,
        searchLog: round2.searchLog,
      });

      // Merge and re-rank
      const allSources = [...round1.sources, ...round2.sources];
      sources = rankSources(allSources, topic, maxSources);
    }

    /* ── Stage 6: Final Synthesis ── */
    let synthesis;
    let mode = "fallback";
    t0 = Date.now();

    if (openAiKey) {
      try {
        synthesis = await synthesize({
          openAiKey,
          topic,
          intent,
          audience,
          sources,
          queries: [...decomposition.queries, ...gapResult.gapQueries],
          subTopics: decomposition.subTopics,
          gaps: gapResult.gaps,
        });
        mode = "deep_research";
      } catch {
        synthesis = fallbackSynthesis({
          topic, intent, audience, sources,
          queries: decomposition.queries,
        });
      }
    } else {
      synthesis = fallbackSynthesis({
        topic, intent, audience, sources,
        queries: decomposition.queries,
      });
    }

    pipeline.timing.synthesis = Date.now() - t0;
    pipeline.stages.push({ stage: "synthesis", mode });

    // Strip rawContent from response to keep payload manageable
    const cleanSources = sources.map(({ rawContent, ...rest }) => rest);

    return NextResponse.json({
      ok: true,
      mode,
      model: MODEL,
      generatedAt: new Date().toISOString(),
      plan: {
        topic,
        intent,
        audience,
        depth,
        queries: decomposition.queries,
        subTopics: decomposition.subTopics,
        gaps: gapResult.gaps,
        totalSearchRounds: gapResult.needsMore ? 2 : 1,
      },
      sources: cleanSources,
      synthesis,
      pipeline,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Research agent failed", details: error?.message || "Unknown error" },
      { status: 500 }
    );
  }
}
