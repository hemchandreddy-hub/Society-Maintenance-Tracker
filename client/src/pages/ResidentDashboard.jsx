import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, PriorityBadge, CategoryBadge, formatDate } from '../components/StatusBadge'

export default function ResidentDashboard() {
  const { api } = useAuth()
  const [complaints, setComplaints] = useState([])
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([api('/api/complaints'), api('/api/notices')])
      .then(([c, n]) => { setComplaints(c.complaints); setNotices(n.notices.slice(0, 3)) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>

  const stats = {
    total: complaints.length,
    open: complaints.filter(c => c.status === 'Open').length,
    inProgress: complaints.filter(c => c.status === 'In Progress').length,
    resolved: complaints.filter(c => c.status === 'Resolved').length,
  }

  return (
    <div className="page">
      <div className="page-header">
        <h1>My Complaints</h1>
        <p>Track and manage your maintenance requests</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon blue"></div>
          <div className="stat-info"><h3>{stats.total}</h3><p>Total</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">🔵</div>
          <div className="stat-info"><h3>{stats.open}</h3><p>Open</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">🟡</div>
          <div className="stat-info"><h3>{stats.inProgress}</h3><p>In Progress</p></div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"></div>
          <div className="stat-info"><h3>{stats.resolved}</h3><p>Resolved</p></div>
        </div>
      </div>

      <div className="flex-between mb-24">
        <h2>Recent Complaints</h2>
        <Link to="/new-complaint" className="btn btn-primary">+ New Complaint</Link>
      </div>

      {complaints.length === 0 ? (
        <div className="empty-state">
          <div className="icon"></div>
          <h3>No complaints yet</h3>
          <p>Create your first maintenance complaint to get started.</p>
          <Link to="/new-complaint" className="btn btn-primary mt-16">+ New Complaint</Link>
        </div>
      ) : (
        <div className="complaints-grid">
          {complaints.map(c => (
            <Link to={`/complaints/${c.id}`} key={c.id} style={{ textDecoration: 'none', color: 'inherit' }}>
              <div className={`complaint-card ${c.is_overdue ? 'overdue' : ''}`}>
                <div className="complaint-card-header">
                  <h3>{c.title}</h3>
                  <StatusBadge status={c.status} overdue={c.is_overdue} />
                </div>
                <div className="complaint-card-meta">
                  <CategoryBadge category={c.category} />
                  <PriorityBadge priority={c.priority} />
                </div>
                <p className="complaint-card-desc">{c.description}</p>
                <div className="complaint-card-footer">
                  <span>{formatDate(c.created_at)}</span>
                  {c.photo_url && <span>Photo attached</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {notices.length > 0 && (
        <div className="mt-24">
          <div className="flex-between mb-16">
            <h2>Latest Notices</h2>
            <Link to="/notices" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          {notices.map(n => (
            <div key={n.id} className={`notice-card mb-16 ${n.is_important ? 'pinned' : ''}`}>
              <h3>{n.is_important ? '📌 ' : ''}{n.title}</h3>
              <p style={{ marginTop: 8 }}>{n.content}</p>
              <div className="notice-card-footer">
                <span>By {n.posted_by_name}</span>
                <span>{formatDate(n.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
