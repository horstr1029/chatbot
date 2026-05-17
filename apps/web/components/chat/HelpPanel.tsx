'use client'

import { useState } from 'react'

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
]

const FOLDER_STRUCTURE = `Google Drive / SharePoint root
└── 📁 Company Chatbot Docs
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
  'Aim for documents under 50 pages for best retrieval quality — split large manuals into chapters.',
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

type Tab = 'features' | 'folders' | 'workflows'

export function HelpPanel({ open, onClose, deptName }: HelpPanelProps) {
  const [tab, setTab] = useState<Tab>('features')
  const [copied, setCopied] = useState<number | null>(null)

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
              {FEATURES.map((f) => (
                <div key={f.title} className="flex gap-3 p-3 rounded-lg border border-border bg-white">
                  <div className="w-7 h-7 rounded-md bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0 mt-0.5">
                    {f.icon}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary mb-0.5">{f.title}</p>
                    <p className="text-[12px] text-text-secondary leading-relaxed">{f.desc}</p>
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
