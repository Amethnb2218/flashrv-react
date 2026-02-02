import { Link } from 'react-router-dom'
import { FiMail, FiPhone, FiMapPin, FiInstagram, FiFacebook, FiTwitter } from 'react-icons/fi'
import Logo from '../UI/Logo'

function Footer() {
  const currentYear = new Date().getFullYear()

  return (
    <footer className="bg-gray-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
          {/* Brand */}
          <div className="space-y-5">
            <Logo variant="light" size="md" showTagline />
            <p className="text-gray-400 text-sm leading-relaxed">
              La plateforme de réservation de salons de coiffure et beauté au Sénégal. 
              Trouvez les meilleurs professionnels près de chez vous.
            </p>
            <div className="flex space-x-3">
              <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-amber-500 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all">
                <FiInstagram className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-amber-500 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all">
                <FiFacebook className="w-5 h-5" />
              </a>
              <a href="#" className="w-10 h-10 bg-gray-800 hover:bg-amber-500 rounded-full flex items-center justify-center text-gray-400 hover:text-white transition-all">
                <FiTwitter className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold text-lg mb-5 text-white">Liens rapides</h4>
            <ul className="space-y-3">
              <li>
                <Link to="/salons" className="text-gray-400 hover:text-white transition-colors">
                  Trouver un salon
                </Link>
              </li>
              <li>
                <Link to="/register" className="text-gray-400 hover:text-white transition-colors">
                  Devenir partenaire
                </Link>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Comment ça marche
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  FAQ
                </a>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold text-lg mb-5 text-white">Légal</h4>
            <ul className="space-y-3">
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Conditions d'utilisation
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Politique de confidentialité
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  Mentions légales
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  CGV
                </a>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold text-lg mb-5 text-white">Contact</h4>
            <ul className="space-y-3">
              <li className="flex items-center space-x-3 text-gray-400">
                <FiMapPin className="w-4 h-4" />
                <span>Dakar, Sénégal</span>
              </li>
              <li>
                <a href="tel:+221776762784" className="flex items-center space-x-3 text-gray-400 hover:text-white transition-colors">
                  <FiPhone className="w-4 h-4" />
                  <span>+221 77 676 27 84</span>
                </a>
              </li>
              <li>
                <a href="mailto:mouhamed26.sall@gmail.com" className="flex items-center space-x-3 text-gray-400 hover:text-white transition-colors">
                  <FiMail className="w-4 h-4" />
                  <span className="text-sm">mouhamed26.sall@gmail.com</span>
                </a>
              </li>
            </ul>
            {/* WhatsApp Button */}
            <a 
              href="https://wa.me/221776762784" 
              target="_blank" 
              rel="noopener noreferrer"
              className="mt-5 inline-flex items-center space-x-2 bg-green-500 hover:bg-green-600 text-white px-5 py-2.5 rounded-full text-sm font-medium transition-all"
            >
              <span>💬</span>
              <span>WhatsApp</span>
            </a>
          </div>
        </div>

        {/* Bottom */}
        <div className="border-t border-gray-800 mt-12 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-gray-400 text-sm">
            © {currentYear} FlashRV'. Tous droits réservés.
          </p>
          <div className="flex items-center space-x-4 mt-4 md:mt-0">
            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e1/Orange_Money_logo.png" alt="Orange Money" className="h-6 opacity-70 hover:opacity-100 transition-opacity" />
            <img src="https://upload.wikimedia.org/wikipedia/commons/0/0a/Wave_%28payment%29_logo.png" alt="Wave" className="h-6 opacity-70 hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

