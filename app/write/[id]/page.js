"use client";

import { useMemo, useState, useCallback, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";

/* ═══════════════════════════════════════════════════
<<<<<<< HEAD
   DATA & CONSTANTS
   ═══════════════════════════════════════════════════ */

const STARTER_TEMPLATES = [
  {
    id: "analysis",
    name: "Deep Analysis",
    icon: "◈",
    subtitle: "Argument-driven essay with evidence.",
    title: "The Quiet Shift Reshaping [Your Industry]",
    deck: "A first-principles analysis of where value is moving and why now.",
    blocks: [
      { type: "heading", content: "The Core Shift" },
      { type: "paragraph", content: "Most people miss this because they look at surface trends instead of structural incentives." },
      { type: "heading-h3", content: "Evidence" },
      { type: "paragraph", content: "Insert strongest data point and source." },
      { type: "heading-h3", content: "What This Means" },
      { type: "paragraph", content: "Explain implications for founders, operators, and builders." },
    ],
  },
  {
    id: "tutorial",
    name: "How-to Guide",
    icon: "⚡",
    subtitle: "Step-by-step execution guide.",
    title: "How to Implement [Topic] Without Overengineering",
    deck: "A practical system you can apply in one afternoon.",
    blocks: [
      { type: "heading", content: "Goal and Constraints" },
      { type: "paragraph", content: "Define desired outcome, limits, and success criteria." },
      { type: "heading-h3", content: "Step-by-Step" },
      { type: "paragraph", content: "Step 1: ... Step 2: ... Step 3: ..." },
      { type: "heading-h3", content: "Failure Modes" },
      { type: "paragraph", content: "List common mistakes and how to avoid them." },
    ],
  },
  {
    id: "contrarian",
    name: "Contrarian Take",
    icon: "⟁",
    subtitle: "Challenge consensus with proof.",
    title: "The Popular Advice That Is Quietly Failing",
    deck: "A contrarian argument backed by practical evidence.",
    blocks: [
      { type: "heading", content: "The Consensus View" },
      { type: "paragraph", content: "State the common belief as fairly as possible." },
      { type: "heading-h3", content: "Why It Breaks" },
      { type: "paragraph", content: "Show where real-world constraints invalidate the theory." },
      { type: "heading-h3", content: "A Better Approach" },
      { type: "paragraph", content: "Propose an alternative and explain tradeoffs." },
    ],
  },
];

const SLASH_ITEMS = [
  { type: "paragraph", icon: "¶", label: "Text", desc: "Plain paragraph" },
  { type: "heading", icon: "H2", label: "Heading", desc: "Section heading" },
  { type: "heading-h3", icon: "H3", label: "Subheading", desc: "Smaller heading" },
  { type: "quote", icon: "❝", label: "Quote", desc: "Blockquote" },
  { type: "code", icon: "</>", label: "Code", desc: "Code block" },
  { type: "divider", icon: "—", label: "Divider", desc: "Horizontal rule" },
];

const COPILOT_ACTIONS = [
  { id: "improve", label: "✦ Improve", desc: "Better clarity & polish" },
  { id: "expand", label: "↔ Expand", desc: "Add detail & depth" },
  { id: "shorten", label: "⊟ Shorten", desc: "Make concise" },
  { id: "grammar", label: "Aa Fix", desc: "Grammar & spelling" },
  { id: "engaging", label: "⚡ Engaging", desc: "More compelling" },
  { id: "professional", label: "◆ Pro", desc: "Authoritative tone" },
];

const INTENT_OPTIONS = [
  { value: "explain", label: "Explain clearly" },
  { value: "strategy", label: "Strategic memo" },
  { value: "tutorial", label: "How-to guide" },
  { value: "contrarian", label: "Contrarian angle" },
];

const AUDIENCE_OPTIONS = [
  { value: "general", label: "General readers" },
  { value: "founders", label: "Founders / operators" },
  { value: "engineers", label: "Engineers" },
  { value: "investors", label: "Investors / analysts" },
];

const DEPTH_OPTIONS = [
  { value: "fast", label: "Fast scan" },
  { value: "balanced", label: "Balanced" },
  { value: "deep", label: "Deep research" },
];

/* ═══════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════ */

function makeId(prefix = "b") {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}_${Date.now()}`;
}

function withIds(blocks) {
  return blocks.map((block) => ({ ...block, id: makeId() }));
}

function blockToMarkdown(block) {
  if (block.type === "heading") return `## ${block.content}`;
  if (block.type === "heading-h3") return `### ${block.content}`;
  if (block.type === "quote") return `> ${block.content}`;
  if (block.type === "code") return `\`\`\`\n${block.content}\n\`\`\``;
  if (block.type === "divider") return "---";
  return block.content;
}

function sourceToCitation(source) {
  return `[${source.id}] ${source.title}\n${source.url}`;
}

function normalizeContent(value) {
  return (value || "").replace(/\s+/g, " ").trim();
}

/* ═══════════════════════════════════════════════════
   AUTO-RESIZE HOOK
   ═══════════════════════════════════════════════════ */

function useAutoResize(ref, value) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [ref, value]);
}

/* ═══════════════════════════════════════════════════
   PROGRESS RING
   ═══════════════════════════════════════════════════ */

function ProgressRing({ percent, size = 32, stroke = 2.5 }) {
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  return (
    <svg className="progress-ring" width={size} height={size}>
      <circle className="progress-ring-bg" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none" />
      <circle className="progress-ring-fill" cx={size / 2} cy={size / 2} r={radius} strokeWidth={stroke} fill="none"
        strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      <text x="50%" y="50%" textAnchor="middle" dy="0.35em" className="progress-ring-text">
        {Math.round(percent)}%
      </text>
    </svg>
  );
}

/* ═══════════════════════════════════════════════════
   AUTO-RESIZING TEXTAREA BLOCK
   ═══════════════════════════════════════════════════ */

function BlockTextarea({ block, onChange, onKeyDown, placeholder }) {
  const ref = useRef(null);
  useAutoResize(ref, block.content);

  const typeClass =
    block.type === "heading" ? "heading" :
      block.type === "heading-h3" ? "heading-h3" :
        block.type === "quote" ? "quote" :
          block.type === "code" ? "code" : "";

  return (
    <textarea
      ref={ref}
      className={`ed-textarea ${typeClass}`}
      value={block.content}
      onChange={onChange}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      rows={1}
    />
  );
}

/* ═══════════════════════════════════════════════════
   COPILOT POPOVER — AI assistant per field
   ═══════════════════════════════════════════════════ */

