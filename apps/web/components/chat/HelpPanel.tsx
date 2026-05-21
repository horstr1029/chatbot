'use client'

import { useEffect, useState } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

interface HelpPanelProps {
  open: boolean
  onClose: () => void
  deptName: string
}

const FEATURES = [
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
    title: 'Ask questions',
    desc: 'Type any question in the composer at the bottom and press Enter or the send button. The AI searches your department\'s documents and answers with cited sources.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    title: 'Citation chips',
    desc: 'After an AI answer, coloured chips show which documents were used. Click a chip to read the exact text snippet that was referenced, with a link to open the full source.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Copy response',
    desc: 'Click the copy icon below any AI message to copy the full response to your clipboard. A green tick confirms it was copied.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
      </svg>
    ),
    title: 'Save answers',
    desc: 'Click the bookmark icon below any AI message to save it for later. View all saved answers by clicking the bookmark button in the top bar. Saved answers are private to you.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14 10h4.764a2 2 0 011.789 2.894l-3.5 7A2 2 0 0115.263 21h-4.017c-.163 0-.326-.02-.485-.06L7 20m7-10V5a2 2 0 00-2-2h-.095c-.5 0-.905.405-.905.905 0 .714-.211 1.412-.608 2.006L7 11v9m7-10h-2M7 20H5a2 2 0 01-2-2v-6a2 2 0 012-2h2.5" />
      </svg>
    ),
    title: 'Rate answers',
    desc: 'Use the thumbs up / thumbs down buttons below any AI message to rate the answer. This helps your admin understand which questions need better documentation.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: 'Request a workflow',
    desc: 'Describe a task you repeat often (e.g. "Send a weekly report to my manager every Friday"). The AI will design an automation and submit it for admin approval. Track status in the Workflows panel (⚡ top bar).',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
      </svg>
    ),
    title: 'Export conversation',
    desc: 'Click the download icon (↓) in the top bar to save the current conversation as a Markdown file — useful for sharing answers or keeping a record.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: 'Search chat history',
    desc: 'Click the search icon (🔍) next to "New chat" in the sidebar to search across all your past conversations by keyword. Click a result to jump back to that session.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: 'Document library',
    desc: 'Click the "[Dept] docs" button in the top bar to browse all document sources connected to your department. Expand a source to see individual files.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    title: 'Announcements',
    desc: 'Important messages pinned by your department admin appear as a banner above the composer. Dismiss them with the × button — they won\'t reappear until a new one is posted.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Answer confidence',
    desc: 'A small coloured dot appears next to each AI answer — green means the source documents closely matched your question, yellow is moderate, and red means the answer may be less reliable. Hover the dot to see the score.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
      </svg>
    ),
    title: 'Follow-up suggestions',
    desc: 'After each AI response the chatbot suggests up to 3 related follow-up questions as clickable chips. Click one to send it instantly — no typing required.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
    ),
    title: 'Push notifications',
    desc: 'Click the bell icon in the top bar to enable browser push notifications. You\'ll receive an instant alert when a workflow you requested is approved or rejected — even if the tab is closed.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Install as app (PWA)',
    desc: 'Install the chatbot as a standalone app — no browser chrome, works offline for cached pages. In Chrome or Edge, click the ⊕ install icon in the address bar. On iOS Safari, tap Share → Add to Home Screen.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Windows desktop app',
    desc: 'Download the Windows desktop app for a native experience — sits in your system tray, opens instantly with a single click, and can launch automatically when you log in to Windows.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    title: 'Smart form filler',
    desc: 'Your admin can set up form templates (leave requests, expense claims, etc.). Just describe what you need — e.g. "submit a leave request for next Friday" — and the AI pre-fills the form for you. Review, edit any field, and submit.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Meeting prep brief',
    desc: 'Click the calendar icon (📅) in the top bar before a meeting. Enter the meeting title and optional agenda — the AI searches your department\'s documents and streams a structured briefing covering background, relevant policies, open questions, and suggested agenda points.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    title: 'Multi-step approval chains',
    desc: 'Workflows can require sequential sign-offs — e.g. Manager → Finance → Director. Each approver receives a notification and can approve or reject at their step. The workflow only executes once all steps are approved. Track progress in the Workflows panel (⚡ top bar).',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Recurring reminders',
    desc: 'Ask the AI to remind you of anything on a schedule — e.g. "Remind me every Monday at 9am to submit my timesheet". Click the bell icon (🔔) in the top bar to view and manage your reminders. Reminders arrive as push notifications.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
      </svg>
    ),
    title: 'Cross-department requests',
    desc: 'Need something from another department? Click the globe icon (🌐) in the top bar to raise a cross-department request. The target department admin can respond, reassign, or resolve it. Track incoming and outgoing requests in Admin → Requests.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
    title: 'Voice input',
    desc: 'Click the microphone button in the composer to dictate your question — no typing needed. The button pulses red while recording and stops automatically on silence. Works in Chrome and Edge.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
      </svg>
    ),
    title: '@mention a document source',
    desc: 'Type @ in the composer to open a picker showing your department\'s document sources. Select one to focus the AI\'s answer on that source. Use arrow keys to navigate, Enter or Tab to insert.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
      </svg>
    ),
    title: 'Starred conversations',
    desc: 'Hover any conversation in the sidebar to reveal a star icon. Starred chats are pinned to a "Starred" section at the top of your history so important conversations are always easy to find.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    title: 'Delete chat history',
    desc: 'Hover any conversation in the sidebar to reveal a × button — click it to permanently delete that chat. To clear everything at once, click "Clear all" at the top of the Recent section and confirm with Yes.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
      </svg>
    ),
    title: 'Resizable sidebar',
    desc: 'Drag the right edge of the sidebar left or right to resize it between 160 px and 400 px wide. The sidebar snaps smoothly as you drag — release to set the new width.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
    title: 'Search within a conversation',
    desc: 'Press Ctrl+F (or Cmd+F) to open an in-conversation search bar. Matching text is highlighted in amber across all messages. Use Enter / Shift+Enter or the arrows to jump between matches. Esc closes it.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    title: 'Message timestamps',
    desc: 'Hover over any message bubble to see when it was sent — shown as a relative time like "2 min ago" or "yesterday at 3 pm".',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
      </svg>
    ),
    title: 'Dark mode',
    desc: 'Click the moon/sun icon in the sidebar footer to toggle dark mode. Your preference is saved and applied instantly across the whole app. The system preference is respected on first visit.',
  },
  {
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 10h2l1 2 3-6 3 8 2-4h3" />
      </svg>
    ),
    title: 'Keyboard shortcuts',
    desc: 'Ctrl+K — new chat · Ctrl+F — search conversation · Ctrl+/ — toggle this help panel · Esc — close any open panel. All shortcuts work from anywhere in the chat view.',
  },
]

