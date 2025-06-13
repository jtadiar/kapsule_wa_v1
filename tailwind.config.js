/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0F0F0F',
        primary: '#FF373B',
        'primary-hover': '#E62D31',
        gray: {
          800: '#1A1A1A',
          700: '#2A2A2A',
          600: '#3A3A3A',
          500: '#505050',
          400: '#707070',
          300: '#909090',
          200: '#B0B0B0',
          100: '#D0D0D0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};