import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Login() {
  const { user, login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try { await login(email, password) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>Welcome Back</h1>
        <p className="subtitle">Sign in to Society Maintenance Tracker</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input id="email" type="email" className="form-input" placeholder="Enter your email"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input id="password" type="password" className="form-input" placeholder="Enter your password"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>
        <p className="auth-footer">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>
        <div style={{ marginTop: 20, padding: 16, background: 'var(--bg-glass)', borderRadius: 8, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
          <strong>Demo Accounts:</strong><br />
          Admin: admin@society.com/admin123<br />
          Resident: john@resident.com/password123
        </div>
      </div>
    </div>
  )
}
