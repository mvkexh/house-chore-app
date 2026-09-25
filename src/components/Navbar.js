'use client';

import { useState, useEffect, useRef } from 'react';
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
  ChevronDown,
  Settings,
  LogOut,
} from 'lucide-react';
import { store } from '../lib/storage';
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
  const [houseMenuOpen, setHouseMenuOpen] = useState(false);
  const [showSchedulePreview, setShowSchedulePreview] = useState(false);

  const houseMenuRef = useRef(null);

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

  // Close menus on click outside or ESC key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
        setHouseMenuOpen(false);
        setShowSchedulePreview(false);
      }
    };

    const handleClickOutside = (e) => {
      if (houseMenuRef.current && !houseMenuRef.current.contains(e.target)) {
        setHouseMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
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
    setHouseMenuOpen(false);
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
          <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 flex-1 lg:flex-initial">
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

            {/* Active House Dropdown Pill Button */}
            {activeHouse && (
              <div className="relative min-w-0 flex-1 max-w-[150px] xs:max-w-[190px] sm:max-w-none" ref={houseMenuRef}>
                <button
                  type="button"
                  onClick={() => setHouseMenuOpen(!houseMenuOpen)}
                  aria-expanded={houseMenuOpen}
                  className="w-full flex items-center justify-between gap-1 bg-slate-100 dark:bg-gray-800 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-gray-700 text-xs font-extrabold text-slate-800 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-gray-700 transition cursor-pointer shadow-2xs"
                >
                  <span className="truncate">{activeHouse.name}</span>
                  <ChevronDown className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${houseMenuOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* HOUSE MENU DROPDOWN POPOVER */}
                {houseMenuOpen && (
                  <div className="absolute left-0 mt-2 w-72 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-gray-700 py-3 px-3.5 z-50 space-y-3 transition-all animate-in fade-in slide-in-from-top-2">
                    
                    {/* Active House Header & Code Badge */}
                    <div className="pb-2 border-b border-slate-100 dark:border-gray-700 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-extrabold text-slate-900 dark:text-slate-100 truncate">
                          {activeHouse.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            setHouseMenuOpen(false);
                            onOpenEditHouse();
                          }}
                          className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg transition"
                          title="Edit House Name"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Join Code Copy Box */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-gray-700/60 border border-slate-200 dark:border-gray-600">
                        <div className="text-[11px] font-mono">
                          <span className="text-slate-400 font-sans mr-1">Join Code:</span>
                          <span className="font-extrabold text-indigo-600 dark:text-indigo-400 tracking-wider">
                            {activeHouse.invite_code}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={handleCopyCode}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white dark:bg-gray-600 text-indigo-700 dark:text-indigo-300 font-mono text-[10px] font-extrabold border border-slate-200 dark:border-gray-500 shadow-2xs hover:bg-indigo-50 dark:hover:bg-gray-500 transition cursor-pointer"
                        >
                          {isCopied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3 text-indigo-500" />}
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>

                    {/* House Menu Actions */}
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => {
                          setHouseMenuOpen(false);
                          setShowSchedulePreview(true);
                        }}
                        className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-gray-700/70 hover:text-indigo-600 dark:hover:text-indigo-400 transition text-left"
                      >
                        <Calendar className="w-4 h-4 text-indigo-500 shrink-0" />
                        <span>Schedule Calendar</span>
                      </button>

                      {/* House Switcher List */}
                      {userHouses.length > 1 && (
                        <div className="pt-2 border-t border-slate-100 dark:border-gray-700 space-y-1">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 px-2.5">
                            Switch House
                          </span>
                          {userHouses.map((h) => (
                            <button
                              key={h.id}
                              type="button"
                              onClick={() => {
                                store.setActiveHouseId(h.id);
                                setHouseMenuOpen(false);
                              }}
                              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-xl text-xs font-bold transition text-left ${
                                h.id === activeHouse.id
                                  ? 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 font-extrabold'
                                  : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-gray-700'
                              }`}
                            >
                              <span className="truncate">{h.name}</span>
                              {h.id === activeHouse.id && <Check className="w-3.5 h-3.5 text-indigo-600 shrink-0" />}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Create / Join House Actions */}
                      <div className="pt-2 border-t border-slate-100 dark:border-gray-700 grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setHouseMenuOpen(false);
                            onOpenCreateHouse();
                          }}
                          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-200 transition"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>New House</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setHouseMenuOpen(false);
                            onOpenJoinHouse();
                          }}
                          className="flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 text-[11px] font-bold hover:bg-indigo-100 transition"
                        >
                          <UserPlus className="w-3.5 h-3.5 shrink-0" />
                          <span>Join House</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Navigation Links (DESKTOP ONLY: >= lg) */}
          {activeHouse && (
            <nav aria-label="Desktop Navigation" className="hidden lg:flex items-center space-x-1 shrink-0">
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
              className="p-1.5 sm:p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition shrink-0 cursor-pointer"
              title="Toggle Theme (Light / Dark)"
              aria-label="Toggle dark mode"
            >
              {currentTheme === THEMES.DARK ? (
                <Sun className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
              ) : (
                <Moon className="w-4 h-4 sm:w-5 sm:h-5 text-slate-600" />
              )}
            </button>

            {/* Notification Bell */}
            {activeHouse && (
              <button
                onClick={() => handleNavigate('notifications')}
                className="relative p-1.5 sm:p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition shrink-0 cursor-pointer"
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
              className="flex items-center justify-center p-0.5 rounded-full shrink-0 min-w-[32px] min-h-[32px] cursor-pointer"
              title="Profile & Settings"
              aria-label="Profile and Settings"
            >
              <img
                src={currentUser?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(currentUser?.full_name || 'user')}`}
                alt={currentUser?.full_name || 'Profile'}
                className="w-8 h-8 rounded-full border border-slate-300 dark:border-gray-600 object-cover shrink-0 min-w-[32px] min-h-[32px] shadow-2xs"
              />
            </button>

            {/* Mobile/Tablet Navigation Drawer Toggle Button (< lg) */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-menu-drawer"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              className="lg:hidden p-1.5 sm:p-2 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 sm:w-6 sm:h-6" /> : <Menu className="w-5 h-5 sm:w-6 sm:h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Interactive Calendar Preview Modal */}
      <CalendarModal
        isOpen={showSchedulePreview}
        onClose={() => setShowSchedulePreview(false)}
        house={activeHouse}
        currentUser={currentUser}
      />

      {/* Mobile Drawer / Overlay Navigation (< lg) */}
      {mobileMenuOpen && (
        <div id="mobile-menu-drawer" className="lg:hidden border-t border-slate-200 dark:border-gray-800 bg-white/95 dark:bg-gray-900/95 backdrop-blur-lg px-4 pt-3 pb-5 space-y-3 shadow-xl transition-all max-w-full overflow-x-hidden">
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
