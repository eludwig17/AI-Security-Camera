import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { googleLogout } from '@react-oauth/google'
import '../App.css'

function ViewArchives() {
  const [user, setUser] = useState(null)
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem('googleUser')
    if (stored) {
      setUser(JSON.parse(stored))
    } else {
      navigate('/')
    }
  }, [navigate])

  const handleLogout = () => {
    googleLogout()
    localStorage.removeItem('googleUser')
    setUser(null)
    navigate('/')
  }

  return (
    <div className="page">
      <div className="page__header">
        <p className="pill">Archives</p>
        <h1>Saved videos & captures</h1>
        <p className="lede">Browse historical footage. Search will hook into your storage later.</p>
      </div>

      <div className="archives-grid">
        <section className="panel archive-browser">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Library</p>
              <h2>Recent files</h2>
            </div>
          </div>
          <div className="archive-placeholder">
            <p className="microcopy">
              File system integration goes here. Display saved video files or images with previews.
            </p>
          </div>
        </section>
      </div>

      <div className="archives-bar">
        <div className="archives-search">
          <input
            type="search"
            placeholder="Search saved videos or images..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="google">
            Search
          </button>
        </div>
        <div className="archives-actions">
          <button type="button" className="google" onClick={() => navigate('/live')}>
            Go to Live
          </button>
          <button type="button" className="google" onClick={() => navigate('/home')}>
            Home
          </button>
          <button type="button" className="google" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
    </div>
  )
}

export default ViewArchives
