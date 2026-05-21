'use client'

import { useState } from 'react'

interface AdminHelpPanelProps {
  open: boolean
  onClose: () => void
}

type Tab = 'dept' | 'super'

const DEPT_SECTIONS = [
  {
    title: 'Documents',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    items: [
      { q: 'How do I connect a Google Drive folder?', a: 'Go to Documents → Add source → Google Drive. Paste the folder URL or ID. The system will list and ingest all supported files in that folder. Use Resync to pull in new files added later.' },
      { q: 'How do I upload a file directly?', a: 'Go to Documents → Upload. Drag and drop or select a PDF, Word, or text file. It is parsed, chunked, and embedded immediately. Large documents (50+ pages) are auto-split into labelled sections.' },
      { q: 'How do I remove a document source?', a: 'Click the red delete icon next to the source. This removes all chunks for that source from the vector store — users will no longer get answers from it.' },
      { q: 'What file types are supported?', a: 'PDF, DOCX, DOC, TXT, and Markdown. Spreadsheets (XLSX) are supported but text extraction is limited — prefer PDF exports for best results.' },
      { q: 'What is the Global folder?', a: 'Documents tagged as "global" are visible to all departments. Use this for company-wide policies, health & safety, and general FAQs. Tag a source as global by checking the "Visible to all departments" option when adding it.' },
    ],
  },
  {
    title: 'Users',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    items: [
      { q: 'How do I add a new user?', a: 'Go to Users → Add user. Enter their name and email. A temporary password is auto-generated and emailed to them. They must change it on first login.' },
      { q: 'How do I edit a user\'s name?', a: 'Click Edit next to the user row. Update the name field and click Save.' },
      { q: 'How do I move a user to a different department?', a: 'Super Admins can move users between departments from the Users panel. Click Edit on the user and select the new department from the dropdown. The user\'s session updates on their next login.' },
      { q: 'How do I remove a user?', a: 'Click Remove next to the user. This soft-deletes them — they cannot log in but their history is preserved. They will need to be re-added to regain access.' },
    ],
  },
  {
    title: 'Workflows & approvals',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    items: [
      { q: 'How do I approve or reject a workflow request?', a: 'Go to Workflows. Pending requests have an amber row tint. Expand the row to see the full workflow JSON and user description. Click Approve to send it to n8n for execution, or Reject to decline it. The user is notified either way.' },
      { q: 'What are approval chains?', a: 'Some workflows require sequential sign-offs (e.g. Manager → Finance). Each approver receives a notification when it is their turn. The workflow only executes after all steps are approved. Configure chains in Settings → Approval chains.' },
      { q: 'How do I track workflow status?', a: 'The Workflows page shows all requests with their current status: Pending, Approved, Rejected, or Executed. The badge in the nav shows how many are awaiting your action.' },
    ],
  },
  {
    title: 'Form templates',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
      </svg>
    ),
    items: [
      { q: 'How do I create a form template?', a: 'Go to Forms → New template. Give it a name (e.g. "Leave request"), add fields (text, date, dropdown, number), and save. Users can then say "submit a leave request" in chat and the AI pre-fills the form.' },
      { q: 'How do I edit or delete a template?', a: 'Click the pencil icon to edit an existing template, or the red delete icon to remove it. Deleting a template does not affect previously submitted forms.' },
    ],
  },
  {
    title: 'Announcements',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
      </svg>
    ),
    items: [
      { q: 'How do I post an announcement?', a: 'Go to Announcements → New announcement. Enter the message text. It appears as a dismissible banner above the chat composer for all users in this department immediately.' },
      { q: 'How do I remove an announcement?', a: 'Click Delete on the announcement. It disappears for all users who have not yet dismissed it.' },
    ],
  },
  {
    title: 'Settings',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    items: [
      { q: 'How do I change the AI model?', a: 'Go to Settings → LLM model. Select a Claude model (cloud) or an Ollama model (local). Changes take effect on the next chat message. Local models are faster for simple questions but less capable on complex tasks.' },
      { q: 'How do I set a custom system prompt?', a: 'Go to Settings → System prompt. Type instructions that are prepended to every AI response — e.g. "Always answer in Afrikaans" or "Focus only on installation-related questions". Keep it concise.' },
      { q: 'How do I enable web search for diagrams?', a: 'Go to Settings → Web search fallback. Toggle it on. When a user asks for a diagram and no documents match, the AI will search the web (via Tavily) for technical references. Requires a Tavily API key configured by the Super Admin.' },
    ],
  },
  {
    title: 'Quality & analytics',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    items: [
      { q: 'How do I see which answers users rated poorly?', a: 'Go to Quality. Thumbs-down ratings appear here with the original question and AI answer. Use these to identify gaps in your documents — add or improve the relevant source material and resync.' },
      { q: 'Where do I see usage stats?', a: 'The Dashboard shows total messages, active users, and top questions for this department. Super Admin → Analytics shows system-wide stats across all departments.' },
    ],
  },
]

