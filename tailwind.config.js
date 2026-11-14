/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        velvet: {
          950: '#0f0507',
          900: '#170b0e',
          800: '#1a0c10',
          700: '#251218',
          rose: '#e05370',
          ruby: '#c43355',
          wine: '#4a0e17',
          champagne: '#e6c594',
          blush: '#fcedef',
        },
      },
      fontFamily: {
        serif: ['PlayfairDisplay_700Bold'],
        sans: ['PlusJakartaSans_400Regular'],
      },
    },
  },
  plugins: [],
};
