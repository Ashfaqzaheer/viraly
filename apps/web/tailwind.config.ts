import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: '#000000',
        'surface-card': '#141414',
        'surface-elevated': '#1f1f1f',
        'surface-soft': '#0d0d0d',
        hairline: '#262626',
        ink: '#ffffff',
        'text-body': '#999999',
        'text-muted': '#666666',
        accent: '#8b5cf6',
        'accent-hover': '#7c3aed',
        primary: '#8b5cf6',
        'primary-active': '#7c3aed',
        body: '#999999',
        muted: '#666666',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', '-apple-system', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['clamp(48px, 8vw, 80px)', { lineHeight: '1.0', fontWeight: '400', letterSpacing: '4px' }],
        'display-lg': ['clamp(36px, 5vw, 56px)', { lineHeight: '1.1', fontWeight: '400', letterSpacing: '3px' }],
        'display-md': ['clamp(24px, 3vw, 36px)', { lineHeight: '1.2', fontWeight: '400', letterSpacing: '2px' }],
        'display-sm': ['20px', { lineHeight: '1.4', fontWeight: '400', letterSpacing: '2px' }],
        'body-md': ['14px', { lineHeight: '1.6', fontWeight: '300' }],
        'body-sm': ['13px', { lineHeight: '1.6', fontWeight: '300' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
        'caption-upper': ['11px', { lineHeight: '1.4', fontWeight: '400', letterSpacing: '2px' }],
      },
      spacing: {
        'section': '120px',
        'xxs': '8px',
        'xs-space': '16px',
        'sm-space': '24px',
        'md-space': '32px',
        'lg-space': '48px',
        'xl-space': '64px',
      },
      maxWidth: {
        editorial: '1280px',
      },
      borderRadius: {
        pill: '9999px',
      },
    },
  },
  plugins: [],
}
export default config