const FOLDER_STRUCTURE = `Google Drive / SharePoint root
└── 📁 MST Chatbot Docs
    ├── 📁 Global                  ← visible to ALL departments
    │   ├── 📁 Company Policies
    │   ├── 📁 Health & Safety
    │   └── 📁 General FAQs
    │
    ├── 📁 HR
    │   ├── 📁 Policies & Procedures
    │   ├── 📁 Onboarding
    │   ├── 📁 Benefits & Leave
    │   ├── 📁 Job Descriptions
    │   └── 📁 Templates
    │
    ├── 📁 Finance
    │   ├── 📁 Expense Procedures
    │   ├── 📁 Purchase Orders
    │   ├── 📁 Budget Guidelines
    │   └── 📁 Compliance & Audit
    │
    ├── 📁 IT
    │   ├── 📁 Software & Licences
    │   ├── 📁 Security Policies
    │   ├── 📁 Infrastructure Guides
    │   └── 📁 Support Procedures
    │
    ├── 📁 Operations
    │   ├── 📁 Standard Operating Procedures
    │   ├── 📁 Equipment Manuals
    │   └── 📁 Supplier Contacts
    │
    └── 📁 Sales & Marketing
        ├── 📁 Product Sheets
        ├── 📁 Pricing & Proposals
        └── 📁 Brand Guidelines`

const FOLDER_TIPS = [
  'Keep file names descriptive — the AI uses them when answering.',
  'Prefer PDF or Word documents over spreadsheets for better text extraction.',
  'Archive outdated documents into an "_Archive" subfolder rather than deleting — the admin can exclude them from indexing.',
  'The "Global" folder is indexed for every department, so put company-wide policies there.',
  'Large documents (50+ pages) are automatically split into labelled sections during ingestion — no manual splitting needed.',
]

