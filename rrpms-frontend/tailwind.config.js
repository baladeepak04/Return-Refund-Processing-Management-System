/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#4F46E5', // Modern Electric Indigo
          dark: '#3730A3',
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
        },
        success: {
          DEFAULT: '#10B981',
          dark: '#059669',
          50: '#ECFDF5',
          100: '#D1FAE5',
          200: '#A7F3D0',
          700: '#047857',
        },
        warning: {
          DEFAULT: '#F59E0B',
          dark: '#D97706',
          50: '#FFFBEB',
          100: '#FEF3C7',
          200: '#FDE68A',
          700: '#B45309',
        },
        danger: {
          DEFAULT: '#EF4444',
          dark: '#DC2626',
          50: '#FEF2F2',
          100: '#FEE2E2',
          200: '#FECACA',
          700: '#B91C1C',
        },
        info: {
          DEFAULT: '#0EA5E9',
          dark: '#0284C7',
          50: '#F0F9FF',
          100: '#E0F2FE',
          200: '#BAE6FD',
          700: '#0369A1',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          glass: 'rgba(255, 255, 255, 0.85)',
          muted: '#F8FAFC',
        },
        bg: '#F8FAFC',
        border: {
          DEFAULT: '#E2E8F0',
          light: '#F1F5F9',
          dark: '#CBD5E1',
        },
        text: {
          DEFAULT: '#0F172A', // Slate-900 for high crisp contrast
          secondary: '#475569', // Slate-600
          muted: '#64748B', // Slate-500, passes WCAG 2.1 AA 4.5:1
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['"Plus Jakarta Sans"', 'Inter', 'sans-serif'],
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
      },
      boxShadow: {
        xs: '0 1px 2px 0 rgba(15, 23, 42, 0.04)',
        sm: '0 1px 3px 0 rgba(15, 23, 42, 0.06), 0 1px 2px -1px rgba(15, 23, 42, 0.04)',
        md: '0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)',
        lg: '0 10px 15px -3px rgba(15, 23, 42, 0.08), 0 4px 6px -4px rgba(15, 23, 42, 0.03)',
        xl: '0 20px 25px -5px rgba(15, 23, 42, 0.1), 0 8px 10px -6px rgba(15, 23, 42, 0.04)',
        glow: '0 0 20px -3px rgba(79, 70, 229, 0.25)',
        'glow-success': '0 0 20px -3px rgba(16, 185, 129, 0.25)',
      },
    },
  },
  plugins: [],
};
