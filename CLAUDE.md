# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Terminus is a personal blog + AI-powered writer dashboard built with Next.js 16 (App Router) and Convex (serverless realtime database). Single-user auth via secret hash.

## Commands

```bash
npm run dev        # Start dev server (localhost:3000)
npm run build      # Production build
npm start          # Start production server
```

No test runner or linter is configured.

## Architecture

### Stack
- **Frontend:** Next.js 16 App Router, React 19, all pages are `"use client"` components
- **Backend:** Convex (realtime DB with auto-generated types in `convex/_generated/`)
- **AI:** Claude (Anthropic SDK) for copilot, OpenAI for research synthesis, Tavily for web search
- **Styling:** Plain CSS with variables (no Tailwind/CSS modules) — files split across `app/styles/`
- **State:** React hooks + Convex hooks (`useQuery`, `useMutation`) — no external state library

### Key Routes
| Route | Purpose |
|-------|---------|
| `/` | Public homepage (featured + archive) |
| `/post/[slug]` | Public post viewer |
| `/write` | Writer dashboard (requires auth) |
| `/write/[id]` | Block editor |

### API Routes
| Endpoint | Purpose |
|----------|---------|
| `POST /api/ai` | Streaming copilot (Claude/GPT, SSE) — actions: continue, rewrite, shorter, longer, outline, titles, custom |
| `POST /api/copilot` | Field-level editing assistant (improve, expand, shorten, grammar) |
| `POST /api/research` | Deep research agent — multi-stage pipeline: query decomposition → Tavily search → ranking → gap analysis → second-round search → synthesis |

### Block Editor (`app/write/[id]/page.js`)
The editor is the largest file (~2500 lines). It uses an array of `{ id, type, content, metadata }` blocks supporting paragraph, heading (H2/H3), quote, code, and divider types. Slash commands (`/paragraph`, `/heading`, etc.) insert new blocks. Side panels (research, architect, AI inline) are in `app/write/[id]/components/`.

### Database (Convex)
Single `posts` table defined in `convex/schema.js`. Indexed by `slug` and `status`. Operations in `convex/posts.js`: list, getBySlug, getById, create, update, remove, incrementViews.

### Auth
Secret-based single-user auth. `write/layout.js` checks `sessionStorage` for a hashed secret passed via `?secret=` URL parameter. No OAuth or multi-user support.

## Environment Variables

```bash
OPENAI_API_KEY=         # Required for research synthesis
ANTHROPIC_API_KEY=      # Required for Claude copilot
TAVILY_API_KEY=         # Optional; enables web search in research agent
RESEARCH_MODEL=         # Optional override (default: gpt-5-mini)
COPILOT_MODEL=          # Optional override (default: gpt-5-mini)
NEXT_PUBLIC_CONVEX_URL= # Convex deployment URL
CONVEX_DEPLOYMENT=      # Convex dev deployment ID
```

## Path Alias

`@/*` maps to the project root (configured in `jsconfig.json`).
