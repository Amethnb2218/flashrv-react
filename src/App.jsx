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

function App() {
  return (
    <>
    <InstallPrompt />
    <Routes>
      <Route path="/" element={<Layout />}>
        {/* Public routes */}
        <Route index element={<><SEOHead title="StyleFlow — Salon de coiffure, réservation en ligne & boutique au Sénégal" description="StyleFlow est la plateforme n°1 au Sénégal pour réserver un salon de coiffure, un institut de beauté ou commander dans une boutique en ligne à Dakar." canonical="https://styleflow.me" /><Home /></>} />
        <Route path="login" element={<><SEOHead title="Connexion — StyleFlow" noindex /><Login /></>} />
        <Route path="register" element={<><SEOHead title="Inscription — StyleFlow" noindex /><Register /></>} />
        <Route path="forgot-password" element={<><SEOHead title="Mot de passe oublié — StyleFlow" noindex /><ForgotPassword /></>} />
        <Route path="salons" element={<><SEOHead title="Salons de coiffure & boutiques à Dakar — StyleFlow" description="Trouvez et réservez les meilleurs salons de coiffure, barbershops, instituts de beauté et boutiques à Dakar, Sénégal." /><Salons /></>} />
        <Route path="salon/:id" element={<SalonDetail />} />
        <Route path="qr-codes" element={<><SEOHead title="QR Codes — StyleFlow" noindex /><QRCodes /></>} />
        
        {/* Protected routes - Client */}
        <Route path="booking/:salonId" element={
          <ProtectedRoute>
            <SEOHead title="Réservation — StyleFlow" noindex />
            <Booking />
          </ProtectedRoute>
        } />
        <Route path="payment" element={
          <ProtectedRoute>
            <SEOHead title="Paiement — StyleFlow" noindex />
            <Payment />
          </ProtectedRoute>
        } />
        <Route path="payment/success" element={
          <ProtectedRoute>
            <SEOHead title="Paiement réussi — StyleFlow" noindex />
            <PaymentSuccess />
          </ProtectedRoute>
        } />
        <Route path="payment/cancel" element={
          <ProtectedRoute>
            <SEOHead title="Paiement annulé — StyleFlow" noindex />
            <PaymentCancel />
          </ProtectedRoute>
        } />
        <Route path="cart" element={<><SEOHead title="Panier — StyleFlow" noindex /><Cart /></>} />
        <Route path="order/checkout" element={
          <ProtectedRoute>
            <SEOHead title="Commande — StyleFlow" noindex />
            <OrderCheckout />
          </ProtectedRoute>
        } />
        <Route path="order/receipt" element={
          <ProtectedRoute>
            <SEOHead title="Reçu de commande — StyleFlow" noindex />
            <OrderReceipt />
          </ProtectedRoute>
        } />
        <Route path="order/payment/success" element={
          <ProtectedRoute>
            <SEOHead title="Paiement réussi — StyleFlow" noindex />
            <OrderPaymentSuccess />
          </ProtectedRoute>
        } />
        <Route path="order/payment/cancel" element={
          <ProtectedRoute>
            <SEOHead title="Paiement annulé — StyleFlow" noindex />
            <OrderPaymentCancel />
          </ProtectedRoute>
        } />
        <Route path="dashboard" element={
          <ProtectedRoute>
            <SEOHead title="Mon tableau de bord — StyleFlow" noindex />
            <ClientDashboard />
          </ProtectedRoute>
        } />
        <Route path="profile" element={
          <ProtectedRoute>
            <SEOHead title="Mon profil — StyleFlow" noindex />
            <Profile />
          </ProtectedRoute>
        } />
        
        {/* Protected routes - PRO */}
        <Route path="pro/onboarding" element={
          <ProtectedRoute requiredRole="PRO">
            <SEOHead title="Inscription Pro — StyleFlow" noindex />
            <ProOnboarding />
          </ProtectedRoute>
        } />
        <Route path="pro/pending" element={
          <ProtectedRoute requiredRole="PRO">
            <SEOHead title="En attente d'approbation — StyleFlow" noindex />
            <ProPending />
          </ProtectedRoute>
        } />
        <Route path="pro/dashboard" element={
          <ProtectedRoute requiredRole="PRO" requireApproved>
            <SEOHead title="Dashboard Pro — StyleFlow" noindex />
            <CoiffeurDashboard />
          </ProtectedRoute>
        } />
        
        {/* Protected routes - ADMIN */}
        <Route path="admin/*" element={
          <ProtectedRoute adminOnly>
            <SEOHead title="Administration — StyleFlow" noindex />
            <AdminDashboard />
          </ProtectedRoute>
        } />
        
        {/* 404 */}
        <Route path="*" element={<><SEOHead title="Page non trouvée — StyleFlow" noindex /><NotFound /></>} />
      </Route>
    </Routes>
    </>
  )
}

export default App
