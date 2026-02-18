import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import LoginPage from './pages/LoginPage'
import Dashboard from './pages/Dashboard'
import PPMPage from './pages/PPMPage'
import ReactivePage from './pages/ReactivePage'
import HandoverPage from './pages/HandoverPage'
import OvertimePage from './pages/OvertimePage'
import CalendarPage from './pages/CalendarPage'
import CompletedJobsPage from './pages/CompletedJobsPage'
import PartsOrderPage from './pages/PartsOrderPage'
import ContractorPage from './pages/ContractorPage'
import Layout from './components/Layout'

function ProtectedRoute({ children }) {
  const { engineer } = useAuth()
  if (!engineer) return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<LoginPage />} />
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="ppm" element={<PPMPage />} />
          <Route path="reactive" element={<ReactivePage />} />
          <Route path="handover" element={<HandoverPage />} />
          <Route path="overtime" element={<OvertimePage />} />
          <Route path="calendar" element={<CalendarPage />} />
          <Route path="completed" element={<CompletedJobsPage />} />
          <Route path="parts" element={<PartsOrderPage />} />
          <Route path="contractors" element={<ContractorPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  )
}
