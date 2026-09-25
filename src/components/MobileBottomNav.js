'use client';

import { Calendar, CheckSquare, Users, History, Bell } from 'lucide-react';

export default function MobileBottomNav({ activeTab, setActiveTab, unreadNotifCount }) {
  const items = [
    { id: 'dashboard', label: 'Home', icon: Calendar },
    { id: 'chores', label: 'Chores', icon: CheckSquare },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'history', label: 'History', icon: History },
    { id: 'notifications', label: 'Alerts', icon: Bell, badge: unreadNotifCount },
  ];

  return (
    <nav
      aria-label="Mobile Navigation"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t border-slate-200 dark:border-gray-800 px-1 py-1.5 flex items-center justify-around shadow-lg transition-colors"
    >
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            aria-current={isActive ? 'page' : undefined}
            className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-xl text-[10px] sm:text-[11px] font-bold transition-all ${
              isActive
                ? 'bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-extrabold shadow-2xs'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-gray-800'
            }`}
          >
            <div className="relative">
              <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110' : ''}`} />
              {item.badge > 0 && (
                <span className="absolute -top-1.5 -right-2 flex h-4 min-w-[16px] px-1 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white shadow-xs">
                  {item.badge > 9 ? '9+' : item.badge}
                </span>
              )}
            </div>
            <span className="truncate max-w-[56px] text-center">{item.label}</span>
          </button>
        );
      })}
    </nav>
  );
}

