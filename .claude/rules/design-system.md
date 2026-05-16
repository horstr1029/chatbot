# Design system

## Design direction

Clean corporate. Neutral grays, white surfaces, single blue accent. Tailwind UI conventions.
No gradients, no shadows on containers, no decorative effects. Professional and functional.

Font: DM Sans (Google Fonts) — weights 400, 500, 600 only.
Install: add to Next.js via `next/font/google`.

---

## Colour tokens (Tailwind config + CSS variables)

Define these in `tailwind.config.ts` under `theme.extend.colors` AND as CSS variables
in `globals.css` so they work in both Tailwind classes and inline styles.

```ts
// tailwind.config.ts
colors: {
  brand: {
    50:  '#eff6ff',
    100: '#dbeafe',
    600: '#2563eb',
    700: '#1d4ed8',
    900: '#1e3a5f',
  },
  surface: {
    DEFAULT: '#ffffff',
    secondary: '#f9fafb',
    tertiary: '#f3f4f6',
  },
  border: {
    DEFAULT: '#e5e7eb',
    strong: '#d1d5db',
  },
  text: {
    primary:   '#111827',
    secondary: '#4b5563',
    muted:     '#9ca3af',
  },
  status: {
    pending:  { bg: '#fffbeb', text: '#d97706' },
    approved: { bg: '#f0fdf4', text: '#16a34a' },
    rejected: { bg: '#fef2f2', text: '#dc2626' },
    running:  { bg: '#eff6ff', text: '#2563eb' },
  },
}
```

```css
/* globals.css */
:root {
  --font-sans: 'DM Sans', system-ui, sans-serif;
  --color-brand: #2563eb;
  --color-brand-light: #eff6ff;
  --color-surface: #ffffff;
  --color-surface-secondary: #f9fafb;
  --color-border: #e5e7eb;
  --color-text-primary: #111827;
  --color-text-secondary: #4b5563;
  --color-text-muted: #9ca3af;
  --radius-sm: 4px;
  --radius-md: 6px;
  --radius-lg: 10px;
  --sidebar-width: 220px;
}
```

---

## Layout

Three-pane shell — sidebar | main | (optional detail panel)

```
┌──────────────────────────────────────────────┐
│ Sidebar (220px fixed) │ Main (flex-1)         │
│                       │  ┌─ Topbar (52px) ─┐  │
│  Brand logo           │  │                 │  │
│  Dept badge           │  ├─ Messages ──────┤  │
│  New chat btn         │  │  (flex-1 scroll)│  │
│  Nav / history        │  │                 │  │
│  User footer          │  ├─ Composer ──────┤  │
│                       │  │  (auto height)  │  │
└───────────────────────┴──┴─────────────────┴──┘
```

- Sidebar: `w-[220px] flex-shrink-0 bg-white border-r border-border`
- Main: `flex-1 flex flex-col min-w-0 overflow-hidden`
- Topbar: `h-[52px] flex items-center px-5 border-b border-border bg-white`
- Messages: `flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-5`
- Composer: `border-t border-border bg-white px-5 py-3.5`

---

## Components

### Sidebar department badge
```tsx
<div className="mx-4 mt-3 rounded-md bg-brand-50 border border-brand-100 px-3 py-2">
  <p className="text-[11px] font-medium text-brand-600 uppercase tracking-wide">Department</p>
  <p className="text-[13px] font-semibold text-text-primary mt-0.5">{dept.name}</p>
</div>
```

### Nav item
```tsx
<button className={cn(
  "flex items-center gap-2 w-full px-2.5 py-1.5 rounded-md text-[13px] transition-colors",
  active
    ? "bg-brand-50 text-brand-700 font-medium"
    : "text-text-secondary hover:bg-surface-tertiary"
)}>
  <Icon className="w-[15px] h-[15px] opacity-80" />
  <span className="flex-1 truncate text-left">{label}</span>
  {time && <span className="text-[11px] text-text-muted">{time}</span>}
</button>
```

### New chat button
```tsx
<button className="mx-3 mb-2 flex items-center justify-center gap-1.5 rounded-lg bg-gray-900 px-3 py-2 text-[13px] font-medium text-white hover:bg-gray-800 transition-colors">
  <PlusIcon className="w-3.5 h-3.5" />
  New chat
</button>
```

### User footer
```tsx
<div className="flex items-center gap-2.5 p-3 border-t border-border">
  <div className="w-[30px] h-[30px] rounded-full bg-brand-600 text-white text-[11px] font-semibold flex items-center justify-center flex-shrink-0">
    {initials}
  </div>
  <div className="flex-1 min-w-0">
    <p className="text-[13px] font-medium text-text-primary truncate">{name}</p>
    <p className="text-[11px] text-text-muted">{role}</p>
  </div>
  <button className="p-1 rounded text-text-muted hover:text-text-secondary hover:bg-surface-secondary">
    <SettingsIcon className="w-4 h-4" />
  </button>
</div>
```

### Topbar
```tsx
<div className="h-[52px] flex items-center px-5 gap-3 border-b border-border bg-white">
  <h1 className="flex-1 text-[14px] font-semibold text-text-primary truncate">{title}</h1>
  <span className="text-[11px] font-medium px-2 py-1 rounded bg-surface-tertiary text-text-muted">
    {dept.name} docs
  </span>
  <button className="w-8 h-8 flex items-center justify-center rounded-md border border-border hover:bg-surface-secondary text-text-muted">
    <SearchIcon className="w-4 h-4" />
  </button>
</div>
```

