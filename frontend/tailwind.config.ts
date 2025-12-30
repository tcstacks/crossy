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
        primary: {
          50: '#fef7ff',
          100: '#fceeff',
          200: '#f9deff',
          300: '#f5c4ff',
          400: '#eda5f5',
          500: '#dc7be8',
          600: '#c45cc9',
          700: '#a545a6',
          800: '#863b87',
          900: '#6d326d',
        },
        candy: {
          pink: '#f9a8c9',
          purple: '#c9a8f9',
          blue: '#a8d8f9',
          mint: '#a8f9d8',
          yellow: '#f9eca8',
          orange: '#f9c9a8',
          coral: '#f9a8a8',
        },
        pastel: {
          pink: '#ffd1dc',
          lavender: '#e8e0f0',
          mint: '#c8f0e0',
          peach: '#ffe8d8',
          sky: '#d0e8f0',
          lemon: '#fff8d8',
        },
        crossword: {
          black: '#2d1b4e',
          white: '#ffffff',
          selected: '#e879f9',
          highlighted: '#fef3c7',
          correct: '#bbf7d0',
          incorrect: '#fecaca',
        },
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      borderRadius: {
        'bubble': '2rem',
        'blob': '30% 70% 70% 30% / 30% 30% 70% 70%',
      },
      boxShadow: {
        'candy': '0 8px 32px -4px rgba(217, 70, 239, 0.3)',
        'candy-lg': '0 16px 48px -8px rgba(217, 70, 239, 0.4)',
        'float': '0 20px 40px -12px rgba(0, 0, 0, 0.15)',
        'glow': '0 0 20px rgba(217, 70, 239, 0.5)',
        'glow-blue': '0 0 20px rgba(76, 201, 255, 0.5)',
        'glow-pink': '0 0 20px rgba(255, 107, 157, 0.5)',
      },
      animation: {
        'cursor-blink': 'cursor-blink 1s ease-in-out infinite',
        'cell-flash': 'cell-flash 0.3s ease-out',
        'slide-up': 'slide-up 0.3s ease-out',
        'slide-down': 'slide-down 0.3s ease-out',
        'bounce-in': 'bounce-in 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'float': 'float 3s ease-in-out infinite',
        'pulse-soft': 'pulse-soft 2s ease-in-out infinite',
        'pop': 'pop 0.3s cubic-bezier(0.68, -0.55, 0.265, 1.55)',
        'confetti': 'confetti 0.5s ease-out forwards',
        'sparkle': 'sparkle 1.5s ease-in-out infinite',
        'jelly': 'jelly 0.5s ease-in-out',
      },
      keyframes: {
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'cell-flash': {
          '0%': { backgroundColor: '#fef3c7', transform: 'scale(1.1)' },
          '100%': { backgroundColor: 'transparent', transform: 'scale(1)' },
        },
        'slide-up': {
          '0%': { transform: 'translateY(100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'slide-down': {
          '0%': { transform: 'translateY(-100%)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        'bounce-in': {
          '0%': { transform: 'scale(0)', opacity: '0' },
          '50%': { transform: 'scale(1.1)' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        'wiggle': {
          '0%, 100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.8', transform: 'scale(1.02)' },
        },
        'pop': {
          '0%': { transform: 'scale(0.9)' },
          '50%': { transform: 'scale(1.05)' },
          '100%': { transform: 'scale(1)' },
        },
        'confetti': {
          '0%': { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(-100px) rotate(720deg)', opacity: '0' },
        },
        'sparkle': {
          '0%, 100%': { opacity: '0.4', transform: 'scale(0.8)' },
          '50%': { opacity: '1', transform: 'scale(1.2)' },
        },
        'jelly': {
          '0%': { transform: 'scale(1, 1)' },
          '30%': { transform: 'scale(1.1, 0.9)' },
          '40%': { transform: 'scale(0.95, 1.05)' },
          '50%': { transform: 'scale(1.02, 0.98)' },
          '65%': { transform: 'scale(0.99, 1.01)' },
          '75%': { transform: 'scale(1.01, 0.99)' },
          '100%': { transform: 'scale(1, 1)' },
        },
      },
      backgroundImage: {
        'gradient-candy': 'linear-gradient(135deg, #ff6b9d 0%, #c44cff 50%, #4cc9ff 100%)',
        'gradient-sunset': 'linear-gradient(135deg, #ff6b6b 0%, #ff9f4c 50%, #ffe44c 100%)',
        'gradient-aurora': 'linear-gradient(135deg, #4cc9ff 0%, #c44cff 50%, #ff6b9d 100%)',
        'gradient-mint': 'linear-gradient(135deg, #4cffc4 0%, #4cc9ff 100%)',
        'dots-pattern': 'radial-gradient(circle, #e879f9 1px, transparent 1px)',
      },
    },
  },
  plugins: [],
};

export default config;
