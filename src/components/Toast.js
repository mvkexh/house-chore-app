'use client';

import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export default function Toast({ toast, onClose }) {
  if (!toast) return null;

  const { type = 'success', message = '' } = toast;

  const typeStyles = {
    success: 'bg-emerald-600 text-white border-emerald-500',
    error: 'bg-rose-600 text-white border-rose-500',
    info: 'bg-indigo-600 text-white border-indigo-500',
  };

  const icons = {
    success: <CheckCircle2 className="w-4 h-4 text-white" />,
    error: <AlertCircle className="w-4 h-4 text-white" />,
    info: <Info className="w-4 h-4 text-white" />,
  };

  return (
    <div className="fixed bottom-20 md:bottom-6 right-6 z-50 animate-bounce-in max-w-sm w-full">
      <div
        className={`p-3.5 rounded-xl border shadow-xl flex items-center justify-between gap-3 text-xs font-bold ${typeStyles[type]}`}
      >
        <div className="flex items-center gap-2">
          {icons[type]}
          <span>{message}</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-white/20 rounded transition"
        >
          <X className="w-3.5 h-3.5 text-white" />
        </button>
      </div>
    </div>
  );
}
