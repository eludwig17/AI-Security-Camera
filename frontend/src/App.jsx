
import './App.css'
import { Navigate, Route, Routes } from 'react-router-dom'
import Landing from './webpages/Landing'
import Home from './webpages/Home'
import ViewLive from './webpages/viewLive'
import ViewArchives from './webpages/viewArchives'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/home" element={<Home />} />
      <Route path="/live" element={<ViewLive />} />
      <Route path="/archives" element={<ViewArchives />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
