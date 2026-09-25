'use client';

import { useState, useRef, useEffect } from 'react';
import { User, Sun, Moon, Monitor, Camera, Trash2, Check, X, Bell, LogOut, ArrowLeft, AlertTriangle, Home, Shield } from 'lucide-react';
import { store } from '../lib/storage';
import { THEMES, getStoredTheme, setStoredTheme, applyTheme } from '../lib/theme';
import { isNotificationSupported, getNotificationPermission, requestNotificationPermission } from '../lib/notifications';
import HouseSettings from './HouseSettings';

export default function ProfileModal({ currentUser, activeHouse, onClose, onShowToast }) {
  const initialFullName = currentUser?.full_name || '';
  const initialAvatarUrl = currentUser?.avatar_url || '';
  const initialTheme = getStoredTheme();

  const [activeSubTab, setActiveSubTab] = useState('profile'); // 'profile' or 'house'
  const [fullName, setFullName] = useState(initialFullName);
  const [avatarUrl, setAvatarUrl] = useState(initialAvatarUrl);
  const [selectedTheme, setSelectedTheme] = useState(initialTheme);
  const [pushPermission, setPushPermission] = useState(getNotificationPermission());
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);

  const fileInputRef = useRef(null);
  const scrollContainerRef = useRef(null);

  const houseMembers = activeHouse ? store.getHouseMembers(activeHouse.id) : [];

  const isDirty =
    activeSubTab === 'profile' &&
    (fullName.trim() !== initialFullName ||
      avatarUrl !== initialAvatarUrl ||
      selectedTheme !== initialTheme);

  // Scroll to top when settings page opens or tab changes
  useEffect(() => {
    if (scrollContainerRef.current) {
      scrollContainerRef.current.scrollTop = 0;
    }
  }, [activeSubTab]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleAttemptClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isDirty]);

  const handleAttemptClose = () => {
    if (isDirty) {
      setShowDiscardConfirm(true);
    } else {
      onClose();
    }
  };

  const handleDiscardChanges = () => {
    if (selectedTheme !== initialTheme) {
      setStoredTheme(initialTheme);
      applyTheme(initialTheme);
    }
    onClose();
  };

  const handleAvatarFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      onShowToast({ type: 'error', message: 'Image size should be under 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setAvatarUrl(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    const fallbackAvatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(fullName)}`;
    setAvatarUrl(fallbackAvatar);
  };

  const handleThemeChange = (theme) => {
    setSelectedTheme(theme);
    setStoredTheme(theme);
    applyTheme(theme);
  };

  const handleSaveProfile = (e) => {
    if (e) e.preventDefault();
    store.updateUserProfile(currentUser.id, {
      full_name: fullName.trim(),
      avatar_url: avatarUrl,
    });
    setStoredTheme(selectedTheme);
    applyTheme(selectedTheme);
    onShowToast({ type: 'success', message: 'Profile & Settings saved successfully!' });
    onClose();
  };

  const handleTogglePushNotifications = async () => {
    if (!isNotificationSupported()) {
      onShowToast({ type: 'error', message: 'Browser push notifications not supported on this browser.' });
      return;
    }
    const perm = await requestNotificationPermission();
    setPushPermission(perm);
    if (perm === 'granted') {
      onShowToast({ type: 'success', message: 'Browser push notifications enabled!' });
    } else {
      onShowToast({ type: 'info', message: 'Notification permission not granted.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-slate-900/60 backdrop-blur-xs p-0 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-3xl max-w-lg w-full max-h-[92vh] sm:max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-gray-700 overflow-hidden min-w-0">
        
        {/* STICKY TOP HEADER BAR */}
        <div className="sticky top-0 z-20 shrink-0 bg-white dark:bg-gray-800 border-b border-slate-200 dark:border-gray-700 px-4 py-3 flex flex-col gap-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleAttemptClose}
              className="p-1.5 -ml-1 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-xl flex items-center gap-1 text-xs font-bold transition shrink-0"
              title="Back / Cancel"
              aria-label="Go back or cancel settings"
            >
              <ArrowLeft className="w-4 h-4 shrink-0" />
              <span>Back</span>
            </button>

            <h2 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2 truncate">
              <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              Settings & Control Center
            </h2>

            <button
              type="button"
              onClick={handleAttemptClose}
              className="p-1.5 -mr-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-gray-700 rounded-xl transition shrink-0"
              title="Close Settings"
              aria-label="Close Settings Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* TAB CONTROL BAR */}
          <div className="flex gap-1 bg-slate-100 dark:bg-gray-900/60 p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setActiveSubTab('profile')}
              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                activeSubTab === 'profile'
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Personal Profile</span>
            </button>

            {activeHouse && (
              <button
                type="button"
                onClick={() => setActiveSubTab('house')}
                className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition flex items-center justify-center gap-1.5 ${
                  activeSubTab === 'house'
                    ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-2xs'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Home className="w-3.5 h-3.5" />
                <span>House Settings</span>
              </button>
            )}
          </div>
        </div>

        {/* UNSAVED CHANGES WARNING BANNER */}
        {showDiscardConfirm && (
          <div className="bg-amber-50 dark:bg-amber-950/80 border-b border-amber-200 dark:border-amber-900 p-3.5 flex items-center justify-between gap-2 shrink-0 animate-in fade-in">
            <div className="flex items-center gap-2 text-xs text-amber-900 dark:text-amber-200 font-bold min-w-0">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span className="truncate">Unsaved changes detected!</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleDiscardChanges}
                className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-xs font-bold shadow-xs hover:bg-rose-700"
              >
                Discard
              </button>
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="px-2.5 py-1 bg-white dark:bg-gray-700 border border-slate-300 dark:border-gray-600 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-bold"
              >
                Keep Editing
              </button>
            </div>
          </div>
        )}

        {/* SCROLLABLE BODY */}
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {activeSubTab === 'profile' ? (
            <form onSubmit={handleSaveProfile} id="profile-settings-form" className="space-y-6">
              {/* Avatar Upload / Preview */}
              <div className="flex flex-col items-center gap-3">
                <div className="relative group shrink-0">
                  <img
                    src={avatarUrl}
                    alt="Avatar Preview"
                    className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500 shadow-md shrink-0"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-0 right-0 p-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-md transition"
                    title="Upload Image"
                  >
                    <Camera className="w-3.5 h-3.5" />
                  </button>
                </div>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarFileChange}
                  className="hidden"
                />

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    Change Photo
                  </button>
                  <span className="text-xs text-slate-300">|</span>
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-xs font-bold text-rose-600 hover:underline"
                  >
                    Remove Photo
                  </button>
                </div>
              </div>

              {/* User Info Fields */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-slate-100 text-xs font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    Google Email
                  </label>
                  <input
                    type="email"
                    value={currentUser?.email || ''}
                    disabled
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-100 dark:bg-gray-900 text-slate-500 text-xs font-medium cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Appearance (Theme Selection) */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  Appearance Theme
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: THEMES.LIGHT, label: 'Light', icon: Sun },
                    { id: THEMES.DARK, label: 'Dark', icon: Moon },
                    { id: THEMES.SYSTEM, label: 'System', icon: Monitor },
                  ].map((themeItem) => {
                    const Icon = themeItem.icon;
                    const isSelected = selectedTheme === themeItem.id;
                    return (
                      <button
                        key={themeItem.id}
                        type="button"
                        onClick={() => handleThemeChange(themeItem.id)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-xs font-bold transition ${
                          isSelected
                            ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'
                            : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <Icon className="w-4 h-4 shrink-0" />
                        <span>{themeItem.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Browser Push Notifications */}
              <div className="p-3.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-700/50 flex items-center justify-between">
                <div className="space-y-0.5 min-w-0 pr-2">
                  <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5 truncate">
                    <Bell className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Push Notifications</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    {pushPermission === 'granted' ? 'Enabled' : 'Disabled'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleTogglePushNotifications}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition shrink-0 ${
                    pushPermission === 'granted'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
                  }`}
                >
                  {pushPermission === 'granted' ? 'Enabled ✓' : 'Enable'}
                </button>
              </div>
            </form>
          ) : (
            <HouseSettings
              house={activeHouse}
              currentUser={currentUser}
              members={houseMembers}
              onShowToast={onShowToast}
              onHouseDeleted={() => onClose()}
              onHouseLeft={() => onClose()}
            />
          )}
        </div>

        {/* STICKY BOTTOM ACTIONS BAR */}
        <div className="sticky bottom-0 z-20 shrink-0 bg-white/95 dark:bg-gray-800/95 backdrop-blur-md border-t border-slate-200 dark:border-gray-700 p-3.5 flex items-center justify-between gap-2">
          {activeSubTab === 'profile' ? (
            <>
              <button
                type="button"
                onClick={handleAttemptClose}
                className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 dark:border-gray-600 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-slate-300 font-bold text-xs transition text-center truncate"
              >
                Cancel / Discard
              </button>

              <button
                type="submit"
                form="profile-settings-form"
                className="flex-1 py-2.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition text-center truncate"
              >
                Save Changes
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-gray-700 text-slate-800 dark:text-slate-200 font-extrabold text-xs transition text-center"
            >
              Done
            </button>
          )}

          <button
            type="button"
            onClick={() => store.logout()}
            className="p-2.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 font-bold text-xs transition flex items-center justify-center shrink-0"
            title="Sign Out"
            aria-label="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

