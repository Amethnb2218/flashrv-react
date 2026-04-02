import { createContext, useContext, useEffect } from 'react'

const ThemeContext = createContext()

export function ThemeProvider({ children }) {
    const isDark = false

    useEffect(() => {
        const root = document.documentElement
        root.classList.remove('dark')
        localStorage.setItem('theme', 'light')
    }, [])

    const toggleTheme = () => {}

    return (
        <ThemeContext.Provider value={{ isDark, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    )
}

export const useTheme = () => useContext(ThemeContext)
