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
        rush: 'var(--dt-rush)',
        'rush-ink': 'var(--dt-rush-ink)',
        ink: 'var(--dt-ink)',
        paper: 'var(--dt-paper)',
        panel: 'var(--dt-panel)',
        muted: 'var(--dt-muted)',
        spin: 'var(--dt-spin)',
        pulse: 'var(--dt-pulse)',
        alert: 'var(--dt-alert)',
        'rush-dark': 'var(--dt-theme--error-dark)',
        'rush-bg': 'var(--dt-theme--error-bg)',
        surface: 'var(--dt-theme--surface)',
        line: 'var(--dt-theme--border)',
      },
      fontFamily: {
        sans: ['Overpass', 'Helvetica Neue', 'Arial', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
