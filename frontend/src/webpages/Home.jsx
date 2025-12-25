import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { googleLogout } from '@react-oauth/google'
import '../App.css'

function Home() {
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
        <p className="pill">Home</p>
        <h1>Welcome back{user?.name ? `, ${user.name}` : ''}!</h1>
        <p className="lede">You successfully signed in with Google. Manage your session below.</p>
      </div>

      <div className="panel">
        {user ? (
          <div className="user-card">
            <div className="user-card__info">
              {user.picture && <img src={user.picture} alt={user.name} />}
              <div>
                <p className="eyebrow">Signed in</p>
                <h3>{user.name}</h3>
                <p className="microcopy">{user.email}</p>
              </div>
            </div>
            <div className="user-card__actions">
              <button type="button" className="google" onClick={handleLogout}>
                Logout
              </button>
              <button type="button" className="google" onClick={() => navigate('/')}>
                Back to Landing
              </button>
            </div>
          </div>
        ) : (
          <p className="lede">No active session. Redirecting...</p>
        )}
      </div>
    </div>
  )
}

export default Home
