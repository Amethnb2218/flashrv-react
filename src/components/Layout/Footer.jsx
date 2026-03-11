import { Link } from 'react-router-dom'
import { FiMail, FiPhone, FiMapPin, FiInstagram, FiFacebook, FiTwitter } from 'react-icons/fi'
import Logo from '../UI/Logo'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gradient-to-br from-primary-900 via-primary-900 to-primary-900 relative overflow-hidden">
      <div className="absolute -top-24 right-10 w-72 h-72 bg-gold-500/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-24 left-10 w-80 h-80 bg-gold-400/10 rounded-full blur-3xl"></div>
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 lg:gap-8">
          {/* Brand */}
          <div className="col-span-2 lg:col-span-1 space-y-3">
            <Logo variant="light" size="md" showTagline />
            <p className="text-primary-400 text-xs leading-relaxed">
              La plateforme de réservation de salons de coiffure et beauté au Sénégal.
            </p>
            <div className="flex space-x-2">
              <a href="#" className="w-8 h-8 bg-primary-800 hover:bg-gold-500 rounded-full flex items-center justify-center text-primary-400 hover:text-white transition-all">
                <FiInstagram className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-primary-800 hover:bg-gold-500 rounded-full flex items-center justify-center text-primary-400 hover:text-white transition-all">
                <FiFacebook className="w-4 h-4" />
              </a>
              <a href="#" className="w-8 h-8 bg-primary-800 hover:bg-gold-500 rounded-full flex items-center justify-center text-primary-400 hover:text-white transition-all">
                <FiTwitter className="w-4 h-4" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-white">Liens rapides</h4>
            <ul className="space-y-1.5 text-sm">
              <li>
                <Link to="/salons" className="text-primary-400 hover:text-white transition-colors">
                  Trouver un salon
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-primary-400 hover:text-white transition-colors">
                  Devenir partenaire
                </Link>
              </li>
              <li>
                <a href="#" className="text-primary-400 hover:text-white transition-colors">
                  Comment ça marche
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-400 hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-white">Légal</h4>
            <ul className="space-y-1.5 text-sm">
              <li>
                <a href="#" className="text-primary-400 hover:text-white transition-colors">
                  Conditions d'utilisation
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-400 hover:text-white transition-colors">
                  Politique de confidentialité
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-400 hover:text-white transition-colors">
                  Mentions légales
                </a>
              </li>
              <li>
                <a href="#" className="text-primary-400 hover:text-white transition-colors">
                  CGV
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-sm mb-3 text-white">Contact</h4>
            <ul className="space-y-1.5 text-sm">
              <li className="flex items-center space-x-3 text-primary-400">
                <FiMapPin className="w-4 h-4" />
                <span>Dakar, Sénégal</span>
              </li>
              <li>
                <a href="tel:+221338001234" className="flex items-center space-x-3 text-primary-400 hover:text-white transition-colors">
                  <FiPhone className="w-4 h-4" />
                  <span>+221 33 800 12 34</span>
                </a>
              </li>
              <li>
                <a href="mailto:contact@styleflow.me" className="flex items-center space-x-3 text-primary-400 hover:text-white transition-colors">
                  <FiMail className="w-4 h-4" />
                  <span className="text-sm">contact@styleflow.me</span>
                </a>
              </li>
            </ul>
            <a
              href="https://wa.me/221338001234"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center space-x-1.5 bg-green-500 hover:bg-green-600 text-white px-4 py-1.5 rounded-full text-xs font-medium transition-all"
            >
              <FiPhone className="w-4 h-4" />
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="mt-6 pt-4 flex flex-col md:flex-row justify-between items-center border-t border-primary-800/70">
          <p className="text-primary-500 text-xs">
            © {currentYear} StyleFlow. Tous droits réservés.
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
