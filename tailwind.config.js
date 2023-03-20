/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        blue: {
          50: '#e8f6ff',
          100: '#d5edff',
          200: '#b3dcff',
          300: '#85c3ff',
          400: '#569aff',
          500: '#2f72ff',
          600: '#0c43ff',
          // BlueDot blue
          700: '#0037ff',
          800: '#0634cd',
          900: '#10359f',
        },
      },
    },
  },
  plugins: [],
};
