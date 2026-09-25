'use client';

import { useState, useRef } from 'react';
import { User, Sun, Moon, Monitor, Camera, Trash2, Check, X, Bell, LogOut } from 'lucide-react';
import { store } from '../lib/storage';
import { THEMES, getStoredTheme, setStoredTheme, applyTheme } from '../lib/theme';
import { isNotificationSupported, getNotificationPermission, requestNotificationPermission } from '../lib/notifications';

export default function ProfileModal({ currentUser, onClose, onShowToast }) {
  const [fullName, setFullName] = useState(currentUser?.full_name || '');
  const [avatarUrl, setAvatarUrl] = useState(currentUser?.avatar_url || '');
  const [selectedTheme, setSelectedTheme] = useState(getStoredTheme());
  const [pushPermission, setPushPermission] = useState(getNotificationPermission());

  const fileInputRef = useRef(null);

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
    e.preventDefault();
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 max-w-md w-full space-y-6 shadow-2xl border border-slate-200 dark:border-gray-700 my-8">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <User className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            Profile & Settings
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {/* Avatar Upload / Preview */}
          <div className="flex flex-col items-center gap-3">
            <div className="relative group">
              <img
                src={avatarUrl}
                alt="Avatar Preview"
                className="w-20 h-20 rounded-full object-cover border-2 border-indigo-500 shadow-md"
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
                Remove
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
                    <Icon className="w-4 h-4" />
                    <span>{themeItem.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Browser Push Notifications */}
          <div className="p-3.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-700/50 flex items-center justify-between">
            <div className="space-y-0.5">
              <div className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-indigo-500" />
                Browser Push Notifications
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {pushPermission === 'granted' ? 'Enabled' : 'Disabled'}
              </p>
            </div>

            <button
              type="button"
              onClick={handleTogglePushNotifications}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
                pushPermission === 'granted'
                  ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  : 'bg-indigo-600 text-white border-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {pushPermission === 'granted' ? 'Enabled ✓' : 'Enable'}
            </button>
          </div>

          {/* Save & Sign Out */}
          <div className="space-y-2 pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md transition"
            >
              Save Changes
            </button>

            <button
              type="button"
              onClick={() => store.logout()}
              className="w-full py-2.5 rounded-xl border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-900/30 font-bold text-xs transition flex items-center justify-center gap-1.5"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
