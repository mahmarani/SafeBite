import { AlertCircle, AlertTriangle, CheckCircle2, Info, X } from 'lucide-react';
import { useToast } from '../../context/ToastContext';

export function ToastContainer() {
  const { toasts, dismissToast } = useToast();

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 w-[calc(100vw-2.5rem)] max-w-sm pointer-events-none"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const icon =
          toast.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-[#1D7A46] shrink-0 mt-0.5" strokeWidth={2} />
          ) : toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-[#D43832] shrink-0 mt-0.5" strokeWidth={2} />
          ) : toast.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-[#E59417] shrink-0 mt-0.5" strokeWidth={2} />
          ) : (
            <Info className="w-4 h-4 text-[#1D7A46] shrink-0 mt-0.5" strokeWidth={2} />
          );

        return (
          <div
            key={toast.id}
            className="overlay-surface pointer-events-auto p-3.5 flex items-start gap-3"
          >
            {icon}
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-[#1F1A17] leading-5">
                {toast.title}
              </p>
              {toast.description && (
                <p className="text-[12px] text-[#5C534A] mt-0.5 leading-4">
                  {toast.description}
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
              className="p-1 rounded text-[#6A6057] hover:text-[#1F1A17] hover:bg-[#F3EDE2] transition-colors cursor-pointer"
            >
              <X className="w-3.5 h-3.5" strokeWidth={1.75} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
