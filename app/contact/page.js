"use client";

import Link from "next/link";

export default function ContactPage() {
    return (
        <div className="home-shell">
            <header className="home-topbar">
                <Link href="/" className="home-brand">
                    TERMINUS
                </Link>
                <nav className="home-nav">
                    <Link href="/">Essays</Link>
                    <Link href="/contact" className="active">Contact</Link>
                </nav>
            </header>

            <main className="home-main">
                <section style={{ maxWidth: "var(--max-content)", margin: "80px auto", padding: "0 20px" }}>
                    <p className="home-kicker" style={{ marginBottom: "8px" }}>Get in touch</p>
                    <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "2.2rem", fontWeight: 700, marginBottom: "32px" }}>Contact</h1>

                    <ul style={{ listStyle: "none", display: "flex", flexDirection: "column", gap: "20px" }}>
                        <li>
                            <span style={{ display: "block", fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Email</span>
                            <a href="mailto:edonderguti@gmail.com" style={{ color: "var(--accent)", fontFamily: "var(--font-serif)", fontSize: "1.05rem", textDecoration: "none" }}>
                                edonderguti@gmail.com
                            </a>
                        </li>
                        <li>
                            <span style={{ display: "block", fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>Twitter</span>
                            <a href="https://x.com/edon_d" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontFamily: "var(--font-serif)", fontSize: "1.05rem", textDecoration: "none" }}>
                                @edon_d
                            </a>
                        </li>
                        <li>
                            <span style={{ display: "block", fontSize: "0.65rem", fontFamily: "var(--font-mono)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: "4px" }}>GitLab</span>
                            <a href="https://gitlab.com/edonderguti" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", fontFamily: "var(--font-serif)", fontSize: "1.05rem", textDecoration: "none" }}>
                                edonderguti
                            </a>
                        </li>
                    </ul>
                </section>
            </main>

            <footer className="home-footer">
                Set in Playfair Display · Written in Munich · Built with conviction
            </footer>
        </div>
    );
}
