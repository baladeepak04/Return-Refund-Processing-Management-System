import React from 'react';

export function Input({ label, error, helperText, className = '', ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="block text-xs font-semibold text-text tracking-tight">
          {label}
        </span>
      )}
      <input
        className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm text-text placeholder:text-slate-400 shadow-xs transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary disabled:bg-slate-50 disabled:text-slate-500 ${
          error ? 'border-danger focus:ring-danger/10 focus:border-danger' : 'border-border hover:border-slate-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger font-medium mt-1">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-text-muted mt-1">{helperText}</p>
      )}
    </label>
  );
}

export function Textarea({ label, error, helperText, className = '', ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="block text-xs font-semibold text-text tracking-tight">
          {label}
        </span>
      )}
      <textarea
        className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm text-text placeholder:text-slate-400 shadow-xs transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary disabled:bg-slate-50 disabled:text-slate-500 ${
          error ? 'border-danger focus:ring-danger/10 focus:border-danger' : 'border-border hover:border-slate-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger font-medium mt-1">{error}</p>}
      {helperText && !error && (
        <p className="text-[11px] text-text-muted mt-1">{helperText}</p>
      )}
    </label>
  );
}

export function Select({ label, options, error, className = '', ...props }) {
  return (
    <label className="block space-y-1.5">
      {label && (
        <span className="block text-xs font-semibold text-text tracking-tight">
          {label}
        </span>
      )}
      <select
        className={`w-full bg-white border rounded-lg px-3.5 py-2 text-sm text-text shadow-xs transition-all duration-150 focus:outline-none focus:ring-4 focus:ring-primary/10 focus:border-primary disabled:bg-slate-50 disabled:text-slate-500 ${
          error ? 'border-danger focus:ring-danger/10 focus:border-danger' : 'border-border hover:border-slate-300'
        } ${className}`}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-danger font-medium mt-1">{error}</p>}
    </label>
  );
}
