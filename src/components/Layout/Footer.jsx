import { Link } from 'react-router-dom'
import { FiMail, FiPhone, FiMapPin, FiInstagram, FiFacebook, FiTwitter } from 'react-icons/fi'
import Logo from '../UI/Logo'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="relative overflow-hidden border-t border-primary-400/60 bg-gradient-to-br from-[#ece3d4] via-[#e2d5c1] to-[#d6c6af] dark:border-[#382c22] dark:from-[#1a140f] dark:via-[#15110d] dark:to-[#110d0a]">
      <div className="absolute -top-24 right-10 h-72 w-72 rounded-full bg-gold-300/18 blur-3xl dark:bg-gold-500/12"></div>
      <div className="absolute -bottom-24 left-10 h-80 w-80 rounded-full bg-primary-300/18 blur-3xl dark:bg-gold-400/10"></div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-8">
          <div className="col-span-2 lg:col-span-1 space-y-3">
            <Logo size="md" showTagline />
            <p className="text-primary-800 dark:text-[#cfbca4] text-xs leading-relaxed">
              La plateforme de reservation de salons de coiffure et beaute au Senegal.
            </p>
            <div className="flex space-x-2">
              <a href="#" className="w-8 h-8 rounded-full flex items-center justify-center border border-primary-300/70 bg-[#f7f3ec] dark:bg-[#251d16] dark:border-[#46382a] text-primary-800 dark:text-[#cfbca4] hover:text-primary-900 dark:hover:text-gold-200 hover:bg-[#efe7d8] dark:hover:bg-gold-500/20 transition-all">
                <FiInstagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-full flex items-center justify-center border border-primary-300/70 bg-[#f7f3ec] dark:bg-[#251d16] dark:border-[#46382a] text-primary-800 dark:text-[#cfbca4] hover:text-primary-900 dark:hover:text-gold-200 hover:bg-[#efe7d8] dark:hover:bg-gold-500/20 transition-all">
                <FiFacebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 rounded-full flex items-center justify-center border border-primary-300/70 bg-[#f7f3ec] dark:bg-[#251d16] dark:border-[#46382a] text-primary-800 dark:text-[#cfbca4] hover:text-primary-900 dark:hover:text-gold-200 hover:bg-[#efe7d8] dark:hover:bg-gold-500/20 transition-all">
                <FiTwitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3 text-primary-900 dark:text-[#f3e8d9]">Liens rapides</h4>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link to="/salons" className="text-primary-800 dark:text-[#cfbca4] hover:text-primary-900 dark:hover:text-gold-300 transition-colors">
                  Trouver un salon
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-primary-800 dark:text-[#cfbca4] hover:text-primary-900 dark:hover:text-gold-300 transition-colors">
                  Devenir partenaire
                </Link>
              </li>
              <li>
                <a href="#" className="text-primary-800 dark:text-[#cfbca4] hover:text-primary-900 dark:hover:text-gold-300 transition-colors">
                  Comment ca marche
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-800 dark:text-[#cfbca4] hover:text-primary-900 dark:hover:text-gold-300 transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3 text-primary-900 dark:text-[#f3e8d9]">Legal</h4>
            <ul className="space-y-1.5 text-sm">
              <li>
                <a href="#" className="text-primary-800 dark:text-[#cfbca4] hover:text-primary-900 dark:hover:text-gold-300 transition-colors">
                  Conditions d'utilisation
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-800 dark:text-[#cfbca4] hover:text-primary-900 dark:hover:text-gold-300 transition-colors">
                  Politique de confidentialite
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-800 dark:text-[#cfbca4] hover:text-primary-900 dark:hover:text-gold-300 transition-colors">
                  Mentions legales
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-800 dark:text-[#cfbca4] hover:text-primary-900 dark:hover:text-gold-300 transition-colors">
                  CGV
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-sm mb-3 text-primary-900 dark:text-[#f3e8d9]">Contact</h4>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center space-x-3 text-primary-800 dark:text-[#cfbca4]">
                <FiMapPin className="w-4 h-4" />
                <span>Dakar, Senegal</span>
              </li>
              <li>
                <a href="mailto:contact@jolofera.com" className="flex items-center space-x-3 text-primary-800 dark:text-[#cfbca4] hover:text-primary-900 dark:hover:text-gold-300 transition-colors">
                  <FiMail className="w-4 h-4" />
                  <span className="text-sm">contact@jolofera.com</span>
                </a>
              </li>
            </ul>
            <a
              href="https://wa.me/221338001234"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center space-x-1.5 bg-primary-800 hover:bg-primary-900 dark:bg-[#8f6d3f] dark:hover:bg-[#a17c47] text-white dark:text-[#1b130b] px-4 py-1.5 rounded-full text-xs font-medium transition-all shadow-sm"
            >
              <FiPhone className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        <div className="mt-6 pt-4 flex flex-col md:flex-row justify-between items-center border-t border-primary-300/80 dark:border-[#382c22]">
          <p className="text-primary-800 dark:text-[#ab967c] text-xs">
            © {currentYear} Jolof’Era. Tous droits reserves.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer

