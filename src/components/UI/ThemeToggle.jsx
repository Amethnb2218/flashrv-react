import { useTheme } from '../../context/ThemeContext'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
    const { isDark, toggleTheme } = useTheme()

    return (
        <button
            onClick={toggleTheme}
            className="group relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary-200 bg-white text-primary-700 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md dark:border-slate-700 dark:bg-slate-800 dark:text-gold-300 dark:hover:bg-slate-700"
            aria-label={isDark ? 'Activer le mode clair' : 'Activer le mode sombre'}
            title={isDark ? 'Mode clair' : 'Mode sombre'}
        >
            {isDark ? <Sun size={18} className="transition-transform duration-200 group-hover:rotate-12" /> : <Moon size={18} className="transition-transform duration-200 group-hover:-rotate-12" />}
        </button>
    )
}
