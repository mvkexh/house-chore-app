'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import InteractiveCalendar from './InteractiveCalendar';

export default function CalendarModal({ isOpen, onClose, house, currentUser, onShowToast }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Body Scroll Lock & Escape Key Listener
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' || e.keyCode === 27) {
        if (onClose) onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow || '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !mounted || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-slate-900/65 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto animate-in fade-in duration-150"
      onClick={(e) => {
        e.stopPropagation();
        if (onClose) onClose();
      }}
      aria-modal="true"
      role="dialog"
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl p-4 sm:p-6 max-w-4xl w-full space-y-4 shadow-2xl border border-slate-200 dark:border-gray-700 max-h-[92vh] sm:max-h-[90vh] overflow-y-auto transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        <InteractiveCalendar
          house={house}
          currentUser={currentUser}
          onShowToast={onShowToast}
          isModal={true}
          onCloseModal={onClose}
        />
      </div>
    </div>,
    document.body
  );
}
