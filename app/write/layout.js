"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";

/* ═══════════════════════════════════════════════════
   SECRET AUTH — Only you can access the writer tools
   ═══════════════════════════════════════════════════ */
const OWNER_SECRET = "f0efaeb40c9b6e89106e378bc29ce6362c89283ef86f156ef9fc6b0284841cea";

export default function WriteLayout({ children }) {
    const pathname = usePathname();
    const [authorized, setAuthorized] = useState(null);

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const secret = params.get("secret");
        if (secret === OWNER_SECRET) {
            sessionStorage.setItem("terminus_auth", "true");
            setAuthorized(true);
        } else if (sessionStorage.getItem("terminus_auth") === "true") {
            setAuthorized(true);
        } else {
            setAuthorized(false);
        }
    }, []);

    if (authorized === null) {
        return (
            <div style={{
                minHeight: "100vh",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-mono, monospace)",
                color: "var(--muted, #8a7e6b)",
                fontSize: "0.78rem",
                background: "var(--bg-0, #f5f0e8)",
            }}>
                Authenticating…
            </div>
        );
    }

    if (!authorized) {
        return (
            <div style={{
                minHeight: "100vh",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "16px",
                fontFamily: "var(--font-mono, monospace)",
                color: "var(--muted, #8a7e6b)",
                fontSize: "0.78rem",
                background: "var(--bg-0, #f5f0e8)",
            }}>
                <span style={{ color: "var(--accent, #c47a2a)", fontSize: "1.2rem" }}>◉</span>
                <span>TERMINUS — Access Restricted</span>
                <span style={{ fontSize: "0.62rem", color: "var(--line-strong, #c4b9a3)" }}>
                    This area is for the blog owner only.
                </span>
                <Link href="/" style={{
                    marginTop: "12px",
                    padding: "8px 18px",
                    border: "1px solid var(--line, #d4cbb8)",
                    borderRadius: "6px",
                    color: "var(--accent, #c47a2a)",
                    fontSize: "0.68rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.06em",
                    textDecoration: "none",
                }}>
                    ← Back to Blog
                </Link>
            </div>
        );
    }

    return children;
}
