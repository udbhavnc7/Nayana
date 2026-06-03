export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['DM Mono', 'monospace'],
        display: ['Syne', 'sans-serif'],
      },
      colors: {
        slate: {
          50: '#F8FAFC',
          200: '#E2E8F0',
          500: '#64748B',
          800: '#1E293B',
          900: '#0F172A',
        },
        indigo: { 600: '#4F46E5' },
        red: { 500: '#EF4444' },
        medical: 'var(--medical-cyan)',
        social: 'var(--stable-green)',
        personal: '#A48599',
        emergency: 'var(--emergency-red)',
        warning: 'var(--warning-amber)',
        base: 'var(--bg-deep)',
        surface: 'var(--panel-bg)',
        elevated: 'rgba(139,110,80,0.06)',
        border: 'var(--border-color)',
        /* Remap "white" opacity utilities to warm-dark equivalents for beige theme */
        white: '#FFFDF8',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(139,110,80,0.1), 0 12px 40px rgba(139, 110, 80, 0.12)',
        cyan: '0 0 0 1px rgba(37,99,235,0.22), 0 0 30px rgba(37,99,235,0.12)',
        emerald: '0 0 0 1px rgba(22,163,74,0.2), 0 0 26px rgba(22,163,74,0.10)',
        emergency: '0 0 0 1px rgba(220,38,38,0.25), 0 0 30px rgba(220,38,38,0.15)',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -1px rgba(0, 0, 0, 0.04)',
      },
    },
  },
  plugins: [],
};
