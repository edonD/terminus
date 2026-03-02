"use client";

import { useMemo, useState, useCallback, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import CommandBar from "./components/CommandBar";
import TitleGenModal from "./components/TitleGenModal";
import ResearchPanel from "./components/ResearchPanel";
import ArchitectPanel from "./components/ArchitectPanel";
import EditorTopbar from "./components/EditorTopbar";
import EditorFooter from "./components/EditorFooter";

/* ═══════════════════════════════════════════════════
   TONE & SLASH COMMAND DEFINITIONS
   ═══════════════════════════════════════════════════ */
const SLASH_COMMANDS = [
    // Basic blocks
    { cmd: "/text", label: "Text", icon: "¶", type: "paragraph", desc: "Plain text block", category: "basic" },
    { cmd: "/h1", label: "Heading 1", icon: "H1", type: "heading", desc: "Large section heading", category: "basic" },
    { cmd: "/h2", label: "Heading 2", icon: "H2", type: "heading-h3", desc: "Medium section heading", category: "basic" },
    { cmd: "/h3", label: "Heading 3", icon: "H3", type: "heading-h4", desc: "Small section heading", category: "basic" },
    { cmd: "/bullet", label: "Bulleted List", icon: "•", type: "bullet-list", desc: "Unordered list item", category: "basic" },
    { cmd: "/number", label: "Numbered List", icon: "1.", type: "number-list", desc: "Ordered list item", category: "basic" },
    { cmd: "/todo", label: "To-do", icon: "☐", type: "todo", desc: "Checkbox task item", category: "basic" },
    { cmd: "/toggle", label: "Toggle", icon: "▸", type: "toggle", desc: "Collapsible content section", category: "basic" },
    { cmd: "/quote", label: "Blockquote", icon: "❝", type: "quote", desc: "Highlighted quote block", category: "basic" },
    { cmd: "/callout", label: "Callout", icon: "💡", type: "callout", desc: "Highlighted info box", category: "basic" },
    { cmd: "/code", label: "Code Block", icon: "</>", type: "code", desc: "Syntax-highlighted code", category: "basic" },
    { cmd: "/divider", label: "Divider", icon: "—", type: "divider", desc: "Horizontal separator line", category: "basic" },
    // Media
    { cmd: "/image", label: "Image", icon: "▣", type: "image", desc: "Embed an image from URL", category: "media" },
    // AI
    { cmd: "/ai", label: "AI Co-Pilot", icon: "✦", type: "ai", desc: "Open AI assistant panel", category: "ai" },
    { cmd: "/ai continue", label: "Continue writing", icon: "✦", action: "continue", desc: "AI continues your text", category: "ai" },
    { cmd: "/ai rewrite", label: "Rewrite selection", icon: "✦", action: "rewrite", desc: "Rephrase current block", category: "ai" },
    { cmd: "/ai shorter", label: "Make shorter", icon: "✦", action: "shorter", desc: "Condense the text", category: "ai" },
    { cmd: "/ai longer", label: "Expand", icon: "✦", action: "longer", desc: "Elaborate with more detail", category: "ai" },
    { cmd: "/ai outline", label: "Generate outline", icon: "✦", action: "outline", desc: "Create a post outline", category: "ai" },
    { cmd: "/ai titles", label: "Suggest titles", icon: "✦", action: "titles", desc: "Generate title ideas", category: "ai" },
    { cmd: "/ai research", label: "Deep research", icon: "✦", action: "research", desc: "Research a topic in depth", category: "ai" },
];

const SLASH_CATEGORIES = [
    { key: "basic", label: "Basic Blocks" },
    { key: "media", label: "Media" },
    { key: "ai", label: "AI Commands" },
];

const DEFAULT_METADATA = {
    "todo": { checked: false },
    "toggle": { expanded: false, body: "" },
    "callout": { emoji: "💡" },
};

/* ═══════════════════════════════════════════════════
   STREAMING HELPER — calls /api/ai or /api/ai/research
   and progressively returns text via a callback
   ═══════════════════════════════════════════════════ */
async function streamAI({ action, input, context, customPrompt, fieldType, fieldContent, chatHistory, model, onChunk, onDone, onError }) {
    const isResearch = action === "research";
    const url = isResearch ? "/api/ai/research" : "/api/ai";
    const body = isResearch
        ? { topic: input || context, context }
        : { action, input, context, customPrompt, fieldType, fieldContent, chatHistory, model };

    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });

        if (!res.ok) {
            const err = await res.json().catch(() => ({ error: "Unknown error" }));
            onError(err.error || `HTTP ${res.status}`);
            return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
                if (line.startsWith("data: ")) {
                    const payload = line.slice(6).trim();
                    if (payload === "[DONE]") {
                        onDone();
                        return;
                    }
                    try {
                        const data = JSON.parse(payload);
                        if (data.error) {
                            onError(data.error);
                            return;
                        }
                        if (data.text) {
                            onChunk(data.text);
                        }
                    } catch { /* skip non-JSON lines */ }
                }
            }
        }
        onDone();
    } catch (err) {
        onError(err.message);
    }
}

/* ═══════════════════════════════════════════════════
   EDITOR PAGE COMPONENT
   ═══════════════════════════════════════════════════ */
