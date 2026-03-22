/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#00aaff',
          50: '#e6f7ff',
          100: '#b3e7ff',
          200: '#80d7ff',
          300: '#4dc7ff',
          400: '#1ab7ff',
          500: '#00aaff',
          600: '#0088cc',
          700: '#006699',
          800: '#004466',
          900: '#002233',
        },
        background: '#f5f7fa',
        surface: '#ffffff',
        border: '#e2e8f0',
        text: {
          primary: '#1a202c',
          secondary: '#4a5568',
          muted: '#718096',
        }
      },
      borderRadius: {
        DEFAULT: '12px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.08)',
        button: '0 2px 4px rgba(0, 170, 255, 0.25)',
      }
    },
  },
  plugins: [],
}
