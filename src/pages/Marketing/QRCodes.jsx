import { useState, useRef } from 'react'
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react'
import { motion } from 'framer-motion'
import { FiDownload, FiCopy, FiCheck, FiShare2 } from 'react-icons/fi'
import { HiOutlineQrcode } from 'react-icons/hi'

const QR_PRESETS = [
  {
    id: 'home',
    name: 'Page d\'accueil',
    path: '/',
    description: 'Redirige vers la page principale',
    color: '#3B82F6',
  },
  {
    id: 'salons',
    name: 'Liste des salons',
    path: '/salons',
    description: 'Découvrir tous les salons',
    color: '#10B981',
  },
  {
    id: 'register',
    name: 'Inscription',
    path: '/register',
    description: 'Créer un compte client',
    color: '#8B5CF6',
  },
  {
    id: 'booking',
    name: 'Réservation rapide',
    path: '/booking',
    description: 'Réserver directement',
    color: '#F59E0B',
  },
]

const QR_SIZES = [
  { label: 'Petit (128px)', value: 128 },
  { label: 'Moyen (256px)', value: 256 },
  { label: 'Grand (512px)', value: 512 },
  { label: 'Très grand (1024px)', value: 1024 },
]

const QR_COLORS = [
  { label: 'Noir', value: '#000000' },
  { label: 'Bleu Ｓｔｙｌｅ Ｆｌｏｗ', value: '#3B82F6' },
  { label: 'Vert', value: '#10B981' },
  { label: 'Violet', value: '#8B5CF6' },
  { label: 'Orange', value: '#F59E0B' },
  { label: 'Rose', value: '#EC4899' },
]

