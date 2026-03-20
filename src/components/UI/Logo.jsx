import { useState } from 'react'
import { Link } from 'react-router-dom'

const BRAND_ASSETS = {
  full: '/brand/logo-full.png',
  icon: '/brand/logo-icon.png',
}

const ICON_FRAME_CLASS =
  'absolute inset-0 rounded-2xl overflow-hidden bg-[linear-gradient(145deg,#2b1d12_0%,#6a4822_34%,#b68432_70%,#f3cb67_100%)] shadow-[0_12px_28px_rgba(99,63,17,0.24)]'
const ICON_GLOW_CLASS =
  'absolute inset-0 rounded-2xl bg-[radial-gradient(circle_at_28%_20%,rgba(255,247,222,0.42),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.16),transparent_48%)]'
const ICON_IMAGE_CLASS =
  'absolute -inset-[4%] h-[108%] w-[108%] object-cover object-center scale-[2.62] mix-blend-screen brightness-110 contrast-125 saturate-0 opacity-95'

// Logo Jolof'Era
function Logo({ variant = 'default', size = 'md', showTagline = true, forceIconText = false }) {
  const sizes = {
    sm: { logo: 'w-9 h-9', text: 'text-lg', tagline: 'text-[8px]' },
    md: { logo: 'w-11 h-11', text: 'text-xl', tagline: 'text-[10px]' },
    lg: { logo: 'w-14 h-14', text: 'text-2xl', tagline: 'text-xs' },
    xl: { logo: 'w-20 h-20', text: 'text-3xl', tagline: 'text-sm' },
  }

  const s = sizes[size] || sizes.md
  const isLight = variant === 'light'
  const fullLogoHeights = {
    sm: 'h-9',
    md: 'h-11',
    lg: 'h-14',
    xl: 'h-20',
  }
  const [fullLogoFailed, setFullLogoFailed] = useState(false)
  const [iconLogoFailed, setIconLogoFailed] = useState(false)

  const shouldUseFullLogo = !forceIconText && !fullLogoFailed
  return (
    <Link to="/" className="flex items-center space-x-3 group select-none max-w-full">
      {shouldUseFullLogo ? (
        <img
          src={BRAND_ASSETS.full}
          alt="Jolof'Era"
          className={`${fullLogoHeights[size] || fullLogoHeights.md} w-auto object-contain transition-all duration-300 group-hover:scale-[1.02]`}
          onError={() => setFullLogoFailed(true)}
          loading="eager"
          decoding="async"
        />
      ) : (
        <>
      {/* Logo icon */}
      <div className="relative">
        {!iconLogoFailed ? (
          <div className={`${s.logo} relative overflow-visible transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_16px_#facc15]`}>
            <div className={ICON_FRAME_CLASS} />
            <div className={ICON_GLOW_CLASS} />
            <img
              src={BRAND_ASSETS.icon}
              alt="Jolof'Era icon"
              className={ICON_IMAGE_CLASS}
              onError={() => setIconLogoFailed(true)}
              loading="eager"
              decoding="async"
            />
          </div>
        ) : (
          <svg
            className={`${s.logo} transition-all duration-300 group-hover:scale-110 group-hover:drop-shadow-[0_0_16px_#facc15] drop-shadow-lg`}
            viewBox="0 0 48 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            aria-label="Logo Jolof'Era"
          >
            {/* Black and gold gradients */}
            <defs>
              <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#171717" />
                <stop offset="50%" stopColor="#262626" />
                <stop offset="100%" stopColor="#404040" />
              </linearGradient>
              <linearGradient id="accentGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#facc15" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Main rounded square background */}
            <rect
              x="2"
              y="2"
              width="44"
              height="44"
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

            {/* Letter J */}
            <path
              d="M32 12H21.6V17H26.6V29.2C26.6 31.9 25.1 33.5 22.8 33.5C20.9 33.5 19.5 32.7 18.4 31.3L14.4 34.6C16.5 37.4 19.4 38.8 23 38.8C28.8 38.8 32 35.3 32 29.4V12Z"
              fill="white"
            />

            {/* Apostrophe accent */}
            <path
              d="M16.6 9.1C18 9.1 19.1 10.2 19.1 11.6C19.1 13 18 14.1 16.6 14.1C15.3 14.1 14.2 13 14.2 11.6C14.2 10.2 15.3 9.1 16.6 9.1ZM18.7 13.8L16.6 19H20.1L22.2 13.8H18.7Z"
              fill="url(#accentGradient)"
              filter="url(#glow)"
            />
          </svg>
        )}
      </div>

      {/* Brand text */}
      <div className="flex flex-col min-w-0">
        <span
          className={`font-extrabold ${s.text} tracking-tight leading-none font-poppins whitespace-nowrap`}
          style={{ letterSpacing: '-0.01em' }}
        >
          <span
            className={
              isLight
                ? 'text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.25)]'
                : 'text-primary-900 dark:text-slate-100 drop-shadow-[0_1px_4px_rgba(0,0,0,0.24)]'
            }
          >
            Jolof'
          </span>
          <span className="text-gold-500 dark:text-gold-300 drop-shadow-[0_0_6px_#fde047]">Era</span>
        </span>
        {showTagline && (
          <span
            className={`${s.tagline} font-semibold tracking-[0.22em] uppercase font-inter transition-all duration-300 whitespace-nowrap
              ${isLight ? 'text-gold-100/90 drop-shadow-[0_0_8px_#facc15] animate-pulse' : 'text-yellow-700/80 dark:text-gold-300/90 drop-shadow-[0_0_8px_#fde047]'}
            `}
            style={{ letterSpacing: '0.22em', textShadow: '0 0 8px #fde047, 0 1px 2px rgba(0,0,0,0.35)' }}
          >
            Reservez. Brillez.
          </span>
        )}
      </div>
        </>
      )}
    </Link>
  )
}

