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
        'surface-soft': '#0d0d0d',
        'surface-card': '#1a1a1a',
        'surface-elevated': '#262626',
        carbon: '#2b2b2b',
        hairline: '#3c3c3c',
        'text-primary': '#ffffff',
        'text-body': '#bbbbbb',
        'text-muted': '#7e7e7e',
        accent: '#8b5cf6',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        'display-xl': ['80px', { lineHeight: '1.0', fontWeight: '700' }],
        'display-lg': ['56px', { lineHeight: '1.05', fontWeight: '700' }],
        'display-md': ['40px', { lineHeight: '1.1', fontWeight: '700' }],
        'display-sm': ['32px', { lineHeight: '1.15', fontWeight: '700' }],
        'title-lg': ['24px', { lineHeight: '1.3', fontWeight: '700' }],
        'title-md': ['20px', { lineHeight: '1.4', fontWeight: '400' }],
        'label': ['14px', { lineHeight: '1.3', fontWeight: '700', letterSpacing: '1.5px' }],
        'body-md': ['16px', { lineHeight: '1.5', fontWeight: '300' }],
        'body-sm': ['14px', { lineHeight: '1.5', fontWeight: '300' }],
        'caption': ['12px', { lineHeight: '1.4', fontWeight: '400' }],
      },
      spacing: {
        'section': '96px',
        'xxl': '64px',
        'xl-space': '40px',
      },
    },
  },
  plugins: [],
}
export default config
