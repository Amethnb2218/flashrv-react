import { Outlet, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import Navbar from './Navbar'
import Footer from './Footer'
import SiteAssistantWidget from '../Chat/SiteAssistantWidget'

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
   <div className="min-h-screen flex flex-col bg-white text-primary-900 transition-colors duration-300 dark:bg-black dark:text-white">
      <Navbar />
      <main className="flex-grow bg-white pt-[86px] md:pt-14 dark:bg-black">
        <Outlet />
      </main>
      {showFooter && <Footer />}
      <SiteAssistantWidget />
    </div>
  )
}

export default Layout
