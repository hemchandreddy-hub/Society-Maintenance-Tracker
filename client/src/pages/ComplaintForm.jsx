import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

const CATEGORIES = ['Plumbing', 'Electrical', 'Elevator', 'Parking', 'Common Area', 'Other']

export default function ComplaintForm() {
  const { token } = useAuth()
  const navigate = useNavigate()
  const fileRef = useRef()
  const [form, setForm] = useState({ category: '', title: '', description: '' })
  const [photo, setPhoto] = useState(null)
  const [preview, setPreview] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handlePhoto = (e) => {
    const file = e.target.files[0]
    if (file) {
      setPhoto(file)
      setPreview(URL.createObjectURL(file))
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const fd = new FormData()
      fd.append('category', form.category)
      fd.append('title', form.title)
      fd.append('description', form.description)
      if (photo) fd.append('photo', photo)

      const res = await fetch('/api/complaints', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      navigate('/')
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value })

  return (
    <div className="page" style={{ maxWidth: 640 }}>
      <div className="page-header">
        <h1>New Complaint</h1>
        <p>Describe your maintenance issue</p>
      </div>

      <div className="glass-card">
        {error && <div className="error-msg">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="category">Category *</label>
            <select id="category" className="form-select" value={form.category} onChange={update('category')} required>
              <option value="">Select a category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="title">Title *</label>
            <input id="title" className="form-input" placeholder="Brief title for your complaint"
              value={form.title} onChange={update('title')} required />
          </div>
          <div className="form-group">
            <label htmlFor="description">Description *</label>
            <textarea id="description" className="form-textarea" placeholder="Describe the issue in detail..."
              value={form.description} onChange={update('description')} required />
          </div>
          <div className="form-group">
            <label>Photo (optional)</label>
            <div className={`photo-upload ${photo ? 'has-file' : ''}`} onClick={() => fileRef.current.click()}>
              <input ref={fileRef} type="file" accept="image/*" onChange={handlePhoto} style={{ display: 'none' }} />
              {preview ? (
                <img src={preview} alt="Preview" className="photo-preview" />
              ) : (
                <>
                  <div className="icon"></div>
                  <p>Click to upload a photo</p>
                  <p style={{ fontSize: '0.75rem', marginTop: 4 }}>JPEG, PNG, WebP — Max 5MB</p>
                </>
              )}
            </div>
          </div>
          <div className="flex gap-12">
            <button type="submit" className="btn btn-primary" disabled={loading} style={{ flex: 1 }}>
              {loading ? 'Submitting...' : 'Submit Complaint'}
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate('/')}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}
