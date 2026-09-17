import React, { useEffect, useRef } from 'react';

// Accessible modal dialog with focus management and Escape-to-close.
let modalIdCounter = 0;

export default function Modal({ open, isOpen, onClose, title, children, footer, maxWidth = 'max-w-lg' }) {
  const isModalOpen = open ?? isOpen ?? false;
  const idRef = useRef(`modal-title-${++modalIdCounter}`);
  const dialogRef = useRef(null);

  useEffect(() => {
    if (!isModalOpen) return;
    dialogRef.current?.focus();
    function onKeyDown(e) {
      if (e.key === 'Escape') onClose?.();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);

  if (!isModalOpen) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 transition-all"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={idRef.current}
        tabIndex={-1}
        className={`bg-white rounded-2xl shadow-xl border border-border/80 w-full ${maxWidth} max-h-[88vh] overflow-y-auto focus:outline-none transition-all`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-border/70 bg-slate-50/50">
          <h3
            id={idRef.current}
            className="font-heading font-bold text-text text-base tracking-tight"
          >
            {title}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors text-lg leading-none"
          >
            ✕
          </button>
        </div>
        <div className="p-6">{children}</div>
        {footer && (
          <div className="flex items-center justify-end gap-2.5 px-6 py-4 border-t border-border/70 bg-slate-50/50">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
