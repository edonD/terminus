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
                color: "#7a8fa6",
                fontSize: "0.78rem",
                background: "#050608",
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
                color: "#7a8fa6",
                fontSize: "0.78rem",
                background: "#050608",
            }}>
                <span style={{ color: "#57f1d2", fontSize: "1.2rem" }}>◉</span>
                <span>TERMINUS — Access Restricted</span>
                <span style={{ fontSize: "0.62rem", color: "#3a4f65" }}>
                    This area is for the blog owner only.
                </span>
                <Link href="/" style={{
                    marginTop: "12px",
                    padding: "8px 18px",
                    border: "1px solid #2a3f52",
                    borderRadius: "6px",
                    color: "#57f1d2",
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
