import React from 'react';

const VARIANTS = {
  primary:
    'bg-gradient-to-r from-primary to-primary-dark text-white shadow-sm hover:from-primary-600 hover:to-primary-800 hover:shadow-md hover:shadow-primary/20 border border-primary/20',
  danger:
    'bg-gradient-to-r from-danger to-red-600 text-white shadow-sm hover:from-red-600 hover:to-red-700 hover:shadow-md hover:shadow-danger/20 border border-danger/20',
  success:
    'bg-gradient-to-r from-success to-emerald-600 text-white shadow-sm hover:from-emerald-600 hover:to-emerald-700 hover:shadow-md hover:shadow-success/20 border border-success/20',
  outline:
    'bg-white text-text border border-border hover:bg-slate-50 hover:border-slate-300 hover:text-slate-900 shadow-xs',
  ghost:
    'bg-transparent text-text-secondary hover:bg-slate-100 hover:text-text',
  subtle:
    'bg-primary-50 text-primary border border-primary-100 hover:bg-primary-100/80',
};

export default function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  loading = false,
  disabled = false,
  ...props
}) {
  const sizes = {
    sm: 'px-3 py-1.5 text-xs rounded-md',
    md: 'px-4 py-2 text-sm rounded-lg',
    lg: 'px-5 py-2.5 text-sm font-semibold rounded-lg',
  };

  return (
    <button
      type="button"
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 font-medium tracking-tight transition-all duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none ${VARIANTS[variant] || VARIANTS.primary} ${sizes[size] || sizes.md} ${className}`}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-0.5 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
