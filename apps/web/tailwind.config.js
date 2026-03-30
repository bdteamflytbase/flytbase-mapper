/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ak: {
          bg:      '#070c14',
          surface: '#0f1520',
          primary: '#2C7BF2',
          accent:  '#38E8C6',
          text:    { DEFAULT: '#EAEDF2', 2: '#8B95A8', 3: '#4A5568' },
          border:  'rgba(255,255,255,0.06)',
          success: '#34D399',
          warning: '#FBBF24',
          danger:  '#F87171',
        },
        // Legacy compat
        'fb-bg':      '#070c14',
        'fb-surface': '#0f1520',
        'fb-primary': '#2C7BF2',
        'fb-accent':  '#38E8C6',
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'sans-serif'],
        mono: ['JetBrains Mono', 'SF Mono', 'monospace'],
      },
      borderRadius: {
        'ak':    '8px',
        'ak-sm': '6px',
        'ak-lg': '12px',
        'ak-xl': '16px',
      },
      backdropBlur: {
        'ak':      '16px',
        'ak-heavy': '20px',
      },
      transitionTimingFunction: {
        'ak-spring': 'cubic-bezier(0.34, 1.56, 0.64, 1)',
      },
      boxShadow: {
        'ak-sm':   '0 1px 2px rgba(0, 0, 0, 0.20)',
        'ak-md':   '0 4px 16px rgba(0, 0, 0, 0.25)',
        'ak-lg':   '0 8px 32px rgba(0, 0, 0, 0.30)',
        'ak-xl':   '0 16px 48px rgba(0, 0, 0, 0.35)',
        'ak-glow': '0 0 0 3px rgba(44, 123, 242, 0.25)',
      },
    },
  },
  plugins: [],
};
