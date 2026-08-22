# AGENTS.md

## Overview

This is a Next.js + TypeScript AI chat application that connects LLMs with external services through MCP.

Keep the architecture simple and optimized for fast iteration.

```text
Browser → Next.js → LLM → MCP → External APIs
```

LLM orchestration, MCP communication, and secrets must remain server-side.

## Tech Stack

- Next.js (App Router)
- React
- TypeScript
- Node.js
- Model Context Protocol (MCP)
- LLM APIs

Prefer existing dependencies and conventions.

## Project Structure

```text
app/
  api/          # Server API routes
components/     # React components
lib/
  llm/          # LLM integration
  mcp/          # MCP clients
  tools/        # Tool definitions and routing
types/          # Shared types
```

Keep business logic out of React components.

## Development

Use the package manager configured in the repository.

```bash
yarn install
yarn dev
yarn lint
yarn build
```

Run relevant lint, type-check, tests, and build before completing changes.

## TypeScript

- Use TypeScript for new code.
- Avoid `any`; prefer `unknown` and narrow it.
- Define explicit types for API responses, MCP results, tool calls, and structured LLM output.
- Validate untrusted external data.

## Next.js

- Use the App Router.
- Prefer Server Components unless client-side interactivity is required.
- Keep LLM and MCP calls server-side.
- Use Route Handlers under `app/api/` for server APIs.
- Do not add `"use client"` unnecessarily.

## MCP

Keep MCP logic centralized in `lib/mcp/`.

Prefer domain-oriented tools such as:

```text
search_nearby_facilities
get_public_transport
get_safety_facilities
analyze_area
```

Avoid exposing every external REST endpoint as an MCP tool.

For MCP calls:

- validate tool arguments
- validate responses
- use reasonable timeouts
- limit tool-call rounds
- handle failures gracefully
- reuse connections when appropriate

Never expose MCP credentials to the browser.

## LLM

The LLM should handle reasoning and tool selection, not application security.

Do not give the model unrestricted access to:

- shell commands
- filesystem paths
- arbitrary URLs
- databases
- secrets

Prefer structured responses when the UI needs structured data.

```json
{
  "message": "This area has good transportation access.",
  "data": {
    "score": 82,
    "transport": 91
  }
}
```

Render structured data with React rather than asking the LLM to generate UI markup.

## Environment Variables

Store secrets in `.env.local`.

```env
LLM_API_KEY=
PUBLIC_DATA_API_KEY=
MCP_CLIENT_ID=
MCP_CLIENT_SECRET=
```

Never:

- commit secrets
- hardcode API keys
- expose server secrets through `NEXT_PUBLIC_*`

Document required variables in `.env.example`.

## Error Handling

External APIs, LLMs, and MCP servers can fail.

Handle failures gracefully and return useful partial results when possible.

Do not expose:

- stack traces
- API keys
- authorization headers
- internal errors containing sensitive information

## Code Style

- Prefer simple, readable code.
- Keep functions and components focused.
- Use descriptive names.
- Prefer early returns.
- Avoid premature abstractions.
- Follow existing repository conventions.
- Do not refactor unrelated code.
- Remove dead code rather than commenting it out.

## Agent Guidelines

Before changing code:

1. Inspect relevant files.
2. Check `package.json`.
3. Search for existing implementations.
4. Follow existing architecture and conventions.

When implementing:

- make the smallest coherent change
- avoid unnecessary dependencies
- do not silently change public APIs or tool contracts
- do not modify unrelated files

Before finishing:

1. Check TypeScript errors.
2. Run lint.
3. Run relevant tests.
4. Run the production build when practical.
5. Verify no secrets were introduced.
6. Verify important error paths.

Never claim a command passed unless it was actually executed successfully.

## Git Workflow

- Commit convention: `feat: implement code`
- Branch strategy: `feat/connect-mcp`