function CopilotPopover({ fieldType, content, postTitle, postSubtitle, surroundingContext, onApply, onClose }) {
  const [status, setStatus] = useState("idle"); // idle | loading | done | error
  const [result, setResult] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [error, setError] = useState("");
  const customRef = useRef(null);

  useEffect(() => {
    if (customRef.current) customRef.current.focus();
  }, []);

  async function runAction(action, prompt) {
    setStatus("loading");
    setError("");
    setResult("");
    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldType,
          content,
          action,
          customPrompt: prompt || "",
          postTitle,
          postSubtitle,
          surroundingContext,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Copilot request failed");
      setResult(data.result);
      setStatus("done");
    } catch (err) {
      setError(err.message);
      setStatus("error");
    }
  }

  function handleCustomSubmit(e) {
    e.preventDefault();
    if (customPrompt.trim()) runAction("custom", customPrompt.trim());
  }

  return (
    <div className="copilot-popover">
      <div className="copilot-header">
        <span className="copilot-badge">✦ AI Copilot</span>
        <span className="copilot-field-type">{fieldType}</span>
        <button className="copilot-close" onClick={onClose}>×</button>
      </div>

      {/* Quick actions */}
      <div className="copilot-actions">
        {COPILOT_ACTIONS.map((a) => (
          <button
            key={a.id}
            className="copilot-action-btn"
            onClick={() => runAction(a.id)}
            disabled={status === "loading"}
            title={a.desc}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* Custom prompt */}
      <form className="copilot-custom" onSubmit={handleCustomSubmit}>
        <input
          ref={customRef}
          className="copilot-input"
          placeholder="Custom instruction…"
          value={customPrompt}
          onChange={(e) => setCustomPrompt(e.target.value)}
          disabled={status === "loading"}
        />
        <button
          type="submit"
          className="copilot-send"
          disabled={status === "loading" || !customPrompt.trim()}
        >→</button>
      </form>

      {/* Loading state */}
      {status === "loading" && (
        <div className="copilot-loading">
          <span className="spinner" /> Thinking…
        </div>
      )}

      {/* Error */}
      {status === "error" && (
        <div className="copilot-error">{error}</div>
      )}

      {/* Result */}
      {status === "done" && result && (
        <div className="copilot-result">
          <div className="copilot-result-label">Suggestion</div>
          <div className="copilot-result-text">{result}</div>
          <div className="copilot-result-actions">
            <button className="ed-btn primary sm" onClick={() => { onApply(result); onClose(); }}>
              ✓ Apply
            </button>
            <button className="ed-btn ghost sm" onClick={() => { navigator.clipboard.writeText(result); }}>
              Copy
            </button>
            <button className="ed-btn ghost sm" onClick={onClose}>Dismiss</button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════
   EDITOR PAGE
   ═══════════════════════════════════════════════════ */

export default function EditorPage({ params }) {
  const resolvedParams = use(params);
  const isNew = resolvedParams.id === "new";

  /* ── Convex ── */
  const existingPost = useQuery(
    api.posts.getById,
    isNew ? "skip" : { id: resolvedParams.id }
  );
  const createPost = useMutation(api.posts.create);
  const updatePost = useMutation(api.posts.update);
  const [postId, setPostId] = useState(isNew ? null : resolvedParams.id);
  const [initialized, setInitialized] = useState(isNew);

  /* ── State ── */
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");
  const [blocks, setBlocks] = useState(
    withIds([{ type: "paragraph", content: "" }])
  );

  /* ── Load existing post data ── */
  useEffect(() => {
    if (!isNew && existingPost && !initialized) {
      setTitle(existingPost.title || "");
      setSubtitle(existingPost.subtitle || "");
      if (existingPost.blocks && existingPost.blocks.length > 0) {
        setBlocks(withIds(existingPost.blocks));
      }
      setInitialized(true);
    }
  }, [existingPost, isNew, initialized]);
  const [saveStatus, setSaveStatus] = useState("saved");
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [sidebarTab, setSidebarTab] = useState("research");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Slash command menu state
  const [slashMenu, setSlashMenu] = useState(null);
  const [slashIdx, setSlashIdx] = useState(0);

  // Copilot state — which field has copilot open
  const [copilotField, setCopilotField] = useState(null); // null | "title" | "subtitle" | blockId

  // Research state
  const [researchTopic, setResearchTopic] = useState("");
  const [researchIntent, setResearchIntent] = useState("explain");
  const [researchAudience, setResearchAudience] = useState("general");
  const [researchDepth, setResearchDepth] = useState("balanced");
  const [researchState, setResearchState] = useState("idle");
  const [researchError, setResearchError] = useState("");
  const [researchResult, setResearchResult] = useState(null);

  // Refs
  const titleRef = useRef(null);
  const subtitleRef = useRef(null);
  const editorRef = useRef(null);

  useAutoResize(titleRef, title);
  useAutoResize(subtitleRef, subtitle);

  /* ── Derived ── */
  const wordCount = useMemo(() => {
    const text = [title, subtitle, ...blocks.map((b) => b.content)].join(" ");
    return text.split(/\s+/).filter(Boolean).length;
  }, [title, subtitle, blocks]);

  const readTime = useMemo(() => Math.max(1, Math.ceil(wordCount / 250)), [wordCount]);

  const compileChecks = useMemo(() => {
    const headings = blocks.filter((b) => b.type === "heading" || b.type === "heading-h3").length;
    const nonEmpty = blocks.filter((b) => normalizeContent(b.content)).length;
    const sources = researchResult?.sources?.length || 0;
    return [
      { label: "Clear title", done: title.trim().length >= 12 },
      { label: "Strong subtitle", done: subtitle.trim().length >= 30 },
      { label: "3+ sections", done: headings >= 3 },
      { label: "5+ content blocks", done: nonEmpty >= 5 },
      { label: "5+ sources", done: sources >= 5 },
    ];
  }, [blocks, title, subtitle, researchResult]);

  const checkPercent = useMemo(() => {
    const done = compileChecks.filter((c) => c.done).length;
    return Math.round((done / compileChecks.length) * 100);
  }, [compileChecks]);

  /* ── Slash menu filtering ── */
  const filteredSlash = useMemo(() => {
    if (!slashMenu) return SLASH_ITEMS;
    const q = (slashMenu.filter || "").toLowerCase();
    if (!q) return SLASH_ITEMS;
    return SLASH_ITEMS.filter(
      (item) => item.label.toLowerCase().includes(q) || item.type.includes(q)
    );
  }, [slashMenu]);

  /* ── Surrounding context for copilot ── */
  function getSurroundingContext(blockId) {
    const idx = blocks.findIndex((b) => b.id === blockId);
    if (idx === -1) return "";
    const nearby = blocks.slice(Math.max(0, idx - 2), idx + 3);
    return nearby.map((b) => `[${b.type}] ${b.content}`).join("\n");
  }

  /* ── Actions ── */
  const markUnsaved = useCallback(() => setSaveStatus("unsaved"), []);

  function updateBlock(id, content) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, content } : b)));
    markUnsaved();
  }

  function updateBlockType(id, type) {
    setBlocks((prev) => prev.map((b) => (b.id === id ? { ...b, type, content: b.type === "divider" ? "" : b.content } : b)));
    markUnsaved();
  }

  function insertBlockAfter(id, type = "paragraph") {
    const next = { id: makeId(), type, content: "" };
    setBlocks((prev) => {
      const idx = prev.findIndex((b) => b.id === id);
      if (idx === -1) return [...prev, next];
      const clone = [...prev];
      clone.splice(idx + 1, 0, next);
      return clone;
    });
    markUnsaved();
  }

  function removeBlock(id) {
    setBlocks((prev) => (prev.length <= 1 ? prev : prev.filter((b) => b.id !== id)));
    markUnsaved();
  }

  function addBlockToEnd(type = "paragraph") {
    setBlocks((prev) => [...prev, { id: makeId(), type, content: "" }]);
    markUnsaved();
  }

  function applyTemplate(template) {
    setSelectedTemplate(template.id);
    setTitle(template.title);
    setSubtitle(template.deck);
    setBlocks(withIds(template.blocks));
    markUnsaved();
  }

  /* ── Slash command handlers ── */
  function openSlashMenu(blockId, textarea) {
    const rect = textarea.getBoundingClientRect();
    const edRect = editorRef.current?.getBoundingClientRect() || { top: 0, left: 0 };
    setSlashMenu({
      blockId,
      top: rect.bottom - edRect.top + 4,
      left: rect.left - edRect.left,
      filter: "",
    });
    setSlashIdx(0);
  }

  function selectSlashItem(item) {
    if (!slashMenu) return;
    updateBlockType(slashMenu.blockId, item.type);
    updateBlock(slashMenu.blockId, "");
    setSlashMenu(null);
  }

  function closeSlashMenu() {
    setSlashMenu(null);
    setSlashIdx(0);
  }

  /* ── Block keyboard handler ── */
  function handleBlockKeyDown(e, block) {
    if (slashMenu && slashMenu.blockId === block.id) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSlashIdx((i) => Math.min(i + 1, filteredSlash.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSlashIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredSlash[slashIdx]) selectSlashItem(filteredSlash[slashIdx]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        closeSlashMenu();
      }
      return;
    }

    if (e.key === "Enter" && !e.shiftKey && block.type !== "code") {
      e.preventDefault();
      insertBlockAfter(block.id);
    }

    if (e.key === "Backspace" && !block.content && blocks.length > 1) {
      e.preventDefault();
      removeBlock(block.id);
    }
  }

  function handleBlockInput(e, block) {
    const val = e.target.value;
    updateBlock(block.id, val);

    if (val === "/") {
      openSlashMenu(block.id, e.target);
    } else if (val.startsWith("/") && slashMenu && slashMenu.blockId === block.id) {
      setSlashMenu((prev) => ({ ...prev, filter: val.slice(1) }));
      setSlashIdx(0);
    } else if (slashMenu && slashMenu.blockId === block.id && !val.startsWith("/")) {
      closeSlashMenu();
    }
  }

  /* ── Research ── */
  const [researchStage, setResearchStage] = useState(""); // planning | searching | analyzing | synthesizing | done
  const [researchPanelOpen, setResearchPanelOpen] = useState(false);
  const [followUpMessages, setFollowUpMessages] = useState([]);
  const [followUpInput, setFollowUpInput] = useState("");
  const [followUpLoading, setFollowUpLoading] = useState(false);

  async function runResearchAgent() {
    if (!researchTopic.trim()) {
      setResearchError("Enter a topic first.");
      setResearchState("error");
      return;
    }
    setResearchState("loading");
    setResearchError("");
    setResearchResult(null);
    setFollowUpMessages([]);

    // Staged progress
    setResearchStage("planning");
    await new Promise((r) => setTimeout(r, 600));
    setResearchStage("searching");

    try {
      const res = await fetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: researchTopic, intent: researchIntent,
          audience: researchAudience, depth: researchDepth, maxSources: 10,
        }),
      });

      setResearchStage("analyzing");
      await new Promise((r) => setTimeout(r, 400));

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || data?.details || "Research failed.");

      setResearchStage("synthesizing");
      await new Promise((r) => setTimeout(r, 300));

      setResearchResult(data);
      setResearchState("done");
      setResearchStage("done");
      setResearchPanelOpen(true); // Auto-open the artifact panel
      if (!title.trim() && data?.synthesis?.suggestedTitle) setTitle(data.synthesis.suggestedTitle);
      if (!subtitle.trim() && data?.synthesis?.thesis) setSubtitle(data.synthesis.thesis.slice(0, 180));
      markUnsaved();
    } catch (err) {
      setResearchError(err.message || "Research agent failed.");
      setResearchState("error");
      setResearchStage("");
    }
  }

  async function askFollowUp() {
    if (!followUpInput.trim() || !researchResult) return;
    const question = followUpInput.trim();
    setFollowUpInput("");
    setFollowUpMessages((prev) => [...prev, { role: "user", text: question }]);
    setFollowUpLoading(true);

    const context = [
      `Research topic: ${researchTopic}`,
      `Thesis: ${researchResult.synthesis?.thesis || ""}`,
      `Key takeaways: ${(researchResult.synthesis?.keyTakeaways || []).join("; ")}`,
      `Sources: ${(researchResult.sources || []).map((s) => `${s.id}: ${s.title} (${s.domain})`).join("; ")}`,
    ].join("\n");

    try {
      const res = await fetch("/api/copilot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fieldType: "paragraph",
          content: context,
          action: "custom",
          customPrompt: `Based on this research, answer: ${question}`,
          postTitle: title,
          postSubtitle: subtitle,
          surroundingContext: context,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Follow-up failed");
      setFollowUpMessages((prev) => [...prev, { role: "assistant", text: data.result }]);
    } catch (err) {
      setFollowUpMessages((prev) => [...prev, { role: "assistant", text: `Error: ${err.message}` }]);
    }
    setFollowUpLoading(false);
  }

  function insertFollowUpAsBlock(text) {
    setBlocks((prev) => [...prev, { id: makeId(), type: "paragraph", content: text }]);
    markUnsaved();
  }

  function buildDraftFromResearch() {
    if (!researchResult?.synthesis) return;
    const s = researchResult.synthesis;
    const next = [];
    const outline = Array.isArray(s.outline) ? s.outline : [];
    const starters = Array.isArray(s.sectionStarters) ? s.sectionStarters : [];
    const takeaways = Array.isArray(s.keyTakeaways) ? s.keyTakeaways : [];

    outline.forEach((section, i) => {
      next.push({ id: makeId(), type: "heading", content: section });
      next.push({ id: makeId(), type: "paragraph", content: starters[i] || "Expand with source-backed detail." });
    });
    if (takeaways.length) {
      next.push({ id: makeId(), type: "heading-h3", content: "Key Evidence" });
      takeaways.slice(0, 6).forEach((t) => next.push({ id: makeId(), type: "paragraph", content: `- ${t}` }));
    }
    if (researchResult.sources?.length) {
      next.push({ id: makeId(), type: "heading-h3", content: "Sources" });
      researchResult.sources.slice(0, 8).forEach((src) =>
        next.push({ id: makeId(), type: "paragraph", content: sourceToCitation(src) })
      );
    }
    setTitle(s.suggestedTitle || title);
    setSubtitle(s.thesis || subtitle);
    setBlocks(next.length ? next : blocks);
    markUnsaved();
  }

  function insertResearchSummary() {
    if (!researchResult?.synthesis) return;
    const s = researchResult.synthesis;
    const summary = normalizeContent(s.summaryMarkdown || s.thesis || "");
    setBlocks((prev) => [
      ...prev,
      { id: makeId(), type: "heading-h3", content: "Research Summary" },
      { id: makeId(), type: "paragraph", content: summary },
    ]);
    markUnsaved();
  }

  async function copySourcesToClipboard() {
    if (!researchResult?.sources?.length) return;
    await navigator.clipboard.writeText(
      researchResult.sources.map(sourceToCitation).join("\n\n")
    );
  }

  async function exportMarkdown() {
    const body = blocks.map(blockToMarkdown).join("\n\n");
    await navigator.clipboard.writeText(`# ${title || "Untitled"}\n\n${subtitle || ""}\n\n${body}`.trim());
  }

  async function saveDraft() {
    setSaveStatus("saving");
    try {
      const slug = (title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const postData = {
        title: title || "Untitled",
        subtitle: subtitle || "",
        excerpt: subtitle || title || "",
        slug,
        date: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
        readTime: `${readTime} min`,
        wordCount,
        tags: [],
        status: "draft",
        views: 0,
        blocks: blocks.map(({ type, content }) => ({ type, content })),
      };

      if (postId) {
        await updatePost({ id: postId, ...postData });
      } else {
        const newId = await createPost(postData);
        setPostId(newId);
      }
      setSaveStatus("saved");
    } catch (err) {
      console.error("Save failed:", err);
      setSaveStatus("unsaved");
    }
  }

  async function publishPost() {
    setSaveStatus("saving");
    try {
      const slug = (title || "untitled").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
      const content = blocks.map(b => {
        if (b.type === "heading") return `<h2>${b.content}</h2>`;
        if (b.type === "heading-h3") return `<h3>${b.content}</h3>`;
        if (b.type === "quote") return `<blockquote>${b.content}</blockquote>`;
        if (b.type === "code") return `<pre><code>${b.content}</code></pre>`;
        if (b.type === "divider") return `<hr/>`;
        return `<p>${b.content}</p>`;
      }).join("\n");

      const postData = {
        title: title || "Untitled",
        subtitle: subtitle || "",
        excerpt: subtitle || title || "",
        content,
        slug,
        date: new Date().toISOString().slice(0, 10).replace(/-/g, "."),
        readTime: `${readTime} min`,
        wordCount,
        tags: [],
        status: "published",
        views: 0,
        blocks: blocks.map(({ type, content }) => ({ type, content })),
      };

      if (postId) {
        await updatePost({ id: postId, ...postData });
      } else {
        const newId = await createPost(postData);
        setPostId(newId);
      }
      setSaveStatus("saved");
    } catch (err) {
      console.error("Publish failed:", err);
      setSaveStatus("unsaved");
    }
  }

  /* ── Click-away handlers ── */
  useEffect(() => {
    if (!slashMenu) return;
    function handleClick(e) {
      if (!e.target.closest(".ed-slash-menu")) closeSlashMenu();
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [slashMenu]);

  useEffect(() => {
    if (!copilotField) return;
    function handleClick(e) {
      if (!e.target.closest(".copilot-popover") && !e.target.closest(".copilot-trigger")) {
        setCopilotField(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [copilotField]);

  /* ═══════════════════════════════════════════════════
     RENDER
     ═══════════════════════════════════════════════════ */

  return (
    <div className="ed" ref={editorRef}>
      {/* ── Top Bar ── */}
      <header className="ed-topbar">
        <div className="ed-topbar-left">
          <Link href="/write" className="ed-back">← Back</Link>
          <span className="ed-sep" />
          <span className={`ed-save-status ${saveStatus}`}>
            {saveStatus === "saved" ? "Saved" : saveStatus === "saving" ? "Saving…" : "Unsaved changes"}
          </span>
        </div>
        <div className="ed-topbar-center">
          <span className="ed-wc">{wordCount} words · {readTime} min read</span>
        </div>
        <div className="ed-topbar-right">
          <button className="ed-btn ghost" onClick={exportMarkdown}>Export</button>
          <button className="ed-btn ghost" onClick={saveDraft}>Save</button>
          <button className="ed-btn primary" onClick={publishPost}>Publish</button>
          <span className="ed-sep" />
          <button
            className={`ed-btn icon ${sidebarOpen ? "active" : ""}`}
            onClick={() => setSidebarOpen((o) => !o)}
            title="Toggle sidebar"
          >
            ◫
          </button>
        </div>
      </header>

      {/* ── Main Area ── */}
      <div className={`ed-body ${sidebarOpen ? "with-sidebar" : ""} ${researchPanelOpen && researchResult ? "with-research" : ""}`}>

        {/* ── Writing Surface ── */}
        <main className="ed-main">
          {/* Template strip for new posts */}
          {isNew && (
            <div className="ed-templates">
              <span className="ed-templates-label">Start with</span>
              {STARTER_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  className={`ed-template-chip ${selectedTemplate === t.id ? "active" : ""}`}
                  onClick={() => applyTemplate(t)}
                >
                  <span className="ed-template-icon">{t.icon}</span>
                  {t.name}
                </button>
              ))}
            </div>
          )}

          {/* Title with copilot */}
          <div className="ed-head">
            <div className="ed-field-wrap">
              <textarea
                ref={titleRef}
                className="ed-title"
                placeholder="Title"
                value={title}
                onChange={(e) => { setTitle(e.target.value); markUnsaved(); }}
                rows={1}
              />
              <button
                className={`copilot-trigger ${copilotField === "title" ? "active" : ""}`}
                onClick={() => setCopilotField(copilotField === "title" ? null : "title")}
                title="AI Copilot"
              >✦</button>
              {copilotField === "title" && (
                <CopilotPopover
                  fieldType="title"
                  content={title}
                  postTitle={title}
                  postSubtitle={subtitle}
                  surroundingContext=""
                  onApply={(text) => { setTitle(text); markUnsaved(); }}
                  onClose={() => setCopilotField(null)}
                />
              )}
            </div>

            {/* Subtitle with copilot */}
            <div className="ed-field-wrap">
              <textarea
                ref={subtitleRef}
                className="ed-subtitle"
                placeholder="Tell your story…"
                value={subtitle}
                onChange={(e) => { setSubtitle(e.target.value); markUnsaved(); }}
                rows={1}
              />
              <button
                className={`copilot-trigger ${copilotField === "subtitle" ? "active" : ""}`}
                onClick={() => setCopilotField(copilotField === "subtitle" ? null : "subtitle")}
                title="AI Copilot"
              >✦</button>
              {copilotField === "subtitle" && (
                <CopilotPopover
                  fieldType="subtitle"
                  content={subtitle}
                  postTitle={title}
                  postSubtitle={subtitle}
                  surroundingContext=""
                  onApply={(text) => { setSubtitle(text); markUnsaved(); }}
                  onClose={() => setCopilotField(null)}
                />
              )}
            </div>
          </div>

          {/* Blocks with copilot + insert bars */}
          <div className="ed-blocks">
            {blocks.map((block, idx) => (
              <div key={block.id}>
                {/* ── Insert bar ABOVE each block (except first) ── */}
                {idx > 0 && (
                  <div className="ed-insert-bar" onClick={() => insertBlockAfter(blocks[idx - 1].id)}>
                    <span className="ed-insert-line" />
                    <button className="ed-insert-btn" title="Add block here">+</button>
                    <span className="ed-insert-line" />
                  </div>
                )}

                <div
                  className={`ed-block ${block.type === "divider" ? "is-divider" : ""} type-${block.type}`}
                >
                  {/* ── Delete button (left side, visible on hover) ── */}
                  {blocks.length > 1 && (
                    <button className="ed-block-delete" onClick={() => removeBlock(block.id)} title="Delete this block">
                      × Delete
                    </button>
                  )}

                  {/* ── Block content ── */}
                  <div className="ed-block-content">
                    {block.type === "divider" ? (
                      <hr className="ed-hr" />
                    ) : (
                      <BlockTextarea
                        block={block}
                        onChange={(e) => handleBlockInput(e, block)}
                        onKeyDown={(e) => handleBlockKeyDown(e, block)}
                        placeholder={
                          block.type === "heading" ? "Heading"
                            : block.type === "heading-h3" ? "Subheading"
                              : block.type === "quote" ? "Quote"
                                : block.type === "code" ? "Code"
                                  : "Type '/' for commands…"
                        }
                      />
                    )}
                  </div>

                  {/* ── Copilot trigger (right side) ── */}
                  {block.type !== "divider" && (
                    <button
                      className={`copilot-trigger ${copilotField === block.id ? "active" : ""}`}
                      onClick={() => setCopilotField(copilotField === block.id ? null : block.id)}
                      title="AI Copilot"
                    >✦</button>
                  )}

                  {/* Copilot popover for this block */}
                  {copilotField === block.id && (
                    <CopilotPopover
                      fieldType={block.type}
                      content={block.content}
                      postTitle={title}
                      postSubtitle={subtitle}
                      surroundingContext={getSurroundingContext(block.id)}
                      onApply={(text) => { updateBlock(block.id, text); }}
                      onClose={() => setCopilotField(null)}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Add block at end — big obvious button */}
          <button className="ed-add-block-btn" onClick={() => addBlockToEnd()}>
            <span className="ed-add-block-icon">+</span>
            <span>Add a new block</span>
            <kbd className="ed-add-block-hint">or press Enter</kbd>
          </button>

          {/* Slash command menu overlay */}
          {slashMenu && filteredSlash.length > 0 && (
            <div
              className="ed-slash-menu"
              style={{ top: slashMenu.top, left: slashMenu.left }}
            >
              <div className="ed-slash-header">
                <span>Blocks</span>
                <kbd>↑↓ Enter</kbd>
              </div>
              {filteredSlash.map((item, i) => (
                <button
                  key={item.type}
                  className={`ed-slash-item ${i === slashIdx ? "active" : ""}`}
                  onMouseDown={(e) => { e.preventDefault(); selectSlashItem(item); }}
                  onMouseEnter={() => setSlashIdx(i)}
                >
                  <span className="ed-slash-icon">{item.icon}</span>
                  <div>
                    <span className="ed-slash-label">{item.label}</span>
                    <span className="ed-slash-desc">{item.desc}</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Footer stats */}
          <div className="ed-footer">
            <span>{wordCount} words</span>
            <span>{readTime} min read</span>
            <span>{blocks.length} blocks</span>
            <span className="ed-mode-badge">
              {researchResult ? "◈ research-backed" : "drafting"}
            </span>
          </div>
        </main>

        {/* ── Sidebar ── */}
        {sidebarOpen && (
          <aside className="ed-sidebar">
            <div className="ed-sidebar-tabs">
              <button
                className={`ed-sidebar-tab ${sidebarTab === "research" ? "active" : ""}`}
                onClick={() => setSidebarTab("research")}
              >
                ◈ Research
              </button>
              <button
                className={`ed-sidebar-tab ${sidebarTab === "checklist" ? "active" : ""}`}
                onClick={() => setSidebarTab("checklist")}
              >
                <ProgressRing percent={checkPercent} size={18} stroke={2} />
                Checklist
              </button>
            </div>

            {sidebarTab === "research" && (
              <div className="ed-panel">
                <p className="ed-panel-desc">
                  Plan queries → search the web → rank sources → synthesize a draft brief.
                </p>

                <div className="ed-field">
                  <label>Topic</label>
                  <input
                    className="ed-input"
                    placeholder="What to research?"
                    value={researchTopic}
                    onChange={(e) => setResearchTopic(e.target.value)}
                  />
                </div>

                <div className="ed-field-row">
                  <div className="ed-field">
                    <label>Intent</label>
                    <select value={researchIntent} onChange={(e) => setResearchIntent(e.target.value)}>
                      {INTENT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                  <div className="ed-field">
                    <label>Audience</label>
                    <select value={researchAudience} onChange={(e) => setResearchAudience(e.target.value)}>
                      {AUDIENCE_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </div>
                </div>

                <div className="ed-field">
                  <label>Depth</label>
                  <select value={researchDepth} onChange={(e) => setResearchDepth(e.target.value)}>
                    {DEPTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>

                <button
                  className="ed-btn primary full"
                  onClick={runResearchAgent}
                  disabled={researchState === "loading"}
                >
                  {researchState === "loading" ? <><span className="spinner" /> Researching…</> : "◈ Run Research Agent"}
                </button>

                {/* Live progress stages */}
                {researchState === "loading" && researchStage && (
                  <div className="ed-research-stages">
                    {["planning", "searching", "analyzing", "synthesizing"].map((stage) => (
                      <div
                        key={stage}
                        className={`ed-stage ${stage === researchStage ? "active" :
                          ["planning", "searching", "analyzing", "synthesizing"].indexOf(stage) <
                            ["planning", "searching", "analyzing", "synthesizing"].indexOf(researchStage) ? "done" : ""
                          }`}
                      >
                        <span className="ed-stage-dot">
                          {["planning", "searching", "analyzing", "synthesizing"].indexOf(stage) <
                            ["planning", "searching", "analyzing", "synthesizing"].indexOf(researchStage) ? "✓" :
                            stage === researchStage ? <span className="spinner-sm" /> : "○"}
                        </span>
                        <span className="ed-stage-label">
                          {stage === "planning" ? "Planning queries" :
                            stage === "searching" ? "Searching the web" :
                              stage === "analyzing" ? "Analyzing sources" : "Synthesizing brief"}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {researchState === "error" && <p className="ed-error">{researchError}</p>}

                {/* Compact done state — opens the panel */}
                {researchResult && (
                  <div className="ed-research-done">
                    <div className="ed-research-done-header">
                      <span className="ed-done-check">✓</span>
                      <div>
                        <strong>Research complete</strong>
                        <span className="ed-done-meta">{researchResult.sources?.length || 0} sources found</span>
                      </div>
                    </div>
                    <p className="ed-done-thesis">{researchResult.synthesis?.oneSentenceAngle}</p>
                    <button
                      className="ed-btn primary full"
                      onClick={() => setResearchPanelOpen(true)}
                    >
                      Open Research ◈
                    </button>
                  </div>
                )}
              </div>
            )}

            {sidebarTab === "checklist" && (
              <div className="ed-panel">
                <div className="ed-check-header">
                  <ProgressRing percent={checkPercent} size={48} stroke={3} />
                  <div>
                    <div className="ed-check-count">{compileChecks.filter((c) => c.done).length}/{compileChecks.length}</div>
                    <div className="ed-check-label">items complete</div>
                  </div>
                </div>
                <ul className="ed-checklist">
                  {compileChecks.map((c) => (
                    <li key={c.label} className={c.done ? "done" : ""}>
                      <span className="ed-check-icon">{c.done ? "✓" : "○"}</span>
                      {c.label}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </aside>
        )}

        {/* ── Research Artifact Panel ── */}
        {researchPanelOpen && researchResult && (
          <div className="ed-research-panel">
            <div className="ed-rp-header">
              <h3>◈ Research Artifact</h3>
              <div className="ed-rp-header-meta">
                {researchResult.model && <span className="ed-rp-model">{researchResult.model}</span>}
                {researchResult.plan?.totalSearchRounds > 1 && <span className="ed-rp-rounds">{researchResult.plan.totalSearchRounds} rounds</span>}
              </div>
              <button className="ed-rp-close" onClick={() => setResearchPanelOpen(false)}>×</button>
            </div>

            <div className="ed-rp-body">
              {/* Pipeline info card */}
              {researchResult.plan && (
                <div className="ed-rp-card ed-rp-pipeline">
                  <div className="ed-rp-card-label">Research Pipeline</div>
                  <div className="ed-rp-pipeline-stats">
                    <span>{researchResult.sources?.length || 0} sources</span>
                    <span>{researchResult.plan.queries?.length || 0} queries</span>
                    <span>{researchResult.plan.totalSearchRounds || 1} search {researchResult.plan.totalSearchRounds > 1 ? "rounds" : "round"}</span>
                    {researchResult.synthesis?.confidenceScore != null && (
                      <span className="ed-rp-confidence">
                        {Math.round(researchResult.synthesis.confidenceScore * 100)}% confidence
                      </span>
                    )}
                  </div>
                  {researchResult.plan.subTopics?.length > 0 && (
                    <div className="ed-rp-subtopics">
                      {researchResult.plan.subTopics.map((st, i) => (
                        <span key={i} className="ed-rp-tag">{st}</span>
                      ))}
                    </div>
                  )}
                  {researchResult.plan.gaps?.length > 0 && (
                    <div className="ed-rp-gaps">
                      <small>Gaps identified:</small>
                      {researchResult.plan.gaps.map((g, i) => (
                        <span key={i} className="ed-rp-gap">{g}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Thesis card */}
              <div className="ed-rp-card">
                <div className="ed-rp-card-label">Thesis</div>
                <p className="ed-rp-thesis">{researchResult.synthesis?.thesis}</p>
              </div>

              {/* Suggested title */}
              {researchResult.synthesis?.suggestedTitle && (
                <div className="ed-rp-card">
                  <div className="ed-rp-card-label">Suggested Title</div>
                  <p className="ed-rp-title-suggest">{researchResult.synthesis.suggestedTitle}</p>
                </div>
              )}

              {/* Outline */}
              {researchResult.synthesis?.outline?.length > 0 && (
                <div className="ed-rp-card">
                  <div className="ed-rp-card-label">Outline</div>
                  <ol className="ed-rp-outline">
                    {researchResult.synthesis.outline.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Key Takeaways */}
              {researchResult.synthesis?.keyTakeaways?.length > 0 && (
                <div className="ed-rp-card">
                  <div className="ed-rp-card-label">Key Takeaways</div>
                  <ul className="ed-rp-takeaways">
                    {researchResult.synthesis.keyTakeaways.map((item, i) => (
                      <li key={i}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Sources */}
              {researchResult.sources?.length > 0 && (
                <div className="ed-rp-card">
                  <div className="ed-rp-card-label">Sources ({researchResult.sources.length})</div>
                  <ul className="ed-rp-sources">
                    {researchResult.sources.slice(0, 10).map((src) => (
                      <li key={src.id}>
                        <a href={src.url} target="_blank" rel="noopener noreferrer">
                          {src.title}
                        </a>
                        <span className="ed-rp-domain">{src.domain}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="ed-rp-actions">
                <button className="ed-btn primary sm" onClick={buildDraftFromResearch}>Build Draft</button>
                <button className="ed-btn ghost sm" onClick={insertResearchSummary}>Insert Summary</button>
                <button className="ed-btn ghost sm" onClick={copySourcesToClipboard}>Copy Sources</button>
              </div>

              {/* Follow-up chat */}
              <div className="ed-rp-followup">
                <div className="ed-rp-card-label">Follow-up Questions</div>
                <div className="ed-rp-messages">
                  {followUpMessages.map((msg, i) => (
                    <div key={i} className={`ed-rp-msg ${msg.role}`}>
                      <div className="ed-rp-msg-text">{msg.text}</div>
                      {msg.role === "assistant" && (
                        <button className="ed-rp-insert-btn" onClick={() => insertFollowUpAsBlock(msg.text)} title="Insert as block">
                          + Insert
                        </button>
                      )}
                    </div>
                  ))}
                  {followUpLoading && (
                    <div className="ed-rp-msg assistant">
                      <span className="spinner" /> Thinking…
                    </div>
                  )}
                </div>
                <div className="ed-rp-followup-input">
                  <input
                    type="text"
                    className="ed-input"
                    placeholder="Ask a follow-up question…"
                    value={followUpInput}
                    onChange={(e) => setFollowUpInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && askFollowUp()}
                    disabled={followUpLoading}
                  />
                  <button className="ed-btn primary sm" onClick={askFollowUp} disabled={followUpLoading || !followUpInput.trim()}>
                    Ask
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
=======
   TONE & SLASH COMMAND DEFINITIONS
   ═══════════════════════════════════════════════════ */
const TONE_OPTIONS = ["formal", "conversational", "technical", "persuasive"];

const SLASH_COMMANDS = [
    { cmd: "/h1", label: "Heading 1", icon: "H1", type: "heading" },
    { cmd: "/h2", label: "Heading 2", icon: "H2", type: "heading-h3" },
    { cmd: "/quote", label: "Blockquote", icon: "❝", type: "quote" },
    { cmd: "/code", label: "Code Block", icon: "</>", type: "code" },
    { cmd: "/divider", label: "Divider", icon: "—", type: "divider" },
    { cmd: "/image", label: "Image", icon: "▣", type: "image" },
    { cmd: "/ai", label: "AI Co-Pilot", icon: "✦", type: "ai" },
];

const AI_SLASH_COMMANDS = [
    { cmd: "/ai continue", label: "Continue writing", action: "continue" },
    { cmd: "/ai rewrite", label: "Rewrite selection", action: "rewrite" },
    { cmd: "/ai shorter", label: "Make shorter", action: "shorter" },
    { cmd: "/ai longer", label: "Expand", action: "longer" },
    { cmd: "/ai outline", label: "Generate outline", action: "outline" },
    { cmd: "/ai research", label: "Research topic", action: "research" },
];

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

    const [title, setTitle] = useState(isNew ? "" : "The Future of European Fintech Infrastructure");
    const [subtitle, setSubtitle] = useState(isNew ? "" : "Why Europe's regulatory moat is becoming its biggest competitive advantage.");
    const [blocks, setBlocks] = useState(isNew ? [
        { id: "b1", type: "paragraph", content: "" },
    ] : [
        { id: "b1", type: "paragraph", content: "While Silicon Valley moves fast and breaks things, Europe has been quietly building something more durable: a regulatory framework that actually works for fintech innovation." },
        { id: "b2", type: "heading", content: "The Infrastructure Layer" },
        { id: "b3", type: "paragraph", content: "The real opportunity isn't in consumer-facing fintech apps. It's in the plumbing. The APIs, the settlement layers, the compliance engines." },
        { id: "b4", type: "quote", content: "The best time to build financial infrastructure in Europe was five years ago. The second best time is now." },
        { id: "b5", type: "paragraph", content: "Every B2B payment that crosses a border reveals the cracks in legacy banking infrastructure. SWIFT was built for a world of batch processing and paper trails — not real-time settlement and programmable money." },
        { id: "b6", type: "code", content: "const transfer = await stablecoinRail.send({\n  from: vIBAN_sender,\n  to: vIBAN_receiver,\n  amount: 50000,\n  asset: \"EURC\",\n});" },
        { id: "b7", type: "paragraph", content: "" },
    ]);

    const [focusMode, setFocusMode] = useState(false);
    const [activeBlockId, setActiveBlockId] = useState(null);
    const [slashMenu, setSlashMenu] = useState(null);
    const [slashFilter, setSlashFilter] = useState("");
    const [slashIndex, setSlashIndex] = useState(0);
    const [aiInline, setAiInline] = useState(null); // { blockId, action, fieldType }
    const [aiLoading, setAiLoading] = useState(false);
    const [aiResult, setAiResult] = useState(null);
    const [aiStreaming, setAiStreaming] = useState("");
    const [customPrompt, setCustomPrompt] = useState("");
    const [aiModel, setAiModel] = useState("claude"); // "claude" or "gpt"
    const [aiChatHistory, setAiChatHistory] = useState([]); // [{ role, fieldType, prompt, response }]
    const [showTitleGen, setShowTitleGen] = useState(false);
    const [titleSuggestions, setTitleSuggestions] = useState([]);
    const [titlesLoading, setTitlesLoading] = useState(false);
    const [cmdOpen, setCmdOpen] = useState(false);
    const [saveStatus, setSaveStatus] = useState("saved");
    const [detectedTone, setDetectedTone] = useState("conversational");
    const [seoScore, setSeoScore] = useState(72);
    const [dragId, setDragId] = useState(null);
    const [researchOpen, setResearchOpen] = useState(false);
    const [researchTopic, setResearchTopic] = useState("");
    const [researchResult, setResearchResult] = useState("");
    const [researchStreaming, setResearchStreaming] = useState("");
    const [researchLoading, setResearchLoading] = useState(false);
    const [researchQueries, setResearchQueries] = useState([]);
    const [researchStatus, setResearchStatus] = useState("");
    const [researchSources, setResearchSources] = useState(0);

    const blockRefs = useRef({});
    const aiInlineRef = useRef(aiInline);
    const slashMenuRef = useRef(slashMenu);

    // Keep refs in sync for keyboard shortcuts
    useEffect(() => { aiInlineRef.current = aiInline; }, [aiInline]);
    useEffect(() => { slashMenuRef.current = slashMenu; }, [slashMenu]);

    // Auto-detect tone from content
    useEffect(() => {
        const allText = blocks.map(b => b.content).join(" ").toLowerCase();
        if (allText.includes("furthermore") || allText.includes("consequently")) setDetectedTone("formal");
        else if (allText.includes("function") || allText.includes("const") || allText.includes("api")) setDetectedTone("technical");
        else if (allText.includes("you") || allText.includes("let's")) setDetectedTone("conversational");
        else setDetectedTone("persuasive");
    }, [blocks]);

    // Update SEO score
    useEffect(() => {
        const wordCount = getWordCount();
        let score = 50;
        if (title.length > 20 && title.length < 80) score += 15;
        if (subtitle.length > 40) score += 10;
        if (wordCount > 500) score += 10;
        if (blocks.some(b => b.type === "heading")) score += 8;
        if (wordCount > 1000) score += 7;
        setSeoScore(Math.min(98, score));
    }, [title, subtitle, blocks]);

    // Global keyboard shortcuts
    useEffect(() => {
        const handler = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setCmdOpen(o => !o); }
            if ((e.metaKey || e.ctrlKey) && e.key === "t") { e.preventDefault(); generateTitles(); }
            if ((e.metaKey || e.ctrlKey) && e.key === "s") { e.preventDefault(); handleSave(); }
            if (e.key === "Escape") {
                if (aiInlineRef.current) { setAiInline(null); setAiResult(null); setAiStreaming(""); setAiLoading(false); }
                // slashMenu ESC is handled at the block level in handleBlockKeyDown
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, []);

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

    const handleSave = () => {
        setSaveStatus("saving");
        setTimeout(() => setSaveStatus("saved"), 600);
    };

    // Block operations
    const updateBlock = (id, content) => {
        setBlocks(prev => prev.map(b => b.id === id ? { ...b, content } : b));
        setSaveStatus("unsaved");
    };

    const addBlockAfter = (afterId, type = "paragraph", content = "") => {
        const newId = `b${Date.now()}`;
        setBlocks(prev => {
            const idx = prev.findIndex(b => b.id === afterId);
            const newBlocks = [...prev];
            newBlocks.splice(idx + 1, 0, { id: newId, type, content });
            return newBlocks;
        });
        setTimeout(() => {
            if (blockRefs.current[newId]) blockRefs.current[newId].focus();
        }, 50);
        return newId;
    };

    const deleteBlock = (id) => {
        if (blocks.length <= 1) return;
        const idx = blocks.findIndex(b => b.id === id);
        setBlocks(prev => prev.filter(b => b.id !== id));
        const prevBlock = blocks[idx - 1];
        if (prevBlock && blockRefs.current[prevBlock.id]) {
            blockRefs.current[prevBlock.id].focus();
        }
    };

    // Handle block key events
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

        // Normal block key handling (runs whether or not slash menu was open)
        if (e.key === "Enter" && !e.shiftKey && block.type !== "code" && !slashMenu) {
            e.preventDefault();
            addBlockAfter(block.id);
        }
        if (e.key === "Backspace" && block.content === "" && blocks.length > 1) {
            e.preventDefault();
            deleteBlock(block.id);
        }
    };

    const handleBlockInput = (e, block) => {
        const value = e.target.value ?? e.target.textContent ?? "";
        updateBlock(block.id, value);

        // Markdown shortcuts
        if (value === "## ") {
            updateBlock(block.id, "");
            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, type: "heading", content: "" } : b));
        }
        if (value === "### ") {
            updateBlock(block.id, "");
            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, type: "heading-h3", content: "" } : b));
        }
        if (value === "> ") {
            updateBlock(block.id, "");
            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, type: "quote", content: "" } : b));
        }
        if (value === "```") {
            updateBlock(block.id, "");
            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, type: "code", content: "" } : b));
        }
        if (value === "---") {
            setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, type: "divider", content: "" } : b));
            addBlockAfter(block.id);
        }

        // Slash menu: open when value is exactly "/"
        if (value === "/" && !slashMenu) {
            setSlashMenu(block.id);
            setSlashFilter("");
            setSlashIndex(0);
        } else if (slashMenu && value.startsWith("/")) {
            setSlashFilter(value);
            setSlashIndex(0);
        } else if (slashMenu && !value.startsWith("/")) {
            // Closed naturally by deleting the "/"
            setSlashMenu(null);
            setSlashFilter("");
        }
    };

    const getFilteredSlashCommands = () => {
        const all = [...SLASH_COMMANDS, ...AI_SLASH_COMMANDS.map(a => ({ ...a, icon: "✦", type: "ai" }))];
        if (!slashFilter) return all;
        return all.filter(c => (c.cmd || c.label).toLowerCase().includes(slashFilter.toLowerCase()));
    };

    const executeSlashCommand = (cmd, blockId) => {
        setSlashMenu(null);

        if (cmd.action) {
            if (cmd.action === "research") {
                updateBlock(blockId, "");
                setResearchOpen(true);
                return;
            }
            setAiInline({ blockId, action: cmd.action });
            updateBlock(blockId, "");
            return;
        }

        if (cmd.type === "divider") {
            setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, type: "divider", content: "" } : b));
            addBlockAfter(blockId);
        } else if (cmd.type === "ai") {
            setAiInline({ blockId, action: null });
            updateBlock(blockId, "");
        } else {
            setBlocks(prev => prev.map(b => b.id === blockId ? { ...b, type: cmd.type, content: "" } : b));
        }
    };

    /* ═══════════════════════════════════════════════════
       AI EXECUTION — Real Claude streaming with history
       ═══════════════════════════════════════════════════ */
    const executeAI = async (action, input) => {
        setAiLoading(true);
        setAiResult(null);
        setAiStreaming("");

        const fieldType = aiInline ? getFieldType(aiInline.blockId) : "paragraph";
        const fieldContent = aiInline ? getFieldContent(aiInline.blockId) : input;
        let accumulated = "";

        await streamAI({
            action,
            input: input || "",
            context: getStructuredContext(),
            fieldType,
            fieldContent,
            chatHistory: aiChatHistory.slice(-10), // last 10 interactions
            model: aiModel,
            onChunk: (text) => {
                accumulated += text;
                setAiStreaming(accumulated);
            },
            onDone: () => {
                setAiResult(accumulated);
                setAiStreaming("");
                setAiLoading(false);
                // Save to chat history
                setAiChatHistory(prev => [...prev, {
                    role: "assistant",
                    fieldType,
                    prompt: `[${action}] on ${fieldType}: "${(input || "").substring(0, 100)}"`,
                    response: accumulated.substring(0, 300),
                    timestamp: Date.now(),
                }]);
            },
            onError: (err) => {
                setAiResult(`Error: ${err}`);
                setAiStreaming("");
                setAiLoading(false);
            },
        });
    };

    const executeCustomAI = async () => {
        if (!customPrompt.trim()) return;
        setAiLoading(true);
        setAiResult(null);
        setAiStreaming("");

        const fieldType = aiInline ? getFieldType(aiInline.blockId) : "paragraph";
        const fieldContent = aiInline ? getFieldContent(aiInline.blockId) : "";
        let accumulated = "";
        const promptText = customPrompt;
        setCustomPrompt("");

        await streamAI({
            action: "custom",
            input: fieldContent,
            context: getStructuredContext(),
            customPrompt: promptText,
            fieldType,
            fieldContent,
            chatHistory: aiChatHistory.slice(-10),
            model: aiModel,
            onChunk: (text) => {
                accumulated += text;
                setAiStreaming(accumulated);
            },
            onDone: () => {
                setAiResult(accumulated);
                setAiStreaming("");
                setAiLoading(false);
                setAiChatHistory(prev => [...prev, {
                    role: "assistant",
                    fieldType,
                    prompt: promptText.substring(0, 100),
                    response: accumulated.substring(0, 300),
                    timestamp: Date.now(),
                }]);
            },
            onError: (err) => {
                setAiResult(`Error: ${err}`);
                setAiStreaming("");
                setAiLoading(false);
            },
        });
    };

    const insertAiResult = () => {
        if (!aiResult || !aiInline) return;
        if (aiInline.blockId === "__title__") {
            setTitle(aiResult.trim());
        } else if (aiInline.blockId === "__subtitle__") {
            setSubtitle(aiResult.trim());
        } else {
            addBlockAfter(aiInline.blockId, "paragraph", aiResult);
        }
        setAiInline(null);
        setAiResult(null);
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
        setBlocks(newBlocks);
    };
    const handleDragEnd = () => setDragId(null);

    /* ═══ REUSABLE AI INLINE PANEL ═══ */
    const AiInlinePanel = ({ fieldLabel }) => {
        const fieldType = getFieldType(aiInline?.blockId);
        const fieldContent = getFieldContent(aiInline?.blockId);
        return (
            <div className="ai-inline" style={{ marginBottom: "12px" }}>
                <div className="ai-inline-header" style={{ justifyContent: "space-between" }}>
                    <span><span>✦</span> AI Co-Pilot — <strong>{fieldLabel || fieldType}</strong>
                        {fieldContent ? <span style={{ fontSize: "0.58rem", color: "var(--muted)", marginLeft: "8px" }}>“{fieldContent.substring(0, 60)}{fieldContent.length > 60 ? "…" : ""}”</span> : null}
                    </span>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <div style={{ display: "flex", borderRadius: "4px", overflow: "hidden", border: "1px solid var(--line-strong)", fontSize: "0.6rem" }}>
                            <button
                                onClick={() => setAiModel("claude")}
                                style={{ padding: "2px 8px", background: aiModel === "claude" ? "var(--accent)" : "transparent", color: aiModel === "claude" ? "#000" : "var(--muted)", border: "none", cursor: "pointer", fontWeight: 600 }}
                            >Claude</button>
                            <button
                                onClick={() => setAiModel("gpt")}
                                style={{ padding: "2px 8px", background: aiModel === "gpt" ? "var(--accent)" : "transparent", color: aiModel === "gpt" ? "#000" : "var(--muted)", border: "none", cursor: "pointer", fontWeight: 600 }}
                            >GPT-5-mini</button>
                        </div>
                        <button className="btn btn-ghost btn-sm" onClick={() => { setAiInline(null); setAiResult(null); setAiStreaming(""); setAiLoading(false); }} style={{ padding: "2px 8px", fontSize: "0.72rem" }}>✕</button>
                    </div>
                </div>

                {/* Recent history */}
                {aiChatHistory.length > 0 && (
                    <div style={{ marginBottom: "8px", maxHeight: "100px", overflowY: "auto", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                        <div style={{ fontSize: "0.56rem", color: "var(--muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "4px" }}>Recent</div>
                        {aiChatHistory.slice(-3).map((h, i) => (
                            <div key={i} style={{ fontSize: "0.62rem", color: "var(--muted)", padding: "2px 0", display: "flex", gap: "6px" }}>
                                <span style={{ color: "var(--accent)" }}>✦</span>
                                <span>{h.prompt} → <em>{h.response.substring(0, 50)}…</em></span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="ai-inline-actions">
                    {AI_SLASH_COMMANDS.map(cmd => (
                        <button key={cmd.action} className="btn btn-ghost btn-sm" onClick={() => executeAI(cmd.action, fieldContent)} disabled={aiLoading}>{cmd.label}</button>
                    ))}
                </div>

                {/* Custom prompt */}
                <div style={{ marginTop: "10px", display: "flex", gap: "6px" }}>
                    <input
                        style={{ flex: 1, padding: "7px 12px", border: "1px solid var(--line-strong)", borderRadius: "6px", background: "var(--bg-0)", color: "var(--text)", fontFamily: "var(--font-mono)", fontSize: "0.72rem", outline: "none", caretColor: "var(--accent)" }}
                        placeholder="Type a custom prompt… e.g. 'make this more persuasive'"
                        value={customPrompt}
                        onChange={e => setCustomPrompt(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); executeCustomAI(); } }}
                        disabled={aiLoading}
                        autoFocus
                    />
                    <button className="btn btn-primary btn-sm" onClick={executeCustomAI} disabled={aiLoading || !customPrompt.trim()}>⏎</button>
                </div>

                {/* Streaming */}
                {aiLoading && (
                    <div style={{ marginTop: "10px" }}>
                        <div style={{ color: "var(--accent)", fontSize: "0.68rem", marginBottom: "6px" }}>✦ {aiStreaming ? "Streaming…" : "Thinking…"}</div>
                        {aiStreaming ? (
                            <div className="ai-result" style={{ opacity: 0.85 }}>{aiStreaming}<span className="ai-cursor">▊</span></div>
                        ) : (<><div className="skeleton-line w80" style={{ marginTop: "4px" }} /><div className="skeleton-line w60" /></>)}
                    </div>
                )}

                {/* Result */}
                {aiResult && !aiLoading && (
                    <div className="ai-result">
                        {aiResult}
                        <div className="ai-result-actions">
                            <button className="btn btn-primary btn-sm" onClick={insertAiResult}>↵ Insert</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => executeAI(aiInline?.action || "rewrite", aiResult)}>↻ Retry</button>
                            <button className="btn btn-ghost btn-sm" onClick={() => { setAiResult(null); setAiInline(null); }}>Dismiss</button>
                        </div>
                    </div>
                )}
            </div>
        );
    };

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
                    model: aiModel,
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
        // Split into paragraphs and add as new blocks
        const paragraphs = content.split("\n\n").filter(Boolean);
        let lastId = blocks[blocks.length - 1]?.id || "b1";
        paragraphs.forEach((p) => {
            const isHeading = p.startsWith("## ") || p.startsWith("# ");
            const newId = `b${Date.now()}${Math.random().toString(36).slice(2, 6)}`;
            setBlocks(prev => {
                const idx = prev.findIndex(b => b.id === lastId);
                const newBlocks = [...prev];
                newBlocks.splice(idx + 1, 0, {
                    id: newId,
                    type: isHeading ? "heading" : "paragraph",
                    content: isHeading ? p.replace(/^#+\s*/, "").replace(/[📊🏢📈🔥💡🔗]\s*/g, "") : p,
                });
                return newBlocks;
            });
            lastId = newId;
        });
        setResearchOpen(false);
    };

    const ResearchPanel = () => {
        if (!researchOpen) return null;
        const displayContent = researchStreaming || researchResult;
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
                        <div style={{ fontSize: "0.82rem", fontWeight: 700, color: "var(--text)" }}>🔍 Research Agent</div>
                        <div style={{ fontSize: "0.6rem", color: "var(--muted)", marginTop: "2px" }}>
                            Multi-query deep search · {aiModel === "gpt" ? "GPT-5-mini" : "Claude"}
                        </div>
                    </div>
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={() => { setResearchOpen(false); setResearchLoading(false); }}
                        style={{ padding: "4px 10px", fontSize: "0.8rem" }}
                    >✕</button>
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
                                📄 {researchSources} sources found
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
                            <div style={{ fontSize: "2rem", marginBottom: "12px" }}>🔍</div>
                            Enter a topic above to start a deep research session.
                            <br />The agent will search multiple angles and synthesize findings.
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
                    {displayContent && (
                        <div style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
                            {displayContent}
                            {researchStreaming && <span className="ai-cursor">▊</span>}
                        </div>
                    )}
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

    /* ═══ RENDER ═══ */
    return (
        <div className="editor-layout">
            {/* Editor topbar */}
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
                    <button className="btn btn-ghost btn-sm" onClick={() => setResearchOpen(true)}>
                        🔍 Research
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={generateTitles} title="⌘T">
                        ✦ Titles
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setCmdOpen(true)}>
                        ⌘K
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleSave}>
                        Publish
                    </button>
                </div>
            </div>

            {/* Editor canvas */}
            <div className="editor-canvas">
                <input
                    className="editor-title-input"
                    placeholder="Post title… (type / for AI)"
                    value={title}
                    onChange={e => { setTitle(e.target.value); setSaveStatus("unsaved"); }}
                    onKeyDown={e => {
                        if (e.key === "/") {
                            e.preventDefault();
                            setAiInline({ blockId: "__title__", action: null, fieldType: "title" });
                        }
                    }}
                />
                {/* AI panel for title */}
                {aiInline && aiInline.blockId === "__title__" && <AiInlinePanel fieldLabel="Title" />}

                <input
                    className="editor-subtitle-input"
                    placeholder="Add a subtitle… (type / for AI)"
                    value={subtitle}
                    onChange={e => { setSubtitle(e.target.value); setSaveStatus("unsaved"); }}
                    onKeyDown={e => {
                        if (e.key === "/") {
                            e.preventDefault();
                            setAiInline({ blockId: "__subtitle__", action: null, fieldType: "subtitle" });
                        }
                    }}
                />
                {/* AI panel for subtitle */}
                {aiInline && aiInline.blockId === "__subtitle__" && <AiInlinePanel fieldLabel="Subtitle" />}

                {/* Blocks */}
                {blocks.map((block) => (
                    <div
                        key={block.id}
                        className={`block ${focusMode && activeBlockId !== block.id ? "dimmed" : ""}`}
                        draggable
                        onDragStart={() => handleDragStart(block.id)}
                        onDragOver={(e) => handleDragOver(e, block.id)}
                        onDragEnd={handleDragEnd}
                    >
                        <div className="block-grab">⠿</div>

                        {block.type === "divider" ? (
                            <div className="block-divider" />
                        ) : block.type === "code" ? (
                            <div className="code-block" style={{ margin: "8px 0" }}>
                                <div className="code-block-header">
                                    <div className="code-block-dots"><span /><span /><span /></div>
                                    <span className="code-block-lang">code</span>
                                </div>
                                <textarea
                                    ref={el => blockRefs.current[block.id] = el}
                                    value={block.content}
                                    onChange={e => updateBlock(block.id, e.target.value)}
                                    onFocus={() => setActiveBlockId(block.id)}
                                    style={{
                                        width: "100%",
                                        minHeight: "80px",
                                        padding: "16px",
                                        border: "none",
                                        background: "transparent",
                                        color: "#c5d0de",
                                        fontFamily: "var(--font-mono)",
                                        fontSize: "0.82rem",
                                        lineHeight: "1.65",
                                        outline: "none",
                                        resize: "vertical",
                                        caretColor: "var(--accent)",
                                    }}
                                    placeholder="Write code…"
                                />
                            </div>
                        ) : block.type === "quote" ? (
                            <div className="block-quote">
                                <textarea
                                    ref={el => blockRefs.current[block.id] = el}
                                    className="block-content"
                                    value={block.content}
                                    onChange={e => handleBlockInput(e, block)}
                                    onKeyDown={e => handleBlockKeyDown(e, block)}
                                    onFocus={() => setActiveBlockId(block.id)}
                                    placeholder="Write a quote…"
                                    rows={1}
                                    style={{ fontStyle: "italic", resize: "none" }}
                                />
                            </div>
                        ) : (
                            <textarea
                                ref={el => blockRefs.current[block.id] = el}
                                className={`block-content ${block.type === "heading" ? "heading" : ""} ${block.type === "heading-h3" ? "heading-h3" : ""}`}
                                value={block.content}
                                onChange={e => handleBlockInput(e, block)}
                                onKeyDown={e => handleBlockKeyDown(e, block)}
                                onFocus={() => setActiveBlockId(block.id)}
                                placeholder={block.type === "heading" ? "Heading…" : block.type === "heading-h3" ? "Subheading…" : "Write something, or type / for commands…"}
                                rows={1}
                                style={{ resize: "none" }}
                            />
                        )}

                        {/* Slash command menu */}
                        {slashMenu === block.id && (
                            <div className="slash-menu">
                                <div className="slash-menu-title" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                    <span>Commands</span>
                                    <button onClick={() => setSlashMenu(null)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: "0.72rem", padding: "0 4px" }}>✕</button>
                                </div>
                                {getFilteredSlashCommands().map((cmd, i) => (
                                    <div
                                        key={cmd.cmd || cmd.label}
                                        className={`slash-menu-item ${i === slashIndex ? "active" : ""}`}
                                        onClick={() => executeSlashCommand(cmd, block.id)}
                                        onMouseEnter={() => setSlashIndex(i)}
                                    >
                                        <span className="icon">{cmd.icon}</span>
                                        {cmd.label}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* AI inline prompt */}
                        {aiInline && aiInline.blockId === block.id && <AiInlinePanel fieldLabel={block.type} />}
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

            <CommandBar />
            <TitleGenModal />
            <ResearchPanel />
        </div>
    );
>>>>>>> 5b5058c3e16e07d1a2d462924acbc2009bbcbd78
}
