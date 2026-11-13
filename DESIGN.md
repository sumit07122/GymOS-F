# FIXIA GymOS — Web Design & Vibe-Coding Standards

This document establishes the visual language, design architecture, and frontend coding standards for GymOS. Every UI component, landing page, dashboard widget, and layout must adhere to these principles.

---

## 1. Technical Stack

- **Framework**: Next.js 16+ (App Router, Server Components & Server Actions)
- **Language**: TypeScript (Strict Mode enabled, explicit types for props and state)
- **Styling**: Tailwind CSS v4 with semantic tokens
- **Component Primitives**: `shadcn/ui` and Radix UI primitives
- **Iconography**: `lucide-react` (clean, consistent 20px / 24px stroke-width icons)

---

## 2. Visual System

### Palette & Dark-Mode Aesthetics
- **Backgrounds**: Dark-mode primary (`#09090b` canvas, `#0f172a` surface elevated cards, `#18181b` subtle hover fills).
- **Accent & Brand**: Deep athletic emerald (`#167a45` for AA accessible primary CTAs, `#1bc95a` for high-impact neon accents and active indicators).
- **Text & Contrast**: High-contrast typography (`#f4f4f5` primary headings, `#a1a1aa` secondary captions, `#71717a` tertiary metadata).
- **Borders & Dividers**: Ultra-crisp 1px borders (`border-white/10` or `border-line` for precise component definition).
- **Surface Elevation**: Subtle backdrop blurs (`backdrop-blur-md bg-white/5` or `bg-surface/90`) with soft, deep shadow drops.

### Micro-Interactions & Transitions
- **Timing**: Snappy `150ms ease-in-out` transitions on interactive elements (`transition-all duration-150 ease-in-out`).
- **Feedback**: Active scale presses (`active:scale-[0.98]`), gentle hover lifts, and distinct focus rings (`focus:ring-2 focus:ring-brand/40`).

---

## 3. Layout & Structure

- **Container Constraint**: Use `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8` wrappers for pages and dashboard grids.
- **Responsive Grids**: Mobile-first grid systems (`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6`).
- **Whitespace & Rhythm**: Generous vertical and horizontal padding (`py-12 lg:py-20`, `space-y-6`) to prevent cramped interfaces.
- **Section-by-Section Modularity**: Decompose complex views into isolated, self-contained components with clean prop contracts.

---

## 4. Zero-Slop Rule

- **No Placeholders**: Never ship placeholder `TODO` comments, dummy `lorem ipsum` in customer flows, or broken image URLs.
- **No Unstyled HTML**: Every button, input, table, and status badge must use styled system primitives.
- **Always Accessible**: Include semantic labels (`aria-label`, `htmlFor`, accessible touch targets >= 44px).
- **Error & Empty States**: Every data view must render a dedicated, polished empty state and a resilient loading skeleton.