const SUPER_SECTIONS = [
  {
    title: 'Departments',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    ),
    items: [
      { q: 'How do I create a new department?', a: 'Go to Super Admin → Departments → New department. Enter a name. The department is created immediately. Assign a manager and configure settings before inviting users.' },
      { q: 'How do I configure a department\'s AI model?', a: 'Go to Super Admin → Departments, click Settings on the department. Set the LLM model, system prompt, and web search toggle. These override the global defaults for that department only.' },
      { q: 'How do I delete a department?', a: 'Click Delete on the department. This soft-deletes it — users are unaffected but cannot access it. All documents and chat history are preserved. This action cannot be undone from the UI.' },
    ],
  },
  {
    title: 'Managers',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
    ),
    items: [
      { q: 'How do I create a manager account?', a: 'Go to Super Admin → Managers → Add manager. Enter name and email. A temporary password is auto-generated and emailed to them. They can log in, change their password, and access the Admin panel for their assigned departments.' },
      { q: 'How do I assign a manager to multiple departments?', a: 'Click Edit on the manager. Toggle the department pills to select or deselect. Click Save. The manager can switch between their departments from the Admin panel.' },
      { q: 'How do I remove a manager?', a: 'Click Remove. Their MANAGER role is revoked for all departments. If they have no remaining department memberships they are soft-deleted. Their chat history is preserved.' },
    ],
  },
  {
    title: 'Super admins',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
    items: [
      { q: 'How do I grant super admin access to another user?', a: 'Go to Super Admin → Admins. Enter the user\'s email and click Add. The user must already have an account. They gain super admin access on their next login. If they also belong to a department, they keep their normal chat access and see a gear icon in the sidebar.' },
      { q: 'How do I revoke super admin access?', a: 'Click Revoke next to the user in the Admins list. You cannot revoke your own access — this prevents accidental lockout. Always keep at least two super admins active.' },
    ],
  },
  {
    title: 'System settings',
    icon: (
      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    items: [
      { q: 'How do I configure email (SMTP)?', a: 'Go to Super Admin → Settings → Email. Enter your SMTP host, port, credentials, and sender address. Click Test email to verify. This is required for welcome emails and password resets to work.' },
      { q: 'How do I set a Tavily API key for web search?', a: 'The Tavily API key is set in the server environment file (.env.production.local) on the server. Add the line: TAVILY_API_KEY=your-key, then restart the app. Per-department web search can then be toggled in Admin → Settings.' },
      { q: 'How do I view system-wide analytics?', a: 'Go to Super Admin → Analytics. See total messages, active users, and top questions across all departments. Use this to identify which departments are under-utilising the chatbot or need more documents.' },
    ],
  },
]

export function AdminHelpPanel({ open, onClose }: AdminHelpPanelProps) {
  const [tab, setTab] = useState<Tab>('dept')
  const [expanded, setExpanded] = useState<string | null>(null)

  const sections = tab === 'dept' ? DEPT_SECTIONS : SUPER_SECTIONS

  function toggle(key: string) {
    setExpanded((v) => (v === key ? null : key))
  }

  return (
    <>
      {open && <div className="fixed inset-0 z-30 bg-black/20" onClick={onClose} />}
      <div className={`fixed top-0 right-0 h-full z-40 w-full sm:w-[480px] bg-white border-l border-border flex flex-col shadow-lg transition-transform duration-200 ${open ? 'translate-x-0' : 'translate-x-full'}`}>

        {/* Header */}
        <div className="h-[52px] flex items-center px-5 gap-3 border-b border-border flex-shrink-0">
          <svg className="w-4 h-4 text-brand-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="flex-1 text-[13px] font-semibold text-text-primary">Admin Guide</p>
          <button onClick={onClose} className="w-7 h-7 flex items-center justify-center rounded-md text-text-muted hover:bg-surface-secondary transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border px-5 flex-shrink-0">
          {([
            { key: 'dept' as Tab, label: 'Dept Admin' },
            { key: 'super' as Tab, label: 'Super Admin' },
          ]).map((t) => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setExpanded(null) }}
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
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {sections.map((section) => (
            <div key={section.title} className="bg-white border border-border rounded-lg overflow-hidden">
              <div className="flex items-center gap-2.5 px-4 py-2.5 bg-surface-secondary border-b border-border">
                <div className="w-6 h-6 rounded-md bg-brand-50 flex items-center justify-center text-brand-600 flex-shrink-0">
                  {section.icon}
                </div>
                <p className="text-[13px] font-semibold text-text-primary">{section.title}</p>
              </div>
              <div className="divide-y divide-border">
                {section.items.map((item) => {
                  const key = `${section.title}:${item.q}`
                  const open = expanded === key
                  return (
                    <div key={key}>
                      <button
                        onClick={() => toggle(key)}
                        className="w-full text-left px-4 py-3 flex items-start gap-2 hover:bg-surface-secondary transition-colors"
                      >
                        <svg className={`w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-text-muted transition-transform ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                        <span className="text-[12.5px] font-medium text-text-primary">{item.q}</span>
                      </button>
                      {open && (
                        <div className="px-4 pb-3 ml-5.5">
                          <p className="text-[12px] text-text-secondary leading-relaxed">{item.a}</p>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 py-3 border-t border-border flex-shrink-0">
          <p className="text-[11px] text-text-muted text-center">
            Need technical help? Contact your system administrator.
          </p>
        </div>
      </div>
    </>
  )
}
