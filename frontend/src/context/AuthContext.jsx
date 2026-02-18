import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [engineer, setEngineer] = useState(() => {
    const saved = localStorage.getItem('snag_engineer')
    return saved ? JSON.parse(saved) : null
  })

  const login = (eng) => {
    localStorage.setItem('snag_engineer', JSON.stringify(eng))
    setEngineer(eng)
  }

  const logout = () => {
    localStorage.removeItem('snag_engineer')
    setEngineer(null)
  }

  const updateEngineer = (data) => {
    const updated = { ...engineer, ...data }
    localStorage.setItem('snag_engineer', JSON.stringify(updated))
    setEngineer(updated)
  }

  return (
    <AuthContext.Provider value={{ engineer, login, logout, updateEngineer }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
