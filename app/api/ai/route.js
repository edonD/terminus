import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";

const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
});

const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
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
        const { action, input, context, customPrompt, fieldType, fieldContent, chatHistory, model } = await request.json();

        if (!action) {
            return Response.json({ error: "Missing action" }, { status: 400 });
        }

        const systemPrompt = SYSTEM_PROMPTS[action] || SYSTEM_PROMPTS.custom;

        // Build context-aware system addition
        let fieldContext = "";
        if (fieldType) {
            fieldContext = `\n\nYou are currently editing the "${fieldType}" field.`;
            if (fieldType === "title") fieldContext += " Keep output short and headline-worthy — 1 line only unless asked for multiple options.";
            if (fieldType === "subtitle") fieldContext += " Keep output to 1-2 concise sentences suitable for a blog subtitle/description.";
        }

        // Build conversation history context
        let historyContext = "";
        if (chatHistory && chatHistory.length > 0) {
            historyContext = "\n\n--- RECENT CONVERSATION HISTORY ---\n";
            chatHistory.slice(-5).forEach(h => {
                historyContext += `User asked: ${h.prompt}\nAssistant wrote: ${h.response}\n---\n`;
            });
        }

        const fullSystem = systemPrompt + fieldContext + historyContext;

        // Build user message
        let userMessage = "";
        if (action === "custom" && customPrompt) {
            userMessage = customPrompt;
            if (fieldContent) userMessage += `\n\n--- CURRENT FIELD (${fieldType || "text"}) ---\n${fieldContent}`;
            if (context) userMessage += `\n\n--- FULL DOCUMENT (structured) ---\n${context}`;
        } else if (action === "outline" || action === "titles") {
            userMessage = input
                ? `Topic/Draft: ${input}`
                : context
                    ? `Based on this draft:\n\n${context}`
                    : "Write about technology and startups";
        } else {
            userMessage = input || fieldContent || context || "";
            if (input && context && input !== context) {
                userMessage = `Working on: ${fieldType || "text"} field\n\nSelected text to work with:\n${input}\n\n--- Full document (structured) ---\n${context}`;
            }
        }

        if (!userMessage.trim()) {
            return Response.json({ error: "No input provided" }, { status: 400 });
        }

        const encoder = new TextEncoder();

        // ═══ GPT-5-mini path ═══
        if (model === "gpt") {
            const stream = await openai.chat.completions.create({
                model: "gpt-4.1-mini",
                max_tokens: 2048,
                stream: true,
                messages: [
                    { role: "system", content: fullSystem },
                    { role: "user", content: userMessage },
                ],
            });

            const readable = new ReadableStream({
                async start(controller) {
                    try {
                        for await (const chunk of stream) {
                            const text = chunk.choices[0]?.delta?.content;
                            if (text) {
                                controller.enqueue(
                                    encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
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
        }

        // ═══ Claude path (default) ═══
        const stream = anthropic.messages.stream({
            model: "claude-sonnet-4-20250514",
            max_tokens: 2048,
            system: fullSystem,
            messages: [{ role: "user", content: userMessage }],
        });

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
