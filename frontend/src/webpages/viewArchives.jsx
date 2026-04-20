import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { googleLogout } from '@react-oauth/google'
import '../App.css'

function ViewArchives() {
  const [user, setUser] = useState(null)
  const [query, setQuery] = useState('')
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [showVideo, setShowVideo] = useState(false)
  const [deletingEventId, setDeletingEventId] = useState(null)
  const [deleteError, setDeleteError] = useState('')
  const navigate = useNavigate()

  useEffect(() => {
    const stored = localStorage.getItem('googleUser')
    if (stored) {
      setUser(JSON.parse(stored))
    } else {
      navigate('/')
    }
  }, [navigate])

  const fetchEvents = useCallback(async (showLoading = false) => {
    if (showLoading) setLoading(true)
    try {
      const res = await fetch('/api/events?limit=100')
      const data = await res.json()
      const fetchedEvents = data.events || []
      setEvents(fetchedEvents)
      setSelectedEvent(prev => (prev ? fetchedEvents.find(e => e.id === prev.id) || null : null))
    } catch (err) {
      console.error('Failed to fetch events:', err)
    } finally {
      if (showLoading) setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchEvents(true)
    const interval = setInterval(() => fetchEvents(false), 10000)
    return () => clearInterval(interval)
  }, [fetchEvents])

  const handleDeleteEvent = async (eventToDelete) => {
    const shouldDelete = window.confirm(
      `Delete this ${eventToDelete.class_name} event and its saved snapshot/clip?`
    )
    if (!shouldDelete) return

    setDeleteError('')
    setDeletingEventId(eventToDelete.id)

    try {
      const res = await fetch(`/api/events/${eventToDelete.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.detail || 'Failed to delete event.')
      }

      setEvents(prev => prev.filter(e => e.id !== eventToDelete.id))
      setSelectedEvent(prev => (prev?.id === eventToDelete.id ? null : prev))
      setShowVideo(false)
    } catch (err) {
      console.error('Failed to delete event:', err)
      setDeleteError(err.message || 'Failed to delete event.')
    } finally {
      setDeletingEventId(null)
    }
  }

  const handleLogout = () => {
    googleLogout()
    localStorage.removeItem('googleUser')
    setUser(null)
    navigate('/')
  }

  const filtered = events.filter(e =>
    e.class_name?.toLowerCase().includes(query.toLowerCase()) ||
    e.detected_at?.includes(query)
  )

  const formatTime = (iso) => {
    try {
      return new Date(iso).toLocaleString()
    } catch {
      return iso
    }
  }

  const getClipFilename = (evt) => {
    if (!evt.clip_path) return null
    return evt.clip_path.split('/').pop()
  }

  const getSnapshotUrl = (evt) => {
    if (!evt.snapshot_path) return null
    return `/api/snapshots/${evt.snapshot_path.split('/').pop()}`
  }

  return (
    <div className="page">
      <div className="page__header">
        <p className="pill">Archives</p>
        <h1>Detection Events</h1>
        <p className="lede">
          {events.length} events recorded
          {' · '}
          {events.filter(e => e.clip_path).length} with video clips
        </p>
      </div>

      <div className="archives-grid">
        <section className="panel archive-browser">
          <div className="panel__head">
            <div>
              <p className="eyebrow">Library</p>
              <h2>Recent Detections</h2>
            </div>
          </div>
          {deleteError && (
            <div style={{ padding: '0 12px 8px', color: '#f87171', fontSize: '12px' }}>
              {deleteError}
            </div>
          )}

          {loading ? (
            <div className="archive-placeholder">
              <p className="microcopy">Loading events...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="archive-placeholder">
              <p className="microcopy">
                {query ? 'No events match your search.' : 'No detection events yet. Start streaming to generate events.'}
              </p>
            </div>
          ) : (
            <div style={{ maxHeight: '500px', overflowY: 'auto', padding: '12px' }}>
              {filtered.map((evt) => (
                <div
                  key={evt.id}
                  onClick={() => { setSelectedEvent(evt); setShowVideo(false); }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '10px 12px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    {evt.snapshot_path && (
                      <img
                        src={getSnapshotUrl(evt)}
                        alt={evt.class_name}
                        style={{
                          width: '80px',
                          height: '60px',
                          objectFit: 'cover',
                          borderRadius: '6px',
                          background: '#1a1a2e',
                        }}
                        loading="lazy"
                      />
                    )}
                    {evt.clip_path && (
                      <div style={{
                        position: 'absolute',
                        inset: 0,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.3)',
                        borderRadius: '6px',
                      }}>
                        <span style={{ fontSize: '20px' }}>▶</span>
                      </div>
                    )}
                  </div>

                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 600,
                      textTransform: 'capitalize',
                      fontSize: '14px',
                      color: evt.class_name === 'person' ? '#ef4444' : '#f59e0b',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      {evt.class_name}
                      {evt.clip_path && (
                        <span style={{
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '3px',
                          background: 'rgba(239,68,68,0.2)',
                          color: '#ef4444',
                          fontWeight: 700,
                        }}>
                          VIDEO
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: '12px', opacity: 0.5 }}>
                      {formatTime(evt.detected_at)}
                    </div>
                  </div>

                  <div style={{
                    fontSize: '12px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '4px',
                    background: 'rgba(59,130,246,0.15)',
                    color: '#3b82f6',
                  }}>
                    {(evt.confidence * 100).toFixed(0)}%
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleDeleteEvent(evt)
                    }}
                    disabled={deletingEventId === evt.id}
                    className="google"
                    style={{ padding: '6px 10px', fontSize: '12px' }}
                  >
                    {deletingEventId === evt.id ? 'Deleting' : 'Delete'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {selectedEvent && (
        <div
          onClick={() => { setSelectedEvent(null); setShowVideo(false); }}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.85)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 100,
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: '#1a2234',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '16px',
              padding: '20px',
              maxWidth: '800px',
              width: '90vw',
              maxHeight: '90vh',
              overflow: 'auto',
            }}
          >
            {showVideo && getClipFilename(selectedEvent) ? (
              <video
                controls
                autoPlay
                style={{ width: '100%', borderRadius: '8px', background: '#000' }}
                src={`/api/clips/${getClipFilename(selectedEvent)}`}
              />
            ) : (
              <div style={{ position: 'relative' }}>
                {selectedEvent.snapshot_path && (
                  <img
                    src={getSnapshotUrl(selectedEvent)}
                    alt={selectedEvent.class_name}
                    style={{ width: '100%', borderRadius: '8px' }}
                  />
                )}
                {getClipFilename(selectedEvent) && (
                  <div
                    onClick={() => setShowVideo(true)}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: 'pointer',
                      background: 'rgba(0,0,0,0.3)',
                      borderRadius: '8px',
                      transition: 'background 0.2s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.5)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.3)'}
                  >
                    <div style={{
                      width: '64px',
                      height: '64px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.9)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: '28px', color: '#000', marginLeft: '4px' }}>▶</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div style={{ marginTop: '12px', fontSize: '14px' }}>
              <strong style={{ textTransform: 'capitalize' }}>{selectedEvent.class_name}</strong>
              {' · '}
              {(selectedEvent.confidence * 100).toFixed(1)}% confidence
              {' · '}
              {formatTime(selectedEvent.detected_at)}
            </div>

            <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
              {getClipFilename(selectedEvent) && (
                <button onClick={() => setShowVideo(!showVideo)} className="google">
                  {showVideo ? 'Show Snapshot' : 'Play Video'}
                </button>
              )}
              <button
                onClick={() => handleDeleteEvent(selectedEvent)}
                className="google"
                disabled={deletingEventId === selectedEvent.id}
              >
                {deletingEventId === selectedEvent.id ? 'Deleting' : 'Delete Event'}
              </button>
              <button
                onClick={() => { setSelectedEvent(null); setShowVideo(false); }}
                className="google"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="archives-bar">
        <div className="archives-search">
          <input
            type="search"
            placeholder="Search by class name or date"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button type="button" className="google">Search</button>
        </div>
        <div className="archives-actions">
          <button type="button" className="google" onClick={() => navigate('/live')}>Go to Live</button>
          <button type="button" className="google" onClick={() => navigate('/home')}>Home</button>
          <button type="button" className="google" onClick={handleLogout}>Logout</button>
        </div>
      </div>
    </div>
  )
}

export default ViewArchives