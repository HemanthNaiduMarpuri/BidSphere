import { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../services/api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('access')
    if (token) {
      authAPI.profile()
        .then(res => setUser(res.data))
        .catch(() => localStorage.clear())
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = async (email, password) => {
    const { data } = await authAPI.login({ email, password })
    localStorage.setItem('access', data.access)
    localStorage.setItem('refresh', data.refresh)
    const profile = await authAPI.profile()
    setUser(profile.data)
    return profile.data
  }

  const logout = async () => {
    try {
      await authAPI.logout(localStorage.getItem('refresh'))
    } catch {}
    localStorage.clear()
    setUser(null)
  }

  const refreshUser = async () => {
    const res = await authAPI.profile()
    setUser(res.data)
    return res.data
  }

  return (
    <AuthContext.Provider value={{ user,setUser, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
