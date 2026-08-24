import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

export default function Navbar() {
  const { user, logout } = useAuth()
  const location = useLocation()
  const isActive = (path) => location.pathname === path ? 'active' : ''

  if (!user) return null

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        🏠 <span>Society</span> Tracker
      </Link>
      <div className="navbar-links">
        {user.role === 'admin' ? (
          <>
            <Link to="/" className={isActive('/')}>Dashboard</Link>
            <Link to="/complaints" className={isActive('/complaints')}>Complaints</Link>
            <Link to="/notices" className={isActive('/notices')}>Notices</Link>
          </>
        ) : (
          <>
            <Link to="/" className={isActive('/')}>My Complaints</Link>
            <Link to="/new-complaint" className={isActive('/new-complaint')}>New Complaint</Link>
            <Link to="/notices" className={isActive('/notices')}>Notices</Link>
          </>
        )}
        <div className="nav-user">
          <span className={`role-badge ${user.role}`}>{user.role}</span>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{user.name}</span>
          <button onClick={logout}>Logout</button>
        </div>
      </div>
    </nav>
  )
}
