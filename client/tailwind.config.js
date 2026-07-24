export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        themePrimary: 'var(--bg-primary)',
        themeSecondary: 'var(--bg-secondary)',
        themeSurface: 'var(--bg-surface)',
        themeElevated: 'var(--bg-elevated)',
        themeInput: 'var(--bg-input)',
        themeNav: 'var(--bg-nav)',
        themeBorder: 'var(--border-main)',
        themeDivider: 'var(--divider-main)',
        themeTextPrimary: 'var(--text-primary)',
        themeTextSecondary: 'var(--text-secondary)',
        themeTextMuted: 'var(--text-muted)',
        themeAccent: 'var(--accent-color)',
        themeAccentHover: 'var(--accent-hover)',
        themeAccentText: 'var(--accent-contrast-text)',
        themeSuccess: 'var(--success-color)',
        themeWarning: 'var(--warning-color)',
        themeError: 'var(--error-color)',
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
        card: 'var(--shadow-card)',
      }
    }
  },
  plugins: []
}
