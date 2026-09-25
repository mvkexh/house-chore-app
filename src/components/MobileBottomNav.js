'use client';

import { Home, CheckSquare, Bell, User } from 'lucide-react';

export default function MobileBottomNav({ activeTab, setActiveTab, unreadNotifCount, onOpenProfile }) {
  const items = [
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'chores', label: 'Chores', icon: CheckSquare },
    { id: 'notifications', label: 'Alerts', icon: Bell, badge: unreadNotifCount },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-t border-slate-200 dark:border-gray-800 px-4 py-2 flex items-center justify-around">
      {items.map((item) => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`relative flex flex-col items-center gap-1 p-2 rounded-xl text-[11px] font-bold transition ${
              isActive
                ? 'text-indigo-600 dark:text-indigo-400 font-extrabold'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <div className="relative">
              <Icon className="w-5 h-5" />
              {item.badge > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-extrabold text-white">
                  {item.badge}
                </span>
              )}
            </div>
            <span>{item.label}</span>
          </button>
        );
      })}

      <button
        onClick={onOpenProfile}
        className="flex flex-col items-center gap-1 p-2 rounded-xl text-[11px] font-bold text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100"
      >
        <User className="w-5 h-5" />
        <span>Profile</span>
      </button>
    </nav>
  );
}
