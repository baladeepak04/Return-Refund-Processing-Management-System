import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircleIcon, AlertTriangleIcon, InfoIcon, CloseIcon } from '../components/ui/icons';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', title = null) => {
    const id = Date.now() + Math.random().toString(36).substring(2, 6);
    setToasts(prev => [...prev, { id, message, type, title }]);

    // Auto dismiss after 6 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 6000);
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      {/* Toast Notification Container */}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => {
          let bg = 'bg-slate-900 text-white border-slate-700';
          let Icon = InfoIcon;
          let iconColor = 'text-sky-400';

          if (toast.type === 'success') {
            bg = 'bg-emerald-900/95 text-white border-emerald-700';
            Icon = CheckCircleIcon;
            iconColor = 'text-emerald-400';
          } else if (toast.type === 'warning') {
            bg = 'bg-amber-900/95 text-white border-amber-700';
            Icon = AlertTriangleIcon;
            iconColor = 'text-amber-400';
          } else if (toast.type === 'milestone') {
            bg = 'bg-primary-900/95 text-white border-primary-700';
            Icon = CheckCircleIcon;
            iconColor = 'text-primary-300';
          }

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border shadow-xl backdrop-blur-sm transition-all duration-200 animate-slide-in-right ${bg}`}
              role="alert"
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${iconColor}`} />
              <div className="flex-1 min-w-0">
                {toast.title && <div className="font-semibold text-xs tracking-wide uppercase mb-0.5">{toast.title}</div>}
                <div className="text-xs text-slate-100 leading-relaxed break-words">{toast.message}</div>
              </div>
              <button
                onClick={() => removeToast(toast.id)}
                className="shrink-0 text-slate-300 hover:text-white p-0.5 rounded transition-colors"
                aria-label="Dismiss notification"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    return { addToast: () => {}, removeToast: () => {} };
  }
  return context;
}
