import { BRAND } from './src/theme.js'

/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html','./src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        bg:      '#1a1a1a',
        bg2:     '#222222',
        bg3:     '#2a2a2a',
        bg4:     '#333333',
        bg5:     '#3d3d3d',
        accent:  BRAND.primary,
        accent2: BRAND.primaryHover,
        accent3: BRAND.primaryLight,
        ggreen:  '#98B752',
        ggreen2: '#CBD568',
        gred:    '#c0392b',
        gamber:  '#d4a017',
        gpurple: '#6b5fa6',
        gt1:     '#C7C7C7',
        gt2:     '#A3A3A3',
        gt3:     '#4D4D4D',
        gborder: '#2e2e2e',
        gborder2:'#383838',
      },
      fontFamily: { sans: ['Segoe UI','system-ui','sans-serif'] }
    }
  },
  plugins: []
}
