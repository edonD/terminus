import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

/* ═══════════════════════════════════════════════════
   SYSTEM PROMPTS per action
   ═══════════════════════════════════════════════════ */
const SYSTEM_PROMPTS = {
    continue: `You are a world-class blog ghostwriter. Continue the writer's draft seamlessly — match their tone, vocabulary, and sentence rhythm. Write 2-3 paragraphs that feel like a natural extension. Do NOT repeat what they wrote. Do NOT add meta-commentary like "here's a continuation". Just write the continuation directly.`,

    rewrite: `You are a world-class editor. Rewrite the given text to be clearer, more impactful, and more engaging — while preserving the original meaning and the writer's voice. Output ONLY the rewritten text, nothing else.`,

    shorter: `You are a concise editor. Condense the given text to roughly half its length while keeping the essential meaning, key arguments, and the writer's voice. Output ONLY the shortened text, nothing else.`,

    longer: `You are an expert blog writer. Expand the given text with supporting details, examples, analogies, or data points. Add 2-3 paragraphs of depth. Match the writer's tone. Output ONLY the expanded text, nothing else.`,

    outline: `You are a blog strategist. Generate a detailed blog post outline with 5-7 sections. Each section should have a title, a one-line description, and 2-3 bullet points of what to cover. Format using markdown headers and bullets. Be specific and actionable, not generic.`,

    titles: `You are a headline expert who has written for TechCrunch, Wired, and The Verge. Generate exactly 5 compelling, click-worthy blog post titles based on the draft content. Each should take a different angle (contrarian, how-to, provocative question, bold statement, insider perspective). Output ONLY a numbered list 1-5, one title per line, nothing else.`,

    custom: `You are a world-class AI writing assistant embedded in a blog editor called TERMINUS. Help the writer with whatever they ask. Be direct, specific, and useful. Match the tone of their existing draft when generating text. If they ask for edits, output ONLY the edited text. If they ask a question, answer concisely.`,
};

export async function POST(request) {
    try {
        const { action, input, context, customPrompt } = await request.json();

        if (!action) {
            return Response.json({ error: "Missing action" }, { status: 400 });
        }

        const systemPrompt = SYSTEM_PROMPTS[action] || SYSTEM_PROMPTS.custom;

        // Build user message
        let userMessage = "";
        if (action === "custom" && customPrompt) {
            userMessage = customPrompt;
            if (context) userMessage += `\n\n--- FULL DRAFT FOR CONTEXT ---\n${context}`;
            if (input) userMessage += `\n\n--- SELECTED TEXT ---\n${input}`;
        } else if (action === "outline" || action === "titles") {
            userMessage = input
                ? `Topic/Draft: ${input}`
                : context
                    ? `Based on this draft:\n\n${context}`
                    : "Write about technology and startups";
        } else {
            userMessage = input || context || "";
            if (input && context && input !== context) {
                userMessage = `Selected text to work with:\n${input}\n\n--- Full draft for context ---\n${context}`;
            }
        }

        if (!userMessage.trim()) {
            return Response.json({ error: "No input provided" }, { status: 400 });
        }

        // Stream from Claude
        const stream = anthropic.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            system: systemPrompt,
            messages: [{ role: "user", content: userMessage }],
        });

        // Convert to a ReadableStream for the browser
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
                                encoder.encode(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`)
                            );
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
        console.error("AI API error:", err);
        return Response.json({ error: err.message }, { status: 500 });
    }
}
