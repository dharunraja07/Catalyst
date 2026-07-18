export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#dbe6ff',
          200: '#b7cbff',
          300: '#8ba8ff',
          400: '#5c81ff',
          500: '#3a63f5',
          600: '#2749dc',
          700: '#1f3aad',
          800: '#1b2f86',
          900: '#0f1e5c',
          950: '#0a1440'
        },
        leaf: {
          50: '#eafbf1',
          100: '#cdf3dd',
          400: '#3fc884',
          500: '#22b06b',
          600: '#16915a'
        },
        ink: {
          50: '#f6f7fb',
          100: '#eef0f7',
          200: '#e1e4f0',
          300: '#c9cee2',
          400: '#9aa2c0',
          500: '#6b7396',
          600: '#4c5271',
          700: '#363b53',
          800: '#22253a',
          900: '#141623'
        }
      },
      fontFamily: {
        display: ['"Poppins"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"Inter"', 'ui-sans-serif', 'system-ui', 'sans-serif']
      },
      boxShadow: {
        glow: '0 20px 60px rgba(58, 99, 245, 0.12)',
        card: '0 10px 30px rgba(20, 22, 35, 0.06)',
        soft: '0 4px 16px rgba(20, 22, 35, 0.05)'
      },
      borderRadius: {
        '4xl': '2rem'
      }
    }
  },
  plugins: []
}
