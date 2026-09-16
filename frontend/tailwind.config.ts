import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          DEFAULT: '#F2F4E6',
          card: '#FFFDF7',
        },
        ink: {
          DEFAULT: '#14312A',
          soft: '#3E5A4F',
        },
        green: {
          deep: '#123A2C',
          mid: '#2E7D5C',
          pale: '#D3E6C6',
        },
        gold: {
          DEFAULT: '#E3A23A',
          deep: '#C4831F',
        },
        brown: {
          DEFAULT: '#6B4226',
        },
        line: 'rgba(20,49,42,0.14)',
      },
      fontFamily: {
        sans: ['var(--font-work-sans)', 'sans-serif'],
        serif: ['var(--font-fraunces)', 'serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(20,49,42,0.06)',
        toast: '0 8px 24px rgba(0,0,0,0.18)',
      },
      borderRadius: {
        organic: '42% 58% 61% 39% / 45% 40% 60% 55%',
      },
      keyframes: {
        'bounce-soft': {
          '0%, 100%': { transform: 'translateY(-2rem)' },
          '50%': { transform: 'translateY(-2.3rem)' },
        }
      },
      animation: {
        'bounce-soft': 'bounce-soft 2s ease-in-out infinite',
      }
    },
  },
  plugins: [],
};
export default config;
