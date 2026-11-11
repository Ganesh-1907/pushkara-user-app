import { useEffect } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { refreshMe, useUser } from './api/auth'
import { Frame } from './components/Shell'
import Splash from './pages/Splash'
import Login from './pages/Login'
import HomePage from './pages/Home'
import ScanPage from './pages/Scan'
import AssetsPage from './pages/Assets'
import AssetDetail from './pages/AssetDetail'
import WorksPage from './pages/Works'
import WorkDetail from './pages/WorkDetail'
import ReportIssue from './pages/ReportIssue'
import IssuesPage from './pages/Issues'
import IssueDetail from './pages/IssueDetail'
import MaintenancePage from './pages/Maintenance'
import InspectionsPage from './pages/Inspections'
import InspectionForm from './pages/InspectionForm'
import CheckinPage from './pages/Checkin'
import MapPage from './pages/MapPage'
import NotificationsPage from './pages/Notifications'
import ProfilePage from './pages/Profile'

export default function App() {
  const user = useUser()
  const loc = useLocation()
  const uid = user?.id
  useEffect(() => { if (uid) refreshMe().catch(() => { /* 401 logs out; network errors are ignored */ }) }, [uid])
  const isPublic = loc.pathname === '/' || loc.pathname === '/login'
  const guard = (el: JSX.Element) => (user ? el : <Navigate to="/login" replace />)
  return (
    <Frame tabs={!isPublic && !!user}>
      <Routes>
        <Route path="/" element={<Splash />} />
        <Route path="/login" element={user ? <Navigate to="/home" replace /> : <Login />} />
        <Route path="/home" element={guard(<HomePage />)} />
        <Route path="/scan" element={guard(<ScanPage />)} />
        <Route path="/assets" element={guard(<AssetsPage />)} />
        <Route path="/assets/:id" element={guard(<AssetDetail />)} />
        <Route path="/works" element={guard(<WorksPage />)} />
        <Route path="/works/:id" element={guard(<WorkDetail />)} />
        <Route path="/report" element={guard(<ReportIssue />)} />
        <Route path="/issues" element={guard(<IssuesPage />)} />
        <Route path="/issues/:id" element={guard(<IssueDetail />)} />
        <Route path="/maintenance" element={guard(<MaintenancePage />)} />
        <Route path="/inspections" element={guard(<InspectionsPage />)} />
        <Route path="/inspections/:id" element={guard(<InspectionForm />)} />
        <Route path="/checkin" element={guard(<CheckinPage />)} />
        <Route path="/map" element={guard(<MapPage />)} />
        <Route path="/notifications" element={guard(<NotificationsPage />)} />
        <Route path="/profile" element={guard(<ProfilePage />)} />
        <Route path="*" element={<Navigate to="/home" replace />} />
      </Routes>
    </Frame>
  )
}
