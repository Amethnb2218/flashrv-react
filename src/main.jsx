import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { GoogleOAuthProvider } from '@react-oauth/google'
import App from './App'
import { AuthProvider } from './context/AuthContext'
import { BookingProvider } from './context/BookingContext'
import { Toaster } from 'react-hot-toast'
import './index.css'

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <AuthProvider>
          <BookingProvider>
            <App />
            <Toaster
              position="top-right"
              toastOptions={{
                duration: 3500,
                style: {
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  boxShadow: '0 12px 30px rgba(15, 23, 42, 0.08)',
                  fontWeight: 600,
                },
                success: {
                  iconTheme: {
                    primary: '#16a34a',
                    secondary: '#ecfdf3',
                  },
                  style: {
                    borderColor: '#bbf7d0',
                    background: '#f0fdf4',
                    color: '#14532d',
                  },
                },
                error: {
                  iconTheme: {
                    primary: '#dc2626',
                    secondary: '#fef2f2',
                  },
                  style: {
                    borderColor: '#fecaca',
                    background: '#fef2f2',
                    color: '#7f1d1d',
                  },
                },
              }}
            />
          </BookingProvider>
        </AuthProvider>
      </BrowserRouter>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
