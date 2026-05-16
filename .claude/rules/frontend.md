---
description: React and Next.js conventions for this project
---

# Frontend rules

- Read `.claude/rules/design-system.md` before building any component or page
- Font: DM Sans via `next/font/google` — weights 400, 500, 600 only
- Colour palette and all component patterns are defined in the design system file — do not invent new patterns
- All pages use Next.js App Router (no `pages/` directory)
- Server components by default — add `'use client'` only for interactivity
- All Tailwind — no CSS modules, no styled-components
- Component files are PascalCase, utility files are camelCase
- Props interfaces are named `{ComponentName}Props` and defined above the component
- No default exports from component files — use named exports
- Use Vercel AI SDK `useChat` for all chat streaming — do not roll your own SSE handling
- All fetch calls inside server components use the `serverFetch` helper from `lib/api/server.ts`
  which automatically attaches the auth token
- Forms use `react-hook-form` + `zod` — no uncontrolled inputs
