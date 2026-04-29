import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import ProtectedRoute from './components/ProtectedRoute'
import Login from './pages/Login'
import Register from './pages/Register'
import Home from './pages/Home'
import AuctionAccess from './pages/AuctionAccess'
import LiveRoom from './pages/LiveRoom'
import Profile from './pages/Profile'
import Wallet from './pages/Wallet'
import Dashboard from './pages/Dashboard'
import CreateAuction from './pages/CreateAuction'
import AuctioneerRoom from './pages/AuctioneerRoom'
import SuccessPage from './pages/SuccessPage'
import UserDashboard from './pages/UserDashboard'
import CancelPage from './pages/CancelPage'
import { ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import Landing from './pages/Landing'
import Contact from './pages/Contact'
import WalletSuccess from './pages/WalletSuccess'
import WalletCancelPage from './pages/WalletCancelPage'
import Transactions from './pages/Transaction'
import Security from './pages/Security'

export default function App() {
  return (
    <AuthProvider>
      <ToastContainer
        position="top-right"
        autoClose={2500}
        theme="colored"   
        toastStyle={{
          borderRadius: '12px',
          fontSize: '14px'
        }}
      />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />


          <Route path="/home" element={
            <ProtectedRoute><Home /></ProtectedRoute>
          } />

          <Route path="/contact" element={
            <ProtectedRoute><Contact /></ProtectedRoute>
          } />

          <Route path="/auction/:id" element={
            <ProtectedRoute><AuctionAccess /></ProtectedRoute>
          } />

          <Route path="/auction/:id/live" element={
            <ProtectedRoute><LiveRoom /></ProtectedRoute>
          } />

          <Route path="/profile" element={
            <ProtectedRoute><Profile /></ProtectedRoute>
          } />

          <Route path="/profile/transactions" element={
            <ProtectedRoute><Transactions /></ProtectedRoute>
          } />
          
          <Route path="/profile/security" element={
            <ProtectedRoute><Security /></ProtectedRoute>
          } />

          <Route path="/user-dashboard" element={
            <ProtectedRoute><UserDashboard /></ProtectedRoute>
          } />

          <Route path="/wallet" element={
            <ProtectedRoute><Wallet /></ProtectedRoute>
          } />

          <Route path="/dashboard" element={
            <ProtectedRoute auctioneersOnly><Dashboard /></ProtectedRoute>
          } />

          <Route path="/dashboard/create" element={
            <ProtectedRoute auctioneersOnly><CreateAuction /></ProtectedRoute>
          } />

          <Route path="/dashboard/room/:id" element={
            <ProtectedRoute auctioneersOnly><AuctioneerRoom /></ProtectedRoute>
          } />

          <Route path="/topup/success" element={
            <ProtectedRoute><SuccessPage /></ProtectedRoute>
          } />

          <Route path="/topup/cancel" element={
            <ProtectedRoute><CancelPage /></ProtectedRoute>
          } />

          <Route path="/wallet-success" element={
            <ProtectedRoute><WalletSuccess /></ProtectedRoute>
          } />

          <Route path="/cancel" element={
            <ProtectedRoute><WalletCancelPage /></ProtectedRoute>
          } />


          <Route path="*" element={<Navigate to="/home" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