### Message bubble — bot
```tsx
<div className="flex items-start gap-2.5 max-w-[88%]">
  <div className="w-7 h-7 rounded-full bg-surface-tertiary border border-border flex items-center justify-center text-[11px] font-semibold text-text-secondary flex-shrink-0 mt-0.5">
    AI
  </div>
  <div>
    <div className="bg-white border border-border rounded-xl rounded-bl-sm px-3.5 py-2.5 text-[13.5px] leading-relaxed text-text-primary">
      {content}
    </div>
    {citations.length > 0 && (
      <div className="flex flex-wrap gap-1 mt-2">
        {citations.map(c => <CitationChip key={c.id} {...c} />)}
      </div>
    )}
  </div>
</div>
```

### Message bubble — user
```tsx
<div className="flex items-start gap-2.5 max-w-[88%] self-end flex-row-reverse">
  <div className="w-7 h-7 rounded-full bg-brand-600 text-white text-[11px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
    {initials}
  </div>
  <div className="bg-brand-600 text-white rounded-xl rounded-br-sm px-3.5 py-2.5 text-[13.5px] leading-relaxed">
    {content}
  </div>
</div>
```

### Citation chip
```tsx
<button className="inline-flex items-center gap-1 text-[11px] px-2 py-1 bg-surface-secondary border border-border rounded text-text-secondary hover:bg-brand-50 hover:border-brand-100 hover:text-brand-700 transition-colors">
  <FileTextIcon className="w-3 h-3 text-brand-600" />
  {source.name}
</button>
```

### Workflow status card
```tsx
<div className="bg-white border border-border rounded-xl p-3.5 mt-2">
  <div className="flex items-center gap-2.5 mb-2">
    <div className="w-7 h-7 bg-amber-50 rounded-md flex items-center justify-center">
      <GitBranchIcon className="w-4 h-4 text-amber-600" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[13px] font-semibold text-text-primary">{title}</p>
      <p className="text-[12px] text-text-muted">{stepSummary}</p>
    </div>
    <StatusPill status={status} />
  </div>
  <p className="text-[12px] text-text-secondary pt-2 border-t border-border mt-1">
    {description}
  </p>
</div>
```

### Status pill
```tsx
const variants = {
  pending:  "bg-amber-50 text-amber-600",
  approved: "bg-green-50 text-green-600",
  rejected: "bg-red-50 text-red-600",
  running:  "bg-brand-50 text-brand-600",
  executed: "bg-green-50 text-green-600",
}

<span className={cn("inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded", variants[status])}>
  <StatusIcon className="w-3 h-3" />
  {label}
</span>
```

### Typing indicator
```tsx
<div className="flex items-center gap-1 px-3.5 py-2.5 bg-white border border-border rounded-xl rounded-bl-sm w-fit">
  {[0, 200, 400].map(delay => (
    <span key={delay} className="w-1.5 h-1.5 rounded-full bg-gray-300 animate-pulse"
      style={{ animationDelay: `${delay}ms` }} />
  ))}
</div>
```

### Composer
```tsx
<div className="border border-border rounded-lg bg-white flex items-end gap-2 px-2.5 py-2 focus-within:border-blue-300 transition-colors">
  <textarea
    rows={1}
    placeholder="Ask about docs or request a workflow…"
    className="flex-1 border-none outline-none text-[13.5px] text-text-primary placeholder:text-text-muted resize-none bg-transparent font-sans leading-relaxed min-h-[22px] max-h-[120px]"
    onInput={autoResize}
  />
  <div className="flex items-center gap-1.5">
    <button className="w-[30px] h-[30px] rounded-md flex items-center justify-center text-text-muted hover:bg-surface-secondary hover:text-text-secondary transition-colors">
      <PaperclipIcon className="w-4 h-4" />
    </button>
    <button className="w-[30px] h-[30px] rounded-md bg-gray-900 flex items-center justify-center text-white hover:bg-gray-800 transition-colors">
      <ArrowUpIcon className="w-4 h-4" />
    </button>
  </div>
</div>
<p className="text-[11px] text-text-muted text-center mt-1.5">
  Only searches {dept.name} department documents
</p>
```

---

## Admin panel conventions

- Use a standard top-navigation bar (not a sidebar) for admin pages
- Tables use `divide-y divide-border` rows, `bg-white` surface, `rounded-lg border border-border` wrapper
- Action buttons in tables: ghost style (no background, border only on hover)
- Status badges always use the `StatusPill` component above — never raw colour classes inline
- Page headers: `text-xl font-semibold text-text-primary` + `text-[13px] text-text-secondary` subtitle
- Section cards: `bg-white border border-border rounded-lg p-5`
- Form labels: `text-[13px] font-medium text-text-primary mb-1`
- Inputs: Tailwind UI style — `rounded-md border border-border px-3 py-2 text-[13.5px] focus:outline-none focus:ring-2 focus:ring-brand-600 focus:border-transparent`
- Danger actions (delete, reject): `text-red-600 hover:bg-red-50` — never a red filled button

---

## Page-specific notes

### `/chat`
- Full-height layout (`h-screen overflow-hidden`) — no page scroll, only messages area scrolls
- Mobile: sidebar collapses to a drawer triggered by a hamburger button in the topbar
- Workflow status cards are only shown in the assistant bubble, never in user bubbles

### `/admin/workflows`
- Show a `pending` count badge in the sidebar nav item
- Pending rows have a subtle `bg-amber-50/40` row tint
- Expand row in-place (no modal) to show workflow JSON summary + approve/reject actions

### `/admin/settings`
- LLM model selector: show model name + a small badge indicating `Cloud` or `Local (Ollama)`
- System prompt field: `<textarea>` with 8 rows, monospace font for the prompt value
- Save button stays disabled until a field has changed (dirty state)
