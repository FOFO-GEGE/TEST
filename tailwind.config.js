/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#f6f3ec',
        card: '#edeae1',
        subtle: '#e4e0d4',
        ink: '#211d17',
        'ink-muted': '#8c8676',
        line: '#ddd7c8',
        moss: '#4b6b52',
        rust: '#a85a3f',
        gold: '#a9793a',
      },
      fontFamily: {
        display: ['"Fraunces Variable"', 'ui-serif', 'Georgia', 'serif'],
      },
    },
  },
  plugins: [],
}
