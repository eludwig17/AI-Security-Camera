import { useState } from 'react'
import { GoogleLogin, googleLogout } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { useNavigate } from 'react-router-dom'
import '../App.css'

function Landing() {
  const navigate = useNavigate()
  const [user, setUser] = useState(() => {
    const stored = localStorage.getItem('googleUser')
    return stored ? JSON.parse(stored) : null
  })

  const handleGoogleSuccess = (credentialResponse) => {
    if (!credentialResponse?.credential) return
    try {
      const decoded = jwtDecode(credentialResponse.credential)
      const profile = {
        name: decoded.name,
        email: decoded.email,
        picture: decoded.picture,
        provider: 'google',
      }
      setUser(profile)
      localStorage.setItem('googleUser', JSON.stringify(profile))
      navigate('/home')
    } catch (err) {
      console.error('Failed to decode Google JWT', err)
      alert('Could not read your Google profile. Please try again.')
    }
  }

  const handleGoogleError = () => {
    alert('Google sign-in failed. Please try again.')
  }

  const handleLogout = () => {
    googleLogout()
    setUser(null)
    localStorage.removeItem('googleUser')
    navigate('/')
  }

  return (
    <div className="page" style={{ maxWidth: '480px' }}>
      <div className="page__header">
        <p className="pill">Elijah Ludwig · CSC 495/496 Senior Project</p>
        <h1>AI Security Camera</h1>
        <p className="lede">Sign in to access the live feed and detection archives.</p>
      </div>

      <div className="panel auth">
        <p className="eyebrow">Account</p>
        <h2>Sign In</h2>
        <div className="auth__form">
          {!user ? (
            <GoogleLogin onSuccess={handleGoogleSuccess} onError={handleGoogleError} useOneTap />
          ) : (
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
                <button type="button" className="google" onClick={() => navigate('/home')}>
                  Go to Home
                </button>
                <button type="button" className="google" onClick={handleLogout}>
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Landing