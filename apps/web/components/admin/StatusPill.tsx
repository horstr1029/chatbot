type Status = 'PENDING' | 'APPROVED' | 'REJECTED' | 'EXECUTED' | 'FAILED'

const variants: Record<Status, string> = {
  PENDING:  'bg-amber-50 text-amber-600',
  APPROVED: 'bg-green-50 text-green-600',
  REJECTED: 'bg-red-50 text-red-600',
  EXECUTED: 'bg-green-50 text-green-600',
  FAILED:   'bg-red-50 text-red-600',
}

const labels: Record<Status, string> = {
  PENDING:  'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  EXECUTED: 'Executed',
  FAILED:   'Failed',
}

interface StatusPillProps {
  status: Status
}

export function StatusPill({ status }: StatusPillProps) {
  return (
    <span className={`inline-flex items-center text-[11px] font-medium px-2 py-1 rounded ${variants[status]}`}>
      {labels[status]}
    </span>
  )
}
