import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'

function Layout() {
  const location = useLocation()

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [location.pathname])

  // Pages without footer
  const noFooterPages = ['/login', '/register', '/booking', '/payment']
  const showFooter = !noFooterPages.some(page => location.pathname.includes(page))

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar />
      <main className="flex-grow pt-24">
        <Outlet />
      </main>
      {showFooter && <Footer />}
    </div>
  )
}

export default Layout

