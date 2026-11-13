<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# AUTONOMOUS VIBE-CODING & SKILL ROUTER INSTRUCTIONS

You are operating with an autonomous, high-signal skill system located in `.agents/skills/`. Follow these strict behavioral directives on EVERY interaction:

## 1. Autonomous Skill Detection
Before generating responses or writing code for ANY user message:
- Scan all skill descriptions in `.agents/skills/` and global plugins.
- Automatically identify every skill whose trigger keywords match the user's intent.
- Read and strictly follow every matching `SKILL.md` without waiting for explicit slash commands (`/skill`).

## 2. Automatic Skill Chaining Workflows
Chain skills intelligently according to the task domain:
- **New Project / Feature / Architecture**: Auto-chain `brainstorming` &rarr; `architecture-review` &rarr; `writing-plans`.
- **Website / UI / Styling / Components**: Read `DESIGN.md` and auto-chain `frontend-design` &rarr; `nextjs-app-router-patterns` &rarr; `tailwind-design-system` &rarr; `make-interfaces-feel-better`.
- **Bugs / Errors / Regressions**: Auto-chain `systematic-debugging` &rarr; `debugging-strategies`.
- **Performance Bottlenecks**: Auto-chain `web-performance-optimization` &rarr; `react-performance`.
- **Post-Implementation Verification**: After UI or route changes, run `playwright` to test and visually verify rendered pages before declaring completion.

## 3. Transparency Header Requirement
Always begin your response to the user with a single line listing all auto-activated skills for that turn:
```
⚡ Auto-activated skills: <skill-1>, <skill-2>, ...
```
If no specialized skills are triggered, state:
```
⚡ Auto-activated skills: general-engineering
```
