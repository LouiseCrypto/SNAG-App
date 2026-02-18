/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        orange: {
          DEFAULT: '#F97316',
          light: '#FED7AA',
          dark: '#C2410C',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        squish: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.93)' },
        },
        fadeIn: {
          from: { opacity: '0', transform: 'translateY(10px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        slideDown: {
          from: { opacity: '0', transform: 'translateY(-20px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        pulse2: {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(249,115,22,0.4)' },
          '50%': { boxShadow: '0 0 0 12px rgba(249,115,22,0)' },
        },
      },
      animation: {
        squish: 'squish 0.2s ease-in-out',
        fadeIn: 'fadeIn 0.4s ease-out',
        slideDown: 'slideDown 0.3s ease-out',
        pulse2: 'pulse2 2s infinite',
      },
    },
  },
  plugins: [],
}
