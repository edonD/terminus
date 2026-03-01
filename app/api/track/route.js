import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);

/* ── Lightweight UA parsing (no npm dep) ── */

function parseUA(ua) {
    if (!ua) return {};

    // Device type
    let deviceType = "desktop";
    if (/mobile|android.*mobile|iphone|ipod/i.test(ua)) deviceType = "mobile";
    else if (/tablet|ipad|android(?!.*mobile)/i.test(ua)) deviceType = "tablet";

    // Browser
    let browser = "Other";
    if (/edg\//i.test(ua)) browser = "Edge";
    else if (/opr\/|opera/i.test(ua)) browser = "Opera";
    else if (/firefox\//i.test(ua)) browser = "Firefox";
    else if (/chrome\/.*safari\//i.test(ua)) browser = "Chrome";
    else if (/safari\//i.test(ua) && !/chrome/i.test(ua)) browser = "Safari";

    // OS
    let os = "Other";
    if (/windows/i.test(ua)) os = "Windows";
    else if (/macintosh|mac os/i.test(ua)) os = "macOS";
    else if (/linux/i.test(ua) && !/android/i.test(ua)) os = "Linux";
    else if (/android/i.test(ua)) os = "Android";
    else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";

    return { deviceType, browser, os };
}

function stripReferrer(ref) {
    if (!ref) return undefined;
    try {
        return new URL(ref).hostname.replace(/^www\./, "");
    } catch {
        return undefined;
    }
}

export async function POST(request) {
    try {
        const body = await request.json();
        const { path, slug, postId, referrer, screenWidth, sessionId } = body;

        if (!path || !sessionId) {
            return Response.json({ error: "Missing required fields" }, { status: 400 });
        }

        const ua = request.headers.get("user-agent") || "";
        const { deviceType, browser, os } = parseUA(ua);

        // Country from Vercel header (only available in production)
        const country = request.headers.get("x-vercel-ip-country") || undefined;

        await convex.mutation(api.analytics.trackPageview, {
            path,
            slug: slug || undefined,
            postId: postId || undefined,
            sessionId,
            referrer: stripReferrer(referrer),
            deviceType,
            browser,
            os,
            screenWidth: screenWidth || undefined,
            country,
        });

        return Response.json({ ok: true });
    } catch (e) {
        console.error("Track error:", e);
        return Response.json({ error: "Internal error" }, { status: 500 });
    }
}
