import { useTheme } from '../../context/ThemeContext'
import { Sun, Moon } from 'lucide-react'

export default function ThemeToggle() {
    const { isDark, toggleTheme } = useTheme()

    return (
        <button
            onClick={toggleTheme}
            className="p-2 rounded-full bg-gray-200 dark:bg-gray-700 
                 text-gray-800 dark:text-yellow-400 transition-all"
        >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
        </button>
    )
}