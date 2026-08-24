import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Register() {
  const { user, register } = useAuth()
  const [form, setForm] = useState({ name: '', email: '', password: '', apartment_no: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try { await register(form.name, form.email, form.password, form.apartment_no) }
    catch (err) { setError(err.message) }
    finally { setLoading(false) }
  }

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1>🏠 Create Account</h1>
        <p className="subtitle">Register as a resident</p>
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="name">Full Name</label>
            <input id="name" className="form-input" placeholder="Your full name"
              value={form.name} onChange={update('name')} required />
          </div>
          <div className="form-group">
            <label htmlFor="reg-email">Email</label>
            <input id="reg-email" type="email" className="form-input" placeholder="Your email"
              value={form.email} onChange={update('email')} required />
          </div>
          <div className="form-group">
            <label htmlFor="apartment">Apartment Number</label>
            <input id="apartment" className="form-input" placeholder="e.g. A-101"
              value={form.apartment_no} onChange={update('apartment_no')} />
          </div>
          <div className="form-group">
            <label htmlFor="reg-password">Password</label>
            <input id="reg-password" type="password" className="form-input" placeholder="Min 6 characters"
              value={form.password} onChange={update('password')} required minLength={6} />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>
        <p className="auth-footer">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  )
}
