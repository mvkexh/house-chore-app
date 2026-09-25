'use client';

import { useState, useEffect } from 'react';
import {
  Home,
  Calendar,
  CheckSquare,
  Users,
  History,
  Bell,
  Copy,
  Check,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { store } from '../lib/storage';
import { THEMES, getStoredTheme, setStoredTheme, applyTheme } from '../lib/theme';

export default function Navbar({
  currentUser,
  activeHouse,
  userHouses,
  activeTab,
  setActiveTab,
  onOpenCreateHouse,
  onOpenJoinHouse,
  onOpenProfile,
  unreadNotifCount,
}) {
  const [isCopied, setIsCopied] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(THEMES.SYSTEM);

  useEffect(() => {
    setCurrentTheme(getStoredTheme());
    applyTheme();
  }, []);

  const handleToggleQuickTheme = () => {
    const nextTheme = currentTheme === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;
    setCurrentTheme(nextTheme);
    setStoredTheme(nextTheme);
  };

  const handleCopyCode = () => {
    if (!activeHouse) return;
    navigator.clipboard.writeText(activeHouse.invite_code);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Calendar },
    { id: 'chores', label: 'Chores', icon: CheckSquare },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-slate-200 dark:border-gray-800 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Logo & Active House Dropdown */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 font-extrabold text-slate-900 dark:text-slate-100 text-lg">
              <div className="p-2 bg-indigo-600 dark:bg-indigo-500 rounded-xl text-white shadow-sm">
                <Home className="w-5 h-5" />
              </div>
              <span className="hidden sm:inline tracking-tight">ChoreManager</span>
            </div>

            {/* Active House Switcher */}
            {activeHouse && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-gray-800 px-2.5 py-1 rounded-xl border border-slate-200 dark:border-gray-700 text-xs">
                <select
                  value={activeHouse.id}
                  onChange={(e) => store.setActiveHouseId(e.target.value)}
                  className="bg-transparent font-extrabold text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-1"
                >
                  {userHouses.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  title="Copy House Join Code"
                  className="inline-flex items-center gap-1 bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 px-2 py-0.5 rounded border border-indigo-200 dark:border-gray-600 font-mono font-bold hover:bg-indigo-50 dark:hover:bg-gray-600 transition"
                >
                  {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                  <span>{activeHouse.invite_code}</span>
                </button>
              </div>
            )}
          </div>

          {/* Desktop Navigation Links */}
          {activeHouse && (
            <nav className="hidden md:flex items-center space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>
          )}

          {/* Right Controls */}
          <div className="flex items-center gap-2">
            {/* Quick 1-Click Dark/Light Theme Switcher Button */}
            <button
              onClick={handleToggleQuickTheme}
              className="p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition"
              title="Toggle Theme (Light / Dark)"
            >
              {currentTheme === THEMES.DARK ? (
                <Sun className="w-5 h-5 text-amber-400" />
              ) : (
                <Moon className="w-5 h-5 text-slate-600" />
              )}
            </button>

            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={onOpenCreateHouse}
                className="text-xs bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-300 font-bold px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 transition"
              >
                + New House
              </button>
              <button
                onClick={onOpenJoinHouse}
                className="text-xs bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-300 font-bold px-2.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-900 transition"
              >
                Join House
              </button>
            </div>

            {/* Notification Bell */}
            {activeHouse && (
              <button
                onClick={() => setActiveTab('notifications')}
                className="relative p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition"
                title="Notifications"
              >
                <Bell className="w-5 h-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white shadow-xs">
                    {unreadNotifCount}
                  </span>
                )}
              </button>
            )}

            {/* Profile Avatar Button */}
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 pl-2 border-l border-slate-200 dark:border-gray-800"
              title="Profile & Settings"
            >
              <img
                src={currentUser?.avatar_url}
                alt={currentUser?.full_name}
                className="w-8 h-8 rounded-full border border-slate-300 dark:border-gray-600 object-cover shadow-2xs"
              />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
