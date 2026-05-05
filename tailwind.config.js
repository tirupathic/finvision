/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        fin: {
          bg: '#0a0a0a',
          surface: '#111111',
          card: '#1a1a1a',
          border: '#2a2a2a',
          accent: '#6366f1',
          green: '#22c55e',
          red: '#ef4444',
          yellow: '#f59e0b',
          muted: '#6b7280',
          text: '#e5e7eb',
        },
      },
    },
  },
  plugins: [],
};
