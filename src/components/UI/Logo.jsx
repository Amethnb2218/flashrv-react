import { Link } from 'react-router-dom'

// Logo FlashRV' - Design Lumineux & Moderne 2026
function Logo({ variant = 'default', size = 'md', showTagline = true }) {
  const sizes = {
    sm: { logo: 'w-9 h-9', text: 'text-lg', tagline: 'text-[8px]' },
    md: { logo: 'w-11 h-11', text: 'text-xl', tagline: 'text-[10px]' },
    lg: { logo: 'w-14 h-14', text: 'text-2xl', tagline: 'text-xs' },
    xl: { logo: 'w-20 h-20', text: 'text-3xl', tagline: 'text-sm' },
  }

  const s = sizes[size] || sizes.md
  const isLight = variant === 'light'

  return (
    <Link to="/" className="flex items-center space-x-3 group">
      {/* Logo Icon - F stylisé avec éclair lumineux */}
      <div className="relative">
        <svg 
          className={`${s.logo} transition-all duration-300 group-hover:scale-110 drop-shadow-lg`}
          viewBox="0 0 48 48" 
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Dégradés Black & Gold Élégant */}
          <defs>
            <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#171717" />
              <stop offset="50%" stopColor="#262626" />
              <stop offset="100%" stopColor="#404040" />
            </linearGradient>
            <linearGradient id="flashGradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#facc15" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="2" result="coloredBlur"/>
              <feMerge>
                <feMergeNode in="coloredBlur"/>
                <feMergeNode in="SourceGraphic"/>
              </feMerge>
            </filter>
          </defs>
          
          {/* Main rounded square background */}
          <rect 
            x="2" y="2" 
            width="44" height="44" 
            rx="14" 
            fill="url(#logoGradient)"
            filter="url(#glow)"
          />
          
          {/* Shine effect */}
          <path 
            d="M10 8C10 5.79086 11.7909 4 14 4H26C28.2091 4 30 5.79086 30 8V10H14C11.7909 10 10 11.7909 10 14V8Z" 
            fill="white"
            opacity="0.25"
          />
          
          {/* Letter F - Bold */}
          <path 
            d="M16 12H32V17H22V21H30V26H22V36H16V12Z" 
            fill="white"
          />
          
          {/* Flash/éclair symbol - Lumineux */}
          <path 
            d="M30 10L26 20H32L25 30L28 22H23L30 10Z" 
            fill="url(#flashGradient)"
            filter="url(#glow)"
          />
        </svg>
      </div>

      {/* Brand text */}
      <div className="flex flex-col">
        <span 
          className={`font-extrabold ${s.text} tracking-tight leading-none`}
          style={{ fontFamily: "'Poppins', sans-serif" }}
        >
          <span className={isLight ? 'text-white' : 'text-gray-800'}>Flash</span>
          <span className="bg-gradient-to-r from-yellow-500 via-yellow-400 to-amber-300 bg-clip-text text-transparent">
            RV
          </span>
          <span className="text-yellow-400 drop-shadow-sm">'</span>
        </span>
        
        {showTagline && (
          <span 
            className={`${s.tagline} font-medium tracking-[0.2em] uppercase ${
              isLight ? 'text-white/80' : 'text-gray-500'
            }`}
          >
            Réservez. Brillez.
          </span>
        )}
      </div>
    </Link>
  )
}

// Logo icon seul (pour favicon, app icon, etc.)
export function LogoIcon({ size = 40 }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 48 48" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className="drop-shadow-lg"
    >
      <defs>
        <linearGradient id="logoGradientIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" />
          <stop offset="40%" stopColor="#d946ef" />
          <stop offset="100%" stopColor="#f472b6" />
        </linearGradient>
        <linearGradient id="flashGradientIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      
      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#logoGradientIcon)"/>
      <path d="M10 8C10 5.79086 11.7909 4 14 4H26C28.2091 4 30 5.79086 30 8V10H14C11.7909 10 10 11.7909 10 14V8Z" fill="white" opacity="0.25"/>
      <path d="M16 12H32V17H22V21H30V26H22V36H16V12Z" fill="white"/>
      <path d="M30 10L26 20H32L25 30L28 22H23L30 10Z" fill="url(#flashGradientIcon)"/>
    </svg>
  )
}

export default Logo
