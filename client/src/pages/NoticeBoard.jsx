import { useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../components/StatusBadge'

export default function NoticeBoard() {
  const { api, user } = useAuth()
  const [notices, setNotices] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', content: '', is_important: false })
  const [submitting, setSubmitting] = useState(false)

  const load = () => {
    api('/api/notices').then(d => setNotices(d.notices)).catch(console.error).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await api('/api/notices', { method: 'POST', body: JSON.stringify(form) })
      setForm({ title: '', content: '', is_important: false })
      setShowForm(false)
      load()
    } catch (err) { alert(err.message) }
    finally { setSubmitting(false) }
  }

  const deleteNotice = async (id) => {
    if (!confirm('Delete this notice?')) return
    try { await api(`/api/notices/${id}`, { method: 'DELETE' }); load() }
    catch (err) { alert(err.message) }
  }

  if (loading) return <div className="loading"><div className="spinner" /></div>

  return (
    <div className="page">
      <div className="flex-between mb-24">
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800 }}>Notice Board</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: 8 }}>Important announcements and updates</p>
        </div>
        {user.role === 'admin' && (
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Post Notice'}
          </button>
        )}
      </div>

      {showForm && (
        <div className="glass-card mb-24">
          <h2 style={{ fontSize: '1.1rem', marginBottom: 20 }}>New Notice</h2>
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="notice-title">Title</label>
              <input id="notice-title" className="form-input" placeholder="Notice title"
                value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} required />
            </div>
            <div className="form-group">
              <label htmlFor="notice-content">Content</label>
              <textarea id="notice-content" className="form-textarea" placeholder="Notice content..."
                value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} required />
            </div>
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input type="checkbox" checked={form.is_important}
                  onChange={e => setForm({ ...form, is_important: e.target.checked })} />
                <span>Mark as Important (pin to top + email all residents)</span>
              </label>
            </div>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Posting...' : 'Post Notice'}
            </button>
          </form>
        </div>
      )}

      {notices.length === 0 ? (
        <div className="empty-state"><div className="icon"></div><h3>No notices yet</h3></div>
      ) : (
        <div className="complaints-grid">
          {notices.map(n => (
            <div key={n.id} className={`notice-card ${n.is_important ? 'pinned' : ''}`}>
              <div className="notice-card-header">
                <h3>{n.title}
                  {n.is_important && <span className="badge important" style={{ marginLeft: 8 }}>Important</span>}
                </h3>
                {user.role === 'admin' && (
                  <button className="btn btn-danger btn-sm" onClick={() => deleteNotice(n.id)} style={{ padding: '4px 10px', fontSize: '0.75rem' }}>✕</button>
                )}
              </div>
              <p>{n.content}</p>
              <div className="notice-card-footer">
                <span>Posted by {n.posted_by_name}</span>
                <span>{formatDate(n.created_at)}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
