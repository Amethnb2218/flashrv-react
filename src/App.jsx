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
import ClientSocialDemo from './pages/Marketing/ClientSocialDemo'
import ProPending from './pages/Pro/ProPending'
import ProOnboarding from './pages/Auth/ProOnboarding'
import AdminDashboard from './pages/Admin/AdminDashboard'
import NotFound from './pages/NotFound'
import FAQ from './pages/Info/FAQ'
import HowItWorks from './pages/Info/HowItWorks'
import TermsOfUse from './pages/Legal/TermsOfUse'
import PrivacyPolicy from './pages/Legal/PrivacyPolicy'
import LegalNotice from './pages/Legal/LegalNotice'
import TermsOfSale from './pages/Legal/TermsOfSale'
import ProtectedRoute from './components/Auth/ProtectedRoute'
import InstallPrompt from './components/PWA/InstallPrompt'
import Cart from './pages/Order/Cart'
import OrderCheckout from './pages/Order/OrderCheckout'
import OrderReceipt from './pages/Order/OrderReceipt'
import OrderPaymentSuccess from './pages/Order/OrderPaymentSuccess'
import OrderPaymentCancel from './pages/Order/OrderPaymentCancel'
import SEOHead from './components/SEO/SEOHead'
import { ADMIN_PATH_ROUTE_SEGMENT } from './utils/adminPath'
import SiteVisitTracker from './components/Analytics/SiteVisitTracker'

function App() {
  return (
    <>
    <InstallPrompt />
    <SiteVisitTracker />
    <Routes>
      <Route
        path="/demo/client-social"
        element={
          <>
            <SEOHead
              title="Demo client premium | Jolof'Era"
              description="Demo verticale premium de 40 secondes pour Jolof'Era: accueil, inscription, connexion, reservation salon et achat article."
              noindex
            />
            <ClientSocialDemo />
          </>
        }
      />
      <Route path="/" element={<Layout />}>
        {/* Public routes */}
        <Route index element={<><SEOHead title="Jolof'Era | Reservation salon coiffure Dakar" description="Reservez un salon de coiffure, barbershop ou boutique a Dakar et au Senegal. Comparez les avis, tarifs et disponibilites avec Jolof'Era." canonical="https://www.jolofera.com/" /><Home /></>} />
        <Route path="login" element={<><SEOHead title="Connexion — Jolof’Era" noindex /><Login /></>} />
        <Route path="register" element={<><SEOHead title="Inscription — Jolof’Era" noindex /><Register /></>} />
        <Route path="forgot-password" element={<><SEOHead title="Mot de passe oublié — Jolof’Era" noindex /><ForgotPassword /></>} />
        <Route path="salons" element={<><SEOHead title="Salons coiffure et boutiques a Dakar | Jolof'Era" description="Trouvez un salon de coiffure, institut beaute, barbershop ou boutique a Dakar. Comparez les prix et reservez en ligne rapidement." /><Salons /></>} />
        <Route path="salon/:id" element={<SalonDetail />} />
        <Route path="qr-codes" element={<><SEOHead title="QR Codes — Jolof’Era" noindex /><QRCodes /></>} />
        
        <Route path="comment-ca-marche" element={<><SEOHead title="Comment ca marche | Jolof'Era" description="Decouvrez comment reserver un salon, commander en boutique et utiliser Jolof'Era." /><HowItWorks /></>} />
        <Route path="faq" element={<><SEOHead title="FAQ | Jolof'Era" description="Questions frequentes sur les reservations, commandes, comptes clients et partenaires." /><FAQ /></>} />
        <Route path="legal/conditions-utilisation" element={<><SEOHead title="Conditions d'utilisation | Jolof'Era" /><TermsOfUse /></>} />
        <Route path="legal/confidentialite" element={<><SEOHead title="Politique de confidentialite | Jolof'Era" /><PrivacyPolicy /></>} />
        <Route path="legal/mentions-legales" element={<><SEOHead title="Mentions legales | Jolof'Era" /><LegalNotice /></>} />
        <Route path="legal/cgv" element={<><SEOHead title="CGV | Jolof'Era" /><TermsOfSale /></>} />

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

