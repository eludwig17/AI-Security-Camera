import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { googleLogout } from '@react-oauth/google'
import '../App.css'

function ViewLive() {
  const [user, setUser] = useState(null)
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
        <p className="pill">Live Monitoring</p>
        <h1>View Live Feed</h1>
        <p className="lede">
          Incoming video stream from your external device will render in the panel below.
        </p>
      </div>

      <div className="live-grid">
        <section className="panel live-panel">
          <div className="live-video">
            <div className="live-video__status">
              <span className="dot-active" />
              <p className="microcopy">{user ? 'Connected as ' + user.email : 'Waiting...'}</p>
            </div>
            <div className="live-video__viewport">
              <p className="microcopy">Live video will appear here from the external device.</p>
            </div>
          </div>
        </section>

        <aside className="panel live-actions">
          <p className="eyebrow">Session</p>
          <h3>{user?.name || 'Guest'}</h3>
          <p className="microcopy">{user?.email || 'Not signed in'}</p>
          <div className="user-card__actions">
            <button type="button" className="google" onClick={() => navigate('/home')}>
              Go to Home
            </button>
            <button type="button" className="google" onClick={() => navigate('/archives')}>
              View Archives
            </button>
            <button type="button" className="google" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </aside>
      </div>
    </div>
  )
}

export default ViewLive
