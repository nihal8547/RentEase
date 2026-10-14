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
          900: '#3D0B1C',
          800: '#4A0F22',
          700: '#6E1731',
          600: '#7F1B39',
        },
        gold: {
          500: '#B9924A',
          400: '#C9A55A',
          300: '#D9BE8C',
        },
        sand: {
          200: '#EDE6D5',
          100: '#F4EFE4',
          '050': '#FBF9F3',
        },
        ink: {
          900: '#1A1614',
          800: '#221E1C',
          600: '#5B534C',
          400: '#8B8279',
          200: '#B8B0A9',
        },
        line: '#E4DCCB',
        emerald: {
          700: '#2D6B4A',
          600: '#3F7A5C',
          100: '#E0EFE7',
        },
        amber: {
          700: '#8F5D12',
          600: '#A9711C',
          100: '#F5E7CE',
        },
        ruby: {
          700: '#8B2E2E',
          600: '#A23B3B',
          100: '#F5E1E1',
        },
        sky: {
          600: '#2563AB',
          100: '#DBEAFE',
        },
      },
      fontFamily: {
        poppins: ['Poppins', 'sans-serif'],
        sans:    ['Poppins', 'sans-serif'],
        ui:      ['Poppins', 'sans-serif'],
        display: ['Poppins', 'sans-serif'],
        serif:   ['Poppins', 'sans-serif'],
        mono:    ['Poppins', 'sans-serif'],
      },
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
        xs:    ['12px', { lineHeight: '18px' }],
        sm:    ['13px', { lineHeight: '20px' }],
        base:  ['14px', { lineHeight: '22px' }],
        lg:    ['16px', { lineHeight: '24px' }],
        xl:    ['18px', { lineHeight: '26px' }],
        '2xl': ['22px', { lineHeight: '30px' }],
        '3xl': ['28px', { lineHeight: '36px' }],
      },
      borderRadius: {
        DEFAULT: '6px',
        none: '0',
        xs:   '2px',
        sm:   '4px',
        md:   '6px',
        lg:   '8px',
        xl:   '12px',
        '2xl':'16px',
      },
      borderWidth: {
        '1': '1px',
        '3': '3px',
      },
      boxShadow: {
        xs:  '0 1px 2px 0 rgba(26,22,20,0.05)',
        sm:  '0 1px 3px 0 rgba(26,22,20,0.08), 0 1px 2px -1px rgba(26,22,20,0.06)',
        DEFAULT: '0 1px 3px 0 rgba(26,22,20,0.08), 0 1px 2px -1px rgba(26,22,20,0.06)',
        md:  '0 4px 6px -1px rgba(26,22,20,0.08), 0 2px 4px -2px rgba(26,22,20,0.06)',
        lg:  '0 10px 15px -3px rgba(26,22,20,0.08), 0 4px 6px -4px rgba(26,22,20,0.05)',
        xl:  '0 20px 25px -5px rgba(26,22,20,0.1), 0 8px 10px -6px rgba(26,22,20,0.05)',
        '2xl':'0 25px 50px -12px rgba(26,22,20,0.18)',
        inner: 'inset 0 2px 4px 0 rgba(26,22,20,0.06)',
      },
      spacing: {
        4.5: '18px',
        18: '72px',
      },
      transitionDuration: {
        DEFAULT: '150ms',
      },
    },
  },
  plugins: [],
}