export default function EditorPage({ params }) {
    const resolvedParams = use(params);
    const isNew = resolvedParams.id === "new";

    // Convex mutations
    const createPost = useMutation(api.posts.create);
    const updatePost = useMutation(api.posts.update);

    // Load existing post data
    const existingPost = useQuery(api.posts.getById, isNew ? "skip" : { id: resolvedParams.id });

    const [title, setTitle] = useState("");
    const [subtitle, setSubtitle] = useState("");
    const [blocks, setBlocks] = useState([{ id: "b1", type: "paragraph", content: "" }]);
    const [postLoaded, setPostLoaded] = useState(isNew);

    // Load existing post data into state when it arrives
    useEffect(() => {
        if (!isNew && existingPost && !postLoaded) {
            setTitle(existingPost.title || "");
            setSubtitle(existingPost.subtitle || "");
            if (existingPost.blocks && existingPost.blocks.length > 0) {
                setBlocks(existingPost.blocks);
            }
            setPostLoaded(true);
            setSaveStatus("saved");
            // Initialize undo history with loaded state
            const loadedBlocks = (existingPost.blocks && existingPost.blocks.length > 0) ? existingPost.blocks : [{ id: "b1", type: "paragraph", content: "" }];
            historyRef.current = { stack: [{ blocks: JSON.parse(JSON.stringify(loadedBlocks)), title: existingPost.title || "", subtitle: existingPost.subtitle || "" }], index: 0, isUndoRedo: false };
        }
    }, [existingPost, isNew, postLoaded]);

    const [focusMode, setFocusMode] = useState(false);
    const [showBorders, setShowBorders] = useState(false);
    const [activeBlockId, setActiveBlockId] = useState(null);
    const [slashMenu, setSlashMenu] = useState(null);
    const [slashFilter, setSlashFilter] = useState("");
    const [slashIndex, setSlashIndex] = useState(0);
    const [aiGeneratingBlockId, setAiGeneratingBlockId] = useState(null);
    const [aiPromptBlockId, setAiPromptBlockId] = useState(null);
    const [aiPromptValue, setAiPromptValue] = useState("");
    const [showTitleGen, setShowTitleGen] = useState(false);
    const [titleSuggestions, setTitleSuggestions] = useState([]);
    const [titlesLoading, setTitlesLoading] = useState(false);
    const [cmdOpen, setCmdOpen] = useState(false);
    const [saveStatus, setSaveStatus] = useState("saved");
    const [dragId, setDragId] = useState(null);
    const [researchOpen, setResearchOpen] = useState(false);
    const [researchMode, setResearchMode] = useState("deep"); // "quick" | "deep"
    const [researchTopic, setResearchTopic] = useState("");
    const [researchResult, setResearchResult] = useState("");
    const [researchStreaming, setResearchStreaming] = useState("");
    const [researchLoading, setResearchLoading] = useState(false);
    const [researchQueries, setResearchQueries] = useState([]);
    const [researchStatus, setResearchStatus] = useState("");
    const [researchSources, setResearchSources] = useState(0);

    // Ghost Text Phase 2
    const [ghostText, setGhostText] = useState("");
    const [isGhosting, setIsGhosting] = useState(false);
    const ghostDebounceRef = useRef(null);

    // Mobile typewriter mode
    const [isMobile, setIsMobile] = useState(false);
    const [topbarHidden, setTopbarHidden] = useState(false);
    const lastScrollY = useRef(0);
    const [keyboardPadding, setKeyboardPadding] = useState(0);

    // Inline formatting
    const [formatToolbar, setFormatToolbar] = useState(null); // { top, left, blockId }
    const [selectionRange, setSelectionRange] = useState(null); // { start, end }

    // Architect Phase 3
    const [showOutline, setShowOutline] = useState(false);

    const blockRefs = useRef({});
    const historyRef = useRef({ stack: [], index: -1, isUndoRedo: false });
    const slashMenuRef = useRef(slashMenu);

    // Keep refs in sync for keyboard shortcuts
    useEffect(() => { slashMenuRef.current = slashMenu; }, [slashMenu]);

    // Focus Mode (Hemingway) Side Effects & Architect Body Class
    useEffect(() => {
        if (focusMode) {
            document.body.classList.add("focus-mode-active");
        } else {
            document.body.classList.remove("focus-mode-active");
        }

        if (showOutline) {
            document.body.classList.add("architect-open");
        } else {
            document.body.classList.remove("architect-open");
        }

        return () => {
            document.body.classList.remove("focus-mode-active");
            document.body.classList.remove("architect-open");
        }
    }, [focusMode, showOutline]);

    // Mobile detection
    useEffect(() => {
        const mq = window.matchMedia("(max-width: 680px)");
        const update = () => setIsMobile(mq.matches);
        update();
        mq.addEventListener("change", update);
        return () => mq.removeEventListener("change", update);
    }, []);

    // Mobile: keyboard-aware bottom padding via visualViewport
    useEffect(() => {
        if (!isMobile || !window.visualViewport) return;
        const vv = window.visualViewport;
        const onResize = () => {
            const keyboardHeight = window.innerHeight - vv.height;
            setKeyboardPadding(keyboardHeight > 50 ? keyboardHeight : 0);
        };
        vv.addEventListener("resize", onResize);
        return () => vv.removeEventListener("resize", onResize);
    }, [isMobile]);

    // Mobile: auto-hide topbar on scroll down, show on scroll up
    useEffect(() => {
        if (!isMobile) { setTopbarHidden(false); return; }
        const onScroll = () => {
            const y = window.scrollY;
            if (y > lastScrollY.current + 10) setTopbarHidden(true);
            else if (y < lastScrollY.current - 10) setTopbarHidden(false);
            lastScrollY.current = y;
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        return () => window.removeEventListener("scroll", onScroll);
    }, [isMobile]);

    // Typewriter Scrolling
    useEffect(() => {
        if (activeBlockId && blockRefs.current[activeBlockId]) {
            const el = blockRefs.current[activeBlockId];
            if (isMobile && window.visualViewport) {
                // Wait for soft keyboard to finish opening, then position block in top third
                setTimeout(() => {
                    if (!blockRefs.current[activeBlockId]) return;
                    const vv = window.visualViewport;
                    const rect = el.getBoundingClientRect();
                    const targetY = vv.height * 0.3;
                    const scrollBy = rect.top - targetY;
                    window.scrollBy({ top: scrollBy, behavior: "smooth" });
                }, 350);
            } else {
                // Desktop: slight delay then center
                setTimeout(() => {
                    if (blockRefs.current[activeBlockId]) {
                        blockRefs.current[activeBlockId].scrollIntoView({
                            behavior: "smooth",
                            block: "center",
                        });
                    }
                }, 50);
            }
        }
    }, [activeBlockId, isMobile]);

    // Auto-grow all textareas on mount / block changes
    useEffect(() => {
        Object.values(blockRefs.current).forEach(el => {
            if (el && el.tagName === "TEXTAREA") {
                el.style.height = "auto";
                el.style.height = el.scrollHeight + "px";
            }
        });
    }, [blocks]);

    // Global keyboard shortcuts
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(o => !o); }
            if ((e.metaKey || e.ctrlKey) && e.key === "t") { e.preventDefault(); generateTitles(); }
            if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave("draft"); }
            if ((e.metaKey || e.ctrlKey) && e.key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
            if ((e.metaKey || e.ctrlKey) && e.key === "z" && e.shiftKey) { e.preventDefault(); redo(); }
            if ((e.metaKey || e.ctrlKey) && e.key === "y") { e.preventDefault(); redo(); }
            if (e.key === "Escape") {
                setAiPromptBlockId(null);
                setAiPromptValue("");
                // slashMenu ESC is handled at the block level in handleBlockKeyDown
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

    // Dismiss format toolbar on click outside
    useEffect(() => {
        if (!formatToolbar) return;
        const dismiss = () => setFormatToolbar(null);
        const timer = setTimeout(() => document.addEventListener("mousedown", dismiss), 50);
        return () => { clearTimeout(timer); document.removeEventListener("mousedown", dismiss); };
    }, [formatToolbar]);

    const getWordCount = useCallback(() => {
        const text = [title, subtitle, ...blocks.map(b => b.content)].join(" ");
        return text.split(/\s+/).filter(Boolean).length;
    }, [title, subtitle, blocks]);

    const getCharCount = useCallback(() => {
        return [title, subtitle, ...blocks.map(b => b.content)].join("").length;
    }, [title, subtitle, blocks]);

    const getReadTime = useCallback(() => {
        const words = getWordCount();
        const mins = Math.max(1, Math.ceil(words / 250));
        return `${mins} min`;
    }, [getWordCount]);

    const getReadability = useCallback(() => {
        const text = [title, subtitle, ...blocks.map(b => b.content)].join(" ").trim();
        const words = text.split(/\s+/).filter(Boolean);
        if (words.length < 10) return { score: 0, label: "Too short" };
        const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const syllableCount = (word) => {
            word = word.toLowerCase().replace(/[^a-z]/g, "");
            if (word.length <= 3) return 1;
            word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "");
            word = word.replace(/^y/, "");
            const vowelGroups = word.match(/[aeiouy]{1,2}/g);
            return vowelGroups ? vowelGroups.length : 1;
        };
        const totalSyllables = words.reduce((sum, w) => sum + syllableCount(w), 0);
        const grade = 0.39 * (words.length / sentences.length) + 11.8 * (totalSyllables / words.length) - 15.59;
        const rounded = Math.max(1, Math.round(grade));
        let label;
        if (rounded <= 5) label = "Very Easy";
        else if (rounded <= 12) label = `Grade ${rounded}`;
        else if (rounded <= 16) label = "College";
        else label = "Graduate";
        return { score: rounded, label };
    }, [title, subtitle, blocks]);

    const getDraftContext = useCallback(() => {
        return [title, subtitle, ...blocks.map(b => b.content)].filter(Boolean).join("\n\n");
    }, [title, subtitle, blocks]);

    // Build structured doc context with field labels
    const getStructuredContext = useCallback(() => {
        const parts = [];
        if (title) parts.push(`[TITLE]: ${title}`);
        if (subtitle) parts.push(`[SUBTITLE]: ${subtitle}`);
        blocks.forEach((b, i) => {
            if (b.content) parts.push(`[${b.type.toUpperCase()} block ${i + 1}]: ${b.content}`);
        });
        return parts.join("\n");
    }, [title, subtitle, blocks]);

    // Get the field type label for current AI target
    const getFieldType = useCallback((blockId) => {
        if (blockId === "__title__") return "title";
        if (blockId === "__subtitle__") return "subtitle";
        const block = blocks.find(b => b.id === blockId);
        return block?.type || "paragraph";
    }, [blocks]);

    // Get field content for AI target
    const getFieldContent = useCallback((blockId) => {
        if (blockId === "__title__") return title;
        if (blockId === "__subtitle__") return subtitle;
        const block = blocks.find(b => b.id === blockId);
        return block?.content || "";
    }, [title, subtitle, blocks]);

    const wrapLists = (lines) => {
        const result = [];
        let i = 0;
        while (i < lines.length) {
            if (lines[i].startsWith('<li class="bullet">')) {
                const group = [];
                while (i < lines.length && lines[i].startsWith('<li class="bullet">')) {
                    group.push(lines[i]);
                    i++;
                }
                result.push(`<ul>${group.join("\n")}</ul>`);
            } else if (lines[i].startsWith('<li class="numbered">')) {
                const group = [];
                while (i < lines.length && lines[i].startsWith('<li class="numbered">')) {
                    group.push(lines[i]);
                    i++;
                }
                result.push(`<ol>${group.join("\n")}</ol>`);
            } else {
                result.push(lines[i]);
                i++;
            }
        }
        return result;
    };

    const handleSave = async (status = "draft") => {
        if (!title.trim()) {
            alert("Please add a title before saving.");
            return;
        }
        setSaveStatus("saving");
        try {
            const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
            const wordCount = getWordCount();
            const readTime = getReadTime();
            const excerpt = subtitle || blocks.find(b => b.content?.trim())?.content?.substring(0, 200) || "";
            const rawLines = blocks
                .map(b => {
                    const fmt = (text) => parseInlineMarkdown(text);
                    if (b.type === "heading") return `<h2>${fmt(b.content)}</h2>`;
                    if (b.type === "heading-h3") return `<h3>${fmt(b.content)}</h3>`;
                    if (b.type === "heading-h4") return `<h4>${fmt(b.content)}</h4>`;
                    if (b.type === "quote") return `<blockquote>${fmt(b.content)}</blockquote>`;
                    if (b.type === "code") return `<pre><code>${b.content}</code></pre>`;
                    if (b.type === "divider") return `<hr />`;
                    if (b.type === "bullet-list") return `<li class="bullet">${fmt(b.content)}</li>`;
                    if (b.type === "number-list") return `<li class="numbered">${fmt(b.content)}</li>`;
                    if (b.type === "todo") return `<div class="todo-item${b.metadata?.checked ? " checked" : ""}"><span class="todo-checkbox">${b.metadata?.checked ? "☑" : "☐"}</span>${fmt(b.content)}</div>`;
                    if (b.type === "toggle") return `<details${b.metadata?.expanded ? " open" : ""}><summary>${fmt(b.content)}</summary>${b.metadata?.body || ""}</details>`;
                    if (b.type === "callout") return `<div class="callout"><span class="callout-emoji">${b.metadata?.emoji || "💡"}</span><span>${fmt(b.content)}</span></div>`;
                    if (b.type === "image") return b.content ? `<figure><img src="${b.content}" alt="" />${b.metadata?.caption ? `<figcaption>${b.metadata.caption}</figcaption>` : ""}</figure>` : "";
                    return `<p>${fmt(b.content)}</p>`;
                })
                .filter(Boolean);
            // Wrap consecutive <li> items in <ul> or <ol>
            const content = wrapLists(rawLines).join("\n");
            const today = new Date();
            const date = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, "0")}.${String(today.getDate()).padStart(2, "0")}`;

            if (isNew) {
                await createPost({
                    slug,
                    title: title.trim(),
                    subtitle: subtitle.trim() || undefined,
                    excerpt,
                    content,
                    date,
                    readTime,
                    wordCount,
                    tags: [],
                    status,
                    views: 0,
                    blocks,
                });
            } else {
                await updatePost({
                    id: resolvedParams.id,
                    slug,
                    title: title.trim(),
                    subtitle: subtitle.trim() || undefined,
                    excerpt,
                    content,
                    date: existingPost?.date || date,
                    readTime,
                    wordCount,
                    status,
                    blocks,
                });
            }
            setSaveStatus("saved");
        } catch (err) {
            console.error("Publish failed:", err);
            setSaveStatus("unsaved");
            alert("Publish failed: " + err.message);
        }
    };

    // Undo/Redo history
    const pushHistory = useCallback((blocksSnapshot, titleSnap, subtitleSnap) => {
        const h = historyRef.current;
        if (h.isUndoRedo) return;
        const snapshot = { blocks: JSON.parse(JSON.stringify(blocksSnapshot)), title: titleSnap, subtitle: subtitleSnap };
        h.stack = h.stack.slice(0, h.index + 1);
        h.stack.push(snapshot);
        if (h.stack.length > 50) h.stack.shift();
        h.index = h.stack.length - 1;
    }, []);

    const setBlocksWithHistory = useCallback((updater) => {
        setBlocks(prev => {
            pushHistory(prev, title, subtitle);
            return typeof updater === "function" ? updater(prev) : updater;
        });
        setSaveStatus("unsaved");
    }, [pushHistory, title, subtitle]);

    const undo = useCallback(() => {
        const h = historyRef.current;
        if (h.index <= 0) return;
        h.isUndoRedo = true;
        h.index--;
        const snapshot = h.stack[h.index];
        setBlocks(snapshot.blocks);
        setTitle(snapshot.title);
        setSubtitle(snapshot.subtitle);
        setSaveStatus("unsaved");
        h.isUndoRedo = false;
    }, []);

    const redo = useCallback(() => {
        const h = historyRef.current;
        if (h.index >= h.stack.length - 1) return;
        h.isUndoRedo = true;
        h.index++;
        const snapshot = h.stack[h.index];
        setBlocks(snapshot.blocks);
        setTitle(snapshot.title);
        setSubtitle(snapshot.subtitle);
        setSaveStatus("unsaved");
        h.isUndoRedo = false;
    }, []);

    // Block operations
    const updateBlock = (id, content) => {
        setBlocksWithHistory(prev => prev.map(b => b.id === id ? { ...b, content } : b));
    };

    const addBlockAfter = (afterId, type = "paragraph", content = "", metadata = undefined) => {
        const newId = `b${Date.now()}`;
        const meta = metadata || DEFAULT_METADATA[type] || undefined;
        setBlocksWithHistory(prev => {
            const idx = prev.findIndex(b => b.id === afterId);
            const newBlocks = [...prev];
            const newBlock = { id: newId, type, content };
            if (meta) newBlock.metadata = { ...meta };
            newBlocks.splice(idx + 1, 0, newBlock);
            return newBlocks;
        });
        setTimeout(() => {
            if (blockRefs.current[newId]) blockRefs.current[newId].focus();
        }, 50);
        return newId;
    };

    const deleteBlock = (id) => {
        if (blocks.length <= 1) {
            setBlocksWithHistory(() => [{ id: `b${Date.now()}`, type: "paragraph", content: "" }]);
            return;
        }
        const idx = blocks.findIndex(b => b.id === id);
        setBlocksWithHistory(prev => prev.filter(b => b.id !== id));
        const prevBlock = blocks[idx - 1];
        if (prevBlock && blockRefs.current[prevBlock.id]) {
            blockRefs.current[prevBlock.id].focus();
        }
    };

    // Block metadata helpers
    const updateBlockMetadata = (blockId, updates) => {
        setBlocksWithHistory(prev => prev.map(b =>
            b.id === blockId ? { ...b, metadata: { ...(b.metadata || {}), ...updates } } : b
        ));
    };

    const toggleTodoCheck = (blockId) => {
        setBlocksWithHistory(prev => prev.map(b =>
            b.id === blockId ? { ...b, metadata: { ...(b.metadata || {}), checked: !(b.metadata?.checked) } } : b
        ));
    };

    const toggleToggleExpand = (blockId) => {
        setBlocksWithHistory(prev => prev.map(b =>
            b.id === blockId ? { ...b, metadata: { ...(b.metadata || {}), expanded: !(b.metadata?.expanded) } } : b
        ));
    };

    const getListNumber = (blockId) => {
        let count = 1;
        for (const b of blocks) {
            if (b.id === blockId) break;
            if (b.type === "number-list") count++;
            else count = 1;
        }
        return count;
    };

    const getGroupedSlashCommands = () => {
        const filtered = getFilteredSlashCommands();
        const groups = [];
        for (const cat of SLASH_CATEGORIES) {
            const items = filtered.filter(c => c.category === cat.key);
            if (items.length > 0) groups.push({ ...cat, items });
        }
        return groups;
    };

    const convertBlockType = (blockId, newType) => {
        const meta = DEFAULT_METADATA[newType] || undefined;
        setBlocksWithHistory(prev => prev.map(b =>
            b.id === blockId ? { ...b, type: newType, content: "", metadata: meta ? { ...meta } : undefined } : b
        ));
    };

    // Handle block key events
    // Accept ghost text (shared by Tab key and mobile tap)
    const acceptGhostText = (blockId) => {
        const block = blocks.find(b => b.id === blockId);
        if (!block || !ghostText) return;
        updateBlock(blockId, block.content + ghostText);
        setGhostText("");
        setIsGhosting(false);
    };

    const handleBlockKeyDown = (e, block) => {
        // Slash menu navigation (only intercept specific keys)
        if (slashMenu) {
            const items = getFilteredSlashCommands();
            if (e.key === "ArrowDown") { e.preventDefault(); setSlashIndex(i => Math.min(i + 1, items.length - 1)); return; }
            if (e.key === "ArrowUp") { e.preventDefault(); setSlashIndex(i => Math.max(i - 1, 0)); return; }
            if (e.key === "Enter" && items[slashIndex]) {
                e.preventDefault();
                executeSlashCommand(items[slashIndex], block.id);
                return;
            }
            if (e.key === "Escape") {
                e.preventDefault();
                setSlashMenu(null);
                setSlashFilter("");
                return;
            }
            // All other keys (typing, Backspace, etc.) fall through to native behavior
            // handleBlockInput (onChange) manages opening/closing the menu based on content
        }

        // Inline formatting shortcuts
        if ((e.metaKey || e.ctrlKey) && block.type !== "code") {
            const el = e.target;
            const hasSelection = el.selectionStart !== el.selectionEnd;
            if (e.key === "b" && hasSelection) {
                e.preventDefault();
                setSelectionRange({ start: el.selectionStart, end: el.selectionEnd });
                setFormatToolbar({ blockId: block.id });
                applyFormat("**");
                return;
            }
            if (e.key === "i" && hasSelection) {
                e.preventDefault();
                setSelectionRange({ start: el.selectionStart, end: el.selectionEnd });
                setFormatToolbar({ blockId: block.id });
                applyFormat("*");
                return;
            }
            if (e.key === "k" && hasSelection) {
                e.preventDefault();
                setSelectionRange({ start: el.selectionStart, end: el.selectionEnd });
                setFormatToolbar({ blockId: block.id });
                applyLink();
                return;
            }
        }

        // Normal block key handling (runs whether or not slash menu was open)
        if (e.key === "Escape" && ghostText && block.id === activeBlockId) {
            e.preventDefault();
            setGhostText("");
            setIsGhosting(false);
            if (ghostDebounceRef.current) clearTimeout(ghostDebounceRef.current);
            return;
        }

        if (e.key === "Tab" && ghostText && block.id === activeBlockId) {
            e.preventDefault();
            acceptGhostText(block.id);
            return;
        }

        const listTypes = ["bullet-list", "number-list", "todo"];
        if (e.key === "Enter" && !e.shiftKey && block.type !== "code" && !slashMenu) {
            e.preventDefault();
            if (listTypes.includes(block.type) && block.content.trim()) {
                // Continue list: create another block of the same type
                addBlockAfter(block.id, block.type, "");
            } else if (listTypes.includes(block.type) && !block.content.trim()) {
                // Empty list item Enter → revert to paragraph
                convertBlockType(block.id, "paragraph");
            } else {
                addBlockAfter(block.id);
            }
        }
        if (e.key === "Backspace" && blocks.length > 1) {
            if (!block.content || block.content === "") {
                e.preventDefault();
                if (listTypes.includes(block.type) || block.type === "callout" || block.type === "heading-h4") {
                    // Revert special blocks to paragraph on backspace when empty
                    convertBlockType(block.id, "paragraph");
                } else {
                    deleteBlock(block.id);
                }
            }
        }

        // Only clear ghost text on actual content typing, handled in onInput or generalized:
        if (e.key !== "Tab" && e.key !== "Shift" && e.key !== "Meta" && e.key !== "Control" && e.key !== "Alt" && ghostText) {
            setGhostText("");
            setIsGhosting(false);
        }
    };

    const fetchGhostText = async (block, currentText) => {
        if (!currentText.trim() || currentText.length < 10) return;
        setIsGhosting(true);
        try {
            const res = await fetch("/api/ai", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    action: "continue",
                    input: currentText,
                    context: getStructuredContext(),
                    fieldType: block.type,
                    fieldContent: currentText,
                    model: "claude",
                }),
            });
            if (res.ok) {
                const data = await res.json();
                if (data.text && activeBlockId === block.id) {
                    setGhostText(data.text);
                }
            }
        } catch (e) {
            // silent fail for ghost text
        } finally {
            setIsGhosting(false);
        }
    };

    // Inline formatting helpers
    const handleTextSelect = (e, block) => {
        const el = e.target;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        if (start === end || block.type === "code") {
            setFormatToolbar(null);
            return;
        }
        const rect = el.getBoundingClientRect();
        // Position toolbar above the textarea
        setFormatToolbar({ top: rect.top - 40, left: rect.left + (rect.width / 2) - 80, blockId: block.id });
        setSelectionRange({ start, end });
    };

    const applyFormat = (wrapper) => {
        if (!formatToolbar || !selectionRange) return;
        const block = blocks.find(b => b.id === formatToolbar.blockId);
        if (!block) return;
        const { start, end } = selectionRange;
        const text = block.content;
        const selected = text.substring(start, end);
        // Check if already wrapped - if so, unwrap
        const wrapLen = wrapper.length;
        const before = text.substring(start - wrapLen, start);
        const after = text.substring(end, end + wrapLen);
        let newContent;
        if (before === wrapper && after === wrapper) {
            newContent = text.substring(0, start - wrapLen) + selected + text.substring(end + wrapLen);
        } else {
            newContent = text.substring(0, start) + wrapper + selected + wrapper + text.substring(end);
        }
        updateBlock(formatToolbar.blockId, newContent);
        setFormatToolbar(null);
    };

    const applyLink = () => {
        if (!formatToolbar || !selectionRange) return;
        const block = blocks.find(b => b.id === formatToolbar.blockId);
        if (!block) return;
        const { start, end } = selectionRange;
        const selected = block.content.substring(start, end);
        const url = prompt("Enter URL:");
        if (!url) return;
        const newContent = block.content.substring(0, start) + `[${selected}](${url})` + block.content.substring(end);
        updateBlock(formatToolbar.blockId, newContent);
        setFormatToolbar(null);
    };

    const parseInlineMarkdown = (text) => {
        if (!text) return text;
        return text
            .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.+?)\*/g, "<em>$1</em>")
            .replace(/`(.+?)`/g, "<code>$1</code>")
            .replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2">$1</a>');
    };

    const autoGrow = (el) => {
        if (!el) return;
        el.style.height = "auto";
        el.style.height = el.scrollHeight + "px";
    };

    const handleBlockInput = (e, block) => {
        const value = e.target.value ?? e.target.textContent ?? "";
        updateBlock(block.id, value);
        autoGrow(e.target);

        // Clear ghost text immediately on input
        if (ghostText) {
            setGhostText("");
        }

        // Debounce ghost text fetch
        if (ghostDebounceRef.current) clearTimeout(ghostDebounceRef.current);
        if (!slashMenu && value.trim().length > 10) {
            ghostDebounceRef.current = setTimeout(() => {
                if (activeBlockId === block.id) {
                    fetchGhostText(block, value);
                }
            }, 1200);
        }

        // Markdown shortcuts
        if (value === "## ") {
            convertBlockType(block.id, "heading");
        }
        if (value === "### ") {
            convertBlockType(block.id, "heading-h3");
        }
        if (value === "#### ") {
            convertBlockType(block.id, "heading-h4");
        }
        if (value === "> ") {
            convertBlockType(block.id, "quote");
        }
        if (value === "```") {
            convertBlockType(block.id, "code");
        }
        if (value === "- " || value === "* ") {
            convertBlockType(block.id, "bullet-list");
        }
        if (value === "1. ") {
            convertBlockType(block.id, "number-list");
        }
        if (value === "[] " || value === "[ ] ") {
            convertBlockType(block.id, "todo");
        }
        if (value === "---") {
            setBlocksWithHistory(prev => prev.map(b => b.id === block.id ? { ...b, type: "divider", content: "" } : b));
            addBlockAfter(block.id);
        }

        // Slash menu: open when "/" is typed (at start or after existing text)
        if (!slashMenu && value.endsWith("/")) {
            setSlashMenu(block.id);
            setSlashFilter("");
            setSlashIndex(0);
        } else if (slashMenu) {
            // Extract text after the last "/" to use as filter
            const lastSlashIdx = value.lastIndexOf("/");
            if (lastSlashIdx !== -1) {
                setSlashFilter(value.substring(lastSlashIdx));
                setSlashIndex(0);
            } else {
                // "/" was deleted, close menu
                setSlashMenu(null);
                setSlashFilter("");
            }
        }
    };

    const getFilteredSlashCommands = () => {
        if (!slashFilter) return SLASH_COMMANDS;
        const q = slashFilter.toLowerCase();
        return SLASH_COMMANDS.filter(c =>
            (c.cmd || "").toLowerCase().includes(q) ||
            c.label.toLowerCase().includes(q) ||
            (c.desc || "").toLowerCase().includes(q)
        );
    };

    const executeSlashCommand = (cmd, blockId) => {
        setSlashMenu(null);
        setSlashFilter("");

        // Remove the slash trigger text (everything from last "/" onward)
        const block = blocks.find(b => b.id === blockId);
        const textBefore = block ? block.content.substring(0, block.content.lastIndexOf("/")) : "";

        if (cmd.action) {
            if (cmd.action === "research") {
                updateBlock(blockId, textBefore);
                setResearchOpen(true);
                return;
            }
            updateBlock(blockId, textBefore);
            streamAIIntoBlock(cmd.action, getFieldContent(blockId) || textBefore, blockId);
            return;
        }

        const meta = DEFAULT_METADATA[cmd.type] || undefined;

        if (cmd.type === "divider") {
            updateBlock(blockId, textBefore);
            if (textBefore) {
                const newId = addBlockAfter(blockId, "divider", "");
                addBlockAfter(newId);
            } else {
                setBlocksWithHistory(prev => prev.map(b => b.id === blockId ? { ...b, type: "divider", content: "" } : b));
                addBlockAfter(blockId);
            }
        } else if (cmd.type === "ai") {
            updateBlock(blockId, textBefore);
            setAiPromptBlockId(blockId);
            setAiPromptValue("");
        } else if (cmd.type === "image") {
            updateBlock(blockId, textBefore);
            if (textBefore) {
                addBlockAfter(blockId, "image", "");
            } else {
                setBlocksWithHistory(prev => prev.map(b => b.id === blockId ? { ...b, type: "image", content: "" } : b));
            }
        } else {
            if (textBefore) {
                updateBlock(blockId, textBefore);
                addBlockAfter(blockId, cmd.type, "", meta);
            } else {
                setBlocksWithHistory(prev => prev.map(b =>
                    b.id === blockId
                        ? { ...b, type: cmd.type, content: "", ...(meta ? { metadata: { ...meta } } : {}) }
                        : b
                ));
            }
        }
    };

    /* ═══════════════════════════════════════════════════
       AI EXECUTION — Stream directly into new block
       ═══════════════════════════════════════════════════ */
    const streamAIIntoBlock = async (action, input, afterBlockId, customPromptText) => {
        const newId = addBlockAfter(afterBlockId, "paragraph", "");
        setAiGeneratingBlockId(newId);

        const fieldType = getFieldType(afterBlockId);
        let accumulated = "";

        await streamAI({
            action,
            input: input || "",
            context: getStructuredContext(),
            customPrompt: customPromptText,
            fieldType,
            fieldContent: input,
            model: "claude",
            onChunk: (text) => {
                accumulated += text;
                setBlocks(prev => prev.map(b => b.id === newId ? { ...b, content: accumulated } : b));
            },
            onDone: () => {
                setAiGeneratingBlockId(null);
            },
            onError: (err) => {
                setBlocks(prev => prev.map(b => b.id === newId ? { ...b, content: `Error: ${err}` } : b));
                setAiGeneratingBlockId(null);
            },
        });
    };

    const submitAiPrompt = (blockId) => {
        if (!aiPromptValue.trim()) return;
        const blockContent = getFieldContent(blockId);
        setAiPromptBlockId(null);
        streamAIIntoBlock("custom", blockContent, blockId, aiPromptValue.trim());
        setAiPromptValue("");
    };

    /* ═══════════════════════════════════════════════════
       TITLE GENERATOR — Real Claude API
       ═══════════════════════════════════════════════════ */
    const generateTitles = async () => {
        setShowTitleGen(true);
        setTitlesLoading(true);
        setTitleSuggestions([]);

        let accumulated = "";

        await streamAI({
            action: "titles",
            input: title || "",
            context: getDraftContext(),
            onChunk: (text) => {
                accumulated += text;
                // Parse numbered lines in real-time
                const lines = accumulated.split("\n").filter(l => /^\d+[\.\)]/.test(l.trim()));
                setTitleSuggestions(lines.map(l => l.replace(/^\d+[\.\)]\s*/, "").trim()));
            },
            onDone: () => {
                const lines = accumulated.split("\n").filter(l => /^\d+[\.\)]/.test(l.trim()));
                setTitleSuggestions(lines.map(l => l.replace(/^\d+[\.\)]\s*/, "").trim()));
                setTitlesLoading(false);
            },
            onError: (err) => {
                setTitleSuggestions([`Error: ${err}`]);
                setTitlesLoading(false);
            },
        });
    };

    // Drag and drop
    const handleDragStart = (id) => setDragId(id);
    const handleDragOver = (e, id) => {
        e.preventDefault();
        if (!dragId || dragId === id) return;
        const dragIdx = blocks.findIndex(b => b.id === dragId);
        const overIdx = blocks.findIndex(b => b.id === id);
        const newBlocks = [...blocks];
        const [moved] = newBlocks.splice(dragIdx, 1);
        newBlocks.splice(overIdx, 0, moved);
        setBlocksWithHistory(() => newBlocks);
    };
    const handleDragEnd = () => setDragId(null);

    /* ═══ COMMAND BAR ═══ */
    const CommandBar = () => {
        const [query, setQuery] = useState("");
        const [idx, setIdx] = useState(0);
        const commands = [
            { icon: "↗", label: "Publish", action: () => alert("Publishing...") },
            { icon: "▷", label: "Preview", action: () => window.open(`/post/preview`, "_blank") },
            {
                icon: "↓", label: "Export as Markdown", action: () => {
                    const md = `# ${title}\n\n${subtitle}\n\n${blocks.map(b => {
                        if (b.type === "heading") return `## ${b.content}`;
                        if (b.type === "heading-h3") return `### ${b.content}`;
                        if (b.type === "quote") return `> ${b.content}`;
                        if (b.type === "code") return "```\n" + b.content + "\n```";
                        if (b.type === "divider") return "---";
                        return b.content;
                    }).join("\n\n")}`;
                    navigator.clipboard.writeText(md);
                    alert("Markdown copied to clipboard!");
                }
            },
            { icon: "◉", label: "Dashboard", action: () => window.location.href = "/write" },
            { icon: "◇", label: "View Blog", action: () => window.location.href = "/" },
        ];
        const filtered = commands.filter(c => c.label.toLowerCase().includes(query.toLowerCase()));

        useEffect(() => {
            if (!cmdOpen) return;
            const handler = (e) => {
                if (e.key === "Escape") setCmdOpen(false);
                if (e.key === "ArrowDown") { e.preventDefault(); setIdx(i => Math.min(i + 1, filtered.length - 1)); }
                if (e.key === "ArrowUp") { e.preventDefault(); setIdx(i => Math.max(i - 1, 0)); }
                if (e.key === "Enter" && filtered[idx]) { filtered[idx].action(); setCmdOpen(false); }
            };
            window.addEventListener("keydown", handler);
            return () => window.removeEventListener("keydown", handler);
        }, [cmdOpen, filtered, idx]);

        if (!cmdOpen) return null;
        return (
            <div className="cmd-overlay" onClick={() => setCmdOpen(false)}>
                <div className="cmd-palette" onClick={e => e.stopPropagation()}>
                    <div className="cmd-input-wrap">
                        <span className="search-icon">⌕</span>
                        <input className="cmd-input" placeholder="Type a command…" value={query}
                            onChange={e => { setQuery(e.target.value); setIdx(0); }} autoFocus />
                    </div>
                    <div className="cmd-results">
                        {filtered.map((c, i) => (
                            <div key={c.label} className={`cmd-item ${i === idx ? "active" : ""}`}
                                onClick={() => { c.action(); setCmdOpen(false); }} onMouseEnter={() => setIdx(i)}>
                                <div className="cmd-icon">{c.icon}</div>
                                {c.label}
                            </div>
                        ))}
                    </div>
                    <div className="cmd-footer">
                        <span>↑↓ Navigate · ⏎ Select · Esc Close</span>
                        <span>TERMINUS</span>
                    </div>
                </div>
            </div>
        );
    };

    /* ═══ TITLE GENERATOR MODAL — Real AI ═══ */
    const TitleGenModal = () => {
        if (!showTitleGen) return null;
        return (
            <div className="title-gen-modal" onClick={() => setShowTitleGen(false)}>
                <div className="title-gen-box" onClick={e => e.stopPropagation()}>
                    <h3>✦ AI Title Generator</h3>
                    <p style={{ fontSize: "0.68rem", color: "var(--muted)", marginBottom: "16px" }}>
                        {titlesLoading
                            ? "Generating titles from your draft with Claude…"
                            : "Click a title to use it:"}
                    </p>
                    {titlesLoading && titleSuggestions.length === 0 && (
                        <div style={{ padding: "12px 0" }}>
                            <div className="skeleton-line w80" />
                            <div className="skeleton-line w60" />
                            <div className="skeleton-line w80" />
                        </div>
                    )}
                    {titleSuggestions.map((t, i) => (
                        <div key={i} className="title-option" onClick={() => { setTitle(t); setShowTitleGen(false); }}>
                            <span className="rank">#{i + 1}</span>
                            {t}
                        </div>
                    ))}
                    <div style={{ marginTop: "12px", display: "flex", justifyContent: "space-between" }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => setShowTitleGen(false)}>Cancel</button>
                        {!titlesLoading && (
                            <button className="btn btn-ghost btn-sm" onClick={generateTitles}>↻ Regenerate</button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    /* ═══ RESEARCH AGENT ═══ */
    const runResearch = async (topic) => {
        if (!topic.trim()) return;
        setResearchLoading(true);
        setResearchResult("");
        setResearchStreaming("");
        setResearchQueries([]);
        setResearchStatus("Starting research…");
        setResearchSources(0);

        try {
            const res = await fetch("/api/ai/research", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    topic,
                    context: getStructuredContext(),
                    model: "claude",
                    mode: researchMode,
                }),
            });

            const reader = res.body.getReader();
            const decoder = new TextDecoder();
            let accumulated = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");
                for (const line of lines) {
                    if (!line.startsWith("data: ")) continue;
                    const payload = line.slice(6);
                    if (payload === "[DONE]") continue;
                    try {
                        const data = JSON.parse(payload);
                        if (data.status) setResearchStatus(data.status);
                        if (data.queries) setResearchQueries(data.queries);
                        if (data.sourceCount) setResearchSources(data.sourceCount);
                        if (data.text) {
                            accumulated += data.text;
                            setResearchStreaming(accumulated);
                        }
                        if (data.error) {
                            setResearchResult(`Error: ${data.error}`);
                            setResearchLoading(false);
                            return;
                        }
                    } catch { /* skip */ }
                }
            }
            setResearchResult(accumulated);
            setResearchStreaming("");
            setResearchLoading(false);
            setResearchStatus("");
        } catch (err) {
            setResearchResult(`Error: ${err.message}`);
            setResearchLoading(false);
        }
    };

    const insertResearch = () => {
        const content = researchResult;
        if (!content) return;
        const paragraphs = content.split("\n\n").filter(Boolean);
        setBlocksWithHistory(prev => {
            const newBlocks = [...prev];
            let insertIdx = newBlocks.length;
            paragraphs.forEach((p) => {
                const isHeading = p.startsWith("## ") || p.startsWith("# ");
                const newId = `b${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
                newBlocks.splice(insertIdx, 0, {
                    id: newId,
                    type: isHeading ? "heading" : "paragraph",
                    content: isHeading ? p.replace(/^#+\s*/, "").replace(/[📊🏢📈🔥💡🔗]\s*/g, "") : p,
                });
                insertIdx++;
            });
            return newBlocks;
        });
        setResearchOpen(false);
    };

    const parseResearchSections = (text) => {
        if (!text) return [];
        const sections = [];
        const lines = text.split("\n");
        let current = null;
        for (const line of lines) {
            const match = line.match(/^##\s*([📊🏢📈🔥💡🔗]?\s*.+)/);
            if (match) {
                if (current) sections.push(current);
                current = { title: match[1].trim(), content: "" };
            } else if (current) {
                current.content += (current.content ? "\n" : "") + line;
            } else {
                if (!sections.length && line.trim()) {
                    sections.push({ title: "Summary", content: line });
                }
            }
        }
        if (current) sections.push(current);
        return sections;
    };

    const ResearchPanel = () => {
        if (!researchOpen) return null;
        const displayContent = researchStreaming || researchResult;
        const sections = displayContent ? parseResearchSections(displayContent) : [];

        const renderResults = () => {
            if (!displayContent) return null;
            if (researchStreaming) {
                return (
                    <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                        {displayContent}
                        <span className="ai-cursor">▊</span>
                    </div>
                );
            }
            if (researchMode === "quick" || sections.length === 0) {
                // Quick mode: plain bullet list
                const bullets = displayContent.split("\n").filter(l => l.trim());
                return (
                    <ul style={{ paddingLeft: "16px", display: "flex", flexDirection: "column", gap: "6px" }}>
                        {bullets.map((line, i) => (
                            <li key={i} style={{ fontSize: "0.72rem", lineHeight: 1.6 }}>
                                {line.replace(/^[-•*]\s*/, "").replace(/^\d+\.\s*/, "")}
                            </li>
                        ))}
                    </ul>
                );
            }
            // Deep mode: collapsible sections
            return sections.map((section, i) => (
                <details key={i} open={i === 0} style={{ marginBottom: "8px", border: "1px solid var(--line)", borderRadius: "8px", overflow: "hidden" }}>
                    <summary style={{ padding: "10px 14px", cursor: "pointer", fontWeight: 600, fontSize: "0.74rem", color: "var(--text)", background: "rgba(228, 221, 210, 0.3)" }}>
                        {section.title}
                    </summary>
                    <div style={{ padding: "10px 14px", whiteSpace: "pre-wrap", wordBreak: "break-word", fontSize: "0.7rem", lineHeight: 1.65 }}>
                        {section.content.trim()}
                    </div>
                </details>
            ));
        };

        return (
            <div style={{
                position: "fixed", top: 0, right: 0, bottom: 0, width: "480px", maxWidth: "100vw",
                background: "var(--bg-1)", borderLeft: "1px solid var(--line)",
                zIndex: 1000, display: "flex", flexDirection: "column",
                boxShadow: "-8px 0 32px rgba(0,0,0,0.3)",
                animation: "slideInRight 0.2s ease-out",
            }}>
                {/* Header */}
                <div style={{
                    padding: "16px 20px", borderBottom: "1px solid var(--line)",
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                }}>
                    <div>
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>Research Agent</div>
                        <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginTop: "2px" }}>
                            {researchMode === "quick" ? "Quick search · bullet points" : "Deep research · multi-angle synthesis"}
                        </div>
                    </div>
                    <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        {/* Mode toggle */}
                        <div style={{ display: "flex", borderRadius: "6px", overflow: "hidden", border: "1px solid var(--line-strong)", fontSize: "0.58rem" }}>
                            <button
                                onClick={() => setResearchMode("quick")}
                                style={{ padding: "4px 10px", background: researchMode === "quick" ? "var(--accent)" : "transparent", color: researchMode === "quick" ? "var(--bg-0)" : "var(--muted)", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontWeight: 600 }}
                            >Quick</button>
                            <button
                                onClick={() => setResearchMode("deep")}
                                style={{ padding: "4px 10px", background: researchMode === "deep" ? "var(--accent)" : "transparent", color: researchMode === "deep" ? "var(--bg-0)" : "var(--muted)", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontWeight: 600 }}
                            >Deep</button>
                        </div>
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => { setResearchOpen(false); setResearchLoading(false); }}
                            style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                        >✕</button>
                    </div>
                </div>

                {/* Topic input */}
                <div style={{ padding: "12px 20px", borderBottom: "1px solid var(--line)" }}>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <input
                            style={{
                                flex: 1, padding: "10px 14px", border: "1px solid var(--line-strong)",
                                borderRadius: "8px", background: "var(--bg-0)", color: "var(--text)",
                                fontFamily: "var(--font-mono)", fontSize: "0.76rem", outline: "none",
                                caretColor: "var(--accent)",
                            }}
                            placeholder="What do you want to research?"
                            value={researchTopic}
                            onChange={e => setResearchTopic(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); runResearch(researchTopic); } }}
                            disabled={researchLoading}
                            autoFocus
                        />
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => runResearch(researchTopic)}
                            disabled={researchLoading || !researchTopic.trim()}
                            style={{ padding: "10px 16px", whiteSpace: "nowrap" }}
                        >{researchLoading ? "Researching…" : "Search"}</button>
                    </div>
                </div>

                {/* Status & Queries */}
                {(researchStatus || researchQueries.length > 0) && (
                    <div style={{ padding: "10px 20px", borderBottom: "1px solid var(--line)", fontSize: "0.64rem" }}>
                        {researchStatus && (
                            <div style={{ color: "var(--accent)", marginBottom: researchQueries.length ? "8px" : 0, fontWeight: 600 }}>
                                ⚡ {researchStatus}
                            </div>
                        )}
                        {researchQueries.length > 0 && (
                            <div style={{ color: "var(--muted)" }}>
                                <div style={{ textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px", fontSize: "0.56rem" }}>Search queries:</div>
                                {researchQueries.map((q, i) => (
                                    <div key={i} style={{ padding: "2px 0" }}>
                                        <span style={{ color: "var(--accent)", marginRight: "6px" }}>→</span>{q}
                                    </div>
                                ))}
                            </div>
                        )}
                        {researchSources > 0 && (
                            <div style={{ marginTop: "6px", color: "var(--text)", fontWeight: 600 }}>
                                {researchSources} sources found
                            </div>
                        )}
                    </div>
                )}

                {/* Results */}
                <div style={{
                    flex: 1, overflowY: "auto", padding: "16px 20px",
                    fontSize: "0.74rem", lineHeight: 1.7, color: "var(--text)",
                    fontFamily: "var(--font-mono)",
                }}>
                    {!displayContent && !researchLoading && (
                        <div style={{ color: "var(--muted)", textAlign: "center", paddingTop: "40px", fontSize: "0.68rem" }}>
                            Enter a topic above to start.
                            <br />{researchMode === "quick" ? "Quick mode returns bullet points." : "Deep mode searches multiple angles and synthesizes findings."}
                        </div>
                    )}
                    {researchLoading && !displayContent && (
                        <div style={{ paddingTop: "20px" }}>
                            <div className="skeleton-line w80" />
                            <div className="skeleton-line w60" />
                            <div className="skeleton-line w80" />
                            <div className="skeleton-line w40" />
                        </div>
                    )}
                    {renderResults()}
                </div>

                {/* Actions */}
                {researchResult && !researchLoading && (
                    <div style={{
                        padding: "12px 20px", borderTop: "1px solid var(--line)",
                        display: "flex", gap: "8px", justifyContent: "flex-end",
                    }}>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setResearchResult(""); setResearchStreaming(""); setResearchQueries([]); setResearchSources(0); }}>
                            ↻ New Research
                        </button>
                        <button className="btn btn-primary btn-sm" onClick={insertResearch}>
                            ↵ Insert as Blocks
                        </button>
                    </div>
                )}
            </div>
        );
    };

    /* ═══ ARCHITECT PANEL ═══ */
    const ArchitectPanel = () => {
        const headings = blocks.filter(b => b.type === "heading" || b.type === "heading-h3");

        return (
            <div className={`architect-panel ${showOutline ? "open" : ""}`}>
                <div className="architect-title">
                    <span style={{ fontSize: "1.1em" }}>◱</span> Structure
                    <button
                        onClick={() => setShowOutline(false)}
                        style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.8rem" }}
                    >✕</button>
                </div>

                {headings.length === 0 ? (
                    <div style={{ color: "var(--muted)", fontSize: "0.76rem", fontStyle: "italic", textAlign: "center", marginTop: "40px" }}>
                        No headings yet.<br />Type /h1 or /h2 to outline your thoughts.
                    </div>
                ) : (
                    <div className="architect-list">
                        {headings.map(h => (
                            <div
                                key={h.id}
                                className={`architect-item ${h.type === "heading" ? "architect-item-h2" : "architect-item-h3"} ${activeBlockId === h.id ? "active" : ""}`}
                                onClick={() => {
                                    if (blockRefs.current[h.id]) {
                                        blockRefs.current[h.id].scrollIntoView({ behavior: "smooth", block: "center" });
                                        blockRefs.current[h.id].focus();
                                    }
                                }}
                            >
                                {h.content || <span style={{ opacity: 0.4, fontStyle: "italic" }}>Empty heading</span>}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    /* ═══ BLOCK CONTENT RENDERER ═══ */
    const renderBlockContent = (block) => {
        // Shared textarea props helper
        const txProps = (placeholder, className = "block-content") => ({
            ref: el => blockRefs.current[block.id] = el,
            className,
            value: block.content,
            onChange: e => handleBlockInput(e, block),
            onKeyDown: e => handleBlockKeyDown(e, block),
            onFocus: () => setActiveBlockId(block.id),
            onSelect: e => handleTextSelect(e, block),
            placeholder,
            rows: 1,
            style: { resize: "none" },
        });

        switch (block.type) {
            case "divider":
                return <div className="block-divider" />;

            case "code":
                return (
                    <div className="code-block" style={{ margin: "8px 0" }}>
                        <div className="code-block-header" style={{ display: "flex", alignItems: "center" }}>
                            <div className="code-block-dots"><span /><span /><span /></div>
                            <span className="code-block-lang">code</span>
                            <button
                                onClick={() => deleteBlock(block.id)}
                                style={{ marginLeft: "auto", background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.72rem", padding: "2px 6px", borderRadius: "4px", transition: "color 0.15s" }}
                                onMouseEnter={e => e.target.style.color = "#ff6b6b"}
                                onMouseLeave={e => e.target.style.color = "var(--muted)"}
                                title="Delete code block"
                            >✕</button>
                        </div>
                        <textarea
                            ref={el => blockRefs.current[block.id] = el}
                            value={block.content}
                            onChange={e => { updateBlock(block.id, e.target.value); autoGrow(e.target); }}
                            onKeyDown={e => handleBlockKeyDown(e, block)}
                            onFocus={() => setActiveBlockId(block.id)}
                            style={{ width: "100%", minHeight: "80px", padding: "16px", border: "none", background: "transparent", fontFamily: "var(--font-mono)", fontSize: "0.82rem", lineHeight: "1.65", outline: "none", resize: "none", overflow: "hidden", caretColor: "var(--accent)" }}
                            placeholder="Write code…"
                        />
                    </div>
                );

            case "quote":
                return (
                    <div className="block-quote">
                        <textarea {...txProps("Write a quote…")} style={{ fontStyle: "italic", resize: "none" }} />
                    </div>
                );

            case "bullet-list":
                return (
                    <div className="block-bullet-list">
                        <span className="block-bullet">•</span>
                        <textarea {...txProps("List item…")} />
                    </div>
                );

            case "number-list":
                return (
                    <div className="block-number-list">
                        <span className="block-number">{getListNumber(block.id)}.</span>
                        <textarea {...txProps("List item…")} />
                    </div>
                );

            case "todo":
                return (
                    <div className="block-todo">
                        <button
                            className={`block-todo-checkbox ${block.metadata?.checked ? "checked" : ""}`}
                            onClick={() => toggleTodoCheck(block.id)}
                            type="button"
                        >
                            {block.metadata?.checked ? "☑" : "☐"}
                        </button>
                        <textarea
                            {...txProps("To-do…")}
                            style={{ resize: "none", textDecoration: block.metadata?.checked ? "line-through" : "none", opacity: block.metadata?.checked ? 0.5 : 1 }}
                        />
                    </div>
                );

            case "toggle":
                return (
                    <div className="block-toggle">
                        <div className="block-toggle-header">
                            <button
                                className={`block-toggle-arrow ${block.metadata?.expanded ? "expanded" : ""}`}
                                onClick={() => toggleToggleExpand(block.id)}
                                type="button"
                            >
                                ▸
                            </button>
                            <textarea {...txProps("Toggle heading…")} />
                        </div>
                        {block.metadata?.expanded && (
                            <textarea
                                className="block-content block-toggle-body"
                                value={block.metadata?.body || ""}
                                onChange={e => { updateBlockMetadata(block.id, { body: e.target.value }); autoGrow(e.target); }}
                                onFocus={() => setActiveBlockId(block.id)}
                                placeholder="Toggle content…"
                                rows={1}
                                style={{ resize: "none" }}
                            />
                        )}
                    </div>
                );

            case "callout":
                return (
                    <div className="block-callout">
                        <span className="block-callout-emoji">{block.metadata?.emoji || "💡"}</span>
                        <textarea {...txProps("Type something…")} />
                    </div>
                );

            case "image":
                return (
                    <div className="block-image-upload">
                        <input
                            ref={el => blockRefs.current[block.id] = el}
                            type="text"
                            className="block-content"
                            value={block.content}
                            onChange={e => { updateBlock(block.id, e.target.value); setSaveStatus("unsaved"); }}
                            onKeyDown={e => handleBlockKeyDown(e, block)}
                            onFocus={() => setActiveBlockId(block.id)}
                            placeholder="Paste image URL…"
                            style={{ resize: "none" }}
                        />
                        {block.content && (
                            <img className="block-image-preview" src={block.content} alt="" />
                        )}
                    </div>
                );

            case "heading-h4":
                return (
                    <div className="ghost-text-wrapper">
                        <textarea
                            {...txProps("Small heading…", "block-content heading-h4")}
                            style={{ resize: "none", position: "relative", zIndex: 10, background: "transparent" }}
                        />
                    </div>
                );

            default: {
                // paragraph, heading, heading-h3
                const cls = `block-content ${block.type === "heading" ? "heading" : ""} ${block.type === "heading-h3" ? "heading-h3" : ""}`;
                const ph = block.type === "heading" ? "Heading…" : block.type === "heading-h3" ? "Subheading…" : "Write something, or type / for commands…";
                return (
                    <div className="ghost-text-wrapper">
                        <textarea
                            {...txProps(ph, cls)}
                            style={{ resize: "none", position: "relative", zIndex: 10, background: "transparent" }}
                        />
                        {ghostText && activeBlockId === block.id && (
                            <div
                                className={`ghost-text ${cls} ${isMobile ? "ghost-text-mobile" : ""}`}
                                onClick={isMobile ? () => acceptGhostText(block.id) : undefined}
                            >
                                <span style={{ visibility: "hidden" }}>{block.content}</span>
                                <span>{ghostText}</span>
                                {isMobile && <span className="ghost-tap-hint">tap to accept</span>}
                                {!isMobile && <div className="ghost-hint">Tab ↹ accept · Esc dismiss</div>}
                            </div>
                        )}
                    </div>
                );
            }
        }
    };

    /* ═══ SLASH MENU RENDERER ═══ */
    const renderSlashMenu = (block) => {
        const groups = getGroupedSlashCommands();
        const filtered = getFilteredSlashCommands();
        // Compute a flat index for keyboard navigation
        let flatIdx = 0;

        return (
            <div className="ed-slash-menu">
                <div className="ed-slash-header">
                    <span>{slashFilter ? `Filter: ${slashFilter}` : "Commands"}</span>
                    <kbd>↑↓ navigate</kbd>
                </div>
                <div className="ed-slash-body">
                    {filtered.length === 0 ? (
                        <div className="ed-slash-empty">No commands found</div>
                    ) : (
                        groups.map(group => {
                            const items = group.items;
                            return (
                                <div key={group.key}>
                                    <div className="ed-slash-category-label">{group.label}</div>
                                    {items.map(cmd => {
                                        const idx = flatIdx++;
                                        return (
                                            <button
                                                key={cmd.cmd || cmd.label}
                                                className={`ed-slash-item ${idx === slashIndex ? "active" : ""}`}
                                                onClick={() => executeSlashCommand(cmd, block.id)}
                                                onMouseEnter={() => setSlashIndex(idx)}
                                            >
                                                <span className="ed-slash-icon">{cmd.icon}</span>
                                                <div>
                                                    <span className="ed-slash-label">{cmd.label}</span>
                                                    <span className="ed-slash-desc">{cmd.desc}</span>
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            );
                        })
                    )}
                </div>
            </div>
        );
    };

    /* ═══ RENDER ═══ */
    return (
        <div className="editor-layout">
            {/* Editor topbar */}
            <div className={`editor-topbar ${topbarHidden ? "topbar-hidden" : ""}`}>
                <div className="editor-topbar-left">
                    <Link href="/write">← Dashboard</Link>
                    <span className="editor-status">
                        {saveStatus === "saved" ? <span className="saved">● Saved</span> :
                            saveStatus === "saving" ? "Saving…" : "● Unsaved"}
                    </span>
                </div>
                <div className="editor-topbar-right">
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowBorders(b => !b)}>
                        {showBorders ? "▣ Borders ON" : "▢ Borders"}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setFocusMode(f => !f)}>
                        {focusMode ? "◉ Focus ON" : "○ Focus"}
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowOutline(o => !o)}>
                        ◱ Architect
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setResearchOpen(true)}>
                        🔍 Research
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={generateTitles} title="⌘T">
                        ✦ Titles
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setCmdOpen(true)}>
                        ⌘K
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => handleSave("draft")}>
                        Save
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={() => handleSave("published")}>
                        Publish
                    </button>
                </div>
            </div>

            {/* Editor canvas */}
            <div className="editor-canvas" style={keyboardPadding ? { paddingBottom: keyboardPadding + 40 } : undefined}>
                <textarea
                    className="editor-title-input"
                    placeholder="Post title…"
                    value={title}
                    rows={1}
                    onChange={e => { setTitle(e.target.value); setSaveStatus("unsaved"); autoGrow(e.target); }}
                    onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }}
                    ref={el => { if (el) autoGrow(el); }}
                />

                <textarea
                    className="editor-subtitle-input"
                    placeholder="Add a subtitle…"
                    value={subtitle}
                    rows={1}
                    onChange={e => { setSubtitle(e.target.value); setSaveStatus("unsaved"); autoGrow(e.target); }}
                    onKeyDown={e => { if (e.key === "Enter") e.preventDefault(); }}
                    ref={el => { if (el) autoGrow(el); }}
                />

                {/* Blocks */}
                {blocks.map((block) => (
                    <div
                        key={block.id}
                        className={`block ${showBorders ? "show-borders" : ""} ${focusMode && activeBlockId !== block.id ? "dimmed" : ""}`}
                        draggable={!isMobile}
                        onDragStart={() => handleDragStart(block.id)}
                        onDragOver={(e) => handleDragOver(e, block.id)}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="block-grab">⠿</div>

                        {renderBlockContent(block)}

                        {/* Slash command menu */}
                        {slashMenu === block.id && renderSlashMenu(block)}

                        {/* AI custom prompt input */}
                        {aiPromptBlockId === block.id && (
                            <div className="ai-prompt-inline">
                                <span style={{ color: "var(--accent)", fontSize: "0.68rem", fontWeight: 600 }}>✦</span>
                                <input
                                    className="ai-prompt-input"
                                    placeholder="Tell AI what to do…"
                                    value={aiPromptValue}
                                    onChange={e => setAiPromptValue(e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === "Enter") { e.preventDefault(); submitAiPrompt(block.id); }
                                        if (e.key === "Escape") { e.preventDefault(); setAiPromptBlockId(null); setAiPromptValue(""); }
                                    }}
                                    autoFocus
                                />
                                <button className="btn btn-primary btn-sm" onClick={() => submitAiPrompt(block.id)} disabled={!aiPromptValue.trim()} style={{ padding: "4px 10px" }}>Go</button>
                            </div>
                        )}

                        {/* AI generating indicator */}
                        {aiGeneratingBlockId === block.id && (
                            <div className="ai-generating-indicator">
                                <span className="ai-generating-dot" />
                                AI writing…
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Editor footer */}
            <div className="editor-footer">
                <div className="editor-footer-stats">
                    <span>{getWordCount()} words</span>
                    <span>{getReadTime()} read</span>
                    <span>{getCharCount()} chars</span>
                </div>
                <div className="editor-footer-indicators">
                    <div className="readability-badge">
                        <span className="dot" />
                        {getReadability().label}
                    </div>
                </div>
            </div>

            {/* Floating format toolbar */}
            {formatToolbar && (
                <div
                    className="format-toolbar"
                    style={{ top: formatToolbar.top, left: formatToolbar.left, position: "fixed" }}
                >
                    <button className="format-btn" onMouseDown={e => { e.preventDefault(); applyFormat("**"); }} title="Bold (Ctrl+B)"><strong>B</strong></button>
                    <button className="format-btn" onMouseDown={e => { e.preventDefault(); applyFormat("*"); }} title="Italic (Ctrl+I)"><em>I</em></button>
                    <button className="format-btn" onMouseDown={e => { e.preventDefault(); applyFormat("`"); }} title="Code">&lt;&gt;</button>
                    <button className="format-btn" onMouseDown={e => { e.preventDefault(); applyLink(); }} title="Link (Ctrl+K)">&#128279;</button>
                </div>
            )}

            <CommandBar />
            <TitleGenModal />
            <ResearchPanel />
            <ArchitectPanel />
        </div>
    );
}
