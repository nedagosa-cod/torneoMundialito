/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta principal — Azul noche de estadio fusionado con verde césped
        pitch: {
          950: '#050814', // Fondo ultra oscuro noche
          900: '#080f24', // Fondo noche estadio
          800: '#111b3d', // Azul noche de interfaz
          700: '#1d2a5c', // Azul panel
          600: '#2c3d82', // Azul borde
        },
        // Acento verde esmeril / césped eléctrico
        verde: {
          400: '#00ff87', // Verde neón eléctrico
          500: '#00d66c', // Verde césped vibrante
          600: '#02a853', // Verde esmeralda rico
        },
        // Acento dorado trofeo
        dorado: {
          300: '#ffe359', // Dorado brillante
          400: '#ffd700', // Oro puro trofeo
          500: '#e5a900', // Oro medio
          600: '#b78000', // Oro bronceado
        },
        // Glass/surface
        glass: {
          100: 'rgba(255,255,255,0.03)',
          200: 'rgba(255,255,255,0.06)',
          300: 'rgba(255,255,255,0.10)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'stadium': "url('/stadium-bg.svg')",
        'gradient-pitch': 'linear-gradient(135deg, #050814 0%, #080f24 50%, #0a2e19 100%)', // Degradado azul-verde
        'gradient-gold': 'linear-gradient(135deg, #ffe359, #ffd700, #b78000)',
        'gradient-verde': 'linear-gradient(135deg, #00ff87, #00d66c)',
        'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.01) 100%)',
      },
      boxShadow: {
        'glow-verde': '0 0 20px rgba(0,255,135,0.25)',
        'glow-gold': '0 0 25px rgba(255,215,0,0.35)',
        'card': '0 12px 32px rgba(0,0,0,0.5)',
        'card-hover': '0 16px 48px rgba(0,0,0,0.7)',
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'pulse-gold': 'pulse-gold 2s ease-in-out infinite',
        'slide-up': 'slide-up 0.4s ease-out',
        'fade-in': 'fade-in 0.3s ease-out',
        'bounce-in': 'bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'shimmer': 'shimmer 2s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
        'pulse-gold': {
          '0%, 100%': { boxShadow: '0 0 20px rgba(251,191,36,0.4)' },
          '50%': { boxShadow: '0 0 40px rgba(251,191,36,0.8)' },
        },
        'slide-up': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'bounce-in': {
          from: { transform: 'scale(0.8)', opacity: '0' },
          to: { transform: 'scale(1)', opacity: '1' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
    },
  },
  plugins: [],
}
