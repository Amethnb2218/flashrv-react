import { useTheme } from '../../context/ThemeContext'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
    const { isDark, toggleTheme } = useTheme()

    return (
        <button
            onClick={toggleTheme}
            className="group relative inline-flex h-10 w-10 items-center justify-center rounded-none border border-[#e4cba8] bg-[#fff8ee] text-[#2a1808] shadow-sm transition-all duration-200 hover:bg-[#fff0dc] dark:border-[#f0c77d] dark:bg-[#2b1b0f] dark:text-[#fff4e3] dark:hover:bg-[#352214]"
            aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
            title={isDark ? 'Mode clair' : 'Mode sombre'}
        >
            {isDark ? <Sun size={18} className="transition-transform duration-200 group-hover:rotate-12" /> : <Moon size={18} className="transition-transform duration-200 group-hover:-rotate-12" />}
        </button>
    )
}
