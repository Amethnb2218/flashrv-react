import { Link } from 'react-router-dom'

function getSizeTokens(size) {
  const map = {
    sm: {
      wrap: 'gap-2',
      mark: 'text-[1.08rem] tracking-[0em]',
      tag: 'text-[0.58rem] tracking-[0.24em]',
      icon: 'h-8 w-8 text-[0.7rem]',
      shell: 'px-2.5 py-1.5',
    },
    md: {
      wrap: 'gap-2.5',
      mark: 'text-[1.22rem] tracking-[0em]',
      tag: 'text-[0.62rem] tracking-[0.26em]',
      icon: 'h-9 w-9 text-[0.78rem]',
      shell: 'px-3 py-2',
    },
    lg: {
      wrap: 'gap-3',
      mark: 'text-[1.2rem] tracking-[0em]',
      tag: 'text-[0.68rem] tracking-[0.28em]',
      icon: 'h-10 w-10 text-[0.84rem]',
      shell: 'px-3 py-1.5',
    },
    xl: {
      wrap: 'gap-3',
      mark: 'text-[1.32rem] tracking-[0em]',
      tag: 'text-[0.72rem] tracking-[0.28em]',
      icon: 'h-11 w-11 text-[0.88rem]',
      shell: 'px-3 py-1.5',
    },
  }

  return map[size] || map.md
}

function Logo({ variant = 'default', size = 'md', showTagline = false }) {
  const tokens = getSizeTokens(size)
  const isLight = variant === 'light'
  const shellTone = isLight
    ? 'bg-white/8'
    : 'border border-[#e9d0ad] bg-[#fff8ee] shadow-[0_18px_34px_-28px_rgba(157,79,13,0.2)] dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:shadow-none'
  const wordmarkTone = isLight ? 'text-white' : 'text-[#2b1808] dark:text-[#fff4e3]'
  const taglineTone = isLight ? 'text-white/72' : 'text-[#9d4f0d] dark:text-[#f0c77d]/80'

  return (
    <Link
      to="/"
      className={`group inline-flex max-w-full items-center rounded-none ${tokens.shell} ${shellTone} select-none`}
      style={{ WebkitTapHighlightColor: 'transparent' }}
      aria-label="Jolof'Era"
    >
      <span className="min-w-0">
        <span
          className={`block whitespace-nowrap normal-case font-display font-bold leading-none ${tokens.mark} ${wordmarkTone}`}
        >
          Jolof'Era
        </span>
        {showTagline && (
          <span className={`mt-0.5 block text-[10px] font-medium uppercase tracking-[0.16em] ${taglineTone}`}>
            Beauté · Réservation · Shopping
          </span>
        )}
      </span>
    </Link>
  )
}

export function LogoIcon({ size = 40 }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-none border border-[#d7b98d] bg-[#2a1808] text-[0.82rem] font-display font-semibold uppercase tracking-[0.14em] text-[#fff4e3] shadow-[0_14px_24px_-18px_rgba(95,50,15,0.35)] dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3]"
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      JE
    </span>
  )
}

export default Logo

