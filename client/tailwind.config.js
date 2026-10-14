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
          900: '#0D1B2A',
          800: '#12243A',
          700: '#1B4F72',
          600: '#1F6090',
        },
        gold: {
          500: '#00B4D8',
          400: '#48CAE4',
          300: '#90E0EF',
        },
        sand: {
          200: '#D6E4EC',
          100: '#EBF4F8',
          '050': '#F5FAFB',
        },
        ink: {
          900: '#0D1B2A',
          800: '#1A2D3E',
          600: '#4A6278',
          400: '#7A96A8',
          200: '#B0C4CF',
        },
        line: '#CCE0EA',
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
