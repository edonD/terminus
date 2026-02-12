import { NextResponse } from "next/server";

const OPENAI_RESPONSES_URL = "https://api.openai.com/v1/responses";

const FIELD_CONTEXT = {
    title: "This is the blog post title. It should be attention-grabbing, concise (under 80 characters), and signal the article's core value. Good titles provoke curiosity or promise a clear takeaway.",
    subtitle: "This is the subtitle/deck. It expands on the title with a compelling hook or thesis statement. Keep it under 160 characters. It should make the reader want to continue.",
    heading: "This is a section heading (H2). It should clearly signal what this section covers. Strong headings are scannable and create a logical narrative arc.",
    "heading-h3": "This is a subsection heading (H3). It should be specific and support the parent H2 section.",
    paragraph: "This is a body paragraph. Good blog paragraphs are concise (2-4 sentences), use active voice, lead with the key point, and support claims with evidence.",
    quote: "This is a blockquote. It should be a memorable, impactful statement that reinforces the article's argument.",
    code: "This is a code block. Ensure the code is correct, well-commented, and relevant to the article's topic.",
};

const ACTIONS = {
    improve: "Improve the writing quality — make it clearer, more engaging, and more polished while keeping the same meaning and length.",
    expand: "Expand this content with more detail, examples, or evidence. Add depth while staying focused on the core idea. Roughly double the length.",
    shorten: "Make this more concise. Remove filler, tighten the prose, keep only the essential meaning. Cut to roughly half the length.",
    grammar: "Fix all grammar, spelling, punctuation, and syntax errors. Do not change the meaning or tone.",
    engaging: "Rewrite to be more engaging and compelling. Use stronger verbs, better rhythm, and more vivid language.",
    professional: "Rewrite in a more professional, authoritative tone suitable for a thought-leadership blog.",
};

export async function POST(req) {
    try {
        const body = await req.json();
        const openAiKey = process.env.OPENAI_API_KEY;
        const model = process.env.COPILOT_MODEL || "gpt-5-mini";

        if (!openAiKey) {
            return NextResponse.json(
                { error: "OPENAI_API_KEY not configured" },
                { status: 500 }
            );
        }

        const fieldType = body?.fieldType || "paragraph";
        const fieldContent = (body?.content || "").trim();
        const action = body?.action || "improve";
        const customPrompt = (body?.customPrompt || "").trim();
        const postTitle = (body?.postTitle || "").trim();
        const postSubtitle = (body?.postSubtitle || "").trim();
        const surroundingContext = (body?.surroundingContext || "").trim();

        if (!fieldContent && !customPrompt) {
            return NextResponse.json(
                { error: "Content or custom prompt is required" },
                { status: 400 }
            );
        }

        const fieldHint = FIELD_CONTEXT[fieldType] || FIELD_CONTEXT.paragraph;
        const actionInstruction = customPrompt || ACTIONS[action] || ACTIONS.improve;

        const systemPrompt = `You are an expert blog editor and writing copilot. You help writers improve their blog content field by field.

Your rules:
- Return ONLY the improved text — no explanations, no quotes, no markdown wrappers
- Preserve the original language (if it's in English, respond in English)
- Maintain the author's voice and style
- Be direct and concise`;

        const userPrompt = `## Blog Post Context
Title: "${postTitle || "(untitled)"}"
Subtitle: "${postSubtitle || "(no subtitle)"}"
${surroundingContext ? `\nSurrounding content:\n${surroundingContext}\n` : ""}

## Field Being Edited
Type: ${fieldType}
Role: ${fieldHint}

## Current Content
${fieldContent || "(empty — generate appropriate content based on context)"}

## Instruction
${actionInstruction}

Return ONLY the improved text. No explanations.`;

        const response = await fetch(OPENAI_RESPONSES_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${openAiKey}`,
            },
            body: JSON.stringify({
                model,
                input: [
                    { role: "developer", content: systemPrompt },
                    { role: "user", content: userPrompt },
                ],
                temperature: 0.4,
            }),
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            return NextResponse.json(
                { error: `OpenAI request failed (${response.status})`, details: errData },
                { status: 502 }
            );
        }

        const data = await response.json();
        const result =
            (data?.output_text || "").trim() ||
            (data?.choices?.[0]?.message?.content || "").trim();

        if (!result) {
            return NextResponse.json(
                { error: "Empty response from OpenAI" },
                { status: 502 }
            );
        }

        return NextResponse.json({
            ok: true,
            result,
            action: customPrompt ? "custom" : action,
            fieldType,
            model,
        });
    } catch (error) {
        return NextResponse.json(
            { error: "Copilot failed", details: error?.message || "Unknown error" },
            { status: 500 }
        );
    }
}
