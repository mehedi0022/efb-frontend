/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/app/**/*.{js,jsx}',
    './src/components/**/*.{js,jsx}',
    './src/features/**/*.{js,jsx}',
    './src/legacy/**/*.{js,jsx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf3',
          100: '#d1fae0',
          200: '#a7f3c8',
          300: '#6ee7a6',
          400: '#34d382',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b'
        },
        admin: {
          primary: '#28c76f',
          secondary: '#00cfe8',
          accent: '#7367f0',
          warning: '#ff9f43',
          danger: '#ea5455',
          dark: '#1e1e2d',
          paper: '#ffffff',
          body: '#f8f8f8',
          login: '#ffc107',
          border: '#e6e6e6',
          text: {
            primary: '#5e5873',
            secondary: '#b9b9c3',
            muted: '#6e6b7b'
          }
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        card: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        'card-hover': '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
      }
    }
  },
  plugins: []
};
