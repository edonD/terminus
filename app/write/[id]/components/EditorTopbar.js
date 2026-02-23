"use client";
import Link from "next/link";

export default function EditorTopbar({
    saveStatus,
    focusMode, setFocusMode,
    showOutline, setShowOutline,
    onResearchOpen,
    onGenerateTitles,
    onCmdOpen,
    onSave,
}) {
    return (
        <div className="editor-topbar">
            <div className="editor-topbar-left">
                <Link href="/write">← Dashboard</Link>
                <span className="editor-status">
                    {saveStatus === "saved" ? <span className="saved">● Saved</span> :
                        saveStatus === "saving" ? "Saving…" : "● Unsaved"}
                </span>
            </div>
            <div className="editor-topbar-right">
                <button className="btn btn-ghost btn-sm" onClick={() => setFocusMode(f => !f)}>
                    {focusMode ? "◉ Focus ON" : "○ Focus"}
                </button>
                <button className="btn btn-ghost btn-sm" onClick={() => setShowOutline(o => !o)}>
                    ◱ Architect
                </button>
                <button className="btn btn-ghost btn-sm" onClick={onResearchOpen}>
                    🔍 Research
                </button>
                <button className="btn btn-ghost btn-sm" onClick={onGenerateTitles} title="⌘T">
                    ✦ Titles
                </button>
                <button className="btn btn-ghost btn-sm" onClick={onCmdOpen}>
                    ⌘K
                </button>
                <button className="btn btn-primary btn-sm" onClick={onSave}>
                    Publish
                </button>
            </div>
        </div>
    );
}
