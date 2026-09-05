# 22封时光信 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first birthday treasure-hunt web MVP with a playable three-chapter flow, persistent local progress, abstract Shenyang route map, puzzle interactions, and a final 22-flower reveal.

**Architecture:** A Vite + React single-page app uses a small reducer-driven game state and localStorage for a private single-room experience. The first release uses an abstract route map and simulated check-ins; AMap integration is isolated behind environment variables and can be enabled after deployment without changing the game flow.

**Tech Stack:** Vite, React, TypeScript, CSS Modules via a single stylesheet, Vitest for reducer tests, Web Share API with clipboard fallback.

---

### Task 1: Project shell and state contract

**Files:**
- Create: `package.json`, `index.html`, `tsconfig.json`, `vite.config.ts`, `.env.example`
- Create: `src/main.tsx`, `src/App.tsx`, `src/game.ts`
- Test: `src/game.test.ts`

- [ ] Write reducer tests for initial state, completing a task, and unlocking the next chapter.
- [ ] Run Vitest and confirm the tests fail because the reducer is not implemented.
- [ ] Implement the smallest typed reducer and localStorage helpers.
- [ ] Run Vitest and confirm all state tests pass.

### Task 2: Visual system and playable screens

**Files:**
- Create: `src/styles.css`
- Modify: `src/App.tsx`

- [ ] Add the invite screen, chapter header, abstract route map, task panel, and progress rail using the design tokens in `DESIGN.md`.
- [ ] Add accessible controls for chapter navigation, task completion, hints, and reduced motion.
- [ ] Connect every control to the reducer and persist progress.
- [ ] Run the production build and verify no TypeScript errors.

### Task 3: Puzzle interactions and final reveal

**Files:**
- Modify: `src/App.tsx`, `src/game.ts`, `src/styles.css`

- [ ] Add keyword selection, photo puzzle simulation, memory ordering, messenger cards, code entry, and 22-flower unlock states.
- [ ] Add final share/download affordances with Web Share fallback.
- [ ] Add AMap environment hooks without exposing the security code in production.
- [ ] Run tests and build again.

### Task 4: Responsive and runtime verification

**Files:**
- Modify: `index.html`, `src/styles.css`

- [ ] Start the Vite dev server and inspect mobile and desktop layouts with browser screenshots.
- [ ] Fix overflow, tap target, focus, and reduced-motion issues discovered during inspection.
- [ ] Run the final test and build commands before handoff.
