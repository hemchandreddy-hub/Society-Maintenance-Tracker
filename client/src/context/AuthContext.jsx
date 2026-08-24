import { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(localStorage.getItem('token'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => setUser(data.user))
        .catch(() => { localStorage.removeItem('token'); setToken(null) })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [token])

  const login = async (email, password) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const register = async (name, email, password, apartment_no) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password, apartment_no })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    localStorage.setItem('token', data.token)
    setToken(data.token)
    setUser(data.user)
    return data.user
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
  }

  const api = async (url, options = {}) => {
    const headers = { ...options.headers }
    if (token) headers.Authorization = `Bearer ${token}`
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json'
    const res = await fetch(url, { ...options, headers })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error)
    return data
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, api }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
