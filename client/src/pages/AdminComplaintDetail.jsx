import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { StatusBadge, PriorityBadge, CategoryBadge, formatDate, formatDateTime } from '../components/StatusBadge'

export default function AdminComplaintDetail() {
  const { id } = useParams()
  const { api } = useAuth()
  const [complaint, setComplaint] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [statusForm, setStatusForm] = useState({ status: '', note: '' })
  const [priority, setPriority] = useState('')
  const [updating, setUpdating] = useState(false)

  const load = () => {
    api(`/api/complaints/${id}`)
      .then(data => {
        setComplaint(data.complaint)
        setHistory(data.history)
        setPriority(data.complaint.priority)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [id])

  const updateStatus = async () => {
    if (!statusForm.status) return
    setUpdating(true)
    try {
      await api(`/api/complaints/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify(statusForm),
      })
      setStatusForm({ status: '', note: '' })
      load()
    } catch (err) { alert(err.message) }
    finally { setUpdating(false) }
  }

  const updatePriority = async (newPriority) => {
    try {
      await api(`/api/complaints/${id}/priority`, {
        method: 'PATCH',
        body: JSON.stringify({ priority: newPriority }),
      })
      setPriority(newPriority)
      load()
    } catch (err) { alert(err.message) }
  }

  const flagOverdue = async () => {
    try {
      await api(`/api/complaints/${id}/overdue`, { method: 'POST' })
      load()
    } catch (err) { alert(err.message) }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!complaint) return <div className="page"><div className="empty-state"><h3>Complaint not found</h3></div></div>

  const isResolved = complaint.status === 'Resolved'

  return (
    <div className="page">
      <Link to="/complaints" className="btn btn-secondary btn-sm mb-24">← Back to Complaints</Link>
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
            <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: 16 }}>
              By <strong>{complaint.resident_name}</strong> • Apt {complaint.apartment_no} • #{complaint.id}
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
            <h2 style={{ fontSize: '1.1rem', marginBottom: 20 }}>Status Timeline</h2>
            <div className="timeline">
              {history.map(h => (
                <div key={h.id} className={`timeline-item ${h.new_status === 'Resolved' ? 'resolved' : ''}`}>
                  <div className="timeline-date">{formatDateTime(h.created_at)}</div>
                  <div className="timeline-content">
                    {h.old_status
                      ? <span>Status: <strong>{h.old_status}</strong> → <strong>{h.new_status}</strong></span>
                      : <span>Complaint <strong>created</strong> ({h.new_status})</span>}
                  </div>
                  {h.note && <div className="timeline-note">💬 {h.note}</div>}
                  <div className="timeline-actor">by {h.changed_by_name}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="detail-sidebar">
          <div className="glass-card">
            <h3 style={{ fontSize: '0.95rem', marginBottom: 16 }}>Info</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, fontSize: '0.85rem' }}>
              <div><span style={{ color: 'var(--text-muted)' }}>ID:</span> #{complaint.id}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Created:</span> {formatDate(complaint.created_at)}</div>
              <div><span style={{ color: 'var(--text-muted)' }}>Updated:</span> {formatDate(complaint.updated_at)}</div>
              {complaint.resolved_at && <div><span style={{ color: 'var(--text-muted)' }}>Resolved:</span> {formatDate(complaint.resolved_at)}</div>}
            </div>
          </div>

          {!isResolved && (
            <>
              <div className="glass-card">
                <h3 style={{ fontSize: '0.95rem', marginBottom: 16 }}>Update Status</h3>
                <div className="form-group">
                  <select className="form-select" value={statusForm.status}
                    onChange={e => setStatusForm({ ...statusForm, status: e.target.value })}>
                    <option value="">Select new status</option>
                    {complaint.status === 'Open' && <option value="In Progress">In Progress</option>}
                    <option value="Resolved">Resolved</option>
                  </select>
                </div>
                <div className="form-group">
                  <textarea className="form-textarea" placeholder="Add a note (optional)" rows={3}
                    style={{ minHeight: 80 }} value={statusForm.note}
                    onChange={e => setStatusForm({ ...statusForm, note: e.target.value })} />
                </div>
                <button className="btn btn-primary btn-block btn-sm" onClick={updateStatus}
                  disabled={!statusForm.status || updating}>
                  {updating ? 'Updating...' : 'Update Status'}
                </button>
              </div>

              <div className="glass-card">
                <h3 style={{ fontSize: '0.95rem', marginBottom: 16 }}>Set Priority</h3>
                <div className="flex gap-8">
                  {['Low', 'Medium', 'High'].map(p => (
                    <button key={p} className={`btn btn-sm ${priority === p ? 'btn-primary' : 'btn-secondary'}`}
                      onClick={() => updatePriority(p)}>{p}</button>
                  ))}
                </div>
              </div>

              {!complaint.is_overdue && (
                <button className="btn btn-danger btn-block btn-sm" onClick={flagOverdue}>
                  ⚠ Flag as Overdue
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
