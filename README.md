# Terminus

Personal blog + writer dashboard built with Next.js.

## Run locally

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Writer flows

- `/write` dashboard
- `/write/new` guided post composer (templates + research assistant)
- `/write/[id]` editor

## Research assistant architecture

`POST /api/research` runs an agent-style workflow:

1. Plans multiple focused queries from topic, intent, audience, and depth.
2. Runs web search across sources.
3. Deduplicates and ranks evidence.
4. Synthesizes a post-ready brief with outline and key takeaways.

### Environment variables

Create `.env.local`:

```bash
# Optional but recommended for best synthesis quality
OPENAI_API_KEY=your_openai_key

# Optional search provider (preferred over DDG fallback)
TAVILY_API_KEY=your_tavily_key

# Optional model override
RESEARCH_MODEL=gpt-4.1
```

Behavior:

- `OPENAI_API_KEY + TAVILY_API_KEY`: best mode (broad search + model synthesis).
- `TAVILY_API_KEY` only: good search, deterministic synthesis fallback.
- No keys: DuckDuckGo fallback search + deterministic synthesis fallback.

## Notes

- Research output is designed to seed and structure a draft quickly.
- Source links are surfaced in the UI and can be copied as citations.
