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
        <Route index element={<><SEOHead title="Jolof'Era | Reservation salons Dakar" description="Reservez un salon de coiffure ou une boutique a Dakar avec Jolof'Era. Disponibilites en ligne et confirmation rapide." canonical="https://www.jolofera.com/" /><Home /></>} />
        <Route path="login" element={<><SEOHead title="Connexion — Jolof’Era" noindex /><Login /></>} />
        <Route path="register" element={<><SEOHead title="Inscription — Jolof’Era" noindex /><Register /></>} />
        <Route path="forgot-password" element={<><SEOHead title="Mot de passe oublié — Jolof’Era" noindex /><ForgotPassword /></>} />
        <Route path="salons" element={<><SEOHead title="Salons & boutiques a Dakar | Jolof'Era" description="Decouvrez les salons de coiffure, instituts et boutiques a Dakar. Comparez les avis, services et tarifs puis reservez en ligne." /><Salons /></>} />
        <Route path="salon/:id" element={<SalonDetail />} />
        <Route path="qr-codes" element={<><SEOHead title="QR Codes — Jolof’Era" noindex /><QRCodes /></>} />
        
        {/* Protected routes - Client */}
        <Route path="booking/:salonId" element={
          <ProtectedRoute>
            <SEOHead title="Réservation — Jolof’Era" noindex />
            <Booking />
          </ProtectedRoute>
        } />
        <Route path="payment" element={
          <ProtectedRoute>
            <SEOHead title="Paiement — Jolof’Era" noindex />
            <Payment />
          </ProtectedRoute>
        } />
        <Route path="payment/success" element={
          <ProtectedRoute>
            <SEOHead title="Paiement réussi — Jolof’Era" noindex />
            <PaymentSuccess />
          </ProtectedRoute>
        } />
        <Route path="payment/cancel" element={
          <ProtectedRoute>
            <SEOHead title="Paiement annulé — Jolof’Era" noindex />
            <PaymentCancel />
          </ProtectedRoute>
        } />
        <Route path="cart" element={<><SEOHead title="Panier — Jolof’Era" noindex /><Cart /></>} />
        <Route path="order/checkout" element={
          <ProtectedRoute>
            <SEOHead title="Commande — Jolof’Era" noindex />
            <OrderCheckout />
          </ProtectedRoute>
        } />
        <Route path="order/receipt" element={
          <ProtectedRoute>
            <SEOHead title="Reçu de commande — Jolof’Era" noindex />
            <OrderReceipt />
          </ProtectedRoute>
        } />
        <Route path="order/payment/success" element={
          <ProtectedRoute>
            <SEOHead title="Paiement réussi — Jolof’Era" noindex />
            <OrderPaymentSuccess />
          </ProtectedRoute>
        } />
        <Route path="order/payment/cancel" element={
          <ProtectedRoute>
            <SEOHead title="Paiement annulé — Jolof’Era" noindex />
            <OrderPaymentCancel />
          </ProtectedRoute>
        } />
        <Route path="dashboard" element={
          <ProtectedRoute>
            <SEOHead title="Mon tableau de bord — Jolof’Era" noindex />
            <ClientDashboard />
          </ProtectedRoute>
        } />
        <Route path="profile" element={
          <ProtectedRoute>
            <SEOHead title="Mon profil — Jolof’Era" noindex />
            <Profile />
          </ProtectedRoute>
        } />
        
        {/* Protected routes - PRO */}
        <Route path="pro/onboarding" element={
          <ProtectedRoute requiredRole="PRO">
            <SEOHead title="Inscription Pro — Jolof’Era" noindex />
            <ProOnboarding />
          </ProtectedRoute>
        } />
        <Route path="pro/pending" element={
          <ProtectedRoute requiredRole="PRO">
            <SEOHead title="En attente d'approbation — Jolof’Era" noindex />
            <ProPending />
          </ProtectedRoute>
        } />
        <Route path="pro/dashboard" element={
          <ProtectedRoute requiredRole="PRO" requireApproved>
            <SEOHead title="Dashboard Pro — Jolof’Era" noindex />
            <CoiffeurDashboard />
          </ProtectedRoute>
        } />
        
        {/* Legacy admin path - no dashboard exposure */}
        <Route path="admin/*" element={<Navigate to="/login" replace />} />

        {/* Protected routes - ADMIN */}
        <Route path={`${ADMIN_PATH_ROUTE_SEGMENT}/*`} element={
          <ProtectedRoute adminOnly>
            <SEOHead title="Administration — Jolof’Era" noindex />
            <AdminDashboard />
          </ProtectedRoute>
        } />
        
        {/* 404 */}
        <Route path="*" element={<><SEOHead title="Page non trouvée — Jolof’Era" noindex /><NotFound /></>} />
      </Route>
    </Routes>
    </>
  )
}

export default App

