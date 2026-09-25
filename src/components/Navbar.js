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
  Menu,
  X,
  Plus,
  UserPlus,
  User,
  Edit2,
} from 'lucide-react';
import { store, getWeekDetails } from '../lib/storage';
import { THEMES, getStoredTheme, setStoredTheme, applyTheme } from '../lib/theme';
import CalendarModal from './CalendarModal';

export default function Navbar({
  currentUser,
  activeHouse,
  userHouses,
  activeTab,
  setActiveTab,
  onOpenCreateHouse,
  onOpenJoinHouse,
  onOpenEditHouse,
  onOpenProfile,
  unreadNotifCount,
}) {
  const [isCopied, setIsCopied] = useState(false);
  const [currentTheme, setCurrentTheme] = useState(THEMES.SYSTEM);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);

  useEffect(() => {
    setCurrentTheme(getStoredTheme());
    applyTheme();
  }, []);

  useEffect(() => {
    if (showSchedulePreview) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [showSchedulePreview]);

  // Close mobile menu & schedule popover on ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setShowSchedulePreview(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
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

  const handleNavigate = (tabId) => {
    setActiveTab(tabId);
    setMobileMenuOpen(false);
    setShowSchedulePreview(false);
  };

  const navItems = [
    { id: 'dashboard', label: 'Home', icon: Calendar },
    { id: 'chores', label: 'Chores', icon: CheckSquare },
    { id: 'members', label: 'Members', icon: Users },
    { id: 'history', label: 'History', icon: History },
  ];

  return (
    <header className="sticky top-0 z-40 w-full max-w-full bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-b border-slate-200 dark:border-gray-800 transition-colors overflow-x-hidden">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 w-full min-w-0 gap-1.5 sm:gap-2">
          
          {/* Logo & Active House Dropdown Switcher */}
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 sm:flex-initial">
            <button
              onClick={() => handleNavigate('dashboard')}
              className="flex items-center gap-1.5 font-extrabold text-slate-900 dark:text-slate-100 text-sm sm:text-lg shrink-0 hover:opacity-90 transition cursor-pointer text-left focus:outline-none"
              title="Navigate to Home"
              aria-label="ChoreManager Home"
            >
              <div className="p-1.5 sm:p-2 bg-indigo-600 dark:bg-indigo-500 rounded-xl text-white shadow-xs shrink-0">
                <Home className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <span className="hidden xs:inline tracking-tight">ChoreManager</span>
            </button>

            {/* Active House Switcher Pill */}
            {activeHouse && (
              <div className="relative flex items-center gap-1 bg-slate-100 dark:bg-gray-800 px-2 py-1 rounded-xl border border-slate-200 dark:border-gray-700 text-xs min-w-0 flex-1 max-w-[130px] xs:max-w-[160px] sm:max-w-none">
                <select
                  value={activeHouse.id}
                  onChange={(e) => store.setActiveHouseId(e.target.value)}
                  aria-label="Select Active House"
                  className="bg-transparent font-extrabold text-slate-800 dark:text-slate-200 outline-none cursor-pointer pr-0.5 truncate text-xs w-full min-w-0"
                >
                  {userHouses.map((h) => (
                    <option key={h.id} value={h.id} className="bg-white dark:bg-gray-800 text-slate-900 dark:text-slate-100">
                      {h.name}
                    </option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={onOpenEditHouse}
                  title="Edit House Name"
                  aria-label="Edit House Name"
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded transition shrink-0"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>

                {/* DESKTOP ONLY: Schedule Calendar Toggle Button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowSchedulePreview((prev) => !prev);
                  }}
                  title="View Interactive Schedule Calendar"
                  aria-label="View Interactive Schedule Calendar"
                  className={`hidden md:inline-flex p-1.5 rounded-lg transition shrink-0 items-center gap-1 text-[11px] font-extrabold cursor-pointer ${
                    showSchedulePreview
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 border border-indigo-100 dark:border-indigo-900'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Schedule</span>
                </button>

                {/* DESKTOP ONLY: Copy House Join Code Badge */}
                <button
                  type="button"
                  onClick={handleCopyCode}
                  title="Copy House Join Code"
                  aria-label="Copy house invite code"
                  className="hidden md:inline-flex items-center gap-1 bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 px-1.5 xs:px-2 py-0.5 rounded-lg border border-indigo-200 dark:border-gray-600 font-mono text-[11px] xs:text-xs font-extrabold hover:bg-indigo-50 dark:hover:bg-gray-600 transition shrink-0 cursor-pointer shadow-2xs"
                >
                  {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-indigo-500" />}
                  <span>Code:</span>
                  <span>{activeHouse.invite_code}</span>
                </button>
              </div>
            )}
          </div>

          {/* Desktop Navigation Links */}
          {activeHouse && (
            <nav aria-label="Desktop Navigation" className="hidden md:flex items-center space-x-1 shrink-0">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleNavigate(item.id)}
                    aria-current={isActive ? 'page' : undefined}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
                      isActive
                        ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900 shadow-2xs'
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
          <div className="flex items-center gap-1 sm:gap-2 shrink-0">
            {/* Quick 1-Click Dark/Light Theme Switcher Button */}
            <button
              onClick={handleToggleQuickTheme}
              className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition shrink-0"
              title="Toggle Theme (Light / Dark)"
              aria-label="Toggle dark mode"
            >
              {currentTheme === THEMES.DARK ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              )}
            </button>

            {/* Desktop House Action Buttons */}
            <div className="hidden lg:flex items-center gap-1.5 shrink-0">
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
                onClick={() => handleNavigate('notifications')}
                className="relative p-1.5 sm:p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition shrink-0"
                title="Notifications"
                aria-label={`Notifications (${unreadNotifCount} unread)`}
              >
                <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
                {unreadNotifCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-extrabold text-white shadow-xs">
                    {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
                  </span>
                )}
              </button>
            )}

            {/* Profile Avatar Button */}
            <button
              onClick={onOpenProfile}
              className="flex items-center justify-center p-0.5 rounded-full shrink-0 min-w-[32px] min-h-[32px]"
              title="Profile & Settings"
              aria-label="Profile and Settings"
            >
              <img
                src={currentUser?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser?.full_name || 'user')}`}
                alt={currentUser?.full_name || 'Profile'}
                className="w-8 h-8 rounded-full border border-slate-300 dark:border-gray-600 object-cover shrink-0 min-w-[32px] min-h-[32px] shadow-2xs"
              />
            </button>

            {/* Mobile Hamburger Menu Toggle Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu-drawer"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="md:hidden p-1.5 sm:p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* MOBILE ROW 2 SUB-BAR: Schedule & Join Code Controls (< md breakpoint) */}
      {activeHouse && (
        <div className="md:hidden border-t border-slate-200/80 dark:border-gray-800/80 bg-slate-50/90 dark:bg-gray-900/90 px-3 py-1.5 flex items-center justify-between gap-2 max-w-full overflow-x-hidden">
          {/* Interactive Schedule Calendar Opener Button */}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setShowSchedulePreview((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900 font-extrabold text-[11px] xs:text-xs hover:bg-indigo-100 transition shrink-0 cursor-pointer shadow-2xs"
          >
            <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>Schedule Calendar</span>
          </button>

          {/* Copy House Join Code Badge */}
          <button
            type="button"
            onClick={handleCopyCode}
            title="Copy House Join Code"
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-gray-700 font-mono text-[11px] xs:text-xs font-extrabold hover:bg-indigo-50 dark:hover:bg-gray-700 transition shrink-0 cursor-pointer shadow-2xs"
          >
            {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-indigo-500" />}
            <span className="text-slate-500 font-sans">Code:</span>
            <span>{activeHouse.invite_code}</span>
          </button>
        </div>
      )}

      {/* Calendar Preview Modal */}
      <CalendarModal
        isOpen={showSchedulePreview}
        onClose={() => setShowSchedulePreview(false)}
        house={activeHouse}
        currentUser={currentUser}
      />

      {/* Mobile Drawer / Overlay Navigation */}
      {mobileMenuOpen && (
        <div id="mobile-menu-drawer" className="md:hidden border-t border-slate-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg px-4 pt-3 pb-5 space-y-3 shadow-xl transition-all max-w-full overflow-x-hidden">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-gray-800">
            <span className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Navigation Menu
            </span>
            {activeHouse && (
              <button
                type="button"
                onClick={handleCopyCode}
                className="inline-flex items-center gap-1 bg-slate-100 dark:bg-gray-800 text-indigo-600 dark:text-indigo-400 px-2 py-1 rounded-lg text-xs font-mono font-bold border border-slate-200 dark:border-gray-700 shrink-0"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>Code: {activeHouse.invite_code}</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigate(item.id)}
                  aria-current={isActive ? 'page' : undefined}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                    isActive
                      ? 'bg-indigo-600 text-white shadow-md'
                      : 'bg-slate-50 dark:bg-gray-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
            
            <button
              onClick={() => handleNavigate('notifications')}
              aria-current={activeTab === 'notifications' ? 'page' : undefined}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition text-left ${
                activeTab === 'notifications'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-50 dark:bg-gray-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <Bell className="w-4 h-4 shrink-0" />
                <span className="truncate">Alerts</span>
              </div>
              {unreadNotifCount > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] font-extrabold rounded-full bg-rose-500 text-white shrink-0">
                  {unreadNotifCount}
                </span>
              )}
            </button>

            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenProfile();
              }}
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-50 dark:bg-gray-800/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition text-left"
            >
              <User className="w-4 h-4 shrink-0 text-indigo-500" />
              <span className="truncate">Profile & Settings</span>
            </button>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-gray-800 flex items-center gap-2">
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenCreateHouse();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-slate-200 rounded-xl border border-slate-200 dark:border-gray-700 hover:bg-slate-200 transition"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="truncate">New House</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenJoinHouse();
              }}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 text-xs font-bold bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 rounded-xl border border-indigo-200 dark:border-indigo-900 hover:bg-indigo-100 transition"
            >
              <UserPlus className="w-4 h-4 shrink-0" />
              <span className="truncate">Join House</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
