"use client";

import { useMemo, useState, useCallback, useEffect, useRef, use } from "react";
import Link from "next/link";

/* ═══════════════════════════════════════════════════
   DATA & CONSTANTS
   ═══════════════════════════════════════════════════ */

const EXISTING_DRAFT = {
  title: "The Future of European Fintech Infrastructure",
  subtitle:
    "Why Europe's regulatory moat is becoming its biggest competitive advantage.",
  blocks: [
    {
      type: "paragraph",
      content:
        "While Silicon Valley moves fast and breaks things, Europe has been quietly building something more durable: a regulatory framework that actually works for fintech innovation.",
    },
    { type: "heading", content: "The Infrastructure Layer" },
    {
      type: "paragraph",
      content:
        "The real opportunity is in the plumbing: APIs, settlement layers, and compliance engines.",
    },
    {
      type: "quote",
      content:
        "The best time to build financial infrastructure in Europe was five years ago. The second best time is now.",
    },
  ],
};

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

  /* ── State ── */
  const [title, setTitle] = useState(isNew ? "" : EXISTING_DRAFT.title);
  const [subtitle, setSubtitle] = useState(isNew ? "" : EXISTING_DRAFT.subtitle);
  const [blocks, setBlocks] = useState(
    isNew ? withIds([{ type: "paragraph", content: "" }]) : withIds(EXISTING_DRAFT.blocks)
  );
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

  function saveDraft() {
    setSaveStatus("saving");
    setTimeout(() => setSaveStatus("saved"), 500);
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
          <button className="ed-btn primary" onClick={saveDraft}>Publish</button>
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
}