const WORKFLOWS = [
  {
    title: 'Leave request approval',
    prompt: 'Create a workflow where I fill in a leave request form and it automatically notifies my manager for approval, then updates HR.',
    tags: ['HR', 'Approvals'],
  },
  {
    title: 'Weekly status report',
    prompt: 'Every Friday at 4pm, send a reminder to our team to submit their weekly status update, then compile the replies into one email to the manager.',
    tags: ['Scheduling', 'Reports'],
  },
  {
    title: 'New employee onboarding',
    prompt: 'When a new employee joins, automatically create their accounts, send them a welcome email with login details, and assign their onboarding checklist tasks.',
    tags: ['HR', 'Onboarding'],
  },
  {
    title: 'Purchase order approval',
    prompt: 'Create a workflow where I can submit a purchase order request, it gets routed to Finance for approval, and I get notified of the decision.',
    tags: ['Finance', 'Approvals'],
  },
  {
    title: 'IT support ticket routing',
    prompt: 'When someone submits an IT support request, automatically categorise it (hardware, software, access) and assign it to the right IT team member.',
    tags: ['IT', 'Support'],
  },
  {
    title: 'Document review & sign-off',
    prompt: 'I need a workflow where I can send a document to multiple reviewers in sequence, collect their sign-offs, and get notified when all approvals are complete.',
    tags: ['Documents', 'Approvals'],
  },
  {
    title: 'Expense claim submission',
    prompt: 'Create a workflow where I upload my receipts and fill in expense details, it gets submitted to my manager for approval, then forwarded to Finance for payment.',
    tags: ['Finance', 'HR'],
  },
  {
    title: 'Monthly KPI report',
    prompt: 'On the first Monday of each month, pull the KPI data from our spreadsheet and automatically generate and email a summary report to the department heads.',
    tags: ['Reports', 'Scheduling'],
  },
  {
    title: 'Visitor access pass',
    prompt: 'When I book a visitor, automatically send them a meeting confirmation, notify reception to prepare an access pass, and add the visit to the site security log.',
    tags: ['Operations', 'Security'],
  },
  {
    title: 'Social media approval',
    prompt: 'Create a workflow where the marketing team drafts a social media post, it goes to the manager for review and approval before it gets scheduled for posting.',
    tags: ['Marketing', 'Approvals'],
  },
]

const TAG_COLOURS: Record<string, string> = {
  HR: 'bg-purple-50 text-purple-600',
  Finance: 'bg-green-50 text-green-600',
  IT: 'bg-blue-50 text-blue-600',
  Operations: 'bg-orange-50 text-orange-600',
  Marketing: 'bg-pink-50 text-pink-600',
  Approvals: 'bg-amber-50 text-amber-600',
  Scheduling: 'bg-cyan-50 text-cyan-600',
  Reports: 'bg-indigo-50 text-indigo-600',
  Documents: 'bg-teal-50 text-teal-600',
  Support: 'bg-red-50 text-red-600',
  Security: 'bg-slate-50 text-slate-600',
  Onboarding: 'bg-lime-50 text-lime-600',
}

const DOWNLOADS = [
  {
    label: 'Windows desktop app',
    desc: 'Standalone app with system tray — runs without a browser.',
    size: '~110 MB',
    href: '/downloads/MST-Chatbot-win32-x64.zip',
    filename: 'MST-Chatbot-win32-x64.zip',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    ),
  },
]

type Tab = 'features' | 'folders' | 'workflows'

