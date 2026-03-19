import { Routes, Route, Navigate } from 'react-router-dom'
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
import PaymentCancel from './pages/Payment/PaymentCancel'
import ClientDashboard from './pages/Dashboard/ClientDashboard'
import CoiffeurDashboard from './pages/Dashboard/CoiffeurDashboard'
import Profile from './pages/Profile/Profile'
import QRCodes from './pages/Marketing/QRCodes'
import ProPending from './pages/Pro/ProPending'
import ProOnboarding from './pages/Auth/ProOnboarding'
import AdminDashboard from './pages/Admin/AdminDashboard'
import NotFound from './pages/NotFound'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import InstallPrompt from './components/PWA/InstallPrompt'
import Cart from './pages/Order/Cart'
import OrderCheckout from './pages/Order/OrderCheckout'
import OrderReceipt from './pages/Order/OrderReceipt'
import OrderPaymentSuccess from './pages/Order/OrderPaymentSuccess'
import OrderPaymentCancel from './pages/Order/OrderPaymentCancel'
import SEOHead from './components/SEO/SEOHead'
import { ADMIN_PATH_ROUTE_SEGMENT } from './utils/adminPath'

function App() {
  return (
    <>
    <InstallPrompt />
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Public routes */}
        <Route index element={<><SEOHead title="Jolof’Era â€” Salon de coiffure, rÃ©servation en ligne & boutique au SÃ©nÃ©gal" description="Jolof’Era est la plateforme nÂ°1 au SÃ©nÃ©gal pour rÃ©server un salon de coiffure, un institut de beautÃ© ou commander dans une boutique en ligne Ã  Dakar." canonical="https://jolofera.com" /><Home /></>} />
        <Route path="login" element={<><SEOHead title="Connexion â€” Jolof’Era" noindex /><Login /></>} />
        <Route path="register" element={<><SEOHead title="Inscription â€” Jolof’Era" noindex /><Register /></>} />
        <Route path="forgot-password" element={<><SEOHead title="Mot de passe oubliÃ© â€” Jolof’Era" noindex /><ForgotPassword /></>} />
        <Route path="salons" element={<><SEOHead title="Salons de coiffure & boutiques Ã  Dakar â€” Jolof’Era" description="Trouvez et rÃ©servez les meilleurs salons de coiffure, barbershops, instituts de beautÃ© et boutiques Ã  Dakar, SÃ©nÃ©gal." /><Salons /></>} />
        <Route path="salon/:id" element={<SalonDetail />} />
        <Route path="qr-codes" element={<><SEOHead title="QR Codes â€” Jolof’Era" noindex /><QRCodes /></>} />
        
        {/* Protected routes - Client */}
        <Route path="booking/:salonId" element={
          <ProtectedRoute>
            <SEOHead title="RÃ©servation â€” Jolof’Era" noindex />
            <Booking />
          </ProtectedRoute>
        } />
        <Route path="payment" element={
          <ProtectedRoute>
            <SEOHead title="Paiement â€” Jolof’Era" noindex />
            <Payment />
          </ProtectedRoute>
        } />
        <Route path="payment/success" element={
          <ProtectedRoute>
            <SEOHead title="Paiement rÃ©ussi â€” Jolof’Era" noindex />
            <PaymentSuccess />
          </ProtectedRoute>
        } />
        <Route path="payment/cancel" element={
          <ProtectedRoute>
            <SEOHead title="Paiement annulÃ© â€” Jolof’Era" noindex />
            <PaymentCancel />
          </ProtectedRoute>
        } />
        <Route path="cart" element={<><SEOHead title="Panier â€” Jolof’Era" noindex /><Cart /></>} />
        <Route path="order/checkout" element={
          <ProtectedRoute>
            <SEOHead title="Commande â€” Jolof’Era" noindex />
            <OrderCheckout />
          </ProtectedRoute>
        } />
        <Route path="order/receipt" element={
          <ProtectedRoute>
            <SEOHead title="ReÃ§u de commande â€” Jolof’Era" noindex />
            <OrderReceipt />
          </ProtectedRoute>
        } />
        <Route path="order/payment/success" element={
          <ProtectedRoute>
            <SEOHead title="Paiement rÃ©ussi â€” Jolof’Era" noindex />
            <OrderPaymentSuccess />
          </ProtectedRoute>
        } />
        <Route path="order/payment/cancel" element={
          <ProtectedRoute>
            <SEOHead title="Paiement annulÃ© â€” Jolof’Era" noindex />
            <OrderPaymentCancel />
          </ProtectedRoute>
        } />
        <Route path="dashboard" element={
          <ProtectedRoute>
            <SEOHead title="Mon tableau de bord â€” Jolof’Era" noindex />
            <ClientDashboard />
          </ProtectedRoute>
        } />
        <Route path="profile" element={
          <ProtectedRoute>
            <SEOHead title="Mon profil â€” Jolof’Era" noindex />
            <Profile />
          </ProtectedRoute>
        } />
        
        {/* Protected routes - PRO */}
        <Route path="pro/onboarding" element={
          <ProtectedRoute requiredRole="PRO">
            <SEOHead title="Inscription Pro â€” Jolof’Era" noindex />
            <ProOnboarding />
          </ProtectedRoute>
        } />
        <Route path="pro/pending" element={
          <ProtectedRoute requiredRole="PRO">
            <SEOHead title="En attente d'approbation â€” Jolof’Era" noindex />
            <ProPending />
          </ProtectedRoute>
        } />
        <Route path="pro/dashboard" element={
          <ProtectedRoute requiredRole="PRO" requireApproved>
            <SEOHead title="Dashboard Pro â€” Jolof’Era" noindex />
            <CoiffeurDashboard />
          </ProtectedRoute>
        } />
        
        {/* Legacy admin path - no dashboard exposure */}
        <Route path="admin/*" element={<Navigate to="/login" replace />} />

        {/* Protected routes - ADMIN */}
        <Route path={`${ADMIN_PATH_ROUTE_SEGMENT}/*`} element={
          <ProtectedRoute adminOnly>
            <SEOHead title="Administration â€” Jolof’Era" noindex />
            <AdminDashboard />
          </ProtectedRoute>
        } />
        
        {/* 404 */}
        <Route path="*" element={<><SEOHead title="Page non trouvÃ©e â€” Jolof’Era" noindex /><NotFound /></>} />
      </Route>
    </Routes>
    </>
  )
}

export default App

