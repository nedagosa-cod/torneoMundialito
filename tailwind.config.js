/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta principal — verde oscuro profundo
        pitch: {
          950: '#020c06',
          900: '#041a0d',
          800: '#072b15',
          700: '#0a3d1e',
          600: '#0d5028',
        },
        // Acento verde vibrante
        verde: {
          400: '#22c55e',
          500: '#16a34a',
          600: '#15803d',
        },
        // Acento dorado
        dorado: {
          300: '#fcd34d',
          400: '#fbbf24',
          500: '#f59e0b',
          600: '#d97706',
        },
        // Glass/surface
        glass: {
          100: 'rgba(255,255,255,0.05)',
          200: 'rgba(255,255,255,0.10)',
          300: 'rgba(255,255,255,0.15)',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Outfit', 'Inter', 'sans-serif'],
      },
      backgroundImage: {
        'stadium': "url('/stadium-bg.svg')",
        'gradient-pitch': 'linear-gradient(135deg, #020c06 0%, #041a0d 50%, #072b15 100%)',
        'gradient-gold': 'linear-gradient(135deg, #fbbf24, #f59e0b, #d97706)',
        'gradient-verde': 'linear-gradient(135deg, #22c55e, #16a34a)',
        'gradient-card': 'linear-gradient(135deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.03) 100%)',
      },
      boxShadow: {
        'glow-verde': '0 0 20px rgba(34,197,94,0.3)',
        'glow-gold': '0 0 20px rgba(251,191,36,0.4)',
        'card': '0 8px 32px rgba(0,0,0,0.4)',
        'card-hover': '0 12px 40px rgba(0,0,0,0.6)',
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
