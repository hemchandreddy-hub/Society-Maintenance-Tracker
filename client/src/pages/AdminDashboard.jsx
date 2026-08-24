import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { formatDate } from '../components/StatusBadge'

const COLORS = ['#2563eb', '#d97706', '#059669', '#dc2626', '#7c3aed', '#0891b2']

export default function AdminDashboard() {
  const { api } = useAuth()
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/api/dashboard').then(setData).catch(console.error).finally(() => setLoading(false))
  }, [])

  if (loading) return <div className="loading"><div className="spinner" /></div>
  if (!data) return null

  const statusMap = {}
  data.byStatus.forEach(s => { statusMap[s.status] = s.count })
  const maxCat = Math.max(...data.byCategory.map(c => c.count), 1)

  return (
    <div className="page">
      <div className="page-header">
        <h1>Admin Dashboard</h1>
        <p>Overview of all maintenance activity</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card"><div className="stat-icon blue"></div><div className="stat-info"><h3>{data.totalComplaints}</h3><p>Total Complaints</p></div></div>
        <div className="stat-card"><div className="stat-icon blue">🔵</div><div className="stat-info"><h3>{statusMap['Open'] || 0}</h3><p>Open</p></div></div>
        <div className="stat-card"><div className="stat-icon amber">🟡</div><div className="stat-info"><h3>{statusMap['In Progress'] || 0}</h3><p>In Progress</p></div></div>
        <div className="stat-card"><div className="stat-icon green"></div><div className="stat-info"><h3>{statusMap['Resolved'] || 0}</h3><p>Resolved</p></div></div>
        <div className="stat-card"><div className="stat-icon red">🔴</div><div className="stat-info"><h3>{data.overdueCount}</h3><p>Overdue</p></div></div>
        <div className="stat-card"><div className="stat-icon purple"></div><div className="stat-info"><h3>{data.totalResidents}</h3><p>Residents</p></div></div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <div className="glass-card">
          <h3 style={{ marginBottom: 20 }}>Complaints by Category</h3>
          <div className="chart-bar-container">
            {data.byCategory.map((c, i) => (
              <div className="chart-bar-row" key={c.category}>
                <div className="chart-bar-label">{c.category}</div>
                <div className="chart-bar" style={{ width: `${(c.count / maxCat) * 100}%`, background: COLORS[i % COLORS.length] }} />
                <div className="chart-bar-value">{c.count}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="glass-card">
          <h3 style={{ marginBottom: 20 }}>Recent Complaints</h3>
          {data.recentComplaints.map(c => (
            <Link to={`/complaints/${c.id}`} key={c.id} style={{ textDecoration: 'none', color: 'inherit', display: 'block', padding: '12px 0', borderBottom: '1px solid var(--border-glass)' }}>
              <div className="flex-between">
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{c.title}</div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 2 }}>{c.resident_name} • {c.apartment_no}</div>
                </div>
                <span className={`badge ${c.status === 'In Progress' ? 'in-progress' : c.status.toLowerCase()}`}>{c.status}</span>
              </div>
            </Link>
          ))}
          <Link to="/complaints" className="btn btn-secondary btn-sm btn-block mt-16">View All Complaints</Link>
        </div>
      </div>
    </div>
  )
}
