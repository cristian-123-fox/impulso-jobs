/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        // Marca (AGENTS.md §5.2): naranja CTA + azul corporativo
        brand: { DEFAULT: '#ff6a00', 600: '#e85f00', 50: '#fff2e8' },
        ink: {
          DEFAULT: '#1f3b73',
          900: '#1a1a2e',
          950: '#141a2e',
          card: '#26304d',
        },
        // Grises del footer sobre fondo oscuro
        'footer-fg': '#c3c8d6',
        'footer-muted': '#9aa0b4',
        // Neutrales del portal
        body: '#35354a',
        muted: '#8a8a9e',
        surface: '#f5f7fb',
        line: '#eceef3',
        // Acentos decorativos (tarjetas de categoría, badges, logos)
        accent: {
          green: '#1fae6a',
          'green-soft': '#e6f7ef',
          pink: '#e8607a',
          'pink-soft': '#fdeef0',
          amber: '#f0a04b',
          'amber-soft': '#fef3e6',
          blue: '#2b6df4',
          'blue-soft': '#e9f0fe',
        },
      },
      fontFamily: {
        sans: ['Rubik', 'Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '0.75rem',
      },
      boxShadow: {
        card: '0 14px 34px -22px rgba(0,0,0,.2)',
        float: '0 18px 40px -16px rgba(0,0,0,.18)',
        search: '0 22px 50px -20px rgba(255,106,0,.28)',
        header: '0 6px 24px -12px rgba(0,0,0,.18)',
      },
      maxWidth: {
        container: '1240px',
      },
      keyframes: {
        'header-down': {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
      animation: {
        'header-down': 'header-down .35s ease-out',
      },
    },
  },
  plugins: [require('@tailwindcss/forms')],
};
