import { Routes, Route } from 'react-router-dom'
import Layout from './components/Layout/Layout'
import Home from './pages/Home'
import Login from './pages/Auth/Login'
import Register from './pages/Auth/Register'
import ForgotPassword from './pages/Auth/ForgotPassword'
import Salons from './pages/Salons/Salons'
import SalonDetail from './pages/Salons/SalonDetail'
import Booking from './pages/Booking/Booking'
import Payment from './pages/Payment/Payment'
import PaymentSuccess from './pages/Payment/PaymentSuccess'
import ClientDashboard from './pages/Dashboard/ClientDashboard'
import CoiffeurDashboard from './pages/Dashboard/CoiffeurDashboard'
import Profile from './pages/Profile/Profile'
import QRCodes from './pages/Marketing/QRCodes'
import ProPending from './pages/Pro/ProPending'
import AdminDashboard from './pages/Admin/AdminDashboard'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/Auth/ProtectedRoute'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Public routes */}
        <Route index element={<Home />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="salons" element={<Salons />} />
        <Route path="salon/:id" element={<SalonDetail />} />
        <Route path="qr-codes" element={<QRCodes />} />
        
        {/* Protected routes - Client */}
        <Route path="booking/:salonId" element={
          <ProtectedRoute>
            <Booking />
          </ProtectedRoute>
        } />
        <Route path="payment" element={
          <ProtectedRoute>
            <Payment />
          </ProtectedRoute>
        } />
        <Route path="payment/success" element={
          <ProtectedRoute>
            <PaymentSuccess />
          </ProtectedRoute>
        } />
        <Route path="dashboard" element={
          <ProtectedRoute>
            <ClientDashboard />
          </ProtectedRoute>
        } />
        <Route path="profile" element={
          <ProtectedRoute>
            <Profile />
          </ProtectedRoute>
        } />
        
        {/* Protected routes - PRO */}
        <Route path="pro/pending" element={
          <ProtectedRoute requiredRole="PRO">
            <ProPending />
          </ProtectedRoute>
        } />
        <Route path="pro/dashboard" element={
          <ProtectedRoute requiredRole="PRO" requireApproved>
            <CoiffeurDashboard />
          </ProtectedRoute>
        } />
        
        {/* Protected routes - ADMIN */}
        <Route path="admin/*" element={
          <ProtectedRoute adminOnly>
            <AdminDashboard />
          </ProtectedRoute>
        } />
        
        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}

export default App

