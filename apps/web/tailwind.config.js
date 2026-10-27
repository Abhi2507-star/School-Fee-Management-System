/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        svss: {
          navy: '#1e3a8a',
          navyDark: '#172554',
          saffron: '#ea580c',
          saffronLight: '#fff7ed',
        },
      },
    },
  },
  plugins: [],
};
