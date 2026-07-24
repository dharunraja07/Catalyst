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
        catalystGold: '#E6B325',
        catalystGoldHover: '#D4A017',
        sageGreen: '#6FA87B',
      },
      boxShadow: {
        glow: 'var(--shadow-glow)',
        card: 'var(--shadow-card)',
      },
      borderRadius: {
        card: '20px',
        button: '14px',
        input: '14px',
      }
    }
  },
  plugins: []
}
