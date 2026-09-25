import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        gold: {
          50: '#FAF7EE',
          100: '#F5EFD7',
          200: '#EBDDB0',
          300: '#DFC884',
          400: '#D4AF37',
          500: '#C5A059',
          600: '#A68241',
          700: '#82622E',
          800: '#5F451F',
          900: '#3F2D13',
        },
        cream: {
          50: '#FDFCF9',
          100: '#FAF7F2',
          200: '#F4EFE6',
          300: '#EAE2D5',
          400: '#DFD5C4',
        },
        obsidian: {
          950: '#0D0D0D',
          900: '#141414',
          850: '#1A1A1A',
          800: '#242424',
          700: '#333333',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
