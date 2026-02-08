/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ═══════════════════════════════════════════════════════════
        // Ｓｔｙｌｅ Ｆｌｏｗ DESIGN SYSTEM - Palette Black & Gold Luxe 2026
        // ═══════════════════════════════════════════════════════════
        
        // Couleur Principale - Noir Élégant
        primary: {
          50: '#fafafa',
          100: '#f5f5f5',
          200: '#e5e5e5',
          300: '#d4d4d4',
          400: '#a3a3a3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',  // ⭐ Noir principal
          900: '#171717',
        },
        brand: {
          50: '#fafafa',
          100: '#f4f4f5',
          200: '#e4e4e7',
          300: '#d4d4d8',
          400: '#a1a1aa',
          500: '#71717a',
          600: '#52525b',
          700: '#3f3f46',
          800: '#27272a',
          900: '#18181b',
        },
        
        // Couleur Accent - Or Doré
        gold: {
          50: '#fefce8',
          100: '#fef9c3',
          200: '#fef08a',
          300: '#fde047',
          400: '#facc15',
          500: '#eab308',  // ⭐ Or doré principal
          600: '#ca8a04',
          700: '#a16207',
          800: '#854d0e',
          900: '#713f12',
        },
        
        // Couleur Tertiaire - Rose Doux
        rose: {
          50: '#fff1f2',
          100: '#ffe4e6',
          200: '#fecdd3',
          300: '#fda4af',
          400: '#fb7185',
          500: '#f43f5e',  // ⭐ Rose accent
          600: '#e11d48',
          700: '#be123c',
          800: '#9f1239',
          900: '#881337',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['Poppins', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        // Dégradés Ｓｔｙｌｅ Ｆｌｏｗ Black & Gold Luxe
        'gradient-styleflow': 'linear-gradient(135deg, #fafafa 0%, #f5f5f5 50%, #fefce8 100%)',
        'gradient-hero': 'linear-gradient(135deg, #171717 0%, #262626 40%, #404040 100%)',
        'gradient-light': 'linear-gradient(180deg, #ffffff 0%, #fafafa 50%, #fefce8 100%)',
        'gradient-card': 'linear-gradient(145deg, #ffffff 0%, #fafafa 50%, #fefce8 100%)',
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'hero-pattern': 'linear-gradient(135deg, rgba(234, 179, 8, 0.05) 0%, rgba(250, 204, 21, 0.05) 50%, rgba(244, 63, 94, 0.03) 100%)',
        'gradient-gold': 'linear-gradient(135deg, #eab308 0%, #facc15 50%, #fde047 100%)',
      },
      boxShadow: {
        'glow': '0 0 30px rgba(234, 179, 8, 0.3)',
        'glow-lg': '0 0 50px rgba(234, 179, 8, 0.4)',
        'glow-gold': '0 0 30px rgba(250, 204, 21, 0.35)',
        'card': '0 4px 20px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 8px 40px rgba(234, 179, 8, 0.2)',
        'elegant': '0 10px 40px rgba(0, 0, 0, 0.15)',
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-out',
        'slide-up': 'slideUp 0.5s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.3s ease-out',
        'pulse-slow': 'pulse 3s infinite',
        'float': 'float 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'glow': 'glow 2s ease-in-out infinite alternate',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        glow: {
          '0%': { boxShadow: '0 0 20px rgba(234, 179, 8, 0.4)' },
          '100%': { boxShadow: '0 0 40px rgba(250, 204, 21, 0.5)' },
        }
      },
    },
  },
  plugins: [],
}
