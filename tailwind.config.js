/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: '#1e3a8a',
        secondary: '#4f46e5',
        accent: '#fb923c',
        neutral: '#1f2937',
        'base-100': '#f3f4f6',
        info: '#3b82f6',
        success: '#16a34a',
        warning: '#f59e0b',
        error: '#dc2626',
      },
    },
  },
  plugins: [],
};
