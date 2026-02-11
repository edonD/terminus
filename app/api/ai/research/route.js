import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

/* ═══════════════════════════════════════════════════
   SERPER WEB SEARCH
   ═══════════════════════════════════════════════════ */
async function searchSerper(query) {
    const res = await fetch("https://google.serper.dev/search", {
        method: "POST",
        headers: {
            "X-API-KEY": process.env.SERPER_API_KEY,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({ q: query, num: 8 }),
    });

    if (!res.ok) throw new Error(`Serper API error: ${res.status}`);
    const data = await res.json();
    const results = [];

    if (data.organic) {
        data.organic.forEach((r) => {
            results.push({ title: r.title, snippet: r.snippet, link: r.link });
        });
    }
    if (data.knowledgeGraph) {
        results.push({
            title: data.knowledgeGraph.title || "Knowledge Graph",
            snippet: data.knowledgeGraph.description || "",
            link: data.knowledgeGraph.website || "",
        });
    }
    return results;
}

/* ═══════════════════════════════════════════════════
   GENERATE SEARCH QUERIES via AI
   ═══════════════════════════════════════════════════ */
async function generateSearchQueries(topic, model) {
    const prompt = `Generate exactly 4 diverse Google search queries to deeply research this topic for a blog post. Each query should explore a different angle: factual/statistics, trends/analysis, contrarian/criticism, and practical/actionable. Return ONLY a JSON array of 4 strings, nothing else.

Topic: "${topic}"`;

    try {
        if (model === "gpt") {
            const res = await openai.chat.completions.create({
                model: "gpt-4.1-mini",
                max_tokens: 300,
                messages: [{ role: "user", content: prompt }],
            });
            return JSON.parse(res.choices[0].message.content);
        } else {
            const res = await anthropic.messages.create({
                model: "claude-sonnet-4-20250514",
                max_tokens: 300,
                messages: [{ role: "user", content: prompt }],
            });
            return JSON.parse(res.content[0].text);
        }
    } catch {
        // Fallback: use the topic directly with variations
        return [
            topic,
            `${topic} statistics data 2024 2025`,
            `${topic} trends analysis`,
            `${topic} criticism problems challenges`,
        ];
    }
}

/* ═══════════════════════════════════════════════════
   DEDUPLICATE by domain
   ═══════════════════════════════════════════════════ */
function deduplicateResults(allResults) {
    const seen = new Map();
    for (const r of allResults) {
        try {
            const domain = new URL(r.link).hostname;
            const key = `${domain}:${r.title.substring(0, 40)}`;
            if (!seen.has(key)) seen.set(key, r);
        } catch {
            seen.set(r.title, r);
        }
    }
    return Array.from(seen.values());
}

/* ═══════════════════════════════════════════════════
   STREAM SYNTHESIS
   ═══════════════════════════════════════════════════ */
function streamSynthesis(searchContext, topic, context, model) {
    const systemPrompt = `You are a world-class research analyst preparing a comprehensive research brief for a blog writer. Your output should be immediately useful for writing. Be detailed, cite specific numbers and data points, and use markdown formatting.

Structure your response as:

## 📊 Key Facts & Data
Hard numbers, statistics, market sizes, growth rates, dates. Be specific — no vague claims.

## 🏢 Major Players & Landscape
Key companies, people, organizations. What each does, their market position, recent moves.

## 📈 Trends & Emerging Patterns
What's changing, why it matters, where things are headed. Include timelines.

## 🔥 Contrarian & Underreported Angles
What most people get wrong, underreported perspectives, surprising insights worth exploring.

## 💡 Quotable Insights
2-3 powerful statements or data points the writer could quote or build arguments around.

## 🔗 Sources
List the most credible sources with brief descriptions and URLs.

Be exhaustive. The writer needs DEPTH, not surface-level summaries.`;

    const userMessage = `Research topic: "${topic}"

${context ? `The writer is currently working on a draft about this. Here's their context:\n${context}\n\n` : ""}Here are the search results from multiple angles to synthesize:

${searchContext}`;

    if (model === "gpt") {
        return openai.chat.completions.create({
            model: "gpt-4.1-mini",
            max_tokens: 4000,
            stream: true,
            messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userMessage },
            ],
        });
    } else {
        return anthropic.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 4000,
            system: systemPrompt,
            messages: [{ role: "user", content: userMessage }],
        });
    }
}

/* ═══════════════════════════════════════════════════
   POST HANDLER
   ═══════════════════════════════════════════════════ */
export async function POST(request) {
    try {
        const { topic, context, model } = await request.json();

        if (!topic) {
            return Response.json({ error: "Missing topic" }, { status: 400 });
        }

        const encoder = new TextEncoder();

        const readable = new ReadableStream({
            async start(controller) {
                try {
                    // Step 1: Send status — generating queries
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ status: "Generating search queries…" })}\n\n`)
                    );

                    const queries = await generateSearchQueries(topic, model || "claude");

                    // Step 2: Send queries to client
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ queries })}\n\n`)
                    );

                    // Step 3: Search all queries in parallel
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ status: `Searching ${queries.length} queries…` })}\n\n`)
                    );

                    const searchPromises = queries.map(q => searchSerper(q).catch(() => []));
                    const allSearchResults = await Promise.all(searchPromises);
                    const flatResults = allSearchResults.flat();
                    const deduped = deduplicateResults(flatResults);

                    // Step 4: Send source count
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ status: `Synthesizing ${deduped.length} sources…`, sourceCount: deduped.length })}\n\n`)
                    );

                    // Step 5: Build search context
                    const searchContext = deduped
                        .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.link}`)
                        .join("\n\n");

                    // Step 6: Stream AI synthesis
                    const stream = await streamSynthesis(searchContext, topic, context, model || "claude");

                    if (model === "gpt") {
                        for await (const chunk of stream) {
                            const text = chunk.choices[0]?.delta?.content;
                            if (text) {
                                controller.enqueue(
                                    encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
                                );
                            }
                        }
                    } else {
                        for await (const event of stream) {
                            if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
                                controller.enqueue(
                                    encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
                                );
                            }
                        }
                    }

                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                } catch (err) {
                    controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ error: err.message })}\n\n`)
                    );
                    controller.close();
                }
            },
        });

        return new Response(readable, {
            headers: {
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                Connection: "keep-alive",
            },
        });
    } catch (err) {
        console.error("Research API error:", err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
