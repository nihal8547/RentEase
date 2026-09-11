/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        maroon: {
          900: '#4A0F22',
          700: '#6E1731',
          600: '#7F1B39',
        },
        gold: {
          500: '#B9924A',
          300: '#D9BE8C',
        },
        sand: {
          100: '#F4EFE4',
          '050': '#FBF9F3',
        },
        ink: {
          900: '#221E1C',
          600: '#5B534C',
          400: '#8B8279',
        },
        line: '#E4DCCB',
        emerald: {
          600: '#3F7A5C',
          100: '#E4EFE7',
        },
        amber: {
          600: '#A9711C',
          100: '#F5E7CE',
        },
        ruby: {
          600: '#A23B3B',
          100: '#F5E1E1',
        },
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        sans: ['Poppins', 'sans-serif'],
        ui: ['Poppins', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
        serif: ['Poppins', 'sans-serif'],
        mono: ['Poppins', 'sans-serif'],
      },
      borderRadius: {
        DEFAULT: '3px',
        sm: '2px',
        md: '3px',
        lg: '4px',
      },
      borderWidth: {
        '1': '1px',
        '3': '3px',
      },
    },
  },
  plugins: [],
}
