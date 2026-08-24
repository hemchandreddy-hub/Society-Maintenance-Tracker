import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, PriorityBadge, CategoryBadge, formatDate, formatDateTime } from '../components/StatusBadge'

export default function ComplaintDetail() {
  const { id } = useParams()
  const { api } = useAuth()
  const [complaint, setComplaint] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api(`/api/complaints/${id}`)
      .then(data => { setComplaint(data.complaint); setHistory(data.history) })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!complaint) return <div className="page"><div className="empty-state"><h3>Complaint not found</h3></div></div>

  return (
    <div className="page">
      <Link to="/" className="btn btn-secondary btn-sm mb-24">← Back</Link>
      <div className="detail-grid">
        <div className="detail-main">
          <div className="glass-card">
            <div className="flex-between mb-16">
              <h1 style={{ fontSize: '1.5rem' }}>{complaint.title}</h1>
              <StatusBadge status={complaint.status} overdue={complaint.is_overdue} />
            </div>
            <div className="flex gap-8 mb-16">
              <CategoryBadge category={complaint.category} />
              <PriorityBadge priority={complaint.priority} />
            </div>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.8 }}>{complaint.description}</p>
            {complaint.photo_url && (
              <div className="mt-24">
                <label style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: 600 }}>ATTACHED PHOTO</label>
                <img src={complaint.photo_url} alt="Complaint" className="detail-photo mt-16" style={{ maxHeight: 400 }} />
              </div>
            )}
          </div>

          <div className="glass-card">
            <h2 style={{ fontSize: '1.1rem', marginBottom: 20 }}>📋 Status Timeline</h2>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text-muted)' }}>No history yet.</p>
            ) : (
              <div className="timeline">
                {history.map(h => (
                  <div key={h.id} className={`timeline-item ${h.new_status === 'Resolved' ? 'resolved' : ''}`}>
                    <div className="timeline-date">{formatDateTime(h.created_at)}</div>
                    <div className="timeline-content">
                      {h.old_status ? (
                        <span>Status changed from <strong>{h.old_status}</strong> → <strong>{h.new_status}</strong></span>
                      ) : (
                        <span>Complaint <strong>created</strong> with status <strong>{h.new_status}</strong></span>
                      )}
                    </div>
                    {h.note && <div className="timeline-note">💬 {h.note}</div>}
                    <div className="timeline-actor">by {h.changed_by_name}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="detail-sidebar">
          <div className="glass-card">
            <h3 style={{ fontSize: '0.95rem', marginBottom: 16 }}>Details</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>COMPLAINT ID</label><p>#{complaint.id}</p></div>
              <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>CREATED</label><p>{formatDate(complaint.created_at)}</p></div>
              <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>LAST UPDATED</label><p>{formatDate(complaint.updated_at)}</p></div>
              {complaint.resolved_at && <div><label style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600 }}>RESOLVED</label><p>{formatDate(complaint.resolved_at)}</p></div>}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