export default function QRCodes() {
  // URL de base du site (à changer en production)
  const baseUrl = window.location.origin
  
  const [selectedPreset, setSelectedPreset] = useState(QR_PRESETS[0])
  const [customPath, setCustomPath] = useState('')
  const [qrSize, setQrSize] = useState(256)
  const [qrColor, setQrColor] = useState('#000000')
  const [bgColor, setBgColor] = useState('#FFFFFF')
  const [includelogo, setIncludeLogo] = useState(true)
  const [copied, setCopied] = useState(false)
  
  const canvasRef = useRef(null)
  
  // URL finale du QR code
  const finalUrl = customPath 
    ? `${baseUrl}${customPath.startsWith('/') ? customPath : '/' + customPath}`
    : `${baseUrl}${selectedPreset.path}`
  
  // Télécharger en PNG
  const downloadPNG = () => {
    const canvas = document.getElementById('qr-canvas')
    if (canvas) {
      const url = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.href = url
      link.download = `styleflow-qrcode-${selectedPreset.id}-${qrSize}px.png`
      link.click()
    }
  }
  
  // Télécharger en SVG
  const downloadSVG = () => {
    const svg = document.getElementById('qr-svg')
    if (svg) {
      const svgData = new XMLSerializer().serializeToString(svg)
      const blob = new Blob([svgData], { type: 'image/svg+xml' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `styleflow-qrcode-${selectedPreset.id}.svg`
      link.click()
      URL.revokeObjectURL(url)
    }
  }
  
  // Copier l'URL
  const copyUrl = async () => {
    await navigator.clipboard.writeText(finalUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <HiOutlineQrcode className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            Générateur de QR Codes
          </h1>
          <p className="text-gray-600 max-w-2xl mx-auto">
            Créez des QR codes personnalisés pour vos affiches, cartes de visite, 
            flyers et supports marketing. Scannez pour accéder directement à Ｓｔｙｌｅ Ｆｌｏｗ !
          </p>
        </motion.div>
        
        <div className="grid lg:grid-cols-2 gap-8 max-w-6xl mx-auto">
          {/* Configuration */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Configuration
            </h2>
            
            {/* Presets */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Page de destination
              </label>
              <div className="grid grid-cols-2 gap-3">
                {QR_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => {
                      setSelectedPreset(preset)
                      setCustomPath('')
                    }}
                    className={`p-3 rounded-lg border-2 text-left transition-all ${
                      selectedPreset.id === preset.id && !customPath
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <div
                      className="w-3 h-3 rounded-full mb-2"
                      style={{ backgroundColor: preset.color }}
                    />
                    <p className="font-medium text-gray-900 text-sm">
                      {preset.name}
                    </p>
                    <p className="text-xs text-gray-500">{preset.description}</p>
                  </button>
                ))}
              </div>
            </div>
            
            {/* Custom URL */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Ou URL personnalisée
              </label>
              <input
                type="text"
                value={customPath}
                onChange={(e) => setCustomPath(e.target.value)}
                placeholder="/salons/mon-salon"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            {/* Size */}
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Taille du QR Code
              </label>
              <select
                value={qrSize}
                onChange={(e) => setQrSize(Number(e.target.value))}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {QR_SIZES.map((size) => (
                  <option key={size.value} value={size.value}>
                    {size.label}
                  </option>
                ))}
              </select>
            </div>
            
            {/* Colors */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Couleur du QR
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={qrColor}
                    onChange={(e) => setQrColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <select
                    value={qrColor}
                    onChange={(e) => setQrColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  >
                    {QR_COLORS.map((color) => (
                      <option key={color.value} value={color.value}>
                        {color.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Couleur de fond
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="w-10 h-10 rounded cursor-pointer"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => setBgColor(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
            
            {/* Include Logo */}
            <div className="flex items-center gap-3 mb-6">
              <input
                type="checkbox"
                id="include-logo"
                checked={includelogo}
                onChange={(e) => setIncludeLogo(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
              />
              <label htmlFor="include-logo" className="text-sm text-gray-700">
                Inclure le logo Ｓｔｙｌｅ Ｆｌｏｗ au centre
              </label>
            </div>
            
            {/* URL Preview */}
            <div className="bg-gray-50 rounded-lg p-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                URL du QR Code
              </label>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm bg-white px-3 py-2 rounded border border-gray-200 overflow-x-auto">
                  {finalUrl}
                </code>
                <button
                  onClick={copyUrl}
                  className="p-2 text-gray-600 hover:text-blue-600 transition-colors"
                  title="Copier l'URL"
                >
                  {copied ? (
                    <FiCheck className="w-5 h-5 text-green-600" />
                  ) : (
                    <FiCopy className="w-5 h-5" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
          
          {/* Preview & Download */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl shadow-lg p-6"
          >
            <h2 className="text-xl font-semibold text-gray-900 mb-6">
              Aperçu & Téléchargement
            </h2>
            
            {/* QR Code Preview */}
            <div 
              className="flex items-center justify-center p-8 rounded-xl mb-6"
              style={{ backgroundColor: bgColor }}
            >
              <div className="relative">
                {/* Canvas for PNG download */}
                <QRCodeCanvas
                  id="qr-canvas"
                  value={finalUrl}
                  size={Math.min(qrSize, 300)}
                  fgColor={qrColor}
                  bgColor={bgColor}
                  level="H"
                  includeMargin={true}
                  imageSettings={includelogo ? {
                    src: '/favicon.svg',
                    x: undefined,
                    y: undefined,
                    height: Math.min(qrSize, 300) * 0.2,
                    width: Math.min(qrSize, 300) * 0.2,
                    excavate: true,
                  } : undefined}
                />
                
                {/* Hidden SVG for SVG download */}
                <div className="hidden">
                  <QRCodeSVG
                    id="qr-svg"
                    value={finalUrl}
                    size={qrSize}
                    fgColor={qrColor}
                    bgColor={bgColor}
                    level="H"
                    includeMargin={true}
                  />
                </div>
              </div>
            </div>
            
            {/* Download Buttons */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <button
                onClick={downloadPNG}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <FiDownload className="w-5 h-5" />
                <span>PNG ({qrSize}px)</span>
              </button>
              
              <button
                onClick={downloadSVG}
                className="flex items-center justify-center gap-2 px-4 py-3 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
              >
                <FiDownload className="w-5 h-5" />
                <span>SVG (vectoriel)</span>
              </button>
            </div>
            
            {/* Tips */}
            <div className="bg-blue-50 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">
                💡 Conseils d'utilisation
              </h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• <strong>Affiches</strong> : Utilisez la taille 512px ou 1024px</li>
                <li>• <strong>Cartes de visite</strong> : 256px suffit</li>
                <li>• <strong>SVG</strong> : Idéal pour l'impression haute qualité</li>
                <li>• <strong>PNG</strong> : Parfait pour le web et réseaux sociaux</li>
                <li>• Testez toujours le QR code avant impression !</li>
              </ul>
            </div>
          </motion.div>
        </div>
        
        {/* Marketing Templates */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-12 max-w-6xl mx-auto"
        >
          <h2 className="text-2xl font-bold text-gray-900 mb-6 text-center">
            Idées d'utilisation
          </h2>
          
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                title: 'Affiches dans le salon',
                description: 'Placez un QR code près de la caisse pour que les clients puissent réserver leur prochain rendez-vous',
                icon: '🪧',
              },
              {
                title: 'Cartes de visite',
                description: 'Ajoutez un petit QR code au dos de vos cartes de visite professionnelles',
                icon: '💳',
              },
              {
                title: 'Flyers & Prospectus',
                description: 'Distribuez des flyers avec QR code dans le quartier pour attirer de nouveaux clients',
                icon: '📄',
              },
              {
                title: 'Vitrine du salon',
                description: 'Collez un grand QR code sur la vitrine pour les passants',
                icon: '🏪',
              },
              {
                title: 'Réseaux sociaux',
                description: 'Partagez le QR code dans vos stories Instagram et Facebook',
                icon: '📱',
              },
              {
                title: 'Tables d\'attente',
                description: 'Posez des supports avec QR code sur les tables de la salle d\'attente',
                icon: '🪑',
              },
            ].map((item, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-6 shadow-md hover:shadow-lg transition-shadow"
              >
                <div className="text-4xl mb-3">{item.icon}</div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  )
}
