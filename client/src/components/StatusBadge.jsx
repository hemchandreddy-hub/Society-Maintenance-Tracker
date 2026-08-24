export function StatusBadge({ status, overdue }) {
  if (overdue) return <span className="badge overdue">⚠ Overdue</span>
  const cls = status === 'In Progress' ? 'in-progress' : status.toLowerCase()
  return <span className={`badge ${cls}`}>{status}</span>
}

export function PriorityBadge({ priority }) {
  return <span className={`badge ${priority.toLowerCase()}`}>{priority}</span>
}

export function CategoryBadge({ category }) {
  const icons = { Plumbing: 'P', Electrical: 'E', Elevator: 'EL', Parking: 'PK', 'Common Area': 'CA', Other: 'O' }
  return <span className="badge" style={{ background: 'rgba(124, 58, 237, 0.1)', color: '#7c3aed' }}>{icons[category] || ''} {category}</span>
}

export function formatDate(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