export function HelpPanel({ open, onClose, deptName }: HelpPanelProps) {
  const [tab, setTab] = useState<Tab>('features')
  const [copied, setCopied] = useState<number | null>(null)
  const [pwaPrompt, setPwaPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [pwaInstalled, setPwaInstalled] = useState(false)

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault()
      setPwaPrompt(e as BeforeInstallPromptEvent)
    }
    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', () => { setPwaInstalled(true); setPwaPrompt(null) })
    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  async function handlePwaInstall() {
    if (!pwaPrompt) return
    await pwaPrompt.prompt()
    await pwaPrompt.userChoice
    setPwaPrompt(null)
  }

  async function copyPrompt(i: number, prompt: string) {
    await navigator.clipboard.writeText(prompt)
    setCopied(i)
    setTimeout(() => setCopied(null), 2000)
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full z-40 w-[500px] bg-white border-l border-border flex flex-col shadow-lg transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="h-[52px] flex items-center px-5 gap-3 border-b border-border flex-shrink-0">
          <svg className="w-4 h-4 text-brand-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="flex-1 text-[13px] font-semibold text-text-primary">Help & Guide</p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:bg-surface-secondary transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5 flex-shrink-0">
          {([
            { key: 'features', label: 'Features' },
            { key: 'folders', label: 'Folder structure' },
            { key: 'workflows', label: 'Workflow ideas' },
          ] as { key: Tab; label: string }[]).map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-2.5 text-[12.5px] font-medium border-b-2 transition-colors ${
                tab === t.key
                  ? 'border-brand-600 text-brand-600'
                  : 'border-transparent text-text-muted hover:text-text-secondary'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Features tab ── */}
          {tab === 'features' && (
            <div className="px-5 py-4 flex flex-col gap-3">
              <p className="text-[12px] text-text-muted">
                Everything available in the {deptName} chatbot.
              </p>

              {/* Download banner */}
              <div className="rounded-lg border border-brand-100 bg-brand-50 p-3.5 flex flex-col gap-2">
                <p className="text-[12px] font-semibold text-brand-700">Get the desktop app</p>
                {DOWNLOADS.map((d) => (
                  <a
                    key={d.href}
                    href={d.href}
                    download={d.filename}
                    className="flex items-center gap-3 bg-white border border-border rounded-md px-3 py-2.5 hover:border-brand-200 hover:bg-brand-50 transition-colors group"
                  >
                    <div className="w-7 h-7 rounded-md bg-brand-100 flex items-center justify-center text-brand-600 flex-shrink-0">
                      {d.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[12.5px] font-medium text-text-primary group-hover:text-brand-700 transition-colors">{d.label}</p>
                      <p className="text-[11px] text-text-muted">{d.desc} <span className="text-text-muted/60">{d.size}</span></p>
                    </div>
                    <svg className="w-3.5 h-3.5 text-text-muted flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                  </a>
                ))}
                <p className="text-[11px] text-brand-600/70">
                  Unzip and run <code className="bg-brand-100 px-1 rounded text-[10.5px]">MST Chatbot.exe</code> — no installer needed.
                </p>
              </div>
              {FEATURES.map((f) => (
                <div key={f.title} className="flex gap-3 p-3 rounded-lg border border-border bg-white">
                  <div className="w-7 h-7 rounded-md bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0 mt-0.5">
                    {f.icon}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[13px] font-semibold text-text-primary mb-0.5">{f.title}</p>
                    <p className="text-[12px] text-text-secondary leading-relaxed">{f.desc}</p>
                    {f.title === 'Install as app (PWA)' && (
                      <div className="mt-2">
                        {pwaInstalled ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-600 bg-green-50 px-2 py-1 rounded">
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                            Installed
                          </span>
                        ) : pwaPrompt ? (
                          <button
                            onClick={handlePwaInstall}
                            className="inline-flex items-center gap-1.5 text-[11.5px] font-medium bg-brand-600 text-white px-3 py-1.5 rounded-md hover:bg-brand-700 transition-colors"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                            Install now
                          </button>
                        ) : (
                          <span className="text-[11px] text-text-muted">Look for the ⊕ icon in your browser address bar to install.</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Folder structure tab ── */}
          {tab === 'folders' && (
            <div className="px-5 py-4 space-y-4">
              <p className="text-[12px] text-text-muted">
                Recommended folder layout for your Google Drive or SharePoint. Consistent structure helps the AI find and cite documents accurately.
              </p>
              <pre className="bg-surface-tertiary rounded-lg p-4 text-[11.5px] text-text-secondary font-mono leading-relaxed overflow-x-auto whitespace-pre">
                {FOLDER_STRUCTURE}
              </pre>
              <div className="space-y-2">
                <p className="text-[12.5px] font-semibold text-text-primary">Tips</p>
                {FOLDER_TIPS.map((tip, i) => (
                  <div key={i} className="flex gap-2.5">
                    <span className="w-4 h-4 rounded-full bg-brand-50 text-brand-600 text-[10px] font-semibold flex items-center justify-center flex-shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-[12px] text-text-secondary leading-relaxed">{tip}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Workflow ideas tab ── */}
          {tab === 'workflows' && (
            <div className="px-5 py-4 space-y-3">
              <p className="text-[12px] text-text-muted">
                Inspiration for automations you can request. Click <strong>Use this prompt</strong> to copy it straight into the chat.
              </p>
              {WORKFLOWS.map((w, i) => (
                <div key={i} className="rounded-lg border border-border bg-white p-3.5 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-[13px] font-semibold text-text-primary">{w.title}</p>
                    <div className="flex flex-wrap gap-1 justify-end">
                      {w.tags.map((tag) => (
                        <span
                          key={tag}
                          className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${TAG_COLOURS[tag] ?? 'bg-surface-tertiary text-text-muted'}`}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <p className="text-[12px] text-text-muted leading-relaxed italic">"{w.prompt}"</p>
                  <button
                    onClick={() => copyPrompt(i, w.prompt)}
                    className="flex items-center gap-1.5 text-[11.5px] font-medium text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    {copied === i ? (
                      <>
                        <svg className="w-3 h-3 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-green-600">Copied to clipboard</span>
                      </>
                    ) : (
                      <>
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                        Use this prompt
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-5 py-3 border-t border-border flex-shrink-0">
          <p className="text-[11px] text-text-muted text-center">
            Questions? Contact your department admin.
          </p>
        </div>
      </div>
    </>
  )
}