// Logo icon seul (favicon, app icon, etc.)
export function LogoIcon({ size = 40 }) {
  const [iconLogoFailed, setIconLogoFailed] = useState(false)
  if (!iconLogoFailed) {
    return (
      <div
        className="relative overflow-visible drop-shadow-lg"
        style={{ width: size, height: size }}
      >
        <div className={ICON_FRAME_CLASS} />
        <div className={ICON_GLOW_CLASS} />
        <img
          src={BRAND_ASSETS.icon}
          alt="Jolof'Era icon"
          width={size}
          height={size}
          className={ICON_IMAGE_CLASS}
          onError={() => setIconLogoFailed(true)}
          loading="eager"
          decoding="async"
        />
      </div>
    )
  }

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
          <stop offset="0%" stopColor="#171717" />
          <stop offset="40%" stopColor="#262626" />
          <stop offset="100%" stopColor="#404040" />
        </linearGradient>
        <linearGradient id="accentGradientIcon" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fcd34d" />
          <stop offset="100%" stopColor="#fbbf24" />
        </linearGradient>
      </defs>

      <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#logoGradientIcon)" />
      <path d="M10 8C10 5.79086 11.7909 4 14 4H26C28.2091 4 30 5.79086 30 8V10H14C11.7909 10 10 11.7909 10 14V8Z" fill="white" opacity="0.25" />
      <path d="M32 12H21.6V17H26.6V29.2C26.6 31.9 25.1 33.5 22.8 33.5C20.9 33.5 19.5 32.7 18.4 31.3L14.4 34.6C16.5 37.4 19.4 38.8 23 38.8C28.8 38.8 32 35.3 32 29.4V12Z" fill="white" />
      <path d="M16.6 9.1C18 9.1 19.1 10.2 19.1 11.6C19.1 13 18 14.1 16.6 14.1C15.3 14.1 14.2 13 14.2 11.6C14.2 10.2 15.3 9.1 16.6 9.1ZM18.7 13.8L16.6 19H20.1L22.2 13.8H18.7Z" fill="url(#accentGradientIcon)" />
    </svg>
  )
}

export default Logo
