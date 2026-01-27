/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./templates/index.html",
    "./templates/index_modular.html",
    "./templates/device_login.html",
    "./templates/device_register.html",
    "./templates/device_settings.html",
    "./templates/vad_tuning.html",
    "./templates/modular_demo.html",
    "./static/js/**/*.js"
  ],
  theme: {
    extend: {
      // Custom colors from your branding
      colors: {
        'green': {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        'orange': {
          400: '#fb923c',
          500: '#f97316',
          600: '#ea580c',
        }
      },
      // Custom animations from your CSS
      animation: {
        'ping': 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite',
        'pulse': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin': 'spin 1s linear infinite',
      }
    },
  },
  plugins: [],
}
