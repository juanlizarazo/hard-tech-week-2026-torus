/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  theme: {
    extend: {
      colors: {
        asphalt: 'var(--dt-theme--primary)',
        clear: 'var(--dt-theme--tertiary)',
        'clear-bg': 'var(--dt-theme--tertiary-bg)',
        congestion: 'var(--dt-theme--accent)',
        rush: 'var(--dt-theme--error)',
        'rush-dark': 'var(--dt-theme--error-dark)',
        'rush-bg': 'var(--dt-theme--error-bg)',
        surface: 'var(--dt-theme--surface)',
        line: 'var(--dt-theme--border)',
      },
      fontFamily: {
        sans: ['Inter', 'Helvetica Neue', 'sans-serif'],
        mono: ['IBM Plex Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
