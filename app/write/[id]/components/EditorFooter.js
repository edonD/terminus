"use client";

export default function EditorFooter({ wordCount, readTime, charCount, detectedTone, seoScore }) {
    return (
        <div className="editor-footer">
            <div className="editor-footer-stats">
                <span>{wordCount} words</span>
                <span>{readTime} read</span>
                <span>{charCount} chars</span>
            </div>
            <div className="editor-footer-indicators">
                <div className="tone-badge">
                    <span className="dot" />
                    {detectedTone}
                </div>
                <div className="seo-gauge">
                    SEO
                    <div className="seo-gauge-bar">
                        <div className="seo-gauge-fill" style={{ width: `${seoScore}%` }} />
                    </div>
                    {seoScore}
                </div>
            </div>
        </div>
    );
}
