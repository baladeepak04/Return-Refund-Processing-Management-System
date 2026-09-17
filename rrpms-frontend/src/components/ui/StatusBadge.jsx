import React from 'react';
import { STATUS_COLOR, humanize } from '../../lib/enums.js';

const COLOR_CLASSES = {
  success:
    'bg-emerald-50/90 text-emerald-700 border-emerald-200/80 shadow-xs shadow-emerald-500/5',
  warning:
    'bg-amber-50/90 text-amber-700 border-amber-200/80 shadow-xs shadow-amber-500/5',
  danger:
    'bg-rose-50/90 text-rose-700 border-rose-200/80 shadow-xs shadow-rose-500/5',
  info:
    'bg-sky-50/90 text-sky-700 border-sky-200/80 shadow-xs shadow-sky-500/5',
  muted:
    'bg-slate-100 text-slate-700 border-slate-200 shadow-xs',
};

const DOT_COLORS = {
  success: 'bg-emerald-500',
  warning: 'bg-amber-500',
  danger: 'bg-rose-500',
  info: 'bg-sky-500',
  muted: 'bg-slate-400',
};

// Returns true for statuses where an active pulse is visually informative
const IS_PULSING_STATUS = (status) =>
  [
    'INITIATED',
    'PICKUP_SCHEDULED',
    'IN_TRANSIT',
    'QC_IN_PROGRESS',
    'REFUND_INITIATED',
    'PROCESSING',
    'PENDING',
    'INVESTIGATING',
  ].includes(status);

export default function StatusBadge({ value, label }) {
  const color = STATUS_COLOR[value] || 'muted';
  const colorClass = COLOR_CLASSES[color] || COLOR_CLASSES.muted;
  const dotColor = DOT_COLORS[color] || DOT_COLORS.muted;
  const isPulsing = IS_PULSING_STATUS(value);

  return (
    <span
      className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-tight border ${colorClass}`}
    >
      <span className="relative flex h-2 w-2">
        {isPulsing && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${dotColor}`}
          />
        )}
        <span
          className={`relative inline-flex rounded-full h-2 w-2 ${dotColor}`}
        />
      </span>
      <span>{label || humanize(value)}</span>
    </span>
  );
}

export function GradeBadge({ grade }) {
  const color = STATUS_COLOR[grade] || 'muted';
  const colorClass = COLOR_CLASSES[color] || COLOR_CLASSES.muted;

  return (
    <span
      title={`Condition Grade: ${grade || 'Unassigned'}`}
      className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold font-heading border shadow-xs transition-transform hover:scale-110 ${colorClass}`}
    >
      {grade ? grade.slice(0, 1) : '-'}
    </span>
  );
}
