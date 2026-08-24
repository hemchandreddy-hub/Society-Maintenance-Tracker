import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, PriorityBadge, CategoryBadge, formatDate } from '../components/StatusBadge'

const CATEGORIES = ['', 'Plumbing', 'Electrical', 'Elevator', 'Parking', 'Common Area', 'Other']
const STATUSES = ['', 'Open', 'In Progress', 'Resolved']
const PRIORITIES = ['', 'Low', 'Medium', 'High']

export default function AdminComplaints() {
  const { api } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ category: '', status: '', priority: '' })

  const fetchComplaints = () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (filters.category) params.set('category', filters.category)
    if (filters.status) params.set('status', filters.status)
    if (filters.priority) params.set('priority', filters.priority)
    api(`/api/complaints?${params}`)
      .then(d => setComplaints(d.complaints))
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { fetchComplaints() }, [filters])

  return (
    <div className="page">
      <div className="page-header">
        <h1>All Complaints</h1>
        <p>Manage and track all maintenance complaints</p>
      </div>

      <div className="filters-bar">
        <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Filters:</span>
        <select className="form-select" value={filters.category} onChange={e => setFilters({ ...filters, category: e.target.value })}>
          <option value="">All Categories</option>
          {CATEGORIES.filter(Boolean).map(c => <option key={c}>{c}</option>)}
        </select>
        <select className="form-select" value={filters.status} onChange={e => setFilters({ ...filters, status: e.target.value })}>
          <option value="">All Statuses</option>
          {STATUSES.filter(Boolean).map(s => <option key={s}>{s}</option>)}
        </select>
        <select className="form-select" value={filters.priority} onChange={e => setFilters({ ...filters, priority: e.target.value })}>
          <option value="">All Priorities</option>
          {PRIORITIES.filter(Boolean).map(p => <option key={p}>{p}</option>)}
        </select>
        {(filters.category || filters.status || filters.priority) && (
          <button className="btn btn-secondary btn-sm" onClick={() => setFilters({ category: '', status: '', priority: '' })}>Clear</button>
        )}
      </div>

      {loading ? (
        <div className="loading"><div className="spinner" /></div>
      ) : complaints.length === 0 ? (
        <div className="empty-state"><div className="icon"></div><h3>No complaints found</h3><p>Try adjusting your filters.</p></div>
      ) : (
        <div className="table-container glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <table>
            <thead>
              <tr>
                <th>ID</th><th>Title</th><th>Resident</th><th>Category</th><th>Priority</th><th>Status</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {complaints.map(c => (
                <tr key={c.id} className={c.is_overdue ? 'overdue-row' : ''}>
                  <td>#{c.id}</td>
                  <td><Link to={`/complaints/${c.id}`} style={{ fontWeight: 600 }}>{c.title}</Link></td>
                  <td><span style={{ fontSize: '0.85rem' }}>{c.resident_name}<br /><span style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{c.apartment_no}</span></span></td>
                  <td><CategoryBadge category={c.category} /></td>
                  <td><PriorityBadge priority={c.priority} /></td>
                  <td><StatusBadge status={c.status} overdue={c.is_overdue} /></td>
                  <td style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>{formatDate(c.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
