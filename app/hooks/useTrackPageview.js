"use client";

import { useEffect, useRef } from "react";

function getSessionId() {
    if (typeof window === "undefined") return "";
    let sid = sessionStorage.getItem("terminus_sid");
    if (!sid) {
        sid = Math.random().toString(36).slice(2) + Date.now().toString(36);
        sessionStorage.setItem("terminus_sid", sid);
    }
    return sid;
}

/**
 * Fire-and-forget pageview tracking.
 * @param {{ path: string, slug?: string, postId?: string, ready?: boolean }} opts
 *   - `ready` gates the fire until data has loaded (default true)
 */
export function useTrackPageview({ path, slug, postId, ready = true }) {
    const fired = useRef(false);

    useEffect(() => {
        if (!ready || fired.current) return;
        fired.current = true;

        const sessionId = getSessionId();
        if (!sessionId) return;

        fetch("/api/track", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                path,
                slug,
                postId,
                referrer: document.referrer || undefined,
                screenWidth: window.innerWidth,
                sessionId,
            }),
        }).catch(() => {});
    }, [ready, path, slug, postId]);
}
