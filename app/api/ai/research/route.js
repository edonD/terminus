import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

/* ═══════════════════════════════════════════════════
   RESEARCH: Serper search → Claude synthesis
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

    if (!res.ok) {
        throw new Error(`Serper API error: ${res.status}`);
    }

    const data = await res.json();
    const results = [];

    // Organic results
    if (data.organic) {
        data.organic.forEach((r) => {
            results.push({
                title: r.title,
                snippet: r.snippet,
                link: r.link,
            });
        });
    }

    // Knowledge graph
    if (data.knowledgeGraph) {
        results.push({
            title: data.knowledgeGraph.title || "Knowledge Graph",
            snippet: data.knowledgeGraph.description || "",
            link: data.knowledgeGraph.website || "",
        });
    }

    return results;
}

export async function POST(request) {
    try {
        const { topic, context } = await request.json();

        if (!topic) {
            return Response.json({ error: "Missing topic" }, { status: 400 });
        }

        // Step 1: Search the web
        const searchResults = await searchSerper(topic);

        const searchContext = searchResults
            .map((r, i) => `[${i + 1}] ${r.title}\n${r.snippet}\nSource: ${r.link}`)
            .join("\n\n");

        // Step 2: Stream Claude synthesis
        const systemPrompt = `You are a research assistant for a blog writer. Synthesize the provided search results into a structured research brief suitable for a blog post. Include:

1. **Key Facts & Statistics** — Numbers, market sizes, dates
2. **Major Players** — Companies, people, organizations involved
3. **Trends & Insights** — What's changing and why
4. **Contrarian Takes** — Underreported angles worth exploring
5. **Sources** — List the most credible sources with their URLs

Be specific, cite numbers, and use markdown formatting. The writer will use this to inform their blog post.`;

        const userMessage = `Research topic: "${topic}"

${context ? `Writer's draft context:\n${context}\n\n` : ""}Search results to synthesize:

${searchContext}`;

        const stream = anthropic.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 3000,
            system: systemPrompt,
            messages: [{ role: "user", content: userMessage }],
        });

        const encoder = new TextEncoder();
        const readable = new ReadableStream({
            async start(controller) {
                try {
                    for await (const event of stream) {
                        if (
                            event.type === "content_block_delta" &&
                            event.delta?.type === "text_delta"
                        ) {
                            controller.enqueue(
                                encoder.encode(
                                    `data: ${JSON.stringify({ text: event.delta.text })}\n\n`
                                )
                            );
                        }
                    }
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    controller.close();
                } catch (err) {
                    controller.enqueue(
                        encoder.encode(
                            `data: ${JSON.stringify({ error: err.message })}\n\n`
                        )
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
