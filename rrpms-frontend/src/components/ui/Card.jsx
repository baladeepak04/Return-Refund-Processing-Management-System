import React from 'react';

export function Card({ className = '', children, hover = true, ...props }) {
  return (
    <div
      className={`bg-white border border-border/80 rounded-xl shadow-xs ${
        hover ? 'transition-all duration-200 hover:shadow-md hover:border-slate-300/80' : ''
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function StatCard({ label, value, icon, trend, trendUp, tint = 'primary', className = '' }) {
  const tints = {
    primary: {
      bg: 'bg-primary-50/80 text-primary border-primary-100',
      glow: 'group-hover:shadow-glow',
    },
    success: {
      bg: 'bg-success-50 text-success border-success-200/60',
      glow: 'group-hover:shadow-glow-success',
    },
    warning: {
      bg: 'bg-warning-50 text-warning-700 border-warning-200/60',
      glow: '',
    },
    danger: {
      bg: 'bg-danger-50 text-danger border-danger-200/60',
      glow: '',
    },
    info: {
      bg: 'bg-info-50 text-info border-info-200/60',
      glow: '',
    },
  };

  const currentTint = tints[tint] || tints.primary;

  return (
    <Card className={`p-5 group relative overflow-hidden ${className}`}>
      {/* Subtle top accent bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-0.5 opacity-0 group-hover:opacity-100 transition-opacity duration-300 ${
          tint === 'success'
            ? 'bg-success'
            : tint === 'warning'
            ? 'bg-warning'
            : tint === 'danger'
            ? 'bg-danger'
            : 'bg-primary'
        }`}
      />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-text-muted uppercase tracking-wider">
            {label}
          </p>
          <p className="text-2xl font-extrabold font-heading text-text tracking-tight mt-1">
            {value}
          </p>
        </div>
        {icon && (
          <div
            className={`w-11 h-11 rounded-xl flex items-center justify-center border transition-all duration-300 group-hover:scale-105 shrink-0 ${currentTint.bg} ${currentTint.glow}`}
          >
            {icon}
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3.5 flex items-center gap-1.5 pt-2.5 border-t border-border/50 text-xs">
          <span
            className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded-full text-[11px] ${
              trendUp
                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                : 'bg-rose-50 text-rose-700 border border-rose-200/60'
            }`}
          >
            <span className="text-[12px]">{trendUp ? '↑' : '↓'}</span>
            {trend}
          </span>
        </div>
      )}
    </Card>
  );
}

export default Card;
